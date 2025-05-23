import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { PlusCircle, User, UserPlus, X, Edit, Phone, Mail } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Team, Club, UserRole } from '@/types';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';

interface StaffMember {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: UserRole | string;
}

const StaffManagement = () => {
  const { teams, clubs, refreshUserData } = useAuth();
  const [selectedTeam, setSelectedTeam] = useState<string>('');
  const [selectedClub, setSelectedClub] = useState<string>('');
  const [isAddStaffDialogOpen, setIsAddStaffDialogOpen] = useState(false);
  const [isEditStaffDialogOpen, setIsEditStaffDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'teams' | 'clubs'>('teams');
  const [teamStaff, setTeamStaff] = useState<StaffMember[]>([]);
  const [clubStaff, setClubStaff] = useState<StaffMember[]>([]);
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    role: '' as UserRole | string
  });

  // Team roles that can be assigned
  const teamRoles: { value: string; label: string }[] = [
    { value: 'manager', label: 'Manager' },
    { value: 'assistant_manager', label: 'Assistant Manager' },
    { value: 'coach', label: 'Coach' },
    { value: 'helper', label: 'Helper' }
  ];

  // Club roles that can be assigned
  const clubRoles: UserRole[] = [
    'club_admin', 
    'club_chair', 
    'club_secretary'
  ];

  // Auto-select single team/club
  useEffect(() => {
    if (teams.length === 1 && !selectedTeam) {
      setSelectedTeam(teams[0].id);
    }
    if (clubs.length === 1 && !selectedClub) {
      setSelectedClub(clubs[0].id);
    }
  }, [teams, clubs, selectedTeam, selectedClub]);

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
      console.log('Fetching team staff for team:', teamId);
      
      const { data: teamStaffData, error: teamStaffError } = await supabase
        .from('team_staff')
        .select('*')
        .eq('team_id', teamId);

      if (teamStaffError) {
        console.error('Error fetching team staff:', teamStaffError);
        throw teamStaffError;
      }
      
      console.log('Team staff data:', teamStaffData);
      
      if (teamStaffData && teamStaffData.length > 0) {
        const staffMembers: StaffMember[] = teamStaffData.map(staff => ({
          id: staff.id,
          name: staff.name || 'Unknown',
          email: staff.email || 'No email',
          phone: staff.phone || '',
          role: staff.role
        }));
        
        setTeamStaff(staffMembers);
      } else {
        setTeamStaff([]);
      }
    } catch (error: any) {
      console.error('Error in fetchTeamStaff:', error);
      toast.error('Failed to fetch team staff', {
        description: error.message
      });
      setTeamStaff([]);
    }
  };

  const fetchClubStaff = async (clubId: string) => {
    try {
      console.log('Fetching club staff for club:', clubId);
      
      const { data: userClubsData, error: userClubsError } = await supabase
        .from('user_clubs')
        .select('user_id, role')
        .eq('club_id', clubId);

      if (userClubsError) {
        console.error('Error fetching user clubs:', userClubsError);
        throw userClubsError;
      }
      
      console.log('User clubs data:', userClubsData);
      
      if (!userClubsData || userClubsData.length === 0) {
        setClubStaff([]);
        return;
      }
      
      const userIds = userClubsData.map(uc => uc.user_id);
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, name, email, phone')
        .in('id', userIds);

      if (profilesError) {
        console.error('Error fetching profiles:', profilesError);
        throw profilesError;
      }

      console.log('Profiles data:', profilesData);
      
      const staffMembers: StaffMember[] = userClubsData
        .map(clubUser => {
          const profile = profilesData?.find(p => p.id === clubUser.user_id);
          if (profile) {
            return {
              id: clubUser.user_id,
              name: profile.name || 'Unknown',
              email: profile.email || 'No email',
              phone: profile.phone || '',
              role: clubUser.role as UserRole
            };
          }
          return null;
        })
        .filter(member => member !== null) as StaffMember[];
      
      setClubStaff(staffMembers);
    } catch (error: any) {
      console.error('Error in fetchClubStaff:', error);
      toast.error('Failed to fetch club staff', {
        description: error.message
      });
      setClubStaff([]);
    }
  };

  const handleAddTeamStaff = async () => {
    if (!formData.name || !formData.email || !formData.role || !selectedTeam) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      console.log('Adding team staff:', formData);
      
      const { error: addError } = await supabase
        .from('team_staff')
        .insert({
          team_id: selectedTeam,
          name: formData.name,
          email: formData.email,
          phone: formData.phone || null,
          role: formData.role
        });

      if (addError) {
        console.error('Add staff error:', addError);
        throw addError;
      }

      toast.success('Staff member added successfully');
      fetchTeamStaff(selectedTeam);
      setIsAddStaffDialogOpen(false);
      setFormData({ name: '', email: '', phone: '', role: '' });
    } catch (error: any) {
      console.error('Error in handleAddTeamStaff:', error);
      toast.error('Failed to add staff member', {
        description: error.message
      });
    }
  };

  const handleEditTeamStaff = async () => {
    if (!editingStaff || !formData.name || !formData.email || !formData.role || !selectedTeam) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      console.log('Updating team staff:', editingStaff.id, formData);
      
      const { error: updateError } = await supabase
        .from('team_staff')
        .update({
          name: formData.name,
          email: formData.email,
          phone: formData.phone || null,
          role: formData.role,
          updated_at: new Date().toISOString()
        })
        .eq('id', editingStaff.id);

      if (updateError) {
        console.error('Update staff error:', updateError);
        throw updateError;
      }

      toast.success('Staff member updated successfully');
      fetchTeamStaff(selectedTeam);
      setIsEditStaffDialogOpen(false);
      setEditingStaff(null);
      setFormData({ name: '', email: '', phone: '', role: '' });
    } catch (error: any) {
      console.error('Error in handleEditTeamStaff:', error);
      toast.error('Failed to update staff member', {
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
      console.log('Adding club staff:', formData);
      
      const { data: userData, error: userError } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', formData.email)
        .single();

      if (userError) {
        console.error('User lookup error:', userError);
        toast.error('User not found', {
          description: 'This email address is not registered in the system.'
        });
        return;
      }

      console.log('Found user:', userData);

      const { error: addError } = await supabase
        .from('user_clubs')
        .insert({
          user_id: userData.id,
          club_id: selectedClub,
          role: formData.role
        });

      if (addError) {
        console.error('Add staff error:', addError);
        if (addError.code === '23505') {
          toast.error('This user already has this role in the club');
        } else {
          throw addError;
        }
      } else {
        toast.success('Staff member added successfully');
        fetchClubStaff(selectedClub);
        setIsAddStaffDialogOpen(false);
        setFormData({ name: '', email: '', phone: '', role: '' });
      }
    } catch (error: any) {
      console.error('Error in handleAddClubStaff:', error);
      toast.error('Failed to add staff member', {
        description: error.message
      });
    }
  };

  const handleRemoveTeamStaff = async (staffId: string) => {
    try {
      console.log('Removing team staff:', staffId);
      
      const { error } = await supabase
        .from('team_staff')
        .delete()
        .eq('id', staffId);

      if (error) {
        console.error('Remove staff error:', error);
        throw error;
      }

      toast.success('Staff member removed successfully');
      fetchTeamStaff(selectedTeam);
    } catch (error: any) {
      console.error('Error in handleRemoveTeamStaff:', error);
      toast.error('Failed to remove staff member', {
        description: error.message
      });
    }
  };

  const handleRemoveClubStaff = async (userId: string, role: UserRole) => {
    try {
      console.log('Removing club staff:', { userId, role, selectedClub });
      
      const { error } = await supabase
        .from('user_clubs')
        .delete()
        .eq('user_id', userId)
        .eq('club_id', selectedClub)
        .eq('role', role);

      if (error) {
        console.error('Remove staff error:', error);
        throw error;
      }

      toast.success('Staff member removed successfully');
      fetchClubStaff(selectedClub);
    } catch (error: any) {
      console.error('Error in handleRemoveClubStaff:', error);
      toast.error('Failed to remove staff member', {
        description: error.message
      });
    }
  };

  const openEditDialog = (staff: StaffMember) => {
    setEditingStaff(staff);
    setFormData({
      name: staff.name,
      email: staff.email,
      phone: staff.phone || '',
      role: staff.role
    });
    setIsEditStaffDialogOpen(true);
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

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'manager': return 'bg-blue-500';
      case 'assistant_manager': return 'bg-purple-500';
      case 'coach': return 'bg-green-500';
      case 'helper': return 'bg-orange-500';
      case 'club_admin': return 'bg-red-500';
      case 'club_chair': return 'bg-indigo-500';
      case 'club_secretary': return 'bg-yellow-500';
      default: return 'bg-gray-500';
    }
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
                  {teams.length > 1 && (
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
                  )}

                  {selectedTeam && (
                    <Button
                      onClick={() => {
                        setFormData({ name: '', email: '', phone: '', role: '' });
                        setIsAddStaffDialogOpen(true);
                      }}
                      className="bg-puma-blue-500 hover:bg-puma-blue-600"
                    >
                      <UserPlus className="mr-2 h-4 w-4" />
                      Add Staff Member
                    </Button>
                  )}
                </div>

                {selectedTeam ? (
                  teamStaff.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {teamStaff.map((staff) => (
                        <Card key={staff.id} className="hover:shadow-md transition-shadow">
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex items-center gap-3">
                                <Avatar>
                                  <AvatarFallback className="bg-puma-blue-100 text-puma-blue-500">
                                    {staff.name.substring(0, 2).toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>
                                <div>
                                  <h4 className="font-semibold">{staff.name}</h4>
                                  <Badge className={`text-white ${getRoleColor(staff.role)} text-xs`}>
                                    {formatRoleName(staff.role)}
                                  </Badge>
                                </div>
                              </div>
                              <div className="flex gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => openEditDialog(staff)}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    if (confirm(`Are you sure you want to remove ${staff.name}?`)) {
                                      handleRemoveTeamStaff(staff.id);
                                    }
                                  }}
                                  className="text-red-600 hover:text-red-700"
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                            <div className="space-y-2 text-sm text-muted-foreground">
                              <div className="flex items-center gap-2">
                                <Mail className="h-3 w-3" />
                                <span className="truncate">{staff.email}</span>
                              </div>
                              {staff.phone && (
                                <div className="flex items-center gap-2">
                                  <Phone className="h-3 w-3" />
                                  <span>{staff.phone}</span>
                                </div>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
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
                  {clubs.length > 1 && (
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
                  )}

                  {selectedClub && (
                    <Button
                      onClick={() => {
                        setFormData({ name: '', email: '', phone: '', role: '' });
                        setIsAddStaffDialogOpen(true);
                      }}
                      className="bg-puma-blue-500 hover:bg-puma-blue-600"
                    >
                      <UserPlus className="mr-2 h-4 w-4" />
                      Add Staff Member
                    </Button>
                  )}
                </div>

                {selectedClub ? (
                  clubStaff.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {clubStaff.map((staff) => (
                        <Card key={staff.id} className="hover:shadow-md transition-shadow">
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex items-center gap-3">
                                <Avatar>
                                  <AvatarFallback className="bg-puma-blue-100 text-puma-blue-500">
                                    {staff.name.substring(0, 2).toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>
                                <div>
                                  <h4 className="font-semibold">{staff.name}</h4>
                                  <Badge className={`text-white ${getRoleColor(staff.role)} text-xs`}>
                                    {formatRoleName(staff.role)}
                                  </Badge>
                                </div>
                              </div>
                              <div className="flex gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => openEditDialog(staff)}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    if (confirm(`Are you sure you want to remove ${staff.name}?`)) {
                                      handleRemoveClubStaff(staff.id, staff.role as UserRole);
                                    }
                                  }}
                                  className="text-red-600 hover:text-red-700"
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                            <div className="space-y-2 text-sm text-muted-foreground">
                              <div className="flex items-center gap-2">
                                <Mail className="h-3 w-3" />
                                <span className="truncate">{staff.email}</span>
                              </div>
                              {staff.phone && (
                                <div className="flex items-center gap-2">
                                  <Phone className="h-3 w-3" />
                                  <span>{staff.phone}</span>
                                </div>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
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

        {/* Add Staff Dialog */}
        <Dialog open={isAddStaffDialogOpen} onOpenChange={setIsAddStaffDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                Add Staff to {activeTab === 'teams' ? getTeamName(selectedTeam) : getClubName(selectedClub)}
              </DialogTitle>
              <DialogDescription>
                Add a new staff member to the {activeTab === 'teams' ? 'team' : 'club'}.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {activeTab === 'teams' && (
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    placeholder="Full name"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                  />
                </div>
              )}

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

              {activeTab === 'teams' && (
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone (Optional)</Label>
                  <Input
                    id="phone"
                    placeholder="Phone number"
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <Select
                  value={formData.role}
                  onValueChange={(value) => setFormData({...formData, role: value})}
                >
                  <SelectTrigger id="role">
                    <SelectValue placeholder="Select a role" />
                  </SelectTrigger>
                  <SelectContent>
                    {activeTab === 'teams' ? (
                      teamRoles.map((role) => (
                        <SelectItem key={role.value} value={role.value}>
                          {role.label}
                        </SelectItem>
                      ))
                    ) : (
                      clubRoles.map((role) => (
                        <SelectItem key={role} value={role}>
                          {formatRoleName(role)}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex justify-end pt-4">
                <Button
                  onClick={activeTab === 'teams' ? handleAddTeamStaff : handleAddClubStaff}
                  className="bg-puma-blue-500 hover:bg-puma-blue-600"
                >
                  Add Staff Member
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Edit Staff Dialog */}
        <Dialog open={isEditStaffDialogOpen} onOpenChange={setIsEditStaffDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Staff Member</DialogTitle>
              <DialogDescription>
                Update staff member information.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Name</Label>
                <Input
                  id="edit-name"
                  placeholder="Full name"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-email">Email Address</Label>
                <Input
                  id="edit-email"
                  type="email"
                  placeholder="user@example.com"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-phone">Phone (Optional)</Label>
                <Input
                  id="edit-phone"
                  placeholder="Phone number"
                  value={formData.phone}
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-role">Role</Label>
                <Select
                  value={formData.role}
                  onValueChange={(value) => setFormData({...formData, role: value})}
                >
                  <SelectTrigger id="edit-role">
                    <SelectValue placeholder="Select a role" />
                  </SelectTrigger>
                  <SelectContent>
                    {teamRoles.map((role) => (
                      <SelectItem key={role.value} value={role.value}>
                        {role.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex justify-end pt-4">
                <Button
                  onClick={handleEditTeamStaff}
                  className="bg-puma-blue-500 hover:bg-puma-blue-600"
                >
                  Update Staff Member
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default StaffManagement;
