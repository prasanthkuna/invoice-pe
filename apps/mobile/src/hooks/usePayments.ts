import { useState, useEffect } from 'react';
import { apiClient } from '../lib/supabase';
import type {
  PaymentRequest,
  PaymentResponse,
  PaymentStatusResponse,
  PaymentsResponse,
  PaymentWithInvoice
} from '@invoicepe/types';

interface PaymentsState {
  payments: PaymentWithInvoice[];
  loading: boolean;
  error: string | null;
}

export const usePayments = () => {
  const [state, setState] = useState<PaymentsState>({
    payments: [],
    loading: true,
    error: null,
  });

  const fetchPayments = async () => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));
      const response = await apiClient.getPayments() as PaymentsResponse;
      setState({
        payments: response.payments,
        loading: false,
        error: null,
      });
    } catch (error) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to fetch payments',
      }));
    }
  };

  useEffect(() => {
    fetchPayments();
  }, []);

  const initiatePayment = async (paymentData: PaymentRequest): Promise<PaymentResponse> => {
    try {
      const response = await apiClient.initiatePayment(paymentData) as PaymentResponse;
      
      // Add the new payment to the state
      if (response.payment) {
        setState(prev => ({
          ...prev,
          payments: [response.payment, ...prev.payments],
        }));
      }
      
      return response;
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Failed to initiate payment');
    }
  };

  const checkPaymentStatus = async (paymentId: string): Promise<PaymentWithInvoice> => {
    try {
      const response = await apiClient.getPaymentStatus(paymentId) as PaymentStatusResponse;
      
      // Update the payment in state
      setState(prev => ({
        ...prev,
        payments: prev.payments.map(p => p.id === paymentId ? response.payment : p),
      }));
      
      return response.payment;
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Failed to check payment status');
    }
  };

  const getPaymentById = (id: string): PaymentWithInvoice | undefined => {
    return state.payments.find(payment => payment.id === id);
  };

  const getPaymentsByStatus = (status: 'initiated' | 'succeeded' | 'failed'): PaymentWithInvoice[] => {
    return state.payments.filter(payment => payment.status === status);
  };

  const getPaymentsByInvoice = (invoiceId: string): PaymentWithInvoice[] => {
    return state.payments.filter(payment => payment.invoice_id === invoiceId);
  };

  const getTotalPaidAmount = (): number => {
    return state.payments
      .filter(payment => payment.status === 'succeeded')
      .reduce((total, payment) => {
        return total + (payment.invoices?.amount || 0);
      }, 0);
  };

  const getTotalPendingAmount = (): number => {
    return state.payments
      .filter(payment => payment.status === 'initiated')
      .reduce((total, payment) => {
        return total + (payment.invoices?.amount || 0);
      }, 0);
  };

  const getPaymentStats = () => {
    const totalPayments = state.payments.length;
    const successfulPayments = state.payments.filter(p => p.status === 'succeeded').length;
    const failedPayments = state.payments.filter(p => p.status === 'failed').length;
    const pendingPayments = state.payments.filter(p => p.status === 'initiated').length;
    
    return {
      total: totalPayments,
      successful: successfulPayments,
      failed: failedPayments,
      pending: pendingPayments,
      successRate: totalPayments > 0 ? (successfulPayments / totalPayments) * 100 : 0,
      totalPaidAmount: getTotalPaidAmount(),
      totalPendingAmount: getTotalPendingAmount(),
    };
  };

  const refreshPaymentStatus = async (paymentId: string): Promise<void> => {
    try {
      await checkPaymentStatus(paymentId);
    } catch (error) {
      // Log error for debugging
      console.error('Failed to refresh payment status:', error);
      throw error;
    }
  };

  const refreshAllPayments = async (): Promise<void> => {
    await fetchPayments();
  };

  return {
    ...state,
    fetchPayments,
    initiatePayment,
    checkPaymentStatus,
    getPaymentById,
    getPaymentsByStatus,
    getPaymentsByInvoice,
    getTotalPaidAmount,
    getTotalPendingAmount,
    getPaymentStats,
    refreshPaymentStatus,
    refreshAllPayments,
  };
};
