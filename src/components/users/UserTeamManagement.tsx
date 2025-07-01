
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
import { Search, UserPlus, Edit, Trash2, Users, Shield, AlertTriangle, UserSearch, Plus } from 'lucide-react';

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
  const { toast } = useToast();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Load all users from profiles
      const { data: usersData, error: usersError } = await supabase
        .from('profiles')
        .select('id, name, email, roles')
        .order('name');

      if (usersError) throw usersError;

      // Load teams
      const { data: teamsData, error: teamsError } = await supabase
        .from('teams')
        .select('id, name, age_group')
        .order('name');

      if (teamsError) throw teamsError;

      // Load all user-team relationships
      const { data: userTeamsData, error: userTeamsError } = await supabase
        .from('user_teams')
        .select('id, user_id, team_id, role')
        .order('created_at', { ascending: false });

      if (userTeamsError) throw userTeamsError;

      // Load pending invitations
      const { data: invitationsData, error: invitationsError } = await supabase
        .from('user_invitations')
        .select('id, email, name, role, team_id, status, created_at')
        .in('status', ['pending', 'accepted']);

      if (invitationsError) {
        console.error('Error loading invitations:', invitationsError);
      }

      // Process users with their team assignments
      const processedUsers: User[] = (usersData || []).map(user => {
        const userTeamAssignments = (userTeamsData || [])
          .filter(ut => ut.user_id === user.id)
          .map(ut => {
            const team = (teamsData || []).find(t => t.id === ut.team_id);
            return {
              userTeamId: ut.id,
              teamId: ut.team_id,
              teamName: team?.name || 'Unknown Team',
              role: ut.role
            };
          });

        return {
          id: user.id,
          name: user.name || 'Unknown',
          email: user.email || '',
          roles: Array.isArray(user.roles) ? user.roles : [],
          teamAssignments: userTeamAssignments
        };
      });

      // Transform pending invitations
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

  const filteredUsers = searchEmail 
    ? users.filter(user => 
        user.email.toLowerCase().includes(searchEmail.toLowerCase()) ||
        user.name.toLowerCase().includes(searchEmail.toLowerCase())
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
          <p>Loading user team relationships...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">User Team Management</h3>
          <p className="text-sm text-muted-foreground">
            Manage all users, their team assignments, and roles
          </p>
        </div>
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
                        {user.name || user.email} ({user.email})
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

      {/* Search Controls */}
      <Card>
        <CardHeader>
          <CardTitle>Search Users</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search by name or email..."
              value={searchEmail}
              onChange={(e) => setSearchEmail(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Pending Invitations */}
      {filteredPendingInvitations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Pending Invitations ({filteredPendingInvitations.length})</CardTitle>
            <p className="text-sm text-muted-foreground">
              Users who have been invited but may not have completed signup
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {filteredPendingInvitations.map((invitation) => (
                <div key={invitation.id} className="flex items-center justify-between p-4 border rounded-lg bg-yellow-50">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <UserSearch className="h-4 w-4 text-yellow-600" />
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
                          <p className="font-medium">{user.name}</p>
                          <p className="text-sm text-muted-foreground">{user.email}</p>
                          <p className="text-xs text-muted-foreground">ID: {user.id}</p>
                        </div>
                      </div>
                      
                      {/* Global Roles */}
                      <div className="mb-3">
                        <span className="text-xs font-medium text-gray-500">Global Roles:</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {user.roles.map((role) => (
                            <Badge key={role} variant="secondary" className="text-xs">
                              {role.replace('_', ' ')}
                            </Badge>
                          ))}
                          {user.roles.length === 0 && (
                            <Badge variant="outline" className="text-xs">No global roles</Badge>
                          )}
                        </div>
                      </div>
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
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
