-- ID de messagerie Instagram (IGSID) — différent du user_id OAuth.
-- Le webhook fournit recipient.id qui est l'IGSID ; on le mémorise lors du jumelage.
alter table public.instagram_connections
  add column if not exists ig_messaging_id text;

create index if not exists instagram_connections_messaging_id_idx
  on public.instagram_connections (ig_messaging_id);
