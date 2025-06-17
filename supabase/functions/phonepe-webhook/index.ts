import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-verify',
};

interface PhonePeWebhookPayload {
  response: string; // Base64 encoded response
  checksum?: string;
}

interface PhonePeWebhookData {
  merchantId: string;
  merchantTransactionId: string;
  transactionId: string;
  amount: number;
  state: 'COMPLETED' | 'FAILED' | 'PENDING';
  responseCode: string;
  paymentInstrument?: {
    type: string;
    cardType?: string;
    pgTransactionId?: string;
    bankTransactionId?: string;
    pgAuthorizationCode?: string;
    arn?: string;
    bankId?: string;
    brn?: string;
  };
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const webhookData: PhonePeWebhookPayload = await req.json();

    if (!webhookData.response) {
      return new Response(
        JSON.stringify({ error: 'Missing response data' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify checksum
    const xVerify = req.headers.get('X-VERIFY');
    const saltKey = Deno.env.get('PHONEPE_SALT_KEY');
    const saltIndex = Deno.env.get('PHONEPE_SALT_INDEX');

    if (!saltKey || !saltIndex) {
      console.error('PhonePe configuration missing');
      return new Response(
        JSON.stringify({ error: 'Configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify the checksum
    const expectedChecksum = await generateChecksum(webhookData.response, saltKey, saltIndex);
    if (xVerify !== expectedChecksum) {
      console.error('Checksum verification failed');
      return new Response(
        JSON.stringify({ error: 'Invalid checksum' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Decode the response
    let decodedData: PhonePeWebhookData;
    try {
      const decodedResponse = atob(webhookData.response);
      decodedData = JSON.parse(decodedResponse);
    } catch (error) {
      console.error('Failed to decode webhook response:', error);
      return new Response(
        JSON.stringify({ error: 'Invalid response format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('PhonePe webhook received:', decodedData);

    // Find the payment record
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .select(`
        *,
        invoices(id, user_id, vendor_id, amount, status)
      `)
      .eq('phonepe_txn_id', decodedData.merchantTransactionId)
      .single();

    if (paymentError || !payment) {
      console.error('Payment not found:', decodedData.merchantTransactionId);
      return new Response(
        JSON.stringify({ error: 'Payment not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Determine payment status
    let paymentStatus: 'initiated' | 'succeeded' | 'failed';
    let invoiceStatus: 'pending' | 'paid' | 'failed';

    switch (decodedData.state) {
      case 'COMPLETED':
        paymentStatus = 'succeeded';
        invoiceStatus = 'paid';
        break;
      case 'FAILED':
        paymentStatus = 'failed';
        invoiceStatus = 'failed';
        break;
      case 'PENDING':
      default:
        paymentStatus = 'initiated';
        invoiceStatus = 'pending';
        break;
    }

    // Update payment record
    const { error: updatePaymentError } = await supabase
      .from('payments')
      .update({
        status: paymentStatus,
        masked_card: decodedData.paymentInstrument?.cardType || null,
      })
      .eq('id', payment.id);

    if (updatePaymentError) {
      console.error('Failed to update payment:', updatePaymentError);
      return new Response(
        JSON.stringify({ error: 'Failed to update payment' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update invoice status
    const { error: updateInvoiceError } = await supabase
      .from('invoices')
      .update({ status: invoiceStatus })
      .eq('id', payment.invoice_id);

    if (updateInvoiceError) {
      console.error('Failed to update invoice:', updateInvoiceError);
      return new Response(
        JSON.stringify({ error: 'Failed to update invoice' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // If payment is successful, trigger PDF generation
    if (paymentStatus === 'succeeded') {
      try {
        // Get full invoice details for PDF generation
        const { data: fullInvoice } = await supabase
          .from('invoices')
          .select(`
            *,
            vendors(id, name, category_id, vendor_categories(name), phone, upi_id, bank_account)
          `)
          .eq('id', payment.invoice_id)
          .single();

        if (fullInvoice) {
          // TODO: Trigger PDF generation here
          console.log('Payment successful, PDF generation should be triggered for invoice:', fullInvoice.id);
        }
      } catch (error) {
        console.error('Error in post-payment processing:', error);
        // Don't fail the webhook for PDF generation errors
      }
    }

    console.log(`Payment ${payment.id} updated to ${paymentStatus}, invoice ${payment.invoice_id} updated to ${invoiceStatus}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Webhook processed successfully',
        payment_status: paymentStatus,
        invoice_status: invoiceStatus,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in phonepe-webhook function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// Helper function to generate PhonePe checksum for verification
async function generateChecksum(response: string, saltKey: string, saltIndex: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(response + saltKey);
  
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  
  return hashHex + '###' + saltIndex;
}
