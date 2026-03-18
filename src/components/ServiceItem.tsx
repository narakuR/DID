import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, I18nManager } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import { ServiceItem as ServiceItemType } from '@/types';
import { useTheme } from '@/hooks/useTheme';

interface ServiceItemProps {
  service: ServiceItemType;
  onPress: (service: ServiceItemType) => void;
}

export default function ServiceItem({ service, onPress }: ServiceItemProps) {
  const { colors } = useTheme();

  const initials = service.name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();

  return (
    <TouchableOpacity
      style={[styles.container, { borderBottomColor: colors.border }]}
      onPress={() => onPress(service)}
      activeOpacity={0.7}
    >
      <View style={[styles.iconCircle, { backgroundColor: service.iconColor }]}>
        <Text style={styles.iconText}>{initials}</Text>
      </View>
      <View style={styles.content}>
        <Text style={[styles.name, { color: colors.text }]}>{service.name}</Text>
        <Text style={[styles.provider, { color: colors.textSecondary }]}>{service.provider}</Text>
        {service.requiredCredentials.length > 0 ? (
          <Text style={[styles.required, { color: colors.textSecondary }]}>
            Required: {service.requiredCredentials.join(', ')}
          </Text>
        ) : null}
      </View>
      <ChevronRight
        color={colors.textSecondary}
        size={18}
        style={I18nManager.isRTL ? { transform: [{ scaleX: -1 }] } : undefined}
      />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  content: {
    flex: 1,
    gap: 2,
  },
  name: {
    fontSize: 15,
    fontWeight: '600',
  },
  provider: {
    fontSize: 12,
  },
  required: {
    fontSize: 11,
    marginTop: 2,
  },
});
