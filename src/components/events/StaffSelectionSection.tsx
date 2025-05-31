
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
  selectedStaff: string[];
  onStaffChange: (staffIds: string[]) => void;
  staffAssignments?: Record<string, string[]>;
}

export const StaffSelectionSection: React.FC<StaffSelectionSectionProps> = ({
  teamId,
  selectedStaff,
  onStaffChange,
  staffAssignments = {}
}) => {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTeamStaff();
  }, [teamId]);

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

  const handleStaffToggle = (staffId: string) => {
    const newSelectedStaff = selectedStaff.includes(staffId)
      ? selectedStaff.filter(id => id !== staffId)
      : [...selectedStaff, staffId];
    onStaffChange(newSelectedStaff);
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
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {staffMember.role.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
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
