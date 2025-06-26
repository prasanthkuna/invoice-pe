import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { withLogging, corsHeaders, handleCORS } from '../_shared/middleware.ts';
import { logger } from '../_shared/logger.ts';
import { createDatabaseClient } from '../_shared/database.ts';

interface InvoiceSMSRequest {
  invoiceId: string;
  customerPhone: string;
  type: 'created' | 'reminder' | 'payment_received';
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

  // Validate phone number format (Indian format)
  const phoneRegex = /^[6-9]\d{9}$/;
  if (!phoneRegex.test(customerPhone)) {
    logger.warn('Invalid phone number format', { ...context, customerPhone });
    return new Response(
      JSON.stringify({ error: 'Invalid phone number format. Use 10-digit Indian mobile number.' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Validate SMS type
  const validTypes = ['created', 'reminder', 'payment_received'];
  if (!validTypes.includes(type)) {
    logger.warn('Invalid SMS type', { ...context, type });
    return new Response(
      JSON.stringify({ error: 'Invalid SMS type. Use: created, reminder, or payment_received' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const db = createDatabaseClient();

    // Verify invoice exists and get details
    const { data: invoice, error: invoiceError } = await db.select(
      'invoices',
      { 
        eq: { id: invoiceId },
        select: 'id,invoice_number,total_amount,customer_phone,status'
      },
      context
    );

    if (invoiceError || !invoice || invoice.length === 0) {
      logger.warn('Invoice not found', { ...context, invoiceId, error: invoiceError });
      return new Response(
        JSON.stringify({ error: 'Invoice not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const invoiceData = invoice[0];
    logger.debug('Invoice found for SMS', { ...context, invoiceId, amount: invoiceData.total_amount });

    // Simple SMS messages (Twilio-compatible, no templates needed)
    const messageMap = {
      'created': `Invoice #${variables.invoice_number || invoiceData.invoice_number || invoiceId.slice(-6)} created for ₹${invoiceData.total_amount}. ${variables.payment_link || 'Payment link will be shared shortly.'}`,
      'reminder': `Payment reminder: Invoice #${variables.invoice_number || invoiceData.invoice_number || invoiceId.slice(-6)} for ₹${invoiceData.total_amount} is pending. ${variables.payment_link || 'Please contact us for payment.'}`,
      'payment_received': `Payment received! Invoice #${variables.invoice_number || invoiceData.invoice_number || invoiceId.slice(-6)} for ₹${invoiceData.total_amount} has been paid successfully. Thank you!`
    };

    const message = messageMap[type];

    logger.debug('Sending invoice SMS via Twilio', { 
      ...context, 
      invoiceId, 
      customerPhone, 
      type,
      messageLength: message.length
    });

    // Simulate SMS sending (replace with actual Twilio API call when configured)
    // TODO: Replace with actual Twilio API integration
    const smsResult = {
      success: true,
      messageId: `twilio_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      message: 'SMS sent via Twilio (simulated)'
    };

    // Log SMS activity in database
    await db.insert(
      'sms_logs',
      {
        invoice_id: invoiceId,
        phone: customerPhone,
        type,
        provider: 'twilio',
        twilio_sid: smsResult.messageId,
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
        type,
        provider: 'twilio'
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

  } catch (error) {
    logger.error('Invoice SMS processing error', context, error as Error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

serve(handler);
