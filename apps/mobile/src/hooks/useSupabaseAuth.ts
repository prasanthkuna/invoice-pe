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

        setAuthState({
          user: convertSupabaseUser(session?.user ?? null),
          session: session,
          loading: false,
        });

        debugContext.auth({ 
          step: 'initial_session_loaded', 
          hasSession: !!session,
          userId: session?.user?.id 
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

        setAuthState({
          user: convertSupabaseUser(session?.user ?? null),
          session: session,
          loading: false,
        });
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signInWithPhone = async (phone: string) => {
    try {
      debugContext.auth({ step: 'signing_in_with_phone', phone });

      const { data, error } = await supabase.auth.signInWithOtp({
        phone: phone,
        options: {
          shouldCreateUser: true,
        }
      });

      if (error) {
        debugContext.error('auth', error, { step: 'sign_in_with_phone_failed', phone });
        throw error;
      }

      debugContext.auth({ step: 'sign_in_with_phone_success', phone });
      return data;
    } catch (error) {
      debugContext.error('auth', error as Error, { step: 'sign_in_with_phone_error', phone });
      throw error;
    }
  };

  const verifyOtp = async (phone: string, token: string) => {
    try {
      debugContext.auth({ step: 'verifying_otp', phone });

      const { data, error } = await supabase.auth.verifyOtp({
        phone: phone,
        token: token,
        type: 'sms'
      });

      if (error) {
        debugContext.error('auth', error, { step: 'verify_otp_failed', phone });
        throw error;
      }

      debugContext.auth({ 
        step: 'verify_otp_success', 
        phone,
        userId: data.user?.id 
      });
      
      return data;
    } catch (error) {
      debugContext.error('auth', error as Error, { step: 'verify_otp_error', phone });
      throw error;
    }
  };

  const signInWithSupabaseUser = async (userId: string) => {
    try {
      debugContext.auth({ step: 'signing_in_with_user_id', userId });

      // This is a simplified approach - in production you'd want a more secure method
      // For now, we'll create a session using the admin API response
      const { data, error } = await supabase.auth.getUser();
      
      if (error) {
        debugContext.error('auth', error, { step: 'sign_in_with_user_id_failed', userId });
        throw error;
      }

      debugContext.auth({ step: 'sign_in_with_user_id_success', userId });
      return data;
    } catch (error) {
      debugContext.error('auth', error as Error, { step: 'sign_in_with_user_id_error', userId });
      throw error;
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
    signInWithSupabaseUser,
    signOut,
  };
};
