import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import { Fingerprint, ShieldCheck, RotateCcw } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

import { useAuthStore } from '@/store/authStore';
import { useWalletStore } from '@/store/walletStore';
import { biometricService } from '@/services/biometricService';
import { useTheme } from '@/hooks/useTheme';
import { COLORS } from '@/constants/colors';
import PinPad from '@/components/PinPad';

export default function LockScreen() {
  const { user, unlockWallet, logout } = useAuthStore();
  const { clearWallet } = useWalletStore();
  const { colors } = useTheme();

  const [pin, setPin] = useState('');
  const [hasError, setHasError] = useState(false);
  const [bioFailed, setBioFailed] = useState(false);

  const authMethod = user?.authMethod ?? 'BIO';

  useEffect(() => {
    if (authMethod === 'BIO') {
      triggerBiometric();
    }
  }, []);

  async function triggerBiometric() {
    const success = await biometricService.authenticate('Authenticate to unlock your wallet');
    if (success) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      unlockWallet();
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setBioFailed(true);
    }
  }

  async function handlePinComplete(enteredPin: string) {
    const correct = await biometricService.verifyPin(enteredPin);
    if (correct) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      unlockWallet();
    } else {
      setHasError(true);
      setTimeout(() => {
        setHasError(false);
        setPin('');
      }, 600);
    }
  }

  async function handleResetWallet() {
    await clearWallet();
    await logout();
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <ShieldCheck color={COLORS.euBlue} size={48} />
        <Text style={[styles.title, { color: colors.text }]}>Wallet Locked</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          {authMethod === 'BIO' ? 'Authenticate to unlock your wallet' : 'Enter your PIN'}
        </Text>
      </View>

      {authMethod === 'PIN' ? (
        <PinPad
          value={pin}
          onChange={setPin}
          onComplete={handlePinComplete}
          hasError={hasError}
        />
      ) : (
        <View style={styles.bioSection}>
          <TouchableOpacity
            style={[styles.bioButton, { backgroundColor: COLORS.euBlue }]}
            onPress={triggerBiometric}
            activeOpacity={0.8}
          >
            <Fingerprint color="#FFFFFF" size={28} />
            <Text style={styles.bioButtonText}>Use Biometric</Text>
          </TouchableOpacity>

          {/* Show reset option after bio failure so user is never fully locked out */}
          {bioFailed && (
            <TouchableOpacity
              style={[styles.resetButton, { borderColor: colors.border }]}
              onPress={handleResetWallet}
              activeOpacity={0.7}
            >
              <RotateCcw color={colors.textSecondary} size={16} />
              <Text style={[styles.resetText, { color: colors.textSecondary }]}>
                Reset Wallet
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 48,
    paddingHorizontal: 32,
  },
  header: {
    alignItems: 'center',
    gap: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 15,
    textAlign: 'center',
  },
  bioSection: {
    alignItems: 'center',
    gap: 16,
  },
  bioButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 28,
    paddingVertical: 16,
    borderRadius: 14,
  },
  bioButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 8,
  },
  resetText: {
    fontSize: 14,
  },
});
