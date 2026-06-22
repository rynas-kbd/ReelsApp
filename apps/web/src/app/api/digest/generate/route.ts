import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'non authentifié' }, { status: 401 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json({ error: 'configuration manquante' }, { status: 500 });
  }

  const res = await fetch(`${supabaseUrl}/functions/v1/generate-digest`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${serviceRoleKey}`,
    },
    body: JSON.stringify({ user_id: user.id }),
  });

  const data = await res.json().catch(() => ({})) as {
    results?: Record<string, string>;
    tooFew?: boolean;
  };

  if (!res.ok) {
    return NextResponse.json({ error: 'génération échouée', ...data }, { status: 502 });
  }

  const result = data.results?.[user.id] ?? '';
  if (result.includes('seulement')) {
    return NextResponse.json({ tooFew: true, result }, { status: 422 });
  }

  return NextResponse.json({ ok: true, result });
}
