import React from 'react';
import { View, Text, StyleSheet, I18nManager } from 'react-native';
import { AlertCircle, AlertTriangle, CheckCircle, Info } from 'lucide-react-native';
import { PushNotificationRecord } from '@/types';
import { useTheme } from '@/hooks/useTheme';
import { COLORS } from '@/constants/colors';

interface NotificationItemProps {
  notification: PushNotificationRecord;
}

export default function NotificationItem({ notification }: NotificationItemProps) {
  const { colors } = useTheme();
  const { icon, color } = getCategoryStyle(notification.category);

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: colors.card, borderColor: notification.isRead ? colors.border : color },
      ]}
    >
      <View style={[styles.iconWrap, { backgroundColor: color + '18' }]}>
        {icon}
      </View>
      <View style={styles.content}>
        <Text style={[styles.title, { color: colors.text }]}>{notification.title}</Text>
        <Text style={[styles.desc, { color: colors.textSecondary }]}>{notification.body}</Text>
        <Text style={[styles.meta, { color: colors.textSecondary }]}>
          {new Date(notification.receivedAt).toLocaleString()}
        </Text>
      </View>
    </View>
  );
}

function getCategoryStyle(category: string) {
  switch (category) {
    case 'CREDENTIAL_REVOKED':
      return { icon: <AlertCircle color={COLORS.status.error} size={20} />, color: COLORS.status.error };
    case 'CREDENTIAL_EXPIRY':
      return { icon: <AlertTriangle color={COLORS.status.warning} size={20} />, color: COLORS.status.warning };
    case 'CREDENTIAL_ISSUED':
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
  meta: {
    fontSize: 11,
    marginTop: 6,
  },
});
