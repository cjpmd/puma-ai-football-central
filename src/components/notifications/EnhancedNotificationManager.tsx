import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Bell, 
  Settings, 
  Smartphone, 
  Calendar, 
  MessageSquare, 
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { enhancedNotificationService, NotificationPreferences } from '@/services/enhancedNotificationService';
import { Capacitor } from '@capacitor/core';

interface EnhancedNotificationManagerProps {
  onPreferencesUpdated?: () => void;
}

export const EnhancedNotificationManager: React.FC<EnhancedNotificationManagerProps> = ({
  onPreferencesUpdated
}) => {
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    event_reminders: true,
    availability_requests: true,
    manual_reminders: true,
    weekly_nudges: true,
    notification_sound: true,
    vibration: true,
    badge_count: true
  });
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(false);
  const [notificationStatus, setNotificationStatus] = useState<{
    initialized: boolean;
    permissionGranted: boolean;
    platformSupported: boolean;
  }>({
    initialized: false,
    permissionGranted: false,
    platformSupported: Capacitor.isNativePlatform()
  });
  const { toast } = useToast();

  useEffect(() => {
    loadPreferences();
    checkNotificationStatus();
  }, []);

  const loadPreferences = async () => {
    try {
      const prefs = await enhancedNotificationService.getNotificationPreferences();
      setPreferences(prefs);
    } catch (error) {
      console.error('Error loading preferences:', error);
    }
  };

  const checkNotificationStatus = async () => {
    if (!Capacitor.isNativePlatform()) {
      return;
    }

    try {
      // Check if notifications are already initialized
      // This would be implemented with proper platform checks
      setNotificationStatus(prev => ({
        ...prev,
        initialized: true, // Would check actual status
        permissionGranted: true // Would check actual permissions
      }));
    } catch (error) {
      console.error('Error checking notification status:', error);
    }
  };

  const initializeNotifications = async () => {
    try {
      setInitializing(true);
      const success = await enhancedNotificationService.initializeEnhancedNotifications();
      
      if (success) {
        setNotificationStatus(prev => ({
          ...prev,
          initialized: true,
          permissionGranted: true
        }));
        
        toast({
          title: "Notifications Enabled",
          description: "Enhanced notifications are now active with deep linking and quick actions",
        });
      } else {
        toast({
          title: "Permission Denied",
          description: "Please enable notifications in your device settings",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error initializing notifications:', error);
      toast({
        title: "Initialization Failed",
        description: "Failed to initialize enhanced notifications",
        variant: "destructive"
      });
    } finally {
      setInitializing(false);
    }
  };

  const updatePreference = async (key: keyof NotificationPreferences, value: boolean) => {
    try {
      setLoading(true);
      const newPreferences = { ...preferences, [key]: value };
      
      await enhancedNotificationService.updateNotificationPreferences(newPreferences);
      setPreferences(newPreferences);
      
      if (onPreferencesUpdated) {
        onPreferencesUpdated();
      }
      
      toast({
        title: "Preferences Updated",
        description: "Your notification preferences have been saved",
      });
    } catch (error) {
      console.error('Error updating preferences:', error);
      toast({
        title: "Update Failed",
        description: "Failed to update notification preferences",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const testNotification = async () => {
    try {
      // Send a test notification
      await enhancedNotificationService.sendManualReminder({
        eventId: 'test',
        selectedUserIds: ['current-user'],
        message: 'This is a test notification to verify your settings are working correctly.',
        title: 'Test Notification'
      });
      
      toast({
        title: "Test Sent",
        description: "A test notification has been sent to your device",
      });
    } catch (error) {
      console.error('Error sending test notification:', error);
      toast({
        title: "Test Failed",
        description: "Failed to send test notification",
        variant: "destructive"
      });
    }
  };

  const clearBadges = async () => {
    try {
      await enhancedNotificationService.clearBadgeCount();
      toast({
        title: "Badges Cleared",
        description: "Notification badges have been cleared",
      });
    } catch (error) {
      console.error('Error clearing badges:', error);
    }
  };

  const getStatusIcon = () => {
    if (!notificationStatus.platformSupported) {
      return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
    }
    if (!notificationStatus.permissionGranted) {
      return <XCircle className="h-5 w-5 text-red-500" />;
    }
    if (notificationStatus.initialized) {
      return <CheckCircle className="h-5 w-5 text-green-500" />;
    }
    return <Clock className="h-5 w-5 text-blue-500" />;
  };

  const getStatusText = () => {
    if (!notificationStatus.platformSupported) {
      return 'Web Platform - Limited Features';
    }
    if (!notificationStatus.permissionGranted) {
      return 'Permission Required';
    }
    if (notificationStatus.initialized) {
      return 'Fully Enabled';
    }
    return 'Ready to Initialize';
  };

  const getStatusBadgeVariant = () => {
    if (!notificationStatus.platformSupported) return 'secondary';
    if (!notificationStatus.permissionGranted) return 'destructive';
    if (notificationStatus.initialized) return 'default';
    return 'outline';
  };

  return (
    <div className="space-y-6">
      {/* Status Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Enhanced Notifications
            </div>
            <Badge variant={getStatusBadgeVariant()} className="flex items-center gap-1">
              {getStatusIcon()}
              {getStatusText()}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!notificationStatus.platformSupported ? (
            <div className="text-center py-4">
              <Smartphone className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="font-semibold mb-2">Mobile App Required</h3>
              <p className="text-sm text-muted-foreground">
                Enhanced notifications with deep linking and quick actions are only available in the mobile app.
              </p>
            </div>
          ) : !notificationStatus.permissionGranted ? (
            <div className="text-center py-4 space-y-4">
              <div>
                <h3 className="font-semibold mb-2">Enable Notifications</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Get timely reminders about events, training sessions, and team updates with enhanced features:
                </p>
                <ul className="text-sm text-muted-foreground text-left space-y-1 mb-4">
                  <li>• 3-hour and morning-of event reminders</li>
                  <li>• Quick RSVP actions directly from notifications</li>
                  <li>• Deep linking to event details</li>
                  <li>• Custom notification channels and sounds</li>
                  <li>• Weekly RSVP nudges</li>
                </ul>
              </div>
              <Button 
                onClick={initializeNotifications}
                disabled={initializing}
                size="lg"
              >
                {initializing ? 'Initializing...' : 'Enable Enhanced Notifications'}
              </Button>
            </div>
          ) : (
            <Tabs defaultValue="preferences" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="preferences">Preferences</TabsTrigger>
                <TabsTrigger value="testing">Testing & Tools</TabsTrigger>
              </TabsList>

              <TabsContent value="preferences" className="space-y-6">
                {/* Notification Type Preferences */}
                <div className="space-y-4">
                  <h3 className="font-semibold flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Event Notifications
                  </h3>
                  
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="event-reminders">Event Reminders</Label>
                        <p className="text-sm text-muted-foreground">
                          3-hour and morning-of reminders for events
                        </p>
                      </div>
                      <Switch
                        id="event-reminders"
                        checked={preferences.event_reminders}
                        onCheckedChange={(checked) => updatePreference('event_reminders', checked)}
                        disabled={loading}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="availability-requests">Availability Requests</Label>
                        <p className="text-sm text-muted-foreground">
                          Notifications when your RSVP is requested
                        </p>
                      </div>
                      <Switch
                        id="availability-requests"
                        checked={preferences.availability_requests}
                        onCheckedChange={(checked) => updatePreference('availability_requests', checked)}
                        disabled={loading}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="weekly-nudges">Weekly RSVP Nudges</Label>
                        <p className="text-sm text-muted-foreground">
                          Sunday, Wednesday, Friday reminders for pending RSVPs
                        </p>
                      </div>
                      <Switch
                        id="weekly-nudges"
                        checked={preferences.weekly_nudges}
                        onCheckedChange={(checked) => updatePreference('weekly_nudges', checked)}
                        disabled={loading}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="manual-reminders">Manual Reminders</Label>
                        <p className="text-sm text-muted-foreground">
                          Custom reminders sent by coaches
                        </p>
                      </div>
                      <Switch
                        id="manual-reminders"
                        checked={preferences.manual_reminders}
                        onCheckedChange={(checked) => updatePreference('manual_reminders', checked)}
                        disabled={loading}
                      />
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Device Settings */}
                <div className="space-y-4">
                  <h3 className="font-semibold flex items-center gap-2">
                    <Settings className="h-4 w-4" />
                    Device Settings
                  </h3>
                  
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="notification-sound">Sound</Label>
                        <p className="text-sm text-muted-foreground">
                          Play sound for notifications
                        </p>
                      </div>
                      <Switch
                        id="notification-sound"
                        checked={preferences.notification_sound}
                        onCheckedChange={(checked) => updatePreference('notification_sound', checked)}
                        disabled={loading}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="vibration">Vibration</Label>
                        <p className="text-sm text-muted-foreground">
                          Vibrate device for notifications
                        </p>
                      </div>
                      <Switch
                        id="vibration"
                        checked={preferences.vibration}
                        onCheckedChange={(checked) => updatePreference('vibration', checked)}
                        disabled={loading}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="badge-count">Badge Count</Label>
                        <p className="text-sm text-muted-foreground">
                          Show notification count on app icon
                        </p>
                      </div>
                      <Switch
                        id="badge-count"
                        checked={preferences.badge_count}
                        onCheckedChange={(checked) => updatePreference('badge_count', checked)}
                        disabled={loading}
                      />
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="testing" className="space-y-6">
                <div className="space-y-4">
                  <h3 className="font-semibold flex items-center gap-2">
                    <MessageSquare className="h-4 w-4" />
                    Testing & Maintenance
                  </h3>
                  
                  <div className="grid gap-4">
                    <Card>
                      <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-medium">Test Notification</h4>
                            <p className="text-sm text-muted-foreground">
                              Send a test notification to verify your settings
                            </p>
                          </div>
                          <Button onClick={testNotification}>
                            Send Test
                          </Button>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-medium">Clear Badge Count</h4>
                            <p className="text-sm text-muted-foreground">
                              Reset the notification badge on your app icon
                            </p>
                          </div>
                          <Button variant="outline" onClick={clearBadges}>
                            Clear Badges
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          )}
        </CardContent>
      </Card>
    </div>
  );
};