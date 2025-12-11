
import { supabase } from '@/integrations/supabase/client';

// VAPID public key for Web Push authentication
const VAPID_PUBLIC_KEY = 'BE4Vc8geGw97zYpakiIVudhgrdgnU75q-ddHwrsFRUX0NbJHd3VAYClF_kjIFaqwss4LDmryMqreKtnw0xgBvgE';

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

export const webPushService = {
  /**
   * Check if Web Push is supported in the current browser
   */
  isSupported(): boolean {
    return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
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
   * Initialize Web Push notifications
   * Returns true if successfully subscribed, false otherwise
   */
  async initializeWebPush(): Promise<boolean> {
    if (!this.isSupported()) {
      console.log('Web Push not supported in this browser');
      return false;
    }

    try {
      // Request notification permission
      const permission = await Notification.requestPermission();
      
      if (permission !== 'granted') {
        console.log('Notification permission denied');
        return false;
      }

      // Wait for service worker to be ready
      const registration = await navigator.serviceWorker.ready;
      
      // Check for existing subscription
      let subscription = await registration.pushManager.getSubscription();
      
      if (!subscription) {
        // Create new subscription with proper typing
        const applicationServerKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: applicationServerKey.buffer as ArrayBuffer
        });
      }

      // Save subscription to Supabase
      await this.saveSubscription(subscription);
      
      console.log('Web Push initialized successfully');
      return true;
    } catch (error) {
      console.error('Failed to initialize Web Push:', error);
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
      console.error('No authenticated user found');
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
      console.error('Failed to save Web Push subscription:', error);
      throw error;
    }
    
    console.log('Web Push subscription saved to database');
  },

  /**
   * Unsubscribe from Web Push notifications
   */
  async unsubscribe(): Promise<boolean> {
    if (!this.isSupported()) {
      return false;
    }

    try {
      const registration = await navigator.serviceWorker.ready;
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
      }
      
      return true;
    } catch (error) {
      console.error('Failed to unsubscribe from Web Push:', error);
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
        console.error('No authenticated user');
        return false;
      }

      const { error } = await supabase.functions.invoke('send-push-notification', {
        body: {
          title: 'Test Notification',
          body: 'Web Push is working! 🎉',
          userIds: [user.id]
        }
      });

      if (error) {
        console.error('Failed to send test notification:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error sending test notification:', error);
      return false;
    }
  }
};
