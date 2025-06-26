import { Share } from 'react-native';
import { apiClient } from '../lib/supabase';
import { debugContext } from '../utils/logger';
import type { InvoiceWithVendor } from '@invoicepe/types';

export const useExport = () => {
  const exportLedger = async () => {
    try {
      debugContext.invoice({ step: 'exporting_ledger', action: 'start' });

      // Get invoices with all related data for CSV export
      const response = await apiClient.get('/invoices?export=csv') as { data: InvoiceWithVendor[] };
      
      if (!response.data || response.data.length === 0) {
        throw new Error('No invoices found to export');
      }

      // Generate CSV content
      const csvHeader = 'Date,Vendor,Amount,Status,Payment Method,Description,Invoice ID';
      const csvRows = response.data.map(invoice => {
        const date = new Date(invoice.created_at).toLocaleDateString('en-IN');
        const vendor = invoice.vendors?.name || 'Unknown Vendor';
        const amount = `₹${invoice.amount.toFixed(2)}`;
        const status = invoice.status.toUpperCase();
        const paymentMethod = invoice.payments?.[0]?.method?.toUpperCase() || 'PENDING';
        const description = (invoice.description || '').replace(/,/g, ';'); // Replace commas to avoid CSV issues
        const invoiceId = invoice.id.substring(0, 8); // Short ID for readability
        
        return `${date},${vendor},${amount},${status},${paymentMethod},${description},${invoiceId}`;
      }).join('\n');

      const csvContent = `${csvHeader}\n${csvRows}`;
      const timestamp = new Date().toISOString().split('T')[0];

      debugContext.invoice({ 
        step: 'csv_generated', 
        action: 'export_ledger',
        recordCount: response.data.length 
      });

      // Share CSV content
      await Share.share({
        message: csvContent,
        title: `InvoicePe Ledger Export - ${timestamp}`,
      });

      debugContext.invoice({ step: 'export_shared_successfully', action: 'export_ledger' });
    } catch (error) {
      debugContext.error('invoice', error as Error, { 
        step: 'export_failed',
        action: 'export_ledger' 
      });
      throw error;
    }
  };

  return { exportLedger };
};
