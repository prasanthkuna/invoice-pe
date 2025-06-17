import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { colors, spacing, typography } from '../tokens';
import type { InvoiceWithVendor } from '@invoicepe/types';

interface InvoiceCardProps {
  invoice: InvoiceWithVendor;
  onPress?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onShare?: () => void;
  onPay?: () => void;
}

export const InvoiceCard: React.FC<InvoiceCardProps> = ({
  invoice,
  onPress,
  onEdit,
  onDelete,
  onShare,
  onPay,
}) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return colors.green[500];
      case 'pending':
        return colors.yellow[500];
      case 'failed':
        return colors.red[500];
      default:
        return colors.grey[500];
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'paid':
        return 'Paid';
      case 'pending':
        return 'Pending';
      case 'failed':
        return 'Failed';
      default:
        return 'Unknown';
    }
  };

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.header}>
        <View style={styles.vendorInfo}>
          <Text style={styles.vendorName} numberOfLines={1}>
            {invoice.vendors?.name || 'Unknown Vendor'}
          </Text>
          <Text style={styles.category} numberOfLines={1}>
            {invoice.vendors?.vendor_categories?.name || 'No Category'}
          </Text>
        </View>
        <View style={styles.statusContainer}>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(invoice.status) }]}>
            <Text style={styles.statusText}>{getStatusText(invoice.status)}</Text>
          </View>
        </View>
      </View>

      <View style={styles.content}>
        <View style={styles.amountContainer}>
          <Text style={styles.amount}>{formatAmount(invoice.amount)}</Text>
          <Text style={styles.currency}>{invoice.currency}</Text>
        </View>
        
        {invoice.description && (
          <Text style={styles.description} numberOfLines={2}>
            {invoice.description}
          </Text>
        )}
        
        <Text style={styles.date}>
          Created: {formatDate(invoice.created_at)}
        </Text>
      </View>

      <View style={styles.actions}>
        {onPay && invoice.status === 'pending' && (
          <TouchableOpacity
            style={[styles.actionButton, styles.payButton]}
            onPress={onPay}
          >
            <Text style={styles.actionText}>Pay Now</Text>
          </TouchableOpacity>
        )}

        {onEdit && (
          <TouchableOpacity
            style={[styles.actionButton, styles.editButton]}
            onPress={onEdit}
          >
            <Text style={styles.actionText}>Edit</Text>
          </TouchableOpacity>
        )}

        {onShare && (
          <TouchableOpacity
            style={[styles.actionButton, styles.shareButton]}
            onPress={onShare}
          >
            <Text style={styles.actionText}>Share</Text>
          </TouchableOpacity>
        )}

        {onDelete && (
          <TouchableOpacity
            style={[styles.actionButton, styles.deleteButton]}
            onPress={onDelete}
          >
            <Text style={[styles.actionText, styles.deleteText]}>Delete</Text>
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.grey[800],
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.grey[700],
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  vendorInfo: {
    flex: 1,
    marginRight: spacing.sm,
  },
  vendorName: {
    ...typography.h3,
    color: colors.white,
    marginBottom: spacing.xs,
  },
  category: {
    ...typography.caption,
    color: colors.grey[400],
  },
  statusContainer: {
    alignItems: 'flex-end',
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 16,
  },
  statusText: {
    ...typography.caption,
    color: colors.white,
    fontWeight: '600',
    fontSize: 12,
  },
  content: {
    marginBottom: spacing.md,
  },
  amountContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: spacing.sm,
  },
  amount: {
    ...typography.h2,
    color: colors.primary[500],
    fontWeight: '700',
  },
  currency: {
    ...typography.body,
    color: colors.grey[400],
    marginLeft: spacing.xs,
  },
  description: {
    ...typography.body,
    color: colors.grey[300],
    marginBottom: spacing.sm,
    lineHeight: 20,
  },
  date: {
    ...typography.caption,
    color: colors.grey[500],
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
  },
  actionButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 8,
    borderWidth: 1,
  },
  payButton: {
    backgroundColor: colors.primary[600],
    borderColor: colors.primary[500],
  },
  editButton: {
    backgroundColor: colors.blue[600],
    borderColor: colors.blue[500],
  },
  shareButton: {
    backgroundColor: colors.green[600],
    borderColor: colors.green[500],
  },
  deleteButton: {
    backgroundColor: 'transparent',
    borderColor: colors.red[500],
  },
  actionText: {
    ...typography.caption,
    color: colors.white,
    fontWeight: '600',
  },
  deleteText: {
    color: colors.red[400],
  },
});
