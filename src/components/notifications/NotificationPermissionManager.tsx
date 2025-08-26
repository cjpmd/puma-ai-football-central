import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Bell, BellOff, Settings, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface NotificationPreferences {
  availability_requests: boolean;
  team_updates: boolean;
  match_reminders: boolean;
  training_updates: boolean;
}

export const NotificationPermissionManager: React.FC = () => {
  const { user } = useAuth();
  const { isInitialized, permissionGranted, requestPermissions } = usePushNotifications();
  const [isRequesting, setIsRequesting] = useState(false);
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    availability_requests: true,
    team_updates: true,
    match_reminders: true,
    training_updates: true
  });
  const [preferencesLoading, setPreferencesLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadNotificationPreferences();
    }
  }, [user]);

  const loadNotificationPreferences = async () => {
    try {
      const { data } = await supabase
        .from('profiles')
        .select('notification_preferences')
        .eq('id', user?.id)
        .single();

      if (data?.notification_preferences) {
        setPreferences({ ...preferences, ...data.notification_preferences });
      }
    } catch (error) {
      console.error('Error loading notification preferences:', error);
    } finally {
      setPreferencesLoading(false);
    }
  };

  const updateNotificationPreferences = async (newPreferences: Partial<NotificationPreferences>) => {
    try {
      const updatedPreferences = { ...preferences, ...newPreferences };
      
      const { error } = await supabase
        .from('profiles')
        .update({ 
          notification_preferences: updatedPreferences,
          updated_at: new Date().toISOString()
        })
        .eq('id', user?.id);

      if (error) throw error;

      setPreferences(updatedPreferences);
      toast.success('Notification preferences updated');
    } catch (error) {
      console.error('Error updating preferences:', error);
      toast.error('Failed to update preferences');
    }
  };

  const handleRequestPermissions = async () => {
    setIsRequesting(true);
    try {
      const granted = await requestPermissions();
      if (granted) {
        toast.success('Push notifications enabled successfully!');
      } else {
        toast.error('Push notification permission denied. You can enable it in your device settings.');
      }
    } catch (error) {
      console.error('Error requesting push permissions:', error);
      toast.error('Failed to setup push notifications');
    } finally {
      setIsRequesting(false);
    }
  };

  const openDeviceSettings = () => {
    if (Capacitor.isNativePlatform()) {
      // This would typically open device settings
      // Implementation depends on platform-specific plugins
      toast.info('Please enable notifications in your device settings');
    } else {
      toast.info('Please enable notifications in your browser settings');
    }
  };

  const getPermissionStatus = () => {
    if (!isInitialized) return { status: 'loading', color: 'default' };
    if (permissionGranted) return { status: 'granted', color: 'success' };
    return { status: 'denied', color: 'destructive' };
  };

  const permissionStatus = getPermissionStatus();

  // Don't show on web platforms unless there's browser push support
  if (!Capacitor.isNativePlatform() && !('serviceWorker' in navigator)) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Permission Status Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {permissionGranted ? (
                <CheckCircle className="h-5 w-5 text-green-600" />
              ) : (
                <BellOff className="h-5 w-5 text-muted-foreground" />
              )}
              <CardTitle>Push Notification Status</CardTitle>
            </div>
            <Badge variant={permissionStatus.status === 'granted' ? 'default' : 'secondary'}>
              {permissionStatus.status === 'loading' ? 'Checking...' : 
               permissionStatus.status === 'granted' ? 'Enabled' : 'Disabled'}
            </Badge>
          </div>
          <CardDescription>
            Manage your push notification settings and preferences
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!isInitialized ? (
            <div className="flex items-center justify-center py-4">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mr-2"></div>
              <span>Initializing notifications...</span>
            </div>
          ) : permissionGranted ? (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                Push notifications are enabled. You'll receive notifications for team events and updates.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="space-y-4">
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Push notifications are disabled. Enable them to receive important team updates and availability requests.
                </AlertDescription>
              </Alert>
              
              <div className="flex gap-2">
                <Button 
                  onClick={handleRequestPermissions}
                  disabled={isRequesting}
                  className="flex-1"
                >
                  {isRequesting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Setting up...
                    </>
                  ) : (
                    <>
                      <Bell className="h-4 w-4 mr-2" />
                      Enable Notifications
                    </>
                  )}
                </Button>
                
                <Button variant="outline" onClick={openDeviceSettings}>
                  <Settings className="h-4 w-4 mr-2" />
                  Device Settings
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Notification Preferences */}
      {permissionGranted && (
        <Card>
          <CardHeader>
            <CardTitle>Notification Preferences</CardTitle>
            <CardDescription>
              Choose which types of notifications you want to receive
            </CardDescription>
          </CardHeader>
          <CardContent>
            {preferencesLoading ? (
              <div className="flex items-center justify-center py-4">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary mr-2"></div>
                <span>Loading preferences...</span>
              </div>
            ) : (
              <div className="space-y-4">
                {Object.entries(preferences).map(([key, enabled]) => (
                  <div key={key} className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">
                        {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {getPreferenceDescription(key)}
                      </div>
                    </div>
                    <Button
                      variant={enabled ? "default" : "outline"}
                      size="sm"
                      onClick={() => updateNotificationPreferences({ [key]: !enabled })}
                    >
                      {enabled ? (
                        <>
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Enabled
                        </>
                      ) : (
                        <>
                          <XCircle className="h-4 w-4 mr-1" />
                          Disabled
                        </>
                      )}
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Testing */}
      {permissionGranted && (
        <Card>
          <CardHeader>
            <CardTitle>Test Notifications</CardTitle>
            <CardDescription>
              Send a test notification to verify everything is working
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              variant="outline" 
              onClick={sendTestNotification}
              disabled={isRequesting}
            >
              <Bell className="h-4 w-4 mr-2" />
              Send Test Notification
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

const getPreferenceDescription = (key: string): string => {
  const descriptions: Record<string, string> = {
    availability_requests: 'Get notified when coaches request your availability for events',
    team_updates: 'Receive updates about team news, announcements, and changes',
    match_reminders: 'Get reminders before upcoming matches and games',
    training_updates: 'Receive notifications about training sessions and changes'
  };
  return descriptions[key] || '';
};

const sendTestNotification = async () => {
  try {
    const { error } = await supabase.functions.invoke('send-push-notification', {
      body: {
        title: 'Test Notification',
        body: 'This is a test notification from your football team app!',
        userIds: null // Will send to current user
      }
    });

    if (error) throw error;
    toast.success('Test notification sent!');
  } catch (error) {
    console.error('Error sending test notification:', error);
    toast.error('Failed to send test notification');
  }
};