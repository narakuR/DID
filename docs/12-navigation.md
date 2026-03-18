# T12 — 导航结构

> **阶段**: 4 - 导航结构
> **依赖**: T04（authStore）, T02（类型）
> **产出文件**: `src/navigation/types.ts`, `src/navigation/TabNavigator.tsx`, `src/navigation/RootNavigator.tsx`

---

## 任务描述

实现完整导航层级：RootNavigator（认证状态判断）+ TabNavigator（底部 5 个 Tab）+ Stack 层（模态/详情页面）。

---

## 导航结构图

```
RootNavigator (NativeStack)
│
├── [isHydrated = false] → Loading 占位屏
├── [!isOnboarded] → OnboardingScreen
├── [isLocked] → LockScreen
│
└── MainStack
    ├── TabNavigator (底部 Tab)
    │   ├── Tab: Wallet → WalletHomeScreen
    │   ├── Tab: Services → ServicesScreen
    │   ├── Tab: Scan → ScanScreen (presentedModally)
    │   ├── Tab: Activity → ActivityScreen
    │   └── Tab: Profile → ProfileScreen
    │
    └── Stack 层 (无 Tab 栏)
        ├── CredentialDetail (参数: credentialId: string)
        ├── RevokeConfirmation (参数: credentialId: string)
        ├── Renewal (参数: credentialId: string)
        ├── Issuance (无参数)
        └── Notifications (无参数)
```

---

## 1. `src/navigation/types.ts`

```typescript
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';

// Root Stack
export type RootStackParamList = {
  MainTabs: undefined;
  CredentialDetail: { credentialId: string };
  RevokeConfirmation: { credentialId: string };
  Renewal: { credentialId: string };
  Issuance: undefined;
  Notifications: undefined;
};

// Tab Navigator
export type TabParamList = {
  Wallet: undefined;
  Services: undefined;
  Scan: undefined;
  Activity: undefined;
  Profile: undefined;
};

// Screen Props 类型辅助
export type RootStackScreenProps<T extends keyof RootStackParamList> =
  NativeStackScreenProps<RootStackParamList, T>;

export type TabScreenProps<T extends keyof TabParamList> =
  BottomTabScreenProps<TabParamList, T>;
```

---

## 2. `src/navigation/TabNavigator.tsx`

关键实现点：

```typescript
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Wallet, LayoutGrid, ScanLine, History, UserCircle } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useSettingsStore } from '@store/settingsStore';
import { COLORS } from '@constants/colors';

const Tab = createBottomTabNavigator<TabParamList>();

export const TabNavigator = () => {
  const theme = useSettingsStore((s) => s.theme);
  const colors = COLORS[theme];
  const { t } = useTranslation();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.tabBar,
          borderTopColor: colors.border,
        },
        tabBarActiveTintColor: COLORS.euBlue,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarHideOnKeyboard: true,
      })}
      screenListeners={{
        tabPress: () => Haptics.selectionAsync(),
      }}
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
          tabBarIcon: ({ color, size }) => <LayoutGrid color={color} size={size} />,
        }}
      />
      {/* Scan Tab：中间突出圆形按钮 */}
      <Tab.Screen
        name="Scan"
        component={ScanScreen}
        options={{
          tabBarLabel: t('nav.scan'),
          tabBarIcon: ({ color }) => (
            <View style={styles.scanButton}>
              <ScanLine color="#FFFFFF" size={24} />
            </View>
          ),
          tabBarButton: (props) => (
            <TouchableOpacity
              {...props}
              onPress={() => {
                Haptics.selectionAsync();
                props.onPress?.();
              }}
            />
          ),
        }}
      />
      <Tab.Screen
        name="Activity"
        component={ActivityScreen}
        options={{
          tabBarLabel: t('nav.activity'),
          tabBarIcon: ({ color, size }) => <History color={color} size={size} />,
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarLabel: t('nav.profile'),
          tabBarIcon: ({ color, size }) => <UserCircle color={color} size={size} />,
        }}
      />
    </Tab.Navigator>
  );
};
```

**Scan Tab 突出按钮样式**：
```typescript
scanButton: {
  width: 56,
  height: 56,
  borderRadius: 28,
  backgroundColor: COLORS.euBlue,
  alignItems: 'center',
  justifyContent: 'center',
  marginBottom: 20,  // 突出 Tab 栏
  shadowColor: COLORS.euBlue,
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.4,
  shadowRadius: 8,
  elevation: 8,
},
```

---

## 3. `src/navigation/RootNavigator.tsx`

```typescript
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuthStore } from '@store/authStore';

const Stack = createNativeStackNavigator<RootStackParamList>();

export const RootNavigator = () => {
  const { isOnboarded, isLocked, isHydrated } = useAuthStore();

  if (!isHydrated) {
    return <LoadingOverlay />;  // 等待 hydrate 完成
  }

  if (!isOnboarded) {
    return <OnboardingScreen />;  // 全屏，不在 Stack 中
  }

  if (isLocked) {
    return <LockScreen />;  // 全屏覆盖
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="MainTabs" component={TabNavigator} />
        <Stack.Screen name="CredentialDetail" component={CredentialDetailScreen} />
        <Stack.Screen name="RevokeConfirmation" component={RevokeConfirmationScreen} />
        <Stack.Screen name="Renewal" component={RenewalScreen} />
        <Stack.Screen
          name="Issuance"
          component={IssuanceScreen}
          options={{ presentation: 'modal' }}
        />
        <Stack.Screen name="Notifications" component={NotificationsScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
};
```

---

## 验证标准

- [ ] App 首次启动显示 OnboardingScreen（无 Tab 栏）
- [ ] 完成 onboarding 后进入 Wallet Tab，底部 Tab 栏可见
- [ ] Scan Tab 中间按钮突出 Tab 栏，背景色为 EU Blue
- [ ] 从任意 Tab 点击凭证跳转 CredentialDetail 后 Tab 栏消失
- [ ] 返回后 Tab 栏重新出现
- [ ] `authStore.lockWallet()` 后立即覆盖显示 LockScreen
