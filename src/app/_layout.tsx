import React, { useEffect } from 'react';
import { Linking, Platform, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import * as WebBrowser from 'expo-web-browser';

import { useAuthStore } from '@/store/authStore';
import { useNotificationStore } from '@/store/notificationStore';
import { useWalletWriteStore } from '@/store/walletWriteStore';
import { useSettingsStore } from '@/store/settingsStore';
import { useActivityLogStore } from '@/store/activityLogStore';
import { useInactivityTimer } from '@/hooks/useInactivityTimer';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { useTheme } from '@/hooks/useTheme';
import LoadingOverlay from '@/components/LoadingOverlay';
import RootNavigator from '@/navigation/RootNavigator';
import { credentialRepository } from '@/services/credentialRepository';
import { useDeepLinkStore } from '@/store/deepLinkStore';
import { useIdentityStore } from '@/store/identityStore';
import { walletProtocolService } from '@/services/walletProtocolService';
import { pendingIssuanceService } from '@/services/pendingIssuanceService';
import { walletIdentityService } from '@/services/walletIdentityService';
import { INTEGRATION_CONFIG } from '@/config/integration';
import { walletRegistry } from '@/wallet-core/registry/walletRegistry';
import { registerWalletBuiltins } from '@/wallet-core/bootstrap/registerBuiltins';

registerWalletBuiltins();
WebBrowser.maybeCompleteAuthSession();

export default function RootLayout() {
  const hydrateAuth = useAuthStore((s) => s.hydrate);
  const hydrateNotifications = useNotificationStore((s) => s.hydrate);
  const hydrateWallet = useWalletWriteStore((s) => s.hydrate);
  const hydrateSettings = useSettingsStore((s) => s.hydrate);
  const hydrateActivityLogs = useActivityLogStore((s) => s.hydrate);

  const authHydrated = useAuthStore((s) => s.isHydrated);
  const notificationHydrated = useNotificationStore((s) => s.isHydrated);
  const walletHydrated = useWalletWriteStore((s) => s.isHydrated);
  const settingsHydrated = useSettingsStore((s) => s.isHydrated);
  const isOnboarded = useAuthStore((s) => s.isOnboarded);

  const activityHydrated = useActivityLogStore((s) => s.isHydrated);

  const allHydrated =
    authHydrated &&
    notificationHydrated &&
    walletHydrated &&
    settingsHydrated &&
    activityHydrated;

  const setPendingDeepLink = useDeepLinkStore((s) => s.setPending);
  const setIdentityStatus = useIdentityStore((s) => s.setStatus);

  const { isDark } = useTheme();
  const inactivityTimer = useInactivityTimer();
  usePushNotifications(allHydrated && isOnboarded);

  useEffect(() => {
    Promise.all([
      hydrateAuth(),
      hydrateNotifications(),
      hydrateWallet(),
      hydrateSettings(),
      hydrateActivityLogs(),
      credentialRepository.hydrate(),
    ]);
  }, []);

  useEffect(() => {
    if (!allHydrated || !isOnboarded) return;

    walletIdentityService.ensureReady().catch((error) => {
      const message = error instanceof Error ? error.message : 'Unknown error';
      setIdentityStatus('error', message);
    });
  }, [allHydrated, isOnboarded, setIdentityStatus]);

  // ── Deep link handler for OID4VCI auth-code callback and offer URIs ──────────
  useEffect(() => {
    if (!allHydrated) return;

    const processWalletUrl = (url: string) => {
      if (!walletRegistry.routeProtocol(url)) {
        return;
      }

      walletProtocolService.handleUriOperation(url).then((result) => {
        if (result.kind === 'issuance_completed') {
          pendingIssuanceService.complete();
        } else if (result.kind === 'failure') {
          pendingIssuanceService.fail();
        }
        setPendingDeepLink(result);
      });
    };

    const isHandledByAuthSession = (url: string) =>
      Platform.OS !== 'android' &&
      (url.startsWith(INTEGRATION_CONFIG.app.issuanceRedirectUri) ||
        url.startsWith(INTEGRATION_CONFIG.app.presentationRedirectUri));

    const isAndroidBrowserCallback = (url: string) =>
      Platform.OS === 'android' &&
      (url.startsWith(INTEGRATION_CONFIG.app.issuanceRedirectUri) ||
        url.startsWith(INTEGRATION_CONFIG.app.presentationRedirectUri));

    const handleUrl = ({ url }: { url: string }) => {
      if (isHandledByAuthSession(url)) {
        return;
      }

      if (isAndroidBrowserCallback(url)) {
        try {
          WebBrowser.dismissBrowser();
        } catch {
          // ignore browser dismiss errors on Android callback handoff
        }
        processWalletUrl(url);
        return;
      }

      processWalletUrl(url);
    };

    const subscription = Linking.addEventListener('url', handleUrl);
    // Also check if the app was cold-started with a URL
    void Linking.getInitialURL().then((url) => {
      if (url && !isHandledByAuthSession(url)) {
        if (isAndroidBrowserCallback(url)) {
          try {
            WebBrowser.dismissBrowser();
          } catch {
            // ignore browser dismiss errors on Android callback handoff
          }
        }
        processWalletUrl(url);
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
