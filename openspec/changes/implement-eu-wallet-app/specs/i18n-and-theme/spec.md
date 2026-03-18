## ADDED Requirements

### Requirement: Multi-language support
The system SHALL support 6 languages: English (en), Chinese Simplified (zh), Spanish (es), French (fr), Portuguese (pt), and Arabic (ar). English SHALL be the default and fallback language.

#### Scenario: Translation key resolution
- **WHEN** `t('nav.wallet')` is called with language set to 'en'
- **THEN** it returns `'Wallet'`

#### Scenario: Interpolation support
- **WHEN** `t('wallet.welcome', { nickname: 'Alex' })` is called
- **THEN** it returns `'Welcome back, Alex'`

#### Scenario: Missing key fallback
- **WHEN** a translation key exists in English but is missing in another language
- **THEN** the English value SHALL be returned (i18n.enableFallback = true)

### Requirement: Language persistence
The system SHALL persist the selected language to AsyncStorage and restore it on app startup.

#### Scenario: Language survives restart
- **WHEN** user selects Chinese and restarts the app
- **THEN** the app SHALL launch with Chinese translations active

### Requirement: Arabic RTL layout
The system SHALL enable right-to-left layout when Arabic language is selected, requiring an app restart to take effect.

#### Scenario: RTL flag set on Arabic selection
- **WHEN** `settingsStore.setLanguage('ar')` is called
- **THEN** `I18nManager.forceRTL(true)` SHALL be called

#### Scenario: LTR restored on non-Arabic selection
- **WHEN** `settingsStore.setLanguage('en')` is called after Arabic was selected
- **THEN** `I18nManager.forceRTL(false)` SHALL be called

### Requirement: Light/dark theme
The system SHALL support light and dark themes with real-time switching and persistence.

#### Scenario: Theme toggle
- **WHEN** `settingsStore.toggleTheme()` is called
- **THEN** the theme SHALL switch between 'light' and 'dark' and all screens SHALL reflect the change

#### Scenario: Theme persistence
- **WHEN** user sets dark theme and restarts the app
- **THEN** the app SHALL launch in dark theme

#### Scenario: Color scheme correctness
- **WHEN** dark theme is active
- **THEN** background color SHALL be `#111827`, surface SHALL be `#1F2937`, text SHALL be `#F9FAFB`

#### Scenario: Color scheme correctness light
- **WHEN** light theme is active
- **THEN** background color SHALL be `#F9FAFB`, surface SHALL be `#FFFFFF`, text SHALL be `#111827`
