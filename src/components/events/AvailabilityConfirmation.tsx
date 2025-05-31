
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, Calendar, MapPin, Clock } from 'lucide-react';
import { availabilityService } from '@/services/availabilityService';
import { toast } from 'sonner';
import { DatabaseEvent } from '@/types/event';
import { formatDate } from '@/lib/utils';

interface AvailabilityConfirmationProps {
  event: DatabaseEvent;
  availabilityRecord: {
    id: string;
    role: string;
    status: string;
  };
  onStatusUpdate: () => void;
}

export const AvailabilityConfirmation: React.FC<AvailabilityConfirmationProps> = ({
  event,
  availabilityRecord,
  onStatusUpdate
}) => {
  const [isUpdating, setIsUpdating] = useState(false);

  const handleStatusUpdate = async (status: 'available' | 'unavailable') => {
    try {
      setIsUpdating(true);
      await availabilityService.updateAvailabilityStatus(
        event.id,
        availabilityRecord.id,
        availabilityRecord.role,
        status
      );
      toast.success(`Marked as ${status}`);
      onStatusUpdate();
    } catch (error) {
      console.error('Error updating availability:', error);
      toast.error('Failed to update availability');
    } finally {
      setIsUpdating(false);
    }
  };

  const getEventTypeColor = () => {
    switch (event.event_type) {
      case 'match':
      case 'fixture':
      case 'friendly':
        return 'bg-red-500';
      case 'training':
        return 'bg-blue-500';
      case 'tournament':
        return 'bg-purple-500';
      default:
        return 'bg-gray-500';
    }
  };

  if (availabilityRecord.status !== 'pending') {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            {event.title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground mb-2">
            You have already responded to this event.
          </p>
          <Badge className={
            availabilityRecord.status === 'available' 
              ? 'bg-green-500 text-white' 
              : 'bg-red-500 text-white'
          }>
            {availabilityRecord.status === 'available' ? 'Available' : 'Unavailable'}
          </Badge>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          {event.title}
        </CardTitle>
        <div className="flex items-center gap-2">
          <Badge className={getEventTypeColor()}>
            {event.event_type}
          </Badge>
          <Badge variant="outline">
            {availabilityRecord.role}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4" />
            {formatDate(event.date, 'dd MMM yyyy')}
          </div>
          {event.start_time && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              {event.start_time}
              {event.end_time && ` - ${event.end_time}`}
            </div>
          )}
          {event.location && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="h-4 w-4" />
              {event.location}
            </div>
          )}
        </div>

        {event.opponent && (
          <div className="text-sm">
            <strong>Opponent:</strong> {event.opponent}
          </div>
        )}

        {event.description && (
          <div className="text-sm">
            <strong>Description:</strong> {event.description}
          </div>
        )}

        <div className="border-t pt-4">
          <p className="text-sm font-medium mb-3">
            Please confirm your availability for this event:
          </p>
          <div className="flex gap-3">
            <Button
              onClick={() => handleStatusUpdate('available')}
              disabled={isUpdating}
              className="flex-1 bg-green-500 hover:bg-green-600 text-white"
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Available
            </Button>
            <Button
              onClick={() => handleStatusUpdate('unavailable')}
              disabled={isUpdating}
              variant="destructive"
              className="flex-1"
            >
              <XCircle className="h-4 w-4 mr-2" />
              Unavailable
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
