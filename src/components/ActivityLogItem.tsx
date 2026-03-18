import React from 'react';
import { View, Text, StyleSheet, I18nManager } from 'react-native';
import { ArrowUpRight, ArrowDownLeft, Trash2 } from 'lucide-react-native';
import { ActivityLog } from '@/types';
import { useTheme } from '@/hooks/useTheme';
import { COLORS } from '@/constants/colors';
import { useTranslation } from '@/hooks/useTranslation';

interface ActivityLogItemProps {
  log: ActivityLog;
}

export default function ActivityLogItem({ log }: ActivityLogItemProps) {
  const { colors } = useTheme();
  const { t } = useTranslation();

  const { icon, color, label } = getActionStyle(log.action, t);

  const timestamp = new Date(log.timestamp);
  const timeStr = timestamp.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <View style={[styles.container, { borderBottomColor: colors.border }]}>
      <View style={[styles.iconCircle, { backgroundColor: color + '20' }]}>
        {icon}
      </View>
      <View style={styles.content}>
        <Text style={[styles.institution, { color: colors.text }]} numberOfLines={1}>
          {log.institution}
        </Text>
        <Text style={[styles.credential, { color: colors.textSecondary }]} numberOfLines={1}>
          {log.credentialName}
        </Text>
        <Text style={[styles.action, { color: color }]}>{label}</Text>
      </View>
      <Text style={[styles.time, { color: colors.textSecondary }]}>{timeStr}</Text>
    </View>
  );
}

function getActionStyle(action: string, t: (key: string, opts?: object) => string) {
  switch (action) {
    case 'PRESENTED':
      return {
        icon: <ArrowUpRight color={COLORS.status.info} size={18} />,
        color: COLORS.status.info,
        label: 'Presented',
      };
    case 'RECEIVED':
      return {
        icon: <ArrowDownLeft color={COLORS.status.active} size={18} />,
        color: COLORS.status.active,
        label: 'Received',
      };
    case 'REVOKED':
      return {
        icon: <Trash2 color={COLORS.status.error} size={18} />,
        color: COLORS.status.error,
        label: 'Revoked',
      };
    default:
      return {
        icon: <ArrowUpRight color={COLORS.status.info} size={18} />,
        color: COLORS.status.info,
        label: action,
      };
  }
}

const styles = StyleSheet.create({
  container: {
    flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    gap: 2,
  },
  institution: {
    fontSize: 14,
    fontWeight: '600',
  },
  credential: {
    fontSize: 12,
  },
  action: {
    fontSize: 12,
    fontWeight: '500',
  },
  time: {
    fontSize: 11,
    textAlign: I18nManager.isRTL ? 'left' : 'right',
  },
});
