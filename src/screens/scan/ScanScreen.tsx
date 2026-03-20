import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Animated,
  Dimensions,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { X, Camera } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useIsFocused, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { useWalletStore } from '@/store/walletStore';
import { MOCK_CREDENTIALS } from '@/constants/mockData';
import { RootStackParamList } from '@/navigation/types';
import { VerifiableCredential } from '@/types';
import { useTheme } from '@/hooks/useTheme';
import { COLORS } from '@/constants/colors';
import CredentialCard from '@/components/CredentialCard';
import Modal from '@/components/Modal';

const { width: SW } = Dimensions.get('window');
const FRAME_SIZE = SW * 0.72;
type Nav = NativeStackNavigationProp<RootStackParamList>;

export default function ScanScreen() {
  const navigation = useNavigation<Nav>();
  const isFocused = useIsFocused();
  const { colors } = useTheme();
  const { addCredential } = useWalletStore();
  const [permission, requestPermission] = useCameraPermissions();

  const [scanned, setScanned] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [offerModal, setOfferModal] = useState(false);
  const [offeredCredential, setOfferedCredential] = useState<VerifiableCredential | null>(null);

  const scanLineAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Animated scan line
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(scanLineAnim, { toValue: FRAME_SIZE - 4, duration: 1500, useNativeDriver: true }),
        Animated.timing(scanLineAnim, { toValue: 0, duration: 1500, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);

  // Pulse animation when processing
  useEffect(() => {
    if (processing) {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.1, duration: 600, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
        ])
      );
      loop.start();
      return () => loop.stop();
    }
  }, [processing]);

  useEffect(() => {
    if (!isFocused) return;

    if (!permission || permission.status === 'undetermined') {
      void requestPermission();
    }
  }, [isFocused, permission, requestPermission]);

  async function handleDemo() {
    setProcessing(true);
    await new Promise((r) => setTimeout(r, 1500));
    setProcessing(false);
    const mockOffer = MOCK_CREDENTIALS.find((c) => c.visual?.title?.includes('Health')) ?? MOCK_CREDENTIALS[5];
    setOfferedCredential({
      ...mockOffer,
      id: `urn:uuid:scan-${Date.now()}`,
      issuanceDate: new Date().toISOString(),
    });
    setOfferModal(true);
  }

  async function handleAccept() {
    if (!offeredCredential) return;
    await addCredential(offeredCredential);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setOfferModal(false);
    setScanned(false);
    navigation.navigate('Main');
  }

  function handleDecline() {
    setOfferModal(false);
    setScanned(false);
  }

  const hasPermission = permission?.granted;
  const shouldRenderCamera = isFocused && hasPermission;

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: '#000000' }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerButton}>
          <X color="#FFFFFF" size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Scan QR Code</Text>
        <View style={styles.headerButton} />
      </View>

      {/* Camera / Demo */}
      <View style={styles.cameraContainer}>
        {shouldRenderCamera ? (
          <CameraView
            style={StyleSheet.absoluteFill}
            facing="back"
            barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
            onBarcodeScanned={scanned ? undefined : () => {
              if (!scanned) {
                setScanned(true);
                handleDemo();
              }
            }}
          />
        ) : (
          <View style={[styles.demoPlaceholder, { backgroundColor: colors.surface }]}>
            <Camera color={colors.textSecondary} size={48} />
            <Text style={[styles.demoText, { color: colors.textSecondary }]}>
              {!permission
                ? 'Requesting camera permission...'
                : permission?.canAskAgain
                ? 'Camera access needed to scan QR codes'
                : 'Camera permission denied. Enable in Settings.'}
            </Text>
            {permission?.canAskAgain && (
              <TouchableOpacity
                style={styles.grantButton}
                onPress={() => {
                  void requestPermission();
                }}
              >
                <Text style={styles.grantButtonText}>Grant Access</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Scan frame overlay */}
        <View style={styles.overlayContainer}>
          <View style={styles.overlayRow}>
            <View style={styles.overlayMask} />
            <View style={[styles.frameArea, { width: FRAME_SIZE, height: FRAME_SIZE }]}>
              {/* Corner markers */}
              <View style={[styles.corner, styles.cornerTL]} />
              <View style={[styles.corner, styles.cornerTR]} />
              <View style={[styles.corner, styles.cornerBL]} />
              <View style={[styles.corner, styles.cornerBR]} />

              {/* Scan line or pulse */}
              {!processing ? (
                <Animated.View
                  style={[
                    styles.scanLine,
                    { transform: [{ translateY: scanLineAnim }] },
                  ]}
                />
              ) : (
                <Animated.View
                  style={[
                    styles.pulseFrame,
                    { transform: [{ scale: pulseAnim }] },
                    { width: FRAME_SIZE, height: FRAME_SIZE },
                  ]}
                />
              )}
            </View>
            <View style={styles.overlayMask} />
          </View>
        </View>
      </View>

      {/* Demo button */}
      {!shouldRenderCamera && !processing && (
        <View style={styles.demoButtonContainer}>
          <TouchableOpacity
            style={styles.demoButton}
            onPress={handleDemo}
            disabled={processing}
          >
            <Camera color="#FFFFFF" size={20} />
            <Text style={styles.demoButtonText}>Demo Scan</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Credential Offer Modal */}
      <Modal visible={offerModal} onClose={handleDecline}>
        <View style={styles.offerContent}>
          <Text style={[styles.offerTitle, { color: colors.text }]}>Credential Offer</Text>
          <Text style={[styles.offerDesc, { color: colors.textSecondary }]}>
            You have been offered the following credential:
          </Text>
          {offeredCredential && (
            <CredentialCard credential={offeredCredential} />
          )}
          <View style={styles.offerButtons}>
            <TouchableOpacity
              style={[styles.offerButton, { backgroundColor: COLORS.euBlue }]}
              onPress={handleAccept}
            >
              <Text style={styles.offerButtonText}>Accept</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.offerButton, { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }]}
              onPress={handleDecline}
            >
              <Text style={[styles.offerButtonText, { color: colors.text }]}>Decline</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const CORNER_SIZE = 24;
const CORNER_THICKNESS = 4;

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
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
    textAlign: 'center',
  },
  cameraContainer: {
    flex: 1,
    position: 'relative',
  },
  demoPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
    padding: 32,
  },
  demoText: {
    textAlign: 'center',
    fontSize: 15,
  },
  grantButton: {
    backgroundColor: COLORS.euBlue,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 8,
  },
  grantButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  overlayContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlayRow: {
    flexDirection: 'row',
    width: '100%',
    height: FRAME_SIZE,
  },
  overlayMask: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  frameArea: {
    position: 'relative',
    overflow: 'hidden',
  },
  corner: {
    position: 'absolute',
    width: CORNER_SIZE,
    height: CORNER_SIZE,
    borderColor: COLORS.euYellow,
  },
  cornerTL: {
    top: 0,
    left: 0,
    borderTopWidth: CORNER_THICKNESS,
    borderLeftWidth: CORNER_THICKNESS,
  },
  cornerTR: {
    top: 0,
    right: 0,
    borderTopWidth: CORNER_THICKNESS,
    borderRightWidth: CORNER_THICKNESS,
  },
  cornerBL: {
    bottom: 0,
    left: 0,
    borderBottomWidth: CORNER_THICKNESS,
    borderLeftWidth: CORNER_THICKNESS,
  },
  cornerBR: {
    bottom: 0,
    right: 0,
    borderBottomWidth: CORNER_THICKNESS,
    borderRightWidth: CORNER_THICKNESS,
  },
  scanLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: '#EF4444',
  },
  pulseFrame: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: COLORS.euYellow,
    borderRadius: 4,
  },
  demoButtonContainer: {
    padding: 24,
    alignItems: 'center',
  },
  demoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: COLORS.euBlue,
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 14,
  },
  demoButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  offerContent: {
    padding: 20,
    gap: 16,
  },
  offerTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  offerDesc: {
    fontSize: 14,
  },
  offerButtons: {
    gap: 10,
  },
  offerButton: {
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
  },
  offerButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
});
