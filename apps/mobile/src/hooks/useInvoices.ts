import { useState, useEffect } from 'react';
import { apiClient } from '../lib/supabase';
import type { InvoiceRequest, InvoicesResponse, InvoiceResponse, InvoiceWithVendor } from '@invoicepe/types';

interface InvoicesState {
  invoices: InvoiceWithVendor[];
  loading: boolean;
  error: string | null;
}

export const useInvoices = () => {
  const [state, setState] = useState<InvoicesState>({
    invoices: [],
    loading: true,
    error: null,
  });

  const fetchInvoices = async () => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));
      const response = await apiClient.getInvoices() as InvoicesResponse;
      setState({
        invoices: response.invoices,
        loading: false,
        error: null,
      });
    } catch (error) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to fetch invoices',
      }));
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, []);

  const createInvoice = async (invoiceData: InvoiceRequest): Promise<InvoiceWithVendor> => {
    try {
      const response = await apiClient.createInvoice(invoiceData) as InvoiceResponse;
      setState(prev => ({
        ...prev,
        invoices: [response.invoice, ...prev.invoices],
      }));
      return response.invoice;
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Failed to create invoice');
    }
  };

  const updateInvoice = async (id: string, invoiceData: Partial<InvoiceRequest>): Promise<InvoiceWithVendor> => {
    try {
      const response = await apiClient.updateInvoice(id, invoiceData) as InvoiceResponse;
      setState(prev => ({
        ...prev,
        invoices: prev.invoices.map(i => i.id === id ? response.invoice : i),
      }));
      return response.invoice;
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Failed to update invoice');
    }
  };

  const deleteInvoice = async (id: string): Promise<void> => {
    try {
      await apiClient.deleteInvoice(id);
      setState(prev => ({
        ...prev,
        invoices: prev.invoices.filter(i => i.id !== id),
      }));
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Failed to delete invoice');
    }
  };

  const getInvoiceById = (id: string): InvoiceWithVendor | undefined => {
    return state.invoices.find(invoice => invoice.id === id);
  };

  const getInvoicesByStatus = (status: 'pending' | 'paid' | 'failed'): InvoiceWithVendor[] => {
    return state.invoices.filter(invoice => invoice.status === status);
  };

  const getInvoicesByVendor = (vendorId: string): InvoiceWithVendor[] => {
    return state.invoices.filter(invoice => invoice.vendor_id === vendorId);
  };

  const getTotalAmount = (): number => {
    return state.invoices.reduce((total, invoice) => total + invoice.amount, 0);
  };

  const getTotalAmountByStatus = (status: 'pending' | 'paid' | 'failed'): number => {
    return state.invoices
      .filter(invoice => invoice.status === status)
      .reduce((total, invoice) => total + invoice.amount, 0);
  };

  return {
    ...state,
    fetchInvoices,
    createInvoice,
    updateInvoice,
    deleteInvoice,
    getInvoiceById,
    getInvoicesByStatus,
    getInvoicesByVendor,
    getTotalAmount,
    getTotalAmountByStatus,
  };
};
