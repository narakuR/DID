import React, { useState, useMemo, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  SafeAreaView,
  LayoutAnimation,
  UIManager,
  Platform,
  Animated,
} from 'react-native';
import { Bell, Plus, ChevronDown, ChevronUp } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { useWalletStore } from '@/store/walletStore';
import { useAuthStore } from '@/store/authStore';
import { RootStackParamList } from '@/navigation/types';
import { VerifiableCredential, IssuerType } from '@/types';
import { getCredentialStatus } from '@/utils/credentialUtils';
import { useTheme } from '@/hooks/useTheme';
import { COLORS } from '@/constants/colors';
import SearchBar from '@/components/SearchBar';
import FilterChips from '@/components/FilterChips';
import CredentialCard from '@/components/CredentialCard';
import AlphaIndex from '@/components/AlphaIndex';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

type Nav = NativeStackNavigationProp<RootStackParamList>;

const FILTERS = ['All', ...Object.values(IssuerType)];

export default function WalletHomeScreen() {
  const navigation = useNavigation<Nav>();
  const { colors } = useTheme();
  const credentials = useWalletStore((s) => s.credentials);
  const user = useAuthStore((s) => s.user);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('All');
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  const listRef = useRef<FlatList<any>>(null);

  // Notification badge count
  const badgeCount = useMemo(() => {
    return credentials.filter((c) => {
      const s = getCredentialStatus(c);
      return s.isExpired || s.isNearExpiry || s.isRevoked;
    }).length;
  }, [credentials]);

  // Filtered credentials
  const filteredCredentials = useMemo(() => {
    let list = credentials;
    if (selectedFilter !== 'All') {
      list = list.filter((c) => c.issuer.type === selectedFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (c) =>
          c.visual?.title?.toLowerCase().includes(q) ||
          c.visual?.description?.toLowerCase().includes(q) ||
          c.issuer.name.toLowerCase().includes(q)
      );
    }
    return list;
  }, [credentials, selectedFilter, searchQuery]);

  // Grouped credentials (only when no search)
  const groupedCredentials = useMemo(() => {
    if (searchQuery.trim()) return null;
    const groups: Record<string, VerifiableCredential[]> = {};
    for (const c of filteredCredentials) {
      const key = c.issuer.type;
      if (!groups[key]) groups[key] = [];
      groups[key].push(c);
    }
    return groups;
  }, [filteredCredentials, searchQuery]);

  // Alpha index active letters
  const activeLetters = useMemo(() => {
    const letters = new Set<string>();
    for (const c of filteredCredentials) {
      const first = (c.visual?.title ?? c.type[0])?.[0]?.toUpperCase();
      if (first) letters.add(first);
    }
    return letters;
  }, [filteredCredentials]);

  function toggleGroup(type: string) {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(type)) {
        next.delete(type);
      } else {
        next.add(type);
      }
      return next;
    });
  }

  function handleAlphaPress(letter: string) {
    const idx = filteredCredentials.findIndex(
      (c) => (c.visual?.title ?? c.type[0])?.[0]?.toUpperCase() === letter
    );
    if (idx >= 0) {
      listRef.current?.scrollToIndex({ index: idx, animated: true });
      setHighlightedId(filteredCredentials[idx].id);
      setTimeout(() => setHighlightedId(null), 1500);
    }
  }

  const filterLabels = useMemo(
    () => ['All', ...Object.keys(IssuerType).map((k) => IssuerType[k as keyof typeof IssuerType])],
    []
  );

  // Build flat list items for grouped mode
  type ListItem =
    | { type: 'header'; groupType: string }
    | { type: 'credential'; credential: VerifiableCredential };

  const listData: ListItem[] = useMemo(() => {
    if (searchQuery.trim() || !groupedCredentials) {
      return filteredCredentials.map((c) => ({ type: 'credential' as const, credential: c }));
    }
    const items: ListItem[] = [];
    for (const [groupType, creds] of Object.entries(groupedCredentials)) {
      items.push({ type: 'header', groupType });
      if (!collapsedGroups.has(groupType)) {
        for (const c of creds) {
          items.push({ type: 'credential', credential: c });
        }
      }
    }
    return items;
  }, [groupedCredentials, filteredCredentials, collapsedGroups, searchQuery]);

  function renderItem({ item }: { item: ListItem }) {
    if (item.type === 'header') {
      const isCollapsed = collapsedGroups.has(item.groupType);
      return (
        <TouchableOpacity
          style={[styles.groupHeader, { borderBottomColor: colors.border }]}
          onPress={() => toggleGroup(item.groupType)}
        >
          <Text style={[styles.groupTitle, { color: colors.textSecondary }]}>
            {item.groupType}
          </Text>
          {isCollapsed ? (
            <ChevronDown color={colors.textSecondary} size={16} />
          ) : (
            <ChevronUp color={colors.textSecondary} size={16} />
          )}
        </TouchableOpacity>
      );
    }

    const { credential } = item;
    const isHighlighted = credential.id === highlightedId;

    return (
      <TouchableOpacity
        style={[
          styles.cardWrapper,
          isHighlighted && styles.highlighted,
        ]}
        onPress={() =>
          navigation.navigate('CredentialDetail', { credentialId: credential.id })
        }
        activeOpacity={0.85}
      >
        <CredentialCard credential={credential} showStatus />
      </TouchableOpacity>
    );
  }

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={[styles.screenTitle, { color: colors.text }]}>My Wallet</Text>
          <Text style={[styles.welcomeText, { color: colors.textSecondary }]}>
            Welcome back, {user?.nickname ?? 'User'}
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => navigation.navigate('Notifications')}
          style={styles.bellButton}
        >
          <Bell color={colors.text} size={24} />
          {badgeCount > 0 ? (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{badgeCount}</Text>
            </View>
          ) : null}
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <SearchBar
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search credentials…"
        />
      </View>

      {/* Filter chips */}
      <FilterChips
        options={filterLabels}
        selected={selectedFilter}
        onSelect={setSelectedFilter}
      />

      {/* List */}
      <View style={styles.listContainer}>
        <FlatList
          ref={listRef}
          data={listData}
          keyExtractor={(item, index) =>
            item.type === 'header' ? `header-${item.groupType}` : item.credential.id
          }
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          onScrollToIndexFailed={() => {}}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={[styles.emptyTitle, { color: colors.text }]}>No credentials found</Text>
              <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                Try adjusting your search or filter
              </Text>
            </View>
          }
        />

        {/* Alpha Index */}
        {!searchQuery && (
          <AlphaIndex activeLetters={activeLetters} onLetterPress={handleAlphaPress} />
        )}
      </View>

      {/* FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('Issuance')}
        activeOpacity={0.8}
      >
        <Plus color="#FFFFFF" size={24} />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },
  screenTitle: {
    fontSize: 28,
    fontWeight: '700',
  },
  welcomeText: {
    fontSize: 14,
    marginTop: 2,
  },
  bellButton: {
    position: 'relative',
    padding: 4,
  },
  badge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: '#EF4444',
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 3,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '700',
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingBottom: 10,
  },
  listContainer: {
    flex: 1,
    position: 'relative',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 100,
    gap: 12,
  },
  groupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    marginBottom: 4,
  },
  groupTitle: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  cardWrapper: {
    borderRadius: 16,
  },
  highlighted: {
    shadowColor: COLORS.euBlue,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 8,
  },
  emptyState: {
    paddingTop: 80,
    alignItems: 'center',
    gap: 8,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  emptySubtitle: {
    fontSize: 14,
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.euBlue,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: COLORS.euBlue,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
});
