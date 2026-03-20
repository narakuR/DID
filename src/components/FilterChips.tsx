import { COLORS } from '@/constants/colors';
import { useTheme } from '@/hooks/useTheme';
import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity } from 'react-native';

interface FilterChipsProps {
  options: string[];
  selected: string;
  onSelect: (option: string) => void;
}

export default function FilterChips({ options, selected, onSelect }: FilterChipsProps) {
  const { colors } = useTheme();

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.scroll}
      contentContainerStyle={styles.container}
    >
      {options.map((option) => {
        const isSelected = option === selected;
        return (
          <TouchableOpacity
            key={option}
            onPress={() => onSelect(option)}
            style={[
              styles.chip,
              isSelected
                ? { backgroundColor: COLORS.euBlue, borderColor: COLORS.euBlue }
                : { backgroundColor: 'transparent', borderColor: colors.border },
            ]}
            activeOpacity={0.75}
          >
            <Text
              style={[
                styles.label,
                { color: isSelected ? '#FFFFFF' : colors.textSecondary },
              ]}
            >
              {option}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flexGrow: 0,
    flexShrink: 0,
  },
  container: {
    paddingHorizontal: 16,
    paddingVertical: 0,
    gap: 8,
    flexDirection: 'row',
    alignItems: 'center',
    flexGrow: 0,
  },
  chip: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  label: {
    fontSize: 12,
    fontWeight: '500',
    lineHeight: 16,
  },
});
