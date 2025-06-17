import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SaveCardRequest {
  phonepe_token: string;
  masked_card: string;
  card_type: 'VISA' | 'MASTERCARD' | 'RUPAY' | 'AMEX';
  expiry_month: string;
  expiry_year: string;
  is_default?: boolean;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get user from auth header
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
        JSON.stringify({ error: 'Invalid or expired token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Handle different HTTP methods
    switch (req.method) {
      case 'GET':
        return await handleGetSavedCards(supabase, user.id);
      case 'POST':
        return await handleSaveCard(supabase, user.id, req);
      case 'PUT':
        return await handleUpdateCard(supabase, user.id, req);
      case 'DELETE':
        return await handleDeleteCard(supabase, user.id, req);
      default:
        return new Response(
          JSON.stringify({ error: 'Method not allowed' }),
          { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
  } catch (error) {
    console.error('Saved cards function error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function handleGetSavedCards(supabase: any, userId: string) {
  const { data: cards, error } = await supabase
    .from('saved_cards')
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true)
    .order('is_default', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) {
    return new Response(
      JSON.stringify({ error: 'Failed to fetch saved cards' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  return new Response(
    JSON.stringify({
      success: true,
      message: 'Saved cards retrieved successfully',
      cards: cards || [],
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function handleSaveCard(supabase: any, userId: string, req: Request) {
  const cardData: SaveCardRequest = await req.json();

  // Validate required fields
  if (!cardData.phonepe_token || !cardData.masked_card || !cardData.card_type) {
    return new Response(
      JSON.stringify({ error: 'Missing required card data' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Check if card already exists
  const { data: existingCard } = await supabase
    .from('saved_cards')
    .select('id')
    .eq('phonepe_token', cardData.phonepe_token)
    .eq('user_id', userId)
    .single();

  if (existingCard) {
    return new Response(
      JSON.stringify({ error: 'Card already saved' }),
      { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Insert new saved card
  const { data: savedCard, error } = await supabase
    .from('saved_cards')
    .insert({
      user_id: userId,
      phonepe_token: cardData.phonepe_token,
      masked_card: cardData.masked_card,
      card_type: cardData.card_type,
      expiry_month: cardData.expiry_month,
      expiry_year: cardData.expiry_year,
      is_default: cardData.is_default || false,
    })
    .select()
    .single();

  if (error) {
    console.error('Error saving card:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to save card' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  return new Response(
    JSON.stringify({
      success: true,
      message: 'Card saved successfully',
      card: savedCard,
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function handleUpdateCard(supabase: any, userId: string, req: Request) {
  const url = new URL(req.url);
  const cardId = url.searchParams.get('id');
  
  if (!cardId) {
    return new Response(
      JSON.stringify({ error: 'Card ID required' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const updateData = await req.json();

  const { data: updatedCard, error } = await supabase
    .from('saved_cards')
    .update(updateData)
    .eq('id', cardId)
    .eq('user_id', userId)
    .select()
    .single();

  if (error) {
    return new Response(
      JSON.stringify({ error: 'Failed to update card' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  return new Response(
    JSON.stringify({
      success: true,
      message: 'Card updated successfully',
      card: updatedCard,
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function handleDeleteCard(supabase: any, userId: string, req: Request) {
  const url = new URL(req.url);
  const cardId = url.searchParams.get('id');
  
  if (!cardId) {
    return new Response(
      JSON.stringify({ error: 'Card ID required' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Soft delete by setting is_active to false
  const { error } = await supabase
    .from('saved_cards')
    .update({ is_active: false })
    .eq('id', cardId)
    .eq('user_id', userId);

  if (error) {
    return new Response(
      JSON.stringify({ error: 'Failed to delete card' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  return new Response(
    JSON.stringify({
      success: true,
      message: 'Card deleted successfully',
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}
