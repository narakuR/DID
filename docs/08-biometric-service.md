# T08 — biometricService（生物识别封装）

> **阶段**: 2 - 服务层
> **依赖**: T01（expo-local-authentication、expo-secure-store 已安装）
> **产出文件**: `src/services/biometricService.ts`

---

## 任务描述

封装生物识别检查和认证逻辑，以及 PIN 码的安全存储（SecureStore）操作。

---

## 实现内容

```typescript
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import { SECURE_STORE_KEYS } from '@constants/config';

class BiometricService {
  /** 检查设备是否支持且已注册生物识别 */
  async isBiometricAvailable(): Promise<boolean> {
    const [supported, enrolled] = await Promise.all([
      LocalAuthentication.hasHardwareAsync(),
      LocalAuthentication.isEnrolledAsync(),
    ]);
    return supported && enrolled;
  }

  /** 触发生物识别验证 */
  async authenticate(promptMessage: string): Promise<boolean> {
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage,
        fallbackLabel: '使用 PIN 码',
        disableDeviceFallback: false,
      });
      return result.success;
    } catch (error) {
      console.error('[BiometricService] authenticate error:', error);
      return false;
    }
  }

  /** 存储 PIN（Keychain/Keystore 加密） */
  async savePin(pin: string): Promise<void> {
    await SecureStore.setItemAsync(SECURE_STORE_KEYS.PIN, pin);
  }

  /** 验证 PIN */
  async verifyPin(inputPin: string): Promise<boolean> {
    const storedPin = await SecureStore.getItemAsync(SECURE_STORE_KEYS.PIN);
    return storedPin === inputPin;
  }

  /** 删除存储的 PIN */
  async deletePin(): Promise<void> {
    await SecureStore.deleteItemAsync(SECURE_STORE_KEYS.PIN);
  }

  /** 存储云备份加密密钥 */
  async saveCloudKey(password: string): Promise<void> {
    await SecureStore.setItemAsync(SECURE_STORE_KEYS.CLOUD_BACKUP_KEY, password);
  }

  /** 获取云备份加密密钥 */
  async getCloudKey(): Promise<string | null> {
    return SecureStore.getItemAsync(SECURE_STORE_KEYS.CLOUD_BACKUP_KEY);
  }
}

export const biometricService = new BiometricService();
```

---

## 使用场景

| 场景 | 调用方法 |
|------|---------|
| Onboarding：选择生物识别 | `isBiometricAvailable()` |
| Onboarding：设置/修改 PIN | `savePin()` |
| LockScreen：PIN 验证 | `verifyPin()` |
| LockScreen：生物识别解锁 | `authenticate()` |
| CredentialDetail：出示凭证前 | `authenticate()` |
| Profile：启用云同步 | `authenticate()` |
| Profile：登出验证 | `authenticate()` |
| RevokeConfirmation：撤销前 | `authenticate()` |

---

## 验证标准

- [ ] `isBiometricAvailable()` 在模拟器上返回 `false`（无 FaceID 硬件），不崩溃
- [ ] `savePin('123456')` 后 `verifyPin('123456')` 返回 `true`
- [ ] `verifyPin('000000')` 在不匹配时返回 `false`
- [ ] PIN 不出现在 AsyncStorage 中（只在 SecureStore）
