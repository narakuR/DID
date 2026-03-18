## ADDED Requirements

### Requirement: Auth-conditional root navigation
The system SHALL conditionally render Onboarding, LockScreen, or the main tab navigator based on `authStore` state, without embedding auth screens in the navigation stack.

#### Scenario: Unonboarded state shows onboarding
- **WHEN** `authStore.isOnboarded === false`
- **THEN** OnboardingScreen SHALL be rendered full-screen with no tab bar or navigation header

#### Scenario: Locked state shows lock screen
- **WHEN** `authStore.isOnboarded === true` AND `authStore.isLocked === true`
- **THEN** LockScreen SHALL be rendered full-screen overlaying all other content

#### Scenario: Authenticated state shows main app
- **WHEN** `authStore.isOnboarded === true` AND `authStore.isLocked === false`
- **THEN** the TabNavigator SHALL be rendered with all 5 tabs accessible

#### Scenario: Loading state during hydration
- **WHEN** all Zustand stores have not yet completed hydration
- **THEN** a loading indicator SHALL be shown and no navigation decisions SHALL be made

### Requirement: Bottom tab navigation
The system SHALL provide a 5-tab bottom navigator with Wallet, Services, Scan (center), Activity, and Profile tabs.

#### Scenario: Scan tab has elevated center button
- **WHEN** the tab bar is visible
- **THEN** the Scan tab button SHALL appear as an elevated circular button (56×56px, EU Blue `#003399`) positioned above the tab bar

#### Scenario: Tab press triggers haptic feedback
- **WHEN** any tab is pressed
- **THEN** `Haptics.selectionAsync()` SHALL be called

### Requirement: Stack screen navigation
The system SHALL provide stack-based navigation for detail and flow screens that hide the tab bar.

#### Scenario: CredentialDetail hides tab bar
- **WHEN** user navigates to CredentialDetail
- **THEN** the bottom tab bar SHALL not be visible

#### Scenario: Navigate to CredentialDetail with ID
- **WHEN** user taps a credential card
- **THEN** navigation SHALL push CredentialDetail with `{ credentialId: string }` parameter

#### Scenario: Stack screens available
- **WHEN** the main stack is rendered
- **THEN** the following routes SHALL be available: CredentialDetail, RevokeConfirmation, Renewal, Issuance (modal), Notifications
