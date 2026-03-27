import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import { ArrowLeft, CheckCircle, RefreshCw } from 'lucide-react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { useWalletWriteStore } from '@/store/walletWriteStore';
import { RootStackParamList } from '@/navigation/types';
import { CONFIG } from '@/constants/config';
import { useTheme } from '@/hooks/useTheme';
import { COLORS } from '@/constants/colors';
import LoadingOverlay from '@/components/LoadingOverlay';
import { useDocumentStore } from '@/wallet-core/domain/DocumentStore';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type Route = RouteProp<RootStackParamList, 'Renewal'>;

type RenewalState = 'idle' | 'processing' | 'success';

export default function RenewalScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { colors } = useTheme();
  const updateCredential = useWalletWriteStore((s) => s.updateCredential);
  const credential = useDocumentStore((s) => s.getDocument(route.params.credentialId)?.credential);

  const [state, setState] = useState<RenewalState>('idle');
  const [newExpiryYear, setNewExpiryYear] = useState<number | null>(null);

  if (!credential) {
    return (
      <SafeAreaView style={[styles.screen, { backgroundColor: colors.background }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <ArrowLeft color={colors.text} size={24} />
        </TouchableOpacity>
        <Text style={{ color: colors.text }}>Credential not found.</Text>
      </SafeAreaView>
    );
  }

  async function handleRenew() {
    setState('processing');
    await new Promise((r) => setTimeout(r, 2500));

    const newExpiry = new Date(credential!.expirationDate);
    newExpiry.setFullYear(newExpiry.getFullYear() + CONFIG.RENEWAL_YEARS);
    const newExpiryDate = newExpiry.toISOString();
    const year = newExpiry.getFullYear();

    await updateCredential(credential!.id, {
      expirationDate: newExpiryDate,
      status: 'active',
    });

    setNewExpiryYear(year);
    setState('success');
  }

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: colors.background }]}>
      {state === 'processing' && <LoadingOverlay message="Processing renewal…" />}

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <ArrowLeft color={colors.text} size={24} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>Renewal</Text>
        <View style={styles.backButton} />
      </View>

      {state === 'idle' && (
        <View style={styles.content}>
          <RefreshCw color={COLORS.euBlue} size={56} />
          <Text style={[styles.heading, { color: colors.text }]}>
            {credential.visual?.title ?? 'Credential'} Renewal
          </Text>
          <Text style={[styles.expiryLabel, { color: COLORS.status.error }]}>
            Current expiry: {new Date(credential.expirationDate).toLocaleDateString()}
          </Text>
          <Text style={[styles.desc, { color: colors.textSecondary }]}>
            Renewing will extend the expiration date by {CONFIG.RENEWAL_YEARS} years.
          </Text>
          <TouchableOpacity style={styles.renewButton} onPress={handleRenew}>
            <Text style={styles.renewButtonText}>Renew Now</Text>
          </TouchableOpacity>
        </View>
      )}

      {state === 'success' && (
        <View style={styles.content}>
          <CheckCircle color={COLORS.status.active} size={72} />
          <Text style={[styles.heading, { color: colors.text }]}>Renewal Successful!</Text>
          <Text style={[styles.desc, { color: colors.textSecondary }]}>
            Your credential is now valid until {newExpiryYear}.
          </Text>
          <TouchableOpacity
            style={styles.renewButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.renewButtonText}>Done</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  backButton: { width: 40 },
  title: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 20,
    paddingHorizontal: 32,
  },
  heading: {
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
  },
  expiryLabel: {
    fontSize: 15,
    fontWeight: '600',
  },
  desc: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 21,
  },
  renewButton: {
    backgroundColor: COLORS.euBlue,
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 48,
    marginTop: 8,
  },
  renewButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
