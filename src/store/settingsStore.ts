import { create } from 'zustand';
import { I18nManager } from 'react-native';
import { storageService } from '@/services/storageService';
import { STORAGE_KEYS } from '@/constants/config';
import { Theme, Language } from '@/types';

interface PersistedSettings {
  theme: Theme;
  language: Language;
}

interface SettingsState {
  theme: Theme;
  language: Language;
  isHydrated: boolean;

  toggleTheme: () => Promise<void>;
  setLanguage: (language: Language) => Promise<void>;
  hydrate: () => Promise<void>;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  theme: 'light',
  language: 'en',
  isHydrated: false,

  toggleTheme: async () => {
    const newTheme: Theme = get().theme === 'light' ? 'dark' : 'light';
    await storageService.setItem<PersistedSettings>(STORAGE_KEYS.SETTINGS, {
      theme: newTheme,
      language: get().language,
    });
    set({ theme: newTheme });
  },

  setLanguage: async (language) => {
    const isRTL = language === 'ar';
    I18nManager.forceRTL(isRTL);
    await storageService.setItem<PersistedSettings>(STORAGE_KEYS.SETTINGS, {
      theme: get().theme,
      language,
    });
    set({ language });
  },

  hydrate: async () => {
    const saved = await storageService.getItem<PersistedSettings>(STORAGE_KEYS.SETTINGS);
    if (saved) {
      set({ theme: saved.theme, language: saved.language, isHydrated: true });
    } else {
      set({ isHydrated: true });
    }
  },
}));
