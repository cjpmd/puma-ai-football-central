
import { useEffect, useState } from 'react';
import { pushNotificationService } from '@/services/pushNotificationService';
import { useAuth } from '@/contexts/AuthContext';
import { Capacitor } from '@capacitor/core';

export const usePushNotifications = () => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    if (user && !isInitialized && Capacitor.isNativePlatform()) {
      initializeNotifications();
    }
  }, [user, isInitialized]);

  const initializeNotifications = async () => {
    try {
      const granted = await pushNotificationService.initializePushNotifications();
      setPermissionGranted(granted);
      setIsInitialized(true);
    } catch (error) {
      console.error('Failed to initialize push notifications:', error);
      setIsInitialized(true);
    }
  };

  const requestPermissions = async () => {
    if (!Capacitor.isNativePlatform()) {
      console.log('Push notifications not supported on web platform');
      return false;
    }
    
    const granted = await pushNotificationService.initializePushNotifications();
    setPermissionGranted(granted);
    return granted;
  };

  return {
    isInitialized,
    permissionGranted,
    requestPermissions
  };
};
