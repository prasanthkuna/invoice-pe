import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, StyleSheet } from 'react-native';
import { useSupabaseAuth } from '../hooks/useSupabaseAuth';

/**
 * Simple component to test the useSupabaseAuth hook
 * Add this to any screen to test authentication
 */
export const AuthTestComponent: React.FC = () => {
  const [phone, setPhone] = useState('+919008393030');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  
  const { signInWithPhone, verifyOtp, user, loading, signOut } = useSupabaseAuth();

  const handleSendOTP = async () => {
    try {
      const result = await signInWithPhone(phone);
      if (result.success) {
        Alert.alert('Success', 'OTP sent! Check your phone.');
        setStep('otp');
      } else {
        Alert.alert('Error', result.message);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to send OTP');
    }
  };

  const handleVerifyOTP = async () => {
    try {
      const result = await verifyOtp(phone, otp);
      if (result.success) {
        Alert.alert('Success', 'Authentication successful!');
        setStep('phone');
        setOtp('');
      } else {
        Alert.alert('Error', result.message);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to verify OTP');
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      Alert.alert('Success', 'Signed out successfully');
      setStep('phone');
      setOtp('');
    } catch (error) {
      Alert.alert('Error', 'Failed to sign out');
    }
  };

  if (user) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>✅ Authentication Test - SUCCESS!</Text>
        <Text style={styles.info}>User ID: {user.id}</Text>
        <Text style={styles.info}>Phone: {user.phone}</Text>
        <Text style={styles.info}>Business: {user.business_name || 'Not set'}</Text>
        
        <TouchableOpacity style={styles.button} onPress={handleSignOut}>
          <Text style={styles.buttonText}>Sign Out</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🧪 Authentication Test</Text>
      
      {step === 'phone' ? (
        <>
          <Text style={styles.label}>Phone Number:</Text>
          <TextInput
            style={styles.input}
            value={phone}
            onChangeText={setPhone}
            placeholder="+919008393030"
            keyboardType="phone-pad"
          />
          
          <TouchableOpacity 
            style={[styles.button, loading && styles.buttonDisabled]} 
            onPress={handleSendOTP}
            disabled={loading}
          >
            <Text style={styles.buttonText}>
              {loading ? 'Sending...' : 'Send OTP'}
            </Text>
          </TouchableOpacity>
        </>
      ) : (
        <>
          <Text style={styles.label}>Enter OTP sent to {phone}:</Text>
          <TextInput
            style={styles.input}
            value={otp}
            onChangeText={setOtp}
            placeholder="123456"
            keyboardType="numeric"
            maxLength={6}
          />
          
          <TouchableOpacity 
            style={[styles.button, loading && styles.buttonDisabled]} 
            onPress={handleVerifyOTP}
            disabled={loading}
          >
            <Text style={styles.buttonText}>
              {loading ? 'Verifying...' : 'Verify OTP'}
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.button, styles.secondaryButton]} 
            onPress={() => setStep('phone')}
          >
            <Text style={styles.buttonText}>Back</Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    margin: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  label: {
    fontSize: 16,
    marginBottom: 8,
    fontWeight: '500',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: 'white',
    marginBottom: 16,
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12,
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  secondaryButton: {
    backgroundColor: '#666',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  info: {
    fontSize: 14,
    marginBottom: 8,
    color: '#333',
  },
});
