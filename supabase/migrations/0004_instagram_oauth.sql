-- ReelVault — connexion Instagram par OAuth + onboarding
-- Ajoute le stockage du jeton OAuth et un drapeau d'onboarding.

-- ─────────── instagram_connections : jeton OAuth ───────────
alter table public.instagram_connections
  add column if not exists access_token     text,
  add column if not exists token_expires_at timestamptz;

-- L'OAuth ne génère pas de code d'activation : on le rend optionnel pour les
-- nouvelles connexions tout en conservant les anciennes lignes.
alter table public.instagram_connections
  alter column activation_code drop not null;

-- ─────────── profiles : onboarding ───────────
alter table public.profiles
  add column if not exists onboarded boolean not null default false;

-- Les comptes qui ont déjà des réels sont considérés comme onboardés.
update public.profiles p
   set onboarded = true
 where exists (select 1 from public.reels r where r.user_id = p.id);
