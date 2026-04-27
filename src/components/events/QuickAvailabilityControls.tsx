
import { logger } from '@/lib/logger';
import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Check, X } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useStaffAvailability } from '@/hooks/useStaffAvailability';
import { formatPlayerName } from '@/utils/nameUtils';
import { useAvailabilityState } from '@/hooks/useAvailabilityState';
import type { UserRole } from '@/services/multiRoleAvailabilityService';

interface UserProfile {
  id: string;
  name: string;
  photoUrl?: string;
  linkedPlayer?: {
    id: string;
    name: string;
    photo_url?: string;
  };
}

interface QuickAvailabilityControlsProps {
  eventId: string;
  currentStatus?: 'pending' | 'available' | 'unavailable' | null;
  size?: 'sm' | 'md';
  onStatusChange?: (status: 'available' | 'unavailable') => void;
  /**
   * When the caller already knows the user has an availability record for
   * this event in one or more roles (e.g. via `event_availability`), pass
   * those roles here to bypass the strict `event_invitations` gate.
   * Used by the Home dashboard to ensure buttons render even if the
   * invitation row is missing.
   */
  assumedRoles?: Array<'player' | 'staff'>;
}

export const QuickAvailabilityControls: React.FC<QuickAvailabilityControlsProps> = ({
  eventId,
  currentStatus,
  size = 'md',
  onStatusChange,
  assumedRoles
}) => {
  const [isUpdating, setIsUpdating] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [invitedRoleSources, setInvitedRoleSources] = useState<Set<string>>(new Set());
  const [cachedPlayerId, setCachedPlayerId] = useState<string | null>(null);
  const { user } = useAuth();
  const { 
    userRoles, 
    hasMultipleRoles, 
    updateAvailability: updateStaffAvailability, 
    getRoleStatus: getStaffRoleStatus 
  } = useStaffAvailability(eventId, user?.id);
  const { 
    updateAvailability: updatePersistentAvailability, 
    getAvailabilityStatusSync,
    loadAvailabilityForEvent 
  } = useAvailabilityState(eventId);

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

  // Sync cachedPlayerId and player name from userRoles (event-specific, from get_user_event_roles RPC).
  // This is more reliable than the loadUserProfile query which can fail for users linked to multiple teams.
  useEffect(() => {
    const playerRole = userRoles.find(r => r.role === 'player');
    if (playerRole?.playerName) {
      setCachedPlayerId(playerRole.sourceId);
      setUserProfile(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          linkedPlayer: {
            id: playerRole.sourceId,
            name: playerRole.playerName!,
            photo_url: prev.linkedPlayer?.photo_url
          }
        };
      });
    }
  }, [userRoles]);

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
        logger.error('Error loading profile:', profileError);
        return;
      }

      // Get linked player information for player role
      let linkedPlayerData = null;
      const { data: playerData, error: playerError } = await supabase
        .from('user_players')
        .select('player_id, players(name, photo_url)')
        .eq('user_id', user.id)
        .maybeSingle();

      if (playerError) {
        logger.log('No player record found for user:', user.id);
      } else if (playerData) {
        // Cache the player_id for availability lookups
        setCachedPlayerId(playerData.player_id);
        if (playerData.players) {
          linkedPlayerData = playerData.players;
          logger.log('Found linked player for user:', user.id, 'player:', linkedPlayerData.name, 'playerId:', playerData.player_id);
        }
      }

      if (profileData) {
        setUserProfile({
          id: profileData.id,
          name: profileData.name,
          photoUrl: undefined, // Will be set per role in rendering
          linkedPlayer: linkedPlayerData
        });
        logger.log('QuickControls - Set user profile:', {
          id: profileData.id,
          name: profileData.name,
          hasLinkedPlayer: !!linkedPlayerData
        });
      }
    } catch (error) {
      logger.error('Error loading user profile:', error);
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
      logger.error('Error loading invited role sources:', error);
      setInvitedRoleSources(new Set());
    }
  };

  const handleUpdateAvailability = async (role: 'player' | 'staff', status: 'available' | 'unavailable') => {
    if (!user?.id || isUpdating) return;

    setIsUpdating(true);
    try {
      // Pass cachedPlayerId so the hook doesn't need to re-query user_players
      // (avoids .maybeSingle() failures for users with multiple team links)
      await updatePersistentAvailability(
        eventId,
        user.id,
        role,
        status,
        role === 'player' ? (cachedPlayerId || undefined) : undefined
      );
      onStatusChange?.(status);
      toast.success(`${role} availability set to ${status}`);
    } catch (error) {
      logger.error('Error updating availability:', error);
      toast.error('Failed to update availability');
    } finally {
      setIsUpdating(false);
    }
  };

  const renderRoleAvailability = (role: 'player' | 'staff', roleLabel: string, roleEntry?: UserRole) => {
    const playerId = role === 'player' ? cachedPlayerId || undefined : undefined;
    const status = getAvailabilityStatusSync(eventId, role, playerId) || getStaffRoleStatus(role) || null;
    const textSize = size === 'sm' ? 'text-xs' : 'text-sm';

    // Prefer names from roleEntry (resolved by get_user_event_roles RPC, event-team-specific)
    // over userProfile (which may fail for multi-team users)
    let displayName = 'User';
    let photoUrl: string | undefined = undefined;

    if (role === 'player') {
      const name = roleEntry?.playerName || userProfile?.linkedPlayer?.name;
      displayName = name ? formatPlayerName(name, 'firstName') : (userProfile ? formatPlayerName(userProfile.name, 'firstName') : 'Player');
      photoUrl = userProfile?.linkedPlayer?.photo_url || undefined;
    } else if (role === 'staff') {
      const name = roleEntry?.staffName || userProfile?.name;
      displayName = name ? formatPlayerName(name, 'firstName') : 'Coach';
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

  // Helper: is this role considered invited (either via event_invitations
  // or via the caller-supplied assumedRoles fallback)?
  const isRoleInvited = (roleEntry: UserRole) => {
    if (invitedRoleSources.has(`${roleEntry.role}:${roleEntry.sourceId}`)) return true;
    if (assumedRoles && assumedRoles.includes(roleEntry.role)) return true;
    return false;
  };

  // Build a resilient role list. If `userRoles` (from get_user_event_roles RPC)
  // is empty but the caller supplied `assumedRoles` (e.g. the Home dashboard
  // already found availability rows for this user/event), synthesize entries
  // so the controls still render. This is the safety net for users whose
  // staff access comes via user_teams without a team_staff link.
  const effectiveRoles: UserRole[] = userRoles.length > 0
    ? userRoles
    : (assumedRoles ?? []).map((r) => ({
        role: r,
        sourceId: r === 'player' ? (cachedPlayerId || user?.id || '') : (user?.id || ''),
        sourceType: r === 'player' ? 'player_link' : 'user_team',
      }));

  // If user has multiple roles, show each role separately
  if (effectiveRoles.length > 1) {
    const filteredRoles = effectiveRoles.filter(isRoleInvited);
    if (filteredRoles.length === 0) return null;
    return (
      <div className="space-y-2">
        {filteredRoles.map((roleEntry) => {
          const roleLabel = roleEntry.role === 'staff' ? 'Coach' : 'Player';
          return (
            <div key={`${roleEntry.role}-${roleEntry.sourceId}`}>
              {renderRoleAvailability(roleEntry.role, roleLabel, roleEntry)}
            </div>
          );
        })}
      </div>
    );
  }

  // Single role - show with avatar and improved layout
  const singleRoleEntry = effectiveRoles[0];
  if (!singleRoleEntry) return null;
  if (!isRoleInvited(singleRoleEntry)) return null;
  const singleRole = singleRoleEntry.role;
  const singlePlayerId = singleRole === 'player' ? cachedPlayerId || undefined : undefined;
  const status = getAvailabilityStatusSync(eventId, singleRole, singlePlayerId) || getStaffRoleStatus(singleRole) || currentStatus;
  const textSize = size === 'sm' ? 'text-xs' : 'text-sm';

  // Prefer names from singleRoleEntry (event-team-specific) over userProfile
  let displayName = 'User';
  let photoUrl: string | undefined = undefined;

  if (singleRole === 'player') {
    const name = singleRoleEntry.playerName || userProfile?.linkedPlayer?.name;
    displayName = name ? formatPlayerName(name, 'firstName') : (userProfile ? formatPlayerName(userProfile.name, 'firstName') : 'Player');
    photoUrl = userProfile?.linkedPlayer?.photo_url || undefined;
  } else if (singleRole === 'staff') {
    const name = singleRoleEntry.staffName || userProfile?.name;
    displayName = name ? formatPlayerName(name, 'firstName') : 'Coach';
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
