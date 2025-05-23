import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { PlusCircle, User, UserPlus, X } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Team, Club, UserRole } from '@/types';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface StaffMember {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

const StaffManagement = () => {
  const { teams, clubs, refreshUserData } = useAuth();
  const [selectedTeam, setSelectedTeam] = useState<string>('');
  const [selectedClub, setSelectedClub] = useState<string>('');
  const [isAddStaffDialogOpen, setIsAddStaffDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'teams' | 'clubs'>('teams');
  const [teamStaff, setTeamStaff] = useState<StaffMember[]>([]);
  const [clubStaff, setClubStaff] = useState<StaffMember[]>([]);
  const [formData, setFormData] = useState({
    email: '',
    role: '' as UserRole
  });

  // Team roles that can be assigned
  const teamRoles: UserRole[] = [
    'team_manager', 
    'team_assistant_manager', 
    'team_coach', 
    'team_helper'
  ];

  // Club roles that can be assigned
  const clubRoles: UserRole[] = [
    'club_admin', 
    'club_chair', 
    'club_secretary'
  ];

  useEffect(() => {
    if (selectedTeam) {
      fetchTeamStaff(selectedTeam);
    }
  }, [selectedTeam]);

  useEffect(() => {
    if (selectedClub) {
      fetchClubStaff(selectedClub);
    }
  }, [selectedClub]);

  const fetchTeamStaff = async (teamId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_teams')
        .select(`
          user_id,
          role,
          profiles!inner(
            name,
            email
          )
        `)
        .eq('team_id', teamId);

      if (error) throw error;

      if (data) {
        const staffMembers: StaffMember[] = data.map(item => ({
          id: item.user_id,
          name: item.profiles?.name || 'Unknown',
          email: item.profiles?.email || 'No email',
          role: item.role as UserRole
        }));

        setTeamStaff(staffMembers);
      }
    } catch (error: any) {
      toast.error('Failed to fetch team staff', {
        description: error.message
      });
    }
  };

  const fetchClubStaff = async (clubId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_clubs')
        .select(`
          user_id,
          role,
          profiles!inner(
            name,
            email
          )
        `)
        .eq('club_id', clubId);

      if (error) throw error;

      if (data) {
        const staffMembers: StaffMember[] = data.map(item => ({
          id: item.user_id,
          name: item.profiles?.name || 'Unknown',
          email: item.profiles?.email || 'No email',
          role: item.role as UserRole
        }));

        setClubStaff(staffMembers);
      }
    } catch (error: any) {
      toast.error('Failed to fetch club staff', {
        description: error.message
      });
    }
  };

  const handleAddTeamStaff = async () => {
    if (!formData.email || !formData.role || !selectedTeam) {
      toast.error('Please fill in all fields');
      return;
    }

    try {
      // First, try to find the user by email
      const { data: userData, error: userError } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', formData.email)
        .single();

      if (userError) {
        toast.error('User not found', {
          description: 'This email address is not registered in the system.'
        });
        return;
      }

      // Then add the user to the team
      const { error: addError } = await supabase
        .from('user_teams')
        .insert({
          user_id: userData.id,
          team_id: selectedTeam,
          role: formData.role
        });

      if (addError) {
        if (addError.code === '23505') { // Unique violation
          toast.error('This user already has this role on the team');
        } else {
          throw addError;
        }
      } else {
        toast.success('Staff member added successfully');
        fetchTeamStaff(selectedTeam);
        setIsAddStaffDialogOpen(false);
        setFormData({ email: '', role: '' as UserRole });
      }
    } catch (error: any) {
      toast.error('Failed to add staff member', {
        description: error.message
      });
    }
  };

  const handleAddClubStaff = async () => {
    if (!formData.email || !formData.role || !selectedClub) {
      toast.error('Please fill in all fields');
      return;
    }

    try {
      // First, try to find the user by email
      const { data: userData, error: userError } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', formData.email)
        .single();

      if (userError) {
        toast.error('User not found', {
          description: 'This email address is not registered in the system.'
        });
        return;
      }

      // Then add the user to the club
      const { error: addError } = await supabase
        .from('user_clubs')
        .insert({
          user_id: userData.id,
          club_id: selectedClub,
          role: formData.role
        });

      if (addError) {
        if (addError.code === '23505') { // Unique violation
          toast.error('This user already has this role in the club');
        } else {
          throw addError;
        }
      } else {
        toast.success('Staff member added successfully');
        fetchClubStaff(selectedClub);
        setIsAddStaffDialogOpen(false);
        setFormData({ email: '', role: '' as UserRole });
      }
    } catch (error: any) {
      toast.error('Failed to add staff member', {
        description: error.message
      });
    }
  };

  const handleRemoveTeamStaff = async (userId: string, role: UserRole) => {
    try {
      const { error } = await supabase
        .from('user_teams')
        .delete()
        .eq('user_id', userId)
        .eq('team_id', selectedTeam)
        .eq('role', role);

      if (error) throw error;

      toast.success('Staff member removed successfully');
      fetchTeamStaff(selectedTeam);
    } catch (error: any) {
      toast.error('Failed to remove staff member', {
        description: error.message
      });
    }
  };

  const handleRemoveClubStaff = async (userId: string, role: UserRole) => {
    try {
      const { error } = await supabase
        .from('user_clubs')
        .delete()
        .eq('user_id', userId)
        .eq('club_id', selectedClub)
        .eq('role', role);

      if (error) throw error;

      toast.success('Staff member removed successfully');
      fetchClubStaff(selectedClub);
    } catch (error: any) {
      toast.error('Failed to remove staff member', {
        description: error.message
      });
    }
  };

  const getTeamName = (teamId: string): string => {
    const team = teams.find(t => t.id === teamId);
    return team ? team.name : 'Unknown Team';
  };

  const getClubName = (clubId: string): string => {
    const club = clubs.find(c => c.id === clubId);
    return club ? club.name : 'Unknown Club';
  };

  const formatRoleName = (role: string): string => {
    return role
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Staff Management</h1>
            <p className="text-muted-foreground">
              Manage team and club staff members
            </p>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'teams' | 'clubs')}>
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="teams">Teams</TabsTrigger>
            <TabsTrigger value="clubs">Clubs</TabsTrigger>
          </TabsList>
          
          <TabsContent value="teams" className="space-y-6">
            {teams.length === 0 ? (
              <Card>
                <CardContent className="py-8 flex flex-col items-center justify-center text-center">
                  <div className="rounded-full bg-muted p-3 mb-4">
                    <User className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <h3 className="font-semibold text-lg mb-1">No Teams Available</h3>
                  <p className="text-muted-foreground mb-4 max-w-md">
                    You need to create a team before you can manage team staff.
                  </p>
                  <Button
                    onClick={() => window.location.href = '/teams'}
                    className="bg-puma-blue-500 hover:bg-puma-blue-600"
                  >
                    Create Team
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <>
                <div className="flex justify-between items-end">
                  <div className="space-y-2 w-64">
                    <Label htmlFor="team-select">Select Team</Label>
                    <Select
                      value={selectedTeam}
                      onValueChange={setSelectedTeam}
                    >
                      <SelectTrigger id="team-select">
                        <SelectValue placeholder="Select a team" />
                      </SelectTrigger>
                      <SelectContent>
                        {teams.map((team) => (
                          <SelectItem key={team.id} value={team.id}>
                            {team.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {selectedTeam && (
                    <Dialog open={isAddStaffDialogOpen && activeTab === 'teams'} onOpenChange={(open) => setIsAddStaffDialogOpen(open)}>
                      <DialogTrigger asChild>
                        <Button
                          className="bg-puma-blue-500 hover:bg-puma-blue-600"
                        >
                          <UserPlus className="mr-2 h-4 w-4" />
                          Add Staff Member
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Add Staff to {getTeamName(selectedTeam)}</DialogTitle>
                          <DialogDescription>
                            Add a new staff member to the team. They must already have an account.
                          </DialogDescription>
                        </DialogHeader>

                        <div className="space-y-4 py-4">
                          <div className="space-y-2">
                            <Label htmlFor="email">Email Address</Label>
                            <Input
                              id="email"
                              type="email"
                              placeholder="user@example.com"
                              value={formData.email}
                              onChange={(e) => setFormData({...formData, email: e.target.value})}
                            />
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="role">Role</Label>
                            <Select
                              value={formData.role}
                              onValueChange={(value) => setFormData({...formData, role: value as UserRole})}
                            >
                              <SelectTrigger id="role">
                                <SelectValue placeholder="Select a role" />
                              </SelectTrigger>
                              <SelectContent>
                                {teamRoles.map((role) => (
                                  <SelectItem key={role} value={role}>
                                    {formatRoleName(role)}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="flex justify-end pt-4">
                            <Button
                              onClick={handleAddTeamStaff}
                              className="bg-puma-blue-500 hover:bg-puma-blue-600"
                            >
                              Add Staff Member
                            </Button>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  )}
                </div>

                {selectedTeam ? (
                  teamStaff.length > 0 ? (
                    <Card>
                      <CardHeader>
                        <CardTitle>Staff for {getTeamName(selectedTeam)}</CardTitle>
                        <CardDescription>
                          Manage staff members and their roles
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          {teamStaff.map((staff) => (
                            <div key={`${staff.id}-${staff.role}`} className="flex items-center justify-between bg-muted/50 p-3 rounded-md">
                              <div className="flex items-center space-x-3">
                                <Avatar>
                                  <AvatarFallback className="bg-puma-blue-100 text-puma-blue-500">
                                    {staff.name.substring(0, 2).toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>
                                <div>
                                  <div className="font-medium">{staff.name}</div>
                                  <div className="text-sm text-muted-foreground">{staff.email}</div>
                                </div>
                              </div>
                              <div className="flex items-center space-x-3">
                                <div className="text-sm font-medium">{formatRoleName(staff.role)}</div>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 rounded-full text-muted-foreground hover:text-destructive"
                                  onClick={() => handleRemoveTeamStaff(staff.id, staff.role)}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  ) : (
                    <Card>
                      <CardContent className="py-8 flex flex-col items-center justify-center text-center">
                        <div className="rounded-full bg-muted p-3 mb-4">
                          <UserPlus className="h-6 w-6 text-muted-foreground" />
                        </div>
                        <h3 className="font-semibold text-lg mb-1">No Staff Members Yet</h3>
                        <p className="text-muted-foreground mb-4 max-w-md">
                          This team doesn't have any staff members yet. Add staff members to help manage the team.
                        </p>
                        <Button
                          onClick={() => setIsAddStaffDialogOpen(true)}
                          className="bg-puma-blue-500 hover:bg-puma-blue-600"
                        >
                          <PlusCircle className="mr-2 h-4 w-4" />
                          Add Staff Member
                        </Button>
                      </CardContent>
                    </Card>
                  )
                ) : (
                  <Card>
                    <CardContent className="py-8 flex flex-col items-center justify-center text-center">
                      <p className="text-muted-foreground">Please select a team to manage its staff</p>
                    </CardContent>
                  </Card>
                )}
              </>
            )}
          </TabsContent>

          <TabsContent value="clubs" className="space-y-6">
            {clubs.length === 0 ? (
              <Card>
                <CardContent className="py-8 flex flex-col items-center justify-center text-center">
                  <div className="rounded-full bg-muted p-3 mb-4">
                    <User className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <h3 className="font-semibold text-lg mb-1">No Clubs Available</h3>
                  <p className="text-muted-foreground mb-4 max-w-md">
                    You need to create a club before you can manage club staff.
                  </p>
                  <Button
                    onClick={() => window.location.href = '/clubs'}
                    className="bg-puma-blue-500 hover:bg-puma-blue-600"
                  >
                    Create Club
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <>
                <div className="flex justify-between items-end">
                  <div className="space-y-2 w-64">
                    <Label htmlFor="club-select">Select Club</Label>
                    <Select
                      value={selectedClub}
                      onValueChange={setSelectedClub}
                    >
                      <SelectTrigger id="club-select">
                        <SelectValue placeholder="Select a club" />
                      </SelectTrigger>
                      <SelectContent>
                        {clubs.map((club) => (
                          <SelectItem key={club.id} value={club.id}>
                            {club.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {selectedClub && (
                    <Dialog open={isAddStaffDialogOpen && activeTab === 'clubs'} onOpenChange={(open) => setIsAddStaffDialogOpen(open)}>
                      <DialogTrigger asChild>
                        <Button
                          className="bg-puma-blue-500 hover:bg-puma-blue-600"
                        >
                          <UserPlus className="mr-2 h-4 w-4" />
                          Add Staff Member
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Add Staff to {getClubName(selectedClub)}</DialogTitle>
                          <DialogDescription>
                            Add a new staff member to the club. They must already have an account.
                          </DialogDescription>
                        </DialogHeader>

                        <div className="space-y-4 py-4">
                          <div className="space-y-2">
                            <Label htmlFor="email">Email Address</Label>
                            <Input
                              id="email"
                              type="email"
                              placeholder="user@example.com"
                              value={formData.email}
                              onChange={(e) => setFormData({...formData, email: e.target.value})}
                            />
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="role">Role</Label>
                            <Select
                              value={formData.role}
                              onValueChange={(value) => setFormData({...formData, role: value as UserRole})}
                            >
                              <SelectTrigger id="role">
                                <SelectValue placeholder="Select a role" />
                              </SelectTrigger>
                              <SelectContent>
                                {clubRoles.map((role) => (
                                  <SelectItem key={role} value={role}>
                                    {formatRoleName(role)}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="flex justify-end pt-4">
                            <Button
                              onClick={handleAddClubStaff}
                              className="bg-puma-blue-500 hover:bg-puma-blue-600"
                            >
                              Add Staff Member
                            </Button>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  )}
                </div>

                {selectedClub ? (
                  clubStaff.length > 0 ? (
                    <Card>
                      <CardHeader>
                        <CardTitle>Staff for {getClubName(selectedClub)}</CardTitle>
                        <CardDescription>
                          Manage staff members and their roles
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          {clubStaff.map((staff) => (
                            <div key={`${staff.id}-${staff.role}`} className="flex items-center justify-between bg-muted/50 p-3 rounded-md">
                              <div className="flex items-center space-x-3">
                                <Avatar>
                                  <AvatarFallback className="bg-puma-blue-100 text-puma-blue-500">
                                    {staff.name.substring(0, 2).toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>
                                <div>
                                  <div className="font-medium">{staff.name}</div>
                                  <div className="text-sm text-muted-foreground">{staff.email}</div>
                                </div>
                              </div>
                              <div className="flex items-center space-x-3">
                                <div className="text-sm font-medium">{formatRoleName(staff.role)}</div>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 rounded-full text-muted-foreground hover:text-destructive"
                                  onClick={() => handleRemoveClubStaff(staff.id, staff.role)}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  ) : (
                    <Card>
                      <CardContent className="py-8 flex flex-col items-center justify-center text-center">
                        <div className="rounded-full bg-muted p-3 mb-4">
                          <UserPlus className="h-6 w-6 text-muted-foreground" />
                        </div>
                        <h3 className="font-semibold text-lg mb-1">No Staff Members Yet</h3>
                        <p className="text-muted-foreground mb-4 max-w-md">
                          This club doesn't have any staff members yet. Add staff members to help manage the club.
                        </p>
                        <Button
                          onClick={() => setIsAddStaffDialogOpen(true)}
                          className="bg-puma-blue-500 hover:bg-puma-blue-600"
                        >
                          <PlusCircle className="mr-2 h-4 w-4" />
                          Add Staff Member
                        </Button>
                      </CardContent>
                    </Card>
                  )
                ) : (
                  <Card>
                    <CardContent className="py-8 flex flex-col items-center justify-center text-center">
                      <p className="text-muted-foreground">Please select a club to manage its staff</p>
                    </CardContent>
                  </Card>
                )}
              </>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default StaffManagement;
