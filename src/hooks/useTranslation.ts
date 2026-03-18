import { useCallback } from 'react';
import { useSettingsStore } from '@/store/settingsStore';
import i18n, { setAppLanguage } from '@/i18n';

export function useTranslation() {
  const language = useSettingsStore((s) => s.language);

  // Sync i18n locale when store language changes
  if (i18n.locale !== language) {
    setAppLanguage(language);
  }

  const t = useCallback(
    (scope: string, options?: object) => i18n.t(scope, options),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [language]
  );

  return { t, language };
}
