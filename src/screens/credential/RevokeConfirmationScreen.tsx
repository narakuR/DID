import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Animated,
} from 'react-native';
import { ArrowLeft, AlertTriangle, Fingerprint, CheckCircle } from 'lucide-react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as Haptics from 'expo-haptics';

import { useWalletStore } from '@/store/walletStore';
import { biometricService } from '@/services/biometricService';
import { RootStackParamList } from '@/navigation/types';
import { useTheme } from '@/hooks/useTheme';
import { COLORS } from '@/constants/colors';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type Route = RouteProp<RootStackParamList, 'RevokeConfirmation'>;

type RevokeStep = 'confirm' | 'auth' | 'success';

export default function RevokeConfirmationScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { colors } = useTheme();
  const getCredential = useWalletStore((s) => s.getCredential);
  const revokeCredential = useWalletStore((s) => s.revokeCredential);

  const credential = getCredential(route.params.credentialId);
  const [step, setStep] = useState<RevokeStep>('confirm');
  const bioOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (step === 'auth') {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(bioOpacity, { toValue: 0.3, duration: 600, useNativeDriver: true }),
          Animated.timing(bioOpacity, { toValue: 1, duration: 600, useNativeDriver: true }),
        ])
      );
      loop.start();
      triggerBio(loop);
      return () => loop.stop();
    }
  }, [step]);

  async function triggerBio(loop: Animated.CompositeAnimation) {
    const success = await biometricService.authenticate('Verify identity to revoke credential');
    loop.stop();
    if (success) {
      await revokeCredential(credential!.id);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setStep('success');
    } else {
      setStep('confirm');
    }
  }

  if (!credential) {
    return (
      <SafeAreaView style={[styles.screen, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.text }}>Credential not found.</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => {
            if (step !== 'success') navigation.goBack();
          }}
          style={styles.backButton}
        >
          {step !== 'success' && <ArrowLeft color={colors.text} size={24} />}
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>Revoke Credential</Text>
        <View style={styles.backButton} />
      </View>

      {step === 'confirm' && (
        <View style={styles.content}>
          <View style={[styles.iconWrap, { backgroundColor: COLORS.status.error + '15' }]}>
            <AlertTriangle color={COLORS.status.error} size={48} />
          </View>
          <Text style={[styles.heading, { color: colors.text }]}>Revoke Credential?</Text>
          <Text style={[styles.desc, { color: colors.textSecondary }]}>
            You are about to revoke "{credential.visual?.title}". This action cannot be undone.
            The credential will no longer be valid.
          </Text>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: COLORS.status.error }]}
            onPress={() => setStep('auth')}
          >
            <Text style={styles.actionButtonText}>Revoke Credential</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }]}
            onPress={() => navigation.goBack()}
          >
            <Text style={[styles.actionButtonText, { color: colors.text }]}>Cancel</Text>
          </TouchableOpacity>
        </View>
      )}

      {step === 'auth' && (
        <View style={styles.content}>
          <Animated.View style={{ opacity: bioOpacity }}>
            <Fingerprint color={COLORS.euBlue} size={72} />
          </Animated.View>
          <Text style={[styles.heading, { color: colors.text }]}>Verify Identity</Text>
          <Text style={[styles.desc, { color: colors.textSecondary }]}>
            Authenticate to confirm credential revocation.
          </Text>
        </View>
      )}

      {step === 'success' && (
        <View style={styles.content}>
          <CheckCircle color={COLORS.status.active} size={72} />
          <Text style={[styles.heading, { color: colors.text }]}>Credential Revoked</Text>
          <Text style={[styles.desc, { color: colors.textSecondary }]}>
            "{credential.visual?.title}" has been successfully revoked.
          </Text>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: COLORS.euBlue }]}
            onPress={() => {
              navigation.navigate('Main');
            }}
          >
            <Text style={styles.actionButtonText}>Back to Wallet</Text>
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
  iconWrap: {
    width: 96,
    height: 96,
    borderRadius: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  heading: {
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
  },
  desc: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 21,
  },
  actionButton: {
    width: '100%',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
