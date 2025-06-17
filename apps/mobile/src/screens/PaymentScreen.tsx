import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, Linking } from 'react-native';
import {
  Card,
  Button,
  InputField,
  PaymentMethodPicker,
  LoadingSpinner,
  colors,
  spacing,
  typography,
} from '@invoicepe/ui-kit';
import { usePayments } from '../hooks/usePayments';
import { useSupabaseAuth } from '../hooks/useSupabaseAuth';
import { useNotificationPermissions } from '../hooks/useNotificationPermissions';
import { useSavedCards } from '../hooks/useSavedCards';
import { SuccessAnimation } from '../components/animations/SuccessAnimation';
import { FadeInView } from '../components/animations/FadeInView';
import { SlideInView } from '../components/animations/SlideInView';
import { AnimatedButton } from '../components/animations/AnimatedButton';
import { SavedCardPicker } from '../components/SavedCardPicker';
import type { InvoiceWithVendor, PaymentMethod, SavedCard } from '@invoicepe/types';

interface PaymentScreenProps {
  navigation: any;
  route: {
    params: {
      invoice: InvoiceWithVendor;
    };
  };
}

export const PaymentScreen: React.FC<PaymentScreenProps> = ({ 
  navigation, 
  route 
}) => {
  const { invoice } = route.params;
  const { initiatePayment } = usePayments();
  const { user } = useSupabaseAuth();
  const { requestNotificationPermission, schedulePaymentNotification } = useNotificationPermissions();
  const { hasCards } = useSavedCards();

  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | undefined>();
  const [selectedCard, setSelectedCard] = useState<SavedCard | null>(null);
  const [mobileNumber, setMobileNumber] = useState(user?.phone || '');
  const [isProcessing, setIsProcessing] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showSuccess, setShowSuccess] = useState(false);
  const [saveNewCard, setSaveNewCard] = useState(false);

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!selectedMethod) {
      newErrors.method = 'Please select a payment method';
    }

    if (selectedMethod === 'saved_card' && !selectedCard) {
      newErrors.method = 'Please select a saved card';
    }

    if (!mobileNumber || mobileNumber.length < 10) {
      newErrors.mobile = 'Please enter a valid 10-digit mobile number';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handlePayment = async () => {
    if (!validateForm() || !selectedMethod) {
      return;
    }

    setIsProcessing(true);
    try {
      const response = await initiatePayment({
        invoice_id: invoice.id,
        method: selectedMethod,
        mobile_number: mobileNumber.replace(/\D/g, ''), // Remove non-digits
        return_url: 'invoicepe://payment-callback',
        saved_card_id: selectedCard?.id,
        save_card: saveNewCard,
      });

      if (response.success && response.payment_url) {
        // Request notification permission for payment updates
        await requestNotificationPermission();

        // Schedule a notification for payment status
        await schedulePaymentNotification(
          'Payment Initiated',
          `Payment of ${formatAmount(invoice.amount)} for ${invoice.vendors?.name || 'vendor'} has been initiated.`,
          { paymentId: response.payment?.id, invoiceId: invoice.id }
        );

        // Show success animation
        setShowSuccess(true);

        // Open PhonePe payment page after animation
        setTimeout(async () => {
          const canOpen = await Linking.canOpenURL(response.payment_url!);
          if (canOpen) {
            await Linking.openURL(response.payment_url!);

            // Navigate to payment status screen
            navigation.replace('PaymentStatus', {
              payment: response.payment,
              invoice,
            });
          } else {
            Alert.alert('Error', 'Unable to open payment page');
          }
        }, 1500);
      } else {
        Alert.alert('Payment Failed', response.message || 'Failed to initiate payment');
      }
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to process payment');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCancel = () => {
    Alert.alert(
      'Cancel Payment',
      'Are you sure you want to cancel this payment?',
      [
        { text: 'Continue Payment', style: 'cancel' },
        {
          text: 'Cancel',
          style: 'destructive',
          onPress: () => navigation.goBack(),
        },
      ]
    );
  };

  if (isProcessing) {
    return (
      <View style={styles.loadingContainer}>
        <LoadingSpinner />
        <Text style={styles.loadingText}>Processing payment...</Text>
        <Text style={styles.loadingSubtext}>Please wait while we redirect you to PhonePe</Text>
      </View>
    );
  }

  return (
    <>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <FadeInView>
          <Card padding="lg" variant="elevated">
            <Text style={styles.title}>Payment Details</Text>
        
        <View style={styles.invoiceInfo}>
          <View style={styles.infoRow}>
            <Text style={styles.label}>Vendor</Text>
            <Text style={styles.value}>{invoice.vendors?.name || 'Unknown Vendor'}</Text>
          </View>
          
          <View style={styles.infoRow}>
            <Text style={styles.label}>Amount</Text>
            <Text style={styles.amountValue}>{formatAmount(invoice.amount)}</Text>
          </View>
          
          {invoice.description && (
            <View style={styles.infoRow}>
              <Text style={styles.label}>Description</Text>
              <Text style={styles.value}>{invoice.description}</Text>
            </View>
          )}
          
          <View style={styles.infoRow}>
            <Text style={styles.label}>Invoice ID</Text>
            <Text style={styles.value}>{invoice.id}</Text>
          </View>
          </View>
          </Card>
        </FadeInView>

        <SlideInView delay={100} direction="up">
          <Card padding="lg" variant="elevated">
            <PaymentMethodPicker
              selectedMethod={selectedMethod}
              onSelect={(method) => {
                setSelectedMethod(method);
                setSelectedCard(null); // Reset selected card when method changes
              }}
              error={errors.method}
            />
          </Card>
        </SlideInView>

        {/* Saved Cards Section */}
        {selectedMethod === 'saved_card' && (
          <SlideInView delay={150} direction="up">
            <SavedCardPicker
              selectedCardId={selectedCard?.id}
              onSelect={setSelectedCard}
              onAddNewCard={() => {
                setSelectedMethod('card');
                setSaveNewCard(true);
              }}
              error={errors.method}
            />
          </SlideInView>
        )}

        {/* Save Card Option for New Cards */}
        {selectedMethod === 'card' && (
          <SlideInView delay={150} direction="up">
            <Card padding="lg" variant="elevated">
              <View style={styles.saveCardOption}>
                <Text style={styles.saveCardTitle}>💾 Save Card for Future</Text>
                <Text style={styles.saveCardText}>
                  Save this card securely for faster payments next time
                </Text>
                <View style={styles.saveCardToggle}>
                  <Text style={styles.saveCardLabel}>Save this card</Text>
                  <AnimatedButton
                    onPress={() => setSaveNewCard(!saveNewCard)}
                    style={[
                      styles.toggleButton,
                      saveNewCard && styles.toggleButtonActive
                    ]}
                  >
                    <Text style={[
                      styles.toggleText,
                      saveNewCard && styles.toggleTextActive
                    ]}>
                      {saveNewCard ? '✓' : '○'}
                    </Text>
                  </AnimatedButton>
                </View>
              </View>
            </Card>
          </SlideInView>
        )}

        <SlideInView delay={200} direction="up">
          <Card padding="lg" variant="elevated">
            <InputField
              label="Mobile Number"
              value={mobileNumber}
              onChangeText={setMobileNumber}
              placeholder="Enter 10-digit mobile number"
              keyboardType="phone-pad"
              maxLength={10}
              error={errors.mobile}
            />
            <Text style={styles.mobileNote}>
              This mobile number will be used for payment notifications and OTP verification.
            </Text>
          </Card>
        </SlideInView>

        <SlideInView delay={300} direction="up">
          <Card padding="lg" variant="elevated">
            <Text style={styles.securityTitle}>🔒 Secure Payment</Text>
            <Text style={styles.securityText}>
              Your payment is processed securely through PhonePe. We don't store your card details.
            </Text>

            <View style={styles.securityFeatures}>
              <Text style={styles.securityFeature}>• PCI DSS Compliant</Text>
              <Text style={styles.securityFeature}>• 256-bit SSL Encryption</Text>
              <Text style={styles.securityFeature}>• No card details stored</Text>
            </View>
          </Card>
        </SlideInView>

        <SlideInView delay={400} direction="up">
          <View style={styles.actions}>
            <Button
              title="Cancel"
              variant="secondary"
              onPress={handleCancel}
              disabled={isProcessing}
            />
            <Button
              title={`Pay ${formatAmount(invoice.amount)}`}
              onPress={handlePayment}
              disabled={isProcessing || !selectedMethod}
              loading={isProcessing}
            />
          </View>
        </SlideInView>
      </ScrollView>

      <SuccessAnimation
        visible={showSuccess}
        title="Payment Initiated!"
        message="Redirecting to PhonePe for secure payment..."
        onComplete={() => setShowSuccess(false)}
        duration={1500}
      />
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
    padding: spacing.xl,
  },
  loadingText: {
    ...typography.h2,
    color: colors.text,
    marginTop: spacing.lg,
    textAlign: 'center',
  },
  loadingSubtext: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  title: {
    ...typography.h1,
    color: colors.text,
    marginBottom: spacing.lg,
  },
  invoiceInfo: {
    gap: spacing.md,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  label: {
    ...typography.body,
    color: colors.textSecondary,
    flex: 1,
  },
  value: {
    ...typography.body,
    color: colors.text,
    flex: 2,
    textAlign: 'right',
  },
  amountValue: {
    ...typography.h2,
    color: colors.primary[400],
    fontWeight: '700',
    flex: 2,
    textAlign: 'right',
  },
  securityTitle: {
    ...typography.h3,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  securityText: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.md,
    lineHeight: 20,
  },
  securityFeatures: {
    gap: spacing.xs,
  },
  securityFeature: {
    ...typography.caption,
    color: colors.green[400],
  },
  mobileNote: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.xs,
    lineHeight: 16,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.lg,
    marginBottom: spacing.xl,
  },
  saveCardOption: {
    gap: spacing.sm,
  },
  saveCardTitle: {
    ...typography.h3,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  saveCardText: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.md,
    lineHeight: 20,
  },
  saveCardToggle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  saveCardLabel: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
  },
  toggleButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.grey[700],
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.grey[600],
  },
  toggleButtonActive: {
    backgroundColor: colors.primary[500],
    borderColor: colors.primary[400],
  },
  toggleText: {
    ...typography.body,
    color: colors.textSecondary,
    fontWeight: 'bold',
  },
  toggleTextActive: {
    color: colors.white,
  },
});
