
// Performance optimizations for production builds
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Enable tree shaking and dead code elimination
config.transformer.minifierConfig = {
  keep_fnames: false,
  mangle: {
    keep_fnames: false,
  },
  output: {
    comments: false,
  },
};

// Optimize resolver for faster builds
config.resolver.platforms = ['ios', 'android', 'native', 'web'];

// Enable caching for faster subsequent builds
config.transformer.enableBabelRCLookup = false;
config.transformer.enableBabelRuntime = false;

module.exports = config;
