import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { Button, Card, InputField, colors, spacing } from '@invoicepe/ui-kit';
import { useAuthWidget } from '../hooks/useAuthWidget';

export const LoginScreen: React.FC = () => {
  const [phone, setPhone] = useState('');
  const [otp, setOTP] = useState('');
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [loading, setLoading] = useState(false);
  
  const { sendOTP, verifyOTP, isAuthenticated, user } = useAuthWidget();

  // Auto-navigate when authenticated - App.tsx will handle this
  useEffect(() => {
    if (isAuthenticated) {
      // App.tsx will automatically show AppNavigator
      // No need to do anything here
    }
  }, [isAuthenticated]);

  const handleSendOTP = async () => {
    if (!phone || phone.length !== 10) {
      Alert.alert('Error', 'Please enter a valid 10-digit phone number');
      return;
    }

    setLoading(true);
    try {
      const response = await sendOTP(phone);
      Alert.alert('Success', response.message);
      setStep('otp');
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (!otp || otp.length !== 6) {
      Alert.alert('Error', 'Please enter a valid 6-digit OTP');
      return;
    }

    setLoading(true);
    try {
      await verifyOTP(phone, otp); // Widget verification
      // Success handling is done in useEffect above
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to verify OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleRetryOTP = async () => {
    // Simply resend OTP using the same widget API
    await handleSendOTP();
  };

  const handleBack = () => {
    setStep('phone');
    setOTP('');
  };

  // If authenticated, App.tsx will handle navigation to AppNavigator
  if (isAuthenticated) {
    return null; // Let App.tsx handle the authenticated state
  }

  return (
    <View style={styles.container}>
      <Card padding="lg">
        <Text style={styles.title}>Welcome to InvoicePe</Text>
        <Text style={styles.subtitle}>
          {step === 'phone'
            ? 'Enter your phone number to get started'
            : 'Enter the OTP sent to your phone'
          }
        </Text>

        {step === 'phone' ? (
          <>
            <InputField
              label="Phone Number"
              placeholder="Enter 10-digit phone number"
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
            />
            <Button
              title={loading ? 'Sending...' : 'Send OTP'}
              onPress={handleSendOTP}
              disabled={loading}
            />
          </>
        ) : (
          <>
            <InputField
              label="OTP"
              placeholder="Enter 6-digit OTP"
              value={otp}
              onChangeText={setOTP}
              keyboardType="numeric"
            />
            <View style={styles.buttonContainer}>
              <Button
                title={loading ? 'Verifying...' : 'Verify OTP'}
                onPress={handleVerifyOTP}
                disabled={loading}
              />
              <Button
                title={loading ? 'Resending...' : 'Resend OTP'}
                variant="outline"
                onPress={handleRetryOTP}
                disabled={loading}
              />
              <Button
                title="Back"
                variant="secondary"
                onPress={handleBack}
                disabled={loading}
              />
            </View>
          </>
        )}
      </Card>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.grey[900],
    justifyContent: 'center',
    padding: spacing.lg,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.white,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: 16,
    color: colors.grey[600],
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  buttonContainer: {
    gap: spacing.md,
  },
  successText: {
    fontSize: 16,
    color: colors.green[400],
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
});
