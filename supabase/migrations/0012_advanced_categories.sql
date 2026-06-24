-- ReelVault — catégories hiérarchiques + tags + résumé + transcript + recherche hybride
-- Décisions :
--   • categories.parent_id (NULL = racine) pour 2 niveaux de hiérarchie
--   • reels.tags text[], summary, transcript, media_type, embedding vector(768)
--   • reels.search_vector tsvector généré (titre + légende + résumé + transcript + tags + auteur)
--   • user_api_keys.provider étendu à 'groq' (Whisper STT)
--   • RPC category_descendants + search_reels (RRF plein-texte × sémantique)

-- ─────────────────────────── pgvector (embeddings) ──────────────────────────
create extension if not exists vector;

-- ─────────────────────────── categories — hiérarchie ───────────────────────
alter table public.categories
  add column if not exists parent_id uuid references public.categories(id) on delete cascade;

-- Remplace l'ancienne contrainte unique(user_id, slug) par deux index partiels :
--   • racines  : (user_id, slug) uniques quand parent_id IS NULL
--   • enfants  : (user_id, parent_id, slug) uniques quand parent_id IS NOT NULL
alter table public.categories drop constraint if exists categories_user_id_slug_key;

create unique index if not exists categories_root_slug_idx
  on public.categories (user_id, slug)
  where parent_id is null;

create unique index if not exists categories_child_slug_idx
  on public.categories (user_id, parent_id, slug)
  where parent_id is not null;

create index if not exists categories_parent_idx
  on public.categories (user_id, parent_id, sort_order);

-- ─────────────────────────── user_api_keys — provider 'groq' ───────────────
alter table public.user_api_keys
  drop constraint if exists user_api_keys_provider_check;

alter table public.user_api_keys
  add constraint user_api_keys_provider_check
    check (provider in ('gemini', 'rapidapi', 'groq'));

-- ─────────────────────────── reels — nouveaux champs ───────────────────────
-- Colonnes simples d'abord (nécessaires avant search_vector)
alter table public.reels
  add column if not exists tags        text[]  not null default '{}',
  add column if not exists summary     text,
  add column if not exists transcript  text,
  add column if not exists media_type  text
    check (media_type in ('video', 'image'));

-- Embedding sémantique (768 dimensions, modèle text-embedding-004)
alter table public.reels
  add column if not exists embedding vector(768);

-- Wrapper IMMUTABLE obligatoire : PostgreSQL refuse to_tsvector('french', …) directement
-- dans une colonne générée STORED car le cast text→regconfig est jugé non-immutable
-- au moment de la validation de l'expression. La déclaration IMMUTABLE de la fonction
-- contourne cette vérification (pattern recommandé par la communauté PostgreSQL).
create or replace function public.reels_search_vector(
  p_title       text,
  p_caption     text,
  p_summary     text,
  p_transcript  text,
  p_tags        text[],
  p_author      text
) returns tsvector
language sql immutable
set search_path = public
as $$
  select to_tsvector(
    'pg_catalog.french'::regconfig,
    coalesce(p_title,      '') || ' ' ||
    coalesce(p_caption,    '') || ' ' ||
    coalesce(p_summary,    '') || ' ' ||
    coalesce(p_transcript, '') || ' ' ||
    array_to_string(p_tags, ' ') || ' ' ||
    coalesce(p_author,     '')
  )
$$;

-- Colonne tsvector générée via le wrapper IMMUTABLE
alter table public.reels
  add column if not exists search_vector tsvector
  generated always as (
    public.reels_search_vector(title, caption, summary, transcript, tags, author_username)
  ) stored;

-- ─────────────────────────── Index ─────────────────────────────────────────
create index if not exists reels_tags_idx
  on public.reels using gin (tags);

create index if not exists reels_search_idx
  on public.reels using gin (search_vector);

-- HNSW pour la recherche cosinus (opérateur <=>)
create index if not exists reels_embedding_idx
  on public.reels using hnsw (embedding vector_cosine_ops);

-- ─────────────────────────── RPC : descendants d'une catégorie ─────────────
-- Renvoie l'uuid de la catégorie elle-même + tous ses enfants directs.
-- (2 niveaux max → pas de CTE récursive nécessaire.)
create or replace function public.category_descendants(p_category uuid)
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select id from public.categories
  where id = p_category
     or parent_id = p_category;
$$;

grant execute on function public.category_descendants(uuid) to authenticated;

-- ─────────────────────────── RPC : recherche hybride des réels ─────────────
-- Fusionne plein-texte (tsvector/ts_rank) et sémantique (embedding/cosinus)
-- par Reciprocal Rank Fusion (RRF, k=60). Filtre par user_id (RLS-safe en service-role).
-- Si p_embedding est NULL → plein-texte seul.
create or replace function public.search_reels(
  p_user      uuid,
  p_query     text,
  p_embedding vector(768),
  p_limit     int default 30
)
returns table (reel_id uuid, score double precision)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  k constant int := 60;
begin
  return query
  with
  ft as (
    -- Classement plein-texte
    select r.id,
           row_number() over (
             order by ts_rank(r.search_vector,
                              websearch_to_tsquery('french', p_query)) desc
           ) as rk
    from public.reels r
    where r.user_id = p_user
      and r.search_vector @@ websearch_to_tsquery('french', p_query)
    limit p_limit * 4
  ),
  sem as (
    -- Classement sémantique (uniquement si embedding disponible)
    select r.id,
           row_number() over (
             order by r.embedding <=> p_embedding
           ) as rk
    from public.reels r
    where r.user_id = p_user
      and r.embedding is not null
      and p_embedding is not null
    order by r.embedding <=> p_embedding
    limit p_limit * 4
  ),
  rrf as (
    -- Fusion RRF
    select
      coalesce(ft.id, sem.id)                       as id,
      coalesce(1.0 / (k + ft.rk),  0.0)
        + coalesce(1.0 / (k + sem.rk), 0.0)         as score
    from ft full outer join sem on ft.id = sem.id
  )
  select rrf.id, rrf.score
  from rrf
  order by rrf.score desc
  limit p_limit;
end;
$$;

grant execute on function public.search_reels(uuid, text, vector(768), int) to authenticated;
