import React, { useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import { ArrowLeft, Bell } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { useNotificationStore } from '@/store/notificationStore';
import { PushNotificationRecord } from '@/types';
import { RootStackParamList } from '@/navigation/types';
import { useTheme } from '@/hooks/useTheme';
import NotificationItem from '@/components/NotificationItem';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export default function NotificationsScreen() {
  const navigation = useNavigation<Nav>();
  const { colors } = useTheme();
  const notifications = useNotificationStore((s) => s.notifications);
  const markAllAsRead = useNotificationStore((s) => s.markAllAsRead);

  const sortedNotifications = useMemo<PushNotificationRecord[]>(
    () =>
      [...notifications].sort(
        (left, right) => new Date(right.receivedAt).getTime() - new Date(left.receivedAt).getTime()
      ),
    [notifications]
  );

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <ArrowLeft color={colors.text} size={24} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>Notifications</Text>
        <TouchableOpacity onPress={() => void markAllAsRead()} style={styles.markAllButton}>
          <Text style={[styles.markAllText, { color: colors.textSecondary }]}>Mark all read</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={sortedNotifications}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <NotificationItem notification={item} />
        )}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Bell color={colors.textSecondary} size={48} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No notifications</Text>
            <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
              Firebase or local demo notifications will appear here
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  backButton: {
    width: 40,
  },
  markAllButton: {
    minWidth: 90,
    alignItems: 'flex-end',
  },
  markAllText: {
    fontSize: 13,
    fontWeight: '500',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
  },
  listContent: {
    paddingTop: 8,
    paddingBottom: 32,
  },
  emptyState: {
    paddingTop: 80,
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
