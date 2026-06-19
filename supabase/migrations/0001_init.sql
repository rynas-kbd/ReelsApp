-- ReelVault — schéma initial
-- Tables : profiles, categories, instagram_connections, reels, reel_views, webhook_events

create extension if not exists "pgcrypto";       -- gen_random_uuid()
create extension if not exists "pg_trgm";          -- recherche ilike performante

-- ───────────────────────────── profiles ─────────────────────────────
create table if not exists public.profiles (
  id              uuid primary key references auth.users (id) on delete cascade,
  display_name    text,
  notif_enabled   boolean not null default true,
  expo_push_token text,
  created_at      timestamptz not null default now()
);

-- ──────────────────────────── categories ────────────────────────────
create table if not exists public.categories (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  name        text not null,
  slug        text not null,
  color       text not null default '#7C3AED',
  icon        text,
  is_default  boolean not null default false,
  sort_order  int not null default 0,
  created_at  timestamptz not null default now(),
  unique (user_id, slug)
);
create index if not exists categories_user_idx on public.categories (user_id, sort_order);

-- ─────────────────────── instagram_connections ──────────────────────
create table if not exists public.instagram_connections (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users (id) on delete cascade,
  ig_account_id   text,
  ig_username     text,
  page_id         text,
  activation_code text not null unique,
  status          text not null default 'pending'
                    check (status in ('pending', 'active', 'revoked')),
  connected_at    timestamptz,
  created_at      timestamptz not null default now()
);
create index if not exists ig_conn_user_idx on public.instagram_connections (user_id);
create index if not exists ig_conn_code_idx on public.instagram_connections (activation_code);
create index if not exists ig_conn_account_idx on public.instagram_connections (ig_account_id);

-- ─────────────────────────────── reels ──────────────────────────────
create table if not exists public.reels (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users (id) on delete cascade,
  ig_url          text not null,
  shortcode       text,
  thumbnail_url   text,
  title           text,
  caption         text,
  author_username text,
  author_name     text,
  category_id     uuid references public.categories (id) on delete set null,
  source          text not null default 'manual'
                    check (source in ('webhook', 'manual', 'share')),
  status          text not null default 'pending'
                    check (status in ('pending', 'enriched', 'classified', 'failed')),
  view_count      int not null default 0,
  added_at        timestamptz not null default now(),
  raw_metadata    jsonb,
  -- évite les doublons d'un même réel pour un même utilisateur
  unique (user_id, shortcode)
);
create index if not exists reels_user_added_idx on public.reels (user_id, added_at desc);
create index if not exists reels_category_idx on public.reels (category_id);
create index if not exists reels_author_idx on public.reels (user_id, author_username);
create index if not exists reels_title_trgm_idx on public.reels using gin (title gin_trgm_ops);
create index if not exists reels_caption_trgm_idx on public.reels using gin (caption gin_trgm_ops);

-- ───────────────────────────── reel_views ───────────────────────────
create table if not exists public.reel_views (
  id        uuid primary key default gen_random_uuid(),
  reel_id   uuid not null references public.reels (id) on delete cascade,
  user_id   uuid not null references auth.users (id) on delete cascade,
  viewed_at timestamptz not null default now()
);
create index if not exists reel_views_reel_idx on public.reel_views (reel_id);
create index if not exists reel_views_user_idx on public.reel_views (user_id, viewed_at desc);

-- ──────────────────────────── webhook_events ────────────────────────
-- Journal brut des appels webhook Meta (debug / rejeu). Pas de RLS publique.
create table if not exists public.webhook_events (
  id          uuid primary key default gen_random_uuid(),
  payload     jsonb not null,
  signature_ok boolean,
  handled     boolean not null default false,
  note        text,
  received_at timestamptz not null default now()
);
create index if not exists webhook_events_received_idx on public.webhook_events (received_at desc);
