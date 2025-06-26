import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Alert, Platform } from 'react-native';
import { Button, Card, InputField, colors, spacing } from '@invoicepe/ui-kit';
import { useSupabaseAuth } from '../hooks/useSupabaseAuth';
import { useAutoOTPCapture } from '../components/AutoOTPCapture';
import { debugContext } from '../utils/logger';

export const LoginScreen: React.FC = () => {
  const [phone, setPhone] = useState('');
  const [otp, setOTP] = useState('');
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [loading, setLoading] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [otpSentTime, setOtpSentTime] = useState<Date | null>(null);

  const { signInWithPhone, verifyOtp, isAuthenticated, user } = useSupabaseAuth();

  // Auto OTP capture for Android
  const {
    capturedOTP,
    isCapturing,
    startCapture,
    stopCapture,
    AutoOTPComponent
  } = useAutoOTPCapture(phone, Platform.OS === 'android');

  // Auto-navigate when authenticated - App.tsx will handle this
  useEffect(() => {
    if (isAuthenticated) {
      debugContext.info('login', { step: 'user_authenticated', userId: user?.id });
      // App.tsx will automatically show AppNavigator
      // No need to do anything here
    }
  }, [isAuthenticated, user]);

  // Handle auto-captured OTP
  useEffect(() => {
    if (capturedOTP && step === 'otp' && !loading) {
      debugContext.info('login', { step: 'auto_otp_captured', platform: Platform.OS });
      setOTP(capturedOTP);
      // Auto-verify the captured OTP
      handleVerifyOTP(capturedOTP);
    }
  }, [capturedOTP, step, loading]);

  const handleSendOTP = async () => {
    if (!phone || phone.length !== 10) {
      Alert.alert('Error', 'Please enter a valid 10-digit phone number');
      return;
    }

    setLoading(true);
    debugContext.info('login', { step: 'sending_otp', phone: phone.slice(-4), retryCount });

    try {
      // Format phone number for India (+91)
      const formattedPhone = phone.startsWith('+') ? phone : `+91${phone.replace(/^0+/, '')}`;

      const result = await signInWithPhone(formattedPhone);

      if (result.success) {
        setStep('otp');
        setOtpSentTime(new Date());
        setRetryCount(prev => prev + 1);

        // Start auto OTP capture for Android
        if (Platform.OS === 'android') {
          startCapture();
        }

        Alert.alert(
          'Success',
          Platform.OS === 'android'
            ? 'OTP sent to your phone number. We\'ll auto-detect it for you!'
            : 'OTP sent to your phone number'
        );

        debugContext.info('login', { step: 'otp_sent_success', platform: Platform.OS });
      } else {
        Alert.alert('Error', result.message);
        debugContext.error('login', new Error(result.message), { step: 'otp_send_failed' });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to send OTP';
      Alert.alert('Error', errorMessage);
      debugContext.error('login', error as Error, { step: 'otp_send_error' });
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (otpCode?: string) => {
    const otpToVerify = otpCode || otp;

    if (!otpToVerify || otpToVerify.length !== 6) {
      Alert.alert('Error', 'Please enter a valid 6-digit OTP');
      return;
    }

    setLoading(true);
    debugContext.info('login', {
      step: 'verifying_otp',
      phone: phone.slice(-4),
      isAutoCapture: !!otpCode
    });

    try {
      // Stop auto capture when manually verifying
      if (!otpCode) {
        stopCapture();
      }

      // Format phone number for India (+91)
      const formattedPhone = phone.startsWith('+') ? phone : `+91${phone.replace(/^0+/, '')}`;

      const result = await verifyOtp(formattedPhone, otpToVerify);

      if (result.success) {
        debugContext.info('login', {
          step: 'otp_verified_success',
          userId: result.data?.user?.id,
          isAutoCapture: !!otpCode
        });
        // Success handling is done in useEffect above
      } else {
        Alert.alert('Error', result.message);
        debugContext.error('login', new Error(result.message), { step: 'otp_verify_failed' });

        // Clear OTP on failure
        setOTP('');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to verify OTP';
      Alert.alert('Error', errorMessage);
      debugContext.error('login', error as Error, { step: 'otp_verify_error' });

      // Clear OTP on error
      setOTP('');
    } finally {
      setLoading(false);
    }
  };

  const handleRetryOTP = async () => {
    debugContext.info('login', { step: 'retrying_otp', retryCount });

    // Stop current auto capture
    stopCapture();

    // Clear current OTP
    setOTP('');

    // Resend OTP
    await handleSendOTP();
  };

  const handleBack = () => {
    debugContext.info('login', { step: 'going_back_to_phone' });

    // Stop auto capture
    stopCapture();

    // Reset state
    setStep('phone');
    setOTP('');
    setRetryCount(0);
    setOtpSentTime(null);
  };

  // Calculate retry cooldown
  const getRetryCountdown = (): number => {
    if (!otpSentTime) return 0;

    const elapsed = Date.now() - otpSentTime.getTime();
    const cooldown = 30000; // 30 seconds
    const remaining = Math.max(0, cooldown - elapsed);

    return Math.ceil(remaining / 1000);
  };

  const canRetry = getRetryCountdown() === 0;

  // If authenticated, App.tsx will handle navigation to AppNavigator
  if (isAuthenticated) {
    return null; // Let App.tsx handle the authenticated state
  }

  return (
    <View style={styles.container}>
      {/* Auto OTP Capture Component */}
      <AutoOTPComponent />

      <Card padding="lg">
        <Text style={styles.title}>Welcome to InvoicePe</Text>
        <Text style={styles.subtitle}>
          {step === 'phone'
            ? 'Enter your phone number to get started'
            : Platform.OS === 'android' && isCapturing
            ? 'We\'re automatically detecting your OTP...'
            : 'Enter the OTP sent to your phone'
          }
        </Text>

        {step === 'otp' && Platform.OS === 'android' && (
          <Text style={styles.autoOtpHint}>
            📱 Auto-detection enabled for faster login
          </Text>
        )}

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
                title={loading ? 'Resending...' : canRetry ? 'Resend OTP' : `Resend in ${getRetryCountdown()}s`}
                variant="outline"
                onPress={handleRetryOTP}
                disabled={loading || !canRetry}
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
  autoOtpHint: {
    fontSize: 14,
    color: colors.text.secondary,
    textAlign: 'center',
    marginTop: spacing.sm,
    fontStyle: 'italic',
  },
});
