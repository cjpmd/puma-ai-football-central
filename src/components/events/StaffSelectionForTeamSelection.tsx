
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/integrations/supabase/client';
import { Users, UserCheck, User } from 'lucide-react';
import { toast } from 'sonner';

interface StaffMember {
  id: string;
  name: string;
  role: string;
  email?: string;
  phone?: string;
  isSelected: boolean;
  isUser: boolean; // whether this is a user account or team_staff record
}

interface StaffSelectionProps {
  teamId: string;
  eventId?: string;
  selectedStaff: string[];
  onSelectionChange: (staffIds: string[]) => void;
}

export const StaffSelectionForTeamSelection = ({ 
  teamId, 
  eventId, 
  selectedStaff, 
  onSelectionChange 
}: StaffSelectionProps) => {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (teamId) {
      loadTeamStaff();
    }
  }, [teamId]);

  const loadTeamStaff = async () => {
    try {
      setLoading(true);
      console.log('Loading staff for team:', teamId);
      
      // Get regular team staff
      const { data: teamStaffData, error: teamStaffError } = await supabase
        .from('team_staff')
        .select('*')
        .eq('team_id', teamId);

      if (teamStaffError) {
        console.error('Error fetching team staff:', teamStaffError);
        throw teamStaffError;
      }

      // Get users assigned to this team with staff roles
      const { data: userTeamsData, error: userTeamsError } = await supabase
        .from('user_teams')
        .select(`
          *,
          profiles!inner(
            id,
            name,
            email,
            phone
          )
        `)
        .eq('team_id', teamId)
        .in('role', ['team_manager', 'team_assistant_manager', 'team_coach', 'team_helper']);

      if (userTeamsError) {
        console.error('Error fetching user teams:', userTeamsError);
        throw userTeamsError;
      }

      // Combine both data sources
      const staffMembers: StaffMember[] = [];

      // Add regular team staff
      if (teamStaffData) {
        teamStaffData.forEach(staff => {
          staffMembers.push({
            id: staff.id,
            name: staff.name || 'Unknown',
            role: staff.role,
            email: staff.email,
            phone: staff.phone,
            isSelected: selectedStaff.includes(staff.id),
            isUser: false
          });
        });
      }

      // Add users with team staff roles
      if (userTeamsData) {
        userTeamsData.forEach(userTeam => {
          const profile = userTeam.profiles;
          if (profile) {
            staffMembers.push({
              id: profile.id, // Use profile ID for user accounts
              name: profile.name || 'Unknown',
              role: userTeam.role,
              email: profile.email,
              phone: profile.phone,
              isSelected: selectedStaff.includes(profile.id),
              isUser: true
            });
          }
        });
      }

      console.log('Loaded staff members:', staffMembers);
      setStaff(staffMembers);
    } catch (error: any) {
      console.error('Error in loadTeamStaff:', error);
      toast.error('Failed to load team staff', {
        description: error.message
      });
      setStaff([]);
    } finally {
      setLoading(false);
    }
  };

  const handleStaffSelection = (staffId: string, selected: boolean) => {
    const updatedSelection = selected
      ? [...selectedStaff, staffId]
      : selectedStaff.filter(id => id !== staffId);
    
    onSelectionChange(updatedSelection);
    
    // Update local state
    setStaff(prev => prev.map(s => 
      s.id === staffId ? { ...s, isSelected: selected } : s
    ));
  };

  const selectAllStaff = () => {
    const allStaffIds = staff.map(s => s.id);
    onSelectionChange(allStaffIds);
    setStaff(prev => prev.map(s => ({ ...s, isSelected: true })));
  };

  const clearAllStaff = () => {
    onSelectionChange([]);
    setStaff(prev => prev.map(s => ({ ...s, isSelected: false })));
  };

  const formatRoleName = (role: string): string => {
    return role
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'manager':
      case 'team_manager':
        return 'bg-blue-500';
      case 'assistant_manager':
      case 'team_assistant_manager':
        return 'bg-purple-500';
      case 'coach':
      case 'team_coach':
        return 'bg-green-500';
      case 'helper':
      case 'team_helper':
        return 'bg-orange-500';
      default:
        return 'bg-gray-500';
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900"></div>
            <span className="ml-2">Loading staff...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Staff Selection ({selectedStaff.length} selected)
          </CardTitle>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={selectAllStaff}
              disabled={staff.length === 0}
            >
              <UserCheck className="h-4 w-4 mr-1" />
              Select All
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={clearAllStaff}
              disabled={selectedStaff.length === 0}
            >
              Clear All
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {staff.length > 0 ? (
          <div className="space-y-3">
            {staff.map((member) => (
              <div
                key={member.id}
                className={`p-3 border rounded-lg transition-colors ${
                  member.isSelected ? 'bg-blue-50 border-blue-200' : 'hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Checkbox
                      checked={member.isSelected}
                      onCheckedChange={(checked) => 
                        handleStaffSelection(member.id, checked as boolean)
                      }
                    />
                    <div className="flex items-center gap-2">
                      {member.isUser ? (
                        <User className="h-4 w-4 text-blue-500" />
                      ) : (
                        <Users className="h-4 w-4 text-gray-500" />
                      )}
                      <div>
                        <p className="font-medium">{member.name}</p>
                        {member.email && (
                          <p className="text-xs text-muted-foreground">{member.email}</p>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={`text-white text-xs ${getRoleColor(member.role)}`}>
                      {formatRoleName(member.role)}
                    </Badge>
                    {member.isUser && (
                      <Badge variant="secondary" className="text-xs">
                        User Account
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <h3 className="font-semibold mb-2">No Staff Available</h3>
            <p className="text-sm">
              Add staff members to the team to include them in event selections.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
