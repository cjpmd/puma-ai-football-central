import { logger } from '@/lib/logger';
import { supabase } from '@/integrations/supabase/client';
import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';

export interface NotificationPreferences {
  event_reminders: boolean;
  availability_requests: boolean;
  manual_reminders: boolean;
  weekly_nudges: boolean;
  notification_sound: boolean;
  vibration: boolean;
  badge_count: boolean;
}

export interface ManualReminderRequest {
  eventId: string;
  selectedUserIds: string[];
  message: string;
  title?: string;
}

export const enhancedNotificationService = {
  async initializeEnhancedNotifications(): Promise<boolean> {
    try {
      if (!Capacitor.isNativePlatform()) {
        logger.log('Enhanced notifications only available on native platforms');
        return false;
      }

      logger.log('Initializing enhanced notifications on platform:', Capacitor.getPlatform());
      
      // Request permissions
      const permissionStatus = await PushNotifications.requestPermissions();
      
      if (permissionStatus.receive === 'granted') {
        // Register for push notifications
        await PushNotifications.register();
        
        // Set up iOS notification categories
        if (Capacitor.getPlatform() === 'ios') {
          await this.setupIOSNotificationCategories();
        }
        
        // Set up Android notification channels
        if (Capacitor.getPlatform() === 'android') {
          await this.setupAndroidNotificationChannels();
        }
        
        // Listen for registration success
        PushNotifications.addListener('registration', async (token) => {
          logger.log('Enhanced push registration success, token: ' + token.value);
          const platform = Capacitor.getPlatform() as 'ios' | 'android';
          await this.upsertDeviceToken(token.value, platform);
        });

        // Listen for registration error
        PushNotifications.addListener('registrationError', (error) => {
          logger.error('Enhanced registration error: ' + JSON.stringify(error));
        });

        // Enhanced notification received listener
        PushNotifications.addListener('pushNotificationReceived', (notification) => {
          logger.log('Enhanced notification received: ', notification);
          this.handleNotificationReceived(notification);
        });

        // Enhanced notification action listener
        PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
          logger.log('Enhanced notification action performed', notification);
          this.handleNotificationAction(notification);
        });

        return true;
      } else {
        logger.log('Enhanced push notification permission denied');
        return false;
      }
    } catch (error) {
      logger.error('Error initializing enhanced notifications:', error);
      return false;
    }
  },

  async setupIOSNotificationCategories(): Promise<void> {
    try {
      // Define iOS notification categories with actions
      const categories = [
        {
          identifier: 'EVENT_REMINDER',
          actions: [
            {
              identifier: 'VIEW_EVENT',
              title: 'View Event',
              options: ['foreground']
            }
          ]
        },
        {
          identifier: 'RSVP_REQUEST',
          actions: [
            {
              identifier: 'RSVP_YES',
              title: 'Accept',
              options: ['foreground']
            },
            {
              identifier: 'RSVP_NO', 
              title: 'Decline',
              options: ['foreground']
            },
            {
              identifier: 'RSVP_MAYBE',
              title: 'Maybe',
              options: ['foreground']
            }
          ]
        },
        {
          identifier: 'MANUAL_REMINDER',
          actions: [
            {
              identifier: 'VIEW_EVENT',
              title: 'View Details',
              options: ['foreground']
            }
          ]
        }
      ];

      // Note: Categories would be set via native iOS code in actual implementation
      logger.log('iOS notification categories configured:', categories);
    } catch (error) {
      logger.error('Error setting up iOS categories:', error);
    }
  },

  async setupAndroidNotificationChannels(): Promise<void> {
    try {
      // Define Android notification channels
      const channels = [
        {
          id: 'matchday',
          name: 'Matchday Notifications',
          description: 'Notifications for matches and game days',
          importance: 'high',
          sound: true,
          vibration: true,
          lights: true
        },
        {
          id: 'training',
          name: 'Training Notifications', 
          description: 'Notifications for training sessions',
          importance: 'default',
          sound: true,
          vibration: true
        },
        {
          id: 'general',
          name: 'General Notifications',
          description: 'General team and club notifications',
          importance: 'default',
          sound: true,
          vibration: false
        }
      ];

      // Note: Channels would be created via native Android code in actual implementation
      logger.log('Android notification channels configured:', channels);
    } catch (error) {
      logger.error('Error setting up Android channels:', error);
    }
  },

  async upsertDeviceToken(token: string, platform: 'ios' | 'android'): Promise<void> {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (user.user) {
        const { error } = await supabase
          .from('device_tokens')
          .upsert(
            { user_id: user.user.id, token, platform, updated_at: new Date().toISOString() },
            { onConflict: 'user_id,token' }
          );
        if (error) {
          logger.error('Error upserting enhanced device token:', error);
        } else {
          logger.log('Enhanced device token upserted successfully');
        }
      }
    } catch (error) {
      logger.error('Error in upsertDeviceToken:', error);
    }
  },

  async sendManualReminder(request: ManualReminderRequest): Promise<void> {
    try {
      const { error } = await supabase.functions.invoke('enhanced-notification-scheduler', {
        body: {
          action: 'send_manual_reminder',
          data: request
        }
      });

      if (error) {
        logger.error('Error sending manual reminder:', error);
        throw error;
      }

      logger.log('Manual reminder sent successfully');
    } catch (error) {
      logger.error('Error in sendManualReminder:', error);
      throw error;
    }
  },

  async updateNotificationPreferences(preferences: NotificationPreferences): Promise<void> {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) {
        throw new Error('User not authenticated');
      }

      const { error } = await supabase
        .from('profiles')
        .update({ 
          notification_preferences: preferences as any,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.user.id);

      if (error) {
        logger.error('Error updating notification preferences:', error);
        throw error;
      }

      logger.log('Notification preferences updated successfully');
    } catch (error) {
      logger.error('Error in updateNotificationPreferences:', error);
      throw error;
    }
  },

  async getNotificationPreferences(): Promise<NotificationPreferences> {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) {
        throw new Error('User not authenticated');
      }

      const { data: profile, error } = await supabase
        .from('profiles')
        .select('notification_preferences')
        .eq('id', user.user.id)
        .single();

      if (error) {
        logger.error('Error getting notification preferences:', error);
        throw error;
      }

      // Return default preferences if none set
      const defaultPrefs: NotificationPreferences = {
        event_reminders: true,
        availability_requests: true,
        manual_reminders: true,
        weekly_nudges: true,
        notification_sound: true,
        vibration: true,
        badge_count: true
      };

      return { ...defaultPrefs, ...(profile.notification_preferences as any || {}) };
    } catch (error) {
      logger.error('Error in getNotificationPreferences:', error);
      throw error;
    }
  },

  handleNotificationReceived(notification: any): void {
    logger.log('Enhanced notification received:', notification);
    
    // Update badge count if enabled
    this.updateBadgeCount();
    
    // Handle specific notification types
    const notificationType = notification.data?.type;
    
    switch (notificationType) {
      case '3_hour_reminder':
      case 'morning_reminder':
        // Could play custom sound or haptic feedback
        break;
      case 'weekly_nudge':
        // Could show in-app prompt
        break;
      case 'manual_reminder':
        // Could highlight the event in UI
        break;
    }
  },

  handleNotificationAction(notification: any): void {
    logger.log('Enhanced notification action performed:', notification);
    
    const action = notification.actionId;
    const eventId = notification.notification.data?.eventId;
    const deepLink = notification.notification.data?.deepLink;
    
    if (deepLink) {
      // Handle deep linking
      this.handleDeepLink(deepLink);
    } else if (action && eventId) {
      // Handle quick actions
      this.handleQuickAction(action, eventId);
    }
  },

  handleDeepLink(deepLink: string): void {
    logger.log('Handling deep link:', deepLink);
    
    try {
      const url = new URL(deepLink);
      const path = url.pathname;
      const params = new URLSearchParams(url.search);
      
      if (path.includes('/event/')) {
        const eventId = path.split('/event/')[1];
        const token = params.get('token');
        
        // Navigate to event with token for authentication
        window.location.href = `/calendar?eventId=${eventId}&token=${token}`;
      } else if (path.includes('/rsvp/')) {
        const response = path.split('/rsvp/')[1];
        const token = params.get('token');
        
        // Handle RSVP response
        this.handleRSVPResponse(response, token);
      }
    } catch (error) {
      logger.error('Error handling deep link:', error);
    }
  },

  async handleQuickAction(actionId: string, eventId: string): Promise<void> {
    try {
      let response: string;
      
      switch (actionId) {
        case 'RSVP_YES':
          response = 'yes';
          break;
        case 'RSVP_NO':
          response = 'no';
          break;
        case 'RSVP_MAYBE':
          response = 'maybe';
          break;
        case 'VIEW_EVENT':
          window.location.href = `/calendar?eventId=${eventId}`;
          return;
        default:
          logger.log('Unknown action:', actionId);
          return;
      }
      
      // Send RSVP response
      await this.submitRSVPResponse(eventId, response);
      
    } catch (error) {
      logger.error('Error handling quick action:', error);
    }
  },

  async handleRSVPResponse(response: string, token: string | null): Promise<void> {
    if (!token) {
      logger.error('No token provided for RSVP response');
      return;
    }

    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) {
        throw new Error('User not authenticated');
      }

      // Extract event ID from current context or token
      // This would need to be implemented based on your token structure
      logger.log('Handling RSVP response:', response, 'with token:', token);
      
      // For now, just log the action
      // In a real implementation, you'd call the RSVP handler
    } catch (error) {
      logger.error('Error handling RSVP response:', error);
    }
  },

  async submitRSVPResponse(eventId: string, response: string): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const status = response === 'yes' ? 'available'
        : response === 'no' ? 'unavailable'
        : 'pending';

      const { error } = await supabase.rpc('update_availability_status', {
        p_event_id: eventId,
        p_user_id: user.id,
        p_role: 'player',
        p_status: status,
      });

      if (error) throw error;

      logger.log('RSVP response submitted:', status, 'for event:', eventId);
    } catch (error) {
      logger.error('Error submitting RSVP response:', error);
      throw error;
    }
  },

  async updateBadgeCount(): Promise<void> {
    try {
      if (Capacitor.isNativePlatform()) {
        // Get unread notification count
        const { data: unreadCount } = await supabase
          .from('notification_logs')
          .select('id', { count: 'exact' })
          .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
          .is('read_at', null);

        // Update badge count (would be implemented in native code)
        logger.log('Updating badge count to:', unreadCount);
      }
    } catch (error) {
      logger.error('Error updating badge count:', error);
    }
  },

  async clearBadgeCount(): Promise<void> {
    try {
      if (Capacitor.isNativePlatform()) {
        // Clear badge count (would be implemented in native code)
        logger.log('Clearing badge count');
        
        // Mark notifications as read (would be handled in the actual implementation)
        const { data: user } = await supabase.auth.getUser();
        if (user.user) {
          logger.log('Would mark notifications as read for user:', user.user.id);
        }
      }
    } catch (error) {
      logger.error('Error clearing badge count:', error);
    }
  }
};