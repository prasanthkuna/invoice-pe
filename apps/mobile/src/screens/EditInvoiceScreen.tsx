import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
import {
  InputField,
  VendorPicker,
  Button,
  LoadingSpinner,
  colors,
  spacing,
  typography,
} from '@invoicepe/ui-kit';
import { useInvoices } from '../hooks/useInvoices';
import { useVendors } from '../hooks/useVendors';
import type { Vendor, InvoiceRequest, InvoiceWithVendor } from '@invoicepe/types';

interface EditInvoiceScreenProps {
  navigation: any;
  route: {
    params: {
      invoice: InvoiceWithVendor;
    };
  };
}

export const EditInvoiceScreen: React.FC<EditInvoiceScreenProps> = ({ 
  navigation, 
  route 
}) => {
  const { invoice } = route.params;
  const { updateInvoice } = useInvoices();
  const { vendors, loading: vendorsLoading } = useVendors();
  
  const [formData, setFormData] = useState<Partial<InvoiceRequest>>({
    vendor_id: invoice.vendor_id,
    amount: invoice.amount,
    description: invoice.description || '',
  });
  
  const [selectedVendor, setSelectedVendor] = useState<Vendor | undefined>();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    // Find and set the selected vendor when vendors are loaded
    if (vendors.length > 0 && invoice.vendor_id) {
      const vendor = vendors.find(v => v.id === invoice.vendor_id);
      if (vendor) {
        setSelectedVendor(vendor);
      }
    }
  }, [vendors, invoice.vendor_id]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!selectedVendor) {
      newErrors.vendor_id = 'Please select a vendor';
    }

    if (!formData.amount || formData.amount <= 0) {
      newErrors.amount = 'Amount must be greater than 0';
    }

    if (formData.amount && formData.amount > 1000000) {
      newErrors.amount = 'Amount cannot exceed ₹10,00,000';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleVendorSelect = (vendor: Vendor) => {
    setSelectedVendor(vendor);
    setFormData(prev => ({ ...prev, vendor_id: vendor.id }));
    if (errors.vendor_id) {
      setErrors(prev => ({ ...prev, vendor_id: '' }));
    }
  };

  const handleAmountChange = (text: string) => {
    // Remove any non-numeric characters except decimal point
    const cleanText = text.replace(/[^0-9.]/g, '');
    const amount = parseFloat(cleanText) || 0;
    
    setFormData(prev => ({ ...prev, amount }));
    if (errors.amount) {
      setErrors(prev => ({ ...prev, amount: '' }));
    }
  };

  const handleDescriptionChange = (text: string) => {
    setFormData(prev => ({ ...prev, description: text }));
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    try {
      await updateInvoice(invoice.id, formData);
      Alert.alert(
        'Success',
        'Invoice updated successfully',
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ]
      );
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to update invoice');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  if (vendorsLoading) {
    return (
      <View style={styles.loadingContainer}>
        <LoadingSpinner />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <Text style={styles.title}>Edit Invoice</Text>
      
      <View style={styles.originalInfo}>
        <Text style={styles.originalLabel}>Original Amount:</Text>
        <Text style={styles.originalValue}>{formatAmount(invoice.amount)}</Text>
      </View>
      
      <VendorPicker
        vendors={vendors}
        selectedVendor={selectedVendor}
        onSelect={handleVendorSelect}
        placeholder="Select vendor"
        error={errors.vendor_id}
      />

      <InputField
        label="Amount (₹)"
        value={formData.amount && formData.amount > 0 ? formData.amount.toString() : ''}
        onChangeText={handleAmountChange}
        placeholder="0.00"
        keyboardType="decimal-pad"
        error={errors.amount}
      />

      {formData.amount && formData.amount > 0 && (
        <View style={styles.amountPreview}>
          <Text style={styles.amountPreviewLabel}>Amount Preview:</Text>
          <Text style={styles.amountPreviewValue}>
            {formatAmount(formData.amount)}
          </Text>
        </View>
      )}

      <InputField
        label="Description (Optional)"
        value={formData.description}
        onChangeText={handleDescriptionChange}
        placeholder="Enter invoice description..."
        multiline
        numberOfLines={3}
        maxLength={500}
      />

      <View style={styles.actions}>
        <Button
          title="Cancel"
          variant="secondary"
          onPress={() => navigation.goBack()}
          disabled={isSubmitting}
        />
        <Button
          title={isSubmitting ? 'Updating...' : 'Update Invoice'}
          onPress={handleSubmit}
          disabled={isSubmitting}
        />
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.grey[900],
    padding: spacing.md,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.grey[900],
  },
  title: {
    ...typography.h1,
    color: colors.white,
    marginBottom: spacing.lg,
  },
  originalInfo: {
    backgroundColor: colors.grey[800],
    padding: spacing.md,
    borderRadius: 8,
    marginBottom: spacing.lg,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  originalLabel: {
    ...typography.body,
    color: colors.grey[400],
  },
  originalValue: {
    ...typography.h3,
    color: colors.primary[400],
    fontWeight: '600',
  },
  amountPreview: {
    backgroundColor: colors.grey[800],
    padding: spacing.md,
    borderRadius: 8,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.primary[500],
  },
  amountPreviewLabel: {
    ...typography.caption,
    color: colors.grey[400],
    marginBottom: spacing.xs,
  },
  amountPreviewValue: {
    ...typography.h2,
    color: colors.primary[400],
    fontWeight: '700',
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.xl,
    marginBottom: spacing.xl,
  },
});
