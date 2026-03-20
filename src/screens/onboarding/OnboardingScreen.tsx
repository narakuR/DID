import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Animated,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import {
  ShieldCheck,
  Fingerprint,
  KeyRound,
  Cloud,
  CheckCircle,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

import { useAuthStore } from '@/store/authStore';
import { useWalletStore } from '@/store/walletStore';
import { biometricService } from '@/services/biometricService';
import { useTheme } from '@/hooks/useTheme';
import { COLORS } from '@/constants/colors';
import { CONFIG } from '@/constants/config';
import { MOCK_CREDENTIALS } from '@/constants/mockData';
import { AuthMethod, UserProfile } from '@/types';
import { didService } from '@/services/didService';
import PinPad from '@/components/PinPad';
import LoadingOverlay from '@/components/LoadingOverlay';

type Step =
  | 'WELCOME'
  | 'AUTH_SELECT'
  | 'BIO_SETUP'
  | 'PIN_SETUP'
  | 'PHONE'
  | 'RESTORE_PASSWORD'
  | 'RESTORE_PROGRESS'
  | 'SUCCESS';

type PinSubStep = 'enter' | 'confirm';

export default function OnboardingScreen() {
  const { colors } = useTheme();
  const { completeOnboarding, updateCloudSync } = useAuthStore();
  const { restoreWallet, clearWallet } = useWalletStore();

  const [step, setStep] = useState<Step>('WELCOME');
  const [selectedAuth, setSelectedAuth] = useState<AuthMethod>('BIO');
  const [pin, setPin] = useState('');
  const [pinConfirm, setPinConfirm] = useState('');
  const [pinSubStep, setPinSubStep] = useState<PinSubStep>('enter');
  const [pinError, setPinError] = useState(false);
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [resendCountdown, setResendCountdown] = useState(0);
  const [restorePassword, setRestorePassword] = useState('');
  const [progress, setProgress] = useState(0);
  const [progressLabel, setProgressLabel] = useState('');
  const [restored, setRestored] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');

  const fadeAnim = useRef(new Animated.Value(1)).current;
  const cloudBounce = useRef(new Animated.Value(0)).current;
  const bioOpacity = useRef(new Animated.Value(1)).current;

  // Bio pulse animation
  useEffect(() => {
    if (step === 'BIO_SETUP') {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(bioOpacity, { toValue: 0.3, duration: 600, useNativeDriver: true }),
          Animated.timing(bioOpacity, { toValue: 1, duration: 600, useNativeDriver: true }),
        ])
      );
      loop.start();
      const timer = setTimeout(() => {
        loop.stop();
        goTo('PHONE');
      }, 1500);
      return () => {
        clearTimeout(timer);
        loop.stop();
      };
    }
  }, [step]);

  // Cloud bounce animation
  useEffect(() => {
    if (step === 'RESTORE_PASSWORD') {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(cloudBounce, { toValue: -12, duration: 500, useNativeDriver: true }),
          Animated.timing(cloudBounce, { toValue: 0, duration: 500, useNativeDriver: true }),
        ])
      );
      loop.start();
      return () => loop.stop();
    }
  }, [step]);

  // Resend countdown
  useEffect(() => {
    if (resendCountdown > 0) {
      const timer = setTimeout(() => setResendCountdown((c) => c - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCountdown]);

  function goTo(next: Step) {
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 150,
      useNativeDriver: true,
    }).start(() => {
      setStep(next);
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    });
  }

  async function handleAuthSelect(method: AuthMethod) {
    setSelectedAuth(method);
    if (method === 'BIO') {
      const available = await biometricService.isBiometricAvailable();
      if (!available) {
        Alert.alert('Biometric Unavailable', 'This device does not support biometric authentication. Using PIN instead.');
        goTo('PIN_SETUP');
        return;
      }
      goTo('BIO_SETUP');
    } else {
      goTo('PIN_SETUP');
    }
  }

  function handlePinEntered(entered: string) {
    if (pinSubStep === 'enter') {
      setPin(entered);
      setPinSubStep('confirm');
      setPinConfirm('');
    }
  }

  async function handlePinConfirmed(entered: string) {
    if (entered !== pin) {
      setPinError(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setTimeout(() => {
        setPinError(false);
        setPinSubStep('enter');
        setPin('');
        setPinConfirm('');
      }, 600);
    } else {
      await biometricService.savePin(pin);
      goTo('PHONE');
    }
  }

  function handleSendCode() {
    setOtpSent(true);
    setResendCountdown(CONFIG.OTP_RESEND_COOLDOWN_S);
  }

  async function handleOtpVerify() {
    if (otp !== CONFIG.OTP_DEMO_CODE) return;
    setLoadingMessage('Checking for backup…');
    setLoading(true);
    await new Promise((r) => setTimeout(r, 1500));
    setLoading(false);
    goTo('RESTORE_PASSWORD');
  }

  async function handleRestore() {
    goTo('RESTORE_PROGRESS');
    const stages = CONFIG.RESTORE_PROGRESS_STAGES;
    for (const stage of stages) {
      setProgressLabel(stage.label);
      const steps = 20;
      const increment = (stage.to - stage.from) / steps;
      for (let i = 0; i <= steps; i++) {
        await new Promise((r) => setTimeout(r, 50));
        setProgress(stage.from + increment * i);
      }
    }
    await restoreWallet(MOCK_CREDENTIALS);
    await updateCloudSync(true, new Date().toISOString());
    setRestored(true);
    goTo('SUCCESS');
  }

  async function handleSkipRestore() {
    await clearWallet();
    goTo('SUCCESS');
  }

  async function handleEnterWallet() {
    try {
      setLoadingMessage('Generating DID key pair…');
      setLoading(true);

      const didResult = await didService.ensureDIDKeyPair();
      await didService.exportDIDDocumentToDevice();

      const profile: UserProfile = {
        id: `user-${Date.now()}`,
        nickname: 'User',
        phone,
        authMethod: selectedAuth,
        createdAt: new Date().toISOString(),
      };
      await completeOnboarding(profile);

      const locationHint = didService.getPrivateKeyLocationHint(didResult.metadata.keyId);
      Alert.alert(
        'DID 密钥已生成',
        [
          `DID: ${didResult.did}`,
          didResult.isNew ? '公钥 DID 文档已弹出系统分享窗口，可保存到手机“文件”或发送到其他应用。' : '已检测到现有 DID，已重新弹出公钥文档导出窗口。',
          `私钥存储键名：${locationHint.storeKey}`,
          '私钥不会出现在应用界面，也不会作为文件导出。',
        ].join('\n\n'),
        [
          {
            text: '复制私钥键名',
            onPress: () => {
              Clipboard.setStringAsync(locationHint.storeKey);
            },
          },
          {
            text: '输出到控制台',
            onPress: () => {
              void logDidPrivateKeyToConsole(didResult.metadata.keyId);
            },
          },
          { text: '确定' },
        ]
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      Alert.alert('DID 生成失败', message);
    } finally {
      setLoading(false);
    }
  }

  async function logDidPrivateKeyToConsole(keyId: string) {
    try {
      const locationHint = didService.getPrivateKeyLocationHint(keyId);
      const value = await didService.getStoredPrivateKeyValue(keyId);
      console.log('[DID Private Key]', { key: locationHint.storeKey, value });
      Alert.alert('已输出到控制台', '私钥键值对已输出到控制台日志。');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      Alert.alert('读取私钥失败', message);
    }
  }

  const content = () => {
    switch (step) {
      case 'WELCOME':
        return (
          <View style={styles.centered}>
            <ShieldCheck color={COLORS.euBlue} size={80} />
            <Text style={[styles.title, { color: colors.text }]}>EU Digital Wallet</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              Your secure digital identity wallet. Store, manage and present your credentials anywhere.
            </Text>
            <TouchableOpacity style={styles.primaryButton} onPress={() => goTo('AUTH_SELECT')}>
              <Text style={styles.primaryButtonText}>Get Started</Text>
            </TouchableOpacity>
          </View>
        );

      case 'AUTH_SELECT':
        return (
          <View style={styles.centered}>
            <Text style={[styles.title, { color: colors.text }]}>Choose Authentication</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              Select how you want to secure your wallet.
            </Text>
            <View style={styles.optionCards}>
              <TouchableOpacity
                style={[styles.optionCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() => handleAuthSelect('BIO')}
              >
                <Fingerprint color={COLORS.euBlue} size={36} />
                <Text style={[styles.optionTitle, { color: colors.text }]}>Biometric</Text>
                <Text style={[styles.optionDesc, { color: colors.textSecondary }]}>
                  Use Face ID or fingerprint
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.optionCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() => handleAuthSelect('PIN')}
              >
                <KeyRound color={COLORS.euBlue} size={36} />
                <Text style={[styles.optionTitle, { color: colors.text }]}>PIN Code</Text>
                <Text style={[styles.optionDesc, { color: colors.textSecondary }]}>
                  Use a 6-digit PIN
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        );

      case 'BIO_SETUP':
        return (
          <View style={styles.centered}>
            <Animated.View style={{ opacity: bioOpacity }}>
              <Fingerprint color={COLORS.euBlue} size={80} />
            </Animated.View>
            <Text style={[styles.title, { color: colors.text }]}>Set Up Biometric</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              Hold your finger on the sensor or look at the camera.
            </Text>
          </View>
        );

      case 'PIN_SETUP':
        return (
          <View style={styles.centered}>
            <Text style={[styles.title, { color: colors.text }]}>
              {pinSubStep === 'enter' ? 'Create PIN' : 'Confirm PIN'}
            </Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              {pinSubStep === 'enter'
                ? 'Enter a 6-digit PIN to secure your wallet.'
                : 'Re-enter your PIN to confirm.'}
            </Text>
            {pinSubStep === 'enter' ? (
              <PinPad
                value={pin}
                onChange={setPin}
                onComplete={handlePinEntered}
              />
            ) : (
              <PinPad
                value={pinConfirm}
                onChange={setPinConfirm}
                onComplete={handlePinConfirmed}
                hasError={pinError}
              />
            )}
          </View>
        );

      case 'PHONE':
        return (
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.centered}
          >
            <Text style={[styles.title, { color: colors.text }]}>
              {otpSent ? 'Enter Code' : 'Verify Phone'}
            </Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              {otpSent
                ? 'Enter the 6-digit code sent to your phone.'
                : 'Enter your phone number to receive a verification code.'}
            </Text>
            {!otpSent ? (
              <>
                <TextInput
                  style={[styles.textInput, { backgroundColor: colors.input, color: colors.text, borderColor: colors.border }]}
                  value={phone}
                  onChangeText={setPhone}
                  placeholder="+49 123 456 7890"
                  placeholderTextColor={colors.placeholder}
                  keyboardType="phone-pad"
                />
                <TouchableOpacity
                  style={[styles.primaryButton, phone.length < CONFIG.PHONE_MIN_CHARS && styles.buttonDisabled]}
                  onPress={handleSendCode}
                  disabled={phone.length < CONFIG.PHONE_MIN_CHARS}
                >
                  <Text style={styles.primaryButtonText}>Send Code</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <TextInput
                  style={[styles.textInput, { backgroundColor: colors.input, color: colors.text, borderColor: colors.border }]}
                  value={otp}
                  onChangeText={setOtp}
                  placeholder="123456"
                  placeholderTextColor={colors.placeholder}
                  keyboardType="number-pad"
                  maxLength={6}
                />
                <TouchableOpacity
                  style={[styles.primaryButton, otp.length !== 6 && styles.buttonDisabled]}
                  onPress={handleOtpVerify}
                  disabled={otp.length !== 6}
                >
                  <Text style={styles.primaryButtonText}>Verify</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => {
                    setOtpSent(false);
                    setResendCountdown(CONFIG.OTP_RESEND_COOLDOWN_S);
                  }}
                  disabled={resendCountdown > 0}
                >
                  <Text style={[styles.linkText, { color: resendCountdown > 0 ? colors.textSecondary : COLORS.euBlue }]}>
                    {resendCountdown > 0 ? `Resend in ${resendCountdown}s` : 'Resend Code'}
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </KeyboardAvoidingView>
        );

      case 'RESTORE_PASSWORD':
        return (
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.centered}
          >
            <Animated.View style={{ transform: [{ translateY: cloudBounce }] }}>
              <Cloud color={COLORS.euBlue} size={64} />
            </Animated.View>
            <Text style={[styles.title, { color: colors.text }]}>Cloud Backup Found</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              We found a backup from your previous wallet. Restore it now?
            </Text>
            <TextInput
              style={[styles.textInput, { backgroundColor: colors.input, color: colors.text, borderColor: colors.border }]}
              value={restorePassword}
              onChangeText={setRestorePassword}
              placeholder="Backup Password"
              placeholderTextColor={colors.placeholder}
              secureTextEntry
            />
            <TouchableOpacity style={styles.primaryButton} onPress={handleRestore}>
              <Text style={styles.primaryButtonText}>Restore Backup</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleSkipRestore}>
              <Text style={[styles.linkText, { color: colors.textSecondary }]}>Skip restore</Text>
            </TouchableOpacity>
          </KeyboardAvoidingView>
        );

      case 'RESTORE_PROGRESS':
        return (
          <View style={styles.centered}>
            <Text style={[styles.title, { color: colors.text }]}>Restoring Wallet</Text>
            <View style={styles.progressContainer}>
              <View style={[styles.progressTrack, { backgroundColor: colors.border }]}>
                <View style={[styles.progressBar, { width: `${progress}%` }]} />
              </View>
              <Text style={[styles.progressPercent, { color: colors.text }]}>
                {Math.round(progress)}%
              </Text>
            </View>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{progressLabel}</Text>
          </View>
        );

      case 'SUCCESS':
        return (
          <View style={styles.centered}>
            <CheckCircle color={COLORS.status.active} size={80} />
            <Text style={[styles.title, { color: colors.text }]}>
              {restored ? 'Wallet Restored!' : 'Wallet Ready!'}
            </Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              {restored
                ? 'Your credentials have been successfully restored.'
                : 'Your digital wallet is set up and ready to use.'}
            </Text>
            <TouchableOpacity style={styles.primaryButton} onPress={handleEnterWallet}>
              <Text style={styles.primaryButtonText}>Enter Wallet</Text>
            </TouchableOpacity>
          </View>
        );
    }
  };

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: colors.background }]}>
      {loading && <LoadingOverlay message={loadingMessage} />}
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
          {content()}
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 320,
  },
  primaryButton: {
    backgroundColor: COLORS.euBlue,
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 40,
    alignSelf: 'stretch',
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.4,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  optionCards: {
    flexDirection: 'row',
    gap: 16,
    width: '100%',
  },
  optionCard: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
    alignItems: 'center',
    gap: 10,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  optionDesc: {
    fontSize: 12,
    textAlign: 'center',
  },
  textInput: {
    width: '100%',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
  },
  linkText: {
    fontSize: 14,
    textDecorationLine: 'underline',
  },
  progressContainer: {
    width: '100%',
    alignItems: 'center',
    gap: 8,
  },
  progressTrack: {
    width: '100%',
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: COLORS.euBlue,
    borderRadius: 4,
  },
  progressPercent: {
    fontSize: 16,
    fontWeight: '700',
  },
});
