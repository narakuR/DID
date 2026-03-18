# T11 — 多语言翻译文件（zh/es/fr/pt/ar）

> **阶段**: 3 - 国际化
> **依赖**: T10（英文翻译键名基准）
> **产出文件**: `src/i18n/translations/zh.ts`, `es.ts`, `fr.ts`, `pt.ts`, `ar.ts`

---

## 任务描述

基于 `en.ts` 的键名结构，实现 5 种语言的翻译文件。所有文件结构必须与 `en.ts` 完全一致。

---

## 文件一览

| 文件 | 语言 | 文字方向 |
|------|------|---------|
| `zh.ts` | 中文（简体） | LTR |
| `es.ts` | Español | LTR |
| `fr.ts` | Français | LTR |
| `pt.ts` | Português | LTR |
| `ar.ts` | العربية | **RTL** |

---

## `src/i18n/translations/zh.ts`（关键示例）

```typescript
export default {
  nav: {
    wallet: '钱包',
    services: '服务',
    scan: '扫描',
    activity: '活动',
    profile: '我的',
  },
  wallet: {
    title: '我的钱包',
    welcome: '欢迎回来，{{nickname}}',
    search: '搜索证件...',
    filter_all: '全部',
    empty_search: '未找到证件',
    credential_count: '{{count}} 张证件',
  },
  // ... 完整实现所有键
  onboard: {
    welcome_title: '您的数字身份',
    welcome_desc: '安全存储和管理您的欧盟数字身份凭证',
    start: '开始使用',
    // ... 所有 onboard 键
  },
  lock: {
    title: '钱包已锁定',
    session_expired: '您的会话已过期',
    use_biometric: '点击使用生物识别解锁',
    pin_error: 'PIN 码错误，请重试。',
  },
  // ... 其余所有键
};
```

---

## `src/i18n/translations/ar.ts`（RTL 语言注意）

```typescript
export default {
  nav: {
    wallet: 'محفظتي',
    services: 'الخدمات',
    scan: 'مسح',
    activity: 'النشاط',
    profile: 'الملف',
  },
  // ... 完整阿拉伯语翻译
};
```

**RTL 特殊处理**：
- 翻译内容本身不需要特殊处理，RTL 布局由 `I18nManager.forceRTL(true)` 控制
- 但需确保包含 `{{变量}}` 占位符的字符串在 RTL 下语序正确，例如：
  - 英文：`'Welcome back, {{nickname}}'`
  - 阿拉伯文：`'مرحباً بعودتك، {{nickname}}'`

---

## 与 Web 版翻译的对应关系

Web 版在 `LanguageContext.tsx` 中有 `TRANSLATIONS` 对象，包含所有 6 种语言翻译。RN 版应直接参照 Web 版已有的翻译内容，保持内容一致。

```
Web 版 LanguageContext → RN 版 i18n/translations/
  TRANSLATIONS['en']  →  en.ts
  TRANSLATIONS['zh']  →  zh.ts
  TRANSLATIONS['es']  →  es.ts
  TRANSLATIONS['fr']  →  fr.ts
  TRANSLATIONS['pt']  →  pt.ts
  TRANSLATIONS['ar']  →  ar.ts
```

---

## 验证标准

- [ ] 5 个文件均与 `en.ts` 的键名结构完全一致（相同嵌套层级和键名）
- [ ] 所有包含插值的键（`{{nickname}}`）在各语言文件中保留相同占位符
- [ ] `i18n.enableFallback = true` 确保某语言缺失键时 fallback 英文
- [ ] 阿拉伯语切换后 `I18nManager.isRTL` 为 `true`（在 T06 settingsStore 中已处理）
