import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Check, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { multiRoleAvailabilityService } from '@/services/multiRoleAvailabilityService';
import { formatPlayerName } from '@/utils/nameUtils';

interface StaffMember {
  id: string;
  name: string;
  role: string;
  userId?: string;
  photoUrl?: string;
  availabilityStatus?: 'pending' | 'available' | 'unavailable';
}

interface StaffAvailabilityControlsProps {
  eventId: string;
  teamId: string;
  size?: 'sm' | 'md';
}

export const StaffAvailabilityControls: React.FC<StaffAvailabilityControlsProps> = ({
  eventId,
  teamId,
  size = 'md'
}) => {
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<Set<string>>(new Set());
  const { user } = useAuth();

  const buttonSize = size === 'sm' ? 'h-6 px-2' : 'h-7 px-3';
  const iconSize = size === 'sm' ? 'h-3 w-3' : 'h-4 w-4';
  const textSize = size === 'sm' ? 'text-xs' : 'text-sm';

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  useEffect(() => {
    loadStaffMembers();
  }, [eventId, teamId]);

  const loadStaffMembers = async () => {
    try {
      // Get team staff members
      const { data: teamStaff, error: staffError } = await supabase
        .from('team_staff')
        .select(`
          id,
          name,
          role,
          user_staff!inner(user_id)
        `)
        .eq('team_id', teamId);

      if (staffError) throw staffError;

      // Get availability for each staff member
      const staffWithAvailability = await Promise.all(
        (teamStaff || []).map(async (staff) => {
          const userId = staff.user_staff?.[0]?.user_id;
          let availabilityStatus: 'pending' | 'available' | 'unavailable' = 'pending';

          if (userId) {
            try {
              const { data: availability } = await supabase
                .from('event_availability')
                .select('status')
                .eq('event_id', eventId)
                .eq('user_id', userId)
                .eq('role', 'staff')
                .maybeSingle();

              if (availability) {
                availabilityStatus = availability.status as 'pending' | 'available' | 'unavailable';
              }
            } catch (error) {
              console.error('Error loading availability for staff:', staff.name, error);
            }
          }

          return {
            id: staff.id,
            name: staff.name,
            role: staff.role,
            userId,
            photoUrl: undefined, // team_staff table doesn't have photo_url
            availabilityStatus
          };
        })
      );

      setStaffMembers(staffWithAvailability);
    } catch (error) {
      console.error('Error loading staff members:', error);
      toast.error('Failed to load staff members');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateAvailability = async (
    staffMember: StaffMember, 
    status: 'available' | 'unavailable'
  ) => {
    if (!staffMember.userId || updating.has(staffMember.id)) return;

    setUpdating(prev => new Set([...prev, staffMember.id]));

    try {
      await multiRoleAvailabilityService.updateRoleAvailability(
        eventId,
        staffMember.userId,
        'staff',
        status
      );

      // Update local state
      setStaffMembers(prev => prev.map(staff => 
        staff.id === staffMember.id 
          ? { ...staff, availabilityStatus: status }
          : staff
      ));

      toast.success(`${staffMember.name} availability set to ${status}`);
    } catch (error) {
      console.error('Error updating availability:', error);
      toast.error(`Failed to update ${staffMember.name}'s availability`);
    } finally {
      setUpdating(prev => {
        const next = new Set(prev);
        next.delete(staffMember.id);
        return next;
      });
    }
  };

  const renderStaffAvailability = (staffMember: StaffMember) => {
    const isUpdating = updating.has(staffMember.id);
    const status = staffMember.availabilityStatus;
    const displayName = formatPlayerName(staffMember.name, 'firstName');

    // If staff member doesn't have a linked user account, show info message
    if (!staffMember.userId) {
      return (
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 flex-1">
            <Avatar className="h-8 w-8">
              {staffMember.photoUrl && (
                <AvatarImage src={staffMember.photoUrl} alt={displayName} />
              )}
              <AvatarFallback className="text-xs">
                {getInitials(staffMember.name)}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col">
              <span className={`${textSize} font-medium`}>{displayName}</span>
              <span className={`text-xs text-muted-foreground`}>
                {staffMember.role.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
              </span>
            </div>
          </div>
          <span className={`${textSize} text-muted-foreground italic`}>
            Account not linked
          </span>
        </div>
      );
    }

    // Show initial accept/decline buttons for pending status
    if (status === 'pending') {
      return (
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 flex-1">
            <Avatar className="h-8 w-8">
              {staffMember.photoUrl && (
                <AvatarImage src={staffMember.photoUrl} alt={displayName} />
              )}
              <AvatarFallback className="text-xs">
                {getInitials(staffMember.name)}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col">
              <span className={`${textSize} font-medium`}>{displayName}</span>
              <span className={`text-xs text-muted-foreground`}>
                {staffMember.role.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
              </span>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              className={`bg-green-600 hover:bg-green-700 text-white ${buttonSize}`}
              onClick={() => handleUpdateAvailability(staffMember, 'available')}
              disabled={isUpdating}
              title={`Mark ${staffMember.name} as available`}
            >
              <Check className={iconSize} />
              {size === 'md' && <span className="ml-1">Accept</span>}
            </Button>
            <Button
              size="sm"
              className={`bg-red-600 hover:bg-red-700 text-white ${buttonSize}`}
              onClick={() => handleUpdateAvailability(staffMember, 'unavailable')}
              disabled={isUpdating}
              title={`Mark ${staffMember.name} as unavailable`}
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
            {staffMember.photoUrl && (
              <AvatarImage src={staffMember.photoUrl} alt={displayName} />
            )}
            <AvatarFallback className="text-xs">
              {getInitials(staffMember.name)}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col">
            <span className={`${textSize} font-medium`}>{displayName}</span>
            <span className={`text-xs text-muted-foreground`}>
              {staffMember.role.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
            </span>
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
              staffMember, 
              status === 'available' ? 'unavailable' : 'available'
            )}
            disabled={isUpdating}
            title={`Change ${staffMember.name} to ${status === 'available' ? 'unavailable' : 'available'}`}
          >
            {status === 'available' ? <X className={iconSize} /> : <Check className={iconSize} />}
          </Button>
        </div>
      </div>
    );
  };

  if (loading) {
    return <div className={`${textSize} text-muted-foreground`}>Loading staff...</div>;
  }

  if (staffMembers.length === 0) {
    return <div className={`${textSize} text-muted-foreground`}>No staff members found</div>;
  }

  return (
    <div className="space-y-2">
      <div className={`${textSize} font-medium text-muted-foreground mb-1`}>
        Staff Availability
      </div>
      {staffMembers.map((staffMember) => (
        <div key={staffMember.id}>
          {renderStaffAvailability(staffMember)}
        </div>
      ))}
    </div>
  );
};