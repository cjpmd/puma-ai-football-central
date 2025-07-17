
import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Clock, XCircle } from 'lucide-react';
import { userAvailabilityService } from '@/services/userAvailabilityService';

interface AvailabilityStatusBadgeProps {
  eventId: string;
  userId: string;
  size?: 'sm' | 'md' | 'lg';
}

export const AvailabilityStatusBadge: React.FC<AvailabilityStatusBadgeProps> = ({ 
  eventId,
  userId,
  size = 'sm' 
}) => {
  const [status, setStatus] = useState<'pending' | 'available' | 'unavailable'>('pending');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAvailabilityStatus = async () => {
      try {
        setLoading(true);
        const availabilityStatuses = await userAvailabilityService.getUserAvailabilityForEvents(userId, [eventId]);
        const eventStatus = availabilityStatuses.find(s => s.eventId === eventId);
        setStatus(eventStatus?.status || 'pending');
      } catch (error) {
        console.error('Error fetching availability status:', error);
        setStatus('pending');
      } finally {
        setLoading(false);
      }
    };

    if (eventId && userId) {
      fetchAvailabilityStatus();
    }
  }, [eventId, userId]);

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

  if (loading) {
    return (
      <Badge variant="secondary" className="bg-gray-500 text-white">
        <Clock className={`mr-1 h-3 w-3`} />
        Loading...
      </Badge>
    );
  }

  const config = getStatusConfig();
  const Icon = config.icon;
  const iconSize = size === 'lg' ? 16 : size === 'md' ? 14 : 12;

  return (
    <Badge variant={config.variant} className={config.className}>
      <Icon className={`mr-1 h-${iconSize === 16 ? '4' : iconSize === 14 ? '3.5' : '3'} w-${iconSize === 16 ? '4' : iconSize === 14 ? '3.5' : '3'}`} />
      {config.text}
    </Badge>
  );
};
