import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Check, X } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { multiRoleAvailabilityService } from '@/services/multiRoleAvailabilityService';
import { formatPlayerName } from '@/utils/nameUtils';
import { useAvailabilityState } from '@/hooks/useAvailabilityState';

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
  const { updateAvailability, getAvailabilityStatus, loadAvailabilityForEvent } = useAvailabilityState(eventId);

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
      // First get the user's linked player ID (if any)
      const { data: userPlayerLink } = await supabase
        .from('user_players')
        .select('player_id')
        .eq('user_id', user.id)
        .maybeSingle();

      const linkedPlayerId = userPlayerLink?.player_id || null;

      // Check for player invitations by player_id (shared across linked accounts)
      let hasPlayerInvitation = false;
      if (linkedPlayerId) {
        const { data: playerInvitations } = await supabase
          .from('event_invitations')
          .select('id')
          .eq('event_id', eventId)
          .eq('player_id', linkedPlayerId)
          .limit(1);
        
        hasPlayerInvitation = (playerInvitations && playerInvitations.length > 0);
      }

      // Check for staff invitations by user_id
      const { data: staffInvitations } = await supabase
        .from('event_invitations')
        .select('id')
        .eq('event_id', eventId)
        .eq('user_id', user.id)
        .eq('invitee_type', 'staff')
        .limit(1);

      const hasStaffInvitation = (staffInvitations && staffInvitations.length > 0);

      // If no invitations found at all, check if it's an "everyone" event
      if (!hasPlayerInvitation && !hasStaffInvitation) {
        const { data: anyInvitations } = await supabase
          .from('event_invitations')
          .select('id')
          .eq('event_id', eventId)
          .limit(1);

        // If invitations exist for this event but user wasn't invited, exit
        if (anyInvitations && anyInvitations.length > 0) {
          console.log('User not invited to this event');
          setAvailabilities([]);
          setLoading(false);
          return;
        }

        // "Everyone" event - check what roles this user has
        if (linkedPlayerId) {
          hasPlayerInvitation = true;
        }

        const { data: staffLink } = await supabase
          .from('user_staff')
          .select('id')
          .eq('user_id', user.id)
          .limit(1);

        if (staffLink && staffLink.length > 0) {
          hasPlayerInvitation = true; // They can respond as player if linked
        }
      }

      const invitedRoles: Set<'player' | 'staff'> = new Set();
      if (hasPlayerInvitation && linkedPlayerId) {
        invitedRoles.add('player');
      }
      if (hasStaffInvitation) {
        invitedRoles.add('staff');
      }

      // Ensure availability records exist for invited roles
      for (const role of Array.from(invitedRoles)) {
        if (role === 'player' && linkedPlayerId) {
          await multiRoleAvailabilityService.createPlayerAvailabilityRecord(eventId, user.id, linkedPlayerId);
        } else if (role === 'staff') {
          await multiRoleAvailabilityService.createStaffAvailabilityRecord(eventId, user.id, 'staff');
        }
      }
      
      // Fetch availability records - player by player_id, staff by user_id
      const availabilityRecords: EventAvailability[] = [];

      // Fetch player availability by player_id (shared across linked users)
      if (invitedRoles.has('player') && linkedPlayerId) {
        const { data: playerAvail } = await supabase
          .from('event_availability')
          .select('*')
          .eq('event_id', eventId)
          .eq('player_id', linkedPlayerId)
          .eq('role', 'player')
          .maybeSingle();
        
        if (playerAvail) {
          availabilityRecords.push(playerAvail as EventAvailability);
        }
      }

      // Fetch staff availability by user_id (not shared)
      if (invitedRoles.has('staff')) {
        const { data: staffAvail } = await supabase
          .from('event_availability')
          .select('*')
          .eq('event_id', eventId)
          .eq('user_id', user.id)
          .eq('role', 'staff')
          .maybeSingle();
        
        if (staffAvail) {
          availabilityRecords.push(staffAvail as EventAvailability);
        }
      }

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
      if (linkedPlayerId) {
        const { data: playerData } = await supabase
          .from('players')
          .select('name, photo_url')
          .eq('id', linkedPlayerId)
          .single();

        if (playerData) {
          linkedPlayerData = playerData;
          console.log('Found linked player:', linkedPlayerData.name);
        }
      }

      if (profileData) {
        setUserProfile({
          id: profileData.id,
          name: profileData.name,
          photoUrl: undefined,
          linkedPlayer: linkedPlayerData
        });
      }

      console.log('DEBUG - Event Availability:', availabilityRecords);
      setAvailabilities(availabilityRecords);
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
      // Use the persistent availability state
      await updateAvailability(eventId, user.id, role, status);

      // Update local state
      setAvailabilities(prev => 
        prev.map(availability => 
          availability.role === role 
            ? { ...availability, status, responded_at: new Date().toISOString() }
            : availability
        )
      );

      onStatusChange?.(role, status);
      
      // If marking as unavailable and role is player, remove from squad and formation
      if (status === 'unavailable' && role === 'player') {
        try {
          // Find linked player for this user
          const { data: playerLink } = await supabase
            .from('user_players')
            .select('player_id')
            .eq('user_id', user.id)
            .single();
          
          if (playerLink?.player_id) {
            const { data: result, error: rpcError } = await supabase.rpc('remove_unavailable_player_from_event', {
              p_event_id: eventId,
              p_user_id: user.id,
              p_player_id: playerLink.player_id
            });

            if (rpcError) {
              console.error('Error removing unavailable player:', rpcError);
            } else {
              console.log('Player removed from squad and formation:', result);
            }
          }
        } catch (cleanupError) {
          console.error('Error removing unavailable player:', cleanupError);
          // Don't throw - availability was updated, cleanup is secondary
        }
      }
      
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
    // Fallback to local state - the persistent state is async now
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

    // Unified button layout for all statuses - always show both buttons as toggles
    return (
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0 flex-shrink">
          <Avatar className="h-7 w-7 flex-shrink-0">
            {photoUrl && (
              <AvatarImage src={photoUrl} alt={displayName} />
            )}
            <AvatarFallback className="text-xs">
              {getInitials(displayName)}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col min-w-0">
            <span className="text-sm font-medium truncate">{displayName}</span>
            <span className="text-xs text-muted-foreground">{roleLabel}</span>
          </div>
        </div>
        <div className="flex gap-1.5 flex-shrink-0">
          <Button
            size="sm"
            variant={status === 'available' ? 'default' : 'outline'}
            className={`h-7 px-2.5 text-xs ${
              status === 'available' 
                ? 'bg-teal-500 hover:bg-teal-600 text-white border-teal-500' 
                : 'border-gray-200 text-gray-500 hover:border-teal-400 hover:text-teal-600 hover:bg-teal-50'
            }`}
            onClick={() => handleUpdateAvailability(role, 'available')}
            disabled={isUpdating}
          >
            <Check className="h-3 w-3 mr-1" />
            Going
          </Button>
          <Button
            size="sm"
            variant={status === 'unavailable' ? 'default' : 'outline'}
            className={`h-7 px-2.5 text-xs ${
              status === 'unavailable'
                ? 'bg-red-500 hover:bg-red-600 text-white border-red-500'
                : 'border-gray-200 text-gray-500 hover:border-red-300 hover:text-red-500 hover:bg-red-50'
            }`}
            onClick={() => handleUpdateAvailability(role, 'unavailable')}
            disabled={isUpdating}
          >
            <X className="h-3 w-3 mr-1" />
            Not Going
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