import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, FlatList } from 'react-native';
import { colors, typography, spacing, radius } from '../tokens';
import type { VendorCategory } from '@invoicepe/types';

interface CategoryPickerProps {
  categories: VendorCategory[];
  selectedCategory?: VendorCategory;
  onSelect: (category: VendorCategory) => void;
  placeholder?: string;
}

export const CategoryPicker: React.FC<CategoryPickerProps> = ({
  categories,
  selectedCategory,
  onSelect,
  placeholder = 'Select Category',
}) => {
  const [isVisible, setIsVisible] = useState(false);

  const handleSelect = (category: VendorCategory) => {
    onSelect(category);
    setIsVisible(false);
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.picker}
        onPress={() => setIsVisible(true)}
      >
        <Text style={[styles.text, !selectedCategory && styles.placeholder]}>
          {selectedCategory?.name || placeholder}
        </Text>
        <Text style={styles.arrow}>▼</Text>
      </TouchableOpacity>

      <Modal
        visible={isVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsVisible(false)}
      >
        <TouchableOpacity
          style={styles.overlay}
          onPress={() => setIsVisible(false)}
        >
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Select Category</Text>
            <FlatList
              data={categories}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.option,
                    selectedCategory?.id === item.id && styles.selectedOption,
                  ]}
                  onPress={() => handleSelect(item)}
                >
                  <Text
                    style={[
                      styles.optionText,
                      selectedCategory?.id === item.id && styles.selectedText,
                    ]}
                  >
                    {item.name}
                  </Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
  },
  picker: {
    backgroundColor: colors.grey[800],
    borderWidth: 1,
    borderColor: colors.grey[600],
    borderRadius: radius.default,
    padding: spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  text: {
    ...typography.body,
    color: colors.white,
  },
  placeholder: {
    color: colors.grey[600],
  },
  arrow: {
    ...typography.body,
    color: colors.grey[600],
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modal: {
    backgroundColor: colors.grey[800],
    borderRadius: radius.default,
    padding: spacing.lg,
    width: '80%',
    maxHeight: '60%',
  },
  modalTitle: {
    ...typography.h2,
    color: colors.white,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  option: {
    padding: spacing.md,
    borderRadius: spacing.xs,
    marginBottom: spacing.xs,
  },
  selectedOption: {
    backgroundColor: colors.primary[500],
  },
  optionText: {
    ...typography.body,
    color: colors.white,
  },
  selectedText: {
    fontWeight: '600',
  },
});
