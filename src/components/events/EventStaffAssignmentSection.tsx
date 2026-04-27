import { logger } from '@/lib/logger';
import React, { useState, useEffect } from 'react';
// Card primitives no longer needed (glass surface uses .ios-card)
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Users, Check, X, Clock, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { multiRoleAvailabilityService } from '@/services/multiRoleAvailabilityService';
import { toast } from 'sonner';
import { formatPlayerName } from '@/utils/nameUtils';

interface StaffMember {
  id: string;
  name: string;
  email: string;
  role: string;
  isLinked: boolean;
  linkedUserId?: string;
  availabilityStatus?: 'pending' | 'available' | 'unavailable' | 'no_account';
}

interface EventStaffAssignmentSectionProps {
  eventId: string;
  teamId: string;
  selectedStaff: string[];
  onStaffChange: (staffIds: string[]) => void;
  refreshToken?: number;
}

export const EventStaffAssignmentSection: React.FC<EventStaffAssignmentSectionProps> = ({
  eventId,
  teamId,
  selectedStaff,
  onStaffChange,
  refreshToken
}) => {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);

useEffect(() => {
  loadTeamStaff();
}, [teamId, refreshToken]);

useEffect(() => {
  if (eventId && staff.length > 0) {
    loadStaffAvailability();
  }
}, [eventId, staff, selectedStaff, refreshToken]);

  const loadTeamStaff = async () => {
    try {
      setLoading(true);
      
      // If eventId is provided, only load staff who were invited to the event
      let staffToLoad: StaffMember[] = [];
      
      if (eventId) {
        // Get invited staff IDs from event_invitations
        const { data: invitations, error: invError } = await supabase
          .from('event_invitations')
          .select('staff_id')
          .eq('event_id', eventId)
          .eq('invitee_type', 'staff')
          .not('staff_id', 'is', null);
        
        if (invError) {
          logger.error('Error loading event invitations:', invError);
          throw invError;
        }
        
        const invitedStaffIds = invitations?.map(inv => inv.staff_id).filter(Boolean) || [];
        
        if (invitedStaffIds.length === 0) {
          // No staff invitations found - check if it's an "everyone" event
          const { data: anyInvitations } = await supabase
            .from('event_invitations')
            .select('id')
            .eq('event_id', eventId)
            .limit(1);
          
          // If no invitations exist at all, it's an "everyone" event - load all staff
          if (!anyInvitations || anyInvitations.length === 0) {
            logger.log('No invitations found - loading all team staff (everyone invited)');
            const { data: consolidatedStaff, error } = await supabase
              .rpc('get_consolidated_team_staff', { p_team_id: teamId });
            if (error) throw error;
            staffToLoad = transformStaffData(consolidatedStaff || []);
          } else {
            // Invitations exist but none for staff
            logger.log('Event has invitations but no staff invited');
            staffToLoad = [];
          }
        } else {
          // Load only invited staff from team_staff table
          const { data: teamStaff, error: staffError } = await supabase
            .from('team_staff')
            .select('id, name, email, role')
            .in('id', invitedStaffIds);
          
          if (staffError) throw staffError;
          
          // Get user IDs for linked staff via user_staff
          const { data: userStaff } = await supabase
            .from('user_staff')
            .select('user_id, staff_id')
            .in('staff_id', invitedStaffIds);
          
          const userStaffMap = new Map(userStaff?.map(us => [us.staff_id, us.user_id]) || []);

          // Also treat membership in user_teams (with profile email) as a valid link.
          // This covers staff who were granted team roles directly (e.g., team_manager)
          // without an explicit user_staff link row.
          const { data: userTeamsRows } = await supabase
            .from('user_teams')
            .select('user_id')
            .eq('team_id', teamId);

          const userTeamUserIds = (userTeamsRows || [])
            .map((r: any) => r.user_id)
            .filter(Boolean);

          const emailToUserMap = new Map<string, string>();
          if (userTeamUserIds.length > 0) {
            const { data: profileRows } = await supabase
              .from('profiles')
              .select('id, email')
              .in('id', userTeamUserIds);
            (profileRows || []).forEach((p: any) => {
              if (p?.email && p?.id) {
                emailToUserMap.set(String(p.email).toLowerCase(), p.id);
              }
            });
          }

          staffToLoad = (teamStaff || []).map(staff => {
            const directUserId = userStaffMap.get(staff.id);
            const emailKey = (staff.email || '').toLowerCase();
            const fallbackUserId = emailKey ? emailToUserMap.get(emailKey) : undefined;
            const linkedUserId = directUserId ?? fallbackUserId;
            return {
              id: staff.id,
              name: staff.name,
              email: staff.email,
              role: staff.role,
              isLinked: Boolean(linkedUserId),
              linkedUserId
            };
          });
        }
      } else {
        // No eventId - load all team staff
        const { data: consolidatedStaff, error } = await supabase
          .rpc('get_consolidated_team_staff', { p_team_id: teamId });
        if (error) throw error;
        staffToLoad = transformStaffData(consolidatedStaff || []);
      }

      setStaff(staffToLoad);
    } catch (error) {
      logger.error('Error loading team staff:', error);
      toast.error('Failed to load staff data');
    } finally {
      setLoading(false);
    }
  };

  const transformStaffData = (consolidatedStaff: any[]): StaffMember[] => {
    const staffMap = new Map<string, StaffMember>();
    
    consolidatedStaff.forEach((staff: any) => {
      const key = staff.email || staff.user_id || staff.id;
      
      // If we already have this person, prefer team_staff records over user_teams
      if (staffMap.has(key)) {
        const existing = staffMap.get(key)!;
        // Prefer team_staff source or better role priority
        if (staff.source_type === 'team_staff' || 
            getRolePriority(staff.role) < getRolePriority(existing.role)) {
          staffMap.set(key, {
            id: staff.id,
            name: staff.name,
            email: staff.email,
            role: staff.role,
            isLinked: staff.is_linked,
            linkedUserId: staff.user_id
          });
        }
      } else {
        staffMap.set(key, {
          id: staff.id,
          name: staff.name,
          email: staff.email,
          role: staff.role,
          isLinked: staff.is_linked,
          linkedUserId: staff.user_id
        });
      }
    });

    return Array.from(staffMap.values());
  };

  // Helper function to determine role priority for deduplication
  const getRolePriority = (role: string): number => {
    const priorities: { [key: string]: number } = {
      'manager': 1,
      'team_manager': 2, 
      'assistant_manager': 3,
      'team_assistant_manager': 4,
      'coach': 5,
      'team_coach': 6,
      'staff': 7,
      'helper': 8,
      'team_helper': 9
    };
    return priorities[role] || 10;
  };

  const loadStaffAvailability = async () => {
    const updatedStaff = [...staff];
    
    for (let i = 0; i < updatedStaff.length; i++) {
      const staffMember = updatedStaff[i];
      
      if (!staffMember.isLinked || !staffMember.linkedUserId) {
        updatedStaff[i] = { ...staffMember, availabilityStatus: 'no_account' };
        continue;
      }

      try {
        const statuses = await multiRoleAvailabilityService.getUserAvailabilityStatuses(
          eventId, 
          staffMember.linkedUserId
        );
        const staffStatus = statuses.find(s => s.role === 'staff');
        updatedStaff[i] = { 
          ...staffMember, 
          availabilityStatus: staffStatus?.status || 'pending' 
        };
      } catch (error) {
        logger.error('Error loading availability for staff:', staffMember.name, error);
        updatedStaff[i] = { ...staffMember, availabilityStatus: 'pending' };
      }
    }
    
    setStaff(updatedStaff);
  };

  const handleStaffToggle = async (staffId: string) => {
    const newSelectedStaff = selectedStaff.includes(staffId)
      ? selectedStaff.filter(id => id !== staffId)
      : [...selectedStaff, staffId];
    
    onStaffChange(newSelectedStaff);

    // Only create availability record for newly selected staff if they don't have one or it's not already responded to
    if (eventId && !selectedStaff.includes(staffId)) {
      const staffMember = staff.find(s => s.id === staffId);
      if (staffMember?.linkedUserId) {
        try {
          // Check if the staff member already has an availability record
          const { data: existingAvailability, error: checkError } = await supabase
            .from('event_availability')
            .select('status')
            .eq('event_id', eventId)
            .eq('user_id', staffMember.linkedUserId)
            .eq('role', 'staff')
            .maybeSingle();

          if (checkError) throw checkError;

          // Only create a new record if none exists
          if (!existingAvailability) {
            await multiRoleAvailabilityService.createStaffAvailabilityRecord(
              eventId, 
              staffMember.linkedUserId, 
              'staff'
            );
            
            // Refresh availability status
            await loadStaffAvailability();
            toast.success(`Availability request sent to ${staffMember.name}`);
          } else {
            // Just refresh to show current status
            await loadStaffAvailability();
          }
        } catch (error) {
          logger.error('Error creating staff availability record:', error);
        }
      }
    }
  };

  const sendAvailabilityNotification = async (staffMember: StaffMember) => {
    if (!staffMember.linkedUserId) return;
    
    try {
      // Create availability record if it doesn't exist
      await multiRoleAvailabilityService.createStaffAvailabilityRecord(
        eventId,
        staffMember.linkedUserId,
        'staff'
      );
      
      // Here you could call an edge function to send email notification
      toast.success(`Availability notification sent to ${staffMember.name}`);
      await loadStaffAvailability();
    } catch (error) {
      logger.error('Error sending notification:', error);
      toast.error('Failed to send notification');
    }
  };

  const getAvailabilityIcon = (status?: string) => {
    switch (status) {
      case 'available':
        return <Check className="h-4 w-4 text-emerald-400" />;
      case 'unavailable':
        return <X className="h-4 w-4 text-red-400" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-amber-400" />;
      case 'no_account':
        return <AlertCircle className="h-4 w-4 text-orange-400" />;
      default:
        return <Clock className="h-4 w-4 text-white/40" />;
    }
  };

  const getAvailabilityLabel = (status?: string) => {
    switch (status) {
      case 'available':
        return 'Available';
      case 'unavailable':
        return 'Unavailable';
      case 'pending':
        return 'Pending';
      case 'no_account':
        return 'No linked account';
      default:
        return 'Unknown';
    }
  };

  const formatRole = (role: string) => {
    const roleMap: { [key: string]: string } = {
      'team_manager': 'Manager',
      'manager': 'Manager',
      'team_assistant_manager': 'Assistant Manager', 
      'assistant_manager': 'Assistant Manager',
      'team_coach': 'Coach',
      'coach': 'Coach',
      'team_helper': 'Helper',
      'helper': 'Helper',
      'staff': 'Staff'
    };
    
    return roleMap[role] || role.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  if (loading) {
    return (
      <div className="ios-card p-4 text-center text-white/80">Loading staff...</div>
    );
  }

  return (
    <div className="ios-card p-3 sm:p-4 text-white">
      <div className="flex items-center gap-2 mb-1">
        <Users className="h-4 w-4" />
        <h3 className="text-sm font-semibold uppercase tracking-wider">Staff Assignment</h3>
      </div>
      <p className="text-xs text-white/60 mb-3">
        Select staff members for this event and track their availability
      </p>
      <div className="space-y-3 overflow-x-hidden">
        {staff.length === 0 ? (
          <div className="text-center py-4 text-white/60 text-sm">
            No staff members found for this team.
          </div>
        ) : (
          <div className="space-y-2">
            {staff.map((staffMember) => (
              <div key={staffMember.id} className={`flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 rounded-xl border gap-2 ${
                staffMember.availabilityStatus === 'available' && selectedStaff.includes(staffMember.id) 
                  ? 'bg-emerald-500/[0.08] border-emerald-300/25' 
                  : 'bg-white/5 border-white/10'
              }`}>
                <div className="flex items-center gap-3 min-w-0">
                  <Checkbox
                    id={`staff-${staffMember.id}`}
                    checked={selectedStaff.includes(staffMember.id)}
                    onCheckedChange={() => handleStaffToggle(staffMember.id)}
                    className="shrink-0 border-white/30 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <label 
                        htmlFor={`staff-${staffMember.id}`} 
                        className="font-medium cursor-pointer truncate text-white text-sm"
                      >
                        {formatPlayerName(staffMember.name, 'firstName')}
                      </label>
                      <Badge className="text-[10px] px-1.5 h-4 shrink-0 bg-white/10 border-white/15 text-white/85 hover:bg-white/10">
                        {formatRole(staffMember.role)}
                      </Badge>
                    </div>
                    <div className="text-xs text-white/55 truncate">
                      {staffMember.email}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 sm:gap-3 flex-wrap sm:flex-nowrap sm:shrink-0 ml-7 sm:ml-0">
                  {/* Availability Status */}
                  <div className="flex items-center gap-1 sm:gap-2">
                    {getAvailabilityIcon(staffMember.availabilityStatus)}
                    <span className="text-xs text-white/80">
                      {getAvailabilityLabel(staffMember.availabilityStatus)}
                    </span>
                  </div>

                  {/* Action Button */}
                  {staffMember.isLinked ? (
                    selectedStaff.includes(staffMember.id) && 
                    staffMember.availabilityStatus === 'pending' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => sendAvailabilityNotification(staffMember)}
                        className="text-xs px-2 bg-white/5 border-white/15 text-white hover:bg-white/10"
                      >
                        Remind
                      </Button>
                    )
                  ) : (
                    <Badge className="text-[10px] px-1.5 h-4 bg-orange-500/15 border-orange-300/30 text-orange-200 hover:bg-orange-500/15">
                      Not Linked
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {staff.some(s => !s.isLinked) && (
          <div className="mt-2 p-3 rounded-xl bg-orange-500/[0.08] border border-orange-300/25">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-orange-300 mt-0.5 shrink-0" />
              <div className="text-xs">
                <p className="font-medium text-orange-100">Some staff members need account linking</p>
                <p className="text-orange-200/80">
                  Staff members without linked accounts won't receive availability notifications. 
                  Use the "Manage Staff Links" feature to link them.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};