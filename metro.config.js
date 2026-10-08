// metro.config.js
// Expo's default Metro config, plus one cache-safety fix (F6).
//
// Production builds inline every `process.env.EXPO_PUBLIC_*` value into the
// transformed modules (babel-preset-expo), but Metro's transform cache isn't
// keyed on those values. Changing one (EXPO_PUBLIC_API_BASE, or
// EXPO_PUBLIC_FLASH_DEMO for the offline demo build) could therefore reuse a
// module transformed with the old value — verified: a normal `expo export`
// right after the demo export produced the demo bundle. Everything under
// `transformer` is part of Metro's cache key, so listing the values here
// gives each combination its own cache entries.
const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

const publicEnv = Object.keys(process.env)
  .filter((k) => k.startsWith("EXPO_PUBLIC_"))
  .sort()
  .map((k) => `${k}=${process.env[k]}`)
  .join("\n");

config.transformer = { ...config.transformer, flashPublicEnvKey: publicEnv };

module.exports = config;
