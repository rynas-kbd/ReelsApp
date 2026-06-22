-- Clés API par utilisateur (BYOK) + rotation.
-- Chaque user peut enregistrer plusieurs clés par provider ; l'enrichissement et le
-- classement basculent sur la clé suivante quand l'une est en quota/échec.
create table if not exists public.user_api_keys (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null check (provider in ('gemini', 'rapidapi')),
  key text not null,
  label text,
  cooldown_until timestamptz,   -- mise en pause temporaire après un quota (429)
  last_error text,
  last_used_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists user_api_keys_user_provider_idx
  on public.user_api_keys (user_id, provider);

alter table public.user_api_keys enable row level security;

-- L'utilisateur ne voit/gère QUE ses propres clés. (Les Edge Functions lisent en service-role.)
do $$
begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='user_api_keys' and policyname='user_api_keys_select') then
    create policy user_api_keys_select on public.user_api_keys for select using (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='user_api_keys' and policyname='user_api_keys_insert') then
    create policy user_api_keys_insert on public.user_api_keys for insert with check (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='user_api_keys' and policyname='user_api_keys_update') then
    create policy user_api_keys_update on public.user_api_keys for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='user_api_keys' and policyname='user_api_keys_delete') then
    create policy user_api_keys_delete on public.user_api_keys for delete using (auth.uid() = user_id);
  end if;
end $$;
