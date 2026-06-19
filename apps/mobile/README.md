# ReelVault — Application mobile (Android)

Version « rapide du quotidien » de ReelVault : bibliothèque consultable, réception
des liens partagés depuis Instagram, notifications push, et widget écran d'accueil
affichant les 3 derniers réels. Interface 100 % française, dark mode par défaut.

Package monorepo : `@reelvault/mobile`. Consomme `@reelvault/shared` (data + types +
textes FR) et `@reelvault/design-tokens` (thème) — tous deux en **TS source**.

> ⚠️ **Dev build requis** — pas Expo Go. Le widget, la réception de partage et les
> notifications push nécessitent du code natif (config plugins). Il faut générer un
> dev build Android (`expo run:android` ou `eas build --profile development`).

---

## 1. Prérequis

- Node ≥ 20, npm (workspaces).
- Un projet Supabase ReelVault déjà déployé (backend + Edge Functions, dossier `supabase/`).
- Pour générer l'APK / dev build Android :
  - **Option A — build local** : Android Studio + Android SDK (API 34), un JDK 17, un
    émulateur ou un appareil branché en débogage USB.
  - **Option B — EAS Build (cloud)** : un compte Expo (`npx expo login`) ; aucun SDK
    Android local requis.

## 2. Installation

Depuis la **racine du monorepo** (les workspaces lient les packages partagés) :

```bash
npm install
```

## 3. Variables d'environnement

Copie l'exemple puis renseigne tes clés Supabase :

```bash
cp apps/mobile/.env.example apps/mobile/.env
```

```
EXPO_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...
```

Ces variables sont injectées dans `app.config.ts` (champ `extra`) et lues à l'exécution
via `expo-constants` (`lib/env.ts`).

## 4. Commandes

Depuis `apps/mobile/` :

| Commande              | Effet                                                        |
| --------------------- | ------------------------------------------------------------ |
| `npm run typecheck`   | `tsc --noEmit` (TypeScript strict).                          |
| `npm run doctor`      | `expo-doctor` (validation config/plugins).                   |
| `npm run prebuild`    | Génère le projet natif `android/` (config plugins).          |
| `npm run android`     | `expo run:android` — build + lance le dev build (Option A).  |
| `npm start`           | Démarre Metro en mode dev-client (après avoir installé l'APK).|

Depuis la racine : `npm run mobile` lance Metro pour l'app mobile.

## 5. Générer le dev build Android

### Option A — Build local (`expo run:android`)

```bash
cd apps/mobile
npx expo run:android          # prebuild + compile + installe + lance
```

Ensuite, pour le développement quotidien : `npm start` (Metro) puis ouvrir l'app
installée (dev-client). Le widget, le partage et les notifs ne fonctionnent que
sur ce dev build, pas dans Expo Go.

### Option B — EAS Build (cloud)

Un profil `development` est recommandé. Exemple de `eas.json` (à créer si besoin) :

```json
{
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "android": { "buildType": "apk" }
    }
  }
}
```

```bash
cd apps/mobile
npx expo login
eas build --profile development --platform android
```

Récupère l'APK généré, installe-le sur l'appareil, puis `npm start` pour Metro.

> Le `extra.eas.projectId` dans `app.config.ts` est un placeholder
> (`00000000-...`). Remplace-le par l'ID renvoyé par `eas init`, sinon
> `getExpoPushTokenAsync` ne pourra pas obtenir de token push en build EAS.

---

## 6. Architecture (fichiers)

```
apps/mobile/
├── app.config.ts            # Config Expo + plugins (router, secure-store, notifs, share, widget)
├── metro.config.js          # Résolution monorepo (watchFolders + nodeModulesPaths)
├── babel.config.js          # babel-preset-expo + plugin reanimated
├── tsconfig.json            # strict, étend expo/tsconfig.base
├── .env.example
├── app/                     # Routes expo-router
│   ├── _layout.tsx          # Providers, redirection auth, effets globaux (notifs/share)
│   ├── index.tsx            # Redirect → /(tabs)/library
│   ├── (auth)/login.tsx     # Connexion / inscription Supabase
│   └── (tabs)/
│       ├── _layout.tsx      # Barre d'onglets
│       ├── library.tsx      # Bibliothèque (FlatList, recherche, filtres, pull-to-refresh)
│       ├── add.tsx          # Ajout manuel d'un lien
│       └── settings.tsx     # Nom, notifs, connexion Instagram, déconnexion
├── components/              # GradientButton, ReelCard, CategoryChip, EmptyState, Skeleton, Toast, Screen
├── hooks/usePendingShare.ts # Réception des partages (file d'attente si déconnecté)
├── lib/
│   ├── env.ts               # Lecture des variables d'env
│   ├── supabase.ts          # Client Supabase + storage SecureStore + url-polyfill
│   ├── auth.tsx             # AuthProvider (session persistée)
│   ├── addReel.ts           # POST Edge Function add-reel (manual/share, 200/409/422)
│   ├── notifications.ts     # Push token + canal Android "reelvault-captures"
│   └── theme.ts             # Ré-export des design tokens + formatDateFr
└── widgets/
    ├── ReelVaultWidget.tsx       # UI déclarative du widget (FlexWidget/TextWidget/ImageWidget)
    └── widget-task-handler.tsx   # Tâche headless : lit les 3 derniers réels via Supabase
```

---

## 7. Fonctionnalités natives & limites

### Partage Android (expo-share-intent)
- Plugin configuré avec `androidIntentFilters: ['text/*']` → ReelVault apparaît dans
  le menu **Partager** d'Android pour le texte et les liens (donc depuis Instagram).
- `disableIOS: true` car l'app est Android-only (sinon le plugin tente de lire
  `ios.bundleIdentifier`).
- À réception : on extrait le 1er lien Instagram du texte partagé (`isInstagramUrl`),
  puis :
  - **connecté** → `POST add-reel` (source `'share'`) + toast de confirmation ;
  - **déconnecté** → le lien est **gardé en mémoire** (`usePendingShare`) et traité
    automatiquement dès que l'utilisateur se connecte.
- **Limite** : la mise en attente est en mémoire (non persistée sur disque). Si l'app
  est tuée avant connexion, le lien partagé est perdu. Pour le rendre durable, il
  faudrait le stocker (ex. SecureStore/AsyncStorage) dans `usePendingShare`.

### Notifications push (expo-notifications)
- `registerForPushNotificationsAsync` : demande la permission, crée le canal Android
  `reelvault-captures`, récupère le token Expo et l'enregistre dans
  `profiles.expo_push_token` via `updateProfile`.
- Le toggle des Réglages active/désactive `notif_enabled` et (dé)enregistre le token.
- Tap sur une notification → ouvre la bibliothèque (`addNotificationResponseReceivedListener`).
- **Limites** :
  - Les push réels nécessitent un dev build + un `projectId` EAS valide (le token Expo
    Push n'est délivrable qu'avec un projectId réel).
  - L'envoi des push est fait côté backend (Edge Function `push-notify`) ; l'app ne fait
    qu'enregistrer le token et réagir aux notifications.

### Widget écran d'accueil (react-native-android-widget)
- Déclaré dans `app.config.ts` (`ReelVaultWidget`, 4×2 cellules).
- `widget-task-handler.tsx` lit les **3 derniers réels** via `fetchReels(supabase, { sort: 'recent' }, { limit: 3 })`.
  La session est restaurée depuis SecureStore par le client Supabase.
- Tap sur le widget → ouvre l'app (`clickAction="OPEN_APP"`).
- **Limites importantes** :
  - **Android uniquement** (pas d'équivalent iOS dans cette lib).
  - Le rafraîchissement périodique géré par le système Android a un **minimum ~30 min**
    (`updatePeriodMillis: 1800000`). Pour un rafraîchissement immédiat après ajout d'un
    réel, il faut appeler `requestWidgetUpdate(...)` depuis l'app (non câblé ici).
  - Si aucune session n'est disponible (utilisateur déconnecté), le widget affiche un
    état vide.
  - Le widget utilise une UI **déclarative** propre à la lib (`*Widget`) — pas de
    composants React Native standards ni de `StyleSheet`.

### Architecture & New Architecture
- `newArchEnabled: false`. La New Architecture (Fabric/TurboModules) n'est pas garantie
  compatible avec `react-native-android-widget` et `expo-share-intent` sur Expo SDK 51 ;
  l'ancienne architecture est le choix stable. À réévaluer lors d'une montée de SDK.

---

## 8. Vérifications effectuées

- `npx tsc --noEmit` : **OK** (0 erreur, TypeScript strict).
- `npx expo-doctor` : tous les checks passent **sauf** celui qui interroge l'API Expo
  (`api.expo.dev`) pour comparer les versions de modules natifs — il échoue uniquement
  faute de connexion réseau dans l'environnement de build, pas à cause de la config.
- `expo config --type public` : évalue `app.config.ts` sans erreur (plugins, widget,
  intent filters, env `extra` tous résolus).
- **Non vérifié** : compilation de l'APK Android (SDK Android non disponible dans
  l'environnement). À exécuter sur une machine avec Android SDK ou via EAS Build.
