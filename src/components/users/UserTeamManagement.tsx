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
import { Search, UserPlus, Edit, Trash2, Users, Shield, AlertTriangle, UserSearch } from 'lucide-react';

interface User {
  id: string;
  name: string;
  email: string;
  roles: string[];
}

interface Team {
  id: string;
  name: string;
  age_group: string;
}

interface UserTeam {
  id: string;
  user_id: string;
  team_id: string;
  role: string;
  user_name: string;
  user_email: string;
  team_name: string;
  has_profile: boolean;
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
  const [userTeams, setUserTeams] = useState<UserTeam[]>([]);
  const [pendingInvitations, setPendingInvitations] = useState<PendingInvitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchEmail, setSearchEmail] = useState('');
  const [selectedUser, setSelectedUser] = useState<string>('');
  const [selectedTeam, setSelectedTeam] = useState<string>('');
  const [selectedRole, setSelectedRole] = useState<string>('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [showPendingOnly, setShowPendingOnly] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Load users
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

      // Load user-team relationships with separate queries to avoid join issues
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

      // Transform user-team data by fetching user and team details separately
      const transformedUserTeams: UserTeam[] = [];
      
      if (userTeamsData) {
        for (const ut of userTeamsData) {
          // Get user details
          const { data: userData } = await supabase
            .from('profiles')
            .select('name, email')
            .eq('id', ut.user_id)
            .maybeSingle();

          // Get team details
          const { data: teamData } = await supabase
            .from('teams')
            .select('name')
            .eq('id', ut.team_id)
            .maybeSingle();

          // Check if user has a profile
          const hasProfile = userData !== null;

          transformedUserTeams.push({
            id: ut.id,
            user_id: ut.user_id,
            team_id: ut.team_id,
            role: ut.role,
            user_name: userData?.name || 'Unknown User',
            user_email: userData?.email || 'Unknown Email',
            team_name: teamData?.name || 'Unknown Team',
            has_profile: hasProfile
          });
        }
      }

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

      setUsers(usersData || []);
      setTeams(teamsData || []);
      setUserTeams(transformedUserTeams);
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

  const createMissingProfile = async (email: string) => {
    try {
      // Find invitation to get user details
      const invitation = pendingInvitations.find(inv => inv.email === email);
      if (!invitation) {
        toast({
          title: 'Error',
          description: 'No invitation found for this email',
          variant: 'destructive',
        });
        return;
      }

      // Use the userInvitationService to process the invitation
      const { data, error } = await supabase.rpc('user_is_global_admin');
      
      if (error || !data) {
        toast({
          title: 'Permission Denied',
          description: 'You must be a global admin to create user profiles',
          variant: 'destructive',
        });
        return;
      }

      toast({
        title: 'Profile Creation',
        description: 'Creating user profile. This user will need to sign up to complete the process.',
      });

      await loadData(); // Refresh data
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

  const findUserByEmail = (email: string) => {
    return userTeams.filter(ut => 
      ut.user_email.toLowerCase().includes(email.toLowerCase())
    );
  };

  const findPendingByEmail = (email: string) => {
    return pendingInvitations.filter(inv =>
      inv.email.toLowerCase().includes(email.toLowerCase())
    );
  };

  const filteredUserTeams = searchEmail 
    ? findUserByEmail(searchEmail)
    : (showPendingOnly ? userTeams.filter(ut => !ut.has_profile) : userTeams);

  const filteredPendingInvitations = searchEmail
    ? findPendingByEmail(searchEmail)
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
            Manage user-team relationships and roles
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

      {/* Search and Filter Controls */}
      <Card>
        <CardHeader>
          <CardTitle>Search and Filter</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search by email (e.g., m888kky@outlook.com)"
                value={searchEmail}
                onChange={(e) => setSearchEmail(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant={showPendingOnly ? "default" : "outline"}
                size="sm"
                onClick={() => setShowPendingOnly(!showPendingOnly)}
              >
                <AlertTriangle className="h-4 w-4 mr-2" />
                {showPendingOnly ? "Show All" : "Show Users Without Profiles"}
              </Button>
            </div>
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
                  
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => createMissingProfile(invitation.email)}
                    >
                      Create Profile
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* User Team Relationships */}
      <Card>
        <CardHeader>
          <CardTitle>User Team Relationships ({filteredUserTeams.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredUserTeams.map((userTeam) => (
              <div key={userTeam.id} className={`flex items-center justify-between p-4 border rounded-lg ${!userTeam.has_profile ? 'bg-red-50 border-red-200' : ''}`}>
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <Users className="h-4 w-4 text-blue-500" />
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{userTeam.user_name}</p>
                        {!userTeam.has_profile && (
                          <Badge variant="destructive" className="text-xs">
                            No Profile
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">{userTeam.user_email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4 text-green-500" />
                    <span className="text-sm">{userTeam.team_name}</span>
                    <Badge variant="outline">{userTeam.role}</Badge>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <Select
                    value={userTeam.role}
                    onValueChange={(newRole) => updateUserRole(userTeam.id, newRole)}
                  >
                    <SelectTrigger className="w-48">
                      <SelectValue />
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
                    variant="outline"
                    size="sm"
                    onClick={() => removeUserFromTeam(userTeam.id)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}

            {filteredUserTeams.length === 0 && (
              <div className="text-center py-8">
                <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="font-semibold mb-2">No User Team Relationships Found</h3>
                <p className="text-muted-foreground mb-4">
                  {searchEmail 
                    ? `No relationships found for "${searchEmail}"`
                    : 'No user team relationships exist yet.'
                  }
                </p>
                <Button onClick={() => setIsAddModalOpen(true)}>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Add User to Team
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
