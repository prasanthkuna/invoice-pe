#!/usr/bin/env node

/**
 * Card Management Specific Debugger
 * Focused debugging for card adding, tokenization, and payment issues
 */

const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');

// Load environment variables from root .env file
const path = require('path');
const envPath = path.join(__dirname, '../../.env');
const envResult = dotenv.config({ path: envPath });
if (envResult.error) {
  console.error('❌ Failed to load .env file:', envResult.error.message);
  console.error('   Looking for:', envPath);
  process.exit(1);
}

// Check environment variables
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl) {
  console.error('❌ Supabase URL not found in environment');
  console.error('   Looking for: EXPO_PUBLIC_SUPABASE_URL or SUPABASE_URL');
  process.exit(1);
}

if (!supabaseKey) {
  console.error('❌ Supabase key not found in environment');
  console.error('   Looking for: SUPABASE_SERVICE_ROLE_KEY, EXPO_PUBLIC_SUPABASE_ANON_KEY, or SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Colors
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function debugCardManagement() {
  try {
    log('🔍 Card Management Debug Analysis', 'cyan');
    log('═'.repeat(40), 'cyan');

    // Get recent card-related debug context
    const { data: debugLogs } = await supabase
      .from('debug_context')
      .select('*')
      .eq('feature', 'card-management')
      .gte('created_at', new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false })
      .limit(20);

    // Get saved cards data
    const { data: savedCards } = await supabase
      .from('saved_cards')
      .select('*')
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false })
      .limit(10);

    // Get recent payments
    const { data: recentPayments } = await supabase
      .from('payments')
      .select('*, invoices(user_id)')
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false })
      .limit(10);

    log(`\n📊 CARD MANAGEMENT OVERVIEW`, 'blue');
    log(`Debug Logs (2h): ${debugLogs?.length || 0}`, 'blue');
    log(`New Cards (24h): ${savedCards?.length || 0}`, 'blue');
    log(`Recent Payments (24h): ${recentPayments?.length || 0}`, 'blue');

    // Analyze debug logs
    if (debugLogs && debugLogs.length > 0) {
      const errors = debugLogs.filter(log => log.context.level === 'ERROR');
      const tokenizationIssues = debugLogs.filter(log => 
        log.context.message?.toLowerCase().includes('token') ||
        log.context.error?.message?.toLowerCase().includes('token')
      );

      log(`\n❌ ERRORS FOUND: ${errors.length}`, 'red');
      if (errors.length > 0) {
        errors.slice(0, 3).forEach(error => {
          log(`  • ${error.context.error?.message || error.context.message}`, 'red');
          if (error.context.step) {
            log(`    Step: ${error.context.step}`, 'red');
          }
        });
      }

      log(`\n🔑 TOKENIZATION ISSUES: ${tokenizationIssues.length}`, 'yellow');
      if (tokenizationIssues.length > 0) {
        tokenizationIssues.slice(0, 2).forEach(issue => {
          log(`  • ${issue.context.message || 'Tokenization error'}`, 'yellow');
        });
      }
    }

    // Analyze saved cards
    if (savedCards && savedCards.length > 0) {
      const activeCards = savedCards.filter(card => card.is_active);
      const failedCards = savedCards.filter(card => !card.is_active);

      log(`\n💳 CARD STATUS`, 'green');
      log(`Active Cards: ${activeCards.length}`, 'green');
      log(`Failed/Inactive: ${failedCards.length}`, failedCards.length > 0 ? 'yellow' : 'green');

      if (failedCards.length > 0) {
        log(`\n⚠️  FAILED CARD ATTEMPTS:`, 'yellow');
        failedCards.slice(0, 3).forEach(card => {
          log(`  • Card ending in ${card.last_four} - ${card.card_type}`, 'yellow');
          log(`    Created: ${new Date(card.created_at).toLocaleString()}`, 'yellow');
        });
      }
    }

    // Analyze payments
    if (recentPayments && recentPayments.length > 0) {
      const successfulPayments = recentPayments.filter(p => p.status === 'completed');
      const failedPayments = recentPayments.filter(p => p.status === 'failed');
      const pendingPayments = recentPayments.filter(p => p.status === 'pending');

      log(`\n💰 PAYMENT STATUS`, 'blue');
      log(`Successful: ${successfulPayments.length}`, 'green');
      log(`Failed: ${failedPayments.length}`, failedPayments.length > 0 ? 'red' : 'green');
      log(`Pending: ${pendingPayments.length}`, pendingPayments.length > 0 ? 'yellow' : 'green');

      if (failedPayments.length > 0) {
        log(`\n❌ FAILED PAYMENTS:`, 'red');
        failedPayments.slice(0, 3).forEach(payment => {
          log(`  • ₹${payment.amount} - ${payment.payment_method}`, 'red');
          log(`    Error: ${payment.failure_reason || 'Unknown'}`, 'red');
        });
      }
    }

    // Generate specific suggestions
    log(`\n💡 CARD MANAGEMENT SUGGESTIONS:`, 'green');
    
    if (debugLogs?.some(log => log.context.error?.message?.includes('timeout'))) {
      log(`  🔧 PhonePe API timeout detected - check network connectivity`, 'green');
    }
    
    if (savedCards?.some(card => !card.is_active)) {
      log(`  🔧 Card activation failures - verify PhonePe tokenization flow`, 'green');
    }
    
    if (recentPayments?.some(p => p.status === 'failed')) {
      log(`  🔧 Payment failures detected - check payment gateway configuration`, 'green');
    }
    
    log(`  🔧 Check Edge Function logs: supabase functions logs payment-intent`, 'green');
    log(`  🔧 Verify environment variables: PHONEPE_* keys`, 'green');

    log(`\n🎯 QUICK FIXES:`, 'cyan');
    log(`  1. Test card tokenization: curl -X POST [payment-intent-url]`, 'cyan');
    log(`  2. Check PhonePe dashboard for API status`, 'cyan');
    log(`  3. Verify SSL certificates and network connectivity`, 'cyan');
    log(`  4. Test with different card types (Visa, Mastercard, RuPay)`, 'cyan');

  } catch (error) {
    log(`❌ Card debug failed: ${error.message}`, 'red');
  }
}

// Run card debugging
debugCardManagement();
