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

import { useWalletStore } from '@/store/walletStore';
import { getCredentialStatus } from '@/utils/credentialUtils';
import { AppNotification } from '@/types';
import { RootStackParamList } from '@/navigation/types';
import { useTheme } from '@/hooks/useTheme';
import NotificationItem from '@/components/NotificationItem';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export default function NotificationsScreen() {
  const navigation = useNavigation<Nav>();
  const { colors } = useTheme();
  const credentials = useWalletStore((s) => s.credentials);

  const notifications = useMemo<AppNotification[]>(() => {
    const list: AppNotification[] = [];
    for (const c of credentials) {
      const s = getCredentialStatus(c);
      const name = c.visual?.title ?? c.type[0];
      if (s.isRevoked) {
        list.push({
          id: `revoked-${c.id}`,
          type: 'error',
          title: `${name} has been revoked`,
          description: 'This credential is no longer valid.',
          credentialId: c.id,
          credentialName: name,
        });
      } else if (s.isExpired) {
        list.push({
          id: `expired-${c.id}`,
          type: 'error',
          title: `${name} has expired`,
          description: `This credential expired on ${new Date(c.expirationDate).toLocaleDateString()}. Renew it to continue using it.`,
          credentialId: c.id,
          credentialName: name,
        });
      } else if (s.isNearExpiry) {
        list.push({
          id: `near-${c.id}`,
          type: 'warning',
          title: `${name} expiring soon`,
          description: `This credential expires in ${s.daysUntilExpiry} days. Consider renewing it.`,
          credentialId: c.id,
          credentialName: name,
        });
      }
    }
    return list;
  }, [credentials]);

  function handleRenew(credentialId: string) {
    navigation.navigate('Renewal', { credentialId });
  }

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <ArrowLeft color={colors.text} size={24} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>Notifications</Text>
        <View style={styles.backButton} />
      </View>

      <FlatList
        data={notifications}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <NotificationItem notification={item} onRenew={handleRenew} />
        )}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Bell color={colors.textSecondary} size={48} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No notifications</Text>
            <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
              Your credentials are all up to date
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
