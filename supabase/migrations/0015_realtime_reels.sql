-- Migration 0015 : activer Supabase Realtime sur la table reels.
--
-- Requis pour l'affichage progressif : les cartes se mettent à jour en direct
-- dès que status passe pending → enriched → classified.
--
-- REPLICA IDENTITY FULL expose toutes les colonnes dans les payloads OLD des
-- événements UPDATE/DELETE, ce qui permet le filtre user_id=eq.<uid> côté client
-- (sans ça, seule la PK est disponible dans OLD, ce qui bloque les filtres DELETE).

alter table public.reels replica identity full;

-- Ajoute la table à la publication Realtime de Supabase.
-- La RLS de la table garantit que chaque client ne reçoit que ses propres lignes.
alter publication supabase_realtime add table public.reels;
