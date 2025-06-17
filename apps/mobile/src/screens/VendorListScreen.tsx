import React, { useState } from 'react';
import { View, FlatList, StyleSheet, Alert } from 'react-native';
import {
  VendorCard,
  SearchBar,
  LoadingSpinner,
  EmptyState,
  Button,
  colors,
  spacing,
} from '@invoicepe/ui-kit';
import { useVendors } from '../hooks/useVendors';
import type { Vendor } from '@invoicepe/types';

interface VendorListScreenProps {
  navigation: any;
}

export const VendorListScreen: React.FC<VendorListScreenProps> = ({ navigation }) => {
  const { vendors, loading, error, deleteVendor } = useVendors();
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredVendors, setFilteredVendors] = useState<Vendor[]>([]);

  React.useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredVendors(vendors);
    } else {
      const lowercaseQuery = searchQuery.toLowerCase();
      const filtered = vendors.filter(vendor =>
        vendor.name.toLowerCase().includes(lowercaseQuery) ||
        vendor.vendor_categories?.name.toLowerCase().includes(lowercaseQuery) ||
        vendor.phone?.toLowerCase().includes(lowercaseQuery) ||
        vendor.upi_id?.toLowerCase().includes(lowercaseQuery)
      );
      setFilteredVendors(filtered);
    }
  }, [vendors, searchQuery]);

  const handleDeleteVendor = (vendor: Vendor) => {
    Alert.alert(
      'Delete Vendor',
      `Are you sure you want to delete ${vendor.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteVendor(vendor.id);
              Alert.alert('Success', 'Vendor deleted successfully');
            } catch (error) {
              Alert.alert('Error', error instanceof Error ? error.message : 'Failed to delete vendor');
            }
          },
        },
      ]
    );
  };

  const renderVendor = ({ item }: { item: Vendor }) => (
    <VendorCard
      vendor={item}
      onPress={() => navigation.navigate('VendorDetail', { vendor: item })}
      onEdit={() => navigation.navigate('EditVendor', { vendor: item })}
      onDelete={() => handleDeleteVendor(item)}
    />
  );

  if (loading) {
    return <LoadingSpinner message="Loading vendors..." />;
  }

  if (error) {
    return (
      <View style={styles.container}>
        <EmptyState
          title="Error"
          message={error}
          actionText="Retry"
          onAction={() => {/* Retry logic */}}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <SearchBar
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search vendors..."
        />
        <Button
          title="Add Vendor"
          onPress={() => navigation.navigate('AddVendor')}
        />
      </View>

      {filteredVendors.length === 0 ? (
        <EmptyState
          title={searchQuery ? 'No Results' : 'No Vendors'}
          message={
            searchQuery
              ? 'No vendors match your search criteria'
              : 'Start by adding your first vendor'
          }
          actionText={searchQuery ? undefined : 'Add Vendor'}
          onAction={searchQuery ? undefined : () => navigation.navigate('AddVendor')}
        />
      ) : (
        <FlatList
          data={filteredVendors}
          renderItem={renderVendor}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.list}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.grey[900],
    padding: spacing.md,
  },
  header: {
    marginBottom: spacing.md,
  },
  list: {
    paddingBottom: spacing.xl,
  },
});
