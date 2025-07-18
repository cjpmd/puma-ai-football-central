
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle, Clock, XCircle, Check, X } from 'lucide-react';
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface AvailabilityStatusBadgeProps {
  eventId?: string;
  status: 'pending' | 'available' | 'unavailable';
  size?: 'sm' | 'md' | 'lg';
  interactive?: boolean;
  onStatusChange?: (status: 'available' | 'unavailable') => void;
}

export const AvailabilityStatusBadge: React.FC<AvailabilityStatusBadgeProps> = ({ 
  eventId,
  status, 
  size = 'sm',
  interactive = false,
  onStatusChange
}) => {
  const [isUpdating, setIsUpdating] = useState(false);
  const { user } = useAuth();

  const updateAvailability = async (newStatus: 'available' | 'unavailable') => {
    if (!user?.id || !eventId || isUpdating) return;

    setIsUpdating(true);
    try {
      const { error } = await supabase
        .from('event_availability')
        .upsert({
          event_id: eventId,
          user_id: user.id,
          role: 'player',
          status: newStatus,
          responded_at: new Date().toISOString()
        }, {
          onConflict: 'event_id,user_id,role'
        });

      if (error) throw error;

      onStatusChange?.(newStatus);
      toast.success(`Availability set to ${newStatus}`);
    } catch (error) {
      console.error('Error updating availability:', error);
      toast.error('Failed to update availability');
    } finally {
      setIsUpdating(false);
    }
  };

  const getStatusConfig = () => {
    switch (status) {
      case 'available':
        return {
          variant: 'default' as const,
          className: 'bg-green-500 hover:bg-green-600 text-white',
          icon: CheckCircle,
          text: 'Available'
        };
      case 'unavailable':
        return {
          variant: 'destructive' as const,
          className: 'bg-red-500 hover:bg-red-600 text-white',
          icon: XCircle,
          text: 'Unavailable'
        };
      default:
        return {
          variant: 'secondary' as const,
          className: 'bg-amber-500 hover:bg-amber-600 text-white',
          icon: Clock,
          text: 'Pending'
        };
    }
  };

  const config = getStatusConfig();
  const Icon = config.icon;
  const iconSize = size === 'lg' ? 16 : size === 'md' ? 14 : 12;

  if (!interactive) {
    return (
      <Badge variant={config.variant} className={config.className}>
        <Icon className={`mr-1 h-${iconSize === 16 ? '4' : iconSize === 14 ? '3.5' : '3'} w-${iconSize === 16 ? '4' : iconSize === 14 ? '3.5' : '3'}`} />
        {config.text}
      </Badge>
    );
  }

  // Interactive version with change icons
  return (
    <div className="flex items-center gap-2">
      <Badge variant={config.variant} className={config.className}>
        <Icon className={`mr-1 h-${iconSize === 16 ? '4' : iconSize === 14 ? '3.5' : '3'} w-${iconSize === 16 ? '4' : iconSize === 14 ? '3.5' : '3'}`} />
        {config.text}
      </Badge>
      
      {status === 'available' && (
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
          onClick={() => updateAvailability('unavailable')}
          disabled={isUpdating}
          title="Change to unavailable"
        >
          <X className="h-4 w-4 font-bold stroke-[3]" />
        </Button>
      )}
      
      {status === 'unavailable' && (
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0 text-green-600 hover:text-green-700 hover:bg-green-50"
          onClick={() => updateAvailability('available')}
          disabled={isUpdating}
          title="Change to available"
        >
          <Check className="h-4 w-4 font-bold stroke-[3]" />
        </Button>
      )}
    </div>
  );
};
