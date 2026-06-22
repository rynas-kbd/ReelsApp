-- ReelVault — profil utilisateur enrichi + tables digest

-- ─────────── Profil utilisateur : champs "second brain" ───────────
alter table public.profiles
  add column if not exists goals           text[]     default null,
  add column if not exists interests       text[]     default null,
  add column if not exists persona         text       default null,
  add column if not exists expertise_level text       default null
    constraint expertise_level_check check (expertise_level in ('debutant','intermediaire','avance')),
  add column if not exists time_per_week   text       default null,
  add column if not exists digest_about    text       default null,
  add column if not exists digest_frequency text      not null default 'weekly'
    constraint digest_frequency_check check (digest_frequency in ('weekly','monthly','off')),
  add column if not exists profile_completed boolean  not null default false;

-- ─────────────────────────── digests ───────────────────────────────
-- Chaque ligne = une sélection périodique générée par l'IA pour un utilisateur.
create table if not exists public.digests (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users (id) on delete cascade,
  frequency     text,                        -- 'weekly' | 'monthly'
  period_start  timestamptz,
  period_end    timestamptz,
  summary       text,                        -- synthèse rédigée par Gemini
  rating        int constraint rating_range check (rating between 1 and 5),
  rated_at      timestamptz,
  status        text not null default 'ready',
  created_at    timestamptz not null default now()
);

create index if not exists digests_user_created_idx
  on public.digests (user_id, created_at desc);

-- ──────────────────────── digest_reels ─────────────────────────────
-- Réels sélectionnés (ordonnés) pour chaque digest.
create table if not exists public.digest_reels (
  digest_id  uuid not null references public.digests (id) on delete cascade,
  reel_id    uuid not null references public.reels   (id) on delete cascade,
  rank       int  not null default 0,
  reason     text,   -- justification courte de l'IA
  primary key (digest_id, reel_id)
);

create index if not exists digest_reels_digest_idx
  on public.digest_reels (digest_id, rank);

-- ─────────────────────── RLS — digests ─────────────────────────────
alter table public.digests enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='digests' and policyname='digests_select'
  ) then
    create policy digests_select on public.digests
      for select using (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='digests' and policyname='digests_update_rating'
  ) then
    -- L'utilisateur ne peut que noter (update rating) ses propres digests.
    create policy digests_update_rating on public.digests
      for update using (auth.uid() = user_id)
      with check (auth.uid() = user_id);
  end if;
end $$;

-- ─────────────────────── RLS — digest_reels ────────────────────────
alter table public.digest_reels enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='digest_reels' and policyname='digest_reels_select'
  ) then
    create policy digest_reels_select on public.digest_reels
      for select using (
        exists (
          select 1 from public.digests d
          where d.id = digest_id and d.user_id = auth.uid()
        )
      );
  end if;
end $$;
