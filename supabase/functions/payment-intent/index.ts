import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PaymentRequest {
  invoice_id: string;
  method: 'card' | 'upi' | 'saved_card';
  return_url?: string;
  mobile_number?: string;
  saved_card_id?: string;
  save_card?: boolean;
}

interface PhonePePaymentRequest {
  merchantId: string;
  merchantTransactionId: string;
  merchantUserId: string;
  amount: number;
  redirectUrl: string;
  redirectMode: 'REDIRECT' | 'POST';
  callbackUrl: string;
  mobileNumber: string;
  paymentInstrument: {
    type: 'PAY_PAGE' | 'SAVED_CARD';
    savedCardId?: string;
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

    // Get user from JWT token
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const paymentData: PaymentRequest = await req.json();

    // IDEMPOTENCY: Generate or get idempotency key from request header
    const idempotencyKey = req.headers.get('X-Request-ID') || crypto.randomUUID();

    // Check for existing payment with same idempotency key
    const { data: existingPayment } = await supabase
      .from('payments')
      .select('*, invoices(amount)')
      .eq('idempotency_key', idempotencyKey)
      .single();

    if (existingPayment) {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'Payment already exists',
          payment: existingPayment,
          payment_url: null // Existing payment, no new URL needed
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate required fields
    if (!paymentData.invoice_id || !paymentData.method) {
      return new Response(
        JSON.stringify({ error: 'Invoice ID and payment method are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get invoice details with vendor UPI info for auto-collect
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .select(`
        *,
        vendors(id, name, category_id, vendor_categories(name), upi_id)
      `)
      .eq('id', paymentData.invoice_id)
      .eq('user_id', user.id)
      .single();

    if (invoiceError || !invoice) {
      return new Response(
        JSON.stringify({ error: 'Invoice not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if invoice is already paid
    if (invoice.status === 'paid') {
      return new Response(
        JSON.stringify({ error: 'Invoice is already paid' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate unique transaction ID
    const merchantTransactionId = `INV_${invoice.id}_${Date.now()}`;

    // Create payment record
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .insert({
        invoice_id: paymentData.invoice_id,
        phonepe_txn_id: merchantTransactionId,
        method: paymentData.method,
        saved_card_id: paymentData.saved_card_id,
        status: 'initiated',
        idempotency_key: idempotencyKey,
      })
      .select()
      .single();

    if (paymentError) {
      return new Response(
        JSON.stringify({ error: 'Failed to create payment record' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get PhonePe configuration
    const merchantId = Deno.env.get('PHONEPE_MERCHANT_ID');
    const saltKey = Deno.env.get('PHONEPE_SALT_KEY');
    const saltIndex = Deno.env.get('PHONEPE_SALT_INDEX');
    const environment = Deno.env.get('PHONEPE_ENVIRONMENT') || 'SANDBOX';

    if (!merchantId || !saltKey || !saltIndex) {
      return new Response(
        JSON.stringify({ error: 'PhonePe configuration missing' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get user mobile number (use phone as fallback)
    const { data: userProfile } = await supabase.auth.getUser(token);
    const mobileNumber = paymentData.mobile_number || userProfile?.user?.phone || '9999999999';

    // Handle saved card payments
    let savedCard = null;
    if (paymentData.method === 'saved_card' && paymentData.saved_card_id) {
      const { data: cardData, error: cardError } = await supabase
        .from('saved_cards')
        .select('*')
        .eq('id', paymentData.saved_card_id)
        .eq('user_id', user.id)
        .eq('is_active', true)
        .single();

      if (cardError || !cardData) {
        return new Response(
          JSON.stringify({ error: 'Invalid or inactive saved card' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      savedCard = cardData;
    }

    // UPI AUTO-COLLECT: Determine payment instrument based on method and vendor UPI availability
    let paymentInstrument;
    if (paymentData.method === 'upi' && invoice.vendors?.upi_id) {
      // Auto-collect UPI payment if vendor has UPI ID
      paymentInstrument = {
        type: 'UPI_COLLECT',
        targetApp: 'com.phonepe.app',
        upiId: invoice.vendors.upi_id
      };
    } else if (savedCard) {
      paymentInstrument = {
        type: 'SAVED_CARD',
        savedCardId: savedCard.phonepe_token,
      };
    } else {
      paymentInstrument = {
        type: 'PAY_PAGE',
      };
    }

    // Prepare PhonePe payment request according to API spec
    const phonePeRequest: PhonePePaymentRequest = {
      merchantId,
      merchantTransactionId,
      merchantUserId: user.id,
      amount: Math.round(invoice.amount * 100), // Convert to paise
      redirectUrl: paymentData.return_url || `invoicepe://payment-callback?txnId=${merchantTransactionId}`,
      redirectMode: 'REDIRECT',
      callbackUrl: `${supabaseUrl}/functions/v1/phonepe-webhook`,
      mobileNumber: mobileNumber.replace(/\D/g, ''), // Remove non-digits
      paymentInstrument,
    };

    // Encode the request according to PhonePe API spec
    const base64Request = btoa(JSON.stringify(phonePeRequest));
    const checksum = await generateChecksum(base64Request + '/pg/v1/pay', saltKey, saltIndex);

    // Determine API URL based on environment
    const apiUrl = environment === 'PRODUCTION'
      ? 'https://api.phonepe.com/apis/hermes/pg/v1/pay'
      : 'https://api-preprod.phonepe.com/apis/pg-sandbox/pg/v1/pay';

    // Make request to PhonePe with exact API specification
    const phonePeResponse = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-VERIFY': checksum,
      },
      body: JSON.stringify({
        request: base64Request,
      }),
    });

    const phonePeData = await phonePeResponse.json();

    if (phonePeData.success && phonePeData.data?.instrumentResponse?.redirectInfo) {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'Payment initiated successfully',
          payment,
          payment_url: phonePeData.data.instrumentResponse.redirectInfo.url,
          phonepe_txn_id: merchantTransactionId,
          redirect_method: phonePeData.data.instrumentResponse.redirectInfo.method || 'GET',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else {
      // Update payment status to failed
      await supabase
        .from('payments')
        .update({ status: 'failed' })
        .eq('id', payment.id);

      return new Response(
        JSON.stringify({
          success: false,
          error: 'Failed to initiate payment',
          code: phonePeData.code || 'PAYMENT_ERROR',
          message: phonePeData.message || 'Unknown error',
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  } catch (error) {
    console.error('Error in payment-intent function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// Helper function to generate PhonePe checksum
async function generateChecksum(payload: string, saltKey: string, saltIndex: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(payload + saltKey);
  
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  
  return hashHex + '###' + saltIndex;
}
