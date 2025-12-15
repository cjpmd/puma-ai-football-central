import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Bell, CheckCircle, XCircle, AlertCircle, RefreshCw, Send } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { webPushService } from '@/services/webPushService';
import { toast } from '@/hooks/use-toast';

interface DebugStatus {
  serviceWorker: 'checking' | 'registered' | 'not-registered' | 'error';
  pushSubscription: 'checking' | 'subscribed' | 'not-subscribed' | 'error';
  permission: NotificationPermission | 'unsupported';
  tokenInDb: 'checking' | 'found' | 'not-found' | 'error';
}

interface DebugLog {
  time: string;
  message: string;
  type: 'info' | 'success' | 'error';
}

export const PushNotificationDebug: React.FC = () => {
  const { user } = useAuth();
  const [status, setStatus] = useState<DebugStatus>({
    serviceWorker: 'checking',
    pushSubscription: 'checking',
    permission: 'default',
    tokenInDb: 'checking'
  });
  const [logs, setLogs] = useState<DebugLog[]>([]);
  const [isTesting, setIsTesting] = useState(false);
  const [subscriptionDetails, setSubscriptionDetails] = useState<string>('');

  const addLog = (message: string, type: DebugLog['type'] = 'info') => {
    const time = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, { time, message, type }]);
  };

  const checkStatus = async () => {
    setLogs([]);
    addLog('Starting diagnostic check...');

    // Check notification permission
    if (!('Notification' in window)) {
      setStatus(s => ({ ...s, permission: 'unsupported' }));
      addLog('Notifications not supported in this browser', 'error');
    } else {
      const permission = Notification.permission;
      setStatus(s => ({ ...s, permission }));
      addLog(`Notification permission: ${permission}`, permission === 'granted' ? 'success' : 'info');
    }

    // Check service worker
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.getRegistration();
        if (registration) {
          setStatus(s => ({ ...s, serviceWorker: 'registered' }));
          addLog(`Service worker registered: ${registration.scope}`, 'success');
          addLog(`SW state: ${registration.active?.state || 'unknown'}`);
        } else {
          setStatus(s => ({ ...s, serviceWorker: 'not-registered' }));
          addLog('No service worker registration found', 'error');
        }
      } catch (e) {
        setStatus(s => ({ ...s, serviceWorker: 'error' }));
        addLog(`Service worker error: ${e}`, 'error');
      }
    } else {
      setStatus(s => ({ ...s, serviceWorker: 'error' }));
      addLog('Service workers not supported', 'error');
    }

    // Check push subscription
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        setStatus(s => ({ ...s, pushSubscription: 'subscribed' }));
        const details = JSON.stringify({
          endpoint: subscription.endpoint.substring(0, 50) + '...',
          keys: {
            p256dh: subscription.toJSON().keys?.p256dh?.substring(0, 20) + '...',
            auth: subscription.toJSON().keys?.auth?.substring(0, 10) + '...'
          }
        }, null, 2);
        setSubscriptionDetails(details);
        addLog('Push subscription found', 'success');
        addLog(`Endpoint: ${subscription.endpoint.substring(0, 60)}...`);
      } else {
        setStatus(s => ({ ...s, pushSubscription: 'not-subscribed' }));
        addLog('No push subscription found', 'error');
      }
    } catch (e) {
      setStatus(s => ({ ...s, pushSubscription: 'error' }));
      addLog(`Push subscription error: ${e}`, 'error');
    }

    // Check token in database
    if (user) {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('push_token')
          .eq('id', user.id)
          .single();
        
        if (error) throw error;
        
        if (data?.push_token) {
          setStatus(s => ({ ...s, tokenInDb: 'found' }));
          addLog('Push token found in database', 'success');
          // Check if it's a web push subscription
          try {
            const parsed = JSON.parse(data.push_token);
            if (parsed.endpoint) {
              addLog('Token type: Web Push subscription');
            }
          } catch {
            addLog('Token type: FCM token');
          }
        } else {
          setStatus(s => ({ ...s, tokenInDb: 'not-found' }));
          addLog('No push token in database', 'error');
        }
      } catch (e) {
        setStatus(s => ({ ...s, tokenInDb: 'error' }));
        addLog(`Database check error: ${e}`, 'error');
      }
    } else {
      addLog('Not logged in - cannot check database', 'error');
    }

    addLog('Diagnostic check complete');
  };

  const testNotification = async () => {
    if (!user) {
      toast({ title: 'Not logged in', variant: 'destructive' });
      return;
    }

    setIsTesting(true);
    addLog('Sending test notification...');

    try {
      // Call edge function directly with full logging
      const response = await supabase.functions.invoke('send-push-notification', {
        body: {
          title: 'Test Notification',
          body: `Test at ${new Date().toLocaleTimeString()}`,
          userIds: [user.id]
        }
      });

      addLog(`Edge function response: ${JSON.stringify(response.data)}`, response.error ? 'error' : 'success');
      
      if (response.error) {
        addLog(`Edge function error: ${response.error.message}`, 'error');
        toast({ 
          title: 'Test failed', 
          description: response.error.message,
          variant: 'destructive' 
        });
      } else {
        toast({ 
          title: 'Test sent', 
          description: 'Check for notification (may take a few seconds)' 
        });
      }
    } catch (e) {
      addLog(`Test error: ${e}`, 'error');
      toast({ title: 'Test failed', description: String(e), variant: 'destructive' });
    } finally {
      setIsTesting(false);
    }
  };

  const requestPermission = async () => {
    addLog('Requesting notification permission...');
    try {
      const result = await webPushService.initializeWebPush();
      addLog(`Permission result: ${result ? 'granted' : 'denied'}`, result ? 'success' : 'error');
      await checkStatus();
    } catch (e) {
      addLog(`Permission error: ${e}`, 'error');
    }
  };

  useEffect(() => {
    checkStatus();
  }, [user]);

  const StatusIcon = ({ status }: { status: string }) => {
    switch (status) {
      case 'registered':
      case 'subscribed':
      case 'found':
      case 'granted':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'not-registered':
      case 'not-subscribed':
      case 'not-found':
      case 'denied':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'checking':
        return <RefreshCw className="h-4 w-4 text-muted-foreground animate-spin" />;
      default:
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Push Notification Debug
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Status Grid */}
        <div className="grid grid-cols-2 gap-2">
          <div className="flex items-center gap-2 p-2 rounded bg-muted/50">
            <StatusIcon status={status.serviceWorker} />
            <span className="text-sm">Service Worker</span>
          </div>
          <div className="flex items-center gap-2 p-2 rounded bg-muted/50">
            <StatusIcon status={status.permission} />
            <span className="text-sm">Permission: {status.permission}</span>
          </div>
          <div className="flex items-center gap-2 p-2 rounded bg-muted/50">
            <StatusIcon status={status.pushSubscription} />
            <span className="text-sm">Push Subscription</span>
          </div>
          <div className="flex items-center gap-2 p-2 rounded bg-muted/50">
            <StatusIcon status={status.tokenInDb} />
            <span className="text-sm">Token in DB</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={checkStatus}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh Status
          </Button>
          {status.permission !== 'granted' && (
            <Button variant="outline" size="sm" onClick={requestPermission}>
              <Bell className="h-4 w-4 mr-2" />
              Request Permission
            </Button>
          )}
          <Button 
            size="sm" 
            onClick={testNotification}
            disabled={isTesting || status.pushSubscription !== 'subscribed'}
          >
            <Send className="h-4 w-4 mr-2" />
            {isTesting ? 'Sending...' : 'Send Test'}
          </Button>
        </div>

        {/* iOS Notice */}
        <div className="p-3 rounded bg-amber-500/10 border border-amber-500/20">
          <p className="text-sm text-amber-700 dark:text-amber-300">
            <strong>iOS Requirements:</strong> PWA must be added to Home Screen, iOS 16.4+, and permission granted via user interaction.
          </p>
        </div>

        {/* Logs */}
        <div className="space-y-1 max-h-48 overflow-y-auto bg-muted/30 rounded p-2">
          {logs.map((log, i) => (
            <div key={i} className="text-xs font-mono flex gap-2">
              <span className="text-muted-foreground">{log.time}</span>
              <span className={
                log.type === 'success' ? 'text-green-600' :
                log.type === 'error' ? 'text-red-600' : 'text-foreground'
              }>
                {log.message}
              </span>
            </div>
          ))}
        </div>

        {subscriptionDetails && (
          <details className="text-xs">
            <summary className="cursor-pointer text-muted-foreground">Subscription Details</summary>
            <pre className="mt-2 p-2 bg-muted rounded overflow-x-auto">{subscriptionDetails}</pre>
          </details>
        )}
      </CardContent>
    </Card>
  );
};
