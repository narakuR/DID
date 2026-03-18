import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, I18nManager } from 'react-native';
import { AlertCircle, AlertTriangle, CheckCircle, Info } from 'lucide-react-native';
import { AppNotification } from '@/types';
import { useTheme } from '@/hooks/useTheme';
import { COLORS } from '@/constants/colors';

interface NotificationItemProps {
  notification: AppNotification;
  onRenew?: (credentialId: string) => void;
}

export default function NotificationItem({ notification, onRenew }: NotificationItemProps) {
  const { colors } = useTheme();
  const { icon, color } = getTypeStyle(notification.type);

  return (
    <View style={[styles.container, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={[styles.iconWrap, { backgroundColor: color + '18' }]}>
        {icon}
      </View>
      <View style={styles.content}>
        <Text style={[styles.title, { color: colors.text }]}>{notification.title}</Text>
        <Text style={[styles.desc, { color: colors.textSecondary }]}>{notification.description}</Text>
        {notification.type === 'warning' && notification.credentialId && onRenew ? (
          <TouchableOpacity
            style={[styles.renewButton, { borderColor: color }]}
            onPress={() => onRenew(notification.credentialId!)}
          >
            <Text style={[styles.renewText, { color }]}>Renew</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
}

function getTypeStyle(type: string) {
  switch (type) {
    case 'error':
      return { icon: <AlertCircle color={COLORS.status.error} size={20} />, color: COLORS.status.error };
    case 'warning':
      return { icon: <AlertTriangle color={COLORS.status.warning} size={20} />, color: COLORS.status.warning };
    case 'success':
      return { icon: <CheckCircle color={COLORS.status.active} size={20} />, color: COLORS.status.active };
    default:
      return { icon: <Info color={COLORS.status.info} size={20} />, color: COLORS.status.info };
  }
}

const styles = StyleSheet.create({
  container: {
    flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row',
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    gap: 12,
    marginHorizontal: 16,
    marginBottom: 10,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    gap: 4,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
  },
  desc: {
    fontSize: 13,
    lineHeight: 18,
  },
  renewButton: {
    alignSelf: 'flex-start',
    marginTop: 6,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
  },
  renewText: {
    fontSize: 13,
    fontWeight: '600',
  },
});
