
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
  const [invitedRoles, setInvitedRoles] = useState<Set<RoleType>>(new Set());
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
  }, [eventId, user?.id]);

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
      const roles = await multiRoleAvailabilityService.getInvitedRolesForUser(eventId, user.id);
      setInvitedRoles(new Set(roles));
    } catch (error) {
      console.error('Error loading invited roles:', error);
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

    // Show initial accept/decline buttons for pending or no status
    if (!status || status === 'pending') {
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
        </div>
      );
    }

    // Show status with change option for available status
    if (status === 'available') {
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
            <div className="flex items-center gap-1 text-green-600">
              <Check className={iconSize} />
              <span className={textSize}>Going</span>
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
        </div>
      );
    }

    // Show status with change option for unavailable status
    if (status === 'unavailable') {
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
            <div className="flex items-center gap-1 text-red-600">
              <X className={iconSize} />
              <span className={textSize}>Not Going</span>
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
        </div>
      );
    }

    return null;
  };

  // If user has multiple roles, show each role separately
  if (hasMultipleRoles) {
    const filteredRoles = userRoles.filter(r => invitedRoles.has(r.role as RoleType));
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
  const singleRole = userRoles[0]?.role || 'player';
  if (!invitedRoles.has(singleRole as RoleType)) return null;
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

  // Show initial accept/decline buttons for pending or no status
  if (!status || status === 'pending') {
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
      </div>
    );
  }

  // Show status with change option for available
  if (status === 'available') {
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
          <div className="flex items-center gap-1 text-green-600">
            <Check className={iconSize} />
            <span className={textSize}>Going</span>
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
      </div>
    );
  }

  // Show status with change option for unavailable
  if (status === 'unavailable') {
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
          <div className="flex items-center gap-1 text-red-600">
            <X className={iconSize} />
            <span className={textSize}>Not Going</span>
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
      </div>
    );
  }

  return null;
};
