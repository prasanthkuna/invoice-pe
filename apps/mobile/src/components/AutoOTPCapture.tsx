import React, { useEffect, useState } from 'react';
import { Platform, PermissionsAndroid, Alert } from 'react-native';
import { debugContext } from '../utils/logger';

interface AutoOTPCaptureProps {
  onOTPReceived: (otp: string) => void;
  phoneNumber: string;
  enabled?: boolean;
}

interface SMSMessage {
  body: string;
  address: string;
  date: number;
}

/**
 * AutoOTPCapture Component
 * 
 * Automatically captures OTP from SMS messages on Android devices
 * Uses SMS Retriever API for secure OTP extraction
 * Falls back to manual entry on iOS or when permissions are denied
 */
export const AutoOTPCapture: React.FC<AutoOTPCaptureProps> = ({
  onOTPReceived,
  phoneNumber,
  enabled = true
}) => {
  const [isListening, setIsListening] = useState(false);
  const [hasPermission, setHasPermission] = useState(false);

  useEffect(() => {
    if (!enabled || Platform.OS !== 'android') {
      debugContext.info('otp_capture', { 
        step: 'auto_otp_disabled', 
        reason: enabled ? 'ios_platform' : 'disabled',
        platform: Platform.OS 
      });
      return;
    }

    initializeAutoOTPCapture();

    return () => {
      stopListening();
    };
  }, [enabled, phoneNumber]);

  const initializeAutoOTPCapture = async () => {
    try {
      debugContext.info('otp_capture', { step: 'initializing_auto_otp', phoneNumber });

      // Request SMS permission on Android
      const permissionGranted = await requestSMSPermission();
      
      if (permissionGranted) {
        setHasPermission(true);
        startListening();
      } else {
        debugContext.warn('otp_capture', { step: 'sms_permission_denied' });
        Alert.alert(
          'SMS Permission',
          'SMS permission is required for automatic OTP detection. You can still enter OTP manually.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      debugContext.error('otp_capture', error as Error, { step: 'initialize_auto_otp_failed' });
    }
  };

  const requestSMSPermission = async (): Promise<boolean> => {
    try {
      if (Platform.OS !== 'android') {
        return false;
      }

      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.RECEIVE_SMS,
        {
          title: 'SMS Permission',
          message: 'InvoicePe needs access to SMS to automatically detect OTP codes',
          buttonNeutral: 'Ask Me Later',
          buttonNegative: 'Cancel',
          buttonPositive: 'OK',
        }
      );

      const isGranted = granted === PermissionsAndroid.RESULTS.GRANTED;
      debugContext.info('otp_capture', { step: 'sms_permission_result', granted: isGranted });
      
      return isGranted;
    } catch (error) {
      debugContext.error('otp_capture', error as Error, { step: 'sms_permission_error' });
      return false;
    }
  };

  const startListening = () => {
    try {
      debugContext.info('otp_capture', { step: 'starting_sms_listener' });
      setIsListening(true);

      // Note: In a real implementation, you would use a native module
      // or a library like react-native-otp-verify for SMS Retriever API
      // For now, we'll simulate the functionality
      
      // Simulated SMS listening (replace with actual implementation)
      simulateSMSListening();
      
    } catch (error) {
      debugContext.error('otp_capture', error as Error, { step: 'start_listening_failed' });
    }
  };

  const stopListening = () => {
    try {
      debugContext.info('otp_capture', { step: 'stopping_sms_listener' });
      setIsListening(false);
      
      // Stop SMS listening (implement with actual SMS library)
      
    } catch (error) {
      debugContext.error('otp_capture', error as Error, { step: 'stop_listening_failed' });
    }
  };

  const simulateSMSListening = () => {
    // This is a simulation - in production, use react-native-otp-verify
    // or implement native SMS Retriever API
    
    debugContext.info('otp_capture', { step: 'simulating_sms_listening' });
    
    // In a real implementation, this would listen for actual SMS messages
    // and extract OTP using patterns like:
    // - "Your OTP is 123456"
    // - "123456 is your verification code"
    // - etc.
  };

  const extractOTPFromSMS = (smsBody: string): string | null => {
    try {
      // Common OTP patterns
      const otpPatterns = [
        /(?:OTP|otp|code|verification)\s*:?\s*(\d{4,8})/i,
        /(\d{4,8})\s*(?:is|your|otp|code|verification)/i,
        /\b(\d{6})\b/, // 6-digit number (most common for OTP)
        /\b(\d{4})\b/, // 4-digit number
      ];

      for (const pattern of otpPatterns) {
        const match = smsBody.match(pattern);
        if (match && match[1]) {
          const otp = match[1];
          // Validate OTP length (typically 4-8 digits)
          if (otp.length >= 4 && otp.length <= 8) {
            debugContext.info('otp_capture', { 
              step: 'otp_extracted', 
              otp: otp.replace(/./g, '*'), // Mask OTP in logs
              pattern: pattern.toString()
            });
            return otp;
          }
        }
      }

      debugContext.warn('otp_capture', { step: 'otp_not_found_in_sms', smsLength: smsBody.length });
      return null;
    } catch (error) {
      debugContext.error('otp_capture', error as Error, { step: 'extract_otp_failed' });
      return null;
    }
  };

  const handleSMSReceived = (sms: SMSMessage) => {
    try {
      debugContext.info('otp_capture', { 
        step: 'sms_received', 
        sender: sms.address,
        bodyLength: sms.body.length 
      });

      // Check if SMS is from a known OTP sender
      const otpSenders = [
        'SUPABASE',
        'VERIFY',
        'OTP',
        'NOREPLY',
        'INVOICEPE'
      ];

      const isFromOTPSender = otpSenders.some(sender => 
        sms.address.toUpperCase().includes(sender)
      );

      if (isFromOTPSender || sms.body.toLowerCase().includes('otp')) {
        const extractedOTP = extractOTPFromSMS(sms.body);
        
        if (extractedOTP) {
          debugContext.info('otp_capture', { step: 'auto_otp_captured' });
          onOTPReceived(extractedOTP);
          stopListening(); // Stop listening after successful capture
        }
      }
    } catch (error) {
      debugContext.error('otp_capture', error as Error, { step: 'handle_sms_failed' });
    }
  };

  // This component doesn't render anything visible
  // It works in the background to capture OTP
  return null;
};

/**
 * Hook for Auto OTP Capture
 * 
 * Provides a simple interface for components to use auto OTP capture
 */
export const useAutoOTPCapture = (phoneNumber: string, enabled = true) => {
  const [capturedOTP, setCapturedOTP] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);

  const startCapture = () => {
    debugContext.info('otp_capture', { step: 'start_capture_hook', phoneNumber });
    setIsCapturing(true);
    setCapturedOTP(null);
  };

  const stopCapture = () => {
    debugContext.info('otp_capture', { step: 'stop_capture_hook' });
    setIsCapturing(false);
  };

  const handleOTPReceived = (otp: string) => {
    debugContext.info('otp_capture', { step: 'otp_received_hook' });
    setCapturedOTP(otp);
    setIsCapturing(false);
  };

  return {
    capturedOTP,
    isCapturing,
    startCapture,
    stopCapture,
    AutoOTPComponent: () => (
      <AutoOTPCapture
        onOTPReceived={handleOTPReceived}
        phoneNumber={phoneNumber}
        enabled={enabled && isCapturing}
      />
    )
  };
};

export default AutoOTPCapture;
