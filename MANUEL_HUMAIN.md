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

### 5.6 Activer oEmbed Read (miniatures, légendes, auteurs des réels)
> Tu as créé une **2ᵉ app Meta dédiée** à ça — parfait, c'est la bonne approche (on ne mélange pas avec l'app messaging).

1. Ouvre ta **2ᵉ app Meta** (celle de l'oEmbed) sur https://developers.facebook.com.
2. Ajoute le produit **« oEmbed »** et active la fonctionnalité **« oEmbed Read »** (demande d'autorisation / App Review).
3. Récupère 🔑 :
   - **App ID** de cette app → `META_OEMBED_APP_ID`
   - **Client Token** : *Paramètres de l'app → Avancé → Sécurité → Jeton client* → `META_OEMBED_CLIENT_TOKEN` (recommandé)
   - *(ou, à la place du client token, l'**App Secret** → `META_OEMBED_APP_SECRET`)*
4. Mets ces valeurs dans `supabase/.env`, puis relance :
   ```bash
   supabase secrets set --env-file supabase/.env
   ```
> Tant qu'oEmbed Read n'est pas activé/validé, les réels s'affichent avec une miniature par défaut (l'IA les classe quand même). Une fois activé, les vraies miniatures/légendes/auteurs apparaissent automatiquement.

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

1. Sur le **site web** ou **l'app**, va dans **Paramètres → Connexion Instagram**. Tu y vois un **code d'activation** (ex. `RV-AB12CD`).
2. Depuis ton **compte Instagram secondaire**, ouvre une conversation avec la Page connectée et **envoie ce code** en message.
3. Le statut passe à **« Connecté »** ✅.
4. Depuis ton **compte principal**, **partage un réel** vers ton compte secondaire (via le bouton « Partager » d'Instagram).
5. Quelques secondes plus tard, le réel apparaît dans ta **bibliothèque**, déjà classé dans une catégorie, et tu reçois une **notification** sur ton téléphone. 🎬

### Vérifications rapides si ça ne marche pas
- **Le code ne s'active pas ?** Vérifie que tu l'as envoyé depuis le bon compte, sans espace en trop.
- **Le réel n'apparaît pas ?** Va dans Supabase → Table `webhook_events` : tu verras les messages reçus (utile pour comprendre). Vérifie que l'abonnement `messages` du webhook est bien actif.
- **Pas de classement / mauvaise catégorie ?** Vérifie que `GEMINI_API_KEY` est bien renseignée (Étape 4).
- **Tu peux toujours ajouter un réel à la main** en collant son lien dans l'app/web, ou en le partageant depuis Instagram vers ReelVault sur Android.

---

## 🔁 Récapitulatif des clés à me fournir (si tu veux que je fasse les étapes techniques)

- 🔑 Supabase : **Reference ID**, **Project URL**, **anon key**, **service_role key**
- 🔑 Google : **clé Gemini**
- 🔑 Meta : **App ID**, **App Secret**, **Page Token**, et le **Verify Token** que tu as choisi

> Ne publie jamais ces clés ailleurs. La `service_role` et l'`App Secret` sont **sensibles**.

---

Bravo — une fois ces étapes faites, ReelVault tourne tout seul : tu partages, l'IA classe, ta bibliothèque se remplit. 🚀
