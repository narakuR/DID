import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import type { PendingIssuanceItem } from '@/wallet-core/facade';

interface PendingIssuanceCardProps {
  item: PendingIssuanceItem;
}

export default function PendingIssuanceCard({ item }: PendingIssuanceCardProps) {
  return (
    <View style={styles.wrapper}>
      <LinearGradient
        colors={['#0F3D91', '#2563EB']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.header}>
        <Text style={styles.headerText}>签发中</Text>
        <ActivityIndicator color="#FFFFFF" size="small" />
      </View>
      <View style={styles.body}>
        <Text style={styles.title} numberOfLines={2}>
          {item.title}
        </Text>
        <Text style={styles.subtitle} numberOfLines={1}>
          {item.subtitle ?? '正在等待签发方完成出证'}
        </Text>
      </View>
      <View style={styles.footer}>
        <Text style={styles.issuer} numberOfLines={1}>
          {item.issuerName}
        </Text>
        <Text style={styles.hint}>完成后将自动入卡并提醒你</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    minHeight: 110,
    borderRadius: 16,
    overflow: 'hidden',
    padding: 16,
    justifyContent: 'space-between',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerText: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
  },
  body: {
    gap: 4,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
  },
  subtitle: {
    color: 'rgba(255,255,255,0.78)',
    fontSize: 12,
  },
  footer: {
    gap: 2,
  },
  issuer: {
    color: 'rgba(255,255,255,0.82)',
    fontSize: 12,
    fontWeight: '600',
  },
  hint: {
    color: 'rgba(255,255,255,0.72)',
    fontSize: 11,
  },
});
