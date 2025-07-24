
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Check, X, Clock } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useStaffAvailability } from '@/hooks/useStaffAvailability';
import { formatPlayerName } from '@/utils/nameUtils';

interface UserProfile {
  id: string;
  name: string;
  photoUrl?: string;
}

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
  const { user } = useAuth();
  const { 
    userRoles, 
    hasMultipleRoles, 
    updateAvailability, 
    getRoleStatus 
  } = useStaffAvailability(eventId, user?.id);

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

      // Try to get photo from player records - get the specific player for this user
      let photoUrl: string | null = null;
      
      // Check if user is linked to a player
      const { data: playerData, error: playerError } = await supabase
        .from('user_players')
        .select('players(photo_url)')
        .eq('user_id', user.id)
        .single();

      if (playerError) {
        console.log('No player record found for user:', user.id);
      }

      if (playerData?.players?.photo_url) {
        photoUrl = playerData.players.photo_url;
        console.log('Found player photo for user:', user.id, 'photo:', photoUrl.substring(0, 50));
      }

      if (profileData) {
        setUserProfile({
          id: profileData.id,
          name: profileData.name,
          photoUrl: photoUrl || undefined
        });
        console.log('QuickControls - Set user profile:', {
          id: profileData.id,
          name: profileData.name,
          hasPhoto: !!photoUrl
        });
      }
    } catch (error) {
      console.error('Error loading user profile:', error);
    }
  };

  const handleUpdateAvailability = async (role: 'player' | 'staff', status: 'available' | 'unavailable') => {
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

  const renderRoleAvailability = (role: 'player' | 'staff', roleLabel: string) => {
    const status = getRoleStatus(role);
    const buttonSize = size === 'sm' ? 'h-6 w-12 px-2' : 'h-7 w-16 px-3';
    const iconSize = size === 'sm' ? 'h-3 w-3' : 'h-4 w-4';
    const textSize = size === 'sm' ? 'text-xs' : 'text-sm';
    const displayName = userProfile ? formatPlayerName(userProfile.name, 'firstName') : 'User';

    // Show initial accept/decline buttons for pending or no status
    if (!status || status === 'pending') {
      return (
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 flex-1">
            <Avatar className="h-8 w-8">
              {userProfile?.photoUrl && (
                <AvatarImage src={userProfile.photoUrl} alt={displayName} />
              )}
              <AvatarFallback className="text-xs">
                {userProfile ? getInitials(userProfile.name) : 'U'}
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
              {userProfile?.photoUrl && (
                <AvatarImage src={userProfile.photoUrl} alt={displayName} />
              )}
              <AvatarFallback className="text-xs">
                {userProfile ? getInitials(userProfile.name) : 'U'}
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
              {userProfile?.photoUrl && (
                <AvatarImage src={userProfile.photoUrl} alt={displayName} />
              )}
              <AvatarFallback className="text-xs">
                {userProfile ? getInitials(userProfile.name) : 'U'}
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
    return (
      <div className="space-y-2">
        {userRoles.map((role) => {
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
  const status = getRoleStatus(singleRole) || currentStatus;
  const buttonSize = size === 'sm' ? 'h-6 w-6 p-0' : 'h-7 w-7 p-0';
  const iconSize = size === 'sm' ? 'h-3 w-3' : 'h-4 w-4';
  const textSize = size === 'sm' ? 'text-xs' : 'text-sm';
  const displayName = userProfile ? formatPlayerName(userProfile.name, 'firstName') : 'User';
  const roleLabel = singleRole === 'staff' ? 'Coach' : 'Player';

  // Show initial accept/decline buttons for pending or no status
  if (!status || status === 'pending') {
    return (
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 flex-1">
          <Avatar className="h-8 w-8">
            {userProfile?.photoUrl && (
              <AvatarImage src={userProfile.photoUrl} alt={displayName} />
            )}
            <AvatarFallback className="text-xs">
              {userProfile ? getInitials(userProfile.name) : 'U'}
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
            {userProfile?.photoUrl && (
              <AvatarImage src={userProfile.photoUrl} alt={displayName} />
            )}
            <AvatarFallback className="text-xs">
              {userProfile ? getInitials(userProfile.name) : 'U'}
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
            {userProfile?.photoUrl && (
              <AvatarImage src={userProfile.photoUrl} alt={displayName} />
            )}
            <AvatarFallback className="text-xs">
              {userProfile ? getInitials(userProfile.name) : 'U'}
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
