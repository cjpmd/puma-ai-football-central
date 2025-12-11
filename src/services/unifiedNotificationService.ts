
import { Capacitor } from '@capacitor/core';
import { pushNotificationService } from './pushNotificationService';
import { webPushService } from './webPushService';

export type NotificationPlatform = 'capacitor' | 'web-push' | 'none';

export interface NotificationStatus {
  platform: NotificationPlatform;
  isSupported: boolean;
  isInitialized: boolean;
  permissionGranted: boolean;
}

/**
 * Unified notification service that automatically detects the platform
 * and uses the appropriate push notification method (Capacitor or Web Push)
 */
export const unifiedNotificationService = {
  /**
   * Detect which notification platform should be used
   */
  detectPlatform(): NotificationPlatform {
    if (Capacitor.isNativePlatform()) {
      return 'capacitor';
    }
    if (webPushService.isSupported()) {
      return 'web-push';
    }
    return 'none';
  },

  /**
   * Get the current notification status
   */
  async getStatus(): Promise<NotificationStatus> {
    const platform = this.detectPlatform();
    
    if (platform === 'capacitor') {
      // For Capacitor, we check if we're on a native platform
      return {
        platform,
        isSupported: true,
        isInitialized: false, // Would need to track this separately
        permissionGranted: false // Would need to check Capacitor permission
      };
    }
    
    if (platform === 'web-push') {
      const permission = webPushService.getPermissionStatus();
      return {
        platform,
        isSupported: true,
        isInitialized: permission === 'granted',
        permissionGranted: permission === 'granted'
      };
    }
    
    return {
      platform: 'none',
      isSupported: false,
      isInitialized: false,
      permissionGranted: false
    };
  },

  /**
   * Initialize push notifications using the appropriate platform
   * Returns true if successfully initialized
   */
  async initialize(): Promise<boolean> {
    const platform = this.detectPlatform();
    
    console.log(`Initializing notifications for platform: ${platform}`);
    
    if (platform === 'capacitor') {
      try {
        return await pushNotificationService.initializePushNotifications();
      } catch (error) {
        console.error('Failed to initialize Capacitor push notifications:', error);
        return false;
      }
    }
    
    if (platform === 'web-push') {
      try {
        return await webPushService.initializeWebPush();
      } catch (error) {
        console.error('Failed to initialize Web Push notifications:', error);
        return false;
      }
    }
    
    console.log('No notification platform available');
    return false;
  },

  /**
   * Request notification permissions
   */
  async requestPermission(): Promise<boolean> {
    return this.initialize();
  },

  /**
   * Send a test notification
   */
  async sendTestNotification(): Promise<boolean> {
    const platform = this.detectPlatform();
    
    if (platform === 'web-push') {
      return webPushService.sendTestNotification();
    }
    
    // For Capacitor, use the existing service
    if (platform === 'capacitor') {
      // The Capacitor push service doesn't have a direct test method,
      // but we can use the availability notification as a workaround
      console.log('Test notification for Capacitor - use Edge Function directly');
      return webPushService.sendTestNotification(); // Uses the same Edge Function
    }
    
    return false;
  },

  /**
   * Check if the current platform supports background notifications
   */
  supportsBackgroundNotifications(): boolean {
    const platform = this.detectPlatform();
    
    if (platform === 'capacitor') {
      return true; // Native apps fully support background notifications
    }
    
    if (platform === 'web-push') {
      // Check if it's iOS Safari (limited support)
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
      const isSafari = /Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent);
      
      if (isIOS && isSafari) {
        // iOS Safari requires iOS 16.4+ and must be installed to home screen
        return false; // Conservative - tell users it may not work reliably
      }
      
      return true; // Android Chrome and desktop browsers work well
    }
    
    return false;
  },

  /**
   * Get platform-specific instructions for enabling notifications
   */
  getEnableInstructions(): string {
    const platform = this.detectPlatform();
    
    if (platform === 'capacitor') {
      return 'Tap "Enable Notifications" and allow when prompted.';
    }
    
    if (platform === 'web-push') {
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
      
      if (isIOS) {
        return 'For best results on iOS: 1) Tap Share button, 2) "Add to Home Screen", 3) Open from home screen, 4) Enable notifications.';
      }
      
      return 'Tap "Enable Notifications" and allow when prompted by your browser.';
    }
    
    return 'Push notifications are not supported in this browser.';
  }
};
