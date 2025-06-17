import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { withLogging, corsHeaders, handleCORS } from '../_shared/middleware.ts';
import { logger } from '../_shared/logger.ts';
import { createDatabaseClient } from '../_shared/database.ts';
import { createSMSService, SMS_TEMPLATES } from '../_shared/sms-service.ts';

interface OTPRequest {
  phone: string;
}

const handler = withLogging(async (req, context) => {
  // Handle CORS
  const corsResponse = handleCORS(req);
  if (corsResponse) return corsResponse;

  logger.info('Processing OTP request', context);

  const { phone }: OTPRequest = await req.json();

  // Validate phone number (Indian format)
  const phoneRegex = /^[6-9]\d{9}$/;
  if (!phoneRegex.test(phone)) {
    logger.warn('Invalid phone number format', { ...context, phone });
    return new Response(
      JSON.stringify({ error: 'Invalid phone number format' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Generate 6-digit OTP
  const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

  logger.debug('Generated OTP for phone', { ...context, phone, expiresAt });

  const db = createDatabaseClient();

  // Store OTP in database
  const { error: dbError } = await db.insert(
    'otp_sessions',
    {
      phone,
      otp_code: otpCode,
      expires_at: expiresAt.toISOString(),
    },
    {},
    context
  );

  if (dbError) {
    logger.error('Failed to store OTP in database', context, dbError);
    return new Response(
      JSON.stringify({ error: 'Failed to generate OTP' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Send SMS via MSG91
  try {
    const smsService = createSMSService();
    const templateId = SMS_TEMPLATES.OTP.id;

    if (templateId) {
      logger.debug('Sending OTP SMS via MSG91', { ...context, phone });

      const smsResult = await smsService.sendFlow(
        templateId,
        [{ mobile: phone, variables: { otp: otpCode } }],
        { shortUrl: false },
        context
      );

      if (smsResult.success) {
        logger.info('OTP SMS sent successfully', {
          ...context,
          phone,
          messageId: smsResult.messageId
        });
      } else {
        logger.error('OTP SMS sending failed', {
          ...context,
          phone,
          error: smsResult.error
        });
        // Don't fail the request if SMS fails, OTP is still valid
      }
    } else {
      logger.warn('MSG91 OTP template ID not configured, skipping SMS', context);
    }
  } catch (smsError) {
    logger.error('SMS service error', context, smsError as Error);
    // Don't fail the request if SMS fails, OTP is still valid
  }

  logger.info('OTP request completed successfully', { ...context, phone });

  return new Response(
    JSON.stringify({
      success: true,
      message: 'OTP sent successfully',
      // In development, return OTP for testing
      ...(Deno.env.get('NODE_ENV') === 'development' && { otp: otpCode })
    }),
    {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
        'X-Request-ID': context.requestId || '',
      }
    }
  );
});

serve(handler);
