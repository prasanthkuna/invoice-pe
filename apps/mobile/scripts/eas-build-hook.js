#!/usr/bin/env node

/**
 * EAS Build Hook - Coinbase-Style Dual Package Manager Build System
 * This runs before the EAS build process starts
 * Handles platform-specific arguments (--platform ios/android)
 * Uses npm for production builds (hermetic) while maintaining pnpm for development
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Parse command line arguments
const args = process.argv.slice(2);
const platformIndex = args.indexOf('--platform');
const platform = platformIndex !== -1 && args[platformIndex + 1] ? args[platformIndex + 1] : 'unknown';

// Skip build hook for iOS - it doesn't need Android-specific fixes
if (platform === 'ios') {
  console.log('🍎 iOS build detected - skipping Android-specific build hook');
  console.log('✅ iOS build hook completed successfully');
  process.exit(0);
}

// Detect build environment (EAS uses npm for hermetic builds)
const isEASBuild = process.env.EAS_BUILD === 'true' || process.env.NODE_ENV === 'production';
const packageManager = isEASBuild ? 'npm' : 'pnpm';

console.log(`🎯 Platform: ${platform}`);
console.log(`📦 Package Manager: ${packageManager} (${isEASBuild ? 'Production/EAS' : 'Development'})`);

console.log('🚀 EAS Build Hook: Preparing build environment...\n');

// Function to run command and log output
function runCommand(command, description) {
  console.log(`📦 ${description}...`);
  try {
    execSync(command, { stdio: 'inherit' });
    console.log(`✅ ${description} completed\n`);
  } catch (error) {
    console.log(`❌ ${description} failed:`, error.message);
    throw error;
  }
}

// Function to ensure critical dependencies are installed
function ensureCriticalDependencies() {
  console.log('🔍 Checking critical dependencies...');
  
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  const allDeps = { ...packageJson.dependencies, ...packageJson.devDependencies };
  
  const criticalDeps = [
    '@babel/runtime',
    '@babel/core',
    'babel-preset-expo',
    'expo-modules-autolinking',
    'expo-build-properties'
  ];
  
  const missingDeps = criticalDeps.filter(dep => !allDeps[dep]);
  
  if (missingDeps.length > 0) {
    console.log(`❌ Missing critical dependencies: ${missingDeps.join(', ')}`);
    console.log('🔧 Installing missing dependencies...');
    
    // Install missing dependencies using appropriate package manager
    for (const dep of missingDeps) {
      if (dep === '@babel/core' || dep === 'babel-preset-expo') {
        const cmd = packageManager === 'npm'
          ? `npm install --save-dev ${dep}`
          : `pnpm add -D ${dep}`;
        runCommand(cmd, `Installing dev dependency ${dep}`);
      } else {
        const cmd = packageManager === 'npm'
          ? `npm install --save ${dep}`
          : `pnpm add ${dep}`;
        runCommand(cmd, `Installing dependency ${dep}`);
      }
    }
  } else {
    console.log('✅ All critical dependencies are present\n');
  }
}

// Function to create assets registry compatibility
function createAssetsRegistryFix() {
  console.log('🔧 Creating assets registry compatibility fix...');
  
  const targetDir = path.join(__dirname, '../node_modules/@react-native/assets-registry');
  const targetFile = path.join(targetDir, 'registry.js');
  const packageJsonFile = path.join(targetDir, 'package.json');
  
  // Create directory if it doesn't exist
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
    console.log('✅ Created @react-native/assets-registry directory');
  }
  
  // Create the registry.js file
  const registryContent = `// Compatibility shim for React Native 0.74.5 + Expo SDK 51
// This file provides the missing @react-native/assets-registry/registry module
// that expo-asset expects but doesn't exist in RN 0.74.5

module.exports = require('react-native/Libraries/Image/AssetRegistry');
`;
  
  fs.writeFileSync(targetFile, registryContent);
  console.log('✅ Created @react-native/assets-registry/registry.js');
  
  // Create a minimal package.json
  const packageJsonContent = {
    "name": "@react-native/assets-registry",
    "version": "0.74.5-compat",
    "description": "Compatibility shim for React Native 0.74.5",
    "main": "registry.js"
  };
  
  fs.writeFileSync(packageJsonFile, JSON.stringify(packageJsonContent, null, 2));
  console.log('✅ Created @react-native/assets-registry/package.json\n');
}

// Main execution
try {
  console.log('🎯 Starting EAS build preparation...\n');
  
  // Step 1: Ensure critical dependencies
  ensureCriticalDependencies();
  
  // Step 2: Create assets registry fix
  createAssetsRegistryFix();
  
  // Step 3: Clear any cached modules (Windows compatible)
  console.log('🧹 Clearing module cache...');
  try {
    // Use cross-platform cache clearing
    const isWindows = process.platform === 'win32';
    const cacheCommand = isWindows
      ? 'if exist node_modules\\.cache rmdir /s /q node_modules\\.cache'
      : 'rm -rf node_modules/.cache';
    execSync(cacheCommand, { stdio: 'inherit' });
    console.log('✅ Module cache cleared\n');
  } catch (error) {
    console.log('⚠️  Cache clearing failed (may not exist)\n');
  }
  
  console.log('🎉 Coinbase-style build preparation completed successfully!');
  console.log(`📦 Using ${packageManager} for ${isEASBuild ? 'production' : 'development'} build`);
  console.log('🚀 Ready for hermetic build process...\n');
  
} catch (error) {
  console.error('💥 EAS build preparation failed:', error.message);
  process.exit(1);
}
