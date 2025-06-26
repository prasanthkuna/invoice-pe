#!/usr/bin/env node

/**
 * Comprehensive Pre-Build Validation for React Native 0.74.5 + Expo SDK 51
 * Catches ALL potential build issues before attempting EAS builds
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🚀 Running comprehensive pre-build validation...\n');

let issues = [];
let warnings = [];

// Check 1: Assets Registry Compatibility
function checkAssetsRegistry() {
  console.log('📦 Checking assets registry compatibility...');
  
  const assetsRegistryPath = path.join(__dirname, '../node_modules/@react-native/assets-registry/registry.js');
  
  if (!fs.existsSync(assetsRegistryPath)) {
    issues.push('❌ Missing @react-native/assets-registry/registry.js - will cause Metro bundling failure');
    console.log('   Fix: Run postinstall script or manually create the compatibility shim');
    return false;
  }
  
  console.log('   ✅ Assets registry compatibility shim exists');
  return true;
}

// Check 2: Critical Dependencies for React Native 0.74.5 + Expo SDK 51
function checkCriticalDependencies() {
  console.log('📦 Checking critical dependencies for React Native 0.74.5 + Expo SDK 51...');

  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  const allDeps = { ...packageJson.dependencies, ...packageJson.devDependencies };

  // ALL critical dependencies that must exist for successful builds
  const criticalDeps = {
    // Core React Native
    'react-native': '0.74.5',
    'react': '^18.2.0',
    'expo': '~51.0.0',

    // Babel Runtime (CRITICAL for Metro bundling)
    '@babel/runtime': '^7.20.0',
    '@babel/core': '^7.20.0',
    'babel-preset-expo': '^10.0.0',

    // Metro & Build Tools
    'metro': '~0.80.0',
    'expo-modules-autolinking': '^1.0.0',

    // Navigation (if using)
    '@react-navigation/native': '^6.0.0',
    'react-native-screens': '^3.0.0',
    'react-native-safe-area-context': '^4.0.0'
  };

  let missingDeps = [];

  for (const [dep, expectedVersion] of Object.entries(criticalDeps)) {
    if (!allDeps[dep]) {
      missingDeps.push(dep);
      issues.push(`❌ Missing critical dependency: ${dep} (expected: ${expectedVersion})`);
    }
  }

  if (missingDeps.length > 0) {
    console.log(`   ❌ Missing ${missingDeps.length} critical dependencies`);
    return false;
  }

  // Check React Native version specifically
  const rnVersion = allDeps['react-native'];
  if (!rnVersion.includes('0.74.5')) {
    issues.push(`❌ React Native version ${rnVersion} may not be compatible with Expo SDK 51`);
    return false;
  }

  console.log('   ✅ All critical dependencies present and compatible');
  return true;
}

// Check 3: Babel Configuration & Runtime Dependencies
function checkBabelConfig() {
  console.log('🔧 Checking Babel configuration and runtime dependencies...');

  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  const allDeps = { ...packageJson.dependencies, ...packageJson.devDependencies };

  // Critical Babel dependencies that MUST exist
  const requiredBabelDeps = [
    'babel-preset-expo',
    '@babel/runtime',
    '@babel/core'
  ];

  for (const dep of requiredBabelDeps) {
    if (!allDeps[dep]) {
      issues.push(`❌ Missing critical dependency: ${dep} - will cause Metro bundling failure`);
      return false;
    }
  }

  if (!fs.existsSync('babel.config.js')) {
    issues.push('❌ Missing babel.config.js file');
    return false;
  }

  const babelConfig = fs.readFileSync('babel.config.js', 'utf8');
  if (!babelConfig.includes('babel-preset-expo')) {
    issues.push('❌ babel.config.js does not use babel-preset-expo');
    return false;
  }

  console.log('   ✅ Babel configuration and runtime dependencies are correct');
  return true;
}

// Check 4: Metro Configuration
function checkMetroConfig() {
  console.log('🚇 Checking Metro configuration...');
  
  if (!fs.existsSync('metro.config.js')) {
    warnings.push('⚠️  No metro.config.js found - using default configuration');
    return true;
  }
  
  const metroConfig = fs.readFileSync('metro.config.js', 'utf8');
  if (!metroConfig.includes('assets-registry')) {
    warnings.push('⚠️  Metro config does not include assets-registry alias');
  }
  
  console.log('   ✅ Metro configuration exists');
  return true;
}

// Check 5: Gradle Configuration (Android)
function checkGradleConfig() {
  console.log('🤖 Checking Android Gradle configuration...');
  
  const settingsGradlePath = 'android/settings.gradle';
  if (!fs.existsSync(settingsGradlePath)) {
    issues.push('❌ Missing android/settings.gradle file');
    return false;
  }
  
  const settingsGradle = fs.readFileSync(settingsGradlePath, 'utf8');
  
  // Check for problematic React Native 0.75+ configuration
  if (settingsGradle.includes('com.facebook.react.settings')) {
    issues.push('❌ settings.gradle contains React Native 0.75+ plugin that is incompatible with 0.74.5');
    return false;
  }
  
  console.log('   ✅ Gradle configuration is compatible with React Native 0.74.5');
  return true;
}

// Check 6: iOS Configuration
function checkiOSConfig() {
  console.log('🍎 Checking iOS configuration...');

  if (!fs.existsSync('app.config.js')) {
    issues.push('❌ Missing app.config.js file');
    return false;
  }

  const appConfig = fs.readFileSync('app.config.js', 'utf8');

  if (!appConfig.includes('ITSAppUsesNonExemptEncryption')) {
    warnings.push('⚠️  Missing ITSAppUsesNonExemptEncryption in iOS config - may slow down App Store review');
  }

  // Check for expo-build-properties plugin (required for iOS deployment target)
  if (!appConfig.includes('expo-build-properties')) {
    issues.push('❌ Missing expo-build-properties plugin - required for iOS deployment target configuration');
    return false;
  }

  // Check for proper iOS deployment target
  if (!appConfig.includes('deploymentTarget')) {
    issues.push('❌ Missing iOS deploymentTarget configuration - EAS builds require iOS 15.1+');
    return false;
  }

  // Check deployment target version
  const deploymentMatch = appConfig.match(/deploymentTarget:\s*["']([^"']+)["']/);
  if (deploymentMatch) {
    const deploymentTarget = parseFloat(deploymentMatch[1]);
    if (deploymentTarget < 15.1) {
      issues.push(`❌ iOS deploymentTarget ${deploymentMatch[1]} is too low - EAS builds require 15.1+`);
      return false;
    }
  }

  console.log('   ✅ iOS configuration looks good');
  return true;
}

// Check 7: Environment Variables
function checkEnvironmentVariables() {
  console.log('🌍 Checking environment variables...');
  
  if (!fs.existsSync('.env')) {
    warnings.push('⚠️  No .env file found');
    return true;
  }
  
  const envContent = fs.readFileSync('.env', 'utf8');
  const requiredVars = [
    'EXPO_PUBLIC_SUPABASE_URL',
    'EXPO_PUBLIC_SUPABASE_ANON_KEY'
  ];
  
  for (const varName of requiredVars) {
    if (!envContent.includes(varName)) {
      warnings.push(`⚠️  Missing environment variable: ${varName}`);
    }
  }
  
  console.log('   ✅ Environment variables checked');
  return true;
}

// Run all checks
function runAllChecks() {
  const checks = [
    checkAssetsRegistry,
    checkCriticalDependencies,
    checkBabelConfig,
    checkMetroConfig,
    checkGradleConfig,
    checkiOSConfig,
    checkEnvironmentVariables
  ];
  
  let passed = 0;
  
  for (const check of checks) {
    if (check()) {
      passed++;
    }
    console.log('');
  }
  
  // Summary
  console.log('📊 VALIDATION SUMMARY');
  console.log('='.repeat(50));
  console.log(`✅ Passed: ${passed}/${checks.length} checks`);
  
  if (issues.length > 0) {
    console.log(`❌ Critical Issues: ${issues.length}`);
    issues.forEach(issue => console.log(`   ${issue}`));
  }
  
  if (warnings.length > 0) {
    console.log(`⚠️  Warnings: ${warnings.length}`);
    warnings.forEach(warning => console.log(`   ${warning}`));
  }
  
  if (issues.length === 0) {
    console.log('\n🎉 All critical checks passed! Build should succeed.');
    return true;
  } else {
    console.log('\n💥 Critical issues found! Fix these before building.');
    return false;
  }
}

// Run the validation
const success = runAllChecks();
process.exit(success ? 0 : 1);
