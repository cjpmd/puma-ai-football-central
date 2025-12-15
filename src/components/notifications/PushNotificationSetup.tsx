import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Bell, CheckCircle, Smartphone, Globe, Bug } from 'lucide-react';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { toast } from 'sonner';
import { PushNotificationDebug } from './PushNotificationDebug';

export const PushNotificationSetup: React.FC = () => {
  const { 
    isInitialized, 
    permissionGranted, 
    platform, 
    requestPermissions,
    sendTestNotification,
    isSupported 
  } = usePushNotifications();
  const [isRequesting, setIsRequesting] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [showDebug, setShowDebug] = useState(false);

  // Don't show if not supported
  if (!isSupported) {
    return null;
  }

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

  const handleTestNotification = async () => {
    setIsTesting(true);
    try {
      const success = await sendTestNotification();
      if (success) {
        toast.success('Test notification sent!');
      } else {
        toast.error('Failed to send test notification');
      }
    } catch (error) {
      console.error('Error sending test notification:', error);
      toast.error('Failed to send test notification');
    } finally {
      setIsTesting(false);
    }
  };

  const getPlatformIcon = () => {
    if (platform === 'capacitor') {
      return <Smartphone className="h-5 w-5" />;
    }
    return <Globe className="h-5 w-5" />;
  };

  const getPlatformLabel = () => {
    if (platform === 'capacitor') {
      return 'Native App';
    }
    return 'Web Push';
  };

  if (!isInitialized && platform === 'capacitor') {
    return (
      <Card>
        <CardContent className="py-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mr-2"></div>
            <span>Initializing notifications...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            {permissionGranted ? (
              <CheckCircle className="h-5 w-5 text-green-600" />
            ) : (
              <Bell className="h-5 w-5" />
            )}
            <CardTitle className="text-lg">
              Push Notifications
            </CardTitle>
            <span className="ml-auto flex items-center gap-1 text-xs text-muted-foreground">
              {getPlatformIcon()}
              {getPlatformLabel()}
            </span>
          </div>
          <CardDescription>
            {permissionGranted 
              ? 'You\'ll receive notifications when events require your availability.'
              : platform === 'web-push' 
                ? 'Enable browser notifications to receive event availability requests.'
                : 'Enable push notifications to receive event availability requests on your device.'
            }
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {permissionGranted ? (
            <>
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle className="h-4 w-4" />
                <span className="text-sm">Push notifications are enabled</span>
              </div>
              <div className="flex gap-2">
                <Button 
                  variant="outline"
                  onClick={handleTestNotification}
                  disabled={isTesting}
                  size="sm"
                  className="flex-1"
                >
                  {isTesting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary mr-2"></div>
                      Sending...
                    </>
                  ) : (
                    'Send Test Notification'
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowDebug(!showDebug)}
                >
                  <Bug className="h-4 w-4" />
                </Button>
              </div>
            </>
          ) : (
            <>
              <Button 
                onClick={handleRequestPermissions}
                disabled={isRequesting}
                className="w-full"
              >
                {isRequesting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Setting up...
                  </>
                ) : (
                  <>
                    <Bell className="h-4 w-4 mr-2" />
                    Enable Push Notifications
                  </>
                )}
              </Button>
              <div className="flex items-center justify-between">
                {platform === 'web-push' && (
                  <p className="text-xs text-muted-foreground">
                    For best experience on iOS, add this app to your home screen first.
                  </p>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowDebug(!showDebug)}
                >
                  <Bug className="h-4 w-4" />
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
      
      {showDebug && <PushNotificationDebug />}
    </div>
  );
};
