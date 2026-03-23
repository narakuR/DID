import React, { useEffect } from 'react';
import { Linking, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { useAuthStore } from '@/store/authStore';
import { useNotificationStore } from '@/store/notificationStore';
import { useWalletStore } from '@/store/walletStore';
import { useSettingsStore } from '@/store/settingsStore';
import { useInactivityTimer } from '@/hooks/useInactivityTimer';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { useTheme } from '@/hooks/useTheme';
import LoadingOverlay from '@/components/LoadingOverlay';
import RootNavigator from '@/navigation/RootNavigator';
import { registry } from '@/plugins/registry';
import { didKeyProvider } from '@/plugins/did/DidKeyProvider';
import { didJwkProvider } from '@/plugins/did/DidJwkProvider';
import { didWebProvider } from '@/plugins/did/DidWebProvider';
import { ExpoStorageBackend } from '@/plugins/storage/ExpoStorageBackend';
import { W3cJwtVcFormat } from '@/plugins/formats/W3cJwtVcFormat';
import { SdJwtVcFormat } from '@/plugins/formats/SdJwtVcFormat';
import { MdocFormat } from '@/plugins/formats/MdocFormat';
import { oid4vciHandler } from '@/plugins/protocols/Oid4vciHandler';
import { oid4vpHandler } from '@/plugins/protocols/Oid4vpHandler';
import { walletProtocolService } from '@/services/walletProtocolService';

// ── Plugin registry initialization ───────────────────────────────────────────
// Register built-in plugins once at module load time (synchronous, cheap).
registry.setStorageBackend(new ExpoStorageBackend());
registry.registerDIDProvider(didKeyProvider);
registry.registerDIDProvider(didJwkProvider);
registry.registerDIDProvider(didWebProvider);
registry.registerCredentialFormat(new W3cJwtVcFormat());
registry.registerCredentialFormat(new SdJwtVcFormat());
registry.registerCredentialFormat(new MdocFormat());
registry.registerProtocolHandler(oid4vciHandler);
registry.registerProtocolHandler(oid4vpHandler);
if (__DEV__) registry.logRegistered();

export default function RootLayout() {
  const hydrateAuth = useAuthStore((s) => s.hydrate);
  const hydrateNotifications = useNotificationStore((s) => s.hydrate);
  const hydrateWallet = useWalletStore((s) => s.hydrate);
  const hydrateSettings = useSettingsStore((s) => s.hydrate);

  const authHydrated = useAuthStore((s) => s.isHydrated);
  const notificationHydrated = useNotificationStore((s) => s.isHydrated);
  const walletHydrated = useWalletStore((s) => s.isHydrated);
  const settingsHydrated = useSettingsStore((s) => s.isHydrated);
  const isOnboarded = useAuthStore((s) => s.isOnboarded);

  const allHydrated = authHydrated && notificationHydrated && walletHydrated && settingsHydrated;

  const { isDark } = useTheme();
  const inactivityTimer = useInactivityTimer();
  usePushNotifications(allHydrated && isOnboarded);

  useEffect(() => {
    Promise.all([hydrateAuth(), hydrateNotifications(), hydrateWallet(), hydrateSettings()]);
  }, []);

  // ── Deep link handler for OID4VCI auth-code callback and offer URIs ──────────
  useEffect(() => {
    if (!allHydrated) return;

    const handleUrl = ({ url }: { url: string }) => {
      if (registry.routeProtocol(url)) {
        void walletProtocolService.handleUri(url);
      }
    };

    const subscription = Linking.addEventListener('url', handleUrl);
    // Also check if the app was cold-started with a URL
    void Linking.getInitialURL().then((url) => {
      if (url && registry.routeProtocol(url)) {
        void walletProtocolService.handleUri(url);
      }
    });

    return () => subscription.remove();
  }, [allHydrated]);

  if (!allHydrated) {
    return (
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <StatusBar style={isDark ? 'light' : 'dark'} />
          <LoadingOverlay message="Loading wallet…" />
        </SafeAreaProvider>
      </GestureHandlerRootView>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style={isDark ? 'light' : 'dark'} />
        <View
          style={{ flex: 1 }}
          onStartShouldSetResponderCapture={() => {
            inactivityTimer.resetTimer();
            return false;
          }}
        >
          <RootNavigator />
        </View>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
