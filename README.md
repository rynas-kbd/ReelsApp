# ReelVault

Sauvegarde et organise automatiquement tes réels Instagram. Quand tu partages un réel vers ton
compte secondaire, ReelVault le capture (webhook Meta), le classe par thème avec une IA, et
l'affiche dans une bibliothèque claire — sur le web et sur mobile.

> **Tu cherches comment installer / configurer ?** Tout est expliqué pas à pas, en langage simple,
> dans **[`MANUEL_HUMAIN.md`](./MANUEL_HUMAIN.md)**.

## Structure du projet

```
reelvault/
├─ apps/
│  ├─ web/        Application web (Next.js, déployée sur Vercel)
│  └─ mobile/     Application mobile Android (Expo / React Native)
├─ packages/
│  ├─ shared/         Types, catégories, textes FR, accès données (partagé web + mobile)
│  └─ design-tokens/  Couleurs, typo, espacements (thème dark partagé)
└─ supabase/
   ├─ migrations/     Schéma de la base de données (SQL)
   └─ functions/      Edge Functions (webhook Meta, IA, enrichissement, push)
```

## Stack

- **Backend** : Supabase (PostgreSQL + Auth + Edge Functions Deno + Storage)
- **IA de classification** : Google Gemini (free tier)
- **Web** : Next.js 15 (App Router), Tailwind CSS, shadcn/ui — dark mode par défaut
- **Mobile** : Expo (dev build), React Native, widget Android + push + partage
- **Capture** : webhook Meta (Instagram Messaging) + ajout manuel par lien + partage Android

## Démarrage rapide (développeurs)

```bash
npm install
# Backend
supabase link --project-ref <ton-ref>
supabase db push
supabase functions deploy
# Web
npm run web
# Mobile
npm run mobile
```

Les valeurs à remplir (clés, tokens) sont décrites dans `MANUEL_HUMAIN.md`.
