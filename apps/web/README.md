# @reelvault/web

Application web de **ReelVault** — sauvegarde et organise tes réels Instagram.
Next.js 15 (App Router) · TypeScript · Tailwind CSS · shadcn/ui · Supabase · dark mode.

## Variables d'environnement

Crée un fichier `.env.local` à la racine de `apps/web` (voir `.env.example`) :

```
NEXT_PUBLIC_SUPABASE_URL=https://votre-projet.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=votre-cle-anon-publique
```

## Commandes

Depuis la **racine du monorepo** :

```bash
npm install                              # installe toutes les dépendances du workspace
npm run dev --workspace @reelvault/web   # serveur de développement (http://localhost:3000)
npm run build --workspace @reelvault/web # build de production
npm run start --workspace @reelvault/web # sert le build de production
```

Depuis `apps/web` :

```bash
npm run dev        # développement
npm run build      # build
npm run typecheck  # vérification TypeScript (tsc --noEmit)
npm run lint       # ESLint
```

## Structure

```
src/
  app/
    (auth)/login, (auth)/signup   # authentification email/mot de passe
    (app)/library                 # bibliothèque de réels (cœur de l'app)
    (app)/dashboard               # catégories + statistiques (recharts)
    (app)/settings                # compte, connexion Instagram, préférences, export CSV/PDF
    auth/signout                  # route handler de déconnexion
  components/
    ui/                           # composants shadcn/ui
    app/, auth/, library/, dashboard/, settings/, brand/
  lib/
    supabase/{client,server,middleware}.ts
    utils.ts, stats.ts, export.ts
  middleware.ts                   # protection des routes + rafraîchissement de session
```

## Intégration monorepo

- Source de vérité du thème : `@reelvault/design-tokens` (mappé dans `tailwind.config.ts` + `globals.css`).
- Logique data partagée + textes FR : `@reelvault/shared` (`STRINGS`, `fetchReels`, etc.).
- Ces packages sont du TS source : `transpilePackages` est configuré dans `next.config.ts`.

## Déploiement

Cible : **Vercel**. Renseigner `NEXT_PUBLIC_SUPABASE_URL` et `NEXT_PUBLIC_SUPABASE_ANON_KEY`
dans les variables d'environnement du projet Vercel. Root directory : `apps/web`.
