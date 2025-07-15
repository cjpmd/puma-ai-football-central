
import { PushNotifications } from '@capacitor/push-notifications';
import { Capacitor } from '@capacitor/core';
import { supabase } from '@/integrations/supabase/client';

export interface NotificationPayload {
  title: string;
  body: string;
  data?: Record<string, any>;
}

export const pushNotificationService = {
  async initializePushNotifications(): Promise<boolean> {
    try {
      // Check if we're running on a native platform
      if (!Capacitor.isNativePlatform()) {
        console.log('Push notifications not supported on web platform');
        return false;
      }

      console.log('Initializing push notifications on platform:', Capacitor.getPlatform());
      
      // Request permission for push notifications
      const permissionStatus = await PushNotifications.requestPermissions();
      
      if (permissionStatus.receive === 'granted') {
        // Register for push notifications
        await PushNotifications.register();
        
        // Listen for registration success
        PushNotifications.addListener('registration', async (token) => {
          console.log('Push registration success, token: ' + token.value);
          
          // Store the token in the database
          const { data: user } = await supabase.auth.getUser();
          if (user.user) {
            await this.updateUserPushToken(user.user.id, token.value);
          }
        });

        // Listen for registration error
        PushNotifications.addListener('registrationError', (error) => {
          console.error('Error on registration: ' + JSON.stringify(error));
        });

        // Listen for incoming notifications
        PushNotifications.addListener('pushNotificationReceived', (notification) => {
          console.log('Push notification received: ', notification);
        });

        // Listen for notification tap
        PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
          console.log('Push notification action performed', notification);
          
          // Handle navigation based on notification data
          const data = notification.notification.data;
          if (data?.eventId) {
            // Navigate to event details or availability screen
            window.location.href = `/calendar?eventId=${data.eventId}`;
          }
        });

        return true;
      } else {
        console.log('Push notification permission denied');
        return false;
      }
    } catch (error) {
      console.error('Error initializing push notifications:', error);
      return false;
    }
  },

  async updateUserPushToken(userId: string, token: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ 
          push_token: token,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);

      if (error) {
        console.error('Error updating push token:', error);
      } else {
        console.log('Push token updated successfully');
      }
    } catch (error) {
      console.error('Error in updateUserPushToken:', error);
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
  }
};
