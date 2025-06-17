import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

    const url = new URL(req.url);
    const txnId = url.searchParams.get('txnId');

    if (!txnId) {
      return new Response(
        JSON.stringify({ error: 'Transaction ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Find the payment record
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .select(`
        *,
        invoices(id, user_id, vendor_id, amount, status)
      `)
      .eq('phonepe_txn_id', txnId)
      .single();

    if (paymentError || !payment) {
      return new Response(
        JSON.stringify({ error: 'Payment not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check payment status with PhonePe
    const merchantId = Deno.env.get('PHONEPE_MERCHANT_ID');
    const saltKey = Deno.env.get('PHONEPE_SALT_KEY');
    const saltIndex = Deno.env.get('PHONEPE_SALT_INDEX');
    const environment = Deno.env.get('PHONEPE_ENVIRONMENT') || 'SANDBOX';

    if (merchantId && saltKey && saltIndex) {
      try {
        const endpoint = `/pg/v1/status/${merchantId}/${txnId}`;
        const checksum = await generateChecksum(endpoint, saltKey, saltIndex);

        const baseUrl = environment === 'PRODUCTION' 
          ? 'https://api.phonepe.com/apis/hermes'
          : 'https://api-preprod.phonepe.com/apis/pg-sandbox';

        const statusResponse = await fetch(`${baseUrl}${endpoint}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'X-VERIFY': checksum,
            'X-MERCHANT-ID': merchantId,
          },
        });

        const statusData = await statusResponse.json();

        if (statusData.success && statusData.data) {
          let paymentStatus: 'initiated' | 'succeeded' | 'failed';
          let invoiceStatus: 'pending' | 'paid' | 'failed';

          switch (statusData.data.state) {
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

          // Update payment status
          await supabase
            .from('payments')
            .update({ status: paymentStatus })
            .eq('id', payment.id);

          // Update invoice status
          await supabase
            .from('invoices')
            .update({ status: invoiceStatus })
            .eq('id', payment.invoice_id);
        }
      } catch (error) {
        console.error('Error checking payment status:', error);
      }
    }

    // Return a redirect response that will work with deep links
    const redirectUrl = `invoicepe://payment-status?txnId=${txnId}&paymentId=${payment.id}`;
    
    return new Response(
      `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Payment Processing</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            margin: 0;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            text-align: center;
          }
          .container {
            background: rgba(255, 255, 255, 0.1);
            padding: 2rem;
            border-radius: 1rem;
            backdrop-filter: blur(10px);
            max-width: 400px;
          }
          .spinner {
            border: 3px solid rgba(255, 255, 255, 0.3);
            border-top: 3px solid white;
            border-radius: 50%;
            width: 40px;
            height: 40px;
            animation: spin 1s linear infinite;
            margin: 0 auto 1rem;
          }
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
          .button {
            background: #F5B80C;
            color: #000;
            border: none;
            padding: 12px 24px;
            border-radius: 8px;
            font-weight: 600;
            cursor: pointer;
            text-decoration: none;
            display: inline-block;
            margin-top: 1rem;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="spinner"></div>
          <h2>Payment Processing Complete</h2>
          <p>Redirecting you back to InvoicePe...</p>
          <a href="${redirectUrl}" class="button">Open InvoicePe</a>
        </div>
        <script>
          // Try to redirect automatically
          setTimeout(() => {
            window.location.href = '${redirectUrl}';
          }, 2000);
        </script>
      </body>
      </html>
      `,
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'text/html',
        },
      }
    );

  } catch (error) {
    console.error('Error in payment-callback function:', error);
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
