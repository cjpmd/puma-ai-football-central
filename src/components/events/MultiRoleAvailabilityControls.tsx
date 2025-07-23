import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Check, X } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { multiRoleAvailabilityService } from '@/services/multiRoleAvailabilityService';

interface EventAvailability {
  id: string;
  event_id: string;
  user_id: string;
  role: 'player' | 'staff';
  status: 'pending' | 'available' | 'unavailable';
  responded_at?: string;
  notification_sent_at: string;
  created_at: string;
  updated_at: string;
}

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
  const [availabilities, setAvailabilities] = useState<EventAvailability[]>([]);
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
      // First ensure all role availability records exist for this user
      await multiRoleAvailabilityService.ensureAllRoleAvailabilityRecords(eventId, user.id);
      
      // Then fetch the availability data
      const { data, error } = await supabase
        .from('event_availability')
        .select('*')
        .eq('event_id', eventId)
        .eq('user_id', user.id);

      if (error) throw error;

      console.log('DEBUG - Event Availability:', data);
      setAvailabilities((data || []) as EventAvailability[]);
    } catch (error) {
      console.error('Error loading availability data:', error);
      toast.error('Failed to load availability data');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateAvailability = async (
    role: 'player' | 'staff',
    status: 'available' | 'unavailable'
  ) => {
    if (!user?.id || updating.has(role)) return;

    setUpdating(prev => new Set([...prev, role]));

    try {
      const { error } = await supabase
        .from('event_availability')
        .update({ 
          status,
          responded_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('event_id', eventId)
        .eq('user_id', user.id)
        .eq('role', role);

      if (error) throw error;

      // Update local state
      setAvailabilities(prev => 
        prev.map(availability => 
          availability.role === role 
            ? { ...availability, status, responded_at: new Date().toISOString() }
            : availability
        )
      );

      onStatusChange?.(role, status);
      
      const roleLabel = role === 'staff' ? 'Coach' : 'Player';
      toast.success(`${roleLabel} availability set to ${status}`);
    } catch (error) {
      console.error('Error updating availability:', error);
      toast.error(`Failed to update availability`);
    } finally {
      setUpdating(prev => {
        const next = new Set(prev);
        next.delete(role);
        return next;
      });
    }
  };

  const getRoleStatus = (role: 'player' | 'staff'): 'pending' | 'available' | 'unavailable' => {
    const availability = availabilities.find(a => a.role === role);
    return availability?.status || 'pending';
  };

  const renderRoleAvailability = (role: 'player' | 'staff') => {
    const isUpdating = updating.has(role);
    const status = getRoleStatus(role);
    const roleLabel = role === 'staff' ? 'Coach Availability' : 'Player Availability';

    // Show initial accept/decline buttons for pending status
    if (status === 'pending') {
      return (
        <div className="flex items-center justify-between">
          <span className={`${textSize} font-medium`}>{roleLabel}</span>
          <div className="flex gap-2">
            <Button
              size="sm"
              className={`bg-green-600 hover:bg-green-700 text-white ${buttonSize}`}
              onClick={() => handleUpdateAvailability(role, 'available')}
              disabled={isUpdating}
              title={`Mark as available`}
            >
              <Check className={iconSize} />
              {size === 'md' && <span className="ml-1">Accept</span>}
            </Button>
            <Button
              size="sm"
              className={`bg-red-600 hover:bg-red-700 text-white ${buttonSize}`}
              onClick={() => handleUpdateAvailability(role, 'unavailable')}
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
              role,
              status === 'available' ? 'unavailable' : 'available'
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

  if (availabilities.length === 0) {
    return (
      <div className={`${textSize} text-muted-foreground space-y-2`}>
        <div>No availability requests found for this event</div>
        <div className="text-xs opacity-75">
          Availability requests are automatically created when events are added.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {availabilities.map((availability) => (
        <div key={`${availability.role}-${availability.id}`}>
          {renderRoleAvailability(availability.role)}
        </div>
      ))}
    </div>
  );
};