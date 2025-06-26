#!/usr/bin/env node

/**
 * Auto-Fix Dependencies for React Native 0.74.5 + Expo SDK 51
 * Automatically installs ALL missing critical dependencies
 */

const fs = require('fs');
const { execSync } = require('child_process');

console.log('🔧 Auto-fixing missing dependencies...\n');

// Get current dependencies
const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const allDeps = { ...packageJson.dependencies, ...packageJson.devDependencies };

// Critical dependencies that MUST exist
const criticalDeps = {
  // Babel Runtime (CRITICAL for Metro bundling)
  '@babel/runtime': '^7.27.0',

  // Build Properties (for iOS deployment target)
  'expo-build-properties': '^0.12.0',

  // Expo modules autolinking
  'expo-modules-autolinking': '^1.0.0'
};

const devDeps = [];

let missingDeps = [];
let missingDevDeps = [];

// Check for missing dependencies
for (const [dep, version] of Object.entries(criticalDeps)) {
  if (!allDeps[dep]) {
    if (devDeps.includes(dep)) {
      missingDevDeps.push(`${dep}@${version}`);
    } else {
      missingDeps.push(`${dep}@${version}`);
    }
  }
}

// Install missing dependencies
if (missingDeps.length > 0) {
  console.log(`📦 Installing ${missingDeps.length} missing production dependencies...`);
  console.log(`   ${missingDeps.join(', ')}`);
  
  try {
    execSync(`pnpm add ${missingDeps.join(' ')}`, { stdio: 'inherit' });
    console.log('✅ Production dependencies installed successfully\n');
  } catch (error) {
    console.log('❌ Failed to install production dependencies');
    process.exit(1);
  }
}

if (missingDevDeps.length > 0) {
  console.log(`🛠️  Installing ${missingDevDeps.length} missing dev dependencies...`);
  console.log(`   ${missingDevDeps.join(', ')}`);
  
  try {
    execSync(`pnpm add -D ${missingDevDeps.join(' ')}`, { stdio: 'inherit' });
    console.log('✅ Dev dependencies installed successfully\n');
  } catch (error) {
    console.log('❌ Failed to install dev dependencies');
    process.exit(1);
  }
}

if (missingDeps.length === 0 && missingDevDeps.length === 0) {
  console.log('✅ All critical dependencies are already installed\n');
}

// Run postinstall to fix assets registry
console.log('🔧 Running postinstall fixes...');
try {
  execSync('node scripts/fix-assets-registry.js', { stdio: 'inherit' });
  console.log('✅ Postinstall fixes completed\n');
} catch (error) {
  console.log('⚠️  Postinstall fixes failed, but continuing...\n');
}

console.log('🎉 Dependency auto-fix completed successfully!');
console.log('💡 Run "pnpm run prebuild" to validate all fixes before building.');
