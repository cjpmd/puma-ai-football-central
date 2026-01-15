
import { useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { pushNotificationService } from '@/services/pushNotificationService';
import { webPushService } from '@/services/webPushService';
import { useAuth } from '@/contexts/AuthContext';

export type NotificationPlatform = 'capacitor' | 'web-push' | 'ios-safari' | 'none';

export const usePushNotifications = () => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [platform, setPlatform] = useState<NotificationPlatform>('none');
  const { user } = useAuth();

  // Detect iOS for limitation warnings
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || 
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

  // Check if running as PWA (installed to home screen)
  const isPWA = typeof window !== 'undefined' && (
    window.matchMedia('(display-mode: standalone)').matches || 
    (navigator as any).standalone === true
  );

  // Detect platform on mount
  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      setPlatform('capacitor');
    } else if (webPushService.requiresPWAInstall()) {
      // iOS Safari - needs to be installed as PWA first
      setPlatform('ios-safari');
    } else if (webPushService.isSupported()) {
      setPlatform('web-push');
      // Check existing permission for web
      const permission = webPushService.getPermissionStatus();
      if (permission === 'granted') {
        setPermissionGranted(true);
        setIsInitialized(true);
      }
    }
  }, []);

  // Auto-initialize for native platforms
  useEffect(() => {
    if (user && !isInitialized && platform === 'capacitor') {
      initializeNotifications();
    }
  }, [user, isInitialized, platform]);

  const initializeNotifications = async (): Promise<boolean> => {
    try {
      let granted = false;
      
      if (platform === 'capacitor') {
        granted = await pushNotificationService.initializePushNotifications();
      } else if (platform === 'web-push') {
        granted = await webPushService.initializeWebPush();
      } else if (platform === 'ios-safari') {
        // Can't initialize on iOS Safari - need to install as PWA first
        console.log('[Push] iOS Safari detected - please install app as PWA first');
        return false;
      }
      
      setPermissionGranted(granted);
      setIsInitialized(true);
      return granted;
    } catch (error) {
      console.error('[Push] Failed to initialize push notifications:', error);
      setIsInitialized(true);
      return false;
    }
  };

  const requestPermissions = async (): Promise<boolean> => {
    if (platform === 'none') {
      console.log('[Push] Push notifications not supported on this platform');
      return false;
    }
    
    if (platform === 'ios-safari') {
      console.log('[Push] iOS Safari - please install app as PWA first');
      return false;
    }
    
    const granted = await initializeNotifications();
    return granted;
  };

  const sendTestNotification = async () => {
    return webPushService.sendTestNotification();
  };

  return {
    isInitialized,
    permissionGranted,
    platform,
    requestPermissions,
    sendTestNotification,
    isSupported: platform !== 'none' && platform !== 'ios-safari',
    requiresPWAInstall: platform === 'ios-safari',
    isIOS,
    isPWA
  };
};
