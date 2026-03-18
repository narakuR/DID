# T06 — settingsStore（Zustand 设置状态）

> **阶段**: 1 - 状态管理层
> **依赖**: T02（类型）, T07（storageService）
> **产出文件**: `src/store/settingsStore.ts`

---

## 任务描述

管理主题（light/dark）和语言设置，持久化到 AsyncStorage，并在切换语言时处理 RTL。

---

## 实现内容

```typescript
import { create } from 'zustand';
import { I18nManager } from 'react-native';
import { Theme, Language } from '@/types';
import { storageService } from '@services/storageService';
import { STORAGE_KEYS } from '@constants/config';
import { setAppLanguage } from '@i18n/index';

interface SettingsState {
  theme: Theme;
  language: Language;
  isHydrated: boolean;

  toggleTheme: () => Promise<void>;
  setLanguage: (lang: Language) => Promise<void>;
  hydrate: () => Promise<void>;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  theme: 'light',
  language: 'en',
  isHydrated: false,

  toggleTheme: async () => {
    const newTheme: Theme = get().theme === 'light' ? 'dark' : 'light';
    set({ theme: newTheme });
    await storageService.setItem(STORAGE_KEYS.THEME, newTheme);
  },

  setLanguage: async (lang) => {
    set({ language: lang });
    setAppLanguage(lang);  // 同步更新 i18n 实例和 RTL 设置
    await storageService.setItem(STORAGE_KEYS.LANGUAGE, lang);
  },

  hydrate: async () => {
    const [theme, language] = await Promise.all([
      storageService.getItem<Theme>(STORAGE_KEYS.THEME),
      storageService.getItem<Language>(STORAGE_KEYS.LANGUAGE),
    ]);
    const resolvedLang = language ?? 'en';
    setAppLanguage(resolvedLang);
    set({
      theme: theme ?? 'light',
      language: resolvedLang,
      isHydrated: true,
    });
  },
}));
```

### RTL 处理说明

当语言切换为 `'ar'` 时：
- `I18nManager.allowRTL(true)`
- `I18nManager.forceRTL(true)`
- **注意**：RTL 切换在 RN 中需要重启 App 生效，应在 `setLanguage` 后提示用户重启

---

## 验证标准

- [ ] 默认语言为 `'en'`，默认主题为 `'light'`
- [ ] 切换主题后重启 App，主题保持
- [ ] 切换语言为 `'zh'` 后，`i18n.locale` 变为 `'zh'`
- [ ] 切换为 `'ar'` 时，`I18nManager.isRTL` 为 `true`
