#!/usr/bin/env node

const { spawn, exec } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('⚡ InvoicePe Quick Deploy - Build & Share in One Command\n');

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

// Function to run build process
function runBuild() {
  return new Promise((resolve, reject) => {
    logStep('🔨', 'Starting build process...');
    
    const buildProcess = spawn('node', ['build-internal.js'], {
      cwd: __dirname,
      stdio: 'inherit',
      shell: true
    });

    buildProcess.on('close', (code) => {
      if (code === 0) {
        logSuccess('Build process completed');
        resolve();
      } else {
        logError('Build process failed');
        reject(new Error('Build failed'));
      }
    });

    buildProcess.on('error', (error) => {
      logError(`Build process error: ${error.message}`);
      reject(error);
    });
  });
}

// Function to wait for builds to complete
function waitForBuilds() {
  return new Promise((resolve) => {
    logStep('⏳', 'Waiting for builds to complete...');
    log('This will take approximately 15-20 minutes', 'yellow');
    log('You can monitor progress at: https://expo.dev', 'blue');
    
    let attempts = 0;
    const maxAttempts = 60; // 30 minutes max
    
    const checkBuilds = () => {
      attempts++;
      
      exec('eas build:list --limit=2 --json', (error, stdout) => {
        if (error) {
          if (attempts < maxAttempts) {
            setTimeout(checkBuilds, 30000); // Check every 30 seconds
          } else {
            logWarning('Build check timeout. Please check manually with: eas build:list');
            resolve();
          }
          return;
        }

        try {
          const builds = JSON.parse(stdout);
          const recentBuilds = builds.filter(build => 
            build.buildProfile === 'internal' && 
            ['NEW', 'IN_QUEUE', 'IN_PROGRESS', 'FINISHED'].includes(build.status)
          );

          const finishedBuilds = recentBuilds.filter(build => build.status === 'FINISHED');
          const inProgressBuilds = recentBuilds.filter(build => 
            ['NEW', 'IN_QUEUE', 'IN_PROGRESS'].includes(build.status)
          );

          if (inProgressBuilds.length === 0 && finishedBuilds.length >= 2) {
            logSuccess('All builds completed!');
            resolve();
          } else if (attempts >= maxAttempts) {
            logWarning('Build timeout reached. Some builds may still be in progress.');
            resolve();
          } else {
            log(`⏳ Builds in progress: ${inProgressBuilds.length}, Finished: ${finishedBuilds.length}`, 'yellow');
            setTimeout(checkBuilds, 30000);
          }
        } catch (parseError) {
          if (attempts < maxAttempts) {
            setTimeout(checkBuilds, 30000);
          } else {
            logWarning('Could not parse build status');
            resolve();
          }
        }
      });
    };

    // Start checking after 2 minutes (builds need time to start)
    setTimeout(checkBuilds, 120000);
  });
}

// Function to run share process
function runShare() {
  return new Promise((resolve, reject) => {
    logStep('📱', 'Generating share links...');
    
    const shareProcess = spawn('node', ['share-app.js'], {
      cwd: __dirname,
      stdio: 'inherit',
      shell: true
    });

    shareProcess.on('close', (code) => {
      if (code === 0) {
        logSuccess('Share links generated');
        resolve();
      } else {
        logWarning('Share process completed with warnings');
        resolve(); // Don't fail the whole process
      }
    });

    shareProcess.on('error', (error) => {
      logWarning(`Share process error: ${error.message}`);
      resolve(); // Don't fail the whole process
    });
  });
}

// Main quick deploy function
async function quickDeploy() {
  try {
    log('🚀 InvoicePe Quick Deploy Started', 'bright');
    log('This will build and prepare your app for sharing with partners\n');

    // Step 1: Build
    await runBuild();

    // Step 2: Wait for builds (optional - can be skipped)
    const shouldWait = process.argv.includes('--wait');
    if (shouldWait) {
      await waitForBuilds();
      
      // Step 3: Generate share links
      await runShare();
    } else {
      log('\n💡 Builds are now in progress!', 'yellow');
      log('Run `pnpm run share:app` after builds complete to get download links', 'blue');
    }

    // Final instructions
    log('\n🎉 Quick Deploy Process Complete!', 'green');
    log('\n📋 Next Steps:', 'bright');
    
    if (shouldWait) {
      log('✅ Builds completed and share links generated');
      log('📱 Check the output above for download links');
      log('📧 Send links to your partner for installation');
    } else {
      log('⏳ Builds are in progress (15-20 minutes)');
      log('📧 You\'ll receive email notifications when ready');
      log('🔗 Run `pnpm run share:app` to get download links');
    }

    log('\n💡 Monitor builds: https://expo.dev', 'blue');

  } catch (error) {
    logError(`Quick deploy failed: ${error.message}`);
    process.exit(1);
  }
}

// Handle command line arguments
const showHelp = process.argv.includes('--help') || process.argv.includes('-h');

if (showHelp) {
  log('⚡ InvoicePe Quick Deploy', 'bright');
  log('\nUsage:');
  log('  node quick-deploy.js [options]');
  log('\nOptions:');
  log('  --wait    Wait for builds to complete and generate share links');
  log('  --help    Show this help message');
  log('\nExamples:');
  log('  node quick-deploy.js          # Start builds and exit');
  log('  node quick-deploy.js --wait   # Start builds and wait for completion');
  process.exit(0);
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  log('\n🛑 Quick deploy interrupted', 'yellow');
  process.exit(0);
});

process.on('SIGTERM', () => {
  log('\n🛑 Quick deploy terminated', 'yellow');
  process.exit(0);
});

// Run quick deploy
quickDeploy();
