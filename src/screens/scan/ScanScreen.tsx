import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Animated,
  Alert,
  Dimensions,
} from 'react-native';
import { CameraView, useCameraPermissions, scanFromURLAsync } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { X, Camera, ImageIcon } from 'lucide-react-native';
import { useIsFocused, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import type { RootStackParamList } from '@/navigation/types';
import { useTheme } from '@/hooks/useTheme';
import { COLORS } from '@/constants/colors';
import { protocolFlowService } from '@/services/protocolFlowService';
import { walletRegistry } from '@/wallet-core/registry/walletRegistry';

const { width: SW } = Dimensions.get('window');
const FRAME_SIZE = SW * 0.72;
type Nav = NativeStackNavigationProp<RootStackParamList>;

export default function ScanScreen() {
  const navigation = useNavigation<Nav>();
  const isFocused = useIsFocused();
  const { colors } = useTheme();
  const [permission, requestPermission] = useCameraPermissions();

  const [scanned, setScanned] = useState(false);
  const [processing, setProcessing] = useState(false);

  const scanLineAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(scanLineAnim, {
          toValue: FRAME_SIZE - 4,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(scanLineAnim, {
          toValue: 0,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [scanLineAnim]);

  useEffect(() => {
    if (!processing) return;

    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [processing, pulseAnim]);

  useEffect(() => {
    if (!isFocused) return;

    if (!permission || permission.status === 'undetermined') {
      void requestPermission();
    }
  }, [isFocused, permission, requestPermission]);

  async function handleProtocolUri(data: string) {
    setProcessing(true);
    try {
      if (!walletRegistry.routeProtocol(data)) {
        Alert.alert(
          '暂不支持的二维码',
          '当前只支持 issuer 的 credential offer 和 verifier 的 OpenID4VP 请求。'
        );
        return;
      }

      await protocolFlowService.handleUri(data, navigation);
    } finally {
      setProcessing(false);
      setScanned(false);
    }
  }

  async function handleBarcodeScan(data: string) {
    if (scanned) return;
    setScanned(true);
    await handleProtocolUri(data);
  }

  async function handlePickImage() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 1,
    });
    if (result.canceled || !result.assets[0]) return;

    try {
      const barcodes = await scanFromURLAsync(result.assets[0].uri, ['qr']);
      if (barcodes.length === 0) {
        Alert.alert('未识别到二维码', '请选择包含二维码的图片。');
        return;
      }
      await handleBarcodeScan(barcodes[0].data);
    } catch {
      Alert.alert('识别失败', '无法从该图片中读取二维码。');
      setScanned(false);
      setProcessing(false);
    }
  }

  const hasPermission = permission?.granted;
  const shouldRenderCamera = isFocused && hasPermission;

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: '#000000' }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerButton}>
          <X color="#FFFFFF" size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>扫描二维码</Text>
        <TouchableOpacity onPress={() => void handlePickImage()} style={styles.headerButton}>
          <ImageIcon color="#FFFFFF" size={24} />
        </TouchableOpacity>
      </View>

      <View style={styles.cameraContainer}>
        {shouldRenderCamera ? (
          <CameraView
            style={StyleSheet.absoluteFill}
            facing="back"
            barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
            onBarcodeScanned={
              scanned
                ? undefined
                : ({ data }) => {
                    void handleBarcodeScan(data);
                  }
            }
          />
        ) : (
          <View style={[styles.demoPlaceholder, { backgroundColor: colors.surface }]}>
            <Camera color={colors.textSecondary} size={48} />
            <Text style={[styles.demoText, { color: colors.textSecondary }]}>
              {!permission
                ? '正在请求相机权限...'
                : permission.canAskAgain
                  ? '需要相机权限来扫描 issuer 或 verifier 二维码'
                  : '相机权限已被拒绝，请到系统设置中开启。'}
            </Text>
            {permission?.canAskAgain && (
              <TouchableOpacity
                style={styles.grantButton}
                onPress={() => {
                  void requestPermission();
                }}
              >
                <Text style={styles.grantButtonText}>授权相机</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        <View style={styles.overlayContainer}>
          <View style={styles.overlayRow}>
            <View style={styles.overlayMask} />
            <View style={[styles.frameArea, { width: FRAME_SIZE, height: FRAME_SIZE }]}>
              <View style={[styles.corner, styles.cornerTL]} />
              <View style={[styles.corner, styles.cornerTR]} />
              <View style={[styles.corner, styles.cornerBL]} />
              <View style={[styles.corner, styles.cornerBR]} />

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

      <View style={styles.footer}>
        <Text style={styles.footerTitle}>支持的二维码</Text>
        <Text style={styles.footerText}>
          1. issuer 返回的 `openid-credential-offer://...`
        </Text>
        <Text style={styles.footerText}>
          2. verifier 返回的 `openid4vp://...request_uri=...`
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  headerButton: {
    width: 32,
    alignItems: 'center',
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  cameraContainer: {
    flex: 1,
  },
  demoPlaceholder: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 28,
    gap: 16,
  },
  demoText: {
    textAlign: 'center',
    fontSize: 14,
    lineHeight: 20,
  },
  grantButton: {
    minHeight: 48,
    minWidth: 120,
    borderRadius: 16,
    backgroundColor: COLORS.euBlue,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  grantButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  overlayContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
  },
  overlayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  overlayMask: {
    flex: 1,
  },
  frameArea: {
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 28,
    height: 28,
    borderColor: '#FFFFFF',
  },
  cornerTL: {
    top: 0,
    left: 0,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderTopLeftRadius: 18,
  },
  cornerTR: {
    top: 0,
    right: 0,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderTopRightRadius: 18,
  },
  cornerBL: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderBottomLeftRadius: 18,
  },
  cornerBR: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderBottomRightRadius: 18,
  },
  scanLine: {
    position: 'absolute',
    left: 12,
    right: 12,
    top: 2,
    height: 2,
    backgroundColor: '#5DE2E7',
    borderRadius: 1,
    shadowColor: '#5DE2E7',
    shadowOpacity: 0.8,
    shadowRadius: 8,
  },
  pulseFrame: {
    position: 'absolute',
    borderRadius: 28,
    borderWidth: 2,
    borderColor: '#5DE2E7',
  },
  footer: {
    paddingHorizontal: 20,
    paddingVertical: 18,
    gap: 6,
    backgroundColor: '#0C1220',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#1F2A44',
  },
  footerTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  footerText: {
    color: '#B6C2DA',
    fontSize: 13,
    lineHeight: 18,
  },
});
