import { useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';

import { pushNotificationService } from '@/services/pushNotificationService';

export function usePushNotifications(enabled: boolean) {
  const notificationListener = useRef<Notifications.EventSubscription | null>(null);
  const responseListener = useRef<Notifications.EventSubscription | null>(null);

  useEffect(() => {
    if (!enabled) return;

    void pushNotificationService.registerForPushNotifications();

    notificationListener.current = Notifications.addNotificationReceivedListener((notification) => {
      void pushNotificationService.handleIncomingNotification(notification);
    });

    responseListener.current = Notifications.addNotificationResponseReceivedListener((response) => {
      void pushNotificationService.handleNotificationResponse(response);
    });

    void Notifications.getLastNotificationResponseAsync().then((response) => {
      if (!response) return;
      void pushNotificationService.handleNotificationResponse(response);
    });

    return () => {
      notificationListener.current?.remove();
      responseListener.current?.remove();
      notificationListener.current = null;
      responseListener.current = null;
    };
  }, [enabled]);
}
