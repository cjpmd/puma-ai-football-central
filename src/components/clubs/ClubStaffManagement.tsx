
import { logger } from '@/lib/logger';
import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Users, Search, Shield, CheckCircle, Plus, Building2, MoreVertical, UserPlus, ArrowRightLeft, PauseCircle, PlayCircle, UserX, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { ClubStaffInviteModal } from './ClubStaffInviteModal';

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
  suspended: boolean;
}

interface ClubStaff {
  id: string;
  userId: string;
  name: string;
  email: string;
  role: string;
}

interface ClubTeam {
  id: string;
  name: string;
  ageGroup: string;
}

interface ClubStaffManagementProps {
  clubId: string;
  clubName: string;
}

const PVG_REQUIRED_ROLES = ['manager', 'team_manager', 'coach', 'team_coach', 'assistant_manager', 'team_assistant_manager'];
const STAFF_ONLY_ROLES = ['manager', 'team_manager', 'assistant_manager', 'team_assistant_manager', 'coach', 'team_coach', 'helper', 'admin', 'global_admin', 'club_admin'];

export const ClubStaffManagement: React.FC<ClubStaffManagementProps> = ({
  clubId,
  clubName
}) => {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [clubStaff, setClubStaff] = useState<ClubStaff[]>([]);
  const [filteredStaff, setFilteredStaff] = useState<StaffMember[]>([]);
  const [clubTeams, setClubTeams] = useState<ClubTeam[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTeam, setSelectedTeam] = useState<string>('all');
  const [teamSummaries, setTeamSummaries] = useState<Record<string, any>>({});
  const [showInviteModal, setShowInviteModal] = useState(false);

  // Dialog state
  const [assignDialog, setAssignDialog] = useState<{ open: boolean; member: StaffMember | null; mode: 'assign' | 'transfer' }>({ open: false, member: null, mode: 'assign' });
  const [assignTargetTeamId, setAssignTargetTeamId] = useState('');
  const [removeDialog, setRemoveDialog] = useState<{ open: boolean; member: StaffMember | null }>({ open: false, member: null });
  const [actionLoading, setActionLoading] = useState(false);

  const { toast } = useToast();

  useEffect(() => {
    if (clubId) {
      loadClubStaff();
      loadClubLevelStaff();
    }
  }, [clubId]);

  useEffect(() => {
    filterStaff();
  }, [staff, searchTerm, selectedTeam]);

  const loadClubStaff = async () => {
    try {
      setLoading(true);
      logger.log('Loading staff for club:', clubId);

      // Use club_id as source of truth (same fix as club-team display)
      const { data: teamsData, error: teamsError } = await supabase
        .from('teams')
        .select('id, name, age_group')
        .eq('club_id', clubId);

      if (teamsError) throw teamsError;

      if (!teamsData || teamsData.length === 0) {
        setStaff([]);
        setClubTeams([]);
        return;
      }

      setClubTeams(teamsData.map(t => ({ id: t.id, name: t.name, ageGroup: t.age_group || '' })));
      const teamIds = teamsData.map(t => t.id);
      logger.log('Loading staff for teams:', teamIds);

      // Get all staff from team_staff table (including suspended)
      const { data: teamStaffData, error: staffError } = await supabase
        .from('team_staff')
        .select('*')
        .in('team_id', teamIds);

      if (staffError) throw staffError;

      // Get all users with staff roles on these teams
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

      logger.log('Team staff data:', teamStaffData?.length ?? 0);
      logger.log('User teams data:', userTeamsData?.length ?? 0);

      const staffMap = new Map<string, StaffMember>();

      // Add team_staff records first
      teamStaffData?.forEach(member => {
        const teamData = teamsData.find(t => t.id === member.team_id);
        const requiresPvg = PVG_REQUIRED_ROLES.includes(member.role);
        const key = `${member.user_id || member.email}-${member.team_id}`;
        staffMap.set(key, {
          id: member.id,
          name: member.name,
          email: member.email,
          phone: member.phone ?? undefined,
          role: member.role,
          teamId: member.team_id,
          teamName: teamData?.name ?? 'Unknown Team',
          ageGroup: teamData?.age_group ?? 'Unknown',
          pvgChecked: member.pvg_checked ?? false,
          pvgCheckedBy: member.pvg_checked_by ?? undefined,
          pvgCheckedAt: member.pvg_checked_at ?? undefined,
          userId: member.user_id ?? undefined,
          requiresPvg,
          suspended: member.suspended ?? false,
        });
      });

      // Merge user_teams records that aren't already in the map
      userTeamsData?.forEach(ut => {
        if (!STAFF_ONLY_ROLES.includes(ut.role)) return;
        const profile = ut.profiles as any;
        const key = `${ut.user_id}-${ut.team_id}`;
        if (!staffMap.has(key) && profile) {
          const teamData = teamsData.find(t => t.id === ut.team_id);
          const requiresPvg = PVG_REQUIRED_ROLES.includes(ut.role);
          staffMap.set(key, {
            id: ut.id,
            name: profile.name ?? '',
            email: profile.email ?? '',
            phone: profile.phone ?? undefined,
            role: ut.role,
            teamId: ut.team_id,
            teamName: teamData?.name ?? 'Unknown Team',
            ageGroup: teamData?.age_group ?? 'Unknown',
            pvgChecked: false,
            userId: ut.user_id,
            requiresPvg,
            suspended: false,
          });
        }
      });

      const staffWithTeams = Array.from(staffMap.values());
      logger.log('Combined staff:', staffWithTeams.length);

      const summaries = staffWithTeams.reduce((acc, member) => {
        if (member.suspended) return acc;
        const tid = member.teamId;
        if (!acc[tid]) {
          acc[tid] = { teamName: member.teamName, ageGroup: member.ageGroup, totalStaff: 0, pvgCheckedCount: 0 };
        }
        acc[tid].totalStaff++;
        if (member.requiresPvg && member.pvgChecked) acc[tid].pvgCheckedCount++;
        return acc;
      }, {} as Record<string, any>);

      setStaff(staffWithTeams);
      setTeamSummaries(summaries);
    } catch (error: any) {
      logger.error('Error loading club staff:', error);
      toast({ title: 'Error', description: error.message || 'Failed to load club staff', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const loadClubLevelStaff = async () => {
    try {
      const { data, error } = await supabase
        .from('user_clubs')
        .select(`
          id,
          user_id,
          role,
          profiles:user_id (
            id,
            name,
            email
          )
        `)
        .eq('club_id', clubId);

      if (error) throw error;

      setClubStaff(
        data?.map((uc: any) => ({
          id: uc.id,
          userId: uc.user_id,
          name: uc.profiles?.name ?? '',
          email: uc.profiles?.email ?? '',
          role: uc.role,
        })) ?? []
      );
    } catch (error: any) {
      logger.error('Error loading club-level staff:', error);
    }
  };

  const filterStaff = () => {
    let filtered = staff;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(m =>
        m.name.toLowerCase().includes(term) ||
        m.email.toLowerCase().includes(term) ||
        m.role.toLowerCase().includes(term)
      );
    }
    if (selectedTeam !== 'all') {
      filtered = filtered.filter(m => m.teamId === selectedTeam);
    }
    setFilteredStaff(filtered);
  };

  const updatePVGStatus = async (staffId: string, checked: boolean) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: updatedRows, error: teamStaffError } = await supabase
        .from('team_staff')
        .update({
          pvg_checked: checked,
          pvg_checked_at: checked ? new Date().toISOString() : null,
          pvg_checked_by: checked ? user?.id : null,
        })
        .eq('id', staffId)
        .select('id');

      if (teamStaffError || !updatedRows?.length) {
        const member = staff.find(s => s.id === staffId);
        if (member?.userId && member.teamId) {
          const { error: insertError } = await supabase
            .from('team_staff')
            .insert({
              team_id: member.teamId,
              user_id: member.userId,
              name: member.name,
              email: member.email,
              phone: member.phone,
              role: member.role,
              pvg_checked: checked,
              pvg_checked_at: checked ? new Date().toISOString() : null,
              pvg_checked_by: checked ? user?.id : null,
            });
          if (insertError) throw insertError;
        } else {
          throw teamStaffError ?? new Error('Staff member not found');
        }
      }

      toast({ title: 'PVG Status Updated', description: `PVG ${checked ? 'verified' : 'unverified'}` });
      loadClubStaff();
    } catch (error: any) {
      logger.error('Error updating PVG status:', error);
      toast({ title: 'Error', description: 'Failed to update PVG status', variant: 'destructive' });
    }
  };

  const toggleSuspend = async (member: StaffMember) => {
    try {
      const newSuspended = !member.suspended;
      const { error } = await supabase
        .from('team_staff')
        .update({ suspended: newSuspended })
        .eq('id', member.id);
      if (error) throw error;
      toast({
        title: newSuspended ? 'Staff Suspended' : 'Staff Reinstated',
        description: `${member.name} has been ${newSuspended ? 'suspended' : 'reinstated'}.`,
      });
      loadClubStaff();
    } catch (error: any) {
      logger.error('Error toggling suspend:', error);
      toast({ title: 'Error', description: 'Failed to update suspension status', variant: 'destructive' });
    }
  };

  const openAssignDialog = (member: StaffMember, mode: 'assign' | 'transfer') => {
    setAssignDialog({ open: true, member, mode });
    setAssignTargetTeamId('');
  };

  const handleAssignOrTransfer = async () => {
    const { member, mode } = assignDialog;
    if (!member || !assignTargetTeamId) return;
    setActionLoading(true);
    try {
      if (mode === 'transfer') {
        // Move: update team_id on existing team_staff row
        const { error } = await supabase
          .from('team_staff')
          .update({ team_id: assignTargetTeamId })
          .eq('id', member.id);
        if (error) throw error;
      } else {
        // Assign: insert a new team_staff row for the additional team
        const { error } = await supabase
          .from('team_staff')
          .insert({
            team_id: assignTargetTeamId,
            user_id: member.userId,
            name: member.name,
            email: member.email,
            phone: member.phone,
            role: member.role,
            pvg_checked: member.pvgChecked,
            pvg_checked_at: member.pvgCheckedAt,
            pvg_checked_by: member.pvgCheckedBy,
            suspended: false,
          });
        if (error) throw error;
      }

      const targetTeam = clubTeams.find(t => t.id === assignTargetTeamId);
      toast({
        title: mode === 'transfer' ? 'Staff Transferred' : 'Staff Assigned',
        description: `${member.name} has been ${mode === 'transfer' ? 'transferred to' : 'assigned to'} ${targetTeam?.name ?? 'team'}.`,
      });
      setAssignDialog({ open: false, member: null, mode: 'assign' });
      loadClubStaff();
    } catch (error: any) {
      logger.error('Error in assign/transfer:', error);
      toast({ title: 'Error', description: error.message || 'Failed to update team assignment', variant: 'destructive' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleRemoveFromClub = async () => {
    const { member } = removeDialog;
    if (!member) return;
    setActionLoading(true);
    try {
      // Find all team_staff rows for this person across club teams
      const clubTeamIds = clubTeams.map(t => t.id);
      const identifier = member.userId
        ? { column: 'user_id', value: member.userId }
        : { column: 'email', value: member.email };

      const { error } = await supabase
        .from('team_staff')
        .delete()
        .in('team_id', clubTeamIds)
        .eq(identifier.column, identifier.value);

      if (error) throw error;

      // Also remove from user_teams if they have an account
      if (member.userId) {
        const { error: utError } = await supabase
          .from('user_teams')
          .delete()
          .in('team_id', clubTeamIds)
          .eq('user_id', member.userId);
        if (utError) logger.warn('Could not remove from user_teams:', utError);
      }

      toast({ title: 'Staff Removed', description: `${member.name} has been removed from all club teams.` });
      setRemoveDialog({ open: false, member: null });
      loadClubStaff();
    } catch (error: any) {
      logger.error('Error removing staff from club:', error);
      toast({ title: 'Error', description: error.message || 'Failed to remove staff', variant: 'destructive' });
    } finally {
      setActionLoading(false);
    }
  };

  const updateClubRole = async (staffId: string, newRole: string) => {
    try {
      const { error } = await supabase.from('user_clubs').update({ role: newRole }).eq('id', staffId);
      if (error) throw error;
      toast({ title: 'Role Updated', description: 'Staff role has been updated' });
      loadClubLevelStaff();
    } catch (error: any) {
      toast({ title: 'Error', description: 'Failed to update role', variant: 'destructive' });
    }
  };

  const removeClubStaff = async (staffId: string) => {
    try {
      const { error } = await supabase.from('user_clubs').delete().eq('id', staffId);
      if (error) throw error;
      toast({ title: 'Staff Removed', description: 'Staff member has been removed from the club' });
      loadClubLevelStaff();
    } catch (error: any) {
      toast({ title: 'Error', description: 'Failed to remove staff', variant: 'destructive' });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-4" />
          <p className="text-sm text-muted-foreground">Loading club staff...</p>
        </div>
      </div>
    );
  }

  const teamsForFilter = clubTeams;
  const teamsForAssign = (member: StaffMember, mode: 'assign' | 'transfer') =>
    mode === 'transfer'
      ? clubTeams.filter(t => t.id !== member.teamId)
      : clubTeams.filter(t => t.id !== member.teamId && !staff.some(s => s.teamId === t.id && (s.userId === member.userId || s.email === member.email)));

  const removeDialogTeams = removeDialog.member
    ? staff.filter(s => (s.userId ? s.userId === removeDialog.member!.userId : s.email === removeDialog.member!.email)).map(s => s.teamName)
    : [];

  return (
    <div className="space-y-4">
      {/* Club-level staff */}
      <Card className="border-purple-200 dark:border-purple-800">
        <CardHeader className="pb-2 p-3 sm:p-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                <Building2 className="h-5 w-5 text-purple-600" />
                Club Staff
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm">Staff with club-wide permissions</CardDescription>
            </div>
            <Button size="sm" onClick={() => setShowInviteModal(true)} className="bg-purple-700 hover:bg-purple-800">
              <Plus className="h-4 w-4 mr-1" />
              Add
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-3 sm:p-4 pt-0">
          {clubStaff.length === 0 ? (
            <div className="text-center py-4 text-muted-foreground text-sm">No club-level staff configured</div>
          ) : (
            <div className="space-y-2">
              {clubStaff.map(member => (
                <div key={member.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-sm truncate">{member.name}</div>
                    <div className="text-xs text-muted-foreground truncate">{member.email}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Select value={member.role} onValueChange={role => updateClubRole(member.id, role)}>
                      <SelectTrigger className="w-28 h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="club_admin">Admin</SelectItem>
                        <SelectItem value="club_chair">Chair</SelectItem>
                        <SelectItem value="club_secretary">Secretary</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-destructive" onClick={() => removeClubStaff(member.id)}>
                      <UserX className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Team summaries */}
      {Object.keys(teamSummaries).length > 0 && (
        <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {Object.values(teamSummaries).map((summary: any, index) => (
            <Card key={index}>
              <CardHeader className="pb-2 p-3 sm:p-4">
                <CardTitle className="text-sm font-medium truncate">{summary.teamName}</CardTitle>
                <CardDescription className="text-xs">{summary.ageGroup}</CardDescription>
              </CardHeader>
              <CardContent className="p-3 sm:p-4 pt-0">
                <div className="grid grid-cols-3 gap-2 text-xs sm:text-sm">
                  <div className="text-center">
                    <div className="font-semibold">{summary.totalStaff}</div>
                    <div className="text-muted-foreground text-xs">Staff</div>
                  </div>
                  <div className="text-center">
                    <div className="font-semibold text-green-600">{summary.pvgCheckedCount}</div>
                    <div className="text-muted-foreground text-xs">PVG ✓</div>
                  </div>
                  <div className="text-center">
                    <div className="font-semibold text-orange-600">{summary.totalStaff - summary.pvgCheckedCount}</div>
                    <div className="text-muted-foreground text-xs">Pending</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Staff list with management actions */}
      <Card>
        <CardHeader className="pb-2 p-3 sm:p-4">
          <CardTitle className="text-base sm:text-lg">Staff Management — {clubName}</CardTitle>
          <CardDescription className="text-xs sm:text-sm">Managers and Coaches require PVG verification.</CardDescription>
        </CardHeader>
        <CardContent className="p-3 sm:p-4 pt-0">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 mb-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search staff..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={selectedTeam} onValueChange={setSelectedTeam}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Filter by team" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Teams</SelectItem>
                {teamsForFilter.map(team => (
                  <SelectItem key={team.id} value={team.id}>{team.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {filteredStaff.length === 0 ? (
            <div className="text-center py-6">
              <Users className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <h3 className="font-semibold mb-1 text-sm">No Staff Found</h3>
              <p className="text-muted-foreground text-xs">
                {staff.length === 0 ? 'No teams are linked to this club yet.' : 'No staff match your current filters.'}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredStaff.map(member => (
                <div
                  key={`${member.id}-${member.teamId}`}
                  className={`flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 p-3 border rounded-lg transition-colors ${
                    member.suspended
                      ? 'border-orange-300 bg-orange-50 dark:border-orange-800 dark:bg-orange-950/30 opacity-75'
                      : 'hover:bg-muted/50'
                  }`}
                >
                  {/* Staff Info */}
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className="flex-shrink-0 mt-0.5">
                      {member.suspended ? (
                        <PauseCircle className="h-5 w-5 text-orange-500" />
                      ) : member.pvgChecked ? (
                        <CheckCircle className="h-5 w-5 text-green-600" />
                      ) : (
                        <Shield className="h-5 w-5 text-orange-500" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-medium text-sm truncate">{member.name}</h4>
                        {member.suspended && (
                          <Badge variant="outline" className="text-orange-600 border-orange-400 text-xs h-5">Suspended</Badge>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground truncate">{member.email}</div>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span className="text-xs text-muted-foreground">{member.teamName}</span>
                        <Badge variant="outline" className="capitalize text-xs h-5">{member.role}</Badge>
                      </div>
                    </div>
                  </div>

                  {/* PVG + Actions */}
                  <div className="flex items-center justify-between sm:justify-end gap-3 flex-shrink-0 pl-8 sm:pl-0">
                    {/* PVG */}
                    {!member.suspended && (
                      member.requiresPvg ? (
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id={`pvg-${member.id}`}
                            checked={member.pvgChecked}
                            onCheckedChange={checked => updatePVGStatus(member.id, checked as boolean)}
                          />
                          <label htmlFor={`pvg-${member.id}`} className="text-xs font-medium leading-none cursor-pointer">
                            PVG Verified
                          </label>
                        </div>
                      ) : (
                        <div className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">PVG Not Required</div>
                      )
                    )}

                    {/* Actions dropdown */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {!member.suspended && (
                          <>
                            <DropdownMenuItem onClick={() => openAssignDialog(member, 'assign')}>
                              <UserPlus className="h-4 w-4 mr-2" />
                              Assign to Team
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openAssignDialog(member, 'transfer')}>
                              <ArrowRightLeft className="h-4 w-4 mr-2" />
                              Transfer to Team
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                          </>
                        )}
                        <DropdownMenuItem onClick={() => toggleSuspend(member)}>
                          {member.suspended ? (
                            <><PlayCircle className="h-4 w-4 mr-2 text-green-600" />Reinstate</>
                          ) : (
                            <><PauseCircle className="h-4 w-4 mr-2 text-orange-500" />Suspend</>
                          )}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={() => setRemoveDialog({ open: true, member })}
                        >
                          <UserX className="h-4 w-4 mr-2" />
                          Remove from Club
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Assign / Transfer dialog */}
      <Dialog open={assignDialog.open} onOpenChange={open => setAssignDialog(d => ({ ...d, open }))}>
        <DialogContent className="sm:max-w-[380px]">
          <DialogHeader>
            <DialogTitle>{assignDialog.mode === 'transfer' ? 'Transfer to Team' : 'Assign to Additional Team'}</DialogTitle>
            <DialogDescription>
              {assignDialog.mode === 'transfer'
                ? `Move ${assignDialog.member?.name} to a different team.`
                : `Add ${assignDialog.member?.name} to an additional team within ${clubName}.`}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Select value={assignTargetTeamId} onValueChange={setAssignTargetTeamId}>
              <SelectTrigger>
                <SelectValue placeholder="Select target team..." />
              </SelectTrigger>
              <SelectContent>
                {assignDialog.member && teamsForAssign(assignDialog.member, assignDialog.mode).map(team => (
                  <SelectItem key={team.id} value={team.id}>{team.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignDialog({ open: false, member: null, mode: 'assign' })}>
              Cancel
            </Button>
            <Button
              onClick={handleAssignOrTransfer}
              disabled={!assignTargetTeamId || actionLoading}
              className="bg-purple-700 hover:bg-purple-800"
            >
              {actionLoading ? 'Saving...' : assignDialog.mode === 'transfer' ? 'Transfer' : 'Assign'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remove from Club confirmation dialog */}
      <Dialog open={removeDialog.open} onOpenChange={open => setRemoveDialog(d => ({ ...d, open }))}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Remove from Club
            </DialogTitle>
            <DialogDescription>
              This will remove <strong>{removeDialog.member?.name}</strong> from all club teams. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          {removeDialogTeams.length > 0 && (
            <div className="py-2">
              <p className="text-sm font-medium mb-2">Will be removed from:</p>
              <ul className="text-sm text-muted-foreground space-y-1">
                {removeDialogTeams.map((teamName, i) => (
                  <li key={i} className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-destructive flex-shrink-0" />
                    {teamName}
                  </li>
                ))}
              </ul>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setRemoveDialog({ open: false, member: null })}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleRemoveFromClub} disabled={actionLoading}>
              {actionLoading ? 'Removing...' : 'Remove from Club'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Invite Modal */}
      <ClubStaffInviteModal
        isOpen={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        clubId={clubId}
        clubName={clubName}
        onInviteSent={loadClubLevelStaff}
      />
    </div>
  );
};
