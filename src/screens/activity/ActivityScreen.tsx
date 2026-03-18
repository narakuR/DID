import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  SafeAreaView,
  ScrollView,
} from 'react-native';
import { BarChart } from 'react-native-gifted-charts';
import { History } from 'lucide-react-native';

import { MOCK_ACTIVITY_LOGS, MOCK_GRAPH_DATA } from '@/constants/mockData';
import { ActivityLog } from '@/types';
import { useTheme } from '@/hooks/useTheme';
import { COLORS } from '@/constants/colors';
import ActivityLogItem from '@/components/ActivityLogItem';

type Filter = 'ALL' | 'PRESENTED' | 'RECEIVED' | 'REVOKED';

const FILTERS: { key: Filter; label: string; color: string }[] = [
  { key: 'ALL', label: 'All', color: COLORS.euBlue },
  { key: 'PRESENTED', label: 'Presented', color: COLORS.status.info },
  { key: 'RECEIVED', label: 'Received', color: COLORS.status.active },
  { key: 'REVOKED', label: 'Revoked', color: COLORS.status.error },
];

export default function ActivityScreen() {
  const { colors, isDark } = useTheme();
  const [activeFilter, setActiveFilter] = useState<Filter>('ALL');

  const maxValue = Math.max(...MOCK_GRAPH_DATA.map((d) => d.value));

  const chartData = MOCK_GRAPH_DATA.map((d) => ({
    value: d.value,
    label: d.day,
    frontColor: d.value === maxValue ? COLORS.euBlue : (isDark ? '#374151' : '#D1D5DB'),
    topLabelComponent: d.value === maxValue
      ? () => <Text style={{ color: COLORS.euBlue, fontSize: 10, fontWeight: '700' }}>{d.value}</Text>
      : undefined,
  }));

  const filteredLogs = useMemo<ActivityLog[]>(() => {
    if (activeFilter === 'ALL') return MOCK_ACTIVITY_LOGS;
    return MOCK_ACTIVITY_LOGS.filter((l) => l.action === activeFilter);
  }, [activeFilter]);

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: colors.background }]}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.pageHeader}>
          <Text style={[styles.pageTitle, { color: colors.text }]}>Activity</Text>
        </View>

        {/* Chart section */}
        <View style={[styles.chartCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.chartHeader}>
            <Text style={[styles.chartTitle, { color: colors.text }]}>Weekly Disclosures</Text>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>+12%</Text>
            </View>
          </View>
          <BarChart
            data={chartData}
            barWidth={28}
            spacing={14}
            roundedTop
            roundedBottom
            hideRules
            xAxisThickness={0}
            yAxisThickness={0}
            yAxisTextStyle={{ color: colors.textSecondary, fontSize: 10 }}
            xAxisLabelTextStyle={{ color: colors.textSecondary, fontSize: 10 }}
            noOfSections={4}
            maxValue={Math.ceil(maxValue / 4) * 4}
            height={120}
            width={300}
          />
        </View>

        {/* Filter buttons */}
        <View style={styles.filterRow}>
          {FILTERS.map(({ key, label, color }) => {
            const isActive = activeFilter === key;
            return (
              <TouchableOpacity
                key={key}
                style={[
                  styles.filterButton,
                  isActive
                    ? { backgroundColor: color }
                    : { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
                ]}
                onPress={() => setActiveFilter(key)}
              >
                <Text
                  style={[
                    styles.filterLabel,
                    { color: isActive ? '#FFFFFF' : colors.textSecondary },
                  ]}
                >
                  {label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Activity log list */}
        {filteredLogs.length > 0 ? (
          <View style={[styles.logCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {filteredLogs.map((log) => (
              <ActivityLogItem key={log.id} log={log} />
            ))}
          </View>
        ) : (
          <View style={styles.emptyState}>
            <History color={colors.textSecondary} size={48} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No activity found</Text>
            <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
              Credential activity will appear here
            </Text>
          </View>
        )}

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  pageHeader: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },
  pageTitle: {
    fontSize: 28,
    fontWeight: '700',
  },
  chartCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    overflow: 'hidden',
  },
  chartHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  badge: {
    backgroundColor: '#10B981',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 16,
  },
  filterButton: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 10,
    alignItems: 'center',
  },
  filterLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  logCard: {
    marginHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  emptyState: {
    paddingTop: 60,
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
  },
});
