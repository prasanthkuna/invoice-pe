import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { withLogging, corsHeaders, handleCORS } from '../_shared/middleware.ts';
import { logger } from '../_shared/logger.ts';
import { createDatabaseClient } from '../_shared/database.ts';
import { createSMSService, SMS_TEMPLATES } from '../_shared/sms-service.ts';

interface InvoiceSMSRequest {
  invoiceId: string;
  customerPhone: string;
  type: 'created' | 'reminder' | 'payment_received';
  // Template variables will be passed as key-value pairs
  variables?: Record<string, string>;
}

const handler = withLogging(async (req, context) => {
  // Handle CORS
  const corsResponse = handleCORS(req);
  if (corsResponse) return corsResponse;

  logger.info('Processing invoice SMS request', context);

  const {
    invoiceId,
    customerPhone,
    type,
    variables = {}
  }: InvoiceSMSRequest = await req.json();

  // Validate required fields
  if (!invoiceId || !customerPhone || !type) {
    logger.warn('Missing required fields in invoice SMS request', {
      ...context,
      invoiceId,
      customerPhone,
      type
    });
    return new Response(
      JSON.stringify({ error: 'Missing required fields: invoiceId, customerPhone, type' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Validate phone number (Indian format)
  const phoneRegex = /^[6-9]\d{9}$/;
  if (!phoneRegex.test(customerPhone)) {
    logger.warn('Invalid phone number format', { ...context, customerPhone, invoiceId });
    return new Response(
      JSON.stringify({ error: 'Invalid phone number format' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const db = createDatabaseClient();

  // Verify invoice exists and belongs to the authenticated user
  const { data: invoice, error: invoiceError } = await db.select(
    'invoices',
    { 
      eq: { id: invoiceId },
      select: 'id,invoice_number,total_amount,customer_phone,status'
    },
    context
  );

  if (invoiceError || !invoice || invoice.length === 0) {
    logger.error('Invoice not found', { ...context, invoiceId }, invoiceError);
    return new Response(
      JSON.stringify({ error: 'Invoice not found' }),
      { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const invoiceData = invoice[0];

  // Send SMS based on type
  try {
    const smsService = createSMSService();
    let templateId: string;

    // Get template ID based on type
    switch (type) {
      case 'created':
        templateId = SMS_TEMPLATES.INVOICE_CREATED.id;
        break;
      case 'reminder':
        templateId = SMS_TEMPLATES.PAYMENT_REMINDER.id;
        break;
      case 'payment_received':
        templateId = SMS_TEMPLATES.PAYMENT_RECEIVED.id;
        break;
      default:
        logger.error('Invalid SMS type', { ...context, type, invoiceId });
        return new Response(
          JSON.stringify({ error: 'Invalid SMS type. Use: created, reminder, or payment_received' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }

    if (!templateId) {
      logger.warn(`MSG91 template ID not configured for type: ${type}`, { ...context, type, invoiceId });
      return new Response(
        JSON.stringify({ error: `SMS template not configured for type: ${type}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    logger.debug('Sending invoice SMS', { 
      ...context, 
      invoiceId, 
      customerPhone, 
      type, 
      templateId 
    });

    const smsResult = await smsService.sendFlow(
      templateId,
      [{ mobile: customerPhone, variables }],
      { shortUrl: false },
      context
    );

    if (smsResult.success) {
      // Log SMS activity in database
      await db.insert(
        'sms_logs',
        {
          invoice_id: invoiceId,
          phone: customerPhone,
          type,
          template_id: templateId,
          message_id: smsResult.messageId,
          status: 'sent',
          sent_at: new Date().toISOString(),
        },
        {},
        context
      );

      logger.info('Invoice SMS sent successfully', { 
        ...context, 
        invoiceId, 
        customerPhone, 
        type,
        messageId: smsResult.messageId 
      });

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'SMS sent successfully',
          messageId: smsResult.messageId,
          type
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
    } else {
      // Log failed SMS attempt
      await db.insert(
        'sms_logs',
        {
          invoice_id: invoiceId,
          phone: customerPhone,
          type,
          template_id: templateId,
          status: 'failed',
          error_message: smsResult.error,
          sent_at: new Date().toISOString(),
        },
        {},
        context
      );

      logger.error('Invoice SMS sending failed', { 
        ...context, 
        invoiceId, 
        customerPhone, 
        type,
        error: smsResult.error 
      });

      return new Response(
        JSON.stringify({ 
          error: 'Failed to send SMS',
          details: smsResult.error 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  } catch (error) {
    logger.error('SMS service error', context, error as Error, { 
      invoiceId, 
      customerPhone, 
      type 
    });

    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

serve(handler);
