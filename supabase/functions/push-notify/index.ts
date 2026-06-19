// push-notify — envoie une notification push via l'API Expo Push.
// Body: { user_id: string, title: string, body: string, data?: object }
import { adminClient } from '../_shared/supabase.ts';
import { handleOptions, json } from '../_shared/cors.ts';

Deno.serve(async (req) => {
  const pre = handleOptions(req);
  if (pre) return pre;

  try {
    const { user_id, title, body, data } = await req.json();
    if (!user_id || !title) return json({ error: 'user_id et title requis' }, 400);

    const supabase = adminClient();
    const { data: profile } = await supabase
      .from('profiles')
      .select('expo_push_token, notif_enabled')
      .eq('id', user_id)
      .maybeSingle();

    if (!profile?.expo_push_token || !profile.notif_enabled) {
      return json({ skipped: true, reason: 'pas de token ou notifications désactivées' });
    }

    const res = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        to: profile.expo_push_token,
        title,
        body,
        data: data ?? {},
        sound: 'default',
        channelId: 'reelvault-captures',
      }),
    });

    const result = await res.json();
    return json({ sent: true, result });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
