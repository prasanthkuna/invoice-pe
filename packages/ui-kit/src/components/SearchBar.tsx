import React from 'react';
import { View, TextInput, StyleSheet, TouchableOpacity, Text } from 'react-native';
import { colors, typography, spacing, radius } from '../tokens';

interface SearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  onFilter?: () => void;
  showFilter?: boolean;
  editable?: boolean;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  value,
  onChangeText,
  placeholder = 'Search vendors...',
  onFilter,
  showFilter = false,
  editable = true,
}) => (
  <View style={styles.container}>
    <View style={styles.searchContainer}>
      <TextInput
        style={styles.input}
        placeholder={placeholder}
        placeholderTextColor={colors.grey[600]}
        value={value}
        onChangeText={onChangeText}
        editable={editable}
      />
    </View>
    {showFilter && onFilter && (
      <TouchableOpacity style={styles.filterButton} onPress={onFilter}>
        <Text style={styles.filterText}>Filter</Text>
      </TouchableOpacity>
    )}
  </View>
);

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  searchContainer: {
    flex: 1,
  },
  input: {
    ...typography.body,
    backgroundColor: colors.grey[800],
    borderWidth: 1,
    borderColor: colors.grey[600],
    borderRadius: radius.default,
    padding: spacing.md,
    color: colors.white,
  },
  filterButton: {
    backgroundColor: colors.primary[500],
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderRadius: radius.default,
  },
  filterText: {
    ...typography.body,
    color: colors.white,
    fontWeight: '600',
  },
});
