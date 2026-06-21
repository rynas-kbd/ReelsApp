-- ReelVault — états OAuth Instagram (anti-CSRF + association à l'utilisateur)
-- Une ligne est créée au démarrage du flux (action=start), lue puis supprimée
-- au retour (callback). Accessible uniquement via service_role (Edge Function).

create table if not exists public.oauth_states (
  state       text primary key,
  user_id     uuid not null references auth.users (id) on delete cascade,
  platform    text not null default 'web' check (platform in ('web', 'mobile')),
  next_path   text,
  origin      text,
  created_at  timestamptz not null default now()
);

create index if not exists oauth_states_user_idx on public.oauth_states (user_id);
create index if not exists oauth_states_created_idx on public.oauth_states (created_at);

-- RLS activée sans politique → inaccessible aux clients (comme webhook_events).
alter table public.oauth_states enable row level security;
