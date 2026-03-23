import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { X, Shield, ChevronRight, CheckCircle } from 'lucide-react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { RootStackParamList } from '@/navigation/types';
import { useTheme } from '@/hooks/useTheme';
import { COLORS } from '@/constants/colors';
import CredentialCard from '@/components/CredentialCard';
import { walletProtocolService } from '@/services/walletProtocolService';

type Route = RouteProp<RootStackParamList, 'PresentationConfirm'>;
type Nav = NativeStackNavigationProp<RootStackParamList>;

export default function PresentationConfirmScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { colors } = useTheme();
  const { request } = route.params;

  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function handleConfirm() {
    setLoading(true);
    const result = await walletProtocolService.submitPresentation(request.presentationId);
    setLoading(false);

    if (result.type === 'presentation_sent') {
      setDone(true);
      setTimeout(() => navigation.navigate('Main'), 1500);
    } else if (result.type === 'error') {
      Alert.alert('Presentation failed', result.message);
    }
  }

  function handleCancel() {
    navigation.goBack();
  }

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleCancel} style={styles.headerButton}>
          <X color={colors.text} size={24} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Share Credentials</Text>
        <View style={styles.headerButton} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Verifier info */}
        <View style={[styles.verifierCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Shield color={COLORS.euBlue} size={32} />
          <View style={styles.verifierInfo}>
            <Text style={[styles.verifierLabel, { color: colors.textSecondary }]}>Requesting party</Text>
            <Text style={[styles.verifierName, { color: colors.text }]} numberOfLines={2}>
              {request.verifier}
            </Text>
          </View>
        </View>

        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Credentials to share
        </Text>
        <Text style={[styles.sectionDesc, { color: colors.textSecondary }]}>
          The following credentials and fields will be shared with the verifier.
        </Text>

        {/* Matched credentials */}
        {request.matches.map((match, i) => (
          <View key={`${match.queryId}-${i}`} style={styles.matchItem}>
            <CredentialCard credential={match.credential} />
            {match.disclosedClaims.length > 0 && (
              <View style={[styles.claimsBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[styles.claimsTitle, { color: colors.textSecondary }]}>
                  Fields being shared:
                </Text>
                {match.disclosedClaims.map((claim) => (
                  <View key={claim} style={styles.claimRow}>
                    <ChevronRight color={COLORS.euBlue} size={14} />
                    <Text style={[styles.claimName, { color: colors.text }]}>{claim}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        ))}
      </ScrollView>

      {/* Bottom action */}
      <View style={[styles.footer, { borderTopColor: colors.border }]}>
        {done ? (
          <View style={styles.successRow}>
            <CheckCircle color={COLORS.status.active} size={24} />
            <Text style={[styles.successText, { color: colors.text }]}>Shared successfully</Text>
          </View>
        ) : (
          <>
            <TouchableOpacity
              style={[styles.cancelBtn, { borderColor: colors.border }]}
              onPress={handleCancel}
              disabled={loading}
            >
              <Text style={[styles.cancelBtnText, { color: colors.text }]}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.shareBtn, { opacity: loading ? 0.7 : 1 }]}
              onPress={handleConfirm}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.shareBtnText}>Share</Text>
              )}
            </TouchableOpacity>
          </>
        )}
      </View>
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
  headerButton: { width: 40 },
  headerTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: '700',
    textAlign: 'center',
  },
  content: {
    padding: 20,
    gap: 16,
    paddingBottom: 32,
  },
  verifierCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    borderRadius: 16,
    borderWidth: 1,
    padding: 18,
  },
  verifierInfo: { flex: 1 },
  verifierLabel: { fontSize: 12, marginBottom: 4 },
  verifierName: { fontSize: 15, fontWeight: '600' },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginTop: 4 },
  sectionDesc: { fontSize: 13, marginTop: -8 },
  matchItem: { gap: 8 },
  claimsBox: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    gap: 6,
  },
  claimsTitle: { fontSize: 12, marginBottom: 4 },
  claimRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  claimName: { fontSize: 13 },
  footer: {
    flexDirection: 'row',
    gap: 12,
    padding: 20,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  cancelBtn: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    alignItems: 'center',
  },
  cancelBtnText: { fontSize: 15, fontWeight: '600' },
  shareBtn: {
    flex: 2,
    backgroundColor: COLORS.euBlue,
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shareBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
  successRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  successText: { fontSize: 15, fontWeight: '600' },
});
