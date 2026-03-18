# T01 — 项目依赖安装与 Expo 配置

> **阶段**: 0 - 项目基础
> **依赖**: 无（第一个任务）
> **产出文件**: `package.json`, `app.config.ts`, `babel.config.js`, `.env.example`, `tsconfig.json`

---

## 任务描述

配置完整的 Expo Development Build 项目，安装所有必要依赖，确保原生模块可正常 prebuild。

---

## 实现步骤

### 1. 清理 Expo 模板文件

删除所有模板示例代码：
- `src/app/(tabs)/explore.tsx`
- `src/components/hello-wave.tsx`, `parallax-scroll-view.tsx`, `external-link.tsx` 等
- 保留 `src/app/_layout.tsx`（后续 T29 改写）

### 2. 安装依赖包

```bash
# 导航
npx expo install @react-navigation/native @react-navigation/bottom-tabs @react-navigation/native-stack react-native-screens react-native-safe-area-context

# 状态管理 & 持久化
npx expo install zustand @react-native-async-storage/async-storage

# 生物识别 & 安全
npx expo install expo-local-authentication expo-secure-store expo-crypto

# 相机 & QR
npx expo install expo-camera

# UI & 动画
npx expo install lucide-react-native react-native-reanimated react-native-gesture-handler expo-linear-gradient

# 图表
npx expo install react-native-gifted-charts react-native-svg

# 工具类
npx expo install expo-haptics expo-clipboard expo-sharing expo-font expo-status-bar @expo/vector-icons

# 国际化
npx expo install expo-localization i18n-js

# AI
npm install @google/genai

# 开发工具
npx expo install expo-dev-client expo-build-properties babel-plugin-module-resolver
```

### 3. app.config.ts

```typescript
import { ExpoConfig, ConfigContext } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'EU Wallet',
  slug: 'eu-wallet',
  version: '1.0.0',
  platforms: ['ios', 'android'],

  infoPlist: {
    NSCameraUsageDescription: '扫描凭证二维码',
    NSFaceIDUsageDescription: '使用 Face ID 解锁钱包',
  },

  android: {
    permissions: [
      'android.permission.CAMERA',
      'android.permission.USE_BIOMETRIC',
      'android.permission.USE_FINGERPRINT',
    ],
  },

  plugins: [
    'expo-camera',
    'expo-local-authentication',
    'expo-secure-store',
    [
      'expo-build-properties',
      {
        ios: { deploymentTarget: '15.0' },
        android: { compileSdkVersion: 35, targetSdkVersion: 34 },
      },
    ],
  ],

  extra: {
    geminiApiKey: process.env.EXPO_PUBLIC_GEMINI_API_KEY,
  },
});
```

### 4. babel.config.js（路径别名）

```javascript
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      [
        'module-resolver',
        {
          root: ['./src'],
          alias: {
            '@': './src',
            '@components': './src/components',
            '@screens': './src/screens',
            '@store': './src/store',
            '@services': './src/services',
            '@hooks': './src/hooks',
            '@i18n': './src/i18n',
            '@constants': './src/constants',
            '@types': './src/types',
            '@navigation': './src/navigation',
          },
        },
      ],
      'react-native-reanimated/plugin',  // 必须放最后
    ],
  };
};
```

### 5. tsconfig.json 路径别名同步

```json
{
  "extends": "expo/tsconfig.base",
  "compilerOptions": {
    "strict": true,
    "paths": {
      "@/*": ["./src/*"],
      "@components/*": ["./src/components/*"],
      "@screens/*": ["./src/screens/*"],
      "@store/*": ["./src/store/*"],
      "@services/*": ["./src/services/*"],
      "@hooks/*": ["./src/hooks/*"],
      "@i18n/*": ["./src/i18n/*"],
      "@constants/*": ["./src/constants/*"],
      "@navigation/*": ["./src/navigation/*"]
    }
  }
}
```

### 6. .env.example

```bash
EXPO_PUBLIC_GEMINI_API_KEY=your_gemini_api_key_here
```

### 7. 创建项目目录结构

```bash
mkdir -p src/{screens/{onboarding,lock,wallet,credential,scan,activity,services,profile},components,store,services,hooks,i18n/translations,constants,types,navigation}
```

---

## 验证标准

- [ ] `npx expo prebuild --clean` 成功，无报错
- [ ] `npx expo start --dev-client` 能正常启动 Metro
- [ ] `@/` 路径别名在 IDE 中正常识别
- [ ] `.env` 文件加载正常（`console.log(process.env.EXPO_PUBLIC_GEMINI_API_KEY)` 有值）

---

## 注意事项

- **不使用 EAS**，所有构建本地执行
- `react-native-reanimated/plugin` 必须是 babel plugins 最后一项
- 每次新增 Expo 原生插件后，需重新执行 `expo prebuild`
