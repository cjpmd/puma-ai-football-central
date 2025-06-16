
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Users } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface StaffMember {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface StaffSelectionSectionProps {
  teamId: string;
  eventId: string;
  periods: any[];
  teamNumber: number;
}

export const StaffSelectionSection: React.FC<StaffSelectionSectionProps> = ({
  teamId,
  eventId,
  periods,
  teamNumber
}) => {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [selectedStaff, setSelectedStaff] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTeamStaff();
    loadSelectedStaff();
  }, [teamId, eventId]);

  const loadTeamStaff = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('team_staff')
        .select('*')
        .eq('team_id', teamId);

      if (error) throw error;

      const transformedStaff: StaffMember[] = (data || []).map(staff => ({
        id: staff.id,
        name: staff.name,
        email: staff.email,
        role: staff.role
      }));

      setStaff(transformedStaff);
    } catch (error) {
      console.error('Error loading team staff:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadSelectedStaff = async () => {
    try {
      const { data, error } = await supabase
        .from('event_selections')
        .select('staff_selection')
        .eq('event_id', eventId)
        .eq('team_id', teamId);

      if (error) throw error;

      if (data && data.length > 0) {
        const staffSelection = data[0].staff_selection;
        if (Array.isArray(staffSelection)) {
          const staffIds = staffSelection.map((staff: any) => staff.staffId).filter(Boolean);
          setSelectedStaff(staffIds);
        }
      }
    } catch (error) {
      console.error('Error loading selected staff:', error);
    }
  };

  const handleStaffToggle = async (staffId: string) => {
    const newSelectedStaff = selectedStaff.includes(staffId)
      ? selectedStaff.filter(id => id !== staffId)
      : [...selectedStaff, staffId];
    
    setSelectedStaff(newSelectedStaff);

    // Update the database
    try {
      const staffSelection = newSelectedStaff.map(id => ({ staffId: id }));
      
      await supabase
        .from('event_selections')
        .upsert(
          {
            event_id: eventId,
            team_id: teamId,
            period_number: 1, // Default to period 1 for staff
            staff_selection: staffSelection,
            player_positions: [],
            formation: '1-4-4-2',
            duration_minutes: 90
          },
          { onConflict: 'event_id, team_id, period_number' }
        );
    } catch (error) {
      console.error('Error updating staff selection:', error);
      // Revert the state change on error
      setSelectedStaff(selectedStaff);
    }
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
            {staff.map((staffMember) => (
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
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {staffMember.role.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
