import { supabase } from '../lib/supabase';
import { debugContext } from './logger';

/**
 * Authentication Test Utilities
 * 
 * Comprehensive testing utilities for Supabase phone authentication
 * Includes session validation, user creation verification, and flow testing
 */

interface AuthTestResult {
  success: boolean;
  message: string;
  details?: any;
  errors?: string[];
}

interface UserTestResult extends AuthTestResult {
  user?: any;
  customUser?: any;
}

/**
 * Test phone number formatting
 */
export const testPhoneFormatting = (phone: string): AuthTestResult => {
  try {
    const errors: string[] = [];
    
    // Test Indian phone number validation
    if (!phone || phone.length !== 10) {
      errors.push('Phone number must be 10 digits');
    }
    
    if (!/^[6-9]\d{9}$/.test(phone)) {
      errors.push('Phone number must start with 6-9 and contain only digits');
    }
    
    // Test formatting
    const formattedPhone = phone.startsWith('+') ? phone : `+91${phone.replace(/^0+/, '')}`;
    
    if (!formattedPhone.startsWith('+91')) {
      errors.push('Formatted phone number must start with +91');
    }
    
    if (formattedPhone.length !== 13) {
      errors.push('Formatted phone number must be 13 characters (+91xxxxxxxxxx)');
    }
    
    return {
      success: errors.length === 0,
      message: errors.length === 0 ? 'Phone formatting valid' : 'Phone formatting invalid',
      details: { original: phone, formatted: formattedPhone },
      errors: errors.length > 0 ? errors : undefined
    };
  } catch (error) {
    return {
      success: false,
      message: 'Phone formatting test failed',
      errors: [error instanceof Error ? error.message : 'Unknown error']
    };
  }
};

/**
 * Test Supabase connection and configuration
 */
export const testSupabaseConnection = async (): Promise<AuthTestResult> => {
  try {
    debugContext.info('auth_test', { step: 'testing_supabase_connection' });
    
    // Test basic connection
    const { data, error } = await supabase.from('users').select('count').limit(1);
    
    if (error) {
      return {
        success: false,
        message: 'Supabase connection failed',
        errors: [error.message]
      };
    }
    
    // Test auth configuration
    const { data: session } = await supabase.auth.getSession();
    
    return {
      success: true,
      message: 'Supabase connection successful',
      details: {
        connected: true,
        hasSession: !!session.session,
        userId: session.session?.user?.id
      }
    };
  } catch (error) {
    return {
      success: false,
      message: 'Supabase connection test failed',
      errors: [error instanceof Error ? error.message : 'Unknown error']
    };
  }
};

/**
 * Test user creation in custom users table
 */
export const testUserCreation = async (userId: string, phone: string): Promise<UserTestResult> => {
  try {
    debugContext.info('auth_test', { step: 'testing_user_creation', userId });
    
    // Check if user exists in auth.users (Supabase Auth)
    const { data: authUser, error: authError } = await supabase.auth.getUser();
    
    if (authError) {
      return {
        success: false,
        message: 'Failed to get auth user',
        errors: [authError.message]
      };
    }
    
    // Check if user exists in custom users table
    const { data: customUser, error: customError } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();
    
    const hasCustomUser = !customError && customUser;
    
    return {
      success: !!authUser && hasCustomUser,
      message: hasCustomUser ? 'User creation successful' : 'User creation incomplete',
      user: authUser,
      customUser: customUser,
      details: {
        hasAuthUser: !!authUser,
        hasCustomUser: hasCustomUser,
        phoneMatch: customUser?.phone === phone
      },
      errors: customError ? [customError.message] : undefined
    };
  } catch (error) {
    return {
      success: false,
      message: 'User creation test failed',
      errors: [error instanceof Error ? error.message : 'Unknown error']
    };
  }
};

/**
 * Test session persistence
 */
export const testSessionPersistence = async (): Promise<AuthTestResult> => {
  try {
    debugContext.info('auth_test', { step: 'testing_session_persistence' });
    
    // Get current session
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      return {
        success: false,
        message: 'Failed to get session',
        errors: [sessionError.message]
      };
    }
    
    const session = sessionData.session;
    
    if (!session) {
      return {
        success: false,
        message: 'No active session found',
        errors: ['User not authenticated']
      };
    }
    
    // Check session validity
    const now = Date.now() / 1000;
    const expiresAt = session.expires_at || 0;
    const isExpired = now > expiresAt;
    
    // Check if session can be refreshed
    const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
    
    return {
      success: !isExpired && !refreshError,
      message: isExpired ? 'Session expired' : refreshError ? 'Session refresh failed' : 'Session valid',
      details: {
        hasSession: !!session,
        isExpired,
        expiresAt: new Date(expiresAt * 1000).toISOString(),
        canRefresh: !refreshError,
        userId: session.user?.id
      },
      errors: refreshError ? [refreshError.message] : undefined
    };
  } catch (error) {
    return {
      success: false,
      message: 'Session persistence test failed',
      errors: [error instanceof Error ? error.message : 'Unknown error']
    };
  }
};

/**
 * Test RLS (Row Level Security) policies
 */
export const testRLSPolicies = async (): Promise<AuthTestResult> => {
  try {
    debugContext.info('auth_test', { step: 'testing_rls_policies' });
    
    // Test if user can only access their own data
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*');
    
    if (userError) {
      return {
        success: false,
        message: 'RLS test failed - cannot access users table',
        errors: [userError.message]
      };
    }
    
    // Test if user can access invoices (should only see their own)
    const { data: invoiceData, error: invoiceError } = await supabase
      .from('invoices')
      .select('*')
      .limit(1);
    
    // This should not error even if no invoices exist
    const rlsWorking = !invoiceError || invoiceError.code === 'PGRST116';
    
    return {
      success: rlsWorking,
      message: rlsWorking ? 'RLS policies working correctly' : 'RLS policies may have issues',
      details: {
        canAccessUsers: !userError,
        canAccessInvoices: !invoiceError,
        userCount: userData?.length || 0
      },
      errors: !rlsWorking && invoiceError ? [invoiceError.message] : undefined
    };
  } catch (error) {
    return {
      success: false,
      message: 'RLS test failed',
      errors: [error instanceof Error ? error.message : 'Unknown error']
    };
  }
};

/**
 * Comprehensive authentication flow test
 */
export const runAuthFlowTest = async (phone: string): Promise<AuthTestResult> => {
  try {
    debugContext.info('auth_test', { step: 'running_comprehensive_auth_test', phone: phone.slice(-4) });
    
    const results: AuthTestResult[] = [];
    const errors: string[] = [];
    
    // Test 1: Phone formatting
    const phoneTest = testPhoneFormatting(phone);
    results.push(phoneTest);
    if (!phoneTest.success) {
      errors.push(`Phone formatting: ${phoneTest.message}`);
    }
    
    // Test 2: Supabase connection
    const connectionTest = await testSupabaseConnection();
    results.push(connectionTest);
    if (!connectionTest.success) {
      errors.push(`Connection: ${connectionTest.message}`);
    }
    
    // Test 3: Session persistence (if authenticated)
    const sessionTest = await testSessionPersistence();
    results.push(sessionTest);
    if (!sessionTest.success) {
      errors.push(`Session: ${sessionTest.message}`);
    }
    
    // Test 4: RLS policies (if authenticated)
    if (sessionTest.success) {
      const rlsTest = await testRLSPolicies();
      results.push(rlsTest);
      if (!rlsTest.success) {
        errors.push(`RLS: ${rlsTest.message}`);
      }
    }
    
    const overallSuccess = results.every(r => r.success);
    
    return {
      success: overallSuccess,
      message: overallSuccess ? 'All authentication tests passed' : 'Some authentication tests failed',
      details: {
        testResults: results,
        passedTests: results.filter(r => r.success).length,
        totalTests: results.length
      },
      errors: errors.length > 0 ? errors : undefined
    };
  } catch (error) {
    return {
      success: false,
      message: 'Comprehensive auth test failed',
      errors: [error instanceof Error ? error.message : 'Unknown error']
    };
  }
};

/**
 * Quick auth status check
 */
export const getAuthStatus = async (): Promise<{
  isAuthenticated: boolean;
  user: any;
  session: any;
  customUser: any;
}> => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user;
    
    let customUser = null;
    if (user) {
      const { data } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single();
      customUser = data;
    }
    
    return {
      isAuthenticated: !!user,
      user,
      session,
      customUser
    };
  } catch (error) {
    debugContext.error('auth_test', error as Error, { step: 'get_auth_status_failed' });
    return {
      isAuthenticated: false,
      user: null,
      session: null,
      customUser: null
    };
  }
};
