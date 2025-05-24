
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Users, Mail, Phone, Award, CheckCircle, Clock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface ClubStaffMember {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: string;
  teamName: string;
  teamId: string;
  pvgChecked: boolean;
  pvgCheckedBy?: string;
  pvgCheckedAt?: string;
  coachingBadges: string[];
  certificates: any[];
}

interface ClubStaffManagementProps {
  clubId: string;
  clubName: string;
}

export const ClubStaffManagement: React.FC<ClubStaffManagementProps> = ({
  clubId,
  clubName
}) => {
  const [staff, setStaff] = useState<ClubStaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    if (clubId) {
      loadClubStaff();
    }
  }, [clubId]);

  const loadClubStaff = async () => {
    try {
      setLoading(true);
      console.log('Loading staff for club:', clubId);

      // Get all teams linked to this club
      const { data: clubTeams, error: clubTeamsError } = await supabase
        .from('club_teams')
        .select(`
          team_id,
          teams!inner(id, name)
        `)
        .eq('club_id', clubId);

      if (clubTeamsError) {
        console.error('Error fetching club teams:', clubTeamsError);
        throw clubTeamsError;
      }

      console.log('Club teams:', clubTeams);

      if (!clubTeams || clubTeams.length === 0) {
        console.log('No teams linked to this club');
        setStaff([]);
        return;
      }

      const teamIds = clubTeams.map(ct => ct.team_id);
      console.log('Team IDs:', teamIds);

      // Get all staff from linked teams
      const { data: teamStaff, error: staffError } = await supabase
        .from('team_staff')
        .select(`
          *,
          teams!inner(id, name)
        `)
        .in('team_id', teamIds);

      if (staffError) {
        console.error('Error fetching team staff:', staffError);
        throw staffError;
      }

      console.log('Team staff data:', teamStaff);

      if (teamStaff && teamStaff.length > 0) {
        const staffMembers: ClubStaffMember[] = teamStaff.map(staff => ({
          id: staff.id,
          name: staff.name || 'Unknown',
          email: staff.email || '',
          phone: staff.phone || '',
          role: staff.role,
          teamName: staff.teams?.name || 'Unknown Team',
          teamId: staff.team_id,
          pvgChecked: staff.pvg_checked || false,
          pvgCheckedBy: staff.pvg_checked_by || '',
          pvgCheckedAt: staff.pvg_checked_at || '',
          coachingBadges: Array.isArray(staff.coaching_badges) 
            ? staff.coaching_badges.filter((badge): badge is string => typeof badge === 'string')
            : [],
          certificates: Array.isArray(staff.certificates) ? staff.certificates : []
        }));

        console.log('Processed staff members:', staffMembers);
        setStaff(staffMembers);
      } else {
        console.log('No staff found in linked teams');
        setStaff([]);
      }
    } catch (error: any) {
      console.error('Error loading club staff:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to load club staff',
        variant: 'destructive',
      });
      setStaff([]);
    } finally {
      setLoading(false);
    }
  };

  const handlePVGCheck = async (staffId: string, checked: boolean) => {
    try {
      setUpdating(staffId);
      console.log('Updating PVG status for staff:', staffId, checked);

      const updateData = {
        pvg_checked: checked,
        pvg_checked_by: checked ? user?.id : null,
        pvg_checked_at: checked ? new Date().toISOString() : null,
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('team_staff')
        .update(updateData)
        .eq('id', staffId);

      if (error) {
        console.error('Error updating PVG status:', error);
        throw error;
      }

      // Reload staff to reflect changes
      await loadClubStaff();

      toast({
        title: 'Success',
        description: `PVG status ${checked ? 'checked' : 'unchecked'} successfully`,
      });
    } catch (error: any) {
      console.error('Error updating PVG status:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to update PVG status',
        variant: 'destructive',
      });
    } finally {
      setUpdating(null);
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'manager': return 'bg-blue-500';
      case 'assistant_manager': return 'bg-purple-500';
      case 'coach': return 'bg-green-500';
      case 'helper': return 'bg-orange-500';
      default: return 'bg-gray-500';
    }
  };

  const formatRoleName = (role: string): string => {
    return role
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p>Loading club staff...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Club Staff Management</h3>
          <p className="text-sm text-muted-foreground">
            All staff across teams linked to {clubName}
          </p>
        </div>
        <div className="text-sm text-muted-foreground">
          {staff.length} staff member{staff.length !== 1 ? 's' : ''}
        </div>
      </div>

      {staff.length === 0 ? (
        <Card className="border-dashed border-2">
          <CardContent className="py-8 text-center">
            <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-semibold mb-2">No Staff Found</h3>
            <p className="text-muted-foreground mb-4">
              No staff members found in teams linked to this club. Make sure teams are linked to this club and have staff assigned.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {staff.map((staffMember) => (
            <Card key={staffMember.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4 flex-1">
                    <Avatar className="h-12 w-12">
                      <AvatarFallback className="bg-puma-blue-100 text-puma-blue-500">
                        {staffMember.name.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-1 space-y-3">
                      <div>
                        <div className="flex items-center gap-3 mb-2">
                          <h4 className="font-semibold text-lg">{staffMember.name}</h4>
                          <Badge className={`text-white ${getRoleColor(staffMember.role)}`}>
                            {formatRoleName(staffMember.role)}
                          </Badge>
                        </div>
                        
                        <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
                          <div className="flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            <span className="font-medium">{staffMember.teamName}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            <span>{staffMember.email}</span>
                          </div>
                          {staffMember.phone && (
                            <div className="flex items-center gap-1">
                              <Phone className="h-3 w-3" />
                              <span>{staffMember.phone}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* PVG Check Section */}
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Checkbox
                              id={`pvg-${staffMember.id}`}
                              checked={staffMember.pvgChecked}
                              onCheckedChange={(checked) => 
                                handlePVGCheck(staffMember.id, checked as boolean)
                              }
                              disabled={updating === staffMember.id}
                            />
                            <label 
                              htmlFor={`pvg-${staffMember.id}`}
                              className="text-sm font-medium cursor-pointer"
                            >
                              PVG Checked
                            </label>
                            {staffMember.pvgChecked && (
                              <CheckCircle className="h-4 w-4 text-green-600" />
                            )}
                          </div>
                          {staffMember.pvgChecked && staffMember.pvgCheckedAt && (
                            <div className="text-xs text-muted-foreground flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              Checked on {formatDate(staffMember.pvgCheckedAt)}
                            </div>
                          )}
                        </div>

                        {/* Coaching Badges Section */}
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Award className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm font-medium">Coaching Badges</span>
                          </div>
                          {staffMember.coachingBadges.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {staffMember.coachingBadges.map((badge, index) => (
                                <Badge key={index} variant="outline" className="text-xs">
                                  {badge}
                                </Badge>
                              ))}
                            </div>
                          ) : (
                            <div className="text-xs text-muted-foreground">
                              No badges recorded
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

const getRoleColor = (role: string) => {
  switch (role) {
    case 'manager': return 'bg-blue-500';
    case 'assistant_manager': return 'bg-purple-500';
    case 'coach': return 'bg-green-500';
    case 'helper': return 'bg-orange-500';
    default: return 'bg-gray-500';
  }
};

const formatRoleName = (role: string): string => {
  return role
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

const formatDate = (dateStr: string) => {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};
