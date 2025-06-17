import { logger, LogContext } from './logger.ts';

export interface SMSRecipient {
  mobile: string;
  variables?: Record<string, string>;
}

export interface SMSConfig {
  authKey: string;
  baseUrl?: string;
}

export interface SMSResponse {
  success: boolean;
  messageId?: string;
  error?: string;
  details?: any;
}

export class MSG91Service {
  private config: SMSConfig;
  private baseUrl: string;
  private widgetBaseUrl: string;

  constructor(config: SMSConfig) {
    this.config = config;
    this.baseUrl = config.baseUrl || 'https://control.msg91.com/api/v5';
    this.widgetBaseUrl = 'https://control.msg91.com/api/v5/widget';
  }

  /**
   * Send SMS using MSG91 Flow API (Template-based)
   * Best for: OTP, Transactional messages with predefined templates
   */
  async sendFlow(
    templateId: string,
    recipients: SMSRecipient[],
    options: {
      shortUrl?: boolean;
      shortUrlExpiry?: number;
      realTimeResponse?: boolean;
    } = {},
    context?: LogContext
  ): Promise<SMSResponse> {
    const startTime = Date.now();
    
    try {
      logger.info('Sending SMS via MSG91 Flow', {
        ...context,
        templateId,
        recipientCount: recipients.length,
      });

      const payload = {
        template_id: templateId,
        short_url: options.shortUrl ? '1' : '0',
        ...(options.shortUrlExpiry && { short_url_expiry: options.shortUrlExpiry }),
        ...(options.realTimeResponse && { realTimeResponse: '1' }),
        recipients: recipients.map(recipient => ({
          mobiles: this.formatMobile(recipient.mobile),
          ...recipient.variables,
        })),
      };

      const response = await fetch(`${this.baseUrl}/flow`, {
        method: 'POST',
        headers: {
          'authkey': this.config.authKey,
          'accept': 'application/json',
          'content-type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();
      const duration = Date.now() - startTime;

      if (response.ok) {
        logger.info('SMS sent successfully via Flow API', {
          ...context,
          templateId,
          duration,
          messageId: result.request_id,
        });

        return {
          success: true,
          messageId: result.request_id,
          details: result,
        };
      } else {
        logger.error('SMS Flow API failed', {
          ...context,
          templateId,
          duration,
          error: result,
        });

        return {
          success: false,
          error: result.message || 'SMS sending failed',
          details: result,
        };
      }
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error('SMS Flow API error', context, error as Error, {
        templateId,
        duration,
      });

      return {
        success: false,
        error: (error as Error).message,
      };
    }
  }

  /**
   * Verify MSG91 Widget OTP Token (Server-side verification)
   * Best for: Enhanced security with client-side widget + server verification
   */
  async verifyWidgetToken(
    token: string,
    context?: LogContext
  ): Promise<SMSResponse> {
    const startTime = Date.now();

    try {
      logger.info('Verifying MSG91 Widget token', {
        ...context,
        tokenLength: token.length,
      });

      const response = await fetch(`${this.widgetBaseUrl}/verifyAccessToken`, {
        method: 'POST',
        headers: {
          'authkey': this.config.authKey,
          'accept': 'application/json',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          'access-token': token,
        }),
      });

      const result = await response.json();
      const duration = Date.now() - startTime;

      if (response.ok && result.type === 'success') {
        logger.info('MSG91 Widget token verified successfully', {
          ...context,
          duration,
          mobile: result.mobile,
        });

        return {
          success: true,
          details: {
            mobile: result.mobile,
            verified: true,
            method: 'widget',
          },
        };
      } else {
        logger.error('MSG91 Widget token verification failed', {
          ...context,
          duration,
          error: result,
        });

        return {
          success: false,
          error: result.message || 'Token verification failed',
          details: result,
        };
      }
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error('MSG91 Widget token verification error', context, error as Error, {
        duration,
      });

      return {
        success: false,
        error: (error as Error).message,
      };
    }
  }

  // Note: Template management methods removed for v1
  // Will be added in next version when needed

  /**
   * Format mobile number for MSG91 (add country code if missing)
   */
  private formatMobile(mobile: string): string {
    // Remove any non-digit characters
    const cleaned = mobile.replace(/\D/g, '');
    
    // If it's a 10-digit Indian number, add country code
    if (cleaned.length === 10 && cleaned.match(/^[6-9]/)) {
      return `91${cleaned}`;
    }
    
    // If it already has country code, return as is
    if (cleaned.length === 12 && cleaned.startsWith('91')) {
      return cleaned;
    }
    
    // For other cases, assume it's already formatted
    return cleaned;
  }
}

// Factory function to create MSG91 service
export function createSMSService(): MSG91Service {
  const authKey = Deno.env.get('MSG91_AUTH_KEY');

  if (!authKey) {
    throw new Error('MSG91_AUTH_KEY environment variable is required');
  }

  return new MSG91Service({ authKey });
}

// Simple template configuration - just IDs for now
export const SMS_TEMPLATES = {
  OTP: {
    id: Deno.env.get('MSG91_OTP_TEMPLATE_ID') || '',
    name: 'OTP Verification',
  },
  INVOICE_CREATED: {
    id: Deno.env.get('MSG91_INVOICE_TEMPLATE_ID') || '',
    name: 'Invoice Created',
  },
  PAYMENT_REMINDER: {
    id: Deno.env.get('MSG91_PAYMENT_REMINDER_TEMPLATE_ID') || '',
    name: 'Payment Reminder',
  },
  PAYMENT_RECEIVED: {
    id: Deno.env.get('MSG91_PAYMENT_RECEIVED_TEMPLATE_ID') || '',
    name: 'Payment Received',
  },
} as const;
