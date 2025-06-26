import { createClient } from '@supabase/supabase-js';
import { logger, generateRequestId } from '../utils/logger';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'your-anon-key';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// API client for Edge Functions with enhanced logging
export class ApiClient {
  private baseUrl: string;
  private anonKey: string;
  private token?: string;
  private retryAttempts = 3;
  private retryDelay = 1000; // 1 second

  constructor() {
    this.baseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';
    this.anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';
    logger.info('ApiClient initialized', { baseUrl: this.baseUrl });
  }

  setToken(token: string) {
    this.token = token;
    logger.debug('API token updated');
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
    context?: { screen?: string; action?: string }
  ): Promise<T> {
    const requestId = generateRequestId();
    const url = `${this.baseUrl}/functions/v1/${endpoint}`;
    const method = options.method || 'GET';
    const startTime = Date.now();

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Request-ID': requestId,
      'apikey': this.anonKey,
      'Authorization': `Bearer ${this.token || this.anonKey}`,
      ...(options.headers as Record<string, string>),
    };

    const logContext = {
      requestId,
      ...context,
    };

    logger.apiRequest(method, endpoint);

    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
      try {
        const response = await fetch(url, {
          ...options,
          headers,
        });

        const duration = Date.now() - startTime;
        logger.apiResponse(method, endpoint, response.status, duration);

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: 'Network error' }));
          const error = new Error(errorData.error || 'Request failed');

          // Don't retry client errors (4xx)
          if (response.status >= 400 && response.status < 500) {
            logger.apiError(method, endpoint, error);
            throw error;
          }

          // Retry server errors (5xx)
          if (attempt < this.retryAttempts) {
            logger.warn(`Request failed, retrying (${attempt}/${this.retryAttempts})`, {
              ...logContext,
              status: response.status,
              error: error.message,
            });
            await this.delay(this.retryDelay * attempt);
            continue;
          }

          logger.apiError(method, endpoint, error);
          throw error;
        }

        const data = await response.json();
        logger.debug('API request successful', { ...logContext, responseSize: JSON.stringify(data).length });
        return data;

      } catch (error) {
        lastError = error as Error;

        // Network errors - retry
        if (attempt < this.retryAttempts && this.isNetworkError(error as Error)) {
          logger.warn(`Network error, retrying (${attempt}/${this.retryAttempts})`, {
            ...logContext,
            error: (error as Error).message,
          });
          await this.delay(this.retryDelay * attempt);
          continue;
        }

        // Final attempt or non-retryable error
        logger.apiError(method, endpoint, error as Error);
        throw error;
      }
    }

    // This should never be reached, but just in case
    throw lastError || new Error('Request failed after all retries');
  }

  private isNetworkError(error: Error): boolean {
    return error.message.includes('Network request failed') ||
           error.message.includes('fetch') ||
           error.name === 'TypeError';
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }



  async getVendors(context?: { screen?: string }) {
    return this.request('vendors', {
      method: 'GET',
    }, { ...context, action: 'get_vendors' });
  }

  async createVendor(vendor: any, context?: { screen?: string }) {
    return this.request('vendors', {
      method: 'POST',
      body: JSON.stringify(vendor),
    }, { ...context, action: 'create_vendor' });
  }

  async updateVendor(id: string, vendor: any, context?: { screen?: string }) {
    return this.request(`vendors/${id}`, {
      method: 'PUT',
      body: JSON.stringify(vendor),
    }, { ...context, action: 'update_vendor' });
  }

  async deleteVendor(id: string, context?: { screen?: string }) {
    return this.request(`vendors/${id}`, {
      method: 'DELETE',
    }, { ...context, action: 'delete_vendor' });
  }

  // Invoice methods
  async getInvoices() {
    return this.request('invoices', {
      method: 'GET',
    });
  }

  async getInvoice(id: string) {
    return this.request(`invoices/${id}`, {
      method: 'GET',
    });
  }

  async createInvoice(invoice: any) {
    return this.request('invoices', {
      method: 'POST',
      body: JSON.stringify(invoice),
    });
  }

  async updateInvoice(id: string, invoice: any) {
    return this.request(`invoices/${id}`, {
      method: 'PUT',
      body: JSON.stringify(invoice),
    });
  }

  async deleteInvoice(id: string) {
    return this.request(`invoices/${id}`, {
      method: 'DELETE',
    });
  }

  // Payment methods
  async initiatePayment(payment: any) {
    return this.request('payment-intent', {
      method: 'POST',
      body: JSON.stringify(payment),
    });
  }

  async getPayments() {
    return this.request('payment-status', {
      method: 'GET',
    });
  }

  async getPaymentStatus(id: string) {
    return this.request(`payment-status/${id}`, {
      method: 'GET',
    });
  }

  // Generic HTTP methods
  async get<T>(endpoint: string, context?: { screen?: string }): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'GET',
    }, context);
  }

  async post<T>(endpoint: string, data?: any, context?: { screen?: string }): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    }, context);
  }

  async put<T>(endpoint: string, data?: any, context?: { screen?: string }): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    }, context);
  }

  async delete<T>(endpoint: string, context?: { screen?: string }): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'DELETE',
    }, context);
  }
}

export const apiClient = new ApiClient();

// Legacy export for backward compatibility
export const supabaseService = apiClient;
