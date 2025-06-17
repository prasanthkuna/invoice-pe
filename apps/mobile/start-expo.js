#!/usr/bin/env node

const { spawn } = require('child_process');

console.log('🚀 Starting InvoicePe for Expo Go...\n');

// Simple, reliable Expo start for both mobile and web
// Using tunnel mode for better QR code compatibility
const expoProcess = spawn('pnpm', [
  'exec',
  'expo',
  'start',
  '--tunnel',
  '--clear',
  '--reset-cache'
], {
  cwd: __dirname,
  stdio: 'inherit',
  shell: true
});

// Handle process events
expoProcess.on('spawn', () => {
  console.log('✅ Expo server started!');
  console.log('📱 Scan QR code with Expo Go app');
  console.log('🌐 Or press "w" for web version\n');
});

expoProcess.on('error', (error) => {
  console.error('❌ Failed to start Expo:', error);
  process.exit(1);
});

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down...');
  expoProcess.kill('SIGTERM');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Shutting down...');
  expoProcess.kill('SIGTERM');
  process.exit(0);
});
