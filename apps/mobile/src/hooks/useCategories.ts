import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { VendorCategory } from '@invoicepe/types';

interface CategoriesState {
  categories: VendorCategory[];
  loading: boolean;
  error: string | null;
}

export const useCategories = () => {
  const [state, setState] = useState<CategoriesState>({
    categories: [],
    loading: true,
    error: null,
  });

  const fetchCategories = async () => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));
      
      const { data, error } = await supabase
        .from('vendor_categories')
        .select('*')
        .order('name');

      if (error) throw error;

      setState({
        categories: data || [],
        loading: false,
        error: null,
      });
    } catch (error) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to fetch categories',
      }));
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  return {
    categories: state.categories,
    loading: state.loading,
    error: state.error,
    refetch: fetchCategories,
  };
};
