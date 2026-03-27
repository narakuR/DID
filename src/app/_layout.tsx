import React, { useEffect } from 'react';
import { Linking, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { useAuthStore } from '@/store/authStore';
import { useNotificationStore } from '@/store/notificationStore';
import { useWalletWriteStore } from '@/store/walletWriteStore';
import { useSettingsStore } from '@/store/settingsStore';
import { useInactivityTimer } from '@/hooks/useInactivityTimer';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { useTheme } from '@/hooks/useTheme';
import LoadingOverlay from '@/components/LoadingOverlay';
import RootNavigator from '@/navigation/RootNavigator';
import { credentialRepository } from '@/services/credentialRepository';
import { useDeepLinkStore } from '@/store/deepLinkStore';
import { walletProtocolService } from '@/services/walletProtocolService';
import { INTEGRATION_CONFIG } from '@/config/integration';
import { walletRegistry } from '@/wallet-core/registry/walletRegistry';
import { registerWalletBuiltins } from '@/wallet-core/bootstrap/registerBuiltins';

registerWalletBuiltins();

export default function RootLayout() {
  const hydrateAuth = useAuthStore((s) => s.hydrate);
  const hydrateNotifications = useNotificationStore((s) => s.hydrate);
  const hydrateWallet = useWalletWriteStore((s) => s.hydrate);
  const hydrateSettings = useSettingsStore((s) => s.hydrate);

  const authHydrated = useAuthStore((s) => s.isHydrated);
  const notificationHydrated = useNotificationStore((s) => s.isHydrated);
  const walletHydrated = useWalletWriteStore((s) => s.isHydrated);
  const settingsHydrated = useSettingsStore((s) => s.isHydrated);
  const isOnboarded = useAuthStore((s) => s.isOnboarded);

  const allHydrated = authHydrated && notificationHydrated && walletHydrated && settingsHydrated;

  const setPendingDeepLink = useDeepLinkStore((s) => s.setPending);

  const { isDark } = useTheme();
  const inactivityTimer = useInactivityTimer();
  usePushNotifications(allHydrated && isOnboarded);

  useEffect(() => {
    Promise.all([hydrateAuth(), hydrateNotifications(), hydrateWallet(), hydrateSettings(), credentialRepository.hydrate()]);
  }, []);

  // ── Deep link handler for OID4VCI auth-code callback and offer URIs ──────────
  useEffect(() => {
    if (!allHydrated) return;

    const isHandledByAuthSession = (url: string) =>
      url.startsWith(INTEGRATION_CONFIG.app.issuanceRedirectUri) ||
      url.startsWith(INTEGRATION_CONFIG.app.presentationRedirectUri);

    const handleUrl = ({ url }: { url: string }) => {
      if (isHandledByAuthSession(url)) {
        return;
      }

      if (walletRegistry.routeProtocol(url)) {
        walletProtocolService.handleUriOperation(url).then((result) => {
          setPendingDeepLink(result);
        });
      }
    };

    const subscription = Linking.addEventListener('url', handleUrl);
    // Also check if the app was cold-started with a URL
    void Linking.getInitialURL().then((url) => {
      if (url && !isHandledByAuthSession(url) && walletRegistry.routeProtocol(url)) {
        walletProtocolService.handleUriOperation(url).then((result) => {
          setPendingDeepLink(result);
        });
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
