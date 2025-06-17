import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, FlatList } from 'react-native';
import { colors, spacing, typography } from '../tokens';
import { SearchBar } from './SearchBar';
import type { Vendor } from '@invoicepe/types';

interface VendorPickerProps {
  vendors: Vendor[];
  selectedVendor?: Vendor;
  onSelect: (vendor: Vendor) => void;
  placeholder?: string;
  error?: string;
}

export const VendorPicker: React.FC<VendorPickerProps> = ({
  vendors,
  selectedVendor,
  onSelect,
  placeholder = 'Select a vendor',
  error,
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredVendors = vendors.filter(vendor =>
    vendor.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    vendor.vendor_categories?.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelect = (vendor: Vendor) => {
    onSelect(vendor);
    setIsVisible(false);
    setSearchQuery('');
  };

  const renderVendor = ({ item }: { item: Vendor }) => (
    <TouchableOpacity
      style={styles.vendorItem}
      onPress={() => handleSelect(item)}
    >
      <View style={styles.vendorInfo}>
        <Text style={styles.vendorName}>{item.name}</Text>
        <Text style={styles.vendorCategory}>
          {item.vendor_categories?.name || 'No Category'}
        </Text>
      </View>
      {item.upi_id && (
        <Text style={styles.paymentMethod}>UPI</Text>
      )}
      {item.bank_account && (
        <Text style={styles.paymentMethod}>Bank</Text>
      )}
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[
          styles.picker,
          error && styles.pickerError,
          selectedVendor && styles.pickerSelected,
        ]}
        onPress={() => setIsVisible(true)}
      >
        <View style={styles.pickerContent}>
          {selectedVendor ? (
            <View>
              <Text style={styles.selectedVendorName}>{selectedVendor.name}</Text>
              <Text style={styles.selectedVendorCategory}>
                {selectedVendor.vendor_categories?.name || 'No Category'}
              </Text>
            </View>
          ) : (
            <Text style={styles.placeholder}>{placeholder}</Text>
          )}
        </View>
        <Text style={styles.arrow}>▼</Text>
      </TouchableOpacity>

      {error && <Text style={styles.errorText}>{error}</Text>}

      <Modal
        visible={isVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setIsVisible(false)}
      >
        <View style={styles.modal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select Vendor</Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setIsVisible(false)}
            >
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.searchContainer}>
            <SearchBar
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search vendors..."
            />
          </View>

          <FlatList
            data={filteredVendors}
            renderItem={renderVendor}
            keyExtractor={(item) => item.id}
            style={styles.vendorList}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>
                  {searchQuery ? 'No vendors match your search' : 'No vendors available'}
                </Text>
              </View>
            }
          />
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
  },
  picker: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.grey[800],
    borderWidth: 1,
    borderColor: colors.grey[600],
    borderRadius: 8,
    padding: spacing.md,
    minHeight: 56,
  },
  pickerSelected: {
    borderColor: colors.primary[500],
  },
  pickerError: {
    borderColor: colors.red[500],
  },
  pickerContent: {
    flex: 1,
  },
  selectedVendorName: {
    ...typography.body,
    color: colors.white,
    fontWeight: '600',
  },
  selectedVendorCategory: {
    ...typography.caption,
    color: colors.grey[400],
    marginTop: spacing.xs,
  },
  placeholder: {
    ...typography.body,
    color: colors.grey[500],
  },
  arrow: {
    ...typography.body,
    color: colors.grey[400],
    fontSize: 12,
  },
  errorText: {
    ...typography.caption,
    color: colors.red[400],
    marginTop: spacing.xs,
  },
  modal: {
    flex: 1,
    backgroundColor: colors.grey[900],
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.grey[700],
  },
  modalTitle: {
    ...typography.h2,
    color: colors.white,
  },
  closeButton: {
    padding: spacing.sm,
  },
  closeButtonText: {
    ...typography.h3,
    color: colors.grey[400],
  },
  searchContainer: {
    padding: spacing.md,
  },
  vendorList: {
    flex: 1,
  },
  vendorItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.grey[800],
  },
  vendorInfo: {
    flex: 1,
  },
  vendorName: {
    ...typography.body,
    color: colors.white,
    fontWeight: '600',
  },
  vendorCategory: {
    ...typography.caption,
    color: colors.grey[400],
    marginTop: spacing.xs,
  },
  paymentMethod: {
    ...typography.caption,
    color: colors.primary[400],
    backgroundColor: colors.primary[900],
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 12,
    marginLeft: spacing.sm,
  },
  emptyState: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  emptyText: {
    ...typography.body,
    color: colors.grey[500],
    textAlign: 'center',
  },
});
