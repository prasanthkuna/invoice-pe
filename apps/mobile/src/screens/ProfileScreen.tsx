import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
import {
  Card,
  InputField,
  Button,
  colors,
  spacing,
  typography,
} from '@invoicepe/ui-kit';
import { useSupabaseAuth } from '../hooks/useSupabaseAuth';

export const ProfileScreen: React.FC = () => {
  const { user, signOut } = useSupabaseAuth();
  const [businessName, setBusinessName] = useState(user?.business_name || '');
  const [gstin, setGstin] = useState(user?.gstin || '');
  const [loading, setLoading] = useState(false);

  const handleUpdateProfile = async () => {
    setLoading(true);
    try {
      // TODO: Implement profile update API call
      Alert.alert('Success', 'Profile updated successfully');
    } catch {
      Alert.alert('Error', 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Logout', style: 'destructive', onPress: signOut },
      ]
    );
  };

  return (
    <ScrollView style={styles.container}>
      <Card padding="lg">
        <Text style={styles.title}>Profile Information</Text>
        
        <View style={styles.section}>
          <Text style={styles.label}>Phone Number</Text>
          <Text style={styles.value}>{user?.phone}</Text>
        </View>

        <InputField
          label="Business Name"
          placeholder="Enter your business name"
          value={businessName}
          onChangeText={setBusinessName}
        />

        <InputField
          label="GSTIN"
          placeholder="Enter your GSTIN (optional)"
          value={gstin}
          onChangeText={setGstin}
        />

        <Button
          title={loading ? 'Updating...' : 'Update Profile'}
          onPress={handleUpdateProfile}
          disabled={loading}
        />
      </Card>

      <Card padding="lg">
        <Text style={styles.title}>Account Actions</Text>
        
        <Button
          title="Logout"
          variant="secondary"
          onPress={handleLogout}
        />
      </Card>

      <Card padding="lg">
        <Text style={styles.title}>App Information</Text>
        
        <View style={styles.section}>
          <Text style={styles.label}>Version</Text>
          <Text style={styles.value}>1.0.0</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Build</Text>
          <Text style={styles.value}>Phase 5 - Payment Integration</Text>
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
    ...typography.h2,
    color: colors.white,
    marginBottom: spacing.lg,
  },
  section: {
    marginBottom: spacing.md,
  },
  label: {
    ...typography.body,
    color: colors.grey[600],
    marginBottom: spacing.xs,
  },
  value: {
    ...typography.body,
    color: colors.white,
    fontWeight: '600',
  },
});
