import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';

import { PushNotificationCategory, PushNotificationRecord } from '@/types';
import { useNotificationStore } from '@/store/notificationStore';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

function normalizeCategory(category: unknown): PushNotificationCategory {
  switch (category) {
    case 'CREDENTIAL_EXPIRY':
    case 'CREDENTIAL_REVOKED':
    case 'CREDENTIAL_ISSUED':
    case 'VERIFICATION_REQUEST':
    case 'BACKUP_REMINDER':
      return category;
    default:
      return 'SYSTEM';
  }
}

export function mapExpoNotificationToRecord(
  notification: Notifications.Notification
): PushNotificationRecord {
  const content = notification.request.content;
  return {
    id: notification.request.identifier,
    category: normalizeCategory(content.data?.category),
    title: content.title ?? '',
    body: content.body ?? '',
    data: content.data as Record<string, unknown>,
    receivedAt: new Date().toISOString(),
    isRead: false,
  };
}

async function configureAndroidChannels() {
  if (Platform.OS !== 'android') return;

  await Notifications.setNotificationChannelAsync('default', {
    name: 'General',
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#003399',
  });

  await Notifications.setNotificationChannelAsync('credentials', {
    name: 'Credentials',
    importance: Notifications.AndroidImportance.HIGH,
  });
}

class PushNotificationService {
  async registerForPushNotifications(): Promise<{
    devicePushToken: string | null;
    error: string | null;
    permissionStatus: string;
    platform: string;
    isDevice: boolean;
    rawTokenData: string | null;
  }> {
    await configureAndroidChannels();

    if (Platform.OS === 'ios' && !Device.isDevice) {
      console.warn('[Push] iOS remote push notifications require a physical device.');
      return {
        devicePushToken: null,
        error: 'iOS remote push notifications require a physical device.',
        permissionStatus: 'unknown',
        platform: Platform.OS,
        isDevice: Device.isDevice,
        rawTokenData: null,
      };
    }

    const permissions = await Notifications.getPermissionsAsync();
    let finalStatus = permissions.status;
    if (finalStatus !== 'granted') {
      const requested = await Notifications.requestPermissionsAsync();
      finalStatus = requested.status;
    }

    if (finalStatus !== 'granted') {
      return {
        devicePushToken: null,
        error: `Notification permission not granted: ${finalStatus}`,
        permissionStatus: finalStatus,
        platform: Platform.OS,
        isDevice: Device.isDevice,
        rawTokenData: null,
      };
    }

    let devicePushToken: string | null = null;
    let errorMessage: string | null = null;
    let rawTokenData: string | null = null;
    try {
      const nativeToken = await Notifications.getDevicePushTokenAsync();
      rawTokenData = JSON.stringify(nativeToken.data ?? null);
      devicePushToken =
        typeof nativeToken.data === 'string'
          ? nativeToken.data
          : nativeToken.data
            ? JSON.stringify(nativeToken.data)
            : null;
    } catch (caughtError) {
      const message = caughtError instanceof Error ? caughtError.message : JSON.stringify(caughtError);
      console.warn('[Push] Failed to fetch native device token:', caughtError);
      errorMessage = message;
    }

    await useNotificationStore.getState().setDevicePushToken(devicePushToken);

    return {
      devicePushToken,
      error: errorMessage,
      permissionStatus: finalStatus,
      platform: Platform.OS,
      isDevice: Device.isDevice,
      rawTokenData,
    };
  }

  async handleIncomingNotification(notification: Notifications.Notification): Promise<void> {
    const record = mapExpoNotificationToRecord(notification);
    await useNotificationStore.getState().addNotification(record);
  }

  async handleNotificationResponse(response: Notifications.NotificationResponse): Promise<void> {
    const record = mapExpoNotificationToRecord(response.notification);
    await useNotificationStore.getState().addNotification(record);
    await useNotificationStore.getState().markAsRead(record.id);
  }

  async scheduleLocalDemoNotification(): Promise<string> {
    return Notifications.scheduleNotificationAsync({
      content: {
        title: 'EU Wallet',
        body: 'This is a local notification demo. Firebase pushes will arrive here too.',
        data: {
          category: 'SYSTEM',
          source: 'local-demo',
        },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: 5,
      },
    });
  }
}

export const pushNotificationService = new PushNotificationService();
