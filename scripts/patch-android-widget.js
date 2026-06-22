#!/usr/bin/env node
/**
 * react-native-android-widget has a buildscript block that loads AGP 7.2.1,
 * which conflicts with AGP 8.2.1 used by React Native 0.74 / Expo SDK 51.
 * Removing it lets Gradle resolve com.android.library from the root project's
 * classpath (AGP 8.2.1) instead, matching all other modules.
 */
const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '../node_modules/react-native-android-widget/android/build.gradle');

if (!fs.existsSync(file)) {
  console.log('[patch-android-widget] file not found, skipping');
  process.exit(0);
}

let content = fs.readFileSync(file, 'utf8');

// Remove the entire buildscript { ... } block (AGP 7.2.1 classpath)
const patched = content.replace(/^buildscript\s*\{[\s\S]*?\n\}\n/m, '');

if (patched === content) {
  console.log('[patch-android-widget] buildscript block not found, nothing to patch');
} else {
  fs.writeFileSync(file, patched, 'utf8');
  console.log('[patch-android-widget] removed legacy buildscript block from react-native-android-widget');
}
