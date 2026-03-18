import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Animated,
  Alert,
} from 'react-native';
import { ArrowLeft, Info, CheckCircle, XCircle, QrCode, X } from 'lucide-react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import QRCode from 'react-native-qrcode-svg';

import { useWalletStore } from '@/store/walletStore';
import { getCredentialStatus } from '@/utils/credentialUtils';
import { RootStackParamList } from '@/navigation/types';
import { MOCK_ACTIVITY_LOGS } from '@/constants/mockData';
import { geminiService } from '@/services/geminiService';
import { biometricService } from '@/services/biometricService';
import { useTheme } from '@/hooks/useTheme';
import { COLORS } from '@/constants/colors';
import CredentialCard from '@/components/CredentialCard';
import { DataSection, DataRow } from '@/components/DataSection';
import ActivityLogItem from '@/components/ActivityLogItem';
import Modal from '@/components/Modal';
import LoadingOverlay from '@/components/LoadingOverlay';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type Route = RouteProp<RootStackParamList, 'CredentialDetail'>;

export default function CredentialDetailScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { colors } = useTheme();
  const getCredential = useWalletStore((s) => s.getCredential);

  // All hooks must be called before any conditional return
  const [aiText, setAiText] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const aiFadeAnim = useRef(new Animated.Value(0)).current;
  const [showQR, setShowQR] = useState(false);
  const [presentLoading, setPresentLoading] = useState(false);
  const [shareModalVisible, setShareModalVisible] = useState(false);
  const [shareCountdown, setShareCountdown] = useState(300);
  const shareTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const credential = getCredential(route.params.credentialId);
  if (!credential) {
    return (
      <SafeAreaView style={[styles.screen, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.text }}>Credential not found.</Text>
      </SafeAreaView>
    );
  }

  const statusInfo = getCredentialStatus(credential);
  const activityLogs = MOCK_ACTIVITY_LOGS.filter((l) => l.credentialId === credential.id);

  async function handleAiExplain() {
    setAiLoading(true);
    const result = await geminiService.explainCredential(credential!);
    setAiText(result);
    setAiLoading(false);
    aiFadeAnim.setValue(0);
    Animated.timing(aiFadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
  }

  async function handlePresent() {
    setPresentLoading(true);
    await new Promise((r) => setTimeout(r, 1500));
    const success = await biometricService.authenticate('Verify identity to present credential');
    setPresentLoading(false);
    if (success) {
      setShowQR(true);
    }
  }

  function handleShare() {
    setShareCountdown(300);
    setShareModalVisible(true);
    shareTimerRef.current = setInterval(() => {
      setShareCountdown((c) => {
        if (c <= 1) {
          clearInterval(shareTimerRef.current!);
          setShareModalVisible(false);
          return 0;
        }
        return c - 1;
      });
    }, 1000);
  }

  function formatCountdown(s: number) {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  }

  function renderClaimsValue(value: unknown, depth = 0): React.ReactNode {
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      return Object.entries(value as Record<string, unknown>).map(([k, v]) => (
        <DataRow key={k} label={k} value={String(v)} />
      ));
    }
    if (Array.isArray(value)) {
      return value.map((v, i) => <DataRow key={i} label={`[${i}]`} value={String(v)} />);
    }
    return null;
  }

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: colors.background }]}>
      {presentLoading && <LoadingOverlay message="Verifying identity…" />}

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerButton}>
          <ArrowLeft color={colors.text} size={24} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>
          {credential.visual?.title ?? 'Credential'}
        </Text>
        <TouchableOpacity style={styles.headerButton}>
          <Info color={colors.text} size={22} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Card */}
        <CredentialCard credential={credential} showStatus />

        {/* Verification status */}
        <View style={[styles.verificationBlock, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {statusInfo.status === 'active' ? (
            <CheckCircle color={COLORS.status.active} size={20} />
          ) : (
            <XCircle color={COLORS.status.error} size={20} />
          )}
          <Text style={[styles.verificationText, { color: colors.text }]}>
            {statusInfo.status === 'active' ? 'Credential Verified' : `Status: ${statusInfo.status.replace('_', ' ').toUpperCase()}`}
          </Text>
        </View>

        {/* Metadata section */}
        <DataSection icon={<Info color={COLORS.euBlue} size={16} />} title="Metadata">
          <DataRow label="Type" value={credential.type.slice(-1)[0]} />
          <DataRow label="Credential ID" value={credential.id} copiable monospace />
          <DataRow label="Issued" value={new Date(credential.issuanceDate).toLocaleDateString()} />
          <DataRow
            label="Expires"
            value={new Date(credential.expirationDate).toLocaleDateString()}
            highlighted={statusInfo.isExpired}
          />
        </DataSection>

        {/* Issuer section */}
        <DataSection icon={<CheckCircle color={COLORS.euBlue} size={16} />} title="Issuer">
          <DataRow label="Name" value={credential.issuer.name} />
          <DataRow label="DID" value={credential.issuer.id} copiable monospace />
          {credential.issuer.country ? (
            <DataRow label="Country" value={credential.issuer.country} />
          ) : null}
        </DataSection>

        {/* Subject section */}
        {credential.credentialSubject.id ? (
          <DataSection icon={<CheckCircle color={COLORS.euBlue} size={16} />} title="Subject">
            <DataRow label="DID" value={credential.credentialSubject.id} copiable monospace />
          </DataSection>
        ) : null}

        {/* Claims section */}
        <DataSection icon={<Info color={COLORS.euBlue} size={16} />} title="Claims">
          {Object.entries(credential.credentialSubject)
            .filter(([k]) => k !== 'id')
            .map(([k, v]) => {
              if (typeof v === 'object' && v !== null) {
                return (
                  <View key={k}>
                    <Text style={[styles.claimsGroupLabel, { color: colors.textSecondary }]}>{k}</Text>
                    {renderClaimsValue(v)}
                  </View>
                );
              }
              return <DataRow key={k} label={k} value={String(v)} />;
            })}
        </DataSection>

        {/* AI Explanation */}
        <View style={[styles.aiCard, { backgroundColor: COLORS.euBlue + '12', borderColor: COLORS.euBlue + '30' }]}>
          <Text style={[styles.aiCardTitle, { color: colors.text }]}>AI Explanation</Text>
          {aiText ? (
            <Animated.Text style={[styles.aiText, { color: colors.text, opacity: aiFadeAnim }]}>
              {aiText}
            </Animated.Text>
          ) : aiLoading ? (
            <Text style={[styles.aiText, { color: colors.textSecondary }]}>Analyzing credential…</Text>
          ) : (
            <TouchableOpacity style={styles.aiButton} onPress={handleAiExplain}>
              <Text style={styles.aiButtonText}>Explain with AI</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Credential History */}
        <View style={[styles.historySection, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.sectionLabel, { color: colors.text }]}>Credential History</Text>
          {activityLogs.length > 0 ? (
            activityLogs.map((log) => <ActivityLogItem key={log.id} log={log} />)
          ) : (
            <Text style={[styles.emptyHistory, { color: colors.textSecondary }]}>
              No activity for this credential
            </Text>
          )}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Action bar */}
      <View style={[styles.actionBar, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
        <TouchableOpacity
          style={[
            styles.actionButton,
            { backgroundColor: COLORS.euBlue },
            (statusInfo.isRevoked || statusInfo.isExpired) && styles.actionDisabled,
          ]}
          onPress={handlePresent}
          disabled={statusInfo.isRevoked || statusInfo.isExpired}
        >
          <QrCode color="#FFFFFF" size={18} />
          <Text style={styles.actionButtonText}>Present</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }]}
          onPress={handleShare}
        >
          <Text style={[styles.actionButtonText, { color: colors.text }]}>Share</Text>
        </TouchableOpacity>

        {!statusInfo.isRevoked && (
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: COLORS.status.error + '18', borderWidth: 1, borderColor: COLORS.status.error + '40' }]}
            onPress={() => navigation.navigate('RevokeConfirmation', { credentialId: credential.id })}
          >
            <Text style={[styles.actionButtonText, { color: COLORS.status.error }]}>Revoke</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* QR Overlay */}
      <Modal visible={showQR} onClose={() => setShowQR(false)}>
        <View style={styles.qrContent}>
          <Text style={[styles.qrTitle, { color: colors.text }]}>Present Credential</Text>
          <View style={[styles.qrCard, { backgroundColor: '#FFFFFF' }]}>
            <QRCode value={credential.id} size={200} />
          </View>
          <TouchableOpacity style={styles.closeQrButton} onPress={() => setShowQR(false)}>
            <Text style={styles.closeQrText}>Close</Text>
          </TouchableOpacity>
        </View>
      </Modal>

      {/* Share Modal */}
      <Modal visible={shareModalVisible} onClose={() => setShareModalVisible(false)}>
        <View style={styles.shareContent}>
          <Text style={[styles.qrTitle, { color: colors.text }]}>Share Credential</Text>
          <Text style={[styles.shareExpiry, { color: colors.textSecondary }]}>
            Link expires in {formatCountdown(shareCountdown)}
          </Text>
          <TouchableOpacity style={[styles.shareButton, { backgroundColor: COLORS.euBlue }]}>
            <Text style={styles.shareButtonText}>Copy Link</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.shareButton, { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }]}>
            <Text style={[styles.shareButtonText, { color: colors.text }]}>Send via Email</Text>
          </TouchableOpacity>
        </View>
      </Modal>
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
    paddingHorizontal: 16,
    paddingTop: 4,
    gap: 12,
  },
  verificationBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  verificationText: {
    fontSize: 14,
    fontWeight: '600',
  },
  claimsGroupLabel: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
    marginTop: 4,
  },
  aiCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    gap: 12,
  },
  aiCardTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  aiText: {
    fontSize: 14,
    lineHeight: 21,
  },
  aiButton: {
    backgroundColor: COLORS.euBlue,
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
  },
  aiButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  historySection: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '700',
    padding: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0,0,0,0.06)',
  },
  emptyHistory: {
    padding: 16,
    fontSize: 13,
    textAlign: 'center',
  },
  actionBar: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    gap: 10,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 6,
  },
  actionDisabled: {
    opacity: 0.4,
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  qrContent: {
    padding: 20,
    alignItems: 'center',
    gap: 20,
  },
  qrTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  qrCard: {
    padding: 20,
    borderRadius: 16,
  },
  closeQrButton: {
    backgroundColor: COLORS.euBlue,
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
  },
  closeQrText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 15,
  },
  shareContent: {
    padding: 20,
    gap: 14,
  },
  shareExpiry: {
    fontSize: 13,
    textAlign: 'center',
  },
  shareButton: {
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
  },
  shareButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 15,
  },
});
