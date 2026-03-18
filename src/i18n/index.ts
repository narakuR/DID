import { I18n } from 'i18n-js';
import { I18nManager } from 'react-native';

import en from './translations/en';
import zh from './translations/zh';
import es from './translations/es';
import fr from './translations/fr';
import pt from './translations/pt';
import ar from './translations/ar';

const i18n = new I18n({ en, zh, es, fr, pt, ar });

// Detect device locale via lazy require — expo-localization needs native bridge.
// Falls back to 'en' when running without a native build (Expo Go / web).
function getDeviceLocale(): string {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const Localization = require('expo-localization');
    return Localization.getLocales?.()[0]?.languageCode ?? 'en';
  } catch {
    return 'en';
  }
}

const supportedLocales = ['en', 'zh', 'es', 'fr', 'pt', 'ar'];
const deviceLocale = getDeviceLocale();
i18n.locale = supportedLocales.includes(deviceLocale) ? deviceLocale : 'en';
i18n.enableFallback = true;
i18n.defaultLocale = 'en';

export function setAppLanguage(lang: string) {
  i18n.locale = lang;
  I18nManager.forceRTL(lang === 'ar');
}

export function t(scope: string, options?: object): string {
  return i18n.t(scope, options);
}

export default i18n;
