## ADDED Requirements

### Requirement: Onboarding 7-step wizard
The system SHALL implement a 7-step onboarding flow (WELCOME → AUTH_SELECT → BIO_SETUP or PIN_SETUP → PHONE → RESTORE_PASSWORD → RESTORE_PROGRESS → SUCCESS) that runs only when `authStore.isOnboarded === false`.

#### Scenario: Authentication method selection — biometric available
- **WHEN** user selects biometric auth AND device has biometric hardware enrolled
- **THEN** BIO_SETUP step SHALL show a simulated biometric scan animation for 1.5 seconds then proceed to PHONE step

#### Scenario: Authentication method selection — biometric unavailable
- **WHEN** user selects biometric auth AND device has no biometric hardware
- **THEN** system SHALL display a notification and redirect to PIN_SETUP step

### Requirement: PIN setup with confirmation
The system SHALL require the user to enter a 6-digit PIN twice and verify they match before proceeding.

#### Scenario: PIN mismatch shows error
- **WHEN** user enters two different PINs in the confirmation step
- **THEN** an error message SHALL be shown AND the input SHALL clear for retry

#### Scenario: PIN match proceeds
- **WHEN** user enters the same 6-digit PIN in both steps
- **THEN** `biometricService.savePin(pin)` SHALL be called AND flow SHALL advance to PHONE step

### Requirement: Phone OTP verification
The system SHALL simulate phone number verification with a 6-digit OTP using the demo code `123456`.

#### Scenario: Send code activates at 8+ digits
- **WHEN** phone number input has fewer than 8 characters
- **THEN** the "Send Code" button SHALL be disabled

#### Scenario: Demo OTP verification
- **WHEN** user enters OTP `123456`
- **THEN** verification SHALL succeed and flow SHALL advance to RESTORE_PASSWORD step

#### Scenario: 30-second resend countdown
- **WHEN** OTP code is sent
- **THEN** resend option SHALL be disabled for 30 seconds with a countdown display

### Requirement: Cloud backup restore simulation
The system SHALL simulate finding and restoring a cloud backup as part of the onboarding flow.

#### Scenario: Backup found after OTP verification
- **WHEN** OTP verification succeeds
- **THEN** a loading overlay SHALL appear for 1.5 seconds simulating backup check, then RESTORE_PASSWORD step SHALL show

#### Scenario: Restore progress stages
- **WHEN** user initiates restore
- **THEN** progress SHALL advance through 4 stages (download 0→40%, verify 40→70%, decrypt 70→90%, import 90→100%) with corresponding status messages

#### Scenario: Restore completes with mock data
- **WHEN** restore progress reaches 100%
- **THEN** `walletStore.restoreWallet(MOCK_CREDENTIALS)` AND `authStore.updateCloudSync(true, timestamp)` SHALL be called

#### Scenario: Skip restore proceeds to SUCCESS
- **WHEN** user taps "Skip restore"
- **THEN** `walletStore.clearWallet()` SHALL be called AND flow SHALL advance directly to SUCCESS step

### Requirement: Onboarding completion
The system SHALL mark onboarding as complete and navigate to the main app upon success.

#### Scenario: Enter wallet button completes onboarding
- **WHEN** user taps "Enter Wallet" on the SUCCESS step
- **THEN** `authStore.completeOnboarding(userProfile)` SHALL be called AND `authStore.isOnboarded` SHALL become `true` AND `authStore.isLocked` SHALL become `false`
