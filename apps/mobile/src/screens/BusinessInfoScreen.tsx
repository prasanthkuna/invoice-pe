import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert, ScrollView } from 'react-native';
import { Button, Card, InputField, colors, spacing } from '@invoicepe/ui-kit';
import { useSupabaseAuth } from '../hooks/useSupabaseAuth';
import { supabaseService } from '../lib/supabase';
import { debugContext } from '../utils/logger';

interface BusinessInfoScreenProps {
  navigation: any;
  route: any;
}

export const BusinessInfoScreen: React.FC<BusinessInfoScreenProps> = ({ navigation }) => {
  const [businessName, setBusinessName] = useState('');
  const [gstin, setGstin] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSkipping, setIsSkipping] = useState(false);
  
  const { user, session } = useSupabaseAuth();

  const validateGSTIN = (gstin: string): boolean => {
    if (!gstin) return true; // GSTIN is optional
    
    // Basic GSTIN validation: 15 characters, alphanumeric
    const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
    return gstinRegex.test(gstin.toUpperCase());
  };

  const handleSave = async () => {
    if (!businessName.trim()) {
      Alert.alert('Error', 'Business name is required');
      return;
    }

    if (gstin && !validateGSTIN(gstin)) {
      Alert.alert('Error', 'Please enter a valid GSTIN (15 characters)');
      return;
    }

    if (!user?.id) {
      Alert.alert('Error', 'User not authenticated');
      return;
    }

    setLoading(true);
    try {
      debugContext.auth({ 
        step: 'updating_business_info', 
        userId: user.id,
        hasBusinessName: !!businessName,
        hasGstin: !!gstin 
      });

      // Update user record with business information
      const { data, error } = await supabaseService.supabase
        .from('users')
        .update({
          business_name: businessName.trim(),
          gstin: gstin.trim().toUpperCase() || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id)
        .select()
        .single();

      if (error) {
        debugContext.error('business_info', error, { 
          step: 'update_failed',
          userId: user.id 
        });
        throw error;
      }

      debugContext.auth({ 
        step: 'business_info_updated_successfully', 
        userId: user.id 
      });

      Alert.alert(
        'Success', 
        'Business information saved successfully!',
        [
          {
            text: 'Continue',
            onPress: () => navigation.replace('AppNavigator')
          }
        ]
      );

    } catch (error) {
      debugContext.error('business_info', error as Error, { 
        step: 'save_business_info_error',
        userId: user.id 
      });
      Alert.alert('Error', 'Failed to save business information. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = async () => {
    setIsSkipping(true);
    try {
      debugContext.auth({ 
        step: 'skipping_business_info', 
        userId: user?.id 
      });

      // Navigate to main app without saving business info
      navigation.replace('AppNavigator');
    } finally {
      setIsSkipping(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <View style={styles.header}>
        <Text style={styles.title}>Business Information</Text>
        <Text style={styles.subtitle}>
          Help us personalize your experience by providing your business details
        </Text>
      </View>

      <Card style={styles.card}>
        <View style={styles.form}>
          <InputField
            label="Business Name *"
            placeholder="Enter your business name"
            value={businessName}
            onChangeText={setBusinessName}
            autoCapitalize="words"
            returnKeyType="next"
          />

          <InputField
            label="GSTIN (Optional)"
            placeholder="Enter your GSTIN"
            value={gstin}
            onChangeText={setGstin}
            autoCapitalize="characters"
            maxLength={15}
            returnKeyType="done"
            onSubmitEditing={handleSave}
          />

          <Text style={styles.helpText}>
            GSTIN is optional but recommended for GST-compliant invoices
          </Text>
        </View>
      </Card>

      <View style={styles.buttonContainer}>
        <Button
          title="Save & Continue"
          onPress={handleSave}
          loading={loading}
          disabled={isSkipping}
          style={styles.saveButton}
        />

        <Button
          title="Skip for Now"
          onPress={handleSkip}
          variant="secondary"
          loading={isSkipping}
          disabled={loading}
          style={styles.skipButton}
        />
      </View>

      <Text style={styles.footerText}>
        You can update this information later in your profile settings
      </Text>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.grey[900],
  },
  contentContainer: {
    flexGrow: 1,
    padding: spacing.lg,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.white,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: colors.grey[400],
    textAlign: 'center',
    lineHeight: 24,
  },
  card: {
    marginBottom: spacing.xl,
  },
  form: {
    gap: spacing.lg,
  },
  helpText: {
    fontSize: 14,
    color: colors.grey[500],
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  buttonContainer: {
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  saveButton: {
    backgroundColor: colors.primary[500],
  },
  skipButton: {
    borderColor: colors.grey[600],
  },
  footerText: {
    fontSize: 12,
    color: colors.grey[600],
    textAlign: 'center',
  },
});
