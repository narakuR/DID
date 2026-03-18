## Context

The EU Digital Identity Wallet is a greenfield React Native + Expo mobile app implementing W3C Verifiable Credentials. A complete web reference implementation exists at localhost:3000 (React + Tailwind + React Context), providing functional parity as the porting target. The Expo project skeleton is initialized but empty. A detailed requirements specification (REQUIREMENTS.md v1.0) and 30 granular task documents (docs/T01–T29) define every screen, component, and behavior in full detail.

The app targets iOS 15+ and Android 11+ using Expo Development Build (local compilation, no EAS cloud services). Key native capabilities required: biometric authentication (Face ID / Touch ID / fingerprint), secure credential storage, camera/QR scanning, and haptic feedback.

## Goals / Non-Goals

**Goals:**
- Full native port of the web reference implementation to React Native + Expo
- Secure credential management with OS-level biometric/PIN authentication
- W3C Verifiable Credentials data model (20 mock credentials, 6 activity logs)
- 6-language internationalization including RTL Arabic
- Light/dark theme system with real-time switching
- 5-minute inactivity auto-lock via AppState monitoring
- Complete 12-screen app with all flows (onboarding, credential lifecycle, profile management)
- Offline-first with AsyncStorage persistence and SecureStore for sensitive data

**Non-Goals:**
- Real W3C/EBSI credential issuance protocol (all flows are simulated)
- Real cloud backup backend (simulated with delays)
- Real OTP verification (fixed demo code `123456`)
- EAS cloud builds or remote deployment
- Real NFC credential presentation (UI only)
- Production-grade encryption of wallet data in AsyncStorage

## Decisions

### D1: Zustand over React Context (Web → RN state management)

Web version uses 4 React Contexts (AuthContext, WalletContext, ThemeContext, LanguageContext). RN version uses Zustand for all global state.

**Rationale**: Zustand eliminates Provider nesting, allows direct store access outside components (in services), provides built-in selector optimization, and pairs naturally with AsyncStorage hydration via async actions. Context would require custom hydration logic and re-render management.

**Alternatives considered**: Redux Toolkit (too verbose for this scale), MobX (class-based, inconsistent with functional RN patterns), React Context (retained for web, not ideal for RN async init patterns).

### D2: AsyncStorage + SecureStore storage split

Sensitive data (PIN hash, cloud backup encryption key) → `expo-secure-store` (Keychain/Keystore OS-level encryption). Non-sensitive data (credentials list, user profile, theme, language) → AsyncStorage (JSON serialized).

**Rationale**: SecureStore provides hardware-backed encryption but has size limits (2KB per item) unsuitable for large credential lists. PIN and keys are small values fitting SecureStore constraints. AsyncStorage handles arbitrary JSON at scale.

**Risk**: AsyncStorage credential data is unencrypted. Acceptable for MVP; production would require encryption layer (e.g., expo-crypto AES-256 wrapping).

### D3: Parallel store hydration at app startup

All three Zustand stores hydrate concurrently via `Promise.all([hydrateAuth(), hydrateWallet(), hydrateSettings()])` in the root `_layout.tsx` useEffect. App renders a splash/loading state until all three complete.

**Rationale**: Sequential hydration adds unnecessary latency. The stores have no mutual dependencies at hydration time (authStore does not need wallet data to initialize). Parallel execution reduces cold-start time.

### D4: i18n-js over react-i18next

Using `i18n-js` (simpler, smaller bundle) with `expo-localization` for device locale detection.

**Rationale**: react-i18next adds ~50KB and async loading complexity unnecessary for static translation files. i18n-js provides synchronous `t()` calls with interpolation support sufficient for all use cases.

**RTL handling**: `I18nManager.forceRTL(true)` requires app restart to take effect in RN. Language switch to Arabic will prompt user to restart — this is a known RN limitation, not a design flaw.

### D5: Navigation structure — conditional rendering over nested navigators

`RootNavigator` uses conditional rendering (`if (!isOnboarded) return <Onboarding />`) rather than putting Onboarding/LockScreen inside the navigation stack.

**Rationale**: Onboarding and LockScreen are full-screen flows with no back navigation. Placing them outside NavigationContainer prevents navigation history pollution and avoids `goBack()` accidentally leaving lock screen. This matches standard RN auth-gated navigation patterns.

### D6: Reanimated v3 for animations

Using `react-native-reanimated` v3 (worklet-based) for complex animations (pulse, scan line, bounce), falling back to `Animated` API for simple opacity/transform animations.

**Rationale**: Reanimated runs on UI thread, avoiding JS thread blocking during animations. The scan line animation and onboarding progress indicators require smooth 60fps behavior independent of JS load. Simple animations (error shake, fade-in) use the simpler `Animated` API to avoid unnecessary worklet overhead.

### D7: expo-linear-gradient for credential card backgrounds

Web version uses Tailwind gradient classes. RN version maps these via a `GRADIENT_MAP` lookup table to `[startColor, endColor]` pairs for `expo-linear-gradient`.

**Rationale**: No direct CSS gradient support in RN. The mapping is static (20 credential types, 20 gradient pairs) and complete. `expo-linear-gradient` provides identical visual output.

### D8: LayoutAnimation for group collapse/expand in WalletHome

Using `LayoutAnimation.configureNext()` for credential group fold/unfold animation instead of Reanimated.

**Rationale**: LayoutAnimation handles height changes automatically without measuring. Group content height is dynamic (variable number of credential cards). Reanimated height animation requires explicit measurement (`useAnimatedRef` + `measure()`), significantly increasing complexity. LayoutAnimation trade-off: less control over easing, but sufficient for list fold animations.

## Risks / Trade-offs

- **RTL restart requirement** → Inform user with Alert dialog after Arabic language selection. Acceptable for demo scope.
- **AsyncStorage unencrypted credentials** → Document as known limitation; acceptable for MVP/demo. SecureStore covers actual sensitive data (PIN, keys).
- **Biometric unavailable on simulator** → All biometric flows degrade gracefully (demo mode simulation). ScanScreen shows demo button when camera permission denied.
- **GiftedCharts RN dependency** → `react-native-gifted-charts` requires `react-native-svg`. Both must be included in prebuild. Verify SVG plugin configuration.
- **expo-camera API changes** → Expo SDK 52 uses `CameraView` + `useCameraPermissions` (not deprecated `Camera` component). Implementation must use current API.
- **react-native-reanimated babel plugin position** → Must be last in babel plugins array. Incorrect ordering causes runtime crashes. Enforced in `babel.config.js` documentation.
- **Large mock dataset** → 20 credential objects with full W3C structure. TypeScript compilation time impact negligible; consider lazy import if bundle size becomes concern.

## Migration Plan

1. Run `npm install` with new dependencies
2. Run `npx expo prebuild --clean` to generate native iOS/Android projects
3. Run `npx expo run:ios` or `npx expo run:android` for device testing
4. For Metro bundler only (with existing dev client build): `npx expo start --dev-client`

No database migrations required (greenfield). No rollback needed (no production deployment).

## Open Questions

- Q1: Should `react-native-mmkv` replace AsyncStorage for performance-critical paths? → Deferred; AsyncStorage sufficient for demo scale.
- Q2: Should credential list in AsyncStorage be chunked by type for faster reads? → Deferred; 20 credentials well within AsyncStorage limits.
- Q3: Cloud backup: implement actual encrypted upload or keep fully simulated? → Fully simulated per REQUIREMENTS.md ("Demo 中模拟").
