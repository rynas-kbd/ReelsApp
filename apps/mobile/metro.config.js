// Metro config pour un monorepo npm workspaces (Expo).
// Les packages @reelvault/shared et @reelvault/design-tokens sont du TS SOURCE
// (main = ./src/index.ts), donc Metro doit pouvoir les watcher, les résoudre
// depuis la racine du monorepo, et les transpiler.
//
// Pattern officiel Expo monorepo :
// https://docs.expo.dev/guides/monorepos/
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
// apps/mobile -> apps -> racine du monorepo (reelvault/)
const monorepoRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// 1. Watcher la racine du monorepo (en plus du projet) pour détecter les
//    changements dans les packages partagés. On ÉTEND les defaults d'Expo.
config.watchFolders = [...(config.watchFolders ?? []), monorepoRoot];

// 2. Résoudre les modules d'abord dans le projet, puis à la racine (hoisting npm).
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(monorepoRoot, 'node_modules'),
];

// 3. Forcer UNE SEULE copie de react dans tout le bundle.
//    Problème : react-native@0.74.5 est hoisté à la racine du monorepo et résout
//    react@18.3.1 (déclaré dans root/package.json pour Next.js). Le code de l'app
//    résout lui react@18.2.0 (apps/mobile/node_modules). Deux copies → le dispatcher
//    de hooks du renderer (18.3.1) est null pour AuthProvider (compilé contre 18.2.0)
//    → "TypeError: Cannot read property 'useState' of null" au démarrage.
//
//    extraNodeModules ne suffit pas (c'est un fallback consulté uniquement si le module
//    est introuvable par résolution normale). resolveRequest intercepte TOUTES les
//    demandes, y compris react/jsx-runtime et react/jsx-dev-runtime.
const reactRoot = path.resolve(projectRoot, 'node_modules/react');
const defaultResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === 'react' || moduleName.startsWith('react/')) {
    // Redirige vers la copie 18.2.0 de l'app mobile (compatible react-native 0.74.5).
    const redirected = moduleName.replace(/^react/, reactRoot);
    return context.resolveRequest(context, redirected, platform);
  }
  return (defaultResolveRequest ?? context.resolveRequest)(context, moduleName, platform);
};

module.exports = config;
