import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
} from 'react-native';
import {
  X,
  Building2,
  GraduationCap,
  Heart,
  Banknote,
  Bus,
  Briefcase,
  Shield,
  Plane,
  MoreHorizontal,
  CheckCircle,
} from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { useWalletStore } from '@/store/walletStore';
import { MOCK_CREDENTIALS } from '@/constants/mockData';
import { RootStackParamList } from '@/navigation/types';
import { IssuerType, VerifiableCredential } from '@/types';
import { useTheme } from '@/hooks/useTheme';
import { COLORS } from '@/constants/colors';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const CATEGORIES = [
  { type: IssuerType.GOVERNMENT, label: 'Government ID', icon: Building2, color: '#003399' },
  { type: IssuerType.EDUCATION, label: 'Education', icon: GraduationCap, color: '#6366F1' },
  { type: IssuerType.HEALTH, label: 'Health', icon: Heart, color: '#EF4444' },
  { type: IssuerType.FINANCIAL, label: 'Financial', icon: Banknote, color: '#10B981' },
  { type: IssuerType.TRANSPORT, label: 'Transport', icon: Bus, color: '#64748B' },
  { type: IssuerType.EMPLOYMENT, label: 'Employment', icon: Briefcase, color: '#F59E0B' },
  { type: IssuerType.IDENTITY, label: 'Identity', icon: Shield, color: '#8B5CF6' },
  { type: IssuerType.TRAVEL, label: 'Travel', icon: Plane, color: '#0EA5E9' },
  { type: 'OTHER', label: 'Other', icon: MoreHorizontal, color: '#6B7280' },
];

const ISSUANCE_STEPS = ['connecting', 'authenticating', 'issuing', 'success'] as const;
const STEP_LABELS: Record<string, string> = {
  connecting: 'Connecting to issuer…',
  authenticating: 'Authenticating…',
  issuing: 'Issuing credential…',
  success: 'Credential issued!',
};
const STEP_DURATIONS = { connecting: 1500, authenticating: 1500, issuing: 2000, success: 1500 };

export default function IssuanceScreen() {
  const navigation = useNavigation<Nav>();
  const { colors } = useTheme();
  const { addCredential } = useWalletStore();

  const [flowing, setFlowing] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  async function handleCategoryPress(type: string) {
    setFlowing(true);
    setCurrentStep(0);

    for (let i = 0; i < ISSUANCE_STEPS.length; i++) {
      setCurrentStep(i);
      await new Promise((r) => setTimeout(r, STEP_DURATIONS[ISSUANCE_STEPS[i]]));
    }

    // Add a new credential based on category
    const template = MOCK_CREDENTIALS.find((c) => c.issuer.type === type) ?? MOCK_CREDENTIALS[0];
    const newCredential: VerifiableCredential = {
      ...template,
      id: `urn:uuid:issued-${Date.now()}`,
      issuanceDate: new Date().toISOString(),
      expirationDate: new Date(Date.now() + 5 * 365 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'active',
    };
    await addCredential(newCredential);

    await new Promise((r) => setTimeout(r, 1500));
    setFlowing(false);
    navigation.navigate('Main');
  }

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <X color={colors.text} size={24} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>Add Credential</Text>
        <View style={{ width: 24 }} />
      </View>

      <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
        Select a credential type to add
      </Text>

      <ScrollView contentContainerStyle={styles.grid}>
        {CATEGORIES.map(({ type, label, icon: Icon, color }) => (
          <TouchableOpacity
            key={type}
            style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => handleCategoryPress(type)}
            disabled={flowing}
          >
            <View style={[styles.iconCircle, { backgroundColor: color + '20' }]}>
              <Icon color={color} size={28} />
            </View>
            <Text style={[styles.cardLabel, { color: colors.text }]}>{label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Issuance flow overlay */}
      {flowing && (
        <View style={styles.overlay}>
          <View style={[styles.flowCard, { backgroundColor: colors.card }]}>
            <Text style={[styles.flowTitle, { color: colors.text }]}>Issuing Credential</Text>
            {ISSUANCE_STEPS.map((step, i) => {
              const isDone = i < currentStep;
              const isCurrent = i === currentStep;
              return (
                <View key={step} style={[styles.flowStep, { opacity: i > currentStep ? 0.4 : 1 }]}>
                  <View style={[styles.stepDot, {
                    backgroundColor: isDone ? COLORS.status.active : isCurrent ? COLORS.euBlue : colors.border,
                  }]}>
                    {isDone ? <CheckCircle color="#FFFFFF" size={14} /> : (
                      <Text style={styles.stepNum}>{i + 1}</Text>
                    )}
                  </View>
                  <Text style={[styles.stepLabel, { color: isCurrent ? colors.text : colors.textSecondary }]}>
                    {STEP_LABELS[step]}
                  </Text>
                </View>
              );
            })}
          </View>
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
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 14,
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    gap: 12,
    paddingBottom: 32,
  },
  card: {
    width: '47%',
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
    alignItems: 'center',
    gap: 12,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardLabel: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  flowCard: {
    borderRadius: 20,
    padding: 28,
    width: '85%',
    gap: 18,
  },
  flowTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  flowStep: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  stepDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepNum: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  stepLabel: {
    fontSize: 14,
  },
});
