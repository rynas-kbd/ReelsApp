-- Sender autorisé : ne capturer que les réels partagés par LE compte principal.
-- L'utilisateur relie son compte principal en envoyant un code spécial (DM) au
-- compte connecté ; on mémorise alors l'IGSID de l'expéditeur (sender_id).
alter table public.instagram_connections
  add column if not exists sender_pairing_code text,
  add column if not exists sender_id          text,
  add column if not exists sender_username    text,
  add column if not exists sender_paired_at   timestamptz;

create index if not exists instagram_connections_pairing_code_idx
  on public.instagram_connections (sender_pairing_code);
