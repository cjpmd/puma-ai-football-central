
import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { availabilityService } from '@/services/availabilityService';
import { AvailabilityConfirmation } from './AvailabilityConfirmation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Bell } from 'lucide-react';
import { eventsService } from '@/services/eventsService';
import { DatabaseEvent } from '@/types/event';

interface PendingAvailability {
  id: string;
  event_id: string;
  role: string;
  status: string;
  event?: DatabaseEvent;
}

export const AvailabilityNotificationService: React.FC = () => {
  const { user } = useAuth();
  const [pendingAvailabilities, setPendingAvailabilities] = useState<PendingAvailability[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadPendingAvailabilities();
    }
  }, [user]);

  const loadPendingAvailabilities = async () => {
    if (!user) return;

    try {
      setLoading(true);
      // This would need to be implemented with a proper query
      // For now, we'll use a placeholder approach
      const notifications = await availabilityService.getUserNotifications(user.id);
      
      // Filter for pending availability requests and load event details
      const pending: PendingAvailability[] = [];
      
      // This is a simplified version - in practice, you'd want to join tables or make separate queries
      // to get pending availability records with event details
      
      setPendingAvailabilities(pending);
    } catch (error) {
      console.error('Error loading pending availabilities:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = () => {
    loadPendingAvailabilities();
  };

  if (!user) return null;

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Availability Requests
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">Loading availability requests...</div>
        </CardContent>
      </Card>
    );
  }

  if (pendingAvailabilities.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Availability Requests
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4 text-muted-foreground">
            No pending availability requests.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Availability Requests ({pendingAvailabilities.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-96">
          <div className="space-y-4">
            {pendingAvailabilities.map((availability) => (
              availability.event && (
                <AvailabilityConfirmation
                  key={availability.id}
                  event={availability.event}
                  availabilityRecord={availability}
                  onStatusUpdate={handleStatusUpdate}
                />
              )
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};
