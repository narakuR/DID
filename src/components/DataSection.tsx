import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Copy } from 'lucide-react-native';
import { useTheme } from '@/hooks/useTheme';
import { COLORS } from '@/constants/colors';

interface DataRowProps {
  label: string;
  value: string;
  copiable?: boolean;
  monospace?: boolean;
  highlighted?: boolean;
}

export function DataRow({ label, value, copiable = false, monospace = false, highlighted = false }: DataRowProps) {
  const { colors } = useTheme();

  async function handleCopy() {
    await Clipboard.setStringAsync(value);
  }

  return (
    <View style={styles.row}>
      <Text style={[styles.label, { color: colors.textSecondary }]}>{label}</Text>
      <View style={styles.valueContainer}>
        <Text
          style={[
            styles.value,
            monospace && styles.monospace,
            highlighted && { color: COLORS.status.error },
            !highlighted && { color: colors.text },
          ]}
          numberOfLines={copiable ? 1 : undefined}
        >
          {value}
        </Text>
        {copiable ? (
          <TouchableOpacity onPress={handleCopy} style={styles.copyButton}>
            <Copy color={colors.textSecondary} size={14} />
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
}

interface DataSectionProps {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}

export function DataSection({ icon, title, children }: DataSectionProps) {
  const { colors } = useTheme();

  return (
    <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.sectionHeader}>
        {icon}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>{title}</Text>
      </View>
      <View style={styles.sectionContent}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0,0,0,0.08)',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  sectionContent: {
    padding: 14,
    gap: 12,
  },
  row: {
    gap: 4,
  },
  label: {
    fontSize: 11,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  valueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  value: {
    fontSize: 14,
    flex: 1,
  },
  monospace: {
    fontFamily: 'monospace',
    fontSize: 12,
  },
  copyButton: {
    padding: 4,
  },
});
