
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Users, Check, X, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { multiRoleAvailabilityService } from '@/services/multiRoleAvailabilityService';

interface StaffMember {
  id: string;
  name: string;
  email: string;
  role: string;
  user_id?: string;
}

interface StaffSelectionSectionProps {
  teamId: string;
  eventId?: string;
  selectedStaff: string[];
  onStaffChange: (staffIds: string[]) => void;
  staffAssignments?: Record<string, string[]>;
}

export const StaffSelectionSection: React.FC<StaffSelectionSectionProps> = ({
  teamId,
  eventId,
  selectedStaff,
  onStaffChange,
  staffAssignments = {}
}) => {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [staffAvailability, setStaffAvailability] = useState<Record<string, string>>({});

  useEffect(() => {
    loadTeamStaff();
  }, [teamId]);

  useEffect(() => {
    if (eventId && staff.length > 0) {
      loadStaffAvailability();
    }
  }, [eventId, staff]);

  const loadTeamStaff = async () => {
    try {
      setLoading(true);
      // Get staff with their linked user accounts (left join to include all staff)
      const { data, error } = await supabase
        .from('team_staff')
        .select(`
          id,
          name,
          email,
          role,
          user_staff(user_id)
        `)
        .eq('team_id', teamId);

      if (error) throw error;

      const transformedStaff: StaffMember[] = (data || []).map(staff => ({
        id: staff.id,
        name: staff.name,
        email: staff.email,
        role: staff.role,
        user_id: staff.user_staff?.[0]?.user_id
      }));

      setStaff(transformedStaff);
    } catch (error) {
      console.error('Error loading team staff:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStaffAvailability = async () => {
    if (!eventId) return;

    const availability: Record<string, string> = {};
    
    for (const staffMember of staff) {
      if (staffMember.user_id) {
        try {
          const statuses = await multiRoleAvailabilityService.getUserAvailabilityStatuses(eventId, staffMember.user_id);
          const staffStatus = statuses.find(s => s.role === 'staff');
          availability[staffMember.id] = staffStatus?.status || 'pending';
        } catch (error) {
          console.error('Error loading availability for staff:', staffMember.name, error);
          availability[staffMember.id] = 'pending';
        }
      } else {
        availability[staffMember.id] = 'no_account';
      }
    }
    
    setStaffAvailability(availability);
  };

  const handleStaffToggle = async (staffId: string) => {
    const newSelectedStaff = selectedStaff.includes(staffId)
      ? selectedStaff.filter(id => id !== staffId)
      : [...selectedStaff, staffId];
    
    onStaffChange(newSelectedStaff);

    // Create availability records for newly selected staff
    if (eventId && !selectedStaff.includes(staffId)) {
      const staffMember = staff.find(s => s.id === staffId);
      if (staffMember?.user_id) {
        try {
          await multiRoleAvailabilityService.createStaffAvailabilityRecord(
            eventId, 
            staffMember.user_id, 
            'staff'
          );
          await loadStaffAvailability();
        } catch (error) {
          console.error('Error creating staff availability record:', error);
        }
      }
    }
  };

  const getAvailabilityIcon = (status: string) => {
    switch (status) {
      case 'available':
        return <Check className="h-4 w-4 text-green-600" />;
      case 'unavailable':
        return <X className="h-4 w-4 text-red-600" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-600" />;
      case 'no_account':
        return null;
      default:
        return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  const getAvailabilityLabel = (status: string) => {
    switch (status) {
      case 'available':
        return 'Available';
      case 'unavailable':
        return 'Unavailable';
      case 'pending':
        return 'Pending';
      case 'no_account':
        return 'No account';
      default:
        return 'Unknown';
    }
  };

  const getAssignedTeams = (staffId: string): string[] => {
    return staffAssignments[staffId] || [];
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Staff Selection
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
          Staff Selection
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {staff.length === 0 ? (
          <div className="text-center py-4 text-muted-foreground">
            No staff members found for this team.
          </div>
        ) : (
          <div className="space-y-3">
            {staff.map((staffMember) => {
              const assignedTeams = getAssignedTeams(staffMember.id);
              return (
                <div key={staffMember.id} className="flex items-center space-x-3 p-3 border rounded">
                  <Checkbox
                    id={`staff-${staffMember.id}`}
                    checked={selectedStaff.includes(staffMember.id)}
                    onCheckedChange={() => handleStaffToggle(staffMember.id)}
                  />
                   <div className="flex-1">
                     <div className="flex items-center gap-2">
                       <Label htmlFor={`staff-${staffMember.id}`} className="font-medium cursor-pointer">
                         {staffMember.name}
                       </Label>
                       {assignedTeams.length > 0 && (
                         <div className="flex gap-1">
                           {assignedTeams.map((teamId, index) => (
                             <Badge key={teamId} variant="outline" className="text-xs">
                               Team {index + 1}
                             </Badge>
                           ))}
                         </div>
                       )}
                       {eventId && (
                         <div className="flex items-center gap-1">
                           {getAvailabilityIcon(staffAvailability[staffMember.id])}
                           <span className="text-xs text-muted-foreground">
                             {getAvailabilityLabel(staffAvailability[staffMember.id])}
                           </span>
                         </div>
                       )}
                     </div>
                     <div className="text-sm text-muted-foreground">
                       {staffMember.role.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                       {!staffMember.user_id && eventId && (
                         <span className="ml-2 text-orange-600">(No linked account)</span>
                       )}
                     </div>
                   </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
