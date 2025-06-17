// ===== MINIMAL AI DEBUGGING SYSTEM =====
// Replaces complex logging with simple, performant debugging

import { supabase } from '../lib/supabase';

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  FATAL = 4,
}

// Minimal Debug Context for AI Debugging
class DebugContext {
  private sessionId: string;
  private userId?: string;

  constructor() {
    this.sessionId = this.generateSessionId();
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  setUserId(userId: string) {
    this.userId = userId;
  }

  // Main logging method - minimal and performant
  log(feature: string, context: any, level: LogLevel = LogLevel.INFO) {
    const logData = {
      feature,
      session_id: this.sessionId,
      user_id: this.userId,
      context: {
        ...context,
        level: LogLevel[level],
        timestamp: new Date().toISOString(),
        platform: 'mobile'
      }
    };

    // Console log in development
    if (__DEV__) {
      const emoji = level >= LogLevel.ERROR ? '‚ùå' : level >= LogLevel.WARN ? '‚ö†Ô∏è' : 'Ì¥ç';
      console.log(`${emoji} [${feature}]`, context);
    }

    // Send to Supabase in production (non-blocking)
    if (!__DEV__) {
      this.sendToSupabase(logData).catch(error => {
        console.warn('Failed to send debug context:', error);
      });
    }
  }

  private async sendToSupabase(data: any) {
    try {
      await supabase.from('debug_context').insert(data);
    } catch (error) {
      // Fail silently to avoid logging loops
    }
  }

  // Convenience methods for common debugging scenarios
  cardManagement(context: any, level: LogLevel = LogLevel.INFO) {
    this.log('card-management', context, level);
  }

  payment(context: any, level: LogLevel = LogLevel.INFO) {
    this.log('payment', context, level);
  }

  auth(context: any, level: LogLevel = LogLevel.INFO) {
    this.log('auth', context, level);
  }

  invoice(context: any, level: LogLevel = LogLevel.INFO) {
    this.log('invoice', context, level);
  }

  sms(context: any, level: LogLevel = LogLevel.INFO) {
    this.log('sms', context, level);
  }

  // Error logging
  error(feature: string, error: Error, context?: any) {
    this.log(feature, {
      ...context,
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack
      }
    }, LogLevel.ERROR);
  }
}

// Export minimal debug context for AI debugging
export const debugContext = new DebugContext();

// Legacy compatibility - simplified logger for existing code
class SimpleLegacyLogger {
  debug(message: string, context?: any) {
    if (__DEV__) console.log('Ì¥ç', message, context);
  }

  info(message: string, context?: any) {
    if (__DEV__) console.log('‚ÑπÔ∏è', message, context);
  }

  warn(message: string, context?: any) {
    console.warn('‚ö†Ô∏è', message, context);
  }

  error(message: string, context?: any, error?: Error) {
    console.error('‚ùå', message, context, error);
  }

  fatal(message: string, context?: any, error?: Error) {
    console.error('Ì≤Ä', message, context, error);
  }

  screenView(screenName: string) {
    if (__DEV__) console.log('Ì≥±', `Screen: ${screenName}`);
  }

  userAction(action: string, screen?: string) {
    if (__DEV__) console.log('Ì±Ü', `Action: ${action}`, { screen });
  }

  apiRequest(method: string, endpoint: string) {
    if (__DEV__) console.log('Ìºê', `${method} ${endpoint}`);
  }

  apiResponse(method: string, endpoint: string, status: number, duration: number) {
    if (__DEV__) console.log('Ì≥°', `${method} ${endpoint} - ${status} (${duration}ms)`);
  }

  apiError(method: string, endpoint: string, error: Error) {
    console.error('Ì∫®', `${method} ${endpoint}`, error);
  }

  getLogs() { return []; }
  clearLogs() { }
  async exportLogs() { return '[]'; }
}

export const logger = new SimpleLegacyLogger();

export function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
