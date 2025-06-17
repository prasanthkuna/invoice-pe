import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
import {
  Card,
  Button,
  colors,
  spacing,
  typography,
} from '@invoicepe/ui-kit';
import { useInvoices } from '../hooks/useInvoices';
import { useSupabaseAuth } from '../hooks/useSupabaseAuth';
import { PDFService } from '../services/pdfService';
import type { InvoiceWithVendor } from '@invoicepe/types';

interface InvoiceDetailScreenProps {
  navigation: any;
  route: {
    params: {
      invoice: InvoiceWithVendor;
    };
  };
}

export const InvoiceDetailScreen: React.FC<InvoiceDetailScreenProps> = ({
  navigation,
  route
}) => {
  const { invoice } = route.params;
  const { deleteInvoice } = useInvoices();
  const { user } = useSupabaseAuth();
  const [sharingPDF, setSharingPDF] = useState(false);

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
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Invoice',
      `Are you sure you want to delete this invoice for ${invoice.vendors?.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteInvoice(invoice.id);
              Alert.alert('Success', 'Invoice deleted successfully', [
                {
                  text: 'OK',
                  onPress: () => navigation.goBack(),
                },
              ]);
            } catch (error) {
              Alert.alert('Error', error instanceof Error ? error.message : 'Failed to delete invoice');
            }
          },
        },
      ]
    );
  };

  const handleShare = async () => {
    if (!user) {
      Alert.alert('Error', 'User information not available');
      return;
    }

    if (!invoice.vendors) {
      Alert.alert('Error', 'Vendor information not available');
      return;
    }

    setSharingPDF(true);
    try {
      const pdfUri = await PDFService.generateInvoicePDF({
        invoice,
        vendor: invoice.vendors,
        user
      });

      await PDFService.shareInvoicePDF(pdfUri, invoice.id);
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to share invoice');
    } finally {
      setSharingPDF(false);
    }
  };

  const handleEdit = () => {
    navigation.navigate('EditInvoice', { invoice });
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <Card padding="lg">
        <View style={styles.header}>
          <Text style={styles.title}>Invoice Details</Text>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(invoice.status) }]}>
            <Text style={styles.statusText}>{getStatusText(invoice.status)}</Text>
          </View>
        </View>

        <View style={styles.amountSection}>
          <Text style={styles.amountLabel}>Amount</Text>
          <Text style={styles.amount}>{formatAmount(invoice.amount)}</Text>
          <Text style={styles.currency}>{invoice.currency}</Text>
        </View>
      </Card>

      <Card padding="lg">
        <Text style={styles.sectionTitle}>Vendor Information</Text>
        
        <View style={styles.infoRow}>
          <Text style={styles.label}>Name</Text>
          <Text style={styles.value}>{invoice.vendors?.name || 'Unknown Vendor'}</Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.label}>Category</Text>
          <Text style={styles.value}>
            {invoice.vendors?.vendor_categories?.name || 'No Category'}
          </Text>
        </View>

        {invoice.vendors?.phone && (
          <View style={styles.infoRow}>
            <Text style={styles.label}>Phone</Text>
            <Text style={styles.value}>{invoice.vendors.phone}</Text>
          </View>
        )}

        {invoice.vendors?.upi_id && (
          <View style={styles.infoRow}>
            <Text style={styles.label}>UPI ID</Text>
            <Text style={styles.value}>{invoice.vendors.upi_id}</Text>
          </View>
        )}

        {invoice.vendors?.bank_account && (
          <View style={styles.infoRow}>
            <Text style={styles.label}>Bank Account</Text>
            <Text style={styles.value}>{invoice.vendors.bank_account}</Text>
          </View>
        )}
      </Card>

      <Card padding="lg">
        <Text style={styles.sectionTitle}>Invoice Information</Text>
        
        <View style={styles.infoRow}>
          <Text style={styles.label}>Invoice ID</Text>
          <Text style={styles.value}>{invoice.id}</Text>
        </View>

        {invoice.description && (
          <View style={styles.infoRow}>
            <Text style={styles.label}>Description</Text>
            <Text style={styles.value}>{invoice.description}</Text>
          </View>
        )}

        <View style={styles.infoRow}>
          <Text style={styles.label}>Created</Text>
          <Text style={styles.value}>{formatDate(invoice.created_at)}</Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.label}>Last Updated</Text>
          <Text style={styles.value}>{formatDate(invoice.updated_at)}</Text>
        </View>
      </Card>

      <View style={styles.actions}>
        {invoice.status === 'pending' && (
          <Button
            title="Pay Now"
            onPress={() => navigation.navigate('Payment', { invoice })}
          />
        )}

        <Button
          title="Edit Invoice"
          onPress={handleEdit}
          variant="secondary"
        />
        <Button
          title="Share PDF"
          onPress={handleShare}
          variant="secondary"
          loading={sharingPDF}
        />
        <Button
          title="Delete"
          onPress={handleDelete}
          variant="secondary"
          style={styles.deleteButton}
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  title: {
    ...typography.h1,
    color: colors.white,
  },
  statusBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 20,
  },
  statusText: {
    ...typography.caption,
    color: colors.white,
    fontWeight: '600',
  },
  amountSection: {
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  amountLabel: {
    ...typography.body,
    color: colors.grey[400],
    marginBottom: spacing.sm,
  },
  amount: {
    ...typography.h1,
    color: colors.primary[400],
    fontWeight: '700',
    fontSize: 36,
  },
  currency: {
    ...typography.body,
    color: colors.grey[400],
    marginTop: spacing.xs,
  },
  sectionTitle: {
    ...typography.h2,
    color: colors.white,
    marginBottom: spacing.lg,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  label: {
    ...typography.body,
    color: colors.grey[400],
    flex: 1,
  },
  value: {
    ...typography.body,
    color: colors.white,
    flex: 2,
    textAlign: 'right',
  },
  actions: {
    gap: spacing.md,
    marginTop: spacing.lg,
    marginBottom: spacing.xl,
  },
  deleteButton: {
    borderColor: colors.red[500],
  },
});
