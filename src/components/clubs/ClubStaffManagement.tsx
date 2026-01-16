
import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Users, Search, Shield, CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface StaffMember {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: string;
  teamId: string;
  teamName: string;
  ageGroup: string;
  pvgChecked: boolean;
  pvgCheckedBy?: string;
  pvgCheckedAt?: string;
  userId?: string;
  requiresPvg: boolean;
}

interface ClubStaffManagementProps {
  clubId: string;
  clubName: string;
}

export const ClubStaffManagement: React.FC<ClubStaffManagementProps> = ({
  clubId,
  clubName
}) => {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [filteredStaff, setFilteredStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTeam, setSelectedTeam] = useState<string>('all');
  const [teamSummaries, setTeamSummaries] = useState<Record<string, any>>({});
  const { toast } = useToast();

  useEffect(() => {
    if (clubId) {
      loadClubStaff();
    }
  }, [clubId]);

  useEffect(() => {
    filterStaff();
  }, [staff, searchTerm, selectedTeam]);

  const loadClubStaff = async () => {
    try {
      setLoading(true);
      console.log('Loading staff for club:', clubId);

      // Get all teams linked to this club
      const { data: clubTeams, error: clubTeamsError } = await supabase
        .from('club_teams')
        .select(`
          team_id,
          teams!inner(
            id,
            name,
            age_group
          )
        `)
        .eq('club_id', clubId);

      if (clubTeamsError) throw clubTeamsError;

      if (!clubTeams || clubTeams.length === 0) {
        setStaff([]);
        return;
      }

      const teamIds = clubTeams.map(ct => ct.team_id);
      console.log('Loading staff for teams:', teamIds);

      // Get all staff from team_staff table
      const { data: teamStaffData, error: staffError } = await supabase
        .from('team_staff')
        .select('*')
        .in('team_id', teamIds);

      if (staffError) throw staffError;

      // Get all staff from user_teams table with profile information
      const { data: userTeamsData, error: userTeamsError } = await supabase
        .from('user_teams')
        .select(`
          id,
          user_id,
          team_id,
          role,
          profiles:user_id (
            id,
            name,
            email,
            phone
          )
        `)
        .in('team_id', teamIds);

      if (userTeamsError) throw userTeamsError;

      console.log('Team staff data:', teamStaffData?.length || 0);
      console.log('User teams data:', userTeamsData?.length || 0);

      // Combine both sources - use a Map to avoid duplicates
      const staffMap = new Map<string, any>();

      // Define staff-only roles (excludes parents and players)
      const staffOnlyRoles = ['manager', 'team_manager', 'assistant_manager', 'team_assistant_manager', 'coach', 'team_coach', 'helper', 'admin', 'global_admin', 'club_admin'];
      const pvgRequiredRoles = ['manager', 'team_manager', 'coach', 'team_coach', 'assistant_manager', 'team_assistant_manager'];

      // Add team_staff records first
      teamStaffData?.forEach(member => {
        const teamData = clubTeams.find(ct => ct.team_id === member.team_id)?.teams;
        const requiresPvg = pvgRequiredRoles.includes(member.role);
        
        const key = `${member.user_id || member.email}-${member.team_id}`;
        staffMap.set(key, {
          id: member.id,
          name: member.name,
          email: member.email,
          phone: member.phone,
          role: member.role,
          teamId: member.team_id,
          teamName: teamData?.name || 'Unknown Team',
          ageGroup: teamData?.age_group || 'Unknown',
          pvgChecked: member.pvg_checked || false,
          pvgCheckedBy: member.pvg_checked_by,
          pvgCheckedAt: member.pvg_checked_at,
          userId: member.user_id,
          requiresPvg
        });
      });

      // Add user_teams records if not already in map - filter out parents and players
      userTeamsData?.forEach(ut => {
        const profile = ut.profiles as any;
        const key = `${ut.user_id}-${ut.team_id}`;
        
        // Skip if not a staff role (exclude parents and players)
        if (!staffOnlyRoles.includes(ut.role)) return;
        
        if (!staffMap.has(key) && profile) {
          const teamData = clubTeams.find(ct => ct.team_id === ut.team_id)?.teams;
          const requiresPvg = pvgRequiredRoles.includes(ut.role);
          
          staffMap.set(key, {
            id: ut.id,
            name: profile.name || '',
            email: profile.email || '',
            phone: profile.phone || '',
            role: ut.role,
            teamId: ut.team_id,
            teamName: teamData?.name || 'Unknown Team',
            ageGroup: teamData?.age_group || 'Unknown',
            pvgChecked: false,
            pvgCheckedBy: undefined,
            pvgCheckedAt: undefined,
            userId: ut.user_id,
            requiresPvg
          });
        }
      });

      const staffWithTeams = Array.from(staffMap.values());
      console.log('Combined staff:', staffWithTeams.length);

      // Calculate team summaries - only count staff who require PVG
      const summaries = staffWithTeams.reduce((acc, member) => {
        const teamId = member.teamId;
        if (!acc[teamId]) {
          acc[teamId] = {
            teamName: member.teamName,
            ageGroup: member.ageGroup,
            totalStaff: 0,
            pvgRequiredStaff: 0,
            pvgCheckedCount: 0,
            pvgPendingCount: 0
          };
        }
        
        acc[teamId].totalStaff++;
        
        // Only count PVG for roles that require it
        if (member.requiresPvg) {
          acc[teamId].pvgRequiredStaff++;
          if (member.pvgChecked) {
            acc[teamId].pvgCheckedCount++;
          } else {
            acc[teamId].pvgPendingCount++;
          }
        }
        
        return acc;
      }, {} as Record<string, any>);

      setStaff(staffWithTeams);
      setTeamSummaries(summaries);
    } catch (error: any) {
      console.error('Error loading club staff:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to load club staff',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const filterStaff = () => {
    let filtered = staff;

    if (searchTerm) {
      filtered = filtered.filter(member =>
        member.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        member.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        member.role.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (selectedTeam !== 'all') {
      filtered = filtered.filter(member => member.teamId === selectedTeam);
    }

    setFilteredStaff(filtered);
  };

  const updatePVGStatus = async (staffId: string, checked: boolean) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      // First try to update team_staff table and see if any row was affected
      const { data: updatedRows, error: teamStaffError } = await supabase
        .from('team_staff')
        .update({
          pvg_checked: checked,
          pvg_checked_at: checked ? new Date().toISOString() : null,
          pvg_checked_by: checked ? user?.id : null
        })
        .eq('id', staffId)
        .select('id');

      // Determine if we need to create a team_staff record (e.g., when this person only exists in user_teams)
      const noTeamStaffUpdated = !!teamStaffError || !updatedRows || updatedRows.length === 0;
      const staffMember = staff.find(s => s.id === staffId);

      if (noTeamStaffUpdated) {
        if (staffMember?.userId && staffMember.teamId) {
          // Create a corresponding team_staff record so PVG state is consistently stored and visible to Team Manager views
          const { error: insertError } = await supabase
            .from('team_staff')
            .insert({
              team_id: staffMember.teamId,
              user_id: staffMember.userId,
              name: staffMember.name,
              email: staffMember.email,
              phone: staffMember.phone,
              role: staffMember.role,
              pvg_checked: checked,
              pvg_checked_at: checked ? new Date().toISOString() : null,
              pvg_checked_by: checked ? user?.id : null
            });

          if (insertError) throw insertError;
        } else {
          throw new Error('Unable to update PVG status - staff member not found or missing user ID');
        }
      }


      toast({
        title: 'PVG Status Updated',
        description: `PVG status has been ${checked ? 'verified' : 'unverified'}`,
      });

      loadClubStaff();
    } catch (error: any) {
      console.error('Error updating PVG status:', error);
      toast({
        title: 'Error',
        description: 'Failed to update PVG status',
        variant: 'destructive',
      });
    }
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

  const teams = Array.from(new Set(staff.map(s => ({ id: s.teamId, name: s.teamName }))))
    .filter((team, index, arr) => arr.findIndex(t => t.id === team.id) === index);

  return (
    <div className="space-y-6">
      {/* Team Summaries */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {Object.values(teamSummaries).map((summary: any, index) => (
          <Card key={index}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">{summary.teamName}</CardTitle>
              <CardDescription>{summary.ageGroup}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Total Staff:</span>
                  <span className="font-semibold">{summary.totalStaff}</span>
                </div>
                <div className="flex justify-between">
                  <span>PVG Checked:</span>
                  <span className="text-green-600 font-semibold">{summary.pvgCheckedCount}</span>
                </div>
                <div className="flex justify-between">
                  <span>Pending PVG:</span>
                  <span className="text-orange-600 font-semibold">{summary.totalStaff - summary.pvgCheckedCount}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Staff Management - {clubName}</CardTitle>
          <CardDescription>
            Manage staff from all linked teams with PVG tracking. Only Managers and Coaches require PVG verification.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search staff by name, email, or role..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={selectedTeam} onValueChange={setSelectedTeam}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filter by team" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Teams</SelectItem>
                {teams.map((team) => (
                  <SelectItem key={team.id} value={team.id}>
                    {team.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Staff List */}
          {filteredStaff.length === 0 ? (
            <div className="text-center py-8">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-semibold mb-2">No Staff Found</h3>
              <p className="text-muted-foreground">
                {staff.length === 0 
                  ? "No teams are linked to this club yet."
                  : "No staff match your current filters."
                }
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredStaff.map((member) => (
                <Card key={member.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          {member.pvgChecked ? (
                            <CheckCircle className="h-5 w-5 text-green-600" />
                          ) : (
                            <Shield className="h-5 w-5 text-orange-500" />
                          )}
                        </div>
                        <div>
                          <h4 className="font-semibold">{member.name}</h4>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <span>{member.email}</span>
                            {member.phone && (
                              <>
                                <span>•</span>
                                <span>{member.phone}</span>
                              </>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                            <span>{member.teamName}</span>
                            <span>•</span>
                            <Badge variant="outline" className="capitalize">
                              {member.role}
                            </Badge>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        {member.requiresPvg ? (
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id={`pvg-${member.id}`}
                              checked={member.pvgChecked}
                              onCheckedChange={(checked) => 
                                updatePVGStatus(member.id, checked as boolean)
                              }
                            />
                            <label 
                              htmlFor={`pvg-${member.id}`} 
                              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                            >
                              PVG Verified
                            </label>
                          </div>
                        ) : (
                          <div className="flex items-center space-x-2">
                            <div className="text-xs text-muted-foreground bg-gray-100 px-2 py-1 rounded">
                              PVG Not Required
                            </div>
                          </div>
                        )}
                        {member.pvgCheckedAt && member.requiresPvg && (
                          <div className="text-xs text-muted-foreground">
                            Verified: {new Date(member.pvgCheckedAt).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
