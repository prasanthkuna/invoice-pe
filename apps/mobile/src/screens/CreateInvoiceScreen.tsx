import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, Image, Modal } from 'react-native';
import {
  InputField,
  VendorPicker,
  Button,
  LoadingSpinner,
  Card,
  colors,
  spacing,
  typography,
} from '@invoicepe/ui-kit';
import { useInvoices } from '../hooks/useInvoices';
import { useVendors } from '../hooks/useVendors';
import { CameraCapture } from '../components/CameraCapture';
import { FadeInView, SlideInView, AnimatedButton } from '../components/animations';
import type { Vendor, InvoiceRequest } from '@invoicepe/types';

interface CreateInvoiceScreenProps {
  navigation: any;
}

export const CreateInvoiceScreen: React.FC<CreateInvoiceScreenProps> = ({ navigation }) => {
  const { createInvoice } = useInvoices();
  const { vendors, loading: vendorsLoading } = useVendors();
  
  const [formData, setFormData] = useState<InvoiceRequest>({
    vendor_id: '',
    amount: 0,
    description: '',
  });

  const [selectedVendor, setSelectedVendor] = useState<Vendor | undefined>();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!selectedVendor) {
      newErrors.vendor_id = 'Please select a vendor';
    }

    if (!formData.amount || formData.amount <= 0) {
      newErrors.amount = 'Amount must be greater than 0';
    }

    if (formData.amount > 1000000) {
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

  const handleImageCaptured = (uri: string) => {
    setCapturedImage(uri);
    setShowCamera(false);
    // Here you could add OCR processing to extract invoice data
    Alert.alert(
      'Photo Captured',
      'Invoice photo captured successfully! You can now fill in the details manually or use OCR processing.',
      [{ text: 'OK' }]
    );
  };

  const handleRemoveImage = () => {
    Alert.alert(
      'Remove Photo',
      'Are you sure you want to remove the captured photo?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => setCapturedImage(null)
        }
      ]
    );
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    try {
      await createInvoice(formData);
      Alert.alert(
        'Success',
        'Invoice created successfully',
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ]
      );
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to create invoice');
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
    <>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <FadeInView>
          <Text style={styles.title}>Create Invoice</Text>
        </FadeInView>

        {/* Photo Capture Section */}
        <SlideInView delay={100} direction="up">
          <Card padding="md" variant="outlined" style={styles.photoSection}>
            <Text style={styles.sectionTitle}>📸 Invoice Photo</Text>
            {capturedImage ? (
              <View style={styles.imageContainer}>
                <Image source={{ uri: capturedImage }} style={styles.capturedImage} />
                <View style={styles.imageActions}>
                  <Button
                    title="Retake Photo"
                    variant="secondary"
                    size="sm"
                    onPress={() => setShowCamera(true)}
                  />
                  <Button
                    title="Remove"
                    variant="ghost"
                    size="sm"
                    onPress={handleRemoveImage}
                  />
                </View>
              </View>
            ) : (
              <View style={styles.photoPlaceholder}>
                <Text style={styles.photoPlaceholderText}>
                  Capture invoice photo for quick data entry
                </Text>
                <Button
                  title="📷 Take Photo"
                  onPress={() => setShowCamera(true)}
                  size="sm"
                />
              </View>
            )}
          </Card>
        </SlideInView>

        <SlideInView delay={200} direction="up">
          <VendorPicker
            vendors={vendors}
            selectedVendor={selectedVendor}
            onSelect={handleVendorSelect}
            placeholder="Select vendor"
            error={errors.vendor_id}
          />
        </SlideInView>

        <SlideInView delay={300} direction="up">
          <InputField
            label="Amount (₹)"
            value={formData.amount > 0 ? formData.amount.toString() : ''}
            onChangeText={handleAmountChange}
            placeholder="0.00"
            keyboardType="decimal-pad"
            error={errors.amount}
          />
        </SlideInView>

        {formData.amount > 0 && (
          <FadeInView delay={400}>
            <View style={styles.amountPreview}>
              <Text style={styles.amountPreviewLabel}>Amount Preview:</Text>
              <Text style={styles.amountPreviewValue}>
                {formatAmount(formData.amount)}
              </Text>
            </View>
          </FadeInView>
        )}

        <SlideInView delay={500} direction="up">
          <InputField
            label="Description (Optional)"
            value={formData.description}
            onChangeText={handleDescriptionChange}
            placeholder="Enter invoice description..."
            multiline
            numberOfLines={3}
            maxLength={500}
          />
        </SlideInView>

        <SlideInView delay={600} direction="up">
          <View style={styles.actions}>
            <Button
              title="Cancel"
              variant="secondary"
              onPress={() => navigation.goBack()}
              disabled={isSubmitting}
            />
            <Button
              title={isSubmitting ? 'Creating...' : 'Create Invoice'}
              onPress={handleSubmit}
              disabled={isSubmitting}
              loading={isSubmitting}
            />
          </View>
        </SlideInView>
      </ScrollView>

      {/* Camera Modal */}
      <Modal
        visible={showCamera}
        animationType="slide"
        presentationStyle="fullScreen"
      >
        <CameraCapture
          onImageCaptured={handleImageCaptured}
          onClose={() => setShowCamera(false)}
        />
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: spacing.md,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  title: {
    ...typography.h1,
    color: colors.text,
    marginBottom: spacing.lg,
  },
  photoSection: {
    marginBottom: spacing.md,
  },
  sectionTitle: {
    ...typography.h3,
    color: colors.text,
    marginBottom: spacing.md,
  },
  photoPlaceholder: {
    alignItems: 'center',
    padding: spacing.lg,
    borderWidth: 2,
    borderColor: colors.border,
    borderStyle: 'dashed',
    borderRadius: 12,
    backgroundColor: colors.background,
  },
  photoPlaceholderText: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  imageContainer: {
    alignItems: 'center',
  },
  capturedImage: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    marginBottom: spacing.md,
  },
  imageActions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  amountPreview: {
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: 12,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.primary[500],
  },
  amountPreviewLabel: {
    ...typography.caption,
    color: colors.textSecondary,
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
