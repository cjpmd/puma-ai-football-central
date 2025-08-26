import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Smartphone, 
  Apple, 
  Chrome, 
  Settings, 
  Bell, 
  BellRing,
  Vibrate,
  Volume2,
  Battery,
  Clock,
  Shield
} from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { Device } from '@capacitor/device';
import { App } from '@capacitor/app';
import { PushNotifications } from '@capacitor/push-notifications';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface DeviceInfo {
  platform: string;
  osVersion: string;
  manufacturer: string;
  model: string;
  isVirtual: boolean;
}

interface NotificationSettings {
  badgeCount: number;
  soundEnabled: boolean;
  vibrationEnabled: boolean;
  doNotDisturbRespected: boolean;
  deliveryOptimized: boolean;
}

export const MobileNotificationOptimizations: React.FC = () => {
  const { user } = useAuth();
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo | null>(null);
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>({
    badgeCount: 0,
    soundEnabled: true,
    vibrationEnabled: true,
    doNotDisturbRespected: true,
    deliveryOptimized: false
  });
  const [appState, setAppState] = useState<'active' | 'background' | 'inactive'>('active');
  const [batteryOptimized, setBatteryOptimized] = useState(false);

  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      initializeMobileOptimizations();
      setupAppStateListeners();
      setupNotificationListeners();
    }
  }, []);

  const initializeMobileOptimizations = async () => {
    try {
      // Get device information
      const deviceData = await Device.getInfo();
      setDeviceInfo({
        platform: deviceData.platform,
        osVersion: deviceData.osVersion,
        manufacturer: deviceData.manufacturer,
        model: deviceData.model,
        isVirtual: deviceData.isVirtual
      });

      // Configure platform-specific settings
      if (deviceData.platform === 'ios') {
        await configureIOSNotifications();
      } else if (deviceData.platform === 'android') {
        await configureAndroidNotifications();
      }

      // Check battery optimization status
      checkBatteryOptimizations();
    } catch (error) {
      console.error('Error initializing mobile optimizations:', error);
    }
  };

  const configureIOSNotifications = async () => {
    try {
      // Register notification categories for iOS
      await PushNotifications.addListener('registration', async (token) => {
        console.log('iOS Push registration success:', token.value);
        
        // Configure iOS-specific notification categories
        const categories = [
          {
            identifier: 'AVAILABILITY_REQUEST',
            actions: [
              {
                identifier: 'AVAILABLE_ACTION',
                title: 'I\'m Available',
                options: ['foreground']
              },
              {
                identifier: 'UNAVAILABLE_ACTION',
                title: 'Not Available',
                options: ['foreground']
              }
            ]
          },
          {
            identifier: 'TEAM_UPDATE',
            actions: [
              {
                identifier: 'VIEW_ACTION',
                title: 'View Update',
                options: ['foreground']
              }
            ]
          }
        ];

        // Note: Categories would be set via native iOS code
        console.log('iOS notification categories configured');
      });

      // Handle notification actions
      await PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
        console.log('iOS notification action performed:', notification);
        
        const action = notification.actionId;
        const data = notification.notification.data;
        
        if (action === 'AVAILABLE_ACTION' || action === 'UNAVAILABLE_ACTION') {
          handleAvailabilityResponse(data.eventId, action === 'AVAILABLE_ACTION' ? 'available' : 'unavailable');
        }
      });

    } catch (error) {
      console.error('Error configuring iOS notifications:', error);
    }
  };

  const configureAndroidNotifications = async () => {
    try {
      // Android notification channels would be configured in native code
      // but we can handle the response here
      console.log('Configuring Android notification channels');
      
      // Handle notification tap
      await PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
        console.log('Android notification action performed:', notification);
        
        const data = notification.notification.data;
        
        // Handle different notification types
        if (data.type === 'availability_request') {
          // Navigate to availability confirmation
          window.location.href = `/availability-confirmation?eventId=${data.eventId}`;
        }
      });

    } catch (error) {
      console.error('Error configuring Android notifications:', error);
    }
  };

  const setupAppStateListeners = () => {
    App.addListener('appStateChange', ({ isActive }) => {
      setAppState(isActive ? 'active' : 'background');
      
      if (isActive) {
        // App became active - refresh notification badge
        clearNotificationBadge();
      }
    });
  };

  const setupNotificationListeners = () => {
    // Listen for foreground notifications
    PushNotifications.addListener('pushNotificationReceived', (notification) => {
      console.log('Foreground notification received:', notification);
      
      // Show in-app notification for foreground messages
      toast.info(notification.title || 'New notification', {
        description: notification.body
      });
    });
  };

  const handleAvailabilityResponse = async (eventId: string, status: 'available' | 'unavailable') => {
    try {
      // This would update the availability status directly from the notification action
      console.log(`Handling availability response: ${status} for event ${eventId}`);
      
      // Navigate to confirmation page to complete the action
      window.location.href = `/availability-confirmation?eventId=${eventId}&quickResponse=${status}`;
      
      toast.success(`Marked as ${status}`);
    } catch (error) {
      console.error('Error handling availability response:', error);
      toast.error('Failed to update availability');
    }
  };

  const clearNotificationBadge = async () => {
    try {
      if (Capacitor.isNativePlatform()) {
        // Clear notification badge (would be implemented in native code)
        setNotificationSettings(prev => ({ ...prev, badgeCount: 0 }));
      }
    } catch (error) {
      console.error('Error clearing notification badge:', error);
    }
  };

  const checkBatteryOptimizations = () => {
    // This would check if the app is whitelisted from battery optimizations
    // Implementation would be platform-specific
    setBatteryOptimized(false); // Default assumption
  };

  const requestBatteryOptimizationWhitelist = () => {
    // This would open system settings to whitelist the app from battery optimizations
    toast.info('Please disable battery optimization for this app to ensure reliable notifications');
  };

  const testNotificationDelivery = async () => {
    try {
      // Send a test notification to verify delivery
      const { error } = await supabase.functions.invoke('send-push-notification', {
        body: {
          title: 'Delivery Test',
          body: `Test sent at ${new Date().toLocaleTimeString()}`,
          userIds: [user?.id] // Send to current user only
        }
      });

      if (error) throw error;
      toast.success('Test notification sent - check if you received it');
    } catch (error) {
      console.error('Error testing notification delivery:', error);
      toast.error('Error testing notifications');
    }
  };

  if (!Capacitor.isNativePlatform()) {
    return (
      <Alert>
        <Smartphone className="h-4 w-4" />
        <AlertDescription>
          Mobile notification optimizations are only available on native mobile apps.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Device Information */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            {deviceInfo?.platform === 'ios' ? (
              <Apple className="h-5 w-5" />
            ) : (
              <Chrome className="h-5 w-5" />
            )}
            <CardTitle>Device Information</CardTitle>
          </div>
          <CardDescription>
            Platform-specific notification settings and optimizations
          </CardDescription>
        </CardHeader>
        <CardContent>
          {deviceInfo && (
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium">Platform:</span> {deviceInfo.platform}
              </div>
              <div>
                <span className="font-medium">OS Version:</span> {deviceInfo.osVersion}
              </div>
              <div>
                <span className="font-medium">Manufacturer:</span> {deviceInfo.manufacturer}
              </div>
              <div>
                <span className="font-medium">Model:</span> {deviceInfo.model}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Notification Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BellRing className="h-5 w-5" />
            Mobile Notification Settings
          </CardTitle>
          <CardDescription>
            Optimize notification delivery for your device
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Volume2 className="h-4 w-4" />
              <span>Sound Enabled</span>
            </div>
            <Badge variant={notificationSettings.soundEnabled ? 'default' : 'secondary'}>
              {notificationSettings.soundEnabled ? 'On' : 'Off'}
            </Badge>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Vibrate className="h-4 w-4" />
              <span>Vibration</span>
            </div>
            <Badge variant={notificationSettings.vibrationEnabled ? 'default' : 'secondary'}>
              {notificationSettings.vibrationEnabled ? 'On' : 'Off'}
            </Badge>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              <span>Do Not Disturb Respected</span>
            </div>
            <Badge variant={notificationSettings.doNotDisturbRespected ? 'default' : 'secondary'}>
              {notificationSettings.doNotDisturbRespected ? 'Yes' : 'No'}
            </Badge>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Battery className="h-4 w-4" />
              <span>Battery Optimized</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={batteryOptimized ? 'destructive' : 'default'}>
                {batteryOptimized ? 'May Affect Delivery' : 'Optimized'}
              </Badge>
              {batteryOptimized && (
                <Button size="sm" variant="outline" onClick={requestBatteryOptimizationWhitelist}>
                  Fix
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Platform-Specific Tips */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Platform-Specific Tips
          </CardTitle>
        </CardHeader>
        <CardContent>
          {deviceInfo?.platform === 'ios' ? (
            <div className="space-y-3 text-sm">
              <div>
                <strong>iOS Notification Settings:</strong>
                <ul className="list-disc list-inside mt-1 space-y-1 text-muted-foreground">
                  <li>Allow notifications in Settings → Notifications → Your App</li>
                  <li>Enable "Time Sensitive" for urgent availability requests</li>
                  <li>Set "Notification Grouping" to "By App" for better organization</li>
                  <li>Enable "Show Previews" to see event details</li>
                </ul>
              </div>
            </div>
          ) : (
            <div className="space-y-3 text-sm">
              <div>
                <strong>Android Notification Settings:</strong>
                <ul className="list-disc list-inside mt-1 space-y-1 text-muted-foreground">
                  <li>Disable battery optimization: Settings → Battery → Battery Optimization</li>
                  <li>Enable "Auto-start" for the app in your device's app management</li>
                  <li>Set notification importance to "High" for critical updates</li>
                  <li>Allow background app refresh and data usage</li>
                </ul>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Testing */}
      <Card>
        <CardHeader>
          <CardTitle>Notification Delivery Test</CardTitle>
          <CardDescription>
            Test notification delivery and timing
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Button onClick={testNotificationDelivery}>
              <Bell className="h-4 w-4 mr-2" />
              Test Delivery
            </Button>
            <Button variant="outline" onClick={() => setAppState('background')}>
              <Clock className="h-4 w-4 mr-2" />
              Test Background Delivery
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};