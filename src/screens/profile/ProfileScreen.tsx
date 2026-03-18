import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TextInput,
  Alert,
  I18nManager,
} from 'react-native';
import {
  User,
  Shield,
  Globe,
  Moon,
  Cloud,
  LogOut,
  ChevronRight,
  CheckCircle,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

import { useAuthStore } from '@/store/authStore';
import { useWalletStore } from '@/store/walletStore';
import { useSettingsStore } from '@/store/settingsStore';
import { biometricService } from '@/services/biometricService';
import { useTheme } from '@/hooks/useTheme';
import { COLORS } from '@/constants/colors';
import { Language } from '@/types';
import Modal from '@/components/Modal';
import PinPad from '@/components/PinPad';

const LANGUAGES: { code: Language; label: string; flag: string }[] = [
  { code: 'en', label: 'English', flag: '🇬🇧' },
  { code: 'zh', label: '中文', flag: '🇨🇳' },
  { code: 'es', label: 'Español', flag: '🇪🇸' },
  { code: 'fr', label: 'Français', flag: '🇫🇷' },
  { code: 'pt', label: 'Português', flag: '🇵🇹' },
  { code: 'ar', label: 'العربية', flag: '🇸🇦' },
];

export default function ProfileScreen() {
  const { colors } = useTheme();
  const { user, updateUser, logout, updateCloudSync, cloudSync } = useAuthStore();
  const { clearWallet } = useWalletStore();
  const { theme, toggleTheme, language, setLanguage } = useSettingsStore();

  // Modal visibility states
  const [modal, setModal] = useState<'personal' | 'security' | 'language' | 'cloud' | 'logout' | null>(null);

  // Personal info modal
  const [nickname, setNickname] = useState(user?.nickname ?? '');
  const [phone, setPhone] = useState(user?.phone ?? '');

  // Security modal
  const [securityMethod, setSecurityMethod] = useState(user?.authMethod ?? 'BIO');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [pinStep, setPinStep] = useState<'enter' | 'confirm'>('enter');
  const [pinError, setPinError] = useState(false);

  // Cloud sync modal
  type CloudStep = 'intro' | 'bio' | 'password' | 'syncing' | 'success';
  const [cloudStep, setCloudStep] = useState<CloudStep>('intro');
  const [cloudPassword, setCloudPassword] = useState('');
  const [cloudPasswordConfirm, setCloudPasswordConfirm] = useState('');
  const [cloudSyncing, setCloudSyncing] = useState(false);

  // Logout modal
  const [logoutStep, setLogoutStep] = useState<'confirm' | 'bio'>('confirm');

  const initials = (user?.nickname ?? 'U')
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();

  function openModal(m: typeof modal) {
    if (m === 'personal') { setNickname(user?.nickname ?? ''); setPhone(user?.phone ?? ''); }
    if (m === 'security') { setSecurityMethod(user?.authMethod ?? 'BIO'); setNewPin(''); setConfirmPin(''); setPinStep('enter'); }
    if (m === 'cloud') setCloudStep(cloudSync.enabled ? 'success' : 'intro');
    if (m === 'logout') setLogoutStep('confirm');
    setModal(m);
  }

  async function handleSavePersonal() {
    await updateUser({ nickname, phone });
    setModal(null);
  }

  async function handlePinEntered(pin: string) {
    setNewPin(pin);
    setPinStep('confirm');
    setConfirmPin('');
  }

  async function handlePinConfirmed(pin: string) {
    if (pin !== newPin) {
      setPinError(true);
      setTimeout(() => { setPinError(false); setPinStep('enter'); setNewPin(''); setConfirmPin(''); }, 600);
      return;
    }
    await biometricService.savePin(newPin);
    await updateUser({ authMethod: 'PIN' });
    setModal(null);
  }

  async function handleSaveSecurity() {
    if (securityMethod === 'BIO') {
      await updateUser({ authMethod: 'BIO' });
      setModal(null);
    }
  }

  async function handleLanguageSelect(lang: Language) {
    if (lang === 'ar') {
      Alert.alert(
        'Restart Required',
        'Arabic (RTL) requires an app restart to take effect.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Apply', onPress: async () => { await setLanguage(lang); setModal(null); } },
        ]
      );
    } else {
      await setLanguage(lang);
      setModal(null);
    }
  }

  async function handleCloudBio() {
    const success = await biometricService.authenticate('Verify identity to set up cloud backup');
    if (success) setCloudStep('password');
  }

  async function handleCloudSetup() {
    if (cloudPassword !== cloudPasswordConfirm || cloudPassword.length < 4) return;
    await biometricService.saveCloudKey(cloudPassword);
    setCloudStep('syncing');
    setCloudSyncing(true);
    await new Promise((r) => setTimeout(r, 2500));
    await updateCloudSync(true, new Date().toISOString());
    setCloudStep('success');
    setCloudSyncing(false);
  }

  async function handleDisableCloud() {
    Alert.alert('Disable Backup', 'Are you sure you want to disable cloud backup?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Disable', style: 'destructive',
        onPress: async () => { await updateCloudSync(false, null); setModal(null); },
      },
    ]);
  }

  async function handleLogoutBio() {
    const success = await biometricService.authenticate('Verify identity to logout');
    if (success) {
      await clearWallet();
      await logout();
    } else {
      Alert.alert('Authentication Failed', 'Logout cancelled.');
    }
  }

  const menuItems = [
    { icon: <User color={COLORS.euBlue} size={20} />, label: 'Personal Information', onPress: () => openModal('personal') },
    { icon: <Shield color={COLORS.euBlue} size={20} />, label: 'Security', onPress: () => openModal('security') },
    { icon: <Globe color={COLORS.euBlue} size={20} />, label: 'Language', onPress: () => openModal('language'), value: LANGUAGES.find((l) => l.code === language)?.label },
    { icon: <Moon color={COLORS.euBlue} size={20} />, label: 'Dark Mode', onPress: toggleTheme, value: theme === 'dark' ? 'On' : 'Off' },
    { icon: <Cloud color={COLORS.euBlue} size={20} />, label: 'Cloud Backup', onPress: () => openModal('cloud'), value: cloudSync.enabled ? 'Enabled' : 'Not set up' },
  ];

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: colors.background }]}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>Profile</Text>
        </View>

        {/* User card */}
        <View style={[styles.userCard, { backgroundColor: COLORS.euBlue }]}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <View>
            <Text style={styles.userName}>{user?.nickname ?? 'User'}</Text>
            <Text style={styles.userPhone}>{user?.phone ?? ''}</Text>
          </View>
        </View>

        {/* Menu */}
        <View style={[styles.menuCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {menuItems.map((item, i) => (
            <TouchableOpacity
              key={item.label}
              style={[
                styles.menuItem,
                i < menuItems.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
              ]}
              onPress={item.onPress}
            >
              <View style={styles.menuLeft}>
                {item.icon}
                <Text style={[styles.menuLabel, { color: colors.text }]}>{item.label}</Text>
              </View>
              <View style={styles.menuRight}>
                {item.value ? (
                  <Text style={[styles.menuValue, { color: colors.textSecondary }]}>{item.value}</Text>
                ) : null}
                <ChevronRight
                  color={colors.textSecondary}
                  size={16}
                  style={I18nManager.isRTL ? { transform: [{ scaleX: -1 }] } : undefined}
                />
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Logout */}
        <TouchableOpacity
          style={[styles.logoutButton, { backgroundColor: COLORS.status.error }]}
          onPress={() => openModal('logout')}
        >
          <LogOut color="#FFFFFF" size={18} />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Personal Info Modal */}
      <Modal visible={modal === 'personal'} onClose={() => setModal(null)}>
        <View style={styles.modalContent}>
          <Text style={[styles.modalTitle, { color: colors.text }]}>Edit Personal Info</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.input, color: colors.text, borderColor: colors.border }]}
            value={nickname}
            onChangeText={setNickname}
            placeholder="Nickname"
            placeholderTextColor={colors.placeholder}
          />
          <TextInput
            style={[styles.input, { backgroundColor: colors.input, color: colors.text, borderColor: colors.border }]}
            value={phone}
            onChangeText={setPhone}
            placeholder="Phone"
            placeholderTextColor={colors.placeholder}
            keyboardType="phone-pad"
          />
          <TouchableOpacity style={styles.saveButton} onPress={handleSavePersonal}>
            <Text style={styles.saveButtonText}>Save</Text>
          </TouchableOpacity>
        </View>
      </Modal>

      {/* Security Modal */}
      <Modal visible={modal === 'security'} onClose={() => setModal(null)}>
        <View style={styles.modalContent}>
          <Text style={[styles.modalTitle, { color: colors.text }]}>Change Auth Method</Text>
          <View style={styles.methodRow}>
            <TouchableOpacity
              style={[styles.methodButton, securityMethod === 'BIO' && styles.methodActive]}
              onPress={() => setSecurityMethod('BIO')}
            >
              <Text style={[styles.methodText, securityMethod === 'BIO' && styles.methodTextActive]}>
                Biometric
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.methodButton, securityMethod === 'PIN' && styles.methodActive]}
              onPress={() => { setSecurityMethod('PIN'); setPinStep('enter'); setNewPin(''); setConfirmPin(''); }}
            >
              <Text style={[styles.methodText, securityMethod === 'PIN' && styles.methodTextActive]}>
                PIN
              </Text>
            </TouchableOpacity>
          </View>
          {securityMethod === 'PIN' ? (
            pinStep === 'enter' ? (
              <PinPad value={newPin} onChange={setNewPin} onComplete={handlePinEntered} />
            ) : (
              <PinPad value={confirmPin} onChange={setConfirmPin} onComplete={handlePinConfirmed} hasError={pinError} />
            )
          ) : (
            <TouchableOpacity style={styles.saveButton} onPress={handleSaveSecurity}>
              <Text style={styles.saveButtonText}>Save</Text>
            </TouchableOpacity>
          )}
        </View>
      </Modal>

      {/* Language Modal */}
      <Modal visible={modal === 'language'} onClose={() => setModal(null)}>
        <View style={styles.modalContent}>
          <Text style={[styles.modalTitle, { color: colors.text }]}>Select Language</Text>
          {LANGUAGES.map((lang) => {
            const isSelected = lang.code === language;
            return (
              <TouchableOpacity
                key={lang.code}
                style={[
                  styles.langItem,
                  { borderColor: isSelected ? COLORS.euBlue : colors.border },
                  isSelected && { backgroundColor: COLORS.euBlue + '12' },
                ]}
                onPress={() => handleLanguageSelect(lang.code)}
              >
                <Text style={styles.langFlag}>{lang.flag}</Text>
                <Text style={[styles.langLabel, { color: isSelected ? COLORS.euBlue : colors.text }]}>
                  {lang.label}
                </Text>
                {isSelected && <CheckCircle color={COLORS.euBlue} size={18} />}
              </TouchableOpacity>
            );
          })}
        </View>
      </Modal>

      {/* Cloud Sync Modal */}
      <Modal visible={modal === 'cloud'} onClose={() => setModal(null)}>
        <View style={styles.modalContent}>
          {cloudStep === 'intro' && (
            <>
              <Cloud color={COLORS.euBlue} size={48} />
              <Text style={[styles.modalTitle, { color: colors.text }]}>Cloud Backup</Text>
              <Text style={[styles.modalDesc, { color: colors.textSecondary }]}>
                Set up cloud backup to restore your wallet on a new device.
              </Text>
              <TouchableOpacity style={styles.saveButton} onPress={() => setCloudStep('bio')}>
                <Text style={styles.saveButtonText}>Set Up Backup</Text>
              </TouchableOpacity>
            </>
          )}
          {cloudStep === 'bio' && (
            <>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Verify Identity</Text>
              <Text style={[styles.modalDesc, { color: colors.textSecondary }]}>
                Verify your identity to continue.
              </Text>
              <TouchableOpacity style={styles.saveButton} onPress={handleCloudBio}>
                <Text style={styles.saveButtonText}>Authenticate</Text>
              </TouchableOpacity>
            </>
          )}
          {cloudStep === 'password' && (
            <>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Create Backup Password</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.input, color: colors.text, borderColor: colors.border }]}
                value={cloudPassword}
                onChangeText={setCloudPassword}
                placeholder="Password (min 4 chars)"
                placeholderTextColor={colors.placeholder}
                secureTextEntry
              />
              <TextInput
                style={[styles.input, { backgroundColor: colors.input, color: colors.text, borderColor: colors.border }]}
                value={cloudPasswordConfirm}
                onChangeText={setCloudPasswordConfirm}
                placeholder="Confirm password"
                placeholderTextColor={colors.placeholder}
                secureTextEntry
              />
              <TouchableOpacity
                style={[styles.saveButton, (cloudPassword.length < 4 || cloudPassword !== cloudPasswordConfirm) && styles.disabled]}
                onPress={handleCloudSetup}
                disabled={cloudPassword.length < 4 || cloudPassword !== cloudPasswordConfirm}
              >
                <Text style={styles.saveButtonText}>Confirm</Text>
              </TouchableOpacity>
            </>
          )}
          {cloudStep === 'syncing' && (
            <>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Backing up wallet…</Text>
              <Text style={[styles.modalDesc, { color: colors.textSecondary }]}>Please wait.</Text>
            </>
          )}
          {cloudStep === 'success' && (
            <>
              {cloudSync.enabled ? (
                <>
                  <CheckCircle color={COLORS.status.active} size={48} />
                  <Text style={[styles.modalTitle, { color: colors.text }]}>Backup Complete!</Text>
                  {cloudSync.lastSyncAt && (
                    <Text style={[styles.modalDesc, { color: colors.textSecondary }]}>
                      Last sync: {new Date(cloudSync.lastSyncAt).toLocaleString()}
                    </Text>
                  )}
                  <TouchableOpacity style={styles.saveButton} onPress={() => setModal(null)}>
                    <Text style={styles.saveButtonText}>Done</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={handleDisableCloud}>
                    <Text style={{ color: COLORS.status.error, marginTop: 8 }}>Disable Backup</Text>
                  </TouchableOpacity>
                </>
              ) : null}
            </>
          )}
        </View>
      </Modal>

      {/* Logout Modal */}
      <Modal visible={modal === 'logout'} onClose={() => setModal(null)}>
        <View style={styles.modalContent}>
          {logoutStep === 'confirm' ? (
            <>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Confirm Logout</Text>
              <Text style={[styles.modalDesc, { color: colors.textSecondary }]}>
                Are you sure you want to logout? Your data will be cleared.
              </Text>
              <TouchableOpacity
                style={[styles.saveButton, { backgroundColor: COLORS.status.error }]}
                onPress={() => setLogoutStep('bio')}
              >
                <Text style={styles.saveButtonText}>Yes, logout</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setModal(null)}>
                <Text style={{ color: colors.textSecondary, marginTop: 8 }}>Cancel</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Verify Identity</Text>
              <TouchableOpacity
                style={[styles.saveButton, { backgroundColor: COLORS.status.error }]}
                onPress={handleLogoutBio}
              >
                <Text style={styles.saveButtonText}>Authenticate &amp; Logout</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
  },
  userCard: {
    marginHorizontal: 16,
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 16,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.25)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '700',
  },
  userName: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  userPhone: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 13,
    marginTop: 2,
  },
  menuCard: {
    marginHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: 16,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  menuLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  menuLabel: {
    fontSize: 15,
    fontWeight: '500',
  },
  menuRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  menuValue: {
    fontSize: 13,
  },
  logoutButton: {
    marginHorizontal: 16,
    borderRadius: 14,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    marginBottom: 32,
  },
  logoutText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  modalContent: {
    padding: 24,
    gap: 16,
    alignItems: 'stretch',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
  },
  modalDesc: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  input: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
  },
  saveButton: {
    backgroundColor: COLORS.euBlue,
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  disabled: {
    opacity: 0.4,
  },
  methodRow: {
    flexDirection: 'row',
    gap: 12,
  },
  methodButton: {
    flex: 1,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.15)',
    alignItems: 'center',
  },
  methodActive: {
    backgroundColor: COLORS.euBlue,
    borderColor: COLORS.euBlue,
  },
  methodText: {
    fontWeight: '600',
    fontSize: 14,
  },
  methodTextActive: {
    color: '#FFFFFF',
  },
  langItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
  },
  langFlag: {
    fontSize: 22,
  },
  langLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
  },
});
