import { useState, useEffect } from 'react';
import { Platform } from 'react-native';
import { debugContext } from '../utils/logger';
import { apiClient, supabase } from '../lib/supabase';
import type { User } from '@invoicepe/types';

// Platform-specific import for MSG91 widget
let OTPWidget: any = null;
if (Platform.OS !== 'web') {
  try {
    const msg91Module = require('@msg91comm/sendotp-react-native');
    OTPWidget = msg91Module.OTPWidget;
  } catch (error) {
    debugContext.error('auth', error as Error, { step: 'load_msg91_module' });
  }
}

interface AuthState {
  user: User | null;
  loading: boolean;
}

interface MSG91SendResponse {
  type: string;
  message: string;
  data?: {
    request_id?: string;
  };
}

interface MSG91VerifyResponse {
  type: string;
  message: string;
  data?: {
    access_token?: string;
    mobile?: string;
  };
}

interface AuthVerifyResponse {
  success: boolean;
  user: {
    id: string;
    phone: string;
    email?: string;
    user_metadata?: any;
  };
  supabase_user_id: string;
}

// MSG91 Widget Configuration
const WIDGET_ID = '35666f6e6358353331353036';
const TOKEN_AUTH = '456240T3HpQIWFmjy684ed6d6P1';

export const useAuthWidget = () => {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    loading: true,
  });
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    initializeWidget();
  }, []);

  const initializeWidget = async () => {
    try {
      if (Platform.OS === 'web') {
        debugContext.auth({ step: 'web_platform_detected', message: 'Skipping MSG91 widget initialization' });
        setInitialized(true);
        setAuthState(prev => ({ ...prev, loading: false }));
        return;
      }

      if (!OTPWidget) {
        throw new Error('MSG91 Widget not available');
      }

      debugContext.auth({ step: 'initializing_widget', widgetId: WIDGET_ID });
      await OTPWidget.initializeWidget(WIDGET_ID, TOKEN_AUTH);
      setInitialized(true);
      setAuthState(prev => ({ ...prev, loading: false }));
      debugContext.auth({ step: 'widget_initialized', success: true });
    } catch (error) {
      debugContext.error('auth', error as Error, { step: 'initialize_widget_failed' });
      setAuthState(prev => ({ ...prev, loading: false }));
    }
  };

  const sendOTP = async (phone: string): Promise<{ success: boolean; message: string }> => {
    try {
      if (!initialized) {
        throw new Error('Widget not initialized');
      }

      if (Platform.OS === 'web') {
        debugContext.auth({ step: 'web_otp_send', phone });
        return {
          success: true,
          message: 'OTP sent successfully (Web simulation)'
        };
      }

      if (!OTPWidget) {
        throw new Error('MSG91 Widget not available');
      }

      debugContext.auth({ step: 'sending_otp', phone });

      // Format phone number with country code
      const formattedPhone = phone.startsWith('91') ? phone : `91${phone}`;

      const response: MSG91SendResponse = await OTPWidget.sendOTP({
        identifier: formattedPhone
      });

      debugContext.auth({
        step: 'otp_sent',
        phone,
        success: response.type === 'success',
        message: response.message
      });

      if (response.type === 'success') {
        return {
          success: true,
          message: response.message || 'OTP sent successfully'
        };
      } else {
        throw new Error(response.message || 'Failed to send OTP');
      }
    } catch (error) {
      debugContext.error('auth', error as Error, { step: 'send_otp_failed', phone });
      throw new Error(error instanceof Error ? error.message : 'Failed to send OTP');
    }
  };

  const verifyOTP = async (phone: string, otp: string): Promise<void> => {
    try {
      if (!initialized) {
        throw new Error('Widget not initialized');
      }

      if (Platform.OS === 'web') {
        debugContext.auth({ step: 'web_otp_verify', phone, otp });
        if (otp === '123456') {
          // Create a simple user object for web testing
          const user: User = {
            id: `user_${phone}`,
            phone: phone,
            business_name: 'My Business',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };

          setAuthState({
            user,
            loading: false,
          });

          debugContext.auth({ step: 'web_otp_verified', phone, userId: user.id, success: true });
          return;
        } else {
          throw new Error('Invalid OTP (use 123456 for web testing)');
        }
      }

      if (!OTPWidget) {
        throw new Error('MSG91 Widget not available');
      }

      setAuthState(prev => ({ ...prev, loading: true }));
      debugContext.auth({ step: 'verifying_otp', phone });

      // Format phone number with country code
      const formattedPhone = phone.startsWith('91') ? phone : `91${phone}`;

      // Step 1: Verify OTP with MSG91 Widget
      const response: MSG91VerifyResponse = await OTPWidget.verifyOTP({
        identifier: formattedPhone,
        otp: otp
      });

      debugContext.auth({
        step: 'otp_verified',
        phone,
        success: response.type === 'success',
        hasAccessToken: !!response.data?.access_token
      });

      if (response.type !== 'success') {
        throw new Error(response.message || 'OTP verification failed');
      }

      // Step 2: Extract access token from MSG91 response
      const accessToken = response.data?.access_token;
      if (!accessToken) {
        throw new Error('No access token received from MSG91');
      }

      debugContext.auth({
        step: 'access_token_received',
        phone,
        tokenLength: accessToken.length
      });

      // Step 3: Verify access token with backend
      const authResponse = await apiClient.post<AuthVerifyResponse>('/auth-verify-msg91', {
        accessToken
      });

      if (!authResponse.success || !authResponse.user || !authResponse.supabase_user_id) {
        throw new Error('Backend authentication failed');
      }

      debugContext.auth({
        step: 'backend_auth_success',
        userId: authResponse.user.id,
        phone: authResponse.user.phone
      });

      // Step 4: Create Supabase session using phone auth
      const { data: authData, error: supabaseError } = await supabase.auth.signInWithOtp({
        phone: phone.startsWith('91') ? phone : `91${phone}`,
        options: {
          shouldCreateUser: false, // User already created by backend
        }
      });

      if (supabaseError) {
        debugContext.error('auth', supabaseError, { step: 'supabase_signin_failed' });
        // Fallback: create a user object for the app state
        const user: User = {
          id: authResponse.user.id,
          phone: authResponse.user.phone,
          business_name: undefined,
          gstin: undefined,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        setAuthState({
          user,
          loading: false
        });
      } else {
        debugContext.auth({ step: 'supabase_signin_success', userId: authResponse.user.id });
        // Supabase will handle the session via onAuthStateChange
        setAuthState(prev => ({ ...prev, loading: false }));
      }

      debugContext.auth({ step: 'auth_complete', userId: authResponse.user.id });
    } catch (error) {
      debugContext.error('auth', error as Error, { step: 'verify_otp_failed', phone });
      setAuthState(prev => ({ ...prev, loading: false }));
      throw new Error(error instanceof Error ? error.message : 'Failed to verify OTP');
    }
  };

  const logout = async () => {
    setAuthState({
      user: null,
      loading: false,
    });
    debugContext.auth({ step: 'user_logout', success: true });
  };

  return {
    user: authState.user,
    loading: authState.loading,
    isAuthenticated: !!authState.user,
    sendOTP,
    verifyOTP,
    logout,
  };
};
