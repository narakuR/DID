import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  I18nManager,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { Delete } from 'lucide-react-native';
import { useTheme } from '@/hooks/useTheme';
import { COLORS } from '@/constants/colors';

interface PinPadProps {
  value: string;
  onChange: (value: string) => void;
  onComplete: (pin: string) => void;
  maxLength?: number;
  hasError?: boolean;
}

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del'];

export default function PinPad({
  value,
  onChange,
  onComplete,
  maxLength = 6,
  hasError = false,
}: PinPadProps) {
  const { colors } = useTheme();
  const shakeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (hasError) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Animated.sequence([
        Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
      ]).start();
    }
  }, [hasError]);

  function handleKey(key: string) {
    if (key === 'del') {
      onChange(value.slice(0, -1));
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      return;
    }
    if (!key) return;
    if (value.length >= maxLength) return;
    const next = value + key;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onChange(next);
    if (next.length === maxLength) {
      onComplete(next);
    }
  }

  return (
    <View style={styles.container}>
      {/* Dot indicator */}
      <Animated.View
        style={[
          styles.dots,
          { transform: [{ translateX: shakeAnim }] },
        ]}
      >
        {Array.from({ length: maxLength }).map((_, i) => (
          <View
            key={i}
            style={[
              styles.dot,
              {
                backgroundColor:
                  i < value.length
                    ? (hasError ? COLORS.status.error : COLORS.euBlue)
                    : colors.border,
              },
            ]}
          />
        ))}
      </Animated.View>

      {/* Digit grid */}
      <View style={[styles.grid, I18nManager.isRTL && styles.gridRTL]}>
        {KEYS.map((key, index) => {
          if (!key) {
            return <View key={`empty-${index}`} style={styles.key} />;
          }
          return (
            <TouchableOpacity
              key={key}
              style={[styles.key, styles.keyButton, { backgroundColor: colors.surface }]}
              onPress={() => handleKey(key)}
              activeOpacity={0.7}
            >
              {key === 'del' ? (
                <Delete color={colors.text} size={20} />
              ) : (
                <Text style={[styles.keyText, { color: colors.text }]}>{key}</Text>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: 32,
  },
  dots: {
    flexDirection: 'row',
    gap: 16,
  },
  dot: {
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    width: 264,
    gap: 8,
  },
  gridRTL: {
    flexDirection: 'row-reverse',
  },
  key: {
    width: 80,
    height: 72,
  },
  keyButton: {
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  keyText: {
    fontSize: 24,
    fontWeight: '400',
  },
});
