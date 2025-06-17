import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { colors, spacing, typography } from '../tokens';
import type { PaymentMethod } from '@invoicepe/types';

interface PaymentMethodPickerProps {
  selectedMethod?: PaymentMethod;
  onSelect: (method: PaymentMethod) => void;
  error?: string;
}

export const PaymentMethodPicker: React.FC<PaymentMethodPickerProps> = ({
  selectedMethod,
  onSelect,
  error,
}) => {
  const paymentMethods: { value: PaymentMethod; label: string; description: string; icon: string }[] = [
    {
      value: 'saved_card',
      label: 'Saved Cards',
      description: 'Use your saved cards for faster payments',
      icon: '💳',
    },
    {
      value: 'card',
      label: 'New Credit/Debit Card',
      description: 'Pay securely with a new card via PhonePe',
      icon: '🆕',
    },
    {
      value: 'upi',
      label: 'UPI',
      description: 'Pay instantly using UPI',
      icon: '📱',
    },
  ];

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Select Payment Method</Text>
      
      {paymentMethods.map((method) => (
        <TouchableOpacity
          key={method.value}
          style={[
            styles.methodCard,
            selectedMethod === method.value && styles.selectedCard,
            error && styles.errorCard,
          ]}
          onPress={() => onSelect(method.value)}
          activeOpacity={0.7}
        >
          <View style={styles.methodContent}>
            <View style={styles.methodHeader}>
              <Text style={styles.methodIcon}>{method.icon}</Text>
              <View style={styles.methodInfo}>
                <Text style={styles.methodLabel}>{method.label}</Text>
                <Text style={styles.methodDescription}>{method.description}</Text>
              </View>
            </View>
            
            <View style={[
              styles.radioButton,
              selectedMethod === method.value && styles.radioButtonSelected,
            ]}>
              {selectedMethod === method.value && (
                <View style={styles.radioButtonInner} />
              )}
            </View>
          </View>
        </TouchableOpacity>
      ))}

      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.lg,
  },
  title: {
    ...typography.h3,
    color: colors.white,
    marginBottom: spacing.md,
  },
  methodCard: {
    backgroundColor: colors.grey[800],
    borderWidth: 1,
    borderColor: colors.grey[600],
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  selectedCard: {
    borderColor: colors.primary[500],
    backgroundColor: colors.grey[700],
  },
  errorCard: {
    borderColor: colors.error[500],
  },
  methodContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  methodHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  methodIcon: {
    fontSize: 24,
    marginRight: spacing.md,
  },
  methodInfo: {
    flex: 1,
  },
  methodLabel: {
    ...typography.body,
    color: colors.white,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  methodDescription: {
    ...typography.caption,
    color: colors.grey[400],
  },
  radioButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.grey[500],
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioButtonSelected: {
    borderColor: colors.primary[500],
  },
  radioButtonInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary[500],
  },
  errorText: {
    ...typography.caption,
    color: colors.error[500],
    marginTop: spacing.xs,
  },
});
