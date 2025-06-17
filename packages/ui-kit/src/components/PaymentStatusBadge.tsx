import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing, typography } from '../tokens';
import type { PaymentStatus } from '@invoicepe/types';

interface PaymentStatusBadgeProps {
  status: PaymentStatus;
  size?: 'small' | 'medium' | 'large';
}

export const PaymentStatusBadge: React.FC<PaymentStatusBadgeProps> = ({
  status,
  size = 'medium',
}) => {
  const getStatusConfig = (status: PaymentStatus) => {
    switch (status) {
      case 'succeeded':
        return {
          color: colors.green[500],
          backgroundColor: colors.green[600] + '20',
          text: 'Paid',
          icon: '✓',
        };
      case 'initiated':
        return {
          color: colors.yellow[500],
          backgroundColor: colors.yellow[600] + '20',
          text: 'Pending',
          icon: '⏳',
        };
      case 'failed':
        return {
          color: colors.red[500],
          backgroundColor: colors.red[600] + '20',
          text: 'Failed',
          icon: '✗',
        };
      default:
        return {
          color: colors.grey[500],
          backgroundColor: colors.grey[800],
          text: 'Unknown',
          icon: '?',
        };
    }
  };

  const config = getStatusConfig(status);

  return (
    <View style={[
      styles.badge,
      styles[`${size}Badge`],
      { backgroundColor: config.backgroundColor, borderColor: config.color }
    ]}>
      <Text style={[styles.icon, styles[`${size}Icon`]]}>
        {config.icon}
      </Text>
      <Text style={[
        styles.text,
        styles[`${size}Text`],
        { color: config.color }
      ]}>
        {config.text}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  icon: {
    marginRight: spacing.xs,
  },
  text: {
    fontWeight: '600',
  },
  smallBadge: {
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: 12,
  },
  smallIcon: {
    fontSize: 10,
    marginRight: 4,
  },
  smallText: {
    ...typography.caption,
    fontSize: 10,
  },
  mediumBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 16,
  },
  mediumIcon: {
    fontSize: 12,
    marginRight: spacing.xs,
  },
  mediumText: {
    ...typography.caption,
    fontSize: 12,
  },
  largeBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 20,
  },
  largeIcon: {
    fontSize: 16,
    marginRight: spacing.sm,
  },
  largeText: {
    ...typography.body,
    fontSize: 14,
  },
});
