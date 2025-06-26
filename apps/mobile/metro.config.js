
// Platform-agnostic Metro config for SDK 52 + pnpm workspace + EAS builds
const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// CRITICAL: pnpm workspace + EAS build compatibility
config.watchFolders = [workspaceRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

// Platform-agnostic resolver configuration
config.resolver.platforms = ['ios', 'android', 'native', 'web'];
config.resolver.unstable_enableSymlinks = false;
config.resolver.unstable_enablePackageExports = true;

// EAS build + pnpm workspace optimizations
config.resolver.disableHierarchicalLookup = false;

// CRITICAL: Babel runtime resolution for EAS builds
config.transformer.enableBabelRuntime = true;
config.transformer.enableBabelRCLookup = false;

// Performance optimizations
config.transformer.minifierConfig = {
  keep_fnames: false,
  mangle: { keep_fnames: false },
  output: { comments: false },
};

// Assets registry compatibility
config.resolver.alias = {
  '@react-native/assets-registry/registry': 'react-native/Libraries/Image/AssetRegistry',
};

module.exports = config;
