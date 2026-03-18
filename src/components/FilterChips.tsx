import React from 'react';
import { ScrollView, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import { COLORS } from '@/constants/colors';

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
  container: {
    paddingHorizontal: 16,
    gap: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  chip: {
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  label: {
    fontSize: 13,
    fontWeight: '500',
  },
});
