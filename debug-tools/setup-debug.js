#!/usr/bin/env node

/**
 * Setup script for InvoicePe debugging tools
 * Initializes database, installs dependencies, and configures debugging
 */

const { spawn, exec } = require('child_process');
const fs = require('fs');
const path = require('path');

// Colors
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
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

// Check if file exists
function fileExists(filePath) {
  try {
    return fs.existsSync(filePath);
  } catch (error) {
    return false;
  }
}

// Run command and return promise
function runCommand(command, cwd = process.cwd()) {
  return new Promise((resolve, reject) => {
    exec(command, { cwd }, (error, stdout, stderr) => {
      if (error) {
        reject(error);
      } else {
        resolve(stdout);
      }
    });
  });
}

// Check environment setup
async function checkEnvironment() {
  logStep('🔍', 'Checking environment setup...');

  // Check if we're in the right directory
  const packageJsonPath = path.join(process.cwd(), 'package.json');
  if (!fileExists(packageJsonPath)) {
    logError('package.json not found. Please run this from the debug-tools directory.');
    process.exit(1);
  }

  // Check for .env file
  const envPath = path.join(process.cwd(), '../.env');
  if (!fileExists(envPath)) {
    logWarning('.env file not found in project root');
    logWarning('Make sure environment variables are configured');
  } else {
    logSuccess('Environment file found');
  }

  // Check Supabase CLI
  try {
    await runCommand('supabase --version');
    logSuccess('Supabase CLI is available');
  } catch (error) {
    logWarning('Supabase CLI not found. Install with: npm install -g @supabase/cli');
  }

  logSuccess('Environment check completed');
}

// Install dependencies
async function installDependencies() {
  logStep('📦', 'Installing debug tool dependencies...');

  try {
    await runCommand('npm install');
    logSuccess('Dependencies installed successfully');
  } catch (error) {
    logError(`Failed to install dependencies: ${error.message}`);
    process.exit(1);
  }
}

// Apply database migrations
async function applyMigrations() {
  logStep('🗄️', 'Applying debug database migrations...');

  try {
    // Check if we're in a Supabase project
    const supabaseConfigPath = path.join(process.cwd(), '../supabase/config.toml');
    if (!fileExists(supabaseConfigPath)) {
      logWarning('Supabase config not found. Skipping migration.');
      return;
    }

    // Apply migrations
    await runCommand('supabase db push', '../');
    logSuccess('Database migrations applied');
  } catch (error) {
    logWarning(`Migration warning: ${error.message}`);
    logWarning('You may need to apply migrations manually with: supabase db push');
  }
}

// Test debug tools
async function testDebugTools() {
  logStep('🧪', 'Testing debug tools...');

  try {
    // Test basic debug command
    const testOutput = await runCommand('node supabase-debug.js "test query"');
    if (testOutput.includes('DEBUG ANALYSIS')) {
      logSuccess('Debug tools are working correctly');
    } else {
      logWarning('Debug tools may not be configured correctly');
    }
  } catch (error) {
    logWarning(`Debug test warning: ${error.message}`);
    logWarning('You may need to configure environment variables');
  }
}

// Create convenience scripts
async function createScripts() {
  logStep('📝', 'Creating convenience scripts...');

  // Create debug script for root directory
  const debugScript = `#!/bin/bash
# InvoicePe Debug Helper
cd debug-tools
node supabase-debug.js "$@"
`;

  const debugScriptPath = path.join(process.cwd(), '../debug.sh');
  fs.writeFileSync(debugScriptPath, debugScript);
  
  try {
    await runCommand(`chmod +x ${debugScriptPath}`);
    logSuccess('Debug script created: ./debug.sh');
  } catch (error) {
    logWarning('Could not make debug script executable');
  }

  // Create package.json scripts for root
  const rootPackageJsonPath = path.join(process.cwd(), '../package.json');
  if (fileExists(rootPackageJsonPath)) {
    try {
      const packageJson = JSON.parse(fs.readFileSync(rootPackageJsonPath, 'utf8'));
      
      if (!packageJson.scripts) {
        packageJson.scripts = {};
      }

      packageJson.scripts['debug'] = 'cd debug-tools && node supabase-debug.js';
      packageJson.scripts['debug:card'] = 'cd debug-tools && npm run debug:card';
      packageJson.scripts['debug:payment'] = 'cd debug-tools && npm run debug:payment';
      packageJson.scripts['debug:sms'] = 'cd debug-tools && npm run debug:sms';

      fs.writeFileSync(rootPackageJsonPath, JSON.stringify(packageJson, null, 2));
      logSuccess('Added debug scripts to root package.json');
    } catch (error) {
      logWarning('Could not update root package.json');
    }
  }
}

// Display usage instructions
function displayUsage() {
  log('\n🎉 InvoicePe Debug Tools Setup Complete!', 'green');
  log('═'.repeat(50), 'bright');

  log('\n📋 AVAILABLE COMMANDS:', 'bright');
  log('  node supabase-debug.js "your query"     - General debugging', 'blue');
  log('  npm run debug:card                      - Card management issues', 'blue');
  log('  npm run debug:payment                   - Payment problems', 'blue');
  log('  npm run debug:sms                       - SMS/OTP issues', 'blue');
  log('  npm run debug:auth                      - Authentication problems', 'blue');

  log('\n🔍 USAGE EXAMPLES:', 'bright');
  log('  node supabase-debug.js "card adding broke"', 'cyan');
  log('  node supabase-debug.js "payment failed"', 'cyan');
  log('  node supabase-debug.js "sms not working"', 'cyan');

  log('\n🚀 FROM ROOT DIRECTORY:', 'bright');
  log('  npm run debug "card adding issues"', 'cyan');
  log('  npm run debug:card', 'cyan');
  log('  ./debug.sh "payment problems"', 'cyan');

  log('\n💡 TIPS:', 'yellow');
  log('  • Use natural language to describe issues', 'yellow');
  log('  • Debug tools analyze last 1-2 hours by default', 'yellow');
  log('  • Check debug-report.json for detailed analysis', 'yellow');
  log('  • Use feature-specific debuggers for focused analysis', 'yellow');

  log('\n🔧 TROUBLESHOOTING:', 'yellow');
  log('  • Make sure Supabase environment variables are set', 'yellow');
  log('  • Run "supabase login" if authentication fails', 'yellow');
  log('  • Check network connectivity for database access', 'yellow');

  log('\n📚 DOCUMENTATION:', 'blue');
  log('  • Check debug-tools/README.md for detailed docs', 'blue');
  log('  • Feature debuggers in debug-tools/feature-debuggers/', 'blue');
  log('  • Debug reports saved to debug-tools/debug-report.json', 'blue');
}

// Main setup function
async function setupDebugTools() {
  try {
    log('🚀 Setting up InvoicePe AI Debug Tools', 'bright');
    log('This will configure minimal, high-performance debugging\n');

    await checkEnvironment();
    await installDependencies();
    await applyMigrations();
    await testDebugTools();
    await createScripts();

    displayUsage();

  } catch (error) {
    logError(`Setup failed: ${error.message}`);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  log('\n🛑 Setup interrupted', 'yellow');
  process.exit(0);
});

// Run setup
setupDebugTools();
