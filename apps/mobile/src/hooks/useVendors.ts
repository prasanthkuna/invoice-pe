import { useState, useEffect } from 'react';
import { apiClient } from '../lib/supabase';
import type { Vendor, VendorRequest, VendorsResponse, VendorResponse } from '@invoicepe/types';

interface VendorsState {
  vendors: Vendor[];
  loading: boolean;
  error: string | null;
}

export const useVendors = () => {
  const [state, setState] = useState<VendorsState>({
    vendors: [],
    loading: true,
    error: null,
  });

  const fetchVendors = async () => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));
      const response = await apiClient.getVendors() as VendorsResponse;
      setState({
        vendors: response.vendors,
        loading: false,
        error: null,
      });
    } catch (error) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to fetch vendors',
      }));
    }
  };

  const createVendor = async (vendorData: VendorRequest): Promise<Vendor> => {
    try {
      const response = await apiClient.createVendor(vendorData) as VendorResponse;
      setState(prev => ({
        ...prev,
        vendors: [response.vendor, ...prev.vendors],
      }));
      return response.vendor;
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Failed to create vendor');
    }
  };

  const updateVendor = async (id: string, vendorData: VendorRequest): Promise<Vendor> => {
    try {
      const response = await apiClient.updateVendor(id, vendorData) as VendorResponse;
      setState(prev => ({
        ...prev,
        vendors: prev.vendors.map(v => v.id === id ? response.vendor : v),
      }));
      return response.vendor;
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Failed to update vendor');
    }
  };

  const deleteVendor = async (id: string): Promise<void> => {
    try {
      await apiClient.deleteVendor(id);
      setState(prev => ({
        ...prev,
        vendors: prev.vendors.filter(v => v.id !== id),
      }));
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Failed to delete vendor');
    }
  };

  const searchVendors = (query: string): Vendor[] => {
    if (!query.trim()) return state.vendors;
    
    const lowercaseQuery = query.toLowerCase();
    return state.vendors.filter(vendor =>
      vendor.name.toLowerCase().includes(lowercaseQuery) ||
      vendor.vendor_categories?.name.toLowerCase().includes(lowercaseQuery) ||
      vendor.phone?.toLowerCase().includes(lowercaseQuery) ||
      vendor.upi_id?.toLowerCase().includes(lowercaseQuery)
    );
  };

  useEffect(() => {
    fetchVendors();
  }, []);

  return {
    vendors: state.vendors,
    loading: state.loading,
    error: state.error,
    createVendor,
    updateVendor,
    deleteVendor,
    searchVendors,
    refetch: fetchVendors,
  };
};
