## ADDED Requirements

### Requirement: Services market listing
The system SHALL display 11 government and private services with search and category filtering.

#### Scenario: Service search filters by name and provider
- **WHEN** user types in the services search bar
- **THEN** only services matching the query in name OR provider fields SHALL be shown

#### Scenario: Category filter applies
- **WHEN** user selects a category chip (e.g., HEALTH)
- **THEN** only services with `category === 'HEALTH'` SHALL be displayed

#### Scenario: 11 services present
- **WHEN** ServicesScreen loads with no search or filter
- **THEN** exactly 11 service items SHALL be displayed

### Requirement: Service access flow modal
The system SHALL simulate a 5-step service access flow when a service is selected.

#### Scenario: 5-step flow auto-executes
- **WHEN** user taps a service item
- **THEN** a modal SHALL appear and automatically execute: CONNECT (1.5s) → AUTH (2s) → SHARE (2s) → SUCCESS (1.5s) → REDIRECT (1.5s)

#### Scenario: Step visual states
- **WHEN** the flow is running
- **THEN** completed steps SHALL show green CheckCircle, the current step SHALL show animation, and future steps SHALL be semi-transparent (opacity 0.4)

#### Scenario: Flow completes and closes
- **WHEN** REDIRECT step completes
- **THEN** the modal SHALL automatically close

### Requirement: Profile screen settings
The system SHALL provide a profile screen with user card and settings menu covering theme, language, security, and cloud sync.

#### Scenario: Theme toggle in profile
- **WHEN** user taps Dark Mode menu item
- **THEN** `settingsStore.toggleTheme()` SHALL be called and the setting value SHALL update to 'On' or 'Off'

#### Scenario: Language menu opens language picker
- **WHEN** user taps Language menu item
- **THEN** a modal SHALL show 6 language options with the current language highlighted in blue

### Requirement: Personal information editing
The system SHALL allow editing nickname and phone number via a modal.

#### Scenario: Save updates user profile
- **WHEN** user edits nickname and taps Save
- **THEN** `authStore.updateUser({ nickname })` SHALL be called AND the user card SHALL reflect the new name

### Requirement: Security settings
The system SHALL allow changing authentication method (biometric/PIN) via a profile modal.

#### Scenario: Switch to PIN requires 6-digit entry and confirmation
- **WHEN** user selects PIN mode and enters two matching 6-digit PINs
- **THEN** `biometricService.savePin(pin)` AND `authStore.updateUser({ authMethod: 'PIN' })` SHALL be called

#### Scenario: Mismatched PINs prevent save
- **WHEN** the two PIN entries do not match
- **THEN** the Save button SHALL remain disabled

### Requirement: Cloud sync wizard
The system SHALL provide a 5-step cloud sync setup wizard (intro → bio verify → password → syncing → success) accessible from profile.

#### Scenario: Bio verification gates password step
- **WHEN** user reaches the bio step
- **THEN** `biometricService.authenticate()` SHALL be called and password step SHALL only appear on success

#### Scenario: Password requires 4+ chars and confirmation match
- **WHEN** user enters a password shorter than 4 characters OR two non-matching passwords
- **THEN** the confirm button SHALL be disabled

#### Scenario: Sync completes and updates store
- **WHEN** syncing simulation completes
- **THEN** `authStore.updateCloudSync(true, timestamp)` SHALL be called

### Requirement: Logout with bio confirmation
The system SHALL require biometric verification before clearing all wallet data on logout.

#### Scenario: Logout requires biometric success
- **WHEN** user confirms logout and biometric verification succeeds
- **THEN** `walletStore.clearWallet()` AND `authStore.logout()` SHALL be called in order

#### Scenario: Failed bio cancels logout
- **WHEN** biometric verification fails during logout
- **THEN** no data SHALL be cleared and an error SHALL be shown
