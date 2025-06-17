import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface InvoiceRequest {
  vendor_id: string;
  amount: number;
  description?: string;
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

    const userId = user.id;
    const url = new URL(req.url);
    const pathParts = url.pathname.split('/');
    const invoiceId = pathParts[pathParts.length - 1];

    switch (req.method) {
      case 'GET':
        if (invoiceId && invoiceId !== 'invoices') {
          // Get single invoice
          const { data: invoice, error: getError } = await supabase
            .from('invoices')
            .select(`
              *,
              vendors(id, name, category_id, vendor_categories(name))
            `)
            .eq('id', invoiceId)
            .eq('user_id', userId)
            .single();

          if (getError) {
            return new Response(
              JSON.stringify({ error: 'Invoice not found' }),
              { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }

          return new Response(
            JSON.stringify({ success: true, message: 'Invoice retrieved', invoice }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        } else {
          // Get all invoices for user
          const { data: invoices, error: listError } = await supabase
            .from('invoices')
            .select(`
              *,
              vendors(id, name, category_id, vendor_categories(name))
            `)
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

          if (listError) {
            return new Response(
              JSON.stringify({ error: 'Failed to fetch invoices' }),
              { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }

          return new Response(
            JSON.stringify({ success: true, message: 'Invoices retrieved', invoices }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

      case 'POST':
        const invoiceData: InvoiceRequest = await req.json();

        // Validate required fields
        if (!invoiceData.vendor_id || !invoiceData.amount) {
          return new Response(
            JSON.stringify({ error: 'Vendor ID and amount are required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Validate amount is positive
        if (invoiceData.amount <= 0) {
          return new Response(
            JSON.stringify({ error: 'Amount must be greater than 0' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Verify vendor belongs to user
        const { data: vendor, error: vendorError } = await supabase
          .from('vendors')
          .select('id')
          .eq('id', invoiceData.vendor_id)
          .eq('user_id', userId)
          .single();

        if (vendorError || !vendor) {
          return new Response(
            JSON.stringify({ error: 'Vendor not found' }),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const { data: newInvoice, error: createError } = await supabase
          .from('invoices')
          .insert({
            user_id: userId,
            vendor_id: invoiceData.vendor_id,
            amount: invoiceData.amount,
            description: invoiceData.description,
            currency: 'INR',
            status: 'pending',
          })
          .select(`
            *,
            vendors(id, name, category_id, vendor_categories(name))
          `)
          .single();

        if (createError) {
          return new Response(
            JSON.stringify({ error: 'Failed to create invoice' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        return new Response(
          JSON.stringify({ success: true, message: 'Invoice created successfully', invoice: newInvoice }),
          { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );

      case 'PUT':
        if (!invoiceId || invoiceId === 'invoices') {
          return new Response(
            JSON.stringify({ error: 'Invoice ID is required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const updateData: Partial<InvoiceRequest> = await req.json();

        // Validate amount if provided
        if (updateData.amount !== undefined && updateData.amount <= 0) {
          return new Response(
            JSON.stringify({ error: 'Amount must be greater than 0' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const { data: updatedInvoice, error: updateError } = await supabase
          .from('invoices')
          .update({
            ...(updateData.vendor_id && { vendor_id: updateData.vendor_id }),
            ...(updateData.amount && { amount: updateData.amount }),
            ...(updateData.description !== undefined && { description: updateData.description }),
          })
          .eq('id', invoiceId)
          .eq('user_id', userId)
          .select(`
            *,
            vendors(id, name, category_id, vendor_categories(name))
          `)
          .single();

        if (updateError) {
          return new Response(
            JSON.stringify({ error: 'Failed to update invoice' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        return new Response(
          JSON.stringify({ success: true, message: 'Invoice updated successfully', invoice: updatedInvoice }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );

      case 'DELETE':
        if (!invoiceId || invoiceId === 'invoices') {
          return new Response(
            JSON.stringify({ error: 'Invoice ID is required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const { error: deleteError } = await supabase
          .from('invoices')
          .delete()
          .eq('id', invoiceId)
          .eq('user_id', userId);

        if (deleteError) {
          return new Response(
            JSON.stringify({ error: 'Failed to delete invoice' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        return new Response(
          JSON.stringify({ success: true, message: 'Invoice deleted successfully' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );

      default:
        return new Response(
          JSON.stringify({ error: 'Method not allowed' }),
          { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
  } catch (error) {
    console.error('Error in invoices function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
