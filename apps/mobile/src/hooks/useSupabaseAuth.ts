import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { debugContext } from '../utils/logger';
import type { User as SupabaseUser, Session } from '@supabase/supabase-js';
import type { User } from '@invoicepe/types';

interface AuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;
}

interface AuthResponse {
  success: boolean;
  message: string;
  data?: {
    user?: SupabaseUser;
    session?: Session;
  };
}

// Helper function to convert Supabase User to our User type
const convertSupabaseUser = (supabaseUser: SupabaseUser | null): User | null => {
  if (!supabaseUser) return null;

  return {
    id: supabaseUser.id,
    phone: supabaseUser.phone || supabaseUser.user_metadata?.phone || '',
    business_name: supabaseUser.user_metadata?.business_name,
    gstin: supabaseUser.user_metadata?.gstin,
    created_at: supabaseUser.created_at || new Date().toISOString(),
    updated_at: supabaseUser.updated_at || new Date().toISOString(),
  };
};

// Helper function to ensure user exists in custom users table
const ensureCustomUserExists = async (authUser: SupabaseUser): Promise<User | null> => {
  try {
    debugContext.info('auth', { step: 'ensuring_custom_user', userId: authUser.id });

    const { data, error } = await supabase
      .from('users')
      .upsert({
        id: authUser.id,
        phone: authUser.phone || authUser.user_metadata?.phone || '',
        business_name: authUser.user_metadata?.business_name || null,
        gstin: authUser.user_metadata?.gstin || null,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'id',
        ignoreDuplicates: false
      })
      .select()
      .single();

    if (error) {
      debugContext.error('auth', error, { step: 'ensure_custom_user_failed', userId: authUser.id });
      return convertSupabaseUser(authUser); // Fallback to Supabase user
    }

    debugContext.info('auth', { step: 'custom_user_synced', userId: authUser.id });
    return data as User;
  } catch (error) {
    debugContext.error('auth', error as Error, { step: 'ensure_custom_user_error', userId: authUser.id });
    return convertSupabaseUser(authUser); // Fallback to Supabase user
  }
};

export const useSupabaseAuth = () => {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    session: null,
    loading: true,
  });

  useEffect(() => {
    // Get initial session
    const getInitialSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();

        if (error) {
          debugContext.error('auth', error, { step: 'get_initial_session' });
        }

        // If we have a session, ensure custom user exists
        let customUser: User | null = null;
        if (session?.user) {
          customUser = await ensureCustomUserExists(session.user);
        }

        setAuthState({
          user: customUser || convertSupabaseUser(session?.user ?? null),
          session: session,
          loading: false,
        });

        debugContext.auth({
          step: 'initial_session_loaded',
          hasSession: !!session,
          userId: session?.user?.id,
          hasCustomUser: !!customUser
        });
      } catch (error) {
        debugContext.error('auth', error as Error, { step: 'get_initial_session_failed' });
        setAuthState(prev => ({ ...prev, loading: false }));
      }
    };

    getInitialSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        debugContext.auth({
          step: 'auth_state_changed',
          event,
          hasSession: !!session,
          userId: session?.user?.id
        });

        // If we have a session, ensure custom user exists
        let customUser: User | null = null;
        if (session?.user) {
          customUser = await ensureCustomUserExists(session.user);
        }

        setAuthState({
          user: customUser || convertSupabaseUser(session?.user ?? null),
          session: session,
          loading: false,
        });
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);



  const signInWithPhone = async (phone: string): Promise<AuthResponse> => {
    try {
      debugContext.auth({ step: 'signing_in_with_phone', phone: phone.slice(-4) });

      // Validate phone number format
      const phoneRegex = /^\+91[6-9]\d{9}$/;
      if (!phoneRegex.test(phone)) {
        return {
          success: false,
          message: 'Invalid phone number format. Use +91XXXXXXXXXX'
        };
      }

      const { data, error } = await supabase.auth.signInWithOtp({
        phone: phone,
        options: {
          shouldCreateUser: true,
          channel: 'sms'
        }
      });

      if (error) {
        debugContext.error('auth', error, { step: 'sign_in_with_phone_failed', phone: phone.slice(-4) });
        return {
          success: false,
          message: error.message || 'Failed to send OTP'
        };
      }

      debugContext.auth({ step: 'sign_in_with_phone_success', phone: phone.slice(-4) });
      return {
        success: true,
        message: 'OTP sent successfully',
        data
      };
    } catch (error) {
      debugContext.error('auth', error as Error, { step: 'sign_in_with_phone_error', phone: phone.slice(-4) });
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Network error. Please try again.'
      };
    }
  };

  const verifyOtp = async (phone: string, token: string): Promise<AuthResponse> => {
    try {
      debugContext.auth({ step: 'verifying_otp', phone: phone.slice(-4), otpLength: token.length });

      // Validate OTP format (6 digits for Twilio Verify)
      if (!/^\d{6}$/.test(token)) {
        return {
          success: false,
          message: 'Invalid OTP format. Must be 6 digits'
        };
      }

      const { data, error } = await supabase.auth.verifyOtp({
        phone: phone,
        token: token,
        type: 'sms'
      });

      if (error) {
        debugContext.error('auth', error, { step: 'verify_otp_failed', phone: phone.slice(-4) });
        return {
          success: false,
          message: error.message || 'Invalid OTP'
        };
      }

      // Ensure custom user is created/updated
      if (data.user) {
        await ensureCustomUserExists(data.user);
      }

      debugContext.auth({
        step: 'verify_otp_success',
        phone: phone.slice(-4),
        userId: data.user?.id
      });

      return {
        success: true,
        message: 'Authentication successful',
        data
      };
    } catch (error) {
      debugContext.error('auth', error as Error, { step: 'verify_otp_error', phone: phone.slice(-4) });
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Network error. Please try again.'
      };
    }
  };



  const signOut = async () => {
    try {
      debugContext.auth({ step: 'signing_out' });

      const { error } = await supabase.auth.signOut();
      
      if (error) {
        debugContext.error('auth', error, { step: 'sign_out_failed' });
        throw error;
      }

      debugContext.auth({ step: 'sign_out_success' });
    } catch (error) {
      debugContext.error('auth', error as Error, { step: 'sign_out_error' });
      throw error;
    }
  };

  return {
    user: authState.user,
    session: authState.session,
    loading: authState.loading,
    isAuthenticated: !!authState.user,
    signInWithPhone,
    verifyOtp,
    signOut,
  };
};
