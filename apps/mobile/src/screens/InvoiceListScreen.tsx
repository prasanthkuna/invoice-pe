import React, { useState } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import {
  InvoiceCard,
  SearchBar,
  LoadingSpinner,
  EmptyState,
  Button,
  colors,
  spacing,
} from '@invoicepe/ui-kit';
import { useInvoices } from '../hooks/useInvoices';
import { useSupabaseAuth } from '../hooks/useSupabaseAuth';
import { useExport } from '../hooks/useExport';
import { generateAndShareInvoicePDF } from '../utils/pdfGenerator';
import { AnimatedList } from '../components/animations/AnimatedList';
import { FadeInView } from '../components/animations/FadeInView';
import { SkeletonList } from '../components/animations/SkeletonLoader';
import type { InvoiceWithVendor } from '@invoicepe/types';

interface InvoiceListScreenProps {
  navigation: any;
}

export const InvoiceListScreen: React.FC<InvoiceListScreenProps> = ({ navigation }) => {
  const { invoices, loading, deleteInvoice } = useInvoices();
  const { user } = useSupabaseAuth();
  const { exportLedger } = useExport();
  const [searchQuery, setSearchQuery] = useState('');

  const filteredInvoices = invoices.filter(invoice => {
    const vendorName = invoice.vendors?.name?.toLowerCase() || '';
    const description = invoice.description?.toLowerCase() || '';
    const amount = invoice.amount.toString();
    const query = searchQuery.toLowerCase();

    return (
      vendorName.includes(query) ||
      description.includes(query) ||
      amount.includes(query)
    );
  });

  const handleDeleteInvoice = (invoice: InvoiceWithVendor) => {
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
              Alert.alert('Success', 'Invoice deleted successfully');
            } catch (error) {
              Alert.alert('Error', error instanceof Error ? error.message : 'Failed to delete invoice');
            }
          },
        },
      ]
    );
  };

  const handleShareInvoice = async (invoice: InvoiceWithVendor) => {
    if (!user) {
      Alert.alert('Error', 'User information not available');
      return;
    }

    try {
      await generateAndShareInvoicePDF({ invoice, user });
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to share invoice');
    }
  };

  // CSV EXPORT: Handle ledger export
  const handleExportLedger = async () => {
    try {
      await exportLedger();
    } catch (error) {
      Alert.alert('Export Failed', error instanceof Error ? error.message : 'Failed to export ledger');
    }
  };

  const renderInvoice = ({ item }: { item: InvoiceWithVendor }) => (
    <InvoiceCard
      invoice={item}
      onPress={() => navigation.navigate('InvoiceDetail', { invoice: item })}
      onEdit={() => navigation.navigate('EditInvoice', { invoice: item })}
      onDelete={() => handleDeleteInvoice(item)}
      onShare={() => handleShareInvoice(item)}
      onPay={() => navigation.navigate('Payment', { invoice: item })}
    />
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <FadeInView style={styles.header}>
          <SearchBar
            value=""
            onChangeText={() => {}}
            placeholder="Search invoices..."
            editable={false}
          />
          <Button
            title="Create Invoice"
            onPress={() => {}}
            disabled
          />
        </FadeInView>
        <SkeletonList itemCount={6} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FadeInView style={styles.header}>
        <SearchBar
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search invoices..."
        />
        <View style={styles.buttonRow}>
          <Button
            title="Export CSV"
            variant="secondary"
            onPress={handleExportLedger}
            style={styles.exportButton}
          />
          <Button
            title="Create Invoice"
            onPress={() => navigation.navigate('CreateInvoice')}
            style={styles.createButton}
          />
        </View>
      </FadeInView>

      <AnimatedList
        data={filteredInvoices}
        renderItem={renderInvoice}
        keyExtractor={(item: InvoiceWithVendor) => item.id}
        onRefresh={async () => {
          // Add refresh logic here if needed
          await new Promise(resolve => setTimeout(resolve, 1000));
        }}
        refreshing={false}
        animationType="slide"
        staggerDelay={50}
        emptyComponent={
          <FadeInView delay={300}>
            <EmptyState
              title={searchQuery ? 'No Results' : 'No Invoices'}
              message={
                searchQuery
                  ? 'No invoices match your search criteria'
                  : 'Start by creating your first invoice'
              }
              actionText={searchQuery ? undefined : 'Create Invoice'}
              onAction={searchQuery ? undefined : () => navigation.navigate('CreateInvoice')}
            />
          </FadeInView>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    padding: spacing.md,
    paddingBottom: spacing.sm,
    gap: spacing.md,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  exportButton: {
    flex: 1,
  },
  createButton: {
    flex: 2,
  },
});
