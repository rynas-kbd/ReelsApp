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

module.exports = config;
