import { supabaseService } from '../lib/supabase';
import { debugContext } from './logger';

interface DebugSession {
  sessionId: string;
  startTime: Date;
  userId?: string;
}

interface ErrorContext {
  screen?: string;
  action?: string;
  feature?: string;
  userId?: string;
  additionalData?: Record<string, any>;
}

class DevDebugger {
  private session: DebugSession | null = null;
  private errorCount = 0;

  // Initialize debugging session
  startSession(userId?: string) {
    this.session = {
      sessionId: `dev_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      startTime: new Date(),
      userId
    };

    debugContext.auth({
      step: 'dev_session_started',
      sessionId: this.session.sessionId,
      userId
    });

    console.log(`🐛 Dev Debug Session Started: ${this.session.sessionId}`);
    return this.session.sessionId;
  }

  // Log error with enhanced context
  async logError(error: Error, context: ErrorContext = {}) {
    this.errorCount++;
    
    const errorData = {
      sessionId: this.session?.sessionId,
      errorCount: this.errorCount,
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
      ...context
    };

    // Log to console for immediate visibility
    console.error('🚨 DEV ERROR:', errorData);

    // Log to Supabase for AI analysis
    debugContext.error(context.feature || 'unknown', error, {
      ...context,
      sessionId: this.session?.sessionId,
      errorCount: this.errorCount,
      devMode: true
    });

    // Return formatted error for easy copying
    return this.formatErrorForAI(errorData);
  }

  // Format error for AI analysis
  private formatErrorForAI(errorData: any): string {
    return `
🐛 DEV ERROR REPORT
Session: ${errorData.sessionId}
Error #${errorData.errorCount}
Feature: ${errorData.feature || 'unknown'}
Screen: ${errorData.screen || 'unknown'}
Action: ${errorData.action || 'unknown'}
Message: ${errorData.message}
Time: ${errorData.timestamp}

Stack Trace:
${errorData.stack}

Additional Context:
${JSON.stringify(errorData.additionalData || {}, null, 2)}

🔍 To debug this error, run:
pnpm run debug:session ${errorData.sessionId}
    `.trim();
  }

  // Get recent errors from Supabase
  async getRecentErrors(limit = 10) {
    try {
      const { data, error } = await supabaseService.supabase
        .from('debug_context')
        .select('*')
        .eq('session_id', this.session?.sessionId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;

      console.log('📋 Recent Errors:', data);
      return data;
    } catch (error) {
      console.error('Failed to fetch debug logs:', error);
      return [];
    }
  }

  // Get errors by feature
  async getErrorsByFeature(feature: string, limit = 5) {
    try {
      const { data, error } = await supabaseService.supabase
        .from('debug_context')
        .select('*')
        .eq('feature', feature)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;

      console.log(`📋 ${feature} Errors:`, data);
      return data;
    } catch (error) {
      console.error(`Failed to fetch ${feature} errors:`, error);
      return [];
    }
  }

  // Quick debug commands for common issues
  async debugAuth() {
    console.log('🔐 Debugging Authentication...');
    return await this.getErrorsByFeature('auth');
  }

  async debugPayment() {
    console.log('💳 Debugging Payments...');
    return await this.getErrorsByFeature('payment');
  }

  async debugCards() {
    console.log('💳 Debugging Card Management...');
    return await this.getErrorsByFeature('card-management');
  }

  async debugInvoices() {
    console.log('📄 Debugging Invoices...');
    return await this.getErrorsByFeature('invoice');
  }

  // End session
  endSession() {
    if (this.session) {
      debugContext.auth({
        step: 'dev_session_ended',
        sessionId: this.session.sessionId,
        duration: Date.now() - this.session.startTime.getTime(),
        errorCount: this.errorCount
      });

      console.log(`🏁 Dev Session Ended: ${this.session.sessionId} (${this.errorCount} errors)`);
      this.session = null;
      this.errorCount = 0;
    }
  }

  // Get current session info
  getSessionInfo() {
    return this.session;
  }
}

// Global instance for development
export const devDebugger = new DevDebugger();

// Auto-start session in development
if (__DEV__) {
  devDebugger.startSession();
}

// Global error handler for development
if (__DEV__) {
  const originalConsoleError = console.error;
  console.error = (...args) => {
    // Check if it's a React Native error
    const errorMessage = args.join(' ');
    if (errorMessage.includes('Error:') || errorMessage.includes('Warning:')) {
      const error = new Error(errorMessage);
      devDebugger.logError(error, { feature: 'react-native' });
    }
    originalConsoleError(...args);
  };
}

// Export helper functions for easy use
export const debugAuth = () => devDebugger.debugAuth();
export const debugPayment = () => devDebugger.debugPayment();
export const debugCards = () => devDebugger.debugCards();
export const debugInvoices = () => devDebugger.debugInvoices();
export const getRecentErrors = () => devDebugger.getRecentErrors();

// Quick access in development console
if (__DEV__) {
  (global as any).devDebugger = devDebugger;
  (global as any).debugAuth = debugAuth;
  (global as any).debugPayment = debugPayment;
  (global as any).debugCards = debugCards;
  (global as any).debugInvoices = debugInvoices;
}
