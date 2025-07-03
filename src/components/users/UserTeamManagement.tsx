import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Search, UserPlus, Edit, Trash2, Users, Shield, AlertTriangle, UserSearch, Plus, RefreshCw, CheckCircle, Clock, UserCheck, User, Save, X } from 'lucide-react';

interface User {
  id: string;
  name: string;
  email: string;
  roles: string[];
  teamAssignments: Array<{
    userTeamId: string;
    teamId: string;
    teamName: string;
    role: string;
  }>;
  hasProfile: boolean;
  invitationStatus?: 'pending' | 'accepted' | 'none';
}

interface Team {
  id: string;
  name: string;
  age_group: string;
}

interface PendingInvitation {
  id: string;
  email: string;
  name: string;
  role: string;
  team_id: string;
  team_name: string;
  status: string;
  created_at: string;
}

export const UserTeamManagement = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [pendingInvitations, setPendingInvitations] = useState<PendingInvitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchEmail, setSearchEmail] = useState('');
  const [selectedUser, setSelectedUser] = useState<string>('');
  const [selectedTeam, setSelectedTeam] = useState<string>('');
  const [selectedRole, setSelectedRole] = useState<string>('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState<{userId: string, userTeamId: string, currentRole: string} | null>(null);
  const [editingUser, setEditingUser] = useState<{userId: string, field: 'name' | 'email' | 'roles'} | null>(null);
  const [editValue, setEditValue] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    loadData();
    
    // Listen for invitation deletions to update the view
    const handleInvitationDeleted = (event: CustomEvent) => {
      console.log('Invitation deleted event received:', event.detail);
      loadData(); // Refresh the data to remove deleted invitations
    };
    
    window.addEventListener('invitationDeleted', handleInvitationDeleted as EventListener);
    
    return () => {
      window.removeEventListener('invitationDeleted', handleInvitationDeleted as EventListener);
    };
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      console.log('=== LOADING COMPREHENSIVE USER DATA AS GLOBAL ADMIN ===');
      
      // Load teams first
      const { data: teamsData, error: teamsError } = await supabase
        .from('teams')
        .select('id, name, age_group')
        .order('name');

      if (teamsError) {
        console.error('Error loading teams:', teamsError);
        throw teamsError;
      }
      console.log('Teams loaded:', teamsData?.length || 0);

      // Load all user-team relationships
      const { data: userTeamsData, error: userTeamsError } = await supabase
        .from('user_teams')
        .select('id, user_id, team_id, role')
        .order('created_at', { ascending: false });

      if (userTeamsError) {
        console.error('Error loading user teams:', userTeamsError);
        throw userTeamsError;
      }
      console.log('User teams loaded:', userTeamsData?.length || 0);

      // Load all profiles (should work now with updated RLS policy)
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, name, email, roles, created_at')
        .order('created_at', { ascending: false });

      if (profilesError) {
        console.error('Error loading profiles:', profilesError);
        throw profilesError;
      }
      console.log('Profiles loaded:', profilesData?.length || 0);

      // Load pending invitations
      const { data: invitationsData, error: invitationsError } = await supabase
        .from('user_invitations')
        .select('id, email, name, role, team_id, status, created_at')
        .order('created_at', { ascending: false });

      if (invitationsError) {
        console.error('Error loading invitations:', invitationsError);
      }
      console.log('Invitations loaded:', invitationsData?.length || 0);

      // Create comprehensive user map
      const allUserIds = new Set<string>();
      const userMap = new Map<string, Partial<User>>();
      const emailToUserMap = new Map<string, string>(); // Map emails to user IDs

      // First, add all users from profiles
      (profilesData || []).forEach(profile => {
        allUserIds.add(profile.id);
        emailToUserMap.set(profile.email.toLowerCase(), profile.id);
        userMap.set(profile.id, {
          id: profile.id,
          name: profile.name || 'Unknown',
          email: profile.email || '',
          roles: Array.isArray(profile.roles) ? profile.roles : [],
          hasProfile: true,
          teamAssignments: [],
          invitationStatus: 'none'
        });
      });

      // Add users from user_teams that might not have profiles
      (userTeamsData || []).forEach(userTeam => {
        allUserIds.add(userTeam.user_id);
        if (!userMap.has(userTeam.user_id)) {
          userMap.set(userTeam.user_id, {
            id: userTeam.user_id,
            name: 'No Profile Found',
            email: 'Unknown',
            roles: [],
            hasProfile: false,
            teamAssignments: [],
            invitationStatus: 'none'
          });
        }
      });

      // Update invitation status for users
      (invitationsData || []).forEach(invitation => {
        const userId = emailToUserMap.get(invitation.email.toLowerCase());
        if (userId && userMap.has(userId)) {
          const user = userMap.get(userId)!;
          user.invitationStatus = invitation.status as 'pending' | 'accepted';
        }
      });

      // Build team assignments for each user
      (userTeamsData || []).forEach(userTeam => {
        const user = userMap.get(userTeam.user_id);
        if (user) {
          const team = (teamsData || []).find(t => t.id === userTeam.team_id);
          user.teamAssignments = user.teamAssignments || [];
          user.teamAssignments.push({
            userTeamId: userTeam.id,
            teamId: userTeam.team_id,
            teamName: team?.name || 'Unknown Team',
            role: userTeam.role
          });
        }
      });

      // Convert map to array
      const processedUsers: User[] = Array.from(userMap.values()).map(user => ({
        id: user.id!,
        name: user.name!,
        email: user.email!,
        roles: user.roles!,
        teamAssignments: user.teamAssignments!,
        hasProfile: user.hasProfile!,
        invitationStatus: user.invitationStatus!
      }));

      console.log('Processed users:', processedUsers.length);
      
      // Check for the specific user we're looking for
      const specificUser = processedUsers.find(u => u.id === 'c68e8344-0dd6-4a2c-b1c3-8dd5114c21d0');
      console.log('Found specific user c68e8344-0dd6-4a2c-b1c3-8dd5114c21d0:', specificUser);

      // Transform pending invitations with team names
      const transformedInvitations: PendingInvitation[] = [];
      if (invitationsData) {
        for (const inv of invitationsData) {
          const { data: teamData } = await supabase
            .from('teams')
            .select('name')
            .eq('id', inv.team_id)
            .maybeSingle();

          transformedInvitations.push({
            id: inv.id,
            email: inv.email,
            name: inv.name,
            role: inv.role,
            team_id: inv.team_id,
            team_name: teamData?.name || 'Unknown Team',
            status: inv.status,
            created_at: inv.created_at
          });
        }
      }

      setUsers(processedUsers);
      setTeams(teamsData || []);
      setPendingInvitations(transformedInvitations);
      
    } catch (error: any) {
      console.error('Error loading data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load data: ' + error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const acceptInvitation = async (invitationId: string, email: string) => {
    try {
      console.log('Accepting invitation:', invitationId, 'for email:', email);
      
      // Update invitation status to accepted
      const { error: updateError } = await supabase
        .from('user_invitations')
        .update({ status: 'accepted' })
        .eq('id', invitationId);

      if (updateError) {
        throw updateError;
      }

      toast({
        title: 'Success',
        description: `Invitation for ${email} has been accepted`,
      });

      // Reload data to refresh the view
      loadData();
    } catch (error: any) {
      console.error('Error accepting invitation:', error);
      toast({
        title: 'Error',
        description: 'Failed to accept invitation: ' + error.message,
        variant: 'destructive',
      });
    }
  };

  const createProfileForUser = async (invitation: PendingInvitation) => {
    try {
      console.log('Creating profile for user from invitation:', invitation);
      
      // Create a new user profile
      const { error: profileError } = await supabase
        .from('profiles')
        .insert([{
          id: crypto.randomUUID(), // Generate new UUID for the user
          name: invitation.name,
          email: invitation.email,
          roles: [invitation.role]
        }]);

      if (profileError) {
        throw profileError;
      }

      toast({
        title: 'Success',
        description: `Profile created for ${invitation.email}`,
      });

      // Accept the invitation as well
      await acceptInvitation(invitation.id, invitation.email);
      
    } catch (error: any) {
      console.error('Error creating profile:', error);
      toast({
        title: 'Error',
        description: 'Failed to create profile: ' + error.message,
        variant: 'destructive',
      });
    }
  };

  const addUserToTeam = async () => {
    if (!selectedUser || !selectedTeam || !selectedRole) {
      toast({
        title: 'Error',
        description: 'Please select user, team, and role',
        variant: 'destructive',
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('user_teams')
        .insert([{
          user_id: selectedUser,
          team_id: selectedTeam,
          role: selectedRole
        }]);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'User added to team successfully',
      });

      setIsAddModalOpen(false);
      setSelectedUser('');
      setSelectedTeam('');
      setSelectedRole('');
      loadData();
    } catch (error: any) {
      console.error('Error adding user to team:', error);
      toast({
        title: 'Error',
        description: 'Failed to add user to team: ' + error.message,
        variant: 'destructive',
      });
    }
  };

  const removeUserFromTeam = async (userTeamId: string) => {
    if (!confirm('Are you sure you want to remove this user from the team?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('user_teams')
        .delete()
        .eq('id', userTeamId);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'User removed from team successfully',
      });

      loadData();
    } catch (error: any) {
      console.error('Error removing user from team:', error);
      toast({
        title: 'Error',
        description: 'Failed to remove user from team: ' + error.message,
        variant: 'destructive',
      });
    }
  };

  const updateUserRole = async (userTeamId: string, newRole: string) => {
    try {
      const { error } = await supabase
        .from('user_teams')
        .update({ role: newRole })
        .eq('id', userTeamId);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'User role updated successfully',
      });

      setEditingAssignment(null);
      loadData();
    } catch (error: any) {
      console.error('Error updating user role:', error);
      toast({
        title: 'Error',
        description: 'Failed to update user role: ' + error.message,
        variant: 'destructive',
      });
    }
  };

  const updateUserGlobalRoles = async (userId: string, newRoles: string[]) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ roles: newRoles })
        .eq('id', userId);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'User global roles updated successfully',
      });

      setEditingUser(null);
      setEditValue('');
      loadData();
    } catch (error: any) {
      console.error('Error updating user roles:', error);
      toast({
        title: 'Error',
        description: 'Failed to update user roles: ' + error.message,
        variant: 'destructive',
      });
    }
  };

  const updateUserProfile = async (userId: string, field: 'name' | 'email', value: string) => {
    try {
      console.log('Updating user profile:', { userId, field, value });
      
      const { error } = await supabase
        .from('profiles')
        .update({ [field]: value })
        .eq('id', userId);

      if (error) {
        throw error;
      }

      toast({
        title: 'Success',
        description: `User ${field} updated successfully`,
      });

      setEditingUser(null);
      setEditValue('');
      loadData();
    } catch (error: any) {
      console.error('Error updating user profile:', error);
      toast({
        title: 'Error',
        description: 'Failed to update user profile: ' + error.message,
        variant: 'destructive',
      });
    }
  };

  const fixUserName = async (userId: string, email: string) => {
    try {
      console.log('Fixing user name for:', userId, email);
      
      // First try to get name from invitations
      const { data: invitations, error: invitationError } = await supabase
        .from('user_invitations')
        .select('*')
        .eq('email', email)
        .order('created_at', { ascending: true });

      if (invitationError) {
        throw invitationError;
      }

      let correctName = null;
      if (invitations && invitations.length > 0) {
        correctName = invitations[0].name;
      } else {
        // If no invitations found, prompt for manual entry
        const manualName = prompt(`No invitations found for ${email}. Please enter the correct name:`);
        if (!manualName) {
          return;
        }
        correctName = manualName;
      }
      
      // Update the profile with the correct name
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ name: correctName })
        .eq('id', userId);

      if (updateError) {
        throw updateError;
      }

      toast({
        title: 'Success',
        description: `Updated name for ${email} to "${correctName}"`,
      });

      // Reload data to refresh the view
      loadData();
    } catch (error: any) {
      console.error('Error fixing user name:', error);
      toast({
        title: 'Error',
        description: 'Failed to fix user name: ' + error.message,
        variant: 'destructive',
      });
    }
  };

  const startEditingUser = (userId: string, field: 'name' | 'email' | 'roles', currentValue: string | string[]) => {
    setEditingUser({ userId, field });
    if (Array.isArray(currentValue)) {
      setEditValue(currentValue.join(','));
    } else {
      setEditValue(currentValue);
    }
  };

  const cancelEditing = () => {
    setEditingUser(null);
    setEditValue('');
  };

  const saveEdit = () => {
    if (!editingUser) return;

    if (editingUser.field === 'roles') {
      const rolesArray = editValue.split(',').map(role => role.trim()).filter(role => role);
      updateUserGlobalRoles(editingUser.userId, rolesArray);
    } else {
      updateUserProfile(editingUser.userId, editingUser.field, editValue);
    }
  };

  const getUserDisplayName = (user: User) => {
    if (user.name === 'Unknown' || user.name === 'No Profile Found') {
      return `${user.email} (Name Missing)`;
    }
    return user.name;
  };

  const filteredUsers = searchEmail 
    ? users.filter(user => 
        user.email.toLowerCase().includes(searchEmail.toLowerCase()) ||
        user.name.toLowerCase().includes(searchEmail.toLowerCase()) ||
        user.id.toLowerCase().includes(searchEmail.toLowerCase())
      )
    : users;

  const filteredPendingInvitations = searchEmail
    ? pendingInvitations.filter(inv =>
        inv.email.toLowerCase().includes(searchEmail.toLowerCase()) ||
        inv.name.toLowerCase().includes(searchEmail.toLowerCase())
      )
    : pendingInvitations;

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p>Loading comprehensive user data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Comprehensive User & Team Management</h3>
          <p className="text-sm text-muted-foreground">
            Global admin view: Manage all users, profiles, invitations, and team assignments
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={loadData}
            variant="outline"
            size="sm"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh Data
          </Button>
          <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
            <DialogTrigger asChild>
              <Button>
                <UserPlus className="h-4 w-4 mr-2" />
                Add User to Team
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add User to Team</DialogTitle>
                <DialogDescription>
                  Select a user, team, and role to create a new relationship.
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>User</Label>
                  <Select value={selectedUser} onValueChange={setSelectedUser}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select user" />
                    </SelectTrigger>
                    <SelectContent>
                      {users.map((user) => (
                        <SelectItem key={user.id} value={user.id}>
                          {getUserDisplayName(user)} ({user.email}) - {user.id.substring(0, 8)}...
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label>Team</Label>
                  <Select value={selectedTeam} onValueChange={setSelectedTeam}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select team" />
                    </SelectTrigger>
                    <SelectContent>
                      {teams.map((team) => (
                        <SelectItem key={team.id} value={team.id}>
                          {team.name} ({team.age_group})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label>Role</Label>
                  <Select value={selectedRole} onValueChange={setSelectedRole}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="team_manager">Team Manager</SelectItem>
                      <SelectItem value="team_assistant_manager">Assistant Manager</SelectItem>
                      <SelectItem value="team_coach">Coach</SelectItem>
                      <SelectItem value="team_helper">Helper</SelectItem>
                      <SelectItem value="player">Player</SelectItem>
                      <SelectItem value="parent">Parent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="flex gap-2">
                  <Button onClick={addUserToTeam} className="flex-1">
                    Add to Team
                  </Button>
                  <Button variant="outline" onClick={() => setIsAddModalOpen(false)} className="flex-1">
                    Cancel
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Search Controls */}
      <Card>
        <CardHeader>
          <CardTitle>Search Users & Invitations</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search by name, email, or UUID..."
              value={searchEmail}
              onChange={(e) => setSearchEmail(e.target.value)}
              className="pl-10"
            />
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Search for: c68e8344-0dd6-4a2c-b1c3-8dd5114c21d0, Micky McPherson, or m888kky@outlook.com
          </p>
        </CardContent>
      </Card>

      {/* Summary */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold">{users.length}</p>
              <p className="text-sm text-muted-foreground">Total Users</p>
            </div>
            <div>
              <p className="text-2xl font-bold">{users.filter(u => u.hasProfile).length}</p>
              <p className="text-sm text-muted-foreground">With Profiles</p>
            </div>
            <div>
              <p className="text-2xl font-bold">{users.filter(u => !u.hasProfile).length}</p>
              <p className="text-sm text-muted-foreground">Without Profiles</p>
            </div>
            <div>
              <p className="text-2xl font-bold">{pendingInvitations.filter(i => i.status === 'pending').length}</p>
              <p className="text-sm text-muted-foreground">Pending Invitations</p>
            </div>
            <div>
              <p className="text-2xl font-bold">{pendingInvitations.filter(i => i.status === 'accepted').length}</p>
              <p className="text-sm text-muted-foreground">Accepted Invitations</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Pending Invitations */}
      {filteredPendingInvitations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Invitations Management ({filteredPendingInvitations.length})</CardTitle>
            <p className="text-sm text-muted-foreground">
              Manage all user invitations and create profiles for accepted invitations
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {filteredPendingInvitations.map((invitation) => (
                <div key={invitation.id} className={`flex items-center justify-between p-4 border rounded-lg ${
                  invitation.status === 'pending' ? 'bg-yellow-50' : 'bg-green-50'
                }`}>
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      {invitation.status === 'pending' ? (
                        <Clock className="h-4 w-4 text-yellow-600" />
                      ) : (
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      )}
                      <div>
                        <p className="font-medium">{invitation.name}</p>
                        <p className="text-sm text-muted-foreground">{invitation.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Shield className="h-4 w-4 text-blue-500" />
                      <span className="text-sm">{invitation.team_name}</span>
                      <Badge variant="outline">{invitation.role}</Badge>
                      <Badge variant={invitation.status === 'pending' ? 'secondary' : 'default'}>
                        {invitation.status}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {invitation.status === 'pending' && (
                      <Button
                        size="sm"
                        onClick={() => acceptInvitation(invitation.id, invitation.email)}
                      >
                        <UserCheck className="h-4 w-4 mr-2" />
                        Accept
                      </Button>
                    )}
                    {invitation.status === 'accepted' && (
                      <Button
                        size="sm"
                        onClick={() => createProfileForUser(invitation)}
                      >
                        <UserPlus className="h-4 w-4 mr-2" />
                        Create Profile
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* All Users */}
      <Card>
        <CardHeader>
          <CardTitle>All Users ({filteredUsers.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredUsers.map((user) => (
              <div key={user.id} className="p-4 border rounded-lg">
                <div className="space-y-4">
                  {/* User Header */}
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <Users className="h-4 w-4 text-blue-500" />
                        <div>
                          <div className="flex items-center gap-2">
                            {editingUser?.userId === user.id && editingUser.field === 'name' ? (
                              <div className="flex items-center gap-2">
                                <Input
                                  value={editValue}
                                  onChange={(e) => setEditValue(e.target.value)}
                                  className="w-48"
                                />
                                <Button size="sm" onClick={saveEdit}>
                                  <Save className="h-3 w-3" />
                                </Button>
                                <Button size="sm" variant="outline" onClick={cancelEditing}>
                                  <X className="h-3 w-3" />
                                </Button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2">
                                <p className="font-medium">{getUserDisplayName(user)}</p>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => startEditingUser(user.id, 'name', user.name)}
                                  className="text-xs px-1 py-0 h-auto"
                                >
                                  <Edit className="h-3 w-3" />
                                </Button>
                              </div>
                            )}
                            {!user.hasProfile && (
                              <Badge variant="destructive" className="text-xs">
                                No Profile
                              </Badge>
                            )}
                            {user.invitationStatus === 'pending' && (
                              <Badge variant="secondary" className="text-xs">
                                Pending Invitation
                              </Badge>
                            )}
                            {user.invitationStatus === 'accepted' && (
                              <Badge variant="default" className="text-xs">
                                Accepted Invitation
                              </Badge>
                            )}
                            {(user.name === 'Unknown' || user.name === 'No Profile Found') && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => fixUserName(user.id, user.email)}
                                className="text-xs px-2 py-1 h-auto"
                              >
                                <User className="h-3 w-3 mr-1" />
                                Fix Name
                              </Button>
                            )}
                          </div>
                          {editingUser?.userId === user.id && editingUser.field === 'email' ? (
                            <div className="flex items-center gap-2 mt-1">
                              <Input
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                className="w-48"
                              />
                              <Button size="sm" onClick={saveEdit}>
                                <Save className="h-3 w-3" />
                              </Button>
                              <Button size="sm" variant="outline" onClick={cancelEditing}>
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <p className="text-sm text-muted-foreground">{user.email}</p>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => startEditingUser(user.id, 'email', user.email)}
                                className="text-xs px-1 py-0 h-auto"
                              >
                                <Edit className="h-3 w-3" />
                              </Button>
                            </div>
                          )}
                          <p className="text-xs text-muted-foreground font-mono">ID: {user.id}</p>
                        </div>
                      </div>
                      
                      {/* Global Roles */}
                      {user.hasProfile && (
                        <div className="mb-3">
                          <span className="text-xs font-medium text-gray-500">Global Roles:</span>
                          {editingUser?.userId === user.id && editingUser.field === 'roles' ? (
                            <div className="flex items-center gap-2 mt-1">
                              <Input
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                placeholder="Enter roles separated by commas"
                                className="w-64"
                              />
                              <Button size="sm" onClick={saveEdit}>
                                <Save className="h-3 w-3" />
                              </Button>
                              <Button size="sm" variant="outline" onClick={cancelEditing}>
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                          ) : (
                            <div className="flex flex-wrap gap-1 mt-1 items-center">
                              {user.roles.map((role) => (
                                <Badge key={role} variant="secondary" className="text-xs">
                                  {role.replace('_', ' ')}
                                </Badge>
                              ))}
                              {user.roles.length === 0 && (
                                <Badge variant="outline" className="text-xs">No global roles</Badge>
                              )}
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => startEditingUser(user.id, 'roles', user.roles)}
                                className="text-xs px-1 py-0 h-auto ml-2"
                              >
                                <Edit className="h-3 w-3" />
                              </Button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedUser(user.id);
                        setIsAddModalOpen(true);
                      }}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add to Team
                    </Button>
                  </div>

                  {/* Team Assignments */}
                  <div>
                    <span className="text-xs font-medium text-gray-500">Team Assignments:</span>
                    {user.teamAssignments.length > 0 ? (
                      <div className="space-y-2 mt-2">
                        {user.teamAssignments.map((assignment) => (
                          <div key={assignment.userTeamId} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <div className="flex items-center gap-2">
                              <Shield className="h-4 w-4 text-green-500" />
                              <span className="text-sm font-medium">{assignment.teamName}</span>
                              <Badge variant="outline" className="text-xs">{assignment.role}</Badge>
                            </div>
                            
                            <div className="flex items-center gap-2">
                              {editingAssignment?.userTeamId === assignment.userTeamId ? (
                                <div className="flex items-center gap-2">
                                  <Select
                                    value={selectedRole}
                                    onValueChange={setSelectedRole}
                                  >
                                    <SelectTrigger className="w-40">
                                      <SelectValue placeholder="Select role" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="team_manager">Team Manager</SelectItem>
                                      <SelectItem value="team_assistant_manager">Assistant Manager</SelectItem>
                                      <SelectItem value="team_coach">Coach</SelectItem>
                                      <SelectItem value="team_helper">Helper</SelectItem>
                                      <SelectItem value="player">Player</SelectItem>
                                      <SelectItem value="parent">Parent</SelectItem>
                                    </SelectContent>
                                  </Select>
                                  <Button
                                    size="sm"
                                    onClick={() => updateUserRole(assignment.userTeamId, selectedRole)}
                                    disabled={!selectedRole}
                                  >
                                    Save
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      setEditingAssignment(null);
                                      setSelectedRole('');
                                    }}
                                  >
                                    Cancel
                                  </Button>
                                </div>
                              ) : (
                                <div className="flex items-center gap-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      setEditingAssignment({
                                        userId: user.id,
                                        userTeamId: assignment.userTeamId,
                                        currentRole: assignment.role
                                      });
                                      setSelectedRole(assignment.role);
                                    }}
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => removeUserFromTeam(assignment.userTeamId)}
                                    className="text-red-600 hover:text-red-700"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="mt-2 p-3 bg-blue-50 rounded-lg text-center">
                        <p className="text-sm text-muted-foreground">No team assignments</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {filteredUsers.length === 0 && (
              <div className="text-center py-8">
                <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="font-semibold mb-2">No Users Found</h3>
                <p className="text-muted-foreground mb-4">
                  {searchEmail 
                    ? `No users found matching "${searchEmail}"`
                    : 'No users exist yet.'
                  }
                </p>
                <Button onClick={loadData} variant="outline">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh Data
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
