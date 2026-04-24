
import { logger } from '@/lib/logger';
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
        logger.log('Push notifications not supported on web platform - use webPushService instead');
        return false;
      }

      const platform = Capacitor.getPlatform();
      logger.log('[Native Push] Initializing push notifications on platform:', platform);
      
      // Request permission for push notifications
      const permissionStatus = await PushNotifications.requestPermissions();
      logger.log('[Native Push] Permission status:', permissionStatus.receive);
      
      if (permissionStatus.receive === 'granted') {
        // Remove any existing listeners before registering new ones
        if (!this.listenersRegistered) {
          await this.setupListeners();
          this.listenersRegistered = true;
        }

        // Register for push notifications - this triggers the registration event
        logger.log('[Native Push] Calling register()...');
        await PushNotifications.register();
        
        return true;
      } else {
        logger.log('[Native Push] Permission denied');
        return false;
      }
    } catch (error) {
      logger.error('[Native Push] Error initializing:', error);
      return false;
    }
  },

  async setupListeners(): Promise<void> {
    logger.log('[Native Push] Setting up listeners...');

    // Listen for registration success - this is where we get the native device token
    await PushNotifications.addListener('registration', async (token) => {
      logger.log('[Native Push] Registration success!');
      logger.log('[Native Push] Token type:', typeof token.value);
      logger.log('[Native Push] Token length:', token.value?.length);
      logger.log('[Native Push] Token preview:', token.value?.substring(0, 20) + '...');
      
      // Store the native device token in device_tokens table (multi-device support)
      const { data: user } = await supabase.auth.getUser();
      if (user.user) {
        const platform = Capacitor.getPlatform() as 'ios' | 'android';
        logger.log('[Native Push] Storing token for user:', user.user.id, 'platform:', platform);
        await this.upsertDeviceToken(user.user.id, token.value, platform);
      } else {
        logger.warn('[Native Push] No user logged in, cannot store token');
      }
    });

    // Listen for registration error
    await PushNotifications.addListener('registrationError', (error) => {
      logger.error('[Native Push] Registration error:', JSON.stringify(error));
    });

    // Listen for incoming notifications when app is in foreground
    await PushNotifications.addListener('pushNotificationReceived', (notification) => {
      logger.log('[Native Push] Notification received in foreground:', notification);
      // The notification will be displayed by iOS/Android automatically based on capacitor.config.ts settings
    });

    // Listen for notification tap (when user taps on a notification)
    await PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
      logger.log('[Native Push] Notification tapped:', notification);
      
      // Handle navigation based on notification data
      const data = notification.notification.data;
      if (data?.eventId) {
        logger.log('[Native Push] Navigating to event:', data.eventId);
        window.location.href = `/calendar?eventId=${data.eventId}`;
      }
    });

    logger.log('[Native Push] Listeners registered successfully');
  },

  async upsertDeviceToken(userId: string, token: string, platform: 'ios' | 'android'): Promise<void> {
    try {
      logger.log('[Native Push] Upserting device token for user:', userId, 'platform:', platform);
      const { error } = await supabase
        .from('device_tokens')
        .upsert(
          { user_id: userId, token, platform, updated_at: new Date().toISOString() },
          { onConflict: 'user_id,token' }
        );
      if (error) {
        logger.error('[Native Push] Error upserting device token:', error);
      } else {
        logger.log('[Native Push] Device token upserted successfully');
      }
    } catch (error) {
      logger.error('[Native Push] Error in upsertDeviceToken:', error);
    }
  },

  async sendAvailabilityNotification(eventId: string): Promise<void> {
    try {
      // Call the edge function to send notifications
      const { error } = await supabase.functions.invoke('send-availability-notification', {
        body: { eventId }
      });

      if (error) {
        logger.error('Error sending availability notification:', error);
        throw error;
      }

      logger.log('Availability notification sent successfully');
    } catch (error) {
      logger.error('Error in sendAvailabilityNotification:', error);
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

      const { data: deviceToken } = await supabase
        .from('device_tokens')
        .select('token, platform')
        .eq('user_id', user.user.id)
        .limit(1)
        .maybeSingle();

      return {
        registered: !!deviceToken,
        token: deviceToken ? `native_${deviceToken.platform}:${deviceToken.token}` : undefined
      };
    } catch (error) {
      logger.error('[Native Push] Error checking registration:', error);
      return { registered: false };
    }
  }
};
