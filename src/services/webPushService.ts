
import { supabase } from '@/integrations/supabase/client';

// VAPID public key for Web Push authentication
const VAPID_PUBLIC_KEY = 'BE4Vc8geGw97zYpakiIVudhgrdgnU75q-ddHwrsFRUX0NbJHd3VAYClF_kjIFaqwss4LDmryMqreKtnw0xgBvgE';

// Dedicated push service worker path
const PUSH_SW_PATH = '/sw-push.js';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');
  
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Check if running as iOS PWA (installed to home screen)
 */
function isIOSPWA(): boolean {
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches || 
                       (navigator as any).standalone === true;
  return isIOS && isStandalone;
}

/**
 * Check if running on iOS Safari (not PWA)
 */
function isIOSSafari(): boolean {
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches || 
                       (navigator as any).standalone === true;
  return isIOS && !isStandalone;
}

export const webPushService = {
  /**
   * Check if Web Push is supported in the current browser
   */
  isSupported(): boolean {
    const hasServiceWorker = 'serviceWorker' in navigator;
    const hasPushManager = 'PushManager' in window;
    const hasNotification = 'Notification' in window;
    
    // On iOS, push only works when running as PWA
    if (isIOSSafari()) {
      console.log('[WebPush] iOS Safari detected - push only works when installed as PWA');
      return false;
    }
    
    return hasServiceWorker && hasPushManager && hasNotification;
  },

  /**
   * Check if this is iOS and needs PWA installation
   */
  requiresPWAInstall(): boolean {
    return isIOSSafari();
  },

  /**
   * Check if running as iOS PWA
   */
  isIOSPWA(): boolean {
    return isIOSPWA();
  },

  /**
   * Get the current notification permission status
   */
  getPermissionStatus(): NotificationPermission | 'unsupported' {
    if (!this.isSupported()) {
      return 'unsupported';
    }
    return Notification.permission;
  },

  /**
   * Initialize Web Push notifications using dedicated push service worker
   * Returns true if successfully subscribed, false otherwise
   */
  async initializeWebPush(): Promise<boolean> {
    if (!this.isSupported()) {
      console.log('[WebPush] Web Push not supported in this browser');
      return false;
    }

    try {
      // Request notification permission (MUST be triggered by user gesture)
      const permission = await Notification.requestPermission();
      
      if (permission !== 'granted') {
        console.log('[WebPush] Notification permission denied');
        return false;
      }

      // Register dedicated push service worker
      console.log('[WebPush] Registering dedicated push service worker...');
      const registration = await navigator.serviceWorker.register(PUSH_SW_PATH, {
        scope: '/'
      });
      
      console.log('[WebPush] Push service worker registered:', registration);

      // Wait for service worker to be ready
      await navigator.serviceWorker.ready;
      
      // Check for existing subscription
      let subscription = await registration.pushManager.getSubscription();
      
      if (!subscription) {
        // Create new subscription
        console.log('[WebPush] Creating new push subscription...');
        const applicationServerKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: applicationServerKey.buffer as ArrayBuffer
        });
        console.log('[WebPush] New subscription created');
      } else {
        console.log('[WebPush] Using existing subscription');
      }

      // Save subscription to Supabase
      await this.saveSubscription(subscription);
      
      console.log('[WebPush] Web Push initialized successfully');
      return true;
    } catch (error) {
      console.error('[WebPush] Failed to initialize Web Push:', error);
      return false;
    }
  },

  /**
   * Save the push subscription to Supabase profiles table
   * Stores in the push_token field as JSON string for Web Push subscriptions
   */
  async saveSubscription(subscription: PushSubscription): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      console.error('[WebPush] No authenticated user found');
      return;
    }

    const subscriptionJSON = subscription.toJSON();
    
    // Store Web Push subscription as a JSON string with a prefix to identify it
    const webPushToken = `webpush:${JSON.stringify(subscriptionJSON)}`;
    
    const { error } = await supabase
      .from('profiles')
      .update({ 
        push_token: webPushToken
      })
      .eq('id', user.id);

    if (error) {
      console.error('[WebPush] Failed to save Web Push subscription:', error);
      throw error;
    }
    
    console.log('[WebPush] Web Push subscription saved to database');
  },

  /**
   * Unsubscribe from Web Push notifications
   */
  async unsubscribe(): Promise<boolean> {
    if (!this.isSupported()) {
      return false;
    }

    try {
      // Try both the dedicated push SW and the main SW
      const registration = await navigator.serviceWorker.getRegistration(PUSH_SW_PATH) ||
                          await navigator.serviceWorker.ready;
      
      const subscription = await registration.pushManager.getSubscription();
      
      if (subscription) {
        await subscription.unsubscribe();
        
        // Remove from database
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase
            .from('profiles')
            .update({ push_token: null })
            .eq('id', user.id);
        }
        console.log('[WebPush] Unsubscribed successfully');
      }
      
      return true;
    } catch (error) {
      console.error('[WebPush] Failed to unsubscribe from Web Push:', error);
      return false;
    }
  },

  /**
   * Send a test notification via the Edge Function
   */
  async sendTestNotification(): Promise<boolean> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        console.error('[WebPush] No authenticated user');
        return false;
      }

      console.log('[WebPush] Sending test notification...');
      
      const { error } = await supabase.functions.invoke('send-push-notification', {
        body: {
          title: 'Test Notification 🔔',
          body: 'Web Push is working! Puma-AI notifications are enabled.',
          userIds: [user.id]
        }
      });

      if (error) {
        console.error('[WebPush] Failed to send test notification:', error);
        return false;
      }

      console.log('[WebPush] Test notification sent successfully');
      return true;
    } catch (error) {
      console.error('[WebPush] Error sending test notification:', error);
      return false;
    }
  }
};
