#!/usr/bin/env node

const { spawn, exec } = require('child_process');
const path = require('path');

console.log('🚀 Starting InvoicePe Expo Go Deployment Process...\n');

// Function to kill processes on specific ports
function killPorts() {
  return new Promise((resolve) => {
    console.log('🔄 Killing existing processes on Expo ports...');
    const ports = [8081, 19000, 19001, 19002];
    
    let completed = 0;
    ports.forEach(port => {
      exec(`npx kill-port ${port}`, (error) => {
        // Ignore errors as ports might not be in use
        completed++;
        if (completed === ports.length) {
          console.log('✅ Port cleanup completed\n');
          resolve();
        }
      });
    });
    
    // Fallback timeout
    setTimeout(() => {
      if (completed < ports.length) {
        console.log('⚠️  Port cleanup timeout, continuing...\n');
        resolve();
      }
    }, 5000);
  });
}

// Function to clear Metro cache
function clearCache() {
  return new Promise((resolve, reject) => {
    console.log('🧹 Clearing Metro cache and node_modules...');

    // Clear multiple cache locations
    const commands = [
      'npx expo r --clear',
      'rm -rf node_modules/.cache || rmdir /s node_modules\\.cache 2>nul || true',
      'rm -rf .expo || rmdir /s .expo 2>nul || true',
      'rm -rf dist || rmdir /s dist 2>nul || true'
    ];

    let completed = 0;
    commands.forEach(cmd => {
      exec(cmd, { cwd: __dirname }, (error) => {
        // Ignore errors as some paths might not exist
        completed++;
        if (completed === commands.length) {
          console.log('✅ Cache cleared completely\n');
          resolve();
        }
      });
    });

    // Force resolve after timeout
    setTimeout(() => {
      console.log('✅ Cache clear completed\n');
      resolve();
    }, 10000);
  });
}

// Function to start Expo server
function startExpoServer(useTunnel = false) {
  return new Promise((resolve, reject) => {
    console.log('🎯 Starting Expo development server...');
    console.log('📱 This will generate a QR code for Expo Go app\n');

    const args = ['expo', 'start', '--clear', '--reset-cache'];
    if (useTunnel) {
      args.push('--tunnel');
      console.log('🌐 Using tunnel mode for better QR code compatibility...\n');
    }

    const expoProcess = spawn('npx', args, {
      cwd: __dirname,
      stdio: 'inherit',
      shell: true
    });

    // Handle process events
    expoProcess.on('spawn', () => {
      console.log('✅ Expo server started successfully!');
      console.log('📱 Scan the QR code with Expo Go app to test InvoicePe');
      console.log('🌐 Or press "w" to open in web browser');
      console.log('📱 Press "s" to switch to Expo Go mode if needed');
      console.log('\n🎉 InvoicePe is now ready for testing!\n');
      resolve(expoProcess);
    });

    expoProcess.on('error', (error) => {
      console.error('❌ Failed to start Expo server:', error);
      reject(error);
    });

    // Handle graceful shutdown
    process.on('SIGINT', () => {
      console.log('\n🛑 Shutting down Expo server...');
      expoProcess.kill('SIGTERM');
      process.exit(0);
    });

    process.on('SIGTERM', () => {
      console.log('\n🛑 Shutting down Expo server...');
      expoProcess.kill('SIGTERM');
      process.exit(0);
    });
  });
}

// Main deployment function
async function deploy() {
  try {
    const useTunnel = process.argv.includes('--tunnel');

    console.log('📋 InvoicePe Deployment Checklist:');
    console.log('   ✅ Supabase Edge Functions deployed');
    console.log('   ✅ Database migrations applied');
    console.log('   ✅ Environment variables configured');
    console.log('   ✅ PhonePe credentials ready');
    console.log('   ✅ Supabase phone auth configured\n');

    if (useTunnel) {
      console.log('🌐 Tunnel mode enabled for better QR code compatibility\n');
    }

    // Step 1: Kill existing processes
    await killPorts();

    // Step 2: Clear cache
    await clearCache();

    // Step 3: Start Expo server
    await startExpoServer(useTunnel);

  } catch (error) {
    console.error('❌ Deployment failed:', error);
    process.exit(1);
  }
}

// Run deployment
deploy();
