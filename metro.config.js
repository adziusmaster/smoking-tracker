// Web-preview only. expo-sqlite's web build imports wa-sqlite.wasm, and Metro does not
// treat .wasm as an asset by default. This file exists so `expo start --web` can bundle
// the app for a quick visual preview; the shipped target is Android, where SQLite is native.
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

config.resolver.assetExts.push('wasm');

// wa-sqlite uses OPFS + SharedArrayBuffer, which browsers gate behind cross-origin isolation.
config.server = config.server ?? {};
config.server.enhanceMiddleware = (middleware) => (req, res, next) => {
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  res.setHeader('Cross-Origin-Embedder-Policy', 'credentialless');
  return middleware(req, res, next);
};

module.exports = config;
