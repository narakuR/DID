import React, { useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Wallet, Briefcase, QrCode, Activity, User } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

import { TabParamList } from './types';
import type { RootStackParamList } from './types';
import { useTheme } from '@/hooks/useTheme';
import { useTranslation } from '@/hooks/useTranslation';
import { COLORS } from '@/constants/colors';
import WalletHomeScreen from '@/screens/wallet/WalletHomeScreen';
import ServicesScreen from '@/screens/services/ServicesScreen';
import ScanScreen from '@/screens/scan/ScanScreen';
import ActivityScreen from '@/screens/activity/ActivityScreen';
import ProfileScreen from '@/screens/profile/ProfileScreen';
import { useDeepLinkStore } from '@/store/deepLinkStore';

const Tab = createBottomTabNavigator<TabParamList>();

function ScanTabButton({ children, onPress }: { children: React.ReactNode; onPress?: () => void }) {
  return (
    <TouchableOpacity
      style={styles.scanButton}
      onPress={onPress}
      activeOpacity={0.8}
    >
      {children}
    </TouchableOpacity>
  );
}

export default function TabNavigator() {
  const { colors, isDark } = useTheme();
  const { t } = useTranslation();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { pending, clear } = useDeepLinkStore();

  // Dispatch deep-link protocol results that arrived while outside the navigator
  useEffect(() => {
    if (!pending) return;
    if (pending.type === 'presentation_request') {
      clear();
      navigation.navigate('PresentationConfirm', { request: pending.request });
    } else if (pending.type === 'credential_received') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      clear();
      // Already persisted by walletProtocolService; stay on Main (wallet tab)
    } else if (pending.type === 'error') {
      clear();
      // Errors from background deep links are silently dropped here.
      // ScanScreen handles errors from user-initiated scans with Alert.
    } else {
      clear();
    }
  }, [pending]);

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: COLORS.euBlue,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: {
          backgroundColor: colors.tabBar,
          borderTopColor: colors.tabBarBorder,
          borderTopWidth: 1,
          height: 60,
          paddingBottom: 8,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '500',
        },
        tabBarButton: (props) => {
          if (route.name === 'Scan') {
            return (
              <ScanTabButton
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  if (props.onPress) (props.onPress as () => void)();
                }}
              >
                {props.children}
              </ScanTabButton>
            );
          }
          return (
            <TouchableOpacity
              onPress={() => {
                Haptics.selectionAsync();
                if (props.onPress) (props.onPress as () => void)();
              }}
              style={props.style as object}
            >
              {props.children}
            </TouchableOpacity>
          );
        },
      })}
    >
      <Tab.Screen
        name="Wallet"
        component={WalletHomeScreen}
        options={{
          tabBarLabel: t('nav.wallet'),
          tabBarIcon: ({ color, size }) => <Wallet color={color} size={size} />,
        }}
      />
      <Tab.Screen
        name="Services"
        component={ServicesScreen}
        options={{
          tabBarLabel: t('nav.services'),
          tabBarIcon: ({ color, size }) => <Briefcase color={color} size={size} />,
        }}
      />
      <Tab.Screen
        name="Scan"
        component={ScanScreen}
        options={{
          tabBarLabel: '',
          tabBarIcon: () => (
            <View style={styles.scanIcon}>
              <QrCode color="#FFFFFF" size={24} />
            </View>
          ),
        }}
      />
      <Tab.Screen
        name="Activity"
        component={ActivityScreen}
        options={{
          tabBarLabel: t('nav.activity'),
          tabBarIcon: ({ color, size }) => <Activity color={color} size={size} />,
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarLabel: t('nav.profile'),
          tabBarIcon: ({ color, size }) => <User color={color} size={size} />,
        }}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  scanButton: {
    top: -20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.euBlue,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: COLORS.euBlue,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
});
