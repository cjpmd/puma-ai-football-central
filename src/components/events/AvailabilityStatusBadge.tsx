
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Clock, XCircle } from 'lucide-react';

interface AvailabilityStatusBadgeProps {
  status: 'pending' | 'available' | 'unavailable';
  size?: 'sm' | 'md' | 'lg';
}

export const AvailabilityStatusBadge: React.FC<AvailabilityStatusBadgeProps> = ({ 
  status, 
  size = 'sm' 
}) => {
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

  return (
    <Badge variant={config.variant} className={config.className}>
      <Icon className={`mr-1 h-${iconSize === 16 ? '4' : iconSize === 14 ? '3.5' : '3'} w-${iconSize === 16 ? '4' : iconSize === 14 ? '3.5' : '3'}`} />
      {config.text}
    </Badge>
  );
};
