import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Bell, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Calendar,
  Users,
  RefreshCw,
  Trash2,
  Filter
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { formatDistance } from 'date-fns';

interface NotificationLog {
  id: string;
  title: string;
  body: string;
  notification_type: string;
  status: 'sent' | 'delivered' | 'opened' | 'failed';
  sent_at: string;
  delivered_at?: string;
  opened_at?: string;
  event_id?: string;
  metadata?: any;
}

interface NotificationStats {
  total: number;
  sent: number;
  delivered: number;
  opened: number;
  failed: number;
  deliveryRate: number;
  openRate: number;
}

export const NotificationHistory: React.FC = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<NotificationLog[]>([]);
  const [stats, setStats] = useState<NotificationStats>({
    total: 0,
    sent: 0,
    delivered: 0,
    opened: 0,
    failed: 0,
    deliveryRate: 0,
    openRate: 0
  });
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'availability' | 'updates' | 'reminders'>('all');

  useEffect(() => {
    if (user) {
      loadNotificationHistory();
    }
  }, [user, filter]);

  const loadNotificationHistory = async () => {
    try {
      setLoading(true);

      // Build query with filter
      let query = supabase
        .from('notification_logs')
        .select('*')
        .eq('user_id', user?.id)
        .order('sent_at', { ascending: false })
        .limit(50);

      if (filter !== 'all') {
        query = query.eq('notification_type', filter);
      }

      const { data, error } = await query;

      if (error) throw error;

      setNotifications(data || []);
      calculateStats(data || []);
    } catch (error) {
      console.error('Error loading notification history:', error);
      toast.error('Failed to load notification history');
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (notificationData: NotificationLog[]) => {
    const total = notificationData.length;
    const sent = notificationData.filter(n => n.status !== 'failed').length;
    const delivered = notificationData.filter(n => n.delivered_at).length;
    const opened = notificationData.filter(n => n.opened_at).length;
    const failed = notificationData.filter(n => n.status === 'failed').length;

    const deliveryRate = total > 0 ? (delivered / total) * 100 : 0;
    const openRate = delivered > 0 ? (opened / delivered) * 100 : 0;

    setStats({
      total,
      sent,
      delivered,
      opened,
      failed,
      deliveryRate: Math.round(deliveryRate),
      openRate: Math.round(openRate)
    });
  };

  const clearHistory = async () => {
    try {
      const { error } = await supabase
        .from('notification_logs')
        .delete()
        .eq('user_id', user?.id);

      if (error) throw error;

      setNotifications([]);
      calculateStats([]);
      toast.success('Notification history cleared');
    } catch (error) {
      console.error('Error clearing history:', error);
      toast.error('Failed to clear history');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'delivered': return 'default';
      case 'opened': return 'default';
      case 'failed': return 'destructive';
      default: return 'secondary';
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'availability': return Calendar;
      case 'updates': return Bell;
      case 'reminders': return Clock;
      default: return Bell;
    }
  };

  const formatTimeAgo = (dateString: string) => {
    return formatDistance(new Date(dateString), new Date(), { addSuffix: true });
  };

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Notification Statistics</CardTitle>
              <CardDescription>
                Overview of your notification delivery and engagement
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={loadNotificationHistory}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold">{stats.total}</div>
              <div className="text-xs text-muted-foreground">Total</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{stats.sent}</div>
              <div className="text-xs text-muted-foreground">Sent</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{stats.delivered}</div>
              <div className="text-xs text-muted-foreground">Delivered</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{stats.opened}</div>
              <div className="text-xs text-muted-foreground">Opened</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{stats.failed}</div>
              <div className="text-xs text-muted-foreground">Failed</div>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t grid grid-cols-2 gap-4 text-center">
            <div>
              <div className="text-lg font-semibold">{stats.deliveryRate}%</div>
              <div className="text-xs text-muted-foreground">Delivery Rate</div>
            </div>
            <div>
              <div className="text-lg font-semibold">{stats.openRate}%</div>
              <div className="text-xs text-muted-foreground">Open Rate</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filter and Actions */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Notification History</CardTitle>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1">
                <Filter className="h-4 w-4" />
                <select 
                  value={filter} 
                  onChange={(e) => setFilter(e.target.value as any)}
                  className="text-sm border rounded px-2 py-1"
                >
                  <option value="all">All Types</option>
                  <option value="availability">Availability</option>
                  <option value="updates">Updates</option>
                  <option value="reminders">Reminders</option>
                </select>
              </div>
              <Button variant="outline" size="sm" onClick={clearHistory}>
                <Trash2 className="h-4 w-4 mr-2" />
                Clear History
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mr-2"></div>
              <span>Loading notification history...</span>
            </div>
          ) : notifications.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Bell className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No notifications found</p>
              <p className="text-sm">Notifications will appear here once you start receiving them</p>
            </div>
          ) : (
            <ScrollArea className="h-96">
              <div className="space-y-3">
                {notifications.map((notification) => {
                  const Icon = getNotificationIcon(notification.notification_type);
                  return (
                    <div key={notification.id} className="flex items-start gap-3 p-3 border rounded-lg">
                      <Icon className="h-5 w-5 mt-0.5 text-muted-foreground" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <h4 className="font-medium text-sm truncate">
                            {notification.title}
                          </h4>
                          <Badge variant={getStatusColor(notification.status)} className="ml-2">
                            {notification.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {notification.body}
                        </p>
                        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                          <span>Sent {formatTimeAgo(notification.sent_at)}</span>
                          {notification.delivered_at && (
                            <span className="flex items-center gap-1">
                              <CheckCircle className="h-3 w-3" />
                              Delivered {formatTimeAgo(notification.delivered_at)}
                            </span>
                          )}
                          {notification.opened_at && (
                            <span className="flex items-center gap-1">
                              <Users className="h-3 w-3" />
                              Opened {formatTimeAgo(notification.opened_at)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
};