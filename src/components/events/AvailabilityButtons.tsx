
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Check, X, Clock } from 'lucide-react';
import { userAvailabilityService } from '@/services/userAvailabilityService';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface AvailabilityButtonsProps {
  eventId: string;
  currentStatus: 'pending' | 'available' | 'unavailable' | null;
  onStatusChange?: (newStatus: 'available' | 'unavailable') => void;
}

export function AvailabilityButtons({ eventId, currentStatus, onStatusChange }: AvailabilityButtonsProps) {
  const [isUpdating, setIsUpdating] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const handleStatusUpdate = async (newStatus: 'available' | 'unavailable') => {
    if (!user?.id) {
      toast({
        title: 'Error',
        description: 'You must be logged in to update availability.',
        variant: 'destructive',
      });
      return;
    }

    setIsUpdating(true);
    try {
      await userAvailabilityService.updateUserAvailability(
        user.id,
        eventId,
        newStatus
      );
      
      onStatusChange?.(newStatus);
      
      toast({
        title: 'Availability Updated',
        description: `You are now marked as ${newStatus} for this event.`,
      });
    } catch (error) {
      console.error('Error updating availability:', error);
      toast({
        title: 'Error',
        description: 'Failed to update availability. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsUpdating(false);
    }
  };

  if (currentStatus === null) {
    return null; // No availability record exists
  }

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-1">
        {currentStatus === 'pending' && (
          <Clock className="h-3 w-3 text-amber-500" />
        )}
        {currentStatus === 'available' && (
          <Check className="h-3 w-3 text-green-500" />
        )}
        {currentStatus === 'unavailable' && (
          <X className="h-3 w-3 text-red-500" />
        )}
        <span className="text-xs capitalize text-muted-foreground">
          {currentStatus}
        </span>
      </div>
      
      {currentStatus === 'pending' && (
        <div className="flex gap-1">
          <Button
            size="sm"
            variant="outline"
            className="h-6 px-2 text-xs text-green-600 border-green-600 hover:bg-green-50"
            onClick={() => handleStatusUpdate('available')}
            disabled={isUpdating}
          >
            <Check className="h-3 w-3 mr-1" />
            Accept
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-6 px-2 text-xs text-red-600 border-red-600 hover:bg-red-50"
            onClick={() => handleStatusUpdate('unavailable')}
            disabled={isUpdating}
          >
            <X className="h-3 w-3 mr-1" />
            Decline
          </Button>
        </div>
      )}
    </div>
  );
}
