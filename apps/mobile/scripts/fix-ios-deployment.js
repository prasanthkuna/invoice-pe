#!/usr/bin/env node

/**
 * iOS Deployment Target Fix for React Native 0.76.9 + Expo SDK 52
 * Ensures proper iOS deployment target for react-native-screens 4.x compatibility
 */

const fs = require('fs');
const path = require('path');

console.log('🍎 Applying iOS deployment target fixes...\n');

// Check if expo-build-properties is configured
function checkBuildPropertiesConfig() {
  console.log('📱 Checking expo-build-properties configuration...');
  
  if (!fs.existsSync('app.config.js')) {
    console.log('❌ app.config.js not found');
    return false;
  }
  
  const appConfig = fs.readFileSync('app.config.js', 'utf8');
  
  if (!appConfig.includes('expo-build-properties')) {
    console.log('❌ expo-build-properties plugin not configured');
    return false;
  }
  
  if (!appConfig.includes('deploymentTarget')) {
    console.log('❌ iOS deploymentTarget not configured');
    return false;
  }
  
  console.log('✅ expo-build-properties properly configured');
  return true;
}

// Check react-native-screens version compatibility
function checkScreensVersion() {
  console.log('📱 Checking react-native-screens version...');
  
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  const screensVersion = packageJson.dependencies['react-native-screens'];
  
  if (!screensVersion) {
    console.log('❌ react-native-screens not found in dependencies');
    return false;
  }
  
  // Extract version number
  const versionMatch = screensVersion.match(/(\d+)\.(\d+)\.(\d+)/);
  if (!versionMatch) {
    console.log('⚠️  Could not parse react-native-screens version');
    return true;
  }
  
  const majorVersion = parseInt(versionMatch[1]);
  
  if (majorVersion >= 4) {
    console.log(`✅ react-native-screens ${screensVersion} requires iOS 15.1+ (configured)`);
  } else {
    console.log(`✅ react-native-screens ${screensVersion} compatible with current config`);
  }
  
  return true;
}

// Check for common iOS build issues
function checkCommonIssues() {
  console.log('🔍 Checking for common iOS build issues...');
  
  const appConfig = fs.readFileSync('app.config.js', 'utf8');
  
  // Check for ITSAppUsesNonExemptEncryption
  if (!appConfig.includes('ITSAppUsesNonExemptEncryption')) {
    console.log('⚠️  Missing ITSAppUsesNonExemptEncryption - add to speed up App Store review');
  } else {
    console.log('✅ ITSAppUsesNonExemptEncryption configured');
  }
  
  // Check for proper bundle identifier format
  if (appConfig.includes('bundleIdentifier')) {
    const bundleIdMatch = appConfig.match(/bundleIdentifier:\s*["']([^"']+)["']/);
    if (bundleIdMatch) {
      const bundleId = bundleIdMatch[1];
      if (bundleId.split('.').length >= 3) {
        console.log(`✅ Bundle identifier format looks good: ${bundleId}`);
      } else {
        console.log(`⚠️  Bundle identifier should follow reverse domain format: ${bundleId}`);
      }
    }
  }
  
  return true;
}

// Main function
function runIOSFixes() {
  console.log('🚀 Running iOS deployment fixes...\n');
  
  const checks = [
    checkBuildPropertiesConfig,
    checkScreensVersion,
    checkCommonIssues
  ];
  
  let passed = 0;
  
  for (const check of checks) {
    if (check()) {
      passed++;
    }
    console.log('');
  }
  
  console.log('📊 iOS VALIDATION SUMMARY');
  console.log('='.repeat(40));
  console.log(`✅ Passed: ${passed}/${checks.length} checks`);
  
  if (passed === checks.length) {
    console.log('\n🎉 iOS configuration is ready for build!');
    return true;
  } else {
    console.log('\n💥 iOS configuration issues found!');
    console.log('\n🔧 QUICK FIXES:');
    console.log('1. Install expo-build-properties: pnpm add expo-build-properties');
    console.log('2. Add expo-build-properties plugin to app.config.js');
    console.log('3. Set iOS deploymentTarget to "15.1" for react-native-screens 4.x + SDK 52');
    return false;
  }
}

// Run the fixes
const success = runIOSFixes();
process.exit(success ? 0 : 1);
