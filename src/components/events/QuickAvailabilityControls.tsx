
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Check, X, Clock } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useStaffAvailability } from '@/hooks/useStaffAvailability';
import { formatPlayerName } from '@/utils/nameUtils';
import { useAvailabilityState } from '@/hooks/useAvailabilityState';
import { multiRoleAvailabilityService } from '@/services/multiRoleAvailabilityService';

interface UserProfile {
  id: string;
  name: string;
  photoUrl?: string;
  linkedPlayer?: {
    name: string;
    photo_url?: string;
  };
}

type RoleType = 'player' | 'staff';

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
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [invitedRoleSources, setInvitedRoleSources] = useState<Set<string>>(new Set());
  const { user } = useAuth();
  const { 
    userRoles, 
    hasMultipleRoles, 
    updateAvailability: updateStaffAvailability, 
    getRoleStatus: getStaffRoleStatus 
  } = useStaffAvailability(eventId, user?.id);
  const { updateAvailability: updatePersistentAvailability, getAvailabilityStatus } = useAvailabilityState(eventId);

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  useEffect(() => {
    loadUserProfile();
  }, [user?.id]);

  useEffect(() => {
    loadInvitedRoles();
  }, [eventId, user?.id, userRoles]);

  const loadUserProfile = async () => {
    if (!user?.id) return;

    try {
      // Get user profile information
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id, name')
        .eq('id', user.id)
        .single();

      if (profileError) {
        console.error('Error loading profile:', profileError);
        return;
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
        console.log('QuickControls - Set user profile:', {
          id: profileData.id,
          name: profileData.name,
          hasLinkedPlayer: !!linkedPlayerData
        });
      }
    } catch (error) {
      console.error('Error loading user profile:', error);
    }
  };

  const loadInvitedRoles = async () => {
    if (!user?.id) return;
    try {
      // Fetch all invitations for this event
      const { data: invitations, error } = await supabase
        .from('event_invitations')
        .select('user_id, player_id, staff_id, invitee_type')
        .eq('event_id', eventId);

      if (error) throw error;

      const invited = new Set<string>();

      // Gather linked player and staff IDs for this user
      const [{ data: userPlayers }, { data: userStaff }] = await Promise.all([
        supabase.from('user_players').select('player_id').eq('user_id', user.id),
        supabase.from('user_staff').select('staff_id').eq('user_id', user.id)
      ]);

      const linkedPlayerIds = (userPlayers || []).map((r: any) => r.player_id);
      const linkedStaffIds = (userStaff || []).map((r: any) => r.staff_id);

      // Map invitations to specific role sources only
      (invitations || []).forEach((inv: any) => {
        // Direct user invitation: only count for staff invites
        if (inv.user_id === user.id && inv.invitee_type === 'staff') {
          // Prefer specific staff_id if provided
          if (inv.staff_id && linkedStaffIds.includes(inv.staff_id)) {
            invited.add(`staff:${inv.staff_id}`);
          } else {
            userRoles
              .filter(r => r.role === 'staff')
              .forEach(r => invited.add(`${r.role}:${r.sourceId}`));
          }
        }
        // Player-specific invitations
        if (inv.player_id && linkedPlayerIds.includes(inv.player_id)) {
          invited.add(`player:${inv.player_id}`);
        }
        // Staff-specific invitations
        if (inv.staff_id && linkedStaffIds.includes(inv.staff_id)) {
          invited.add(`staff:${inv.staff_id}`);
        }
      });

      setInvitedRoleSources(invited);
    } catch (error) {
      console.error('Error loading invited role sources:', error);
      setInvitedRoleSources(new Set());
    }
  };

  const handleUpdateAvailability = async (role: 'player' | 'staff', status: 'available' | 'unavailable') => {
    if (!user?.id || isUpdating) return;

    setIsUpdating(true);
    try {
      // Use the appropriate availability update based on user setup
      if (user?.id) {
        await updatePersistentAvailability(eventId, user.id, role, status);
      }
      onStatusChange?.(status);
      toast.success(`${role} availability set to ${status}`);
    } catch (error) {
      console.error('Error updating availability:', error);
      toast.error('Failed to update availability');
    } finally {
      setIsUpdating(false);
    }
  };

  const renderRoleAvailability = (role: 'player' | 'staff', roleLabel: string) => {
    const status = user?.id ? getAvailabilityStatus(eventId, user.id, role) || getStaffRoleStatus(role) : null;
    const buttonSize = size === 'sm' ? 'h-6 w-12 px-2' : 'h-7 w-16 px-3';
    const iconSize = size === 'sm' ? 'h-3 w-3' : 'h-4 w-4';
    const textSize = size === 'sm' ? 'text-xs' : 'text-sm';
    
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

    // Unified toggle button layout for all statuses
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
            <span className={`${textSize} font-medium truncate`}>{displayName}</span>
            <span className="text-xs text-muted-foreground">{roleLabel}</span>
          </div>
        </div>
        <div className="flex gap-1 flex-shrink-0">
          <Button
            size="sm"
            variant={status === 'available' ? 'default' : 'outline'}
            className={`h-6 w-6 p-0 rounded-full ${
              status === 'available' 
                ? 'bg-teal-500 hover:bg-teal-600 text-white border-teal-500' 
                : 'border-muted-foreground/30 text-muted-foreground hover:border-teal-400 hover:text-teal-600 hover:bg-teal-50'
            }`}
            onClick={() => handleUpdateAvailability(role, 'available')}
            disabled={isUpdating}
          >
            <Check className="h-3.5 w-3.5" />
          </Button>
          <Button
            size="sm"
            variant={status === 'unavailable' ? 'default' : 'outline'}
            className={`h-6 w-6 p-0 rounded-full ${
              status === 'unavailable'
                ? 'bg-red-500 hover:bg-red-600 text-white border-red-500'
                : 'border-muted-foreground/30 text-muted-foreground hover:border-red-300 hover:text-red-500 hover:bg-red-50'
            }`}
            onClick={() => handleUpdateAvailability(role, 'unavailable')}
            disabled={isUpdating}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    );

  };

  // If user has multiple roles, show each role separately
  if (hasMultipleRoles) {
    const filteredRoles = userRoles.filter(r => invitedRoleSources.has(`${r.role}:${r.sourceId}`));
    if (filteredRoles.length === 0) return null;
    return (
      <div className="space-y-2">
        {filteredRoles.map((role) => {
          const roleLabel = role.role === 'staff' ? 'Coach' : 'Player';
          return (
            <div key={`${role.role}-${role.sourceId}`}>
              {renderRoleAvailability(role.role, roleLabel)}
            </div>
          );
        })}
      </div>
    );
  }

  // Single role - show with avatar and improved layout
  const singleRoleEntry = userRoles[0];
  if (!singleRoleEntry) return null;
  if (!invitedRoleSources.has(`${singleRoleEntry.role}:${singleRoleEntry.sourceId}`)) return null;
  const singleRole = singleRoleEntry.role;
  const status = user?.id ? (getAvailabilityStatus(eventId, user.id, singleRole) || getStaffRoleStatus(singleRole) || currentStatus) : currentStatus;
  const buttonSize = size === 'sm' ? 'h-6 w-6 p-0' : 'h-7 w-7 p-0';
  const iconSize = size === 'sm' ? 'h-3 w-3' : 'h-4 w-4';
  const textSize = size === 'sm' ? 'text-xs' : 'text-sm';
  
  // For player role, show linked player name and photo if available
  // For staff role, show user profile name with initials only
  let displayName = 'User';
  let photoUrl: string | undefined = undefined;
  
  if (userProfile) {
    if (singleRole === 'player' && userProfile.linkedPlayer) {
      displayName = formatPlayerName(userProfile.linkedPlayer.name, 'firstName');
      photoUrl = userProfile.linkedPlayer.photo_url || undefined;
    } else if (singleRole === 'staff') {
      displayName = formatPlayerName(userProfile.name, 'firstName');
      // No photo for staff role - use initials only
      photoUrl = undefined;
    } else {
      displayName = formatPlayerName(userProfile.name, 'firstName');
    }
  }
  
  const roleLabel = singleRole === 'staff' ? 'Coach' : 'Player';

  // Unified toggle button layout for single role
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
          <span className={`${textSize} font-medium truncate`}>{displayName}</span>
          <span className="text-xs text-muted-foreground">{roleLabel}</span>
        </div>
      </div>
      <div className="flex gap-1 flex-shrink-0">
        <Button
          size="sm"
          variant={status === 'available' ? 'default' : 'outline'}
          className={`h-6 w-6 p-0 rounded-full ${
            status === 'available' 
              ? 'bg-teal-500 hover:bg-teal-600 text-white border-teal-500' 
              : 'border-muted-foreground/30 text-muted-foreground hover:border-teal-400 hover:text-teal-600 hover:bg-teal-50'
          }`}
          onClick={() => handleUpdateAvailability(singleRole, 'available')}
          disabled={isUpdating}
        >
          <Check className="h-3.5 w-3.5" />
        </Button>
        <Button
          size="sm"
          variant={status === 'unavailable' ? 'default' : 'outline'}
          className={`h-6 w-6 p-0 rounded-full ${
            status === 'unavailable'
              ? 'bg-red-500 hover:bg-red-600 text-white border-red-500'
              : 'border-muted-foreground/30 text-muted-foreground hover:border-red-300 hover:text-red-500 hover:bg-red-50'
          }`}
          onClick={() => handleUpdateAvailability(singleRole, 'unavailable')}
          disabled={isUpdating}
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
};
