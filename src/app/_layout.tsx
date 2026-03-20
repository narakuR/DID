import React, { useEffect } from 'react';
import { View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { useAuthStore } from '@/store/authStore';
import { useWalletStore } from '@/store/walletStore';
import { useSettingsStore } from '@/store/settingsStore';
import { useInactivityTimer } from '@/hooks/useInactivityTimer';
import { useTheme } from '@/hooks/useTheme';
import LoadingOverlay from '@/components/LoadingOverlay';
import RootNavigator from '@/navigation/RootNavigator';

export default function RootLayout() {
  const hydrateAuth = useAuthStore((s) => s.hydrate);
  const hydrateWallet = useWalletStore((s) => s.hydrate);
  const hydrateSettings = useSettingsStore((s) => s.hydrate);

  const authHydrated = useAuthStore((s) => s.isHydrated);
  const walletHydrated = useWalletStore((s) => s.isHydrated);
  const settingsHydrated = useSettingsStore((s) => s.isHydrated);

  const allHydrated = authHydrated && walletHydrated && settingsHydrated;

  const { isDark } = useTheme();
  const inactivityTimer = useInactivityTimer();

  useEffect(() => {
    Promise.all([hydrateAuth(), hydrateWallet(), hydrateSettings()]);
  }, []);

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
