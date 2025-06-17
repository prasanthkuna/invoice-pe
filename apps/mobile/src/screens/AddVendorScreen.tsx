import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
import {
  InputField,
  CategoryPicker,
  Button,
  LoadingSpinner,
  colors,
  spacing,
} from '@invoicepe/ui-kit';
import { useVendors } from '../hooks/useVendors';
import { useCategories } from '../hooks/useCategories';
import type { VendorCategory, VendorRequest } from '@invoicepe/types';

interface AddVendorScreenProps {
  navigation: any;
}

export const AddVendorScreen: React.FC<AddVendorScreenProps> = ({ navigation }) => {
  const { createVendor } = useVendors();
  const { categories, loading: categoriesLoading } = useCategories();
  
  const [formData, setFormData] = useState<VendorRequest>({
    name: '',
    category_id: '',
    upi_id: '',
    bank_account: '',
    phone: '',
  });
  const [selectedCategory, setSelectedCategory] = useState<VendorCategory | undefined>();
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Vendor name is required';
    }

    if (!selectedCategory) {
      newErrors.category = 'Category is required';
    }

    if (formData.phone && !/^[6-9]\d{9}$/.test(formData.phone)) {
      newErrors.phone = 'Enter a valid 10-digit phone number';
    }

    if (formData.upi_id && !/^[\w.-]+@[\w.-]+$/.test(formData.upi_id)) {
      newErrors.upi_id = 'Enter a valid UPI ID';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      await createVendor({
        ...formData,
        category_id: selectedCategory!.id,
      });
      
      Alert.alert('Success', 'Vendor added successfully', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to add vendor');
    } finally {
      setLoading(false);
    }
  };

  const handleCategorySelect = (category: VendorCategory) => {
    setSelectedCategory(category);
    setFormData(prev => ({ ...prev, category_id: category.id }));
    if (errors.category) {
      setErrors(prev => ({ ...prev, category: '' }));
    }
  };

  if (categoriesLoading) {
    return <LoadingSpinner message="Loading categories..." />;
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.form} showsVerticalScrollIndicator={false}>
        <InputField
          label="Vendor Name *"
          placeholder="Enter vendor name"
          value={formData.name}
          onChangeText={(text) => {
            setFormData(prev => ({ ...prev, name: text }));
            if (errors.name) setErrors(prev => ({ ...prev, name: '' }));
          }}
        />
        {errors.name && <Text style={styles.error}>{errors.name}</Text>}

        <CategoryPicker
          categories={categories}
          selectedCategory={selectedCategory}
          onSelect={handleCategorySelect}
          placeholder="Select Category *"
        />
        {errors.category && <Text style={styles.error}>{errors.category}</Text>}

        <InputField
          label="UPI ID"
          placeholder="example@upi"
          value={formData.upi_id}
          onChangeText={(text) => {
            setFormData(prev => ({ ...prev, upi_id: text }));
            if (errors.upi_id) setErrors(prev => ({ ...prev, upi_id: '' }));
          }}
        />
        {errors.upi_id && <Text style={styles.error}>{errors.upi_id}</Text>}

        <InputField
          label="Bank Account"
          placeholder="Account number or details"
          value={formData.bank_account}
          onChangeText={(text) => setFormData(prev => ({ ...prev, bank_account: text }))}
        />

        <InputField
          label="Phone Number"
          placeholder="10-digit phone number"
          value={formData.phone}
          onChangeText={(text) => {
            setFormData(prev => ({ ...prev, phone: text }));
            if (errors.phone) setErrors(prev => ({ ...prev, phone: '' }));
          }}
          keyboardType="phone-pad"
        />
        {errors.phone && <Text style={styles.error}>{errors.phone}</Text>}
      </ScrollView>

      <View style={styles.actions}>
        <Button
          title="Cancel"
          variant="secondary"
          onPress={() => navigation.goBack()}
          disabled={loading}
        />
        <Button
          title={loading ? 'Adding...' : 'Add Vendor'}
          onPress={handleSubmit}
          disabled={loading}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.grey[900],
  },
  form: {
    flex: 1,
    padding: spacing.md,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.md,
    paddingTop: 0,
  },
  error: {
    color: colors.error[500],
    fontSize: 12,
    marginTop: -spacing.sm,
    marginBottom: spacing.sm,
  },
});
