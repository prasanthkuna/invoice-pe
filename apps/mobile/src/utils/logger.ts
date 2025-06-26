// ===== MINIMAL AI DEBUGGING SYSTEM =====
// Replaces complex logging with simple, performant debugging

// Declare global __DEV__ variable for React Native
declare global {
  var __DEV__: boolean | undefined;
}

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
    const isDev = typeof __DEV__ !== 'undefined' ? __DEV__ : process.env.NODE_ENV === 'development';
    if (isDev) {
      const emoji = level >= LogLevel.ERROR ? '❌' : level >= LogLevel.WARN ? '⚠️' : '���';
      console.log(`${emoji} [${feature}]`, context);
    }

    // Send to Supabase in production (non-blocking)
    if (!isDev) {
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

  // Convenience logging methods
  info(feature: string, context: any) {
    this.log(feature, context, LogLevel.INFO);
  }

  warn(feature: string, context: any) {
    this.log(feature, context, LogLevel.WARN);
  }

  debug(feature: string, context: any) {
    this.log(feature, context, LogLevel.DEBUG);
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
    const isDev = typeof __DEV__ !== 'undefined' ? __DEV__ : process.env.NODE_ENV === 'development';
    if (isDev) console.log('���', message, context);
  }

  info(message: string, context?: any) {
    const isDev = typeof __DEV__ !== 'undefined' ? __DEV__ : process.env.NODE_ENV === 'development';
    if (isDev) console.log('ℹ️', message, context);
  }

  warn(message: string, context?: any) {
    console.warn('⚠️', message, context);
  }

  error(message: string, context?: any, error?: Error) {
    console.error('❌', message, context, error);
  }

  fatal(message: string, context?: any, error?: Error) {
    console.error('���', message, context, error);
  }

  screenView(screenName: string) {
    const isDev = typeof __DEV__ !== 'undefined' ? __DEV__ : process.env.NODE_ENV === 'development';
    if (isDev) console.log('���', `Screen: ${screenName}`);
  }

  userAction(action: string, screen?: string) {
    const isDev = typeof __DEV__ !== 'undefined' ? __DEV__ : process.env.NODE_ENV === 'development';
    if (isDev) console.log('���', `Action: ${action}`, { screen });
  }

  apiRequest(method: string, endpoint: string) {
    const isDev = typeof __DEV__ !== 'undefined' ? __DEV__ : process.env.NODE_ENV === 'development';
    if (isDev) console.log('���', `${method} ${endpoint}`);
  }

  apiResponse(method: string, endpoint: string, status: number, duration: number) {
    const isDev = typeof __DEV__ !== 'undefined' ? __DEV__ : process.env.NODE_ENV === 'development';
    if (isDev) console.log('���', `${method} ${endpoint} - ${status} (${duration}ms)`);
  }

  apiError(method: string, endpoint: string, error: Error) {
    console.error('���', `${method} ${endpoint}`, error);
  }

  getLogs() { return []; }
  clearLogs() { }
  async exportLogs() { return '[]'; }
}

export const logger = new SimpleLegacyLogger();

export function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
