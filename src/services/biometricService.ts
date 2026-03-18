import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import { SECURE_STORE_KEYS } from '@/constants/config';

class BiometricService {
  async isBiometricAvailable(): Promise<boolean> {
    try {
      const compatible = await LocalAuthentication.hasHardwareAsync();
      if (!compatible) return false;
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      return enrolled;
    } catch {
      return false;
    }
  }

  async authenticate(promptMessage = 'Authenticate to continue'): Promise<boolean> {
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage,
        cancelLabel: 'Cancel',
        fallbackLabel: 'Use PIN',
        disableDeviceFallback: false,
      });
      return result.success;
    } catch {
      return false;
    }
  }

  async savePin(pin: string): Promise<void> {
    try {
      await SecureStore.setItemAsync(SECURE_STORE_KEYS.PIN, pin);
    } catch (e) {
      console.warn('[BiometricService] savePin error:', e);
    }
  }

  async verifyPin(inputPin: string): Promise<boolean> {
    try {
      const stored = await SecureStore.getItemAsync(SECURE_STORE_KEYS.PIN);
      return stored === inputPin;
    } catch {
      return false;
    }
  }

  async deletePin(): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(SECURE_STORE_KEYS.PIN);
    } catch (e) {
      console.warn('[BiometricService] deletePin error:', e);
    }
  }

  async saveCloudKey(password: string): Promise<void> {
    try {
      await SecureStore.setItemAsync(SECURE_STORE_KEYS.CLOUD_KEY, password);
    } catch (e) {
      console.warn('[BiometricService] saveCloudKey error:', e);
    }
  }

  async getCloudKey(): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync(SECURE_STORE_KEYS.CLOUD_KEY);
    } catch {
      return null;
    }
  }
}

export const biometricService = new BiometricService();
