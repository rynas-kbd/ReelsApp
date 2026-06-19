-- ReelVault — Row Level Security
-- Principe : chaque utilisateur ne voit/modifie que ses propres lignes.
-- Les Edge Functions privilégiées utilisent la service_role key (bypass RLS).

alter table public.profiles               enable row level security;
alter table public.categories             enable row level security;
alter table public.instagram_connections  enable row level security;
alter table public.reels                  enable row level security;
alter table public.reel_views             enable row level security;
alter table public.webhook_events         enable row level security;

-- profiles ───────────────────────────────────────────────
create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id);
create policy "profiles_insert_own" on public.profiles
  for insert with check (auth.uid() = id);

-- categories ─────────────────────────────────────────────
create policy "categories_all_own" on public.categories
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- instagram_connections ──────────────────────────────────
create policy "ig_conn_all_own" on public.instagram_connections
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- reels ──────────────────────────────────────────────────
create policy "reels_all_own" on public.reels
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- reel_views ─────────────────────────────────────────────
create policy "reel_views_all_own" on public.reel_views
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- webhook_events : aucune politique → inaccessible aux clients (seul service_role y accède).
