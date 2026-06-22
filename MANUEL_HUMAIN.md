# 📘 MANUEL HUMAIN — ReelVault

Ce guide liste **uniquement ce que TU dois faire toi-même**, dans l'ordre. Suis les étapes une par une. Pas besoin d'être développeur : copie/colle les commandes telles quelles.

> 💡 **Astuce** : tu peux aussi me donner les accès (clé Supabase, etc.) et je ferai à ta place toutes les étapes techniques. Dans ce cas, fournis-moi les éléments marqués 🔑.

---

## ⚡ Vue d'ensemble (ce qu'on va faire)

1. Créer/préparer les comptes nécessaires (15 min)
2. Mettre la base de données et la « logique » en ligne sur Supabase (10 min)
3. Brancher l'IA gratuite (Google Gemini) (5 min)
4. Connecter Instagram via Meta (l'étape la plus longue) (30–60 min + délai de validation Meta)
5. Mettre le site web en ligne (Vercel) (10 min)
6. Installer l'app Android sur ton téléphone (15 min)
7. Activer la capture automatique et tester (5 min)

---

## 🧰 Étape 0 — Logiciels à installer sur ton ordinateur

Installe ces 3 outils (si ce n'est pas déjà fait) :

1. **Node.js** (version 20 ou plus) → https://nodejs.org (prends la version « LTS »).
2. **Supabase CLI** → https://supabase.com/docs/guides/cli (ou, dans un terminal : `npm install -g supabase`).
3. **Git** (pour récupérer/gérer le code) → https://git-scm.com.

Ensuite, ouvre un terminal **dans le dossier `reelvault`** et lance une seule fois :

```bash
npm install
```

---

## 👤 Étape 1 — Créer les comptes

Crée (gratuitement) un compte sur chacun de ces services. Note tes identifiants.

| Service | À quoi ça sert | Lien |
|---|---|---|
| **Supabase** | Base de données + comptes utilisateurs + automatisations | https://supabase.com |
| **Google AI Studio** | L'IA gratuite qui classe les réels | https://aistudio.google.com |
| **Meta for Developers** | Capter les réels partagés sur Instagram | https://developers.facebook.com |
| **Vercel** | Héberger le site web | https://vercel.com |
| **Expo** | Construire l'app Android | https://expo.dev |

👉 Pour Instagram, il te faut aussi : **un compte Instagram « Professionnel »** (Business ou Créateur) pour ton **compte secondaire**, **relié à une Page Facebook**. (Dans l'app Instagram : Paramètres → Compte → Passer à un compte professionnel.)

---

## 🗄️ Étape 2 — Mettre la base de données en ligne (Supabase)

1. Sur https://supabase.com, crée un **nouveau projet** (ou ouvre ton projet existant). Choisis une région proche de toi et un mot de passe de base de données (garde-le).
2. 🔑 Récupère ton **« Reference ID »** du projet : Supabase → Project Settings → General → *Reference ID* (ça ressemble à `abcdefghijklmno`).
3. Dans le terminal, depuis le dossier `reelvault` :

```bash
supabase login
supabase link --project-ref TON_REFERENCE_ID
supabase db push
supabase functions deploy meta-webhook enrich-reel classify-reel add-reel push-notify
```

> `db push` installe toutes les tables. `functions deploy` met en ligne les 5 automatisations (webhook, IA, etc.).

4. 🔑 Récupère tes **clés API** : Supabase → Project Settings → **API**. Tu auras besoin de :
   - **Project URL** (ex. `https://abcdefghijklmno.supabase.co`)
   - **anon public** (clé publique)
   - **service_role** (clé secrète — ne la partage jamais publiquement)

---

## 🤖 Étape 3 — Brancher l'IA gratuite (Google Gemini)

1. Va sur https://aistudio.google.com → **Get API key** → crée une clé.
2. 🔑 Copie cette clé (elle commence par `AIza...`).

(On la mettra dans Supabase à l'étape suivante.)

---

## 🔐 Étape 4 — Donner les clés secrètes à Supabase

1. Dans le dossier `reelvault/supabase`, copie le fichier `.env.example` et renomme la copie en `.env`.
2. Ouvre ce `.env` et remplis les valeurs avec ce que tu as récupéré :
   - `SUPABASE_URL` = ton Project URL
   - `SUPABASE_ANON_KEY` = ta clé anon
   - `SUPABASE_SERVICE_ROLE_KEY` = ta clé service_role
   - `GEMINI_API_KEY` = ta clé Google AI Studio
   - (Les valeurs `META_...` seront remplies à l'étape 5.)
3. Envoie ces secrets à Supabase :

```bash
supabase secrets set --env-file supabase/.env
```

---

## 📸 Étape 5 — Connecter Instagram (Meta) — *l'étape la plus technique*

> C'est l'étape la plus longue car Meta impose des règles strictes. Prends ton temps. Tu peux revenir aux autres étapes (web/mobile) en attendant la validation de Meta.

### 5.1 Créer l'application Meta
1. Va sur https://developers.facebook.com → **My Apps** → **Create App**.
2. Choisis le type **« Business »**.
3. Dans le tableau de bord de l'app, ajoute le produit **« Instagram »** (messagerie / Instagram Graph API).

### 5.2 Relier ton compte Instagram secondaire
1. Assure-toi que ton **compte Instagram secondaire est en « Professionnel »** et **relié à une Page Facebook** (voir Étape 1).
2. Dans l'app Meta, connecte cette Page / ce compte Instagram.

### 5.3 Récupérer les informations 🔑
Dans les réglages de l'app Meta, note :
- **App ID** (`META_APP_ID`)
- **App Secret** (`META_APP_SECRET`) — bouton « Show »
- **Token de la Page** (`META_PAGE_TOKEN`) — généré dans les outils Graph API
- **Verify Token** (`META_VERIFY_TOKEN`) — **un mot de passe que TU inventes** (ex. `reelvault-secret-2026`). Retiens-le, il sert juste en dessous.

Ajoute ces 4 valeurs dans `supabase/.env`, puis relance :
```bash
supabase secrets set --env-file supabase/.env
```

### 5.4 Brancher le webhook
1. Dans l'app Meta → **Webhooks** (ou Instagram → Configuration → Webhooks).
2. **URL de rappel (Callback URL)** :
   ```
   https://TON_REFERENCE_ID.supabase.co/functions/v1/meta-webhook
   ```
3. **Verify Token** : exactement le même mot de passe que tu as mis dans `META_VERIFY_TOKEN`.
4. Clique **Vérifier et enregistrer**. Si c'est vert, c'est bon ✅.
5. **Abonne-toi** au champ **`messages`** (et `messaging_postbacks` si proposé).

### 5.5 Demander l'autorisation (App Review)
Pour capter les messages, Meta exige une validation de la permission **`instagram_manage_messages`** (« App Review »).
- En mode **développement**, ça marche déjà pour TON propre compte (testeur) — donc tu peux **tester tout de suite** sans attendre.
- Pour un usage permanent, soumets la demande de review dans l'app Meta. ⚠️ Meta peut refuser certains usages : c'est un risque connu, indépendant de l'app.

---

### 5.6 Enrichissement des réels (miniatures, légendes, auteurs) — via RapidAPI

> ⚠️ L'oEmbed de Meta exige la validation « oEmbed Read » (App Review) et ne marchait
> pas de façon fiable. On utilise désormais **RapidAPI (instagram120)** qui renvoie
> directement miniature + légende + auteur + likes/commentaires, sans App Review.

1. La fonction `enrich-reel` appelle l'endpoint `POST /api/instagram/links` de
   l'API **instagram120** sur RapidAPI.
2. Secrets nécessaires côté Supabase (déjà posés) :
   - `RAPIDAPI_KEY` = ta clé RapidAPI
   - `RAPIDAPI_HOST` = `instagram120.p.rapidapi.com` (défaut)
   ```bash
   supabase secrets set RAPIDAPI_KEY=ta_cle RAPIDAPI_HOST=instagram120.p.rapidapi.com
   ```
3. **Miniatures durables** : les URLs d'image Instagram (CDN) expirent en quelques
   jours. `enrich-reel` télécharge la miniature et la réhéberge dans le bucket public
   **`thumbnails`** (migration `0006_thumbnails_bucket.sql`). Pour créer ce bucket :
   ```bash
   supabase db push --linked
   ```
   > Tant que le bucket n'existe pas, l'enrichissement marche quand même mais stocke
   > l'URL CDN (qui finira par expirer) ; après création du bucket, les miniatures
   > sont permanentes.

(L'ancienne app Meta oEmbed Read n'est plus utilisée. Les secrets `META_OEMBED_*`
peuvent rester, ils sont ignorés.)

### 5.8 Clés API personnelles (BYOK) + rotation

> Chaque utilisateur peut enregistrer **ses propres clés** Gemini (classement IA) et
> RapidAPI (enrichissement) dans **Réglages → Mes clés API**. On peut en mettre
> **plusieurs par service** : ReelVault bascule automatiquement sur la suivante quand
> l'une atteint son quota (rotation). Une clé en quota est mise en pause ~6 h puis
> réessayée.

- Stockage : table `user_api_keys` (migration `0007_user_api_keys.sql`, RLS = chacun
  ne voit que ses clés). À appliquer : `supabase db push --linked`.
- Ordre d'essai par les Edge Functions (`enrich-reel`, `classify-reel`) : clés de
  l'utilisateur (hors pause) → clé partagée d'environnement (`GEMINI_API_KEY` /
  `RAPIDAPI_KEY`) en repli → clés en pause en dernier recours.
- Donc si un utilisateur n'a pas mis de clé, la clé partagée (quota limité) est utilisée.

### 5.7 Connexion du compte par bouton « Se connecter avec Instagram » (OAuth)

> L'utilisateur ne tape **plus** de code d'activation : il clique sur
> **« Se connecter avec Instagram »** (onboarding, Réglages web, app mobile).
> L'OAuth passe par des **routes Next.js** (`/api/instagram/connect` →
> `/api/instagram/callback`), sur le domaine de l'app (pattern éprouvé). Une seule
> redirect_uri sert le web **et** le mobile (retour mobile via deep link `reelvault://instagram`).

**A. Variables d'environnement à poser sur Vercel** (projet `reels-web-app` → Settings → Environment Variables) :
| Variable | Valeur |
|---|---|
| `META_APP_ID` | `1523515752503377` |
| `META_APP_SECRET` | (App Secret de l'app Meta de ReelVault) |
| `NEXT_PUBLIC_META_APP_ID` | `1523515752503377` |
| `NEXT_PUBLIC_SITE_URL` | `https://reels-web-app.vercel.app` |
| `SUPABASE_SERVICE_ROLE_KEY` | (clé service_role du projet Supabase) |

Puis **redeploy** (Vercel → Deployments → Redeploy) pour que les routes prennent les variables.

**B. Enregistrer la redirect URI dans Meta** (app `1523515752503377`) :
1. App Meta → **Instagram → API setup with Instagram login** → réglages OAuth (Business login).
2. Dans **« Valid OAuth Redirect URIs »**, ajoute exactement :
   ```
   https://reels-web-app.vercel.app/api/instagram/callback
   ```
3. Scopes : `instagram_business_basic`, `instagram_business_manage_messages`. Enregistre.
4. En mode dev, ça marche tout de suite pour **ton** compte (testeur). Public = App Review.

> ⚠️ Si la connexion échoue avec « Invalid platform app / client_id », c'est que
> l'app `1523…` n'a pas « Instagram login » activé. Soit l'activer, soit basculer
> `META_APP_ID`/`META_APP_SECRET` (Vercel) sur l'app d'InstaFlow (`1531219198527598`)
> qui fonctionne déjà — le code est piloté par ces variables.

## 🌐 Étape 6 — Mettre le site web en ligne (Vercel)

1. Mets le code sur GitHub (crée un dépôt et pousse le dossier `reelvault`), ou connecte directement Vercel à ton dossier.
2. Sur https://vercel.com → **Add New Project** → choisis le dépôt.
3. **Important** : règle le « Root Directory » sur `apps/web`.
4. Dans **Environment Variables**, ajoute :
   - `NEXT_PUBLIC_SUPABASE_URL` = ton Project URL Supabase
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = ta clé anon
5. Clique **Deploy**. Au bout de quelques minutes, ton site est en ligne 🎉.

> Pour tester en local d'abord : crée `apps/web/.env.local` avec les 2 mêmes variables, puis lance `npm run web` et ouvre http://localhost:3000.

---

## 📱 Étape 7 — Construire et installer l'app Android (APK)

> L'app utilise des fonctions Android (widget, partage, notifications) → on génère un **APK autonome** dans le cloud Expo (gratuit). Pas besoin d'installer Android Studio. ⚠️ Pour te connecter dans l'app, le **backend doit être déployé** (Étape 2).

1. **Installe l'outil EAS** (une fois) :
   ```bash
   npm install -g eas-cli
   ```
2. **Connecte-toi à ton compte Expo** :
   ```bash
   eas login
   ```
3. **Place-toi dans le dossier mobile** et **initialise le projet** :
   ```bash
   cd apps/mobile
   eas init
   ```
   → EAS crée le projet et affiche un **Project ID** (du type `12ab34cd-...`).
4. **Colle ce Project ID** dans le fichier `apps/mobile/app.config.ts` : remplace la ligne
   `projectId: '00000000-0000-0000-0000-000000000000'` par ton vrai ID.
   *(Dis-le-moi et je le fais pour toi si tu préfères.)*
5. **Lance la construction de l'APK** :
   ```bash
   eas build --profile preview --platform android
   ```
   → Patiente ~10–20 min (file d'attente cloud gratuite). À la fin, EAS te donne un **lien pour télécharger le fichier `.apk`**.
6. **Installe l'`.apk`** sur ton téléphone Android (autorise « sources inconnues » si demandé).
7. Ouvre l'app, crée/connecte ton compte (le même que sur le web).
8. **Widget** : appui long sur l'écran d'accueil → Widgets → ReelVault → glisse-le sur l'écran.
9. **Notifications** : accepte la demande à l'ouverture.

> Plus tard, pour publier sur le Play Store, utilise `--profile production` (génère un `.aab`).
> Détails et alternatives (build en local avec Android Studio) : voir `apps/mobile/README.md`.

---

## ✅ Étape 8 — Activer la capture automatique et tester

1. **Connecte ton compte Instagram secondaire** (celui qui reçoit les partages) :
   site web ou app → **Paramètres → Connexion Instagram → « Se connecter avec Instagram »**
   (OAuth, voir Étape 5.7). Le statut passe à **« Connecté »** ✅.
2. **Relie ton compte principal** (celui depuis lequel tu partages) :
   sous la connexion, un **code de jumelage** s'affiche (ex. `RV-A1B2C3`).
   Depuis ton **compte principal**, envoie ce code en **message privé (DM)** à ton compte
   connecté. ReelVault mémorise alors ton compte principal comme **seul** expéditeur autorisé.
   Le statut « Compte principal relié » ✅ apparaît (clique « Vérifier » si besoin).
3. **Ajoute tes clés** (classement + miniatures) : Paramètres → **Mes clés API** (voir Étape 5.8).
   L'onboarding te guide aussi pas à pas pour les obtenir.
4. Depuis ton **compte principal**, **partage un réel** vers ton compte connecté (bouton « Partager » d'Instagram).
5. Quelques secondes plus tard, le réel apparaît dans ta **bibliothèque**, déjà classé dans une catégorie, et tu reçois une **notification** sur ton téléphone. 🎬

> 🔒 Seuls les réels partagés depuis le **compte principal jumelé** sont capturés. Les
> messages d'autres comptes sont ignorés.

### Vérifications rapides si ça ne marche pas
- **Le jumelage ne se fait pas ?** Vérifie que tu as envoyé le code depuis le **compte principal** (pas le secondaire), en DM au compte connecté, sans espace en trop. Clique « Vérifier ».
- **Le réel n'apparaît pas ?** Va dans Supabase → Table `webhook_events` : tu verras les messages reçus. Vérifie que l'abonnement `messages` du webhook est actif, et que le réel a bien été partagé depuis le compte principal jumelé.
- **Pas de classement / mauvaise catégorie ?** Vérifie ta **clé Gemini** (Paramètres → Mes clés API). Sans classement IA, les réels vont dans « À trier ».
- **Pas de miniature / titre ?** Vérifie ta **clé RapidAPI** (instagram120).
- **Tu peux toujours ajouter un réel à la main** en collant son lien dans l'app/web, ou en le partageant depuis Instagram vers ReelVault sur Android.

---

## 🧠 Étape 9 — Activer le Second Brain (sélection IA périodique)

### 9.1 Appliquer les migrations

```bash
supabase db push --linked
```

Les migrations `0009_digests.sql` et `0010_digest_cron.sql` ajoutent le profil utilisateur enrichi, les tables `digests` et `digest_reels`, et les extensions pg_cron/pg_net.

### 9.2 Déployer la nouvelle Edge Function

```bash
supabase functions deploy generate-digest --linked
```

### 9.3 Activer le cron automatique (une seule fois via le SQL Editor de Supabase)

1. Connecte-toi à ton **Dashboard Supabase** → **SQL Editor**.
2. Copie-colle la commande ci-dessous en remplaçant `<SUPABASE_PROJECT_URL>` et `<SERVICE_ROLE_KEY>` par tes vraies valeurs (Settings → API) :

```sql
select cron.schedule(
  'reelvault-generate-digests',
  '0 8 * * *',
  $$
    select net.http_post(
      url := '<SUPABASE_PROJECT_URL>/functions/v1/generate-digest',
      headers := '{"Content-Type":"application/json","Authorization":"Bearer <SERVICE_ROLE_KEY>"}'::jsonb,
      body := '{"cron":true}'::jsonb
    );
  $$
);
```

> Ce cron tourne **chaque jour à 08h00 UTC** et génère automatiquement les sélections pour tous les utilisateurs dont la période est écoulée (hebdo ou mensuel). Une notification push est envoyée.

### 9.4 Variable d'environnement Vercel

Pour que le bouton « Générer maintenant » fonctionne, assure-toi que `SUPABASE_SERVICE_ROLE_KEY` est bien dans les variables Vercel (c'était déjà requis pour l'OAuth Instagram — voir Étape 5.7).

### 9.5 Vérifier

- Ouvre le site, va dans **Ma sélection** (`/digest`).
- Si tu as ≥ 3 réels dans ta bibliothèque, clique **« Générer maintenant »** pour tester sans attendre le cron.
- La synthèse IA et les réels sélectionnés apparaissent. Tu peux les noter sur 5 étoiles.
- La fréquence se règle dans **Paramètres → Sélection personnalisée** (ou dans l'onboarding).

---

## 🔁 Récapitulatif des clés à me fournir (si tu veux que je fasse les étapes techniques)

- 🔑 Supabase : **Reference ID**, **Project URL**, **anon key**, **service_role key**
- 🔑 Google : **clé Gemini**
- 🔑 Meta : **App ID**, **App Secret**, **Page Token**, et le **Verify Token** que tu as choisi

> Ne publie jamais ces clés ailleurs. La `service_role` et l'`App Secret` sont **sensibles**.

---

Bravo — une fois ces étapes faites, ReelVault tourne tout seul : tu partages, l'IA classe, ta bibliothèque se remplit. 🚀
