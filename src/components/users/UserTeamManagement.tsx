
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
import { Search, UserPlus, Edit, Trash2, Users, Shield } from 'lucide-react';

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
}

export const UserTeamManagement = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [userTeams, setUserTeams] = useState<UserTeam[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchEmail, setSearchEmail] = useState('');
  const [selectedUser, setSelectedUser] = useState<string>('');
  const [selectedTeam, setSelectedTeam] = useState<string>('');
  const [selectedRole, setSelectedRole] = useState<string>('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
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

      // Load user-team relationships
      const { data: userTeamsData, error: userTeamsError } = await supabase
        .from('user_teams')
        .select(`
          id,
          user_id,
          team_id,
          role,
          profiles!user_teams_user_id_fkey(name, email),
          teams!user_teams_team_id_fkey(name)
        `)
        .order('profiles(name)');

      if (userTeamsError) throw userTeamsError;

      // Transform user-team data
      const transformedUserTeams = userTeamsData.map(ut => ({
        id: ut.id,
        user_id: ut.user_id,
        team_id: ut.team_id,
        role: ut.role,
        user_name: ut.profiles?.name || 'Unknown',
        user_email: ut.profiles?.email || 'Unknown',
        team_name: ut.teams?.name || 'Unknown'
      }));

      setUsers(usersData || []);
      setTeams(teamsData || []);
      setUserTeams(transformedUserTeams);
      
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

  const filteredUserTeams = searchEmail 
    ? findUserByEmail(searchEmail)
    : userTeams;

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

      {/* Search */}
      <Card>
        <CardHeader>
          <CardTitle>Search Users</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search by email (e.g., m888kky@outlook.com)"
              value={searchEmail}
              onChange={(e) => setSearchEmail(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* User Team Relationships */}
      <Card>
        <CardHeader>
          <CardTitle>User Team Relationships ({filteredUserTeams.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredUserTeams.map((userTeam) => (
              <div key={userTeam.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <Users className="h-4 w-4 text-blue-500" />
                    <div>
                      <p className="font-medium">{userTeam.user_name}</p>
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
