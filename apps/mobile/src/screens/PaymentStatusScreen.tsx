import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
import {
  Card,
  Button,
  PaymentStatusBadge,
  LoadingSpinner,
  colors,
  spacing,
  typography,
} from '@invoicepe/ui-kit';
import { usePayments } from '../hooks/usePayments';
import { generateAndShareInvoicePDF } from '../utils/pdfGenerator';
import { useSupabaseAuth } from '../hooks/useSupabaseAuth';
import type { Payment, InvoiceWithVendor } from '@invoicepe/types';

interface PaymentStatusScreenProps {
  navigation: any;
  route: {
    params: {
      payment: Payment;
      invoice: InvoiceWithVendor;
    };
  };
}

export const PaymentStatusScreen: React.FC<PaymentStatusScreenProps> = ({ 
  navigation, 
  route 
}) => {
  const { payment: initialPayment, invoice } = route.params;
  const { checkPaymentStatus } = usePayments();
  const { user } = useSupabaseAuth();
  
  const [payment, setPayment] = useState(initialPayment);
  const [isChecking, setIsChecking] = useState(false);
  const [autoCheckCount, setAutoCheckCount] = useState(0);

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

  const checkStatus = async () => {
    if (payment.status !== 'initiated') return;

    setIsChecking(true);
    try {
      const updatedPayment = await checkPaymentStatus(payment.id);
      setPayment(updatedPayment);
    } catch (error) {
      // Log error for debugging
      console.error('Failed to check payment status:', error);
    } finally {
      setIsChecking(false);
    }
  };

  // Auto-check payment status for pending payments
  useEffect(() => {
    if (payment.status === 'initiated' && autoCheckCount < 10) {
      const timer = setTimeout(() => {
        checkStatus();
        setAutoCheckCount(prev => prev + 1);
      }, 3000); // Check every 3 seconds

      return () => clearTimeout(timer);
    }
  }, [payment.status, autoCheckCount, checkStatus]);

  const handleShareInvoice = async () => {
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

  const handleDone = () => {
    // Navigate back to invoice list or home
    navigation.navigate('Invoices');
  };

  const getStatusMessage = () => {
    switch (payment.status) {
      case 'succeeded':
        return {
          title: '🎉 Payment Successful!',
          message: 'Your payment has been processed successfully.',
          color: colors.green[500],
        };
      case 'failed':
        return {
          title: '❌ Payment Failed',
          message: 'Your payment could not be processed. Please try again.',
          color: colors.red[500],
        };
      case 'initiated':
      default:
        return {
          title: '⏳ Payment Processing',
          message: 'Your payment is being processed. Please wait...',
          color: colors.yellow[500],
        };
    }
  };

  const statusInfo = getStatusMessage();

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <Card padding="lg">
        <View style={styles.statusHeader}>
          <Text style={[styles.statusTitle, { color: statusInfo.color }]}>
            {statusInfo.title}
          </Text>
          <PaymentStatusBadge status={payment.status} size="large" />
        </View>
        
        <Text style={styles.statusMessage}>{statusInfo.message}</Text>
        
        {payment.status === 'initiated' && (
          <View style={styles.processingInfo}>
            <LoadingSpinner />
            <Text style={styles.processingText}>
              Checking payment status automatically...
            </Text>
          </View>
        )}
      </Card>

      <Card padding="lg">
        <Text style={styles.sectionTitle}>Payment Details</Text>
        
        <View style={styles.detailsGrid}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Amount</Text>
            <Text style={styles.detailValue}>{formatAmount(invoice.amount)}</Text>
          </View>
          
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Vendor</Text>
            <Text style={styles.detailValue}>{invoice.vendors?.name || 'Unknown'}</Text>
          </View>
          
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Payment Method</Text>
            <Text style={styles.detailValue}>
              {payment.method === 'card' ? 'Credit/Debit Card' : 'UPI'}
            </Text>
          </View>
          
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Transaction ID</Text>
            <Text style={styles.detailValue}>{payment.phonepe_txn_id || 'N/A'}</Text>
          </View>
          
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Date & Time</Text>
            <Text style={styles.detailValue}>{formatDate(payment.created_at)}</Text>
          </View>
          
          {payment.masked_card && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Card</Text>
              <Text style={styles.detailValue}>{payment.masked_card}</Text>
            </View>
          )}
        </View>
      </Card>

      <View style={styles.actions}>
        {payment.status === 'initiated' && (
          <Button
            title={isChecking ? 'Checking...' : 'Check Status'}
            variant="secondary"
            onPress={checkStatus}
            disabled={isChecking}
          />
        )}
        
        {payment.status === 'succeeded' && (
          <Button
            title="Share Invoice"
            variant="secondary"
            onPress={handleShareInvoice}
          />
        )}
        
        {payment.status === 'failed' && (
          <Button
            title="Try Again"
            variant="secondary"
            onPress={() => navigation.goBack()}
          />
        )}
        
        <Button
          title="Done"
          onPress={handleDone}
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
  statusHeader: {
    alignItems: 'center',
    marginBottom: spacing.lg,
    gap: spacing.md,
  },
  statusTitle: {
    ...typography.h1,
    textAlign: 'center',
    fontSize: 24,
  },
  statusMessage: {
    ...typography.body,
    color: colors.grey[300],
    textAlign: 'center',
    marginBottom: spacing.lg,
    lineHeight: 22,
  },
  processingInfo: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.grey[700],
  },
  processingText: {
    ...typography.caption,
    color: colors.grey[400],
    textAlign: 'center',
  },
  sectionTitle: {
    ...typography.h2,
    color: colors.white,
    marginBottom: spacing.lg,
  },
  detailsGrid: {
    gap: spacing.md,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  detailLabel: {
    ...typography.body,
    color: colors.grey[400],
    flex: 1,
  },
  detailValue: {
    ...typography.body,
    color: colors.white,
    flex: 2,
    textAlign: 'right',
    fontWeight: '500',
  },
  actions: {
    gap: spacing.md,
    marginTop: spacing.lg,
    marginBottom: spacing.xl,
  },
});
