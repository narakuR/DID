import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import { COLORS } from '@/constants/colors';

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

interface AlphaIndexProps {
  activeLetters: Set<string>;
  onLetterPress: (letter: string) => void;
}

export default function AlphaIndex({ activeLetters, onLetterPress }: AlphaIndexProps) {
  const { colors } = useTheme();

  return (
    <View style={styles.container}>
      {ALPHABET.map((letter) => {
        const isActive = activeLetters.has(letter);
        return (
          <TouchableOpacity
            key={letter}
            onPress={() => isActive && onLetterPress(letter)}
            disabled={!isActive}
            hitSlop={{ top: 2, bottom: 2, left: 8, right: 8 }}
          >
            <Text
              style={[
                styles.letter,
                { color: isActive ? COLORS.euBlue : colors.textSecondary },
                !isActive && styles.inactive,
              ]}
            >
              {letter}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    right: 4,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 1,
  },
  letter: {
    fontSize: 10,
    fontWeight: '600',
    textAlign: 'center',
    width: 16,
  },
  inactive: {
    opacity: 0.3,
  },
});
