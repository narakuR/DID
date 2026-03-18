## ADDED Requirements

### Requirement: Authentication state management
The system SHALL manage authentication state (isOnboarded, isLocked, user profile, cloud sync) using Zustand with AsyncStorage persistence.

#### Scenario: Cold start with existing onboarding
- **WHEN** app launches and `isOnboarded: true` is stored in AsyncStorage
- **THEN** `authStore.isOnboarded` SHALL be `true` AND `authStore.isLocked` SHALL be `true`

#### Scenario: Cold start first launch
- **WHEN** app launches with no stored auth data
- **THEN** `authStore.isOnboarded` SHALL be `false` AND `authStore.isLocked` SHALL be `false`

#### Scenario: Logout clears all state
- **WHEN** `authStore.logout()` is called
- **THEN** `isOnboarded`, `isLocked` SHALL reset to `false`, `user` SHALL be `null`, AsyncStorage keys SHALL be removed

### Requirement: PIN secure storage
The system SHALL store PIN codes exclusively in `expo-secure-store` (Keychain/Keystore), never in AsyncStorage or application logs.

#### Scenario: PIN storage isolation
- **WHEN** user sets a 6-digit PIN
- **THEN** the PIN SHALL be stored via `SecureStore.setItemAsync` AND SHALL NOT appear in AsyncStorage

#### Scenario: PIN verification
- **WHEN** user enters the correct 6-digit PIN on the lock screen
- **THEN** `biometricService.verifyPin()` SHALL return `true`

#### Scenario: Wrong PIN rejected
- **WHEN** user enters an incorrect PIN
- **THEN** `biometricService.verifyPin()` SHALL return `false`

### Requirement: Lock screen — biometric mode
The system SHALL display a biometric unlock screen when `authStore.isLocked === true` and `user.authMethod === 'BIO'`.

#### Scenario: Auto-trigger on screen mount
- **WHEN** LockScreen mounts with BIO auth method
- **THEN** the system SHALL automatically invoke `expo-local-authentication.authenticateAsync()` once

#### Scenario: Biometric success unlocks
- **WHEN** biometric authentication succeeds
- **THEN** `authStore.unlockWallet()` SHALL be called and the lock screen SHALL disappear

#### Scenario: Biometric failure shows retry
- **WHEN** biometric authentication fails
- **THEN** an error message SHALL be displayed and the user SHALL be able to retry

### Requirement: Lock screen — PIN mode
The system SHALL display a 6-dot PIN input screen when `authStore.isLocked === true` and `user.authMethod === 'PIN'`.

#### Scenario: Correct PIN unlocks
- **WHEN** user inputs the correct 6-digit PIN
- **THEN** `authStore.unlockWallet()` SHALL be called immediately without requiring a confirm button

#### Scenario: Wrong PIN triggers error animation
- **WHEN** user inputs a wrong 6-digit PIN
- **THEN** the dots SHALL turn red, a shake animation SHALL play, and the input SHALL clear

### Requirement: Inactivity auto-lock
The system SHALL automatically lock the wallet after 5 minutes (300,000ms) of inactivity.

#### Scenario: Foreground inactivity timeout
- **WHEN** the app remains in the foreground with no user interaction for 5 minutes
- **THEN** `authStore.lockWallet()` SHALL be called

#### Scenario: Background re-entry after 5 minutes
- **WHEN** the app returns to foreground after being backgrounded for more than 5 minutes
- **THEN** `authStore.lockWallet()` SHALL be called

#### Scenario: Background re-entry within 5 minutes
- **WHEN** the app returns to foreground after being backgrounded for less than 5 minutes
- **THEN** `authStore.isLocked` SHALL remain unchanged
