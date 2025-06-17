import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { withLogging, corsHeaders, handleCORS } from '../_shared/middleware.ts';
import { logger } from '../_shared/logger.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

interface MSG91VerifyRequest {
  accessToken: string;
}

const handler = withLogging(async (req, context) => {
  // Handle CORS
  const corsResponse = handleCORS(req);
  if (corsResponse) return corsResponse;

  logger.info('Processing MSG91 token verification', context);

  const { accessToken }: MSG91VerifyRequest = await req.json();

  if (!accessToken) {
    logger.warn('Missing access token', context);
    return new Response(
      JSON.stringify({ error: 'Access token is required' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    // Step 1: Verify access token with MSG91
    const msg91AuthKey = Deno.env.get('MSG91_AUTH_KEY');
    if (!msg91AuthKey) {
      logger.error('MSG91_AUTH_KEY not configured', context);
      return new Response(
        JSON.stringify({ error: 'SMS service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    logger.debug('Verifying access token with MSG91', { ...context, tokenLength: accessToken.length });

    const msg91Response = await fetch('https://control.msg91.com/api/v5/widget/verifyAccessToken', {
      method: 'POST',
      headers: {
        'authkey': msg91AuthKey,
        'accept': 'application/json',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        'access-token': accessToken,
      }),
    });

    const msg91Result = await msg91Response.json();

    if (!msg91Response.ok || msg91Result.type !== 'success') {
      logger.warn('MSG91 token verification failed', { ...context, error: msg91Result });
      return new Response(
        JSON.stringify({ error: 'Invalid access token' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const verifiedPhone = msg91Result.mobile;
    logger.info('MSG91 token verified successfully', { ...context, phone: verifiedPhone });

    // Step 2: Create Supabase Admin Client
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    logger.info('Creating/signing in user with Supabase Auth', { ...context, phone: verifiedPhone });

    // Step 3: Sign up or sign in user with Supabase Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      phone: verifiedPhone,
      phone_confirmed: true,
      user_metadata: {
        phone: verifiedPhone,
        verified_via: 'msg91_widget'
      }
    });

    if (authError && authError.message !== 'User already registered') {
      logger.error('Supabase auth error', context, authError);
      return new Response(
        JSON.stringify({ error: 'Authentication failed' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let user = authData?.user;

    // If user already exists, get existing user
    if (authError?.message === 'User already registered') {
      const { data: existingUser, error: getUserError } = await supabaseAdmin.auth.admin.getUserById(
        authData?.user?.id || ''
      );

      if (getUserError) {
        // Try to find user by phone
        const { data: users, error: listError } = await supabaseAdmin.auth.admin.listUsers();
        if (!listError && users) {
          user = users.users.find(u => u.phone === verifiedPhone);
        }
      } else {
        user = existingUser.user;
      }
    }

    if (!user) {
      logger.error('Failed to create or find user', context);
      return new Response(
        JSON.stringify({ error: 'User creation failed' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    logger.info('Supabase Auth user created/found', { ...context, userId: user.id });

    // Step 4: Create/sync custom users table record with SAME ID
    const { data: customUser, error: customUserError } = await supabaseAdmin
      .from('users')
      .upsert({
        id: user.id, // CRITICAL: Use same ID as Supabase Auth user
        phone: verifiedPhone,
        business_name: null, // Will be collected in onboarding
        gstin: null,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'id',
        ignoreDuplicates: false
      })
      .select()
      .single();

    if (customUserError) {
      logger.error('Failed to sync custom user record', context, customUserError);
      // Don't fail the auth flow, but log the error
      logger.warn('Continuing with auth despite custom user sync failure', context);
    } else {
      logger.info('Custom user record synced successfully', { ...context, customUserId: customUser.id });
    }

    logger.info('User authenticated successfully', { ...context, userId: user.id });

    // Step 4: Return user data for frontend to handle session
    logger.info('MSG91 authentication completed successfully', {
      ...context,
      userId: user.id,
      phone: user.phone
    });

    return new Response(
      JSON.stringify({
        success: true,
        user: {
          id: user.id,
          phone: user.phone,
          email: user.email,
          user_metadata: user.user_metadata || { phone: verifiedPhone },
        },
        // Frontend will use this to sign in with Supabase
        supabase_user_id: user.id
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
    logger.error('MSG91 token verification error', context, error as Error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

serve(handler);
