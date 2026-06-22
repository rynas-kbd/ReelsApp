-- ReelVault — cron quotidien pour générer les digests périodiques.
--
-- ⚠️  ÉTAPE MANUELLE (voir MANUEL_HUMAIN.md) :
--     Remplace <SUPABASE_PROJECT_URL> et <SERVICE_ROLE_KEY> par les vraies valeurs
--     de ton projet Supabase avant d'exécuter ce fichier.
--     Tu les trouves dans : Dashboard Supabase → Project Settings → API.
--
--     Commande à lancer dans le SQL Editor de Supabase (une seule fois) :
--
--     select cron.schedule(
--       'reelvault-generate-digests',
--       '0 8 * * *',     -- tous les jours à 08h00 UTC
--       $$
--         select net.http_post(
--           url := '<SUPABASE_PROJECT_URL>/functions/v1/generate-digest',
--           headers := '{"Content-Type":"application/json","Authorization":"Bearer <SERVICE_ROLE_KEY>"}'::jsonb,
--           body := '{"cron":true}'::jsonb
--         );
--       $$
--     );
--
-- Ce fichier active les extensions nécessaires mais n'exécute PAS le cron lui-même
-- (les secrets ne sont pas connus au moment du déploiement des migrations).

create extension if not exists pg_cron;
create extension if not exists pg_net;
