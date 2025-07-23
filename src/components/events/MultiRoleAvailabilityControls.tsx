import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Check, X } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { multiRoleAvailabilityService, type UserRole, type AvailabilityStatus } from '@/services/multiRoleAvailabilityService';

interface MultiRoleAvailabilityControlsProps {
  eventId: string;
  size?: 'sm' | 'md';
  onStatusChange?: (role: string, status: 'available' | 'unavailable') => void;
}

export const MultiRoleAvailabilityControls: React.FC<MultiRoleAvailabilityControlsProps> = ({
  eventId,
  size = 'md',
  onStatusChange
}) => {
  const [userRoles, setUserRoles] = useState<UserRole[]>([]);
  const [availabilityStatuses, setAvailabilityStatuses] = useState<AvailabilityStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<Set<string>>(new Set());
  const { user } = useAuth();

  const buttonSize = size === 'sm' ? 'h-6 px-2' : 'h-7 px-3';
  const iconSize = size === 'sm' ? 'h-3 w-3' : 'h-4 w-4';
  const textSize = size === 'sm' ? 'text-xs' : 'text-sm';

  useEffect(() => {
    loadAvailabilityData();
  }, [eventId, user?.id]);

  const loadAvailabilityData = async () => {
    if (!user?.id || !eventId) return;

    setLoading(true);
    try {
      const [roles, statuses] = await Promise.all([
        multiRoleAvailabilityService.getUserRolesForEvent(eventId, user.id),
        multiRoleAvailabilityService.getUserAvailabilityStatuses(eventId, user.id)
      ]);

      console.log('DEBUG - Event ID:', eventId);
      console.log('DEBUG - User ID:', user.id);
      console.log('DEBUG - User Roles:', JSON.stringify(roles, null, 2));
      console.log('DEBUG - Availability Statuses:', JSON.stringify(statuses, null, 2));

      setUserRoles(roles);
      setAvailabilityStatuses(statuses);
    } catch (error) {
      console.error('Error loading availability data:', error);
      toast.error('Failed to load availability data');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateAvailability = async (
    role: 'player' | 'staff',
    status: 'available' | 'unavailable',
    roleKey: string
  ) => {
    if (!user?.id || updating.has(roleKey)) return;

    setUpdating(prev => new Set([...prev, roleKey]));

    try {
      await multiRoleAvailabilityService.updateRoleAvailability(
        eventId,
        user.id,
        role,
        status
      );

      // Update local state
      setAvailabilityStatuses(prev => {
        const existing = prev.find(s => s.role === role);
        if (existing) {
          return prev.map(s => s.role === role ? { ...s, status } : s);
        } else {
          return [...prev, { role, status, sourceId: user.id }];
        }
      });

      onStatusChange?.(role, status);
      
      const roleLabel = role === 'staff' ? 'Staff' : userRoles.find(r => r.role === 'player')?.playerName || 'Player';
      toast.success(`${roleLabel} availability set to ${status}`);
    } catch (error) {
      console.error('Error updating availability:', error);
      toast.error(`Failed to update availability`);
    } finally {
      setUpdating(prev => {
        const next = new Set(prev);
        next.delete(roleKey);
        return next;
      });
    }
  };

  const getRoleStatus = (role: 'player' | 'staff'): 'pending' | 'available' | 'unavailable' => {
    const status = availabilityStatuses.find(s => s.role === role);
    return status?.status || 'pending';
  };

  const renderRoleAvailability = (userRole: UserRole) => {
    const roleKey = `${userRole.role}-${userRole.sourceId}`;
    const isUpdating = updating.has(roleKey);
    const status = getRoleStatus(userRole.role);
    
    // Create role label with names
    let roleLabel = '';
    if (userRole.role === 'staff') {
      roleLabel = userRole.staffName ? `Staff: ${userRole.staffName}` : 'Staff Availability';
    } else if (userRole.role === 'player' && userRole.playerName) {
      roleLabel = `Player: ${userRole.playerName}`;
    } else {
      roleLabel = 'Player Availability';
    }

    // Show initial accept/decline buttons for pending status
    if (status === 'pending') {
      return (
        <div className="flex items-center justify-between">
          <span className={`${textSize} font-medium`}>{roleLabel}</span>
          <div className="flex gap-2">
            <Button
              size="sm"
              className={`bg-green-600 hover:bg-green-700 text-white ${buttonSize}`}
              onClick={() => handleUpdateAvailability(userRole.role, 'available', roleKey)}
              disabled={isUpdating}
              title={`Mark as available`}
            >
              <Check className={iconSize} />
              {size === 'md' && <span className="ml-1">Accept</span>}
            </Button>
            <Button
              size="sm"
              className={`bg-red-600 hover:bg-red-700 text-white ${buttonSize}`}
              onClick={() => handleUpdateAvailability(userRole.role, 'unavailable', roleKey)}
              disabled={isUpdating}
              title={`Mark as unavailable`}
            >
              <X className={iconSize} />
              {size === 'md' && <span className="ml-1">Decline</span>}
            </Button>
          </div>
        </div>
      );
    }

    // Show status with change option
    return (
      <div className="flex items-center justify-between">
        <span className={`${textSize} font-medium`}>{roleLabel}</span>
        <div className="flex items-center gap-2">
          <div className={`flex items-center gap-1 ${
            status === 'available' ? 'text-green-600' : 'text-red-600'
          }`}>
            {status === 'available' ? <Check className={iconSize} /> : <X className={iconSize} />}
            <span className={textSize}>
              {status === 'available' ? 'Available' : 'Unavailable'}
            </span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className={`${
              status === 'available' 
                ? 'text-red-600 hover:text-red-700 hover:bg-red-50' 
                : 'text-green-600 hover:text-green-700 hover:bg-green-50'
            } h-6 w-6 p-0`}
            onClick={() => handleUpdateAvailability(
              userRole.role,
              status === 'available' ? 'unavailable' : 'available',
              roleKey
            )}
            disabled={isUpdating}
            title={`Change to ${status === 'available' ? 'unavailable' : 'available'}`}
          >
            {status === 'available' ? <X className={iconSize} /> : <Check className={iconSize} />}
          </Button>
        </div>
      </div>
    );
  };

  if (loading) {
    return <div className={`${textSize} text-muted-foreground`}>Loading availability...</div>;
  }

  if (userRoles.length === 0) {
    return (
      <div className={`${textSize} text-muted-foreground space-y-1`}>
        <div>No roles found for this event</div>
        <div className="text-xs opacity-75">
          User: {user?.id} | Event: {eventId}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {userRoles.map((userRole) => (
        <div key={`${userRole.role}-${userRole.sourceId}`}>
          {renderRoleAvailability(userRole)}
        </div>
      ))}
    </div>
  );
};