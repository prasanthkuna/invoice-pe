import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface VendorRequest {
  name: string;
  category_id: string;
  upi_id?: string;
  bank_account?: string;
  phone?: string;
}

// Helper function to get user from JWT
async function getUserFromAuth(req: Request) {
  const authHeader = req.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    throw new Error('Missing or invalid authorization header');
  }

  const token = authHeader.substring(7);
  // In a real implementation, you'd verify the JWT here
  // For now, we'll extract the user ID from the token payload
  const payload = JSON.parse(atob(token.split('.')[1]));
  return payload.sub;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const userId = await getUserFromAuth(req);
    const url = new URL(req.url);
    const vendorId = url.pathname.split('/').pop();

    switch (req.method) {
      case 'GET':
        if (vendorId && vendorId !== 'vendors') {
          // Get single vendor
          const { data: vendor, error } = await supabase
            .from('vendors')
            .select(`
              *,
              vendor_categories(name)
            `)
            .eq('id', vendorId)
            .eq('user_id', userId)
            .single();

          if (error) {
            return new Response(
              JSON.stringify({ error: 'Vendor not found' }),
              { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }

          return new Response(
            JSON.stringify({ vendor }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        } else {
          // Get all vendors
          const { data: vendors, error } = await supabase
            .from('vendors')
            .select(`
              *,
              vendor_categories(name)
            `)
            .eq('user_id', userId)
            .eq('is_active', true)
            .order('created_at', { ascending: false });

          if (error) {
            return new Response(
              JSON.stringify({ error: 'Failed to fetch vendors' }),
              { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }

          return new Response(
            JSON.stringify({ vendors }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

      case 'POST':
        const vendorData: VendorRequest = await req.json();

        // Validate required fields
        if (!vendorData.name || !vendorData.category_id) {
          return new Response(
            JSON.stringify({ error: 'Name and category are required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const { data: newVendor, error: createError } = await supabase
          .from('vendors')
          .insert({
            user_id: userId,
            name: vendorData.name,
            category_id: vendorData.category_id,
            upi_id: vendorData.upi_id,
            bank_account: vendorData.bank_account,
            phone: vendorData.phone,
          })
          .select(`
            *,
            vendor_categories(name)
          `)
          .single();

        if (createError) {
          return new Response(
            JSON.stringify({ error: 'Failed to create vendor' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        return new Response(
          JSON.stringify({ vendor: newVendor }),
          { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );

      case 'PUT':
        if (!vendorId || vendorId === 'vendors') {
          return new Response(
            JSON.stringify({ error: 'Vendor ID required for update' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const updateData: VendorRequest = await req.json();

        const { data: updatedVendor, error: updateError } = await supabase
          .from('vendors')
          .update({
            name: updateData.name,
            category_id: updateData.category_id,
            upi_id: updateData.upi_id,
            bank_account: updateData.bank_account,
            phone: updateData.phone,
          })
          .eq('id', vendorId)
          .eq('user_id', userId)
          .select(`
            *,
            vendor_categories(name)
          `)
          .single();

        if (updateError) {
          return new Response(
            JSON.stringify({ error: 'Failed to update vendor' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        return new Response(
          JSON.stringify({ vendor: updatedVendor }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );

      case 'DELETE':
        if (!vendorId || vendorId === 'vendors') {
          return new Response(
            JSON.stringify({ error: 'Vendor ID required for deletion' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Soft delete by setting is_active to false
        const { error: deleteError } = await supabase
          .from('vendors')
          .update({ is_active: false })
          .eq('id', vendorId)
          .eq('user_id', userId);

        if (deleteError) {
          return new Response(
            JSON.stringify({ error: 'Failed to delete vendor' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        return new Response(
          JSON.stringify({ success: true }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );

      default:
        return new Response(
          JSON.stringify({ error: 'Method not allowed' }),
          { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
