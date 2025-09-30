import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
      
      // Use the new consolidated function to get all staff
      const { data: consolidatedStaff, error } = await supabase
        .rpc('get_consolidated_team_staff', { p_team_id: teamId });

      if (error) throw error;

      // Transform and deduplicate staff data
      const staffMap = new Map<string, StaffMember>();
      
      (consolidatedStaff || []).forEach((staff: any) => {
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

      setStaff(Array.from(staffMap.values()));
    } catch (error) {
      console.error('Error loading team staff:', error);
      toast.error('Failed to load staff data');
    } finally {
      setLoading(false);
    }
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
        console.error('Error loading availability for staff:', staffMember.name, error);
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
          console.error('Error creating staff availability record:', error);
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
      console.error('Error sending notification:', error);
      toast.error('Failed to send notification');
    }
  };

  const getAvailabilityIcon = (status?: string) => {
    switch (status) {
      case 'available':
        return <Check className="h-4 w-4 text-green-600" />;
      case 'unavailable':
        return <X className="h-4 w-4 text-red-600" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-600" />;
      case 'no_account':
        return <AlertCircle className="h-4 w-4 text-orange-600" />;
      default:
        return <Clock className="h-4 w-4 text-gray-400" />;
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
    // Handle special role mappings
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
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Staff Assignment
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">Loading staff...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Staff Assignment
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Select staff members for this event and track their availability
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {staff.length === 0 ? (
          <div className="text-center py-4 text-muted-foreground">
            No staff members found for this team.
          </div>
        ) : (
          <div className="space-y-3">
            {staff.map((staffMember) => (
              <div key={staffMember.id} className={`flex items-center justify-between p-3 border rounded-lg ${
                staffMember.availabilityStatus === 'available' && selectedStaff.includes(staffMember.id) 
                  ? 'bg-green-50 border-green-200' 
                  : ''
              }`}>
                <div className="flex items-center gap-3">
                  <Checkbox
                    id={`staff-${staffMember.id}`}
                    checked={selectedStaff.includes(staffMember.id)}
                    onCheckedChange={() => handleStaffToggle(staffMember.id)}
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <label 
                        htmlFor={`staff-${staffMember.id}`} 
                        className="font-medium cursor-pointer"
                      >
                        {formatPlayerName(staffMember.name, 'firstName')}
                      </label>
                      <Badge variant="outline" className="text-xs">
                        {formatRole(staffMember.role)}
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {staffMember.email}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {/* Availability Status */}
                  <div className="flex items-center gap-2">
                    {getAvailabilityIcon(staffMember.availabilityStatus)}
                    <span className="text-sm">
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
                      >
                        Send Reminder
                      </Button>
                    )
                  ) : (
                    <Badge variant="outline" className="text-orange-600">
                      Not Linked
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {staff.some(s => !s.isLinked) && (
          <div className="mt-4 p-3 bg-orange-50 border border-orange-200 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-orange-600 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-orange-800">Some staff members need account linking</p>
                <p className="text-orange-700">
                  Staff members without linked accounts won't receive availability notifications. 
                  Use the "Manage Staff Links" feature to link them.
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};