
import { PushNotifications } from '@capacitor/push-notifications';
import { Capacitor } from '@capacitor/core';
import { supabase } from '@/integrations/supabase/client';

export interface NotificationPayload {
  title: string;
  body: string;
  data?: Record<string, any>;
}

export const pushNotificationService = {
  // Track if listeners have been set up
  listenersRegistered: false,

  async initializePushNotifications(): Promise<boolean> {
    try {
      // Check if we're running on a native platform
      if (!Capacitor.isNativePlatform()) {
        console.log('Push notifications not supported on web platform - use webPushService instead');
        return false;
      }

      const platform = Capacitor.getPlatform();
      console.log('[Native Push] Initializing push notifications on platform:', platform);
      
      // Request permission for push notifications
      const permissionStatus = await PushNotifications.requestPermissions();
      console.log('[Native Push] Permission status:', permissionStatus.receive);
      
      if (permissionStatus.receive === 'granted') {
        // Remove any existing listeners before registering new ones
        if (!this.listenersRegistered) {
          await this.setupListeners();
          this.listenersRegistered = true;
        }

        // Register for push notifications - this triggers the registration event
        console.log('[Native Push] Calling register()...');
        await PushNotifications.register();
        
        return true;
      } else {
        console.log('[Native Push] Permission denied');
        return false;
      }
    } catch (error) {
      console.error('[Native Push] Error initializing:', error);
      return false;
    }
  },

  async setupListeners(): Promise<void> {
    console.log('[Native Push] Setting up listeners...');

    // Listen for registration success - this is where we get the native device token
    await PushNotifications.addListener('registration', async (token) => {
      console.log('[Native Push] Registration success!');
      console.log('[Native Push] Token type:', typeof token.value);
      console.log('[Native Push] Token length:', token.value?.length);
      console.log('[Native Push] Token preview:', token.value?.substring(0, 20) + '...');
      
      // Store the native token (NOT prefixed with webpush:)
      // Native tokens are hex strings from APNs (iOS) or FCM registration tokens (Android)
      const { data: user } = await supabase.auth.getUser();
      if (user.user) {
        // Mark as native token with platform prefix for clarity
        const platform = Capacitor.getPlatform();
        const tokenWithPrefix = `native_${platform}:${token.value}`;
        console.log('[Native Push] Storing token for user:', user.user.id);
        await this.updateUserPushToken(user.user.id, tokenWithPrefix);
      } else {
        console.warn('[Native Push] No user logged in, cannot store token');
      }
    });

    // Listen for registration error
    await PushNotifications.addListener('registrationError', (error) => {
      console.error('[Native Push] Registration error:', JSON.stringify(error));
    });

    // Listen for incoming notifications when app is in foreground
    await PushNotifications.addListener('pushNotificationReceived', (notification) => {
      console.log('[Native Push] Notification received in foreground:', notification);
      // The notification will be displayed by iOS/Android automatically based on capacitor.config.ts settings
    });

    // Listen for notification tap (when user taps on a notification)
    await PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
      console.log('[Native Push] Notification tapped:', notification);
      
      // Handle navigation based on notification data
      const data = notification.notification.data;
      if (data?.eventId) {
        console.log('[Native Push] Navigating to event:', data.eventId);
        window.location.href = `/calendar?eventId=${data.eventId}`;
      }
    });

    console.log('[Native Push] Listeners registered successfully');
  },

  async updateUserPushToken(userId: string, token: string): Promise<void> {
    try {
      console.log('[Native Push] Updating push token for user:', userId);
      console.log('[Native Push] Token:', token.substring(0, 30) + '...');
      
      const { error } = await supabase
        .from('profiles')
        .update({ 
          push_token: token,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);

      if (error) {
        console.error('[Native Push] Error updating push token:', error);
      } else {
        console.log('[Native Push] Push token updated successfully');
      }
    } catch (error) {
      console.error('[Native Push] Error in updateUserPushToken:', error);
    }
  },

  async sendAvailabilityNotification(eventId: string): Promise<void> {
    try {
      // Call the edge function to send notifications
      const { error } = await supabase.functions.invoke('send-availability-notification', {
        body: { eventId }
      });

      if (error) {
        console.error('Error sending availability notification:', error);
        throw error;
      }

      console.log('Availability notification sent successfully');
    } catch (error) {
      console.error('Error in sendAvailabilityNotification:', error);
      throw error;
    }
  },

  // Check if the current device has registered for push
  async checkRegistration(): Promise<{ registered: boolean; token?: string }> {
    if (!Capacitor.isNativePlatform()) {
      return { registered: false };
    }

    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) {
        return { registered: false };
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('push_token')
        .eq('id', user.user.id)
        .single();

      const hasNativeToken = profile?.push_token?.startsWith('native_');
      return {
        registered: hasNativeToken,
        token: profile?.push_token
      };
    } catch (error) {
      console.error('[Native Push] Error checking registration:', error);
      return { registered: false };
    }
  }
};
