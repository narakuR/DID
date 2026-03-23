import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { RootStackParamList } from './types';
import { useAuthStore } from '@/store/authStore';
import TabNavigator from './TabNavigator';
import OnboardingScreen from '@/screens/onboarding/OnboardingScreen';
import LockScreen from '@/screens/lock/LockScreen';
import CredentialDetailScreen from '@/screens/credential/CredentialDetailScreen';
import RevokeConfirmationScreen from '@/screens/credential/RevokeConfirmationScreen';
import RenewalScreen from '@/screens/credential/RenewalScreen';
import IssuanceScreen from '@/screens/credential/IssuanceScreen';
import NotificationsScreen from '@/screens/wallet/NotificationsScreen';
import PresentationConfirmScreen from '@/screens/presentation/PresentationConfirmScreen';

// expo-router already provides a NavigationContainer at the root (_layout.tsx).
// We must NOT add a second one here — just use Stack.Navigator directly.
const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootNavigator() {
  const { isOnboarded, isLocked } = useAuthStore();

  if (!isOnboarded) {
    return <OnboardingScreen />;
  }

  if (isLocked) {
    return <LockScreen />;
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Main" component={TabNavigator} />
      <Stack.Screen name="CredentialDetail" component={CredentialDetailScreen} />
      <Stack.Screen name="RevokeConfirmation" component={RevokeConfirmationScreen} />
      <Stack.Screen name="Renewal" component={RenewalScreen} />
      <Stack.Screen
        name="Issuance"
        component={IssuanceScreen}
        options={{ presentation: 'modal' }}
      />
      <Stack.Screen name="Notifications" component={NotificationsScreen} />
      <Stack.Screen
        name="PresentationConfirm"
        component={PresentationConfirmScreen}
        options={{ presentation: 'modal' }}
      />
    </Stack.Navigator>
  );
}
