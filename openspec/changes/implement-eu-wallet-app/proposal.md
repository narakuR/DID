## Why

The EU Digital Identity Wallet mobile app needs to be implemented from scratch as a React Native + Expo application, porting an existing web reference implementation (React + Tailwind, running at localhost:3000) to a fully native iOS/Android experience. The project has an initialized Expo skeleton but zero business logic, and the complete requirements specification (REQUIREMENTS.md v1.0) plus granular task breakdown (docs/ with 30 task documents) are ready to drive implementation.

## What Changes

- **New**: Full Expo Development Build project configuration (dependencies, app.config.ts, path aliases, native plugins)
- **New**: TypeScript type system for W3C Verifiable Credentials, ActivityLog, UserProfile, and all domain models
- **New**: Zustand state management layer (authStore, walletStore, settingsStore) with AsyncStorage persistence
- **New**: Native services layer — AsyncStorage wrapper, expo-local-authentication biometric service, expo-secure-store PIN management, Gemini AI integration
- **New**: i18n system supporting 6 languages (en/zh/es/fr/pt/ar) including RTL Arabic support
- **New**: Navigation structure — RootNavigator (auth-gated) + TabNavigator (5 tabs) + Stack screens
- **New**: Shared component library — PinPad, CredentialCard (ISO/IEC 7810 ratio), SearchBar, FilterChips, DataSection/DataRow, Modal, LoadingOverlay, ActivityLogItem, NotificationItem, ServiceItem, AlphaIndex
- **New**: Custom hooks — useInactivityTimer (5-min auto-lock), useBiometric, useTranslation
- **New**: 12 screens — Onboarding (7-step wizard), LockScreen, WalletHome, Notifications, CredentialDetail, ScanScreen (QR/camera), ActivityScreen, ServicesScreen, ProfileScreen (5 modals), IssuanceScreen, RenewalScreen, RevokeConfirmationScreen
- **New**: App root integration — theme system (light/dark), RTL layout, AppState auto-lock, haptic feedback

## Capabilities

### New Capabilities

- `project-foundation`: Project setup, Expo configuration, TypeScript types, color constants, gradient mapping, 20-credential mock dataset, utility functions
- `auth-and-lock`: Authentication state (Zustand authStore), lock screen (biometric + PIN modes), 5-minute inactivity auto-lock, AppState background detection
- `wallet-core`: Wallet state (Zustand walletStore), W3C VerifiableCredential data model, credential status computation, credential CRUD operations with persistence
- `i18n-and-theme`: i18n system with i18n-js + expo-localization, 6 language files, RTL support for Arabic, light/dark theme system with Zustand settingsStore
- `navigation-and-layout`: RootNavigator (auth-conditional routing), TabNavigator (5-tab with Scan center button), Stack screens, navigation types
- `shared-components`: All reusable UI components (PinPad with haptics, CredentialCard with LinearGradient, SearchBar, FilterChips, DataSection/DataRow, Modal bottom sheet, LoadingOverlay, ActivityLogItem, NotificationItem, ServiceItem, AlphaIndex) and hooks
- `onboarding-flow`: 7-step onboarding wizard (WELCOME → AUTH_SELECT → BIO/PIN_SETUP → PHONE → RESTORE_PASSWORD → RESTORE_PROGRESS → SUCCESS) with state machine, OTP demo verification, cloud backup restore simulation
- `credential-management`: WalletHome (grouped list, search, filter, alpha index, FAB), CredentialDetail (ISO/IEC 23220 data view, AI explanation, history, present/share/revoke actions), IssuanceScreen (9-category grid, OpenID4VCI simulation), RenewalScreen, RevokeConfirmationScreen
- `scan-and-activity`: ScanScreen (expo-camera, QR scanning with EU-yellow frame corners, demo mode), credential offer accept/decline modal, ActivityScreen (7-day bar chart with gifted-charts, action filter, log list)
- `services-and-profile`: ServicesScreen (11 services, search, category filter, 5-step service flow modal), ProfileScreen (user card, settings menu, 5 modals: personal info, security, language, cloud sync wizard, logout confirmation)

### Modified Capabilities

(None — this is a greenfield implementation)

## Impact

- **Files modified**: `src/app/_layout.tsx` (replace template), all existing Expo template files removed
- **New directories**: `src/screens/`, `src/store/`, `src/services/`, `src/hooks/`, `src/i18n/`, `src/constants/`, `src/types/`, `src/navigation/`, `src/components/`
- **New dependencies**: zustand, @react-native-async-storage/async-storage, expo-local-authentication, expo-secure-store, expo-crypto, expo-camera, lucide-react-native, react-native-reanimated, react-native-gesture-handler, expo-linear-gradient, react-native-gifted-charts, react-native-svg, expo-haptics, expo-clipboard, expo-sharing, expo-localization, i18n-js, @google/genai, expo-dev-client, expo-build-properties, babel-plugin-module-resolver
- **Platform**: iOS 15+ and Android 11+ (API 30+), requires local Expo prebuild (no EAS)
- **External API**: Google Gemini API (gemini-2.5-flash), optional — graceful degradation when key absent
