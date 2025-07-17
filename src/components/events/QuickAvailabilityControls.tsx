
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Check, X, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface QuickAvailabilityControlsProps {
  eventId: string;
  currentStatus?: 'pending' | 'available' | 'unavailable' | null;
  size?: 'sm' | 'md';
  onStatusChange?: (status: 'available' | 'unavailable') => void;
}

export const QuickAvailabilityControls: React.FC<QuickAvailabilityControlsProps> = ({
  eventId,
  currentStatus,
  size = 'md',
  onStatusChange
}) => {
  const [isUpdating, setIsUpdating] = useState(false);
  const { user } = useAuth();

  const updateAvailability = async (status: 'available' | 'unavailable') => {
    if (!user?.id || isUpdating) return;

    setIsUpdating(true);
    try {
      const { error } = await supabase
        .from('event_availability')
        .upsert({
          event_id: eventId,
          user_id: user.id,
          role: 'player', // This would be determined based on user's relationship to the event
          status,
          responded_at: new Date().toISOString()
        }, {
          onConflict: 'event_id,user_id,role'
        });

      if (error) throw error;

      onStatusChange?.(status);
      toast.success(`Availability set to ${status}`);
    } catch (error) {
      console.error('Error updating availability:', error);
      toast.error('Failed to update availability');
    } finally {
      setIsUpdating(false);
    }
  };

  const buttonSize = size === 'sm' ? 'h-6 w-6 p-0' : 'h-7 w-7 p-0';
  const iconSize = size === 'sm' ? 'h-3 w-3' : 'h-4 w-4';
  const textSize = size === 'sm' ? 'text-xs' : 'text-sm';

  // Show initial accept/decline buttons for pending or no status
  if (!currentStatus || currentStatus === 'pending') {
    return (
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          className={`bg-green-600 hover:bg-green-700 text-white ${size === 'sm' ? 'h-7 px-3' : 'h-8 px-4'}`}
          onClick={() => updateAvailability('available')}
          disabled={isUpdating}
          title="Mark as available"
        >
          <Check className={`${iconSize} mr-1`} />
          <span className={textSize}>Accept</span>
        </Button>
        <Button
          size="sm"
          className={`bg-red-600 hover:bg-red-700 text-white ${size === 'sm' ? 'h-7 px-3' : 'h-8 px-4'}`}
          onClick={() => updateAvailability('unavailable')}
          disabled={isUpdating}
          title="Mark as unavailable"
        >
          <X className={`${iconSize} mr-1`} />
          <span className={textSize}>Decline</span>
        </Button>
      </div>
    );
  }

  // Show status with change option
  if (currentStatus === 'available') {
    return (
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1 text-green-600">
          <Check className={iconSize} />
          <span className={textSize}>Available</span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className={`text-red-600 hover:text-red-700 hover:bg-red-50 ${buttonSize}`}
          onClick={() => updateAvailability('unavailable')}
          disabled={isUpdating}
          title="Change to unavailable"
        >
          <X className={iconSize} />
        </Button>
      </div>
    );
  }

  if (currentStatus === 'unavailable') {
    return (
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1 text-red-600">
          <X className={iconSize} />
          <span className={textSize}>Unavailable</span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className={`text-green-600 hover:text-green-700 hover:bg-green-50 ${buttonSize}`}
          onClick={() => updateAvailability('available')}
          disabled={isUpdating}
          title="Change to available"
        >
          <Check className={iconSize} />
        </Button>
      </div>
    );
  }

  return null;
};
