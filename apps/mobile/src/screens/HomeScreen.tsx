import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Button, Card, colors, spacing, typography } from '@invoicepe/ui-kit';
import { useSupabaseAuth } from '../hooks/useSupabaseAuth';
import { useVendors } from '../hooks/useVendors';
import { useInvoices } from '../hooks/useInvoices';
import { usePayments } from '../hooks/usePayments';

interface HomeScreenProps {
  navigation: any;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({ navigation }) => {
  const { user } = useSupabaseAuth();
  const { vendors, loading } = useVendors();
  const { invoices, getTotalAmountByStatus, loading: invoicesLoading } = useInvoices();
  const { getPaymentStats, loading: paymentsLoading } = usePayments();

  const activeVendors = vendors.filter(v => v.is_active).length;
  const vendorsWithUPI = vendors.filter(v => v.upi_id).length;
  const vendorsWithBank = vendors.filter(v => v.bank_account).length;

  const totalInvoices = invoices.length;
  const pendingAmount = getTotalAmountByStatus('pending');
  const paidAmount = getTotalAmountByStatus('paid');

  const paymentStats = getPaymentStats();

  return (
    <ScrollView style={styles.container}>
      <Card padding="lg">
        <Text style={styles.title}>
          Welcome{user?.business_name ? `, ${user.business_name}` : ''}!
        </Text>
        <Text style={styles.subtitle}>
          Manage your vendor payments with ease
        </Text>
      </Card>

      <Card padding="lg">
        <Text style={styles.sectionTitle}>Vendor Stats</Text>
        <View style={styles.statsGrid}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{loading ? '...' : activeVendors}</Text>
            <Text style={styles.statLabel}>Active Vendors</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{loading ? '...' : vendorsWithUPI}</Text>
            <Text style={styles.statLabel}>UPI Enabled</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{loading ? '...' : vendorsWithBank}</Text>
            <Text style={styles.statLabel}>Bank Details</Text>
          </View>
        </View>
      </Card>

      <Card padding="lg">
        <Text style={styles.sectionTitle}>Invoice Stats</Text>
        <View style={styles.statsGrid}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{invoicesLoading ? '...' : totalInvoices}</Text>
            <Text style={styles.statLabel}>Total Invoices</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>
              {invoicesLoading ? '...' : `₹${(pendingAmount / 1000).toFixed(0)}K`}
            </Text>
            <Text style={styles.statLabel}>Pending</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>
              {invoicesLoading ? '...' : `₹${(paidAmount / 1000).toFixed(0)}K`}
            </Text>
            <Text style={styles.statLabel}>Paid</Text>
          </View>
        </View>
      </Card>

      <Card padding="lg">
        <Text style={styles.sectionTitle}>Payment Stats</Text>
        <View style={styles.statsGrid}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>
              {paymentsLoading ? '...' : paymentStats.total}
            </Text>
            <Text style={styles.statLabel}>Total Payments</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>
              {paymentsLoading ? '...' : `${paymentStats.successRate.toFixed(0)}%`}
            </Text>
            <Text style={styles.statLabel}>Success Rate</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>
              {paymentsLoading ? '...' : paymentStats.pending}
            </Text>
            <Text style={styles.statLabel}>Pending</Text>
          </View>
        </View>
      </Card>

      <Card padding="lg">
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actions}>
          <Button
            title="Manage Vendors"
            onPress={() => navigation.navigate('Vendors')}
          />
          <Button
            title="Add New Vendor"
            onPress={() => navigation.navigate('Vendors', {
              screen: 'AddVendor'
            })}
          />
          <Button
            title="Create Invoice"
            variant="secondary"
            onPress={() => navigation.navigate('Invoices', {
              screen: 'CreateInvoice'
            })}
          />
          <Button
            title="View Invoices"
            variant="secondary"
            onPress={() => navigation.navigate('Invoices')}
          />
        </View>
      </Card>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.grey[900],
    padding: spacing.md,
  },
  title: {
    ...typography.h1,
    color: colors.white,
    marginBottom: spacing.sm,
  },
  subtitle: {
    ...typography.body,
    color: colors.grey[600],
    marginBottom: spacing.md,
  },
  sectionTitle: {
    ...typography.h2,
    color: colors.white,
    marginBottom: spacing.md,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statNumber: {
    ...typography.h1,
    color: colors.primary[500],
    marginBottom: spacing.xs,
  },
  statLabel: {
    ...typography.caption,
    color: colors.grey[600],
    textAlign: 'center',
  },
  actions: {
    gap: spacing.md,
  },
});
