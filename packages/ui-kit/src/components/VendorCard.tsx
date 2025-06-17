import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { colors, typography, spacing, radius } from '../tokens';
import type { Vendor } from '@invoicepe/types';

interface VendorCardProps {
  vendor: Vendor;
  onPress: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

export const VendorCard: React.FC<VendorCardProps> = ({
  vendor,
  onPress,
  onEdit,
  onDelete,
}) => (
  <TouchableOpacity style={styles.card} onPress={onPress}>
    <View style={styles.header}>
      <View style={styles.info}>
        <Text style={styles.name}>{vendor.name}</Text>
        <Text style={styles.category}>
          {vendor.vendor_categories?.name || 'No Category'}
        </Text>
      </View>
      <View style={styles.actions}>
        {onEdit && (
          <TouchableOpacity style={styles.actionButton} onPress={onEdit}>
            <Text style={styles.actionText}>Edit</Text>
          </TouchableOpacity>
        )}
        {onDelete && (
          <TouchableOpacity style={styles.deleteButton} onPress={onDelete}>
            <Text style={styles.deleteText}>Delete</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
    
    {(vendor.upi_id || vendor.bank_account || vendor.phone) && (
      <View style={styles.details}>
        {vendor.upi_id && (
          <Text style={styles.detail}>UPI: {vendor.upi_id}</Text>
        )}
        {vendor.bank_account && (
          <Text style={styles.detail}>Bank: {vendor.bank_account}</Text>
        )}
        {vendor.phone && (
          <Text style={styles.detail}>Phone: {vendor.phone}</Text>
        )}
      </View>
    )}
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.grey[800],
    borderRadius: radius.default,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.grey[600],
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  info: {
    flex: 1,
  },
  name: {
    ...typography.h2,
    color: colors.white,
    marginBottom: spacing.xs,
  },
  category: {
    ...typography.caption,
    color: colors.grey[600],
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  actionButton: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    backgroundColor: colors.primary[500],
    borderRadius: spacing.xs,
  },
  deleteButton: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    backgroundColor: colors.error[500],
    borderRadius: spacing.xs,
  },
  actionText: {
    ...typography.caption,
    color: colors.white,
    fontWeight: '600',
  },
  deleteText: {
    ...typography.caption,
    color: colors.white,
    fontWeight: '600',
  },
  details: {
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.grey[600],
  },
  detail: {
    ...typography.caption,
    color: colors.grey[200],
    marginBottom: spacing.xs,
  },
});
