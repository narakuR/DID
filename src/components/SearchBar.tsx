import React from 'react';
import { View, TextInput, TouchableOpacity, StyleSheet, I18nManager } from 'react-native';
import { Search, X } from 'lucide-react-native';
import { useTheme } from '@/hooks/useTheme';

interface SearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
}

export default function SearchBar({ value, onChangeText, placeholder }: SearchBarProps) {
  const { colors } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.input, borderColor: colors.border }]}>
      <Search color={colors.placeholder} size={18} style={styles.icon} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder ?? 'Search…'}
        placeholderTextColor={colors.placeholder}
        style={[styles.input, { color: colors.text }]}
        autoCorrect={false}
        autoCapitalize="none"
        clearButtonMode="never"
      />
      {value.length > 0 ? (
        <TouchableOpacity onPress={() => onChangeText('')} style={styles.clear}>
          <X color={colors.placeholder} size={16} />
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row',
    alignItems: 'center',
    borderRadius: 24,
    borderWidth: 1,
    paddingHorizontal: 14,
    height: 44,
  },
  icon: {
    marginEnd: 8,
  },
  input: {
    flex: 1,
    fontSize: 15,
  },
  clear: {
    marginStart: 8,
    padding: 2,
  },
});
