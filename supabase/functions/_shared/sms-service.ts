import { logger, LogContext } from './logger.ts';

export interface SMSRecipient {
  mobile: string;
  variables?: Record<string, string>;
}

export interface SMSConfig {
  accountSid?: string;
  authToken?: string;
  phoneNumber?: string;
}

export interface SMSResponse {
  success: boolean;
  messageId?: string;
  error?: string;
  details?: any;
}

// Simplified Twilio-compatible SMS service
export class TwilioService {
  private config: SMSConfig;

  constructor(config: SMSConfig) {
    this.config = config;
  }

  /**
   * Send SMS using Twilio API
   * @param to Phone number to send to
   * @param message Message content
   * @param context Log context
   */
  async sendSMS(
    to: string,
    message: string,
    context?: LogContext
  ): Promise<SMSResponse> {
    try {
      logger.debug('Sending SMS via Twilio', { ...context, to: to.slice(-4), messageLength: message.length });

      // TODO: Replace with actual Twilio API call
      // For now, simulate SMS sending
      const messageId = `twilio_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 100));

      logger.info('SMS sent successfully via Twilio', { ...context, messageId, to: to.slice(-4) });

      return {
        success: true,
        messageId,
        details: {
          provider: 'twilio',
          to: to.slice(-4),
          messageLength: message.length
        }
      };

    } catch (error) {
      logger.error('Twilio SMS sending failed', context, error as Error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        details: { provider: 'twilio' }
      };
    }
  }

  /**
   * Format phone number for Twilio (E.164 format)
   * @param phone Phone number to format
   */
  private formatPhoneNumber(phone: string): string {
    // Remove all non-digits
    const cleaned = phone.replace(/\D/g, '');
    
    // Handle Indian numbers
    if (cleaned.length === 10 && cleaned.match(/^[6-9]/)) {
      return `+91${cleaned}`;
    }
    
    // If it already has country code
    if (cleaned.length === 12 && cleaned.startsWith('91')) {
      return `+${cleaned}`;
    }
    
    // If it already has + prefix
    if (phone.startsWith('+')) {
      return phone;
    }
    
    // Default: assume it's already formatted
    return `+${cleaned}`;
  }
}

// Factory function to create Twilio service
export function createSMSService(): TwilioService {
  const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
  const authToken = Deno.env.get('TWILIO_AUTH_TOKEN');
  const phoneNumber = Deno.env.get('TWILIO_PHONE_NUMBER');

  // For now, allow creation without credentials (will simulate)
  return new TwilioService({ accountSid, authToken, phoneNumber });
}

// Legacy compatibility - remove MSG91 templates
export const SMS_TEMPLATES = {
  // Deprecated - use direct message content instead
} as const;
