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

    const url = new URL(req.url);
    const pathParts = url.pathname.split('/');
    const paymentId = pathParts[pathParts.length - 1];

    switch (req.method) {
      case 'GET':
        if (paymentId && paymentId !== 'payment-status') {
          // Get single payment status
          const { data: payment, error: getError } = await supabase
            .from('payments')
            .select(`
              *,
              invoices(id, user_id, vendor_id, amount, status, vendors(name))
            `)
            .eq('id', paymentId)
            .single();

          if (getError || !payment) {
            return new Response(
              JSON.stringify({ error: 'Payment not found' }),
              { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }

          // Verify user owns this payment
          if (payment.invoices?.user_id !== user.id) {
            return new Response(
              JSON.stringify({ error: 'Unauthorized' }),
              { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }

          // If payment is still initiated, check with PhonePe
          if (payment.status === 'initiated' && payment.phonepe_txn_id) {
            try {
              const phonePeStatus = await checkPhonePeStatus(payment.phonepe_txn_id);
              
              if (phonePeStatus && phonePeStatus.state !== 'PENDING') {
                // Update payment status based on PhonePe response
                let newStatus: 'succeeded' | 'failed';
                let invoiceStatus: 'paid' | 'failed';

                if (phonePeStatus.state === 'COMPLETED') {
                  newStatus = 'succeeded';
                  invoiceStatus = 'paid';
                } else {
                  newStatus = 'failed';
                  invoiceStatus = 'failed';
                }

                // Update payment
                await supabase
                  .from('payments')
                  .update({ status: newStatus })
                  .eq('id', payment.id);

                // Update invoice
                await supabase
                  .from('invoices')
                  .update({ status: invoiceStatus })
                  .eq('id', payment.invoice_id);

                payment.status = newStatus;
              }
            } catch (error) {
              console.error('Error checking PhonePe status:', error);
              // Continue with existing status if PhonePe check fails
            }
          }

          return new Response(
            JSON.stringify({ success: true, message: 'Payment status retrieved', payment }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        } else {
          // Get all payments for user
          const { data: payments, error: listError } = await supabase
            .from('payments')
            .select(`
              *,
              invoices(id, user_id, vendor_id, amount, status, vendors(name))
            `)
            .eq('invoices.user_id', user.id)
            .order('created_at', { ascending: false });

          if (listError) {
            return new Response(
              JSON.stringify({ error: 'Failed to fetch payments' }),
              { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }

          return new Response(
            JSON.stringify({ success: true, message: 'Payments retrieved', payments }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

      default:
        return new Response(
          JSON.stringify({ error: 'Method not allowed' }),
          { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
  } catch (error) {
    console.error('Error in payment-status function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// Helper function to check payment status with PhonePe
async function checkPhonePeStatus(merchantTransactionId: string) {
  try {
    const merchantId = Deno.env.get('PHONEPE_MERCHANT_ID');
    const saltKey = Deno.env.get('PHONEPE_SALT_KEY');
    const saltIndex = Deno.env.get('PHONEPE_SALT_INDEX');
    const environment = Deno.env.get('PHONEPE_ENVIRONMENT') || 'SANDBOX';

    if (!merchantId || !saltKey || !saltIndex) {
      throw new Error('PhonePe configuration missing');
    }

    const endpoint = `/pg/v1/status/${merchantId}/${merchantTransactionId}`;
    const checksum = await generateChecksum(endpoint, saltKey, saltIndex);

    // Determine API URL based on environment
    const baseUrl = environment === 'PRODUCTION'
      ? 'https://api.phonepe.com/apis/hermes'
      : 'https://api-preprod.phonepe.com/apis/pg-sandbox';

    const response = await fetch(`${baseUrl}${endpoint}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-VERIFY': checksum,
        'X-MERCHANT-ID': merchantId,
      },
    });

    const data = await response.json();

    if (data.success && data.data) {
      return data.data;
    }

    return null;
  } catch (error) {
    console.error('Error checking PhonePe status:', error);
    return null;
  }
}

// Helper function to generate PhonePe checksum
async function generateChecksum(payload: string, saltKey: string, saltIndex: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(payload + saltKey);
  
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  
  return hashHex + '###' + saltIndex;
}
