
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Check, X, Clock } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { useStaffAvailability } from '@/hooks/useStaffAvailability';

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
  const { 
    userRoles, 
    hasMultipleRoles, 
    updateAvailability, 
    getRoleStatus 
  } = useStaffAvailability(eventId, user?.id);

  const handleUpdateAvailability = async (role: 'player' | 'parent' | 'staff', status: 'available' | 'unavailable') => {
    if (!user?.id || isUpdating) return;

    setIsUpdating(true);
    try {
      await updateAvailability(role, status);
      onStatusChange?.(status);
      toast.success(`${role} availability set to ${status}`);
    } catch (error) {
      console.error('Error updating availability:', error);
      toast.error('Failed to update availability');
    } finally {
      setIsUpdating(false);
    }
  };

  const renderRoleAvailability = (role: 'player' | 'parent' | 'staff', roleLabel: string) => {
    const status = getRoleStatus(role);
    const buttonSize = size === 'sm' ? 'h-6 w-12 px-2' : 'h-7 w-16 px-3';
    const iconSize = size === 'sm' ? 'h-3 w-3' : 'h-4 w-4';
    const textSize = size === 'sm' ? 'text-xs' : 'text-sm';

    // Show initial accept/decline buttons for pending or no status
    if (!status || status === 'pending') {
      return (
        <div className="flex items-center gap-2">
          <span className={`${textSize} text-muted-foreground font-medium`}>{roleLabel}:</span>
          <Button
            size="sm"
            className={`bg-green-600 hover:bg-green-700 text-white ${buttonSize}`}
            onClick={() => handleUpdateAvailability(role, 'available')}
            disabled={isUpdating}
            title={`Mark ${role} as available`}
          >
            <Check className={iconSize} />
          </Button>
          <Button
            size="sm"
            className={`bg-red-600 hover:bg-red-700 text-white ${buttonSize}`}
            onClick={() => handleUpdateAvailability(role, 'unavailable')}
            disabled={isUpdating}
            title={`Mark ${role} as unavailable`}
          >
            <X className={iconSize} />
          </Button>
        </div>
      );
    }

    // Show status with change option
    if (status === 'available') {
      return (
        <div className="flex items-center gap-2">
          <span className={`${textSize} text-muted-foreground font-medium`}>{roleLabel}:</span>
          <div className="flex items-center gap-1 text-green-600">
            <Check className={iconSize} />
            <span className={textSize}>Available</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className={`text-red-600 hover:text-red-700 hover:bg-red-50 h-6 w-6 p-0`}
            onClick={() => handleUpdateAvailability(role, 'unavailable')}
            disabled={isUpdating}
            title={`Change ${role} to unavailable`}
          >
            <X className={iconSize} />
          </Button>
        </div>
      );
    }

    if (status === 'unavailable') {
      return (
        <div className="flex items-center gap-2">
          <span className={`${textSize} text-muted-foreground font-medium`}>{roleLabel}:</span>
          <div className="flex items-center gap-1 text-red-600">
            <X className={iconSize} />
            <span className={textSize}>Unavailable</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className={`text-green-600 hover:text-green-700 hover:bg-green-50 h-6 w-6 p-0`}
            onClick={() => handleUpdateAvailability(role, 'available')}
            disabled={isUpdating}
            title={`Change ${role} to available`}
          >
            <Check className={iconSize} />
          </Button>
        </div>
      );
    }

    return null;
  };

  // If user has multiple roles, show each role separately
  if (hasMultipleRoles) {
    return (
      <div className="space-y-1">
        {userRoles.map((role) => {
          const roleLabel = role.role === 'parent' ? 'Parent' : role.role === 'staff' ? 'Staff' : 'Player';
          return (
            <div key={role.role}>
              {renderRoleAvailability(role.role as 'player' | 'parent' | 'staff', roleLabel)}
            </div>
          );
        })}
      </div>
    );
  }

  // Single role - maintain existing behavior for backwards compatibility
  const singleRole = userRoles[0]?.role as 'player' | 'parent' | 'staff' || 'player';
  const status = getRoleStatus(singleRole) || currentStatus;
  const buttonSize = size === 'sm' ? 'h-6 w-6 p-0' : 'h-7 w-7 p-0';
  const iconSize = size === 'sm' ? 'h-3 w-3' : 'h-4 w-4';
  const textSize = size === 'sm' ? 'text-xs' : 'text-sm';

  // Show initial accept/decline buttons for pending or no status
  if (!status || status === 'pending') {
    return (
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          className={`bg-green-600 hover:bg-green-700 text-white ${size === 'sm' ? 'h-7 px-3' : 'h-8 px-4'}`}
          onClick={() => handleUpdateAvailability(singleRole, 'available')}
          disabled={isUpdating}
          title="Mark as available"
        >
          <Check className={`${iconSize} mr-1`} />
          <span className={textSize}>Accept</span>
        </Button>
        <Button
          size="sm"
          className={`bg-red-600 hover:bg-red-700 text-white ${size === 'sm' ? 'h-7 px-3' : 'h-8 px-4'}`}
          onClick={() => handleUpdateAvailability(singleRole, 'unavailable')}
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
  if (status === 'available') {
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
          onClick={() => handleUpdateAvailability(singleRole, 'unavailable')}
          disabled={isUpdating}
          title="Change to unavailable"
        >
          <X className={iconSize} />
        </Button>
      </div>
    );
  }

  if (status === 'unavailable') {
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
          onClick={() => handleUpdateAvailability(singleRole, 'available')}
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
