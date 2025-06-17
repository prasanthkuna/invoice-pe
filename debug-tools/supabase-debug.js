#!/usr/bin/env node

/**
 * InvoicePe AI-Assisted Debugging Tool
 * Simple Supabase commands for AI debugging
 * Usage: node supabase-debug.js "card adding broke"
 */

const { createClient } = require('@supabase/supabase-js');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

// Load environment variables from root .env file
require('dotenv').config({ path: '../.env' });

// Fallback to check if env vars are loaded
if (!process.env.EXPO_PUBLIC_SUPABASE_URL) {
  console.error('❌ Environment variables not found. Please check:');
  console.error('   - EXPO_PUBLIC_SUPABASE_URL');
  console.error('   - Make sure .env file exists in apps/mobile/');
  process.exit(1);
}

if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.warn('⚠️  SUPABASE_SERVICE_ROLE_KEY not found, using anon key (limited access)');
}

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

function logSuccess(message) {
  log(`✅ ${message}`, 'green');
}

function logError(message) {
  log(`❌ ${message}`, 'red');
}

function logWarning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

function logInfo(message) {
  log(`🔍 ${message}`, 'cyan');
}

// Initialize Supabase client
// For now, use anon key for testing (limited access)
const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
);

// Extract feature from user query
function extractFeature(query) {
  const lowerQuery = query.toLowerCase();
  
  if (lowerQuery.includes('card')) return 'card-management';
  if (lowerQuery.includes('payment')) return 'payment';
  if (lowerQuery.includes('invoice')) return 'invoice';
  if (lowerQuery.includes('sms') || lowerQuery.includes('otp')) return 'sms';
  if (lowerQuery.includes('auth') || lowerQuery.includes('login')) return 'auth';
  
  return null; // All features
}

// Get debug context from database
async function getDebugContext(feature, timeWindow = '1 hour') {
  try {
    let query = supabase
      .from('debug_context')
      .select('*')
      .gte('created_at', new Date(Date.now() - parseTimeWindow(timeWindow)).toISOString())
      .order('created_at', { ascending: false })
      .limit(50);

    if (feature) {
      query = query.eq('feature', feature);
    }

    const { data, error } = await query;
    
    if (error) {
      logError(`Database query failed: ${error.message}`);
      return [];
    }

    return data || [];
  } catch (error) {
    logError(`Failed to get debug context: ${error.message}`);
    return [];
  }
}

// Get Edge Function logs (via Supabase CLI)
async function getEdgeFunctionLogs(feature) {
  return new Promise((resolve) => {
    exec('supabase functions logs --limit 20', (error, stdout, stderr) => {
      if (error) {
        logWarning('Could not fetch Edge Function logs. Make sure Supabase CLI is installed.');
        resolve([]);
        return;
      }

      try {
        const logs = stdout.split('\n')
          .filter(line => line.trim())
          .filter(line => !feature || line.toLowerCase().includes(feature))
          .slice(0, 10);
        
        resolve(logs);
      } catch (parseError) {
        resolve([]);
      }
    });
  });
}

// Parse time window string to milliseconds
function parseTimeWindow(timeWindow) {
  const match = timeWindow.match(/(\d+)\s*(minute|hour|day)s?/);
  if (!match) return 60 * 60 * 1000; // Default 1 hour

  const value = parseInt(match[1]);
  const unit = match[2];

  switch (unit) {
    case 'minute': return value * 60 * 1000;
    case 'hour': return value * 60 * 60 * 1000;
    case 'day': return value * 24 * 60 * 60 * 1000;
    default: return 60 * 60 * 1000;
  }
}

// Analyze patterns in debug context
function analyzePatterns(contexts) {
  const analysis = {
    totalLogs: contexts.length,
    errors: contexts.filter(c => c.context.level === 'ERROR').length,
    warnings: contexts.filter(c => c.context.level === 'WARN').length,
    features: {},
    commonErrors: {},
    timeline: []
  };

  // Group by feature
  contexts.forEach(context => {
    if (!analysis.features[context.feature]) {
      analysis.features[context.feature] = 0;
    }
    analysis.features[context.feature]++;

    // Track common errors
    if (context.context.error) {
      const errorKey = context.context.error.name || 'Unknown Error';
      if (!analysis.commonErrors[errorKey]) {
        analysis.commonErrors[errorKey] = 0;
      }
      analysis.commonErrors[errorKey]++;
    }

    // Timeline
    analysis.timeline.push({
      time: context.created_at,
      feature: context.feature,
      level: context.context.level,
      message: context.context.message || 'No message'
    });
  });

  return analysis;
}

// Generate AI-friendly suggestions
function generateSuggestions(analysis, feature) {
  const suggestions = [];

  if (analysis.errors > 0) {
    suggestions.push('🔧 Check error patterns in the logs above');
    
    Object.entries(analysis.commonErrors).forEach(([error, count]) => {
      if (count > 1) {
        suggestions.push(`🔄 "${error}" occurred ${count} times - check for recurring issue`);
      }
    });
  }

  if (feature === 'card-management' && analysis.errors > 0) {
    suggestions.push('💳 Check PhonePe API configuration and network connectivity');
    suggestions.push('🔑 Verify tokenization process in payment-intent Edge Function');
  }

  if (feature === 'payment' && analysis.errors > 0) {
    suggestions.push('💰 Check payment gateway integration and API keys');
    suggestions.push('📊 Verify invoice status updates in database');
  }

  if (feature === 'sms' && analysis.errors > 0) {
    suggestions.push('📱 Check MSG91 API configuration and template IDs');
    suggestions.push('🔐 Verify authkey and tokenAuth in environment variables');
  }

  if (suggestions.length === 0) {
    suggestions.push('✅ No obvious issues found in recent logs');
    suggestions.push('🔍 Try expanding time window or checking Edge Function logs');
  }

  return suggestions;
}

// Main debug function
async function debug(query) {
  try {
    logInfo(`Analyzing: "${query}"`);
    
    const feature = extractFeature(query);
    const timeWindow = query.includes('hour') ? '2 hours' : '1 hour';
    
    if (feature) {
      logInfo(`Focusing on feature: ${feature}`);
    } else {
      logInfo('Analyzing all features');
    }

    // Get debug context
    const contexts = await getDebugContext(feature, timeWindow);
    
    // Get Edge Function logs
    const edgeLogs = await getEdgeFunctionLogs(feature);
    
    // Analyze patterns
    const analysis = analyzePatterns(contexts);
    
    // Display results
    log('\n📊 DEBUG ANALYSIS RESULTS', 'bright');
    log('═'.repeat(50), 'bright');
    
    log(`\n🔍 Query: ${query}`, 'cyan');
    log(`⏰ Time Window: ${timeWindow}`, 'cyan');
    log(`📱 Mobile Logs: ${analysis.totalLogs}`, 'cyan');
    log(`🌐 Edge Function Logs: ${edgeLogs.length}`, 'cyan');
    
    if (analysis.errors > 0) {
      log(`\n❌ ERRORS FOUND: ${analysis.errors}`, 'red');
      
      const errorLogs = contexts.filter(c => c.context.level === 'ERROR').slice(0, 5);
      errorLogs.forEach(errorLog => {
        log(`  • ${errorLog.context.error?.message || errorLog.context.message || 'Unknown error'}`, 'red');
        if (errorLog.context.error?.stack) {
          log(`    Stack: ${errorLog.context.error.stack.split('\n')[0]}`, 'red');
        }
      });
    }
    
    if (analysis.warnings > 0) {
      log(`\n⚠️  WARNINGS: ${analysis.warnings}`, 'yellow');
    }
    
    if (Object.keys(analysis.features).length > 0) {
      log('\n📋 FEATURE BREAKDOWN:', 'blue');
      Object.entries(analysis.features).forEach(([feat, count]) => {
        log(`  • ${feat}: ${count} logs`, 'blue');
      });
    }
    
    if (edgeLogs.length > 0) {
      log('\n🌐 RECENT EDGE FUNCTION LOGS:', 'magenta');
      edgeLogs.slice(0, 5).forEach(logLine => {
        log(`  • ${logLine}`, 'magenta');
      });
    }
    
    // Generate suggestions
    const suggestions = generateSuggestions(analysis, feature);
    log('\n💡 AI SUGGESTIONS:', 'green');
    suggestions.forEach(suggestion => {
      log(`  ${suggestion}`, 'green');
    });
    
    // Save detailed report
    const report = {
      query,
      feature,
      timeWindow,
      analysis,
      edgeLogs: edgeLogs.slice(0, 10),
      contexts: contexts.slice(0, 20),
      suggestions,
      timestamp: new Date().toISOString()
    };
    
    const reportPath = path.join(__dirname, 'debug-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    log(`\n📄 Detailed report saved to: ${reportPath}`, 'blue');
    log('\n🎯 Next Steps:', 'bright');
    log('1. Review error patterns above', 'bright');
    log('2. Check Edge Function logs in Supabase dashboard', 'bright');
    log('3. Run specific feature tests to reproduce issues', 'bright');
    
  } catch (error) {
    logError(`Debug analysis failed: ${error.message}`);
    process.exit(1);
  }
}

// Handle command line arguments
const query = process.argv[2];

if (!query) {
  log('🔍 InvoicePe AI Debug Tool', 'bright');
  log('\nUsage: node supabase-debug.js "your debug query"');
  log('\nExamples:');
  log('  node supabase-debug.js "card adding broke"');
  log('  node supabase-debug.js "payment failed"');
  log('  node supabase-debug.js "sms not working"');
  log('  node supabase-debug.js "auth issues"');
  process.exit(0);
}

// Run debug analysis
debug(query);
