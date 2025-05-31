
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Users, Bell, RefreshCw } from 'lucide-react';
import { availabilityService } from '@/services/availabilityService';
import { AvailabilityStatusBadge } from './AvailabilityStatusBadge';
import { toast } from 'sonner';
import { DatabaseEvent } from '@/types/event';

interface EventAvailabilityDashboardProps {
  event: DatabaseEvent;
}

interface AvailabilityWithProfile {
  id: string;
  user_id: string;
  role: string;
  status: string;
  responded_at?: string;
  profile?: {
    name: string;
    email: string;
  };
}

export const EventAvailabilityDashboard: React.FC<EventAvailabilityDashboardProps> = ({ event }) => {
  const [availabilities, setAvailabilities] = useState<AvailabilityWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [sendingNotifications, setSendingNotifications] = useState(false);

  useEffect(() => {
    loadAvailabilities();
  }, [event.id]);

  const loadAvailabilities = async () => {
    try {
      setLoading(true);
      const data = await availabilityService.getEventAvailability(event.id);
      setAvailabilities(data as AvailabilityWithProfile[]);
    } catch (error) {
      console.error('Error loading availabilities:', error);
      toast.error('Failed to load availability data');
    } finally {
      setLoading(false);
    }
  };

  const handleSendNotifications = async () => {
    try {
      setSendingNotifications(true);
      await availabilityService.sendAvailabilityNotifications(event.id);
      toast.success('Availability notifications sent successfully');
      loadAvailabilities();
    } catch (error) {
      console.error('Error sending notifications:', error);
      toast.error('Failed to send notifications');
    } finally {
      setSendingNotifications(false);
    }
  };

  const getStatusCounts = () => {
    const counts = availabilities.reduce(
      (acc, availability) => {
        acc[availability.status]++;
        return acc;
      },
      { pending: 0, available: 0, unavailable: 0 }
    );
    return counts;
  };

  const statusCounts = getStatusCounts();

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Availability Dashboard
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">Loading availability data...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Availability Dashboard
        </CardTitle>
        <div className="flex items-center gap-2 mt-2">
          <Button
            onClick={handleSendNotifications}
            disabled={sendingNotifications}
            size="sm"
            variant="outline"
          >
            <Bell className="h-4 w-4 mr-2" />
            {sendingNotifications ? 'Sending...' : 'Send Notifications'}
          </Button>
          <Button
            onClick={loadAvailabilities}
            disabled={loading}
            size="sm"
            variant="outline"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {availabilities.length === 0 ? (
          <div className="text-center py-4 text-muted-foreground">
            No availability requests sent yet. Use the Team Selection to select players and staff, then send notifications.
          </div>
        ) : (
          <div className="space-y-4">
            {/* Status Summary */}
            <div className="grid grid-cols-3 gap-3">
              <div className="text-center p-3 bg-amber-50 rounded">
                <div className="text-2xl font-bold text-amber-600">{statusCounts.pending}</div>
                <div className="text-sm text-amber-700">Pending</div>
              </div>
              <div className="text-center p-3 bg-green-50 rounded">
                <div className="text-2xl font-bold text-green-600">{statusCounts.available}</div>
                <div className="text-sm text-green-700">Available</div>
              </div>
              <div className="text-center p-3 bg-red-50 rounded">
                <div className="text-2xl font-bold text-red-600">{statusCounts.unavailable}</div>
                <div className="text-sm text-red-700">Unavailable</div>
              </div>
            </div>

            {/* Availability List */}
            <div>
              <h4 className="font-medium mb-3">Individual Responses</h4>
              <ScrollArea className="h-64">
                <div className="space-y-2">
                  {availabilities.map((availability) => (
                    <div
                      key={availability.id}
                      className="flex items-center justify-between p-3 border rounded"
                    >
                      <div>
                        <div className="font-medium">
                          {availability.profile?.name || 'Unknown User'}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {availability.profile?.email}
                        </div>
                        <Badge variant="outline" className="mt-1">
                          {availability.role}
                        </Badge>
                      </div>
                      <div className="text-right">
                        <AvailabilityStatusBadge 
                          status={availability.status as any} 
                          size="md" 
                        />
                        {availability.responded_at && (
                          <div className="text-xs text-muted-foreground mt-1">
                            Responded: {new Date(availability.responded_at).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
