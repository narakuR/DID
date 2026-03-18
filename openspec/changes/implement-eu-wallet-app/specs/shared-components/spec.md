## ADDED Requirements

### Requirement: PinPad component
The system SHALL provide a reusable 6-digit PIN keyboard component with dot indicators, haptic feedback, and error animation, shared between OnboardingScreen and LockScreen.

#### Scenario: Digit input triggers haptic
- **WHEN** user presses a digit key
- **THEN** `Haptics.selectionAsync()` SHALL be called AND the dot count SHALL increase by 1

#### Scenario: Auto-complete on 6 digits
- **WHEN** the 6th digit is entered
- **THEN** `onComplete(pin)` SHALL be called immediately

#### Scenario: Error shake animation
- **WHEN** `error={true}` prop is set
- **THEN** the dot row SHALL animate with a horizontal shake AND dots SHALL turn red AND `Haptics.notificationAsync(Error)` SHALL be called

### Requirement: CredentialCard component
The system SHALL provide a credential card component with ISO/IEC 7810 ID-1 aspect ratio (1.586:1), LinearGradient background, and revoked/expired visual states.

#### Scenario: Aspect ratio maintained
- **WHEN** CredentialCard is rendered at any container width
- **THEN** the height SHALL be approximately width / 1.586 (±5%)

#### Scenario: Revoked state visual
- **WHEN** `credential.status === 'revoked'`
- **THEN** a "REVOKED" stamp SHALL appear rotated on a semi-transparent dark overlay AND opacity SHALL be 0.75

#### Scenario: Status badge display
- **WHEN** `showStatus={true}`
- **THEN** a badge showing 'Active' (green), 'Expired' (orange), or 'Revoked' (red) SHALL appear in the top-left corner

### Requirement: Shared UI components
The system SHALL provide SearchBar, FilterChips, DataSection/DataRow, Modal bottom sheet, LoadingOverlay, ActivityLogItem, NotificationItem, ServiceItem, and AlphaIndex components.

#### Scenario: SearchBar real-time filter
- **WHEN** user types in SearchBar
- **THEN** `onChange` SHALL be called on every keystroke with the current input value

#### Scenario: FilterChips selected state
- **WHEN** a chip is selected
- **THEN** it SHALL display EU Blue background with white text AND `onSelect` SHALL be called

#### Scenario: DataRow copy to clipboard
- **WHEN** `DataRow` has `copiable={true}` and user taps the copy icon
- **THEN** `expo-clipboard.setStringAsync(value)` SHALL be called

#### Scenario: Modal close by drag
- **WHEN** user drags the Modal bottom sheet downward
- **THEN** `onClose` SHALL be called and the modal SHALL dismiss

### Requirement: useInactivityTimer hook
The system SHALL provide a `useInactivityTimer` hook that starts a 5-minute foreground inactivity timer and monitors AppState changes.

#### Scenario: Timer reset on user interaction
- **WHEN** `resetTimer()` is called
- **THEN** the 5-minute countdown SHALL restart from zero

#### Scenario: No timer when locked
- **WHEN** `authStore.isLocked === true`
- **THEN** the inactivity timer SHALL not be started or running
