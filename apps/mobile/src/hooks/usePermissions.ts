import { useState, useCallback } from 'react';
import { Platform, Alert, Linking } from 'react-native';
import { PermissionType, PermissionContext, PermissionState } from '../types/permissions';

// Dynamic imports for web compatibility
const getCamera = () => Platform.OS !== 'web' ? require('expo-camera') : null;
const getMediaLibrary = () => Platform.OS !== 'web' ? require('expo-media-library') : null;
const getNotifications = () => Platform.OS !== 'web' ? require('expo-notifications') : null;
const getLocation = () => Platform.OS !== 'web' ? require('expo-location') : null;
const getContacts = () => Platform.OS !== 'web' ? require('expo-contacts') : null;

export const usePermissions = () => {
  const [permissions, setPermissions] = useState<Record<PermissionType, PermissionState>>(() => ({} as Record<PermissionType, PermissionState>));

  const requestPermission = useCallback(async (
    type: PermissionType,
    context: PermissionContext,
    showExplanation = true
  ): Promise<boolean> => {
    // Web fallback - always return true for web
    if (Platform.OS === 'web') {
      console.log(`Web platform: Simulating ${type} permission grant`);
      const newState: PermissionState = {
        status: 'granted',
        canAskAgain: false,
      };
      setPermissions(prev => ({ ...prev, [type]: newState }));
      return true;
    }

    if (showExplanation) {
      const shouldProceed = await showPermissionExplanation(context);
      if (!shouldProceed) return false;
    }

    let result;
    try {
      const Camera = getCamera();
      const MediaLibrary = getMediaLibrary();
      const Notifications = getNotifications();
      const Location = getLocation();
      const Contacts = getContacts();

      switch (type) {
        case PermissionType.CAMERA:
          result = Camera ? await Camera.requestCameraPermissionsAsync() : { granted: false, canAskAgain: false };
          break;
        case PermissionType.MEDIA_LIBRARY:
          result = MediaLibrary ? await MediaLibrary.requestPermissionsAsync() : { granted: false, canAskAgain: false };
          break;
        case PermissionType.NOTIFICATIONS:
          result = Notifications ? await Notifications.requestPermissionsAsync() : { granted: false, canAskAgain: false };
          break;
        case PermissionType.LOCATION:
          result = Location ? await Location.requestForegroundPermissionsAsync() : { granted: false, canAskAgain: false };
          break;
        case PermissionType.CONTACTS:
          result = Contacts ? await Contacts.requestPermissionsAsync() : { granted: false, canAskAgain: false };
          break;
        default:
          return false;
      }

      const newState: PermissionState = {
        status: result.granted ? 'granted' : 'denied',
        canAskAgain: result.canAskAgain ?? false,
      };

      setPermissions(prev => ({ ...prev, [type]: newState }));

      if (!result.granted && !result.canAskAgain) {
        showSettingsAlert(context);
      }

      return result.granted;
    } catch (error) {
      console.error(`Error requesting ${type} permission:`, error);
      return false;
    }
  }, []);

  const checkPermission = useCallback(async (type: PermissionType): Promise<PermissionState> => {
    // Web fallback - always return granted for web
    if (Platform.OS === 'web') {
      const state: PermissionState = {
        status: 'granted',
        canAskAgain: false,
      };
      setPermissions(prev => ({ ...prev, [type]: state }));
      return state;
    }

    let result;
    try {
      const Camera = getCamera();
      const MediaLibrary = getMediaLibrary();
      const Notifications = getNotifications();
      const Location = getLocation();
      const Contacts = getContacts();

      switch (type) {
        case PermissionType.CAMERA:
          result = Camera ? await Camera.getCameraPermissionsAsync() : { granted: false, canAskAgain: false };
          break;
        case PermissionType.MEDIA_LIBRARY:
          result = MediaLibrary ? await MediaLibrary.getPermissionsAsync() : { granted: false, canAskAgain: false };
          break;
        case PermissionType.NOTIFICATIONS:
          result = Notifications ? await Notifications.getPermissionsAsync() : { granted: false, canAskAgain: false };
          break;
        case PermissionType.LOCATION:
          result = Location ? await Location.getForegroundPermissionsAsync() : { granted: false, canAskAgain: false };
          break;
        case PermissionType.CONTACTS:
          result = Contacts ? await Contacts.getPermissionsAsync() : { granted: false, canAskAgain: false };
          break;
        default:
          return { status: 'denied', canAskAgain: false };
      }

      const state: PermissionState = {
        status: result.granted ? 'granted' : 'denied',
        canAskAgain: result.canAskAgain ?? false,
      };

      setPermissions(prev => ({ ...prev, [type]: state }));
      return state;
    } catch (error) {
      console.error(`Error checking ${type} permission:`, error);
      return { status: 'denied', canAskAgain: false };
    }
  }, []);

  const showPermissionExplanation = (context: PermissionContext): Promise<boolean> => {
    return new Promise((resolve) => {
      Alert.alert(
        context.title,
        `${context.description}\n\nThis will help you:\n${context.benefits.map(b => `• ${b}`).join('\n')}`,
        [
          { 
            text: 'Not Now', 
            style: 'cancel',
            onPress: () => resolve(false) 
          },
          { 
            text: 'Allow', 
            style: 'default',
            onPress: () => resolve(true) 
          },
        ]
      );
    });
  };

  const showSettingsAlert = (context: PermissionContext) => {
    Alert.alert(
      'Permission Required',
      `To use ${context.feature}, please enable the permission in Settings.\n\n${context.fallbackAction || 'Some features may be limited.'}`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Open Settings', 
          style: 'default',
          onPress: () => Linking.openSettings() 
        },
      ]
    );
  };

  return { 
    permissions, 
    requestPermission, 
    checkPermission,
    showPermissionExplanation,
    showSettingsAlert
  };
};
