import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Check, X } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { multiRoleAvailabilityService } from '@/services/multiRoleAvailabilityService';
import { formatPlayerName } from '@/utils/nameUtils';

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

interface UserProfile {
  id: string;
  name: string;
  photoUrl?: string;
  linkedPlayer?: {
    name: string;
    photo_url?: string;
  };
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
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<Set<string>>(new Set());
  const { user } = useAuth();

  const buttonSize = size === 'sm' ? 'h-6 px-2' : 'h-7 px-3';
  const iconSize = size === 'sm' ? 'h-3 w-3' : 'h-4 w-4';
  const textSize = size === 'sm' ? 'text-xs' : 'text-sm';

  useEffect(() => {
    loadAvailabilityData();
  }, [eventId, user?.id]);

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

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

      // Get user profile information
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id, name')
        .eq('id', user.id)
        .single();

      if (profileError) {
        console.error('Error loading profile:', profileError);
      }

      // Get linked player information for player role
      let linkedPlayerData = null;
      const { data: playerData, error: playerError } = await supabase
        .from('user_players')
        .select('players(name, photo_url)')
        .eq('user_id', user.id)
        .single();

      if (playerError) {
        console.log('No player record found for user:', user.id);
      } else if (playerData?.players) {
        linkedPlayerData = playerData.players;
        console.log('Found linked player for user:', user.id, 'player:', linkedPlayerData.name);
      }

      if (profileData) {
        setUserProfile({
          id: profileData.id,
          name: profileData.name,
          photoUrl: undefined, // Will be set per role in rendering
          linkedPlayer: linkedPlayerData
        });
        console.log('Set user profile:', {
          id: profileData.id,
          name: profileData.name,
          hasLinkedPlayer: !!linkedPlayerData
        });
      }

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
    const roleLabel = role === 'staff' ? 'Coach' : 'Player';
    
    // For player role, show linked player name and photo if available
    // For staff role, show user profile name with initials only
    let displayName = 'User';
    let photoUrl: string | undefined = undefined;
    
    if (userProfile) {
      if (role === 'player' && userProfile.linkedPlayer) {
        displayName = formatPlayerName(userProfile.linkedPlayer.name, 'firstName');
        photoUrl = userProfile.linkedPlayer.photo_url || undefined;
      } else if (role === 'staff') {
        displayName = formatPlayerName(userProfile.name, 'firstName');
        // No photo for staff role - use initials only
        photoUrl = undefined;
      } else {
        displayName = formatPlayerName(userProfile.name, 'firstName');
      }
    }

    // Show initial accept/decline buttons for pending status
    if (status === 'pending') {
      return (
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 flex-1">
            <Avatar className="h-8 w-8">
              {photoUrl && (
                <AvatarImage src={photoUrl} alt={displayName} />
              )}
              <AvatarFallback className="text-xs">
                {getInitials(displayName)}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col">
              <span className={`${textSize} font-medium`}>{displayName}</span>
              <span className={`text-xs text-muted-foreground`}>{roleLabel}</span>
            </div>
          </div>
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
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 flex-1">
          <Avatar className="h-8 w-8">
            {photoUrl && (
              <AvatarImage src={photoUrl} alt={displayName} />
            )}
            <AvatarFallback className="text-xs">
              {getInitials(displayName)}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col">
            <span className={`${textSize} font-medium`}>{displayName}</span>
            <span className={`text-xs text-muted-foreground`}>{roleLabel}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className={`flex items-center gap-1 ${
            status === 'available' ? 'text-green-600' : 'text-red-600'
          }`}>
            {status === 'available' ? <Check className={iconSize} /> : <X className={iconSize} />}
            <span className={textSize}>
              {status === 'available' ? 'Going' : 'Not Going'}
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