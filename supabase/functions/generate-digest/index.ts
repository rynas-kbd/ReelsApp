// generate-digest — génère la sélection IA pour un ou plusieurs utilisateurs.
// Body: { user_id?: string, cron?: boolean }
//   - { user_id } → mode unitaire (bouton « Générer maintenant »).
//   - { cron: true } ou vide → mode batch (tous les utilisateurs « dus »).
import { adminClient } from '../_shared/supabase.ts';
import { handleOptions, json } from '../_shared/cors.ts';
import { getApiKeys, runWithRotation } from '../_shared/keys.ts';
import { selectDigestWithKey, type ReelSnippet } from '../_shared/digest.ts';

Deno.serve(async (req) => {
  const pre = handleOptions(req);
  if (pre) return pre;

  const supabase = adminClient();

  try {
    const body = await req.json().catch(() => ({})) as {
      user_id?: string;
      cron?: boolean;
    };

    // Dérivation de l'utilisateur depuis le JWT (appels mobiles via supabase.functions.invoke).
    // Si le token n'est pas la clé service-role, on extrait l'identité depuis le JWT.
    const authHeader = req.headers.get('Authorization') ?? '';
    const token = authHeader.replace('Bearer ', '').trim();
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    let selfUserId: string | null = null;
    if (token && token !== serviceKey) {
      const { data } = await supabase.auth.getUser(token);
      selfUserId = data.user?.id ?? null;
    }

    const userIds: string[] = [];

    if (selfUserId) {
      // Appel authentifié depuis le mobile : générer uniquement pour cet utilisateur.
      userIds.push(selfUserId);
    } else if (body.user_id) {
      // Mode unitaire via route Next (service-role) : un seul utilisateur.
      userIds.push(body.user_id);
    } else {
      // Mode batch : tous les utilisateurs « dus » (fréquence active + période écoulée).
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, digest_frequency')
        .neq('digest_frequency', 'off');

      for (const p of (profiles ?? []) as { id: string; digest_frequency: string }[]) {
        const periodDays = p.digest_frequency === 'weekly' ? 7 : 30;
        const dueDate = new Date(Date.now() - periodDays * 24 * 60 * 60 * 1000).toISOString();

        const { data: last } = await supabase
          .from('digests')
          .select('created_at')
          .eq('user_id', p.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        // « Dû » si aucun digest, ou dernier plus vieux que la période.
        if (!last || last.created_at < dueDate) {
          userIds.push(p.id);
        }
      }
    }

    const results: Record<string, string> = {};

    for (const userId of userIds) {
      const result = await generateForUser(supabase, userId);
      results[userId] = result;
    }

    return json({ ok: true, processed: userIds.length, results });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});

async function generateForUser(
  supabase: ReturnType<typeof adminClient>,
  userId: string,
): Promise<string> {
  // Profil de l'utilisateur.
  const { data: profile } = await supabase
    .from('profiles')
    .select('digest_frequency, goals, interests, persona, expertise_level, time_per_week, digest_about')
    .eq('id', userId)
    .maybeSingle();

  if (!profile) return 'profil introuvable';

  const frequency: string = profile.digest_frequency ?? 'weekly';
  const periodDays = frequency === 'weekly' ? 7 : 30;

  // Fenêtre de la période.
  const { data: lastDigest } = await supabase
    .from('digests')
    .select('created_at, period_end')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const periodEnd = new Date();
  const periodStart = lastDigest?.period_end
    ? new Date(lastDigest.period_end)
    : new Date(Date.now() - periodDays * 24 * 60 * 60 * 1000);

  // Réels de la période.
  const { data: reelsRaw } = await supabase
    .from('reels')
    .select('id, title, caption, author_username, author_name, category:categories(name)')
    .eq('user_id', userId)
    .gte('added_at', periodStart.toISOString())
    .lte('added_at', periodEnd.toISOString())
    .order('added_at', { ascending: false });

  const reels = (reelsRaw ?? []) as unknown as {
    id: string;
    title: string | null;
    caption: string | null;
    author_username: string | null;
    author_name: string | null;
    category: { name: string } | null;
  }[];

  if (reels.length < 3) {
    return `ignoré — seulement ${reels.length} réel(s) sur la période`;
  }

  const snippets: ReelSnippet[] = reels.map((r) => ({
    reel_id: r.id,
    title: r.title,
    caption: r.caption,
    author_username: r.author_username,
    author_name: r.author_name,
    category: r.category?.name ?? null,
  }));

  const keys = await getApiKeys(supabase, userId, 'gemini');
  const result = await runWithRotation(supabase, keys, (key) =>
    selectDigestWithKey(
      {
        goals: (profile.goals as string[] | null) ?? [],
        interests: (profile.interests as string[] | null) ?? [],
        persona: profile.persona as string | null,
        expertise_level: profile.expertise_level as string | null,
        time_per_week: profile.time_per_week as string | null,
        digest_about: profile.digest_about as string | null,
        reels: snippets,
        maxPicks: 8,
      },
      key,
    )
  );

  if (!result) return 'échec Gemini (toutes les clés épuisées)';

  // Insérer le digest.
  const { data: digest, error: digestErr } = await supabase
    .from('digests')
    .insert({
      user_id: userId,
      frequency,
      period_start: periodStart.toISOString(),
      period_end: periodEnd.toISOString(),
      summary: result.summary,
      status: 'ready',
    })
    .select('id')
    .single();

  if (digestErr || !digest) return `erreur insert digest: ${digestErr?.message}`;

  // Insérer les réels sélectionnés.
  const validReelIds = new Set(reels.map((r) => r.id));
  const rows = result.picks
    .filter((p) => validReelIds.has(p.reel_id))
    .map((p, i) => ({
      digest_id: digest.id,
      reel_id: p.reel_id,
      rank: i,
      reason: p.reason,
    }));

  if (rows.length > 0) {
    await supabase.from('digest_reels').insert(rows);
  }

  // Notification push (best-effort).
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  fetch(`${supabaseUrl}/functions/v1/push-notify`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
    },
    body: JSON.stringify({
      user_id: userId,
      title: 'Ta sélection est prête ✨',
      body: `${rows.length} réel${rows.length > 1 ? 's' : ''} sélectionné${rows.length > 1 ? 's' : ''} pour toi${frequency === 'weekly' ? ' cette semaine' : ' ce mois'}.`,
      data: { digest_id: digest.id, screen: 'digest' },
    }),
  }).catch(() => {});

  return `ok — ${rows.length} réels sélectionnés (digest ${digest.id})`;
}
