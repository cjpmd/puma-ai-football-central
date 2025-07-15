
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Bell, BellOff, CheckCircle } from 'lucide-react';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { toast } from 'sonner';
import { Capacitor } from '@capacitor/core';

export const PushNotificationSetup: React.FC = () => {
  const { isInitialized, permissionGranted, requestPermissions } = usePushNotifications();
  const [isRequesting, setIsRequesting] = useState(false);

  // Only show on native platforms (iOS/Android)
  if (!Capacitor.isNativePlatform()) {
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

  if (!isInitialized) {
    return (
      <Card>
        <CardContent className="py-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900 mr-2"></div>
            <span>Initializing notifications...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
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
        </div>
        <CardDescription>
          {permissionGranted 
            ? 'You\'ll receive notifications when events require your availability.'
            : 'Enable push notifications to receive event availability requests on your device.'
          }
        </CardDescription>
      </CardHeader>
      <CardContent>
        {permissionGranted ? (
          <div className="flex items-center gap-2 text-green-600">
            <CheckCircle className="h-4 w-4" />
            <span className="text-sm">Push notifications are enabled</span>
          </div>
        ) : (
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
        )}
      </CardContent>
    </Card>
  );
};
