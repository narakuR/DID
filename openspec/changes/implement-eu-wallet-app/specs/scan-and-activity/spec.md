## ADDED Requirements

### Requirement: QR code scanning with camera
The system SHALL use `expo-camera` to scan QR codes and parse credential offers, with demo mode fallback when camera permission is denied.

#### Scenario: Camera permission granted shows live view
- **WHEN** camera permission is granted
- **THEN** a live camera preview SHALL fill the scan area with a EU-yellow (#FFCE00) corner-marked scan frame and an animated red scan line

#### Scenario: Camera permission denied shows demo mode
- **WHEN** camera permission is denied
- **THEN** a grey placeholder SHALL show with an explanation and a "Demo Scan" button

#### Scenario: Demo scan triggers credential offer
- **WHEN** user taps the Demo Scan button
- **THEN** after 1.5 seconds a credential offer modal SHALL appear with a mock HealthInsurance credential

#### Scenario: Scan frame corner markers
- **WHEN** the scan screen is visible
- **THEN** four L-shaped corner markers SHALL be visible in EU Yellow (#FFCE00)

### Requirement: Credential offer acceptance
The system SHALL display a credential offer modal after scanning and allow the user to accept or decline.

#### Scenario: Accept adds credential to wallet
- **WHEN** user taps Accept on the credential offer modal
- **THEN** `walletStore.addCredential(offeredCredential)` SHALL be called AND `Haptics.notificationAsync(Success)` SHALL fire AND navigation SHALL return to Wallet tab

#### Scenario: Decline dismisses modal
- **WHEN** user taps Decline
- **THEN** the modal SHALL dismiss AND the camera SHALL return to scanning state

### Requirement: Activity log with bar chart
The system SHALL display a 7-day disclosure bar chart and a filterable list of activity log entries.

#### Scenario: Bar chart renders 7 days
- **WHEN** ActivityScreen is rendered
- **THEN** a bar chart SHALL show Mon–Sun with Saturday (value=8) in EU Blue and all others in grey

#### Scenario: Activity filter — single type
- **WHEN** user selects PRESENTED filter
- **THEN** only logs with `action === 'PRESENTED'` SHALL appear in the list

#### Scenario: Activity filter — ALL
- **WHEN** user selects ALL filter
- **THEN** all 6 mock activity logs SHALL be visible

#### Scenario: Log item icon matches action
- **WHEN** an activity log with action PRESENTED is displayed
- **THEN** the icon SHALL be ArrowUpRight in blue; RECEIVED SHALL be ArrowDownLeft in green; REVOKED SHALL be Trash2 in red

#### Scenario: Empty state after filter
- **WHEN** a filter is selected that matches zero logs
- **THEN** an empty state with History icon and message SHALL be shown
