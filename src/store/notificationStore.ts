import { create } from 'zustand';

import { STORAGE_KEYS } from '@/constants/config';
import { storageService } from '@/services/storageService';
import { PushNotificationRecord } from '@/types';

interface NotificationState {
  devicePushToken: string | null;
  notifications: PushNotificationRecord[];
  unreadCount: number;
  isHydrated: boolean;

  setDevicePushToken: (token: string | null) => Promise<void>;
  addNotification: (record: PushNotificationRecord) => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  clearNotifications: () => Promise<void>;
  hydrate: () => Promise<void>;
}

function getUnreadCount(notifications: PushNotificationRecord[]): number {
  return notifications.filter((item) => !item.isRead).length;
}

async function persistNotifications(notifications: PushNotificationRecord[]) {
  await storageService.setItem(STORAGE_KEYS.NOTIFICATIONS, notifications);
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  devicePushToken: null,
  notifications: [],
  unreadCount: 0,
  isHydrated: false,

  setDevicePushToken: async (token) => {
    if (token) {
      await storageService.setItem(STORAGE_KEYS.DEVICE_PUSH_TOKEN, token);
    } else {
      await storageService.removeItem(STORAGE_KEYS.DEVICE_PUSH_TOKEN);
    }
    set({ devicePushToken: token });
  },

  addNotification: async (record) => {
    const existing = get().notifications.find((item) => item.id === record.id);
    const notifications = existing
      ? get().notifications.map((item) => (item.id === record.id ? { ...item, ...record } : item))
      : [record, ...get().notifications];

    await persistNotifications(notifications);
    set({
      notifications,
      unreadCount: getUnreadCount(notifications),
    });
  },

  markAsRead: async (id) => {
    const notifications = get().notifications.map((item) =>
      item.id === id ? { ...item, isRead: true } : item
    );
    await persistNotifications(notifications);
    set({
      notifications,
      unreadCount: getUnreadCount(notifications),
    });
  },

  markAllAsRead: async () => {
    const notifications = get().notifications.map((item) => ({ ...item, isRead: true }));
    await persistNotifications(notifications);
    set({
      notifications,
      unreadCount: 0,
    });
  },

  clearNotifications: async () => {
    await storageService.removeItem(STORAGE_KEYS.NOTIFICATIONS);
    set({
      notifications: [],
      unreadCount: 0,
    });
  },

  hydrate: async () => {
    const [devicePushToken, notifications] = await Promise.all([
      storageService.getItem<string>(STORAGE_KEYS.DEVICE_PUSH_TOKEN),
      storageService.getItem<PushNotificationRecord[]>(STORAGE_KEYS.NOTIFICATIONS),
    ]);

    set({
      devicePushToken,
      notifications: notifications ?? [],
      unreadCount: getUnreadCount(notifications ?? []),
      isHydrated: true,
    });
  },
}));
