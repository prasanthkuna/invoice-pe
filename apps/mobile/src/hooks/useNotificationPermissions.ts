import { useEffect } from 'react';
import * as Notifications from 'expo-notifications';
import { usePermissions } from './usePermissions';
import { PermissionType, PERMISSION_CONTEXTS } from '../types/permissions';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export const useNotificationPermissions = () => {
  const { requestPermission, checkPermission } = usePermissions();

  useEffect(() => {
    // Check permission status on mount
    checkPermission(PermissionType.NOTIFICATIONS);
  }, [checkPermission]);

  const requestNotificationPermission = async (showExplanation = true) => {
    return await requestPermission(
      PermissionType.NOTIFICATIONS,
      PERMISSION_CONTEXTS[PermissionType.NOTIFICATIONS],
      showExplanation
    );
  };

  const schedulePaymentNotification = async (
    title: string,
    body: string,
    data?: any,
    delaySeconds = 0
  ) => {
    try {
      const hasPermission = await requestNotificationPermission(false);
      
      if (!hasPermission) {
        console.log('Notification permission not granted');
        return null;
      }

      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data,
          sound: true,
        },
        trigger: delaySeconds > 0 ? { seconds: delaySeconds } as any : null,
      });

      return notificationId;
    } catch (error) {
      console.error('Error scheduling notification:', error);
      return null;
    }
  };

  const cancelNotification = async (notificationId: string) => {
    try {
      await Notifications.cancelScheduledNotificationAsync(notificationId);
    } catch (error) {
      console.error('Error canceling notification:', error);
    }
  };

  return {
    requestNotificationPermission,
    schedulePaymentNotification,
    cancelNotification,
  };
};
