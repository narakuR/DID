## 1. Project Foundation

- [ ] 1.1 Clean Expo template — remove all boilerplate files from `src/app/(tabs)/`, `src/components/` (keep directory structure)
- [ ] 1.2 Install all production dependencies via `npx expo install` (navigation, zustand, async-storage, biometric, secure-store, crypto, camera, lucide-react-native, reanimated, gesture-handler, linear-gradient, gifted-charts, react-native-svg, haptics, clipboard, sharing, localization, i18n-js, dev-client, build-properties, module-resolver)
- [ ] 1.3 Install AI dependency: `npm install @google/genai`
- [ ] 1.4 Configure `app.config.ts` with iOS/Android permissions, plugin list, and Gemini API key from env
- [ ] 1.5 Configure `babel.config.js` with path aliases and `react-native-reanimated/plugin` (last in plugins)
- [ ] 1.6 Configure `tsconfig.json` with matching path alias `compilerOptions.paths`
- [ ] 1.7 Create `.env.example` with `EXPO_PUBLIC_GEMINI_API_KEY=your_key_here`
- [ ] 1.8 Create all `src/` subdirectories: screens/{onboarding,lock,wallet,credential,scan,activity,services,profile}, components, store, services, hooks, i18n/translations, constants, types, navigation
- [ ] 1.9 Define all TypeScript types in `src/types/index.ts`: IssuerType enum, VerifiableCredential, CredentialSubject, ActivityLog, ActivityGraphPoint, UserProfile, CloudSyncState, AuthMethod, Language, Theme, CredentialStatusInfo, ServiceCategory, ServiceItem, AppNotification, NotificationType
- [ ] 1.10 Implement `src/constants/colors.ts`: COLORS (euBlue, euYellow, light, dark, status colors), GRADIENT_MAP (20 entries), `getGradientColors()` helper
- [ ] 1.11 Implement `src/constants/config.ts`: CONFIG (INACTIVITY_LIMIT_MS, OTP_DEMO_CODE, timeouts, RENEWAL_YEARS, thresholds), STORAGE_KEYS, SECURE_STORE_KEYS
- [ ] 1.12 Implement `src/constants/mockData.ts`: MOCK_CREDENTIALS (20 items with correct near-expiry dates for #9 and #10, revoked #15, expired #14), MOCK_ACTIVITY_LOGS (6 items), MOCK_GRAPH_DATA (7 days)
- [ ] 1.13 Implement `src/utils/credentialUtils.ts`: `getCredentialStatus(credential)` returning CredentialStatusInfo
- [ ] 1.14 Run `npx expo prebuild --clean` and verify no errors

## 2. Services Layer

- [ ] 2.1 Implement `src/services/storageService.ts`: type-safe AsyncStorage wrapper with getItem<T>, setItem, removeItem, clear, multiGet methods — all errors logged not thrown
- [ ] 2.2 Implement `src/services/biometricService.ts`: isBiometricAvailable(), authenticate(promptMessage), savePin(pin), verifyPin(inputPin), deletePin(), saveCloudKey(password), getCloudKey()
- [ ] 2.3 Implement `src/services/geminiService.ts`: lazy GoogleGenAI initialization, explainCredential(credential), verifyCredentialIntegrity(credential) — graceful degradation when API key absent

## 3. State Management (Zustand Stores)

- [ ] 3.1 Implement `src/store/authStore.ts`: AuthState interface, completeOnboarding, unlockWallet, lockWallet, logout, updateUser, updateCloudSync, hydrate (parallel AsyncStorage reads, default isLocked=true when isOnboarded=true)
- [ ] 3.2 Implement `src/store/walletStore.ts`: WalletState interface, addCredential, revokeCredential, updateCredential, getCredential, restoreWallet, clearWallet, hydrate (fallback to MOCK_CREDENTIALS)
- [ ] 3.3 Implement `src/store/settingsStore.ts`: SettingsState interface, toggleTheme, setLanguage (calls i18n setAppLanguage), hydrate

## 4. Internationalization

- [ ] 4.1 Implement `src/i18n/index.ts`: i18n-js instance with all 6 language imports, device locale detection, fallback to 'en', `setAppLanguage(lang)` export with RTL handling, `t()` export
- [ ] 4.2 Implement `src/i18n/translations/en.ts`: complete English translations for all keys (nav, wallet, notifications, detail, scan, activity, services, profile, onboard, lock, issue, cloud, common)
- [ ] 4.3 Implement `src/i18n/translations/zh.ts`: complete Chinese Simplified translations matching en.ts structure
- [ ] 4.4 Implement `src/i18n/translations/es.ts`: complete Spanish translations
- [ ] 4.5 Implement `src/i18n/translations/fr.ts`: complete French translations
- [ ] 4.6 Implement `src/i18n/translations/pt.ts`: complete Portuguese translations
- [ ] 4.7 Implement `src/i18n/translations/ar.ts`: complete Arabic translations (RTL-correct string ordering for interpolated values)
- [ ] 4.8 Implement `src/hooks/useTranslation.ts`: subscribes to settingsStore language, re-exports `t()` triggering re-render on language change

## 5. Navigation

- [ ] 5.1 Implement `src/navigation/types.ts`: RootStackParamList, TabParamList, screen props type helpers
- [ ] 5.2 Implement `src/navigation/TabNavigator.tsx`: 5-tab navigator with Wallet/Services/Scan(elevated circle)/Activity/Profile, haptic on tab press, theme-aware colors, i18n labels
- [ ] 5.3 Implement `src/navigation/RootNavigator.tsx`: auth-conditional rendering (LoadingOverlay → Onboarding → LockScreen → NavigationContainer+Stack), stack screens for CredentialDetail/RevokeConfirmation/Renewal/Issuance(modal)/Notifications

## 6. Shared Components

- [ ] 6.1 Implement `src/components/PinPad.tsx`: 6-dot indicator, 3×4 digit grid, haptic on press, onComplete callback, error shake animation + Haptics.Error, theme-aware styling
- [ ] 6.2 Implement `src/components/CredentialCard.tsx`: ISO 7810 aspect ratio (1.586:1), LinearGradient background via GRADIENT_MAP, "EU DIGITAL WALLET" header text, Globe icon, title/ID footer, revoked overlay with stamp, status badge (showStatus prop), opacity degradation for revoked/expired
- [ ] 6.3 Implement `src/components/SearchBar.tsx`: round input with Search icon prefix, clear button when non-empty, theme-aware
- [ ] 6.4 Implement `src/components/FilterChips.tsx`: horizontal ScrollView, selected=EU Blue fill, unselected=bordered, 8px gap, 20px border-radius
- [ ] 6.5 Implement `src/components/DataSection.tsx` and `src/components/DataRow.tsx`: section card with icon+title, DataRow with label/value, copiable (expo-clipboard), monospace, highlighted (red for expired) props
- [ ] 6.6 Implement `src/components/Modal.tsx`: RN Modal + Animated spring slide-up, semi-transparent backdrop, drag-to-dismiss via PanResponder, rounded top corners, drag handle bar
- [ ] 6.7 Implement `src/components/LoadingOverlay.tsx`: absolute full-screen, AnimatedLoop rotation spinner, centered card with message
- [ ] 6.8 Implement `src/components/ActivityLogItem.tsx`: colored circle icon (PRESENTED=blue ArrowUpRight, RECEIVED=green ArrowDownLeft, REVOKED=red Trash2), institution name, credential name, action description, localized timestamp
- [ ] 6.9 Implement `src/components/NotificationItem.tsx`: type-colored icons, title+description, optional Renew action button for warning type
- [ ] 6.10 Implement `src/components/ServiceItem.tsx`: colored icon circle, service name+provider+required data, ChevronRight, pressable full row
- [ ] 6.11 Implement `src/components/AlphaIndex.tsx`: vertical A–Z list, absolute right side, inactive letters at 0.3 opacity, letter press callback

## 7. Custom Hooks

- [ ] 7.1 Implement `src/hooks/useInactivityTimer.ts`: AppState change listener (background→record time, active→check elapsed), setTimeout for foreground inactivity (5min), returns resetTimer(), stops when isLocked=true
- [ ] 7.2 Implement `src/hooks/useBiometric.ts`: isAvailable state, isLoading state, authenticate() wrapper
- [ ] 7.3 Implement `src/hooks/useTheme.ts`: returns `{ theme, colors, isDark }` from settingsStore

## 8. LockScreen

- [ ] 8.1 Implement `src/screens/lock/LockScreen.tsx`: mode detection from authStore.user.authMethod, BIO mode (auto-trigger on mount, Fingerprint button, success/error handling with haptics), PIN mode (PinPad integration, 6-digit auto-verify, error animation), full-screen no-tab layout

## 9. Onboarding Screen

- [ ] 9.1 Implement `src/screens/onboarding/OnboardingScreen.tsx` step WELCOME: logo (ShieldCheck), title, description, "Get Started" button
- [ ] 9.2 Implement step AUTH_SELECT: two option cards (Biometric with availability check, PIN Code), biometric unavailable fallback to PIN
- [ ] 9.3 Implement step BIO_SETUP: 1.5s fingerprint pulse animation then auto-advance to PHONE
- [ ] 9.4 Implement step PIN_SETUP: enter/confirm sub-states with PinPad, mismatch error + retry, savePin on success
- [ ] 9.5 Implement step PHONE: phone input (min 8 chars), send code, 30s countdown, OTP input, demo code '123456' validation, 1.5s loading overlay then advance to RESTORE_PASSWORD
- [ ] 9.6 Implement step RESTORE_PASSWORD: bouncing Cloud icon animation, password input, restore/skip buttons
- [ ] 9.7 Implement step RESTORE_PROGRESS: circular progress bar (0→100%), 4-stage status messages, call restoreWallet(MOCK_CREDENTIALS) + updateCloudSync on completion
- [ ] 9.8 Implement step SUCCESS: green CheckCircle, context-aware title (restored vs new), "Enter Wallet" button calling completeOnboarding
- [ ] 9.9 Implement step transition fade animation (150ms out, 300ms in)

## 10. Wallet Home Screen

- [ ] 10.1 Implement `src/screens/wallet/WalletHomeScreen.tsx` header: large title, welcome subtitle with nickname, bell icon with red badge count (expired + near-expiry + revoked)
- [ ] 10.2 Implement SearchBar integration with real-time credential filtering
- [ ] 10.3 Implement FilterChips (ALL + 8 IssuerType values), credential filter logic, memoized
- [ ] 10.4 Implement grouped credential list: group by issuer.type, collapsible headers with LayoutAnimation, CredentialCard with showStatus=true, opacity for revoked/expired
- [ ] 10.5 Implement search mode: flat ungrouped list when searchQuery is non-empty
- [ ] 10.6 Implement AlphaIndex: extract first letters, scrollToIndex on press, 1.5s highlight animation
- [ ] 10.7 Implement FAB button (Plus icon, EU Blue, bottom-right absolute, navigates to Issuance)
- [ ] 10.8 Implement `src/screens/wallet/NotificationsScreen.tsx`: generate notifications from credential statuses (error > warning > success > info priority), NotificationItem list, Renew button navigates to Renewal, empty state

## 11. Credential Detail Screen

- [ ] 11.1 Implement `src/screens/credential/CredentialDetailScreen.tsx` layout: custom header (back + title + info icon), ScrollView, CredentialCard (full width), verification status block
- [ ] 11.2 Implement 4-section ISO/IEC 23220 data view: Metadata (type/id/dates with expired highlight), Issuer (name/DID copiable), Subject (DID copiable), Claims (nested object/array rendering)
- [ ] 11.3 Implement AI explanation block: gradient card, on-demand trigger button, loading spinner, fade-in text result, no-key graceful degradation
- [ ] 11.4 Implement credential history section: filter MOCK_ACTIVITY_LOGS by credentialId, ActivityLogItem list, empty state
- [ ] 11.5 Implement bottom action bar: Present (bio overlay 1.5s → QR overlay with close button), Share (Modal with 5-min countdown + copy/email options), Revoke (navigate to RevokeConfirmation), disabled states for revoked/expired

## 12. Scan Screen

- [ ] 12.1 Implement `src/screens/scan/ScanScreen.tsx`: full-screen modal layout, permission request on mount, CameraView with barcode scanning (QR type), custom transparent header (X close + title)
- [ ] 12.2 Implement scan frame overlay: semi-transparent masks, EU Yellow corner markers (L-shaped, 4px line), animated red scan line (Animated.loop up/down)
- [ ] 12.3 Implement scanning/processing state: pulse animation replaces scan line when processing
- [ ] 12.4 Implement demo mode: grey placeholder when no permission, Camera icon button at bottom triggering 1.5s delay then mock offer
- [ ] 12.5 Implement credential offer modal: ShieldCheck icon, issuer description, CredentialCard preview, Accept (addCredential + haptic + navigate Wallet) / Decline buttons

## 13. Activity Screen

- [ ] 13.1 Implement `src/screens/activity/ActivityScreen.tsx` chart section: title + "+12%" green badge, react-native-gifted-charts BarChart with MOCK_GRAPH_DATA (Sat=EU Blue, others=grey)
- [ ] 13.2 Implement filter button group: ALL/PRESENTED(blue)/RECEIVED(green)/REVOKED(red), selected=filled, unselected=grey background
- [ ] 13.3 Implement filtered activity log list with ActivityLogItem, empty state with History icon

## 14. Services Screen

- [ ] 14.1 Implement `src/screens/services/ServicesScreen.tsx`: header (title+subtitle), SearchBar filtering by name+provider, FilterChips (ALL+6 categories), ServiceItem list
- [ ] 14.2 Implement service processing flow modal: 5-step auto-sequence (CONNECT/AUTH/SHARE/SUCCESS/REDIRECT), step visual states (completed=CheckCircle, current=animation, pending=semi-transparent), auto-close after REDIRECT

## 15. Profile Screen

- [ ] 15.1 Implement `src/screens/profile/ProfileScreen.tsx`: gradient user card (nickname initials avatar, name, phone), settings menu list with chevrons, logout button (red background)
- [ ] 15.2 Implement Modal 1 (personal info): nickname + phone inputs, save calls authStore.updateUser
- [ ] 15.3 Implement Modal 2 (security): authMethod toggle (BIO/PIN), PIN mode shows dual PinPad (enter + confirm), save only when 6 digits + match
- [ ] 15.4 Implement Modal 3 (language): 6-language list with flag emoji, current highlighted in blue, selection calls settingsStore.setLanguage + Arabic restart Alert
- [ ] 15.5 Implement Modal 4 (cloud sync) — setup flow: intro → bio verify (authenticate()) → password (4+ chars, confirm match, saveCloudKey) → syncing animation → success + updateCloudSync
- [ ] 15.6 Implement Modal 4 (cloud sync) — manage view: last sync timestamp, sync now button, disable backup button with confirm
- [ ] 15.7 Implement Modal 5 (logout): 2-step confirm → bio verify → clearWallet() + logout()

## 16. Remaining Screens

- [ ] 16.1 Implement `src/screens/credential/IssuanceScreen.tsx`: 9-category 2-column grid, overlay 4-step flow (connecting/authenticating/issuing/success with step indicators), addCredential on success, navigate back
- [ ] 16.2 Implement `src/screens/credential/RenewalScreen.tsx`: idle (show current expiry in red, Renew button), processing (spinner 2.5s), success (new expiry year), updateCredential on success
- [ ] 16.3 Implement `src/screens/credential/RevokeConfirmationScreen.tsx`: confirm (warning icon + text + confirm/cancel), auth (fingerprint pulse auto-trigger), success (green check), revokeCredential + haptics on success

## 17. App Root Integration

- [ ] 17.1 Implement `src/hooks/useTheme.ts` returning `{ theme, colors, isDark }` from settingsStore
- [ ] 17.2 Rewrite `src/app/_layout.tsx`: GestureHandlerRootView + SafeAreaProvider wrapper, parallel store hydrate in useEffect, loading spinner until all hydrated, TouchableWithoutFeedback wrapping RootNavigator for inactivityTimer.resetTimer
- [ ] 17.3 Configure expo-status-bar to follow theme (light-content for dark, dark-content for light)
- [ ] 17.4 Configure NavigationContainer with theme-aware navigation theme (DefaultTheme/DarkTheme colors mapped to COLORS constants)
- [ ] 17.5 Verify RTL layout: all `flexDirection: 'row'` components use `I18nManager.isRTL ? 'row-reverse' : 'row'`, ChevronRight icons flip with `scaleX: -1` in RTL, spacing uses marginStart/marginEnd
- [ ] 17.6 Integration test: cold launch → onboarding → complete → wallet home visible → lock (5min) → unlock → revoke a credential → verify revoked state persists after restart
