#!/usr/bin/env node

const { spawn, exec } = require('child_process');
const fs = require('fs');
const path = require('path');

// Load environment variables from root .env file
require('dotenv').config({ path: '../../.env' });

console.log('🚀 InvoicePe Internal Distribution Build Process\n');

// Configuration
const BUILD_PROFILE = 'internal';
const PLATFORMS = ['ios', 'android'];
const BUILD_TIMEOUT = 30 * 60 * 1000; // 30 minutes

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logStep(step, message) {
  log(`\n${step} ${message}`, 'cyan');
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green');
}

function logError(message) {
  log(`❌ ${message}`, 'red');
}

function logWarning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

// Function to check if EAS CLI is available
function checkEASCLI() {
  return new Promise((resolve) => {
    exec('eas --version', (error) => {
      if (error) {
        logError('EAS CLI not found. Installing...');
        exec('pnpm add -g eas-cli', (installError) => {
          if (installError) {
            logError('Failed to install EAS CLI. Please install manually: pnpm add -g eas-cli');
            process.exit(1);
          }
          logSuccess('EAS CLI installed successfully');
          resolve();
        });
      } else {
        logSuccess('EAS CLI is available');
        resolve();
      }
    });
  });
}

// Function to check EAS authentication
function checkEASAuth() {
  return new Promise((resolve, reject) => {
    exec('eas whoami', (error, stdout) => {
      if (error || stdout.includes('Not logged in')) {
        logWarning('Not logged in to EAS. Please run: eas login');
        logWarning('After logging in, run this script again.');
        process.exit(1);
      } else {
        const username = stdout.trim();
        logSuccess(`Logged in as: ${username}`);
        resolve();
      }
    });
  });
}

// Function to validate environment
function validateEnvironment() {
  logStep('🔍', 'Validating environment...');
  
  const requiredEnvVars = [
    'EXPO_PUBLIC_SUPABASE_URL',
    'EXPO_PUBLIC_SUPABASE_ANON_KEY'
  ];

  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    logError(`Missing required environment variables: ${missingVars.join(', ')}`);
    logWarning('Please check your .env file or environment configuration');
    process.exit(1);
  }

  logSuccess('Environment validation passed');
}

// Function to build for specific platform
function buildPlatform(platform) {
  return new Promise((resolve, reject) => {
    logStep('🔨', `Building for ${platform.toUpperCase()}...`);
    
    const buildProcess = spawn('eas', [
      'build',
      '--platform', platform,
      '--profile', BUILD_PROFILE,
      '--non-interactive',
      '--no-wait'
    ], {
      cwd: __dirname,
      stdio: 'inherit',
      shell: true
    });

    buildProcess.on('close', (code) => {
      if (code === 0) {
        logSuccess(`${platform.toUpperCase()} build started successfully`);
        resolve();
      } else {
        logError(`${platform.toUpperCase()} build failed with code ${code}`);
        reject(new Error(`Build failed for ${platform}`));
      }
    });

    buildProcess.on('error', (error) => {
      logError(`Failed to start ${platform} build: ${error.message}`);
      reject(error);
    });
  });
}

// Function to get build status and URLs
function getBuildStatus() {
  return new Promise((resolve) => {
    logStep('📋', 'Checking build status...');
    
    exec('eas build:list --limit=2 --json', (error, stdout) => {
      if (error) {
        logWarning('Could not fetch build status. Check manually with: eas build:list');
        resolve();
        return;
      }

      try {
        const builds = JSON.parse(stdout);
        const recentBuilds = builds.filter(build => 
          build.buildProfile === BUILD_PROFILE && 
          ['NEW', 'IN_QUEUE', 'IN_PROGRESS', 'FINISHED'].includes(build.status)
        );

        if (recentBuilds.length === 0) {
          logWarning('No recent builds found');
          resolve();
          return;
        }

        log('\n📊 Recent Build Status:', 'bright');
        recentBuilds.forEach(build => {
          const status = build.status === 'FINISHED' ? '✅' : '🔄';
          const platform = build.platform.toUpperCase();
          log(`${status} ${platform}: ${build.status}`);
          
          if (build.status === 'FINISHED' && build.artifacts?.buildUrl) {
            log(`   📱 Download: ${build.artifacts.buildUrl}`, 'blue');
          }
        });

        resolve();
      } catch (parseError) {
        logWarning('Could not parse build status');
        resolve();
      }
    });
  });
}

// Function to save build info for sharing
function saveBuildInfo() {
  const buildInfo = {
    timestamp: new Date().toISOString(),
    profile: BUILD_PROFILE,
    platforms: PLATFORMS,
    status: 'Building...',
    note: 'Run `pnpm run share:app` after builds complete to get download links'
  };

  const buildInfoPath = path.join(__dirname, 'build-info.json');
  fs.writeFileSync(buildInfoPath, JSON.stringify(buildInfo, null, 2));
  logSuccess('Build info saved');
}

// Main build function
async function buildForInternalDistribution() {
  try {
    log('🎯 Building InvoicePe for Internal Distribution', 'bright');
    log('📱 This will create installable apps for iOS and Android\n');

    // Pre-build checks
    await checkEASCLI();
    await checkEASAuth();
    validateEnvironment();

    // Start builds
    logStep('🚀', 'Starting builds for both platforms...');
    
    for (const platform of PLATFORMS) {
      await buildPlatform(platform);
      // Small delay between builds
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    // Save build info
    saveBuildInfo();

    // Show status
    await getBuildStatus();

    // Success message
    log('\n🎉 Build Process Started Successfully!', 'green');
    log('\n📋 Next Steps:', 'bright');
    log('1. Builds will take 15-20 minutes to complete');
    log('2. You\'ll receive email notifications when ready');
    log('3. Run `pnpm run share:app` to get download links');
    log('4. Share links with your partner for easy installation\n');

    log('💡 Monitor progress: https://expo.dev/accounts/[your-account]/projects/invoicepe/builds', 'blue');

  } catch (error) {
    logError(`Build process failed: ${error.message}`);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  log('\n🛑 Build process interrupted', 'yellow');
  process.exit(0);
});

process.on('SIGTERM', () => {
  log('\n🛑 Build process terminated', 'yellow');
  process.exit(0);
});

// Run the build process
buildForInternalDistribution();
