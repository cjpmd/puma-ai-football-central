import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Users, UserPlus, Search, Filter, Mail, Phone, Calendar, Shield, Link2 } from 'lucide-react';
import { UserInvitationModal } from './UserInvitationModal';
import { UserLinkingPanel } from './UserLinkingPanel';
import { DualRoleManagement } from './DualRoleManagement';
import { BulkUserImport } from './BulkUserImport';
import { InvitationResendPanel } from './InvitationResendPanel';

interface UserProfile {
  id: string;
  name: string;
  email: string;
  phone?: string;
  roles: string[];
  created_at: string;
  teams: Array<{
    id: string;
    name: string;
    role: string;
  }>;
  clubs: Array<{
    id: string;
    name: string;
    role: string;
  }>;
  playerLinks: Array<{
    id: string;
    name: string;
    team: string;
    relationship: string;
  }>;
  staffLinks: Array<{
    id: string;
    name: string;
    team: string;
    role: string;
    relationship: string;
  }>;
}

export const UserManagementSystem = () => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [showInviteModal, setShowInviteModal] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    loadUsers();
  }, []);

  useEffect(() => {
    filterUsers();
  }, [users, searchTerm, roleFilter]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      console.log('Loading users...');

      // Get all profiles with basic info
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*');

      if (profilesError) throw profilesError;

      if (!profiles || profiles.length === 0) {
        setUsers([]);
        return;
      }

      // Get user-team relationships separately
      const { data: userTeamsData, error: userTeamsError } = await supabase
        .from('user_teams')
        .select('user_id, role, team_id');

      if (userTeamsError) console.error('Error fetching user teams:', userTeamsError);

      // Get teams data separately
      const { data: teamsData, error: teamsError } = await supabase
        .from('teams')
        .select('id, name');

      if (teamsError) console.error('Error fetching teams:', teamsError);

      // Get user-club relationships separately
      const { data: userClubsData, error: userClubsError } = await supabase
        .from('user_clubs')
        .select('user_id, role, club_id');

      if (userClubsError) console.error('Error fetching user clubs:', userClubsError);

      // Get clubs data separately
      const { data: clubsData, error: clubsError } = await supabase
        .from('clubs')
        .select('id, name');

      if (clubsError) console.error('Error fetching clubs:', clubsError);

      // Get user-player relationships
      const { data: userPlayersData, error: userPlayersError } = await supabase
        .from('user_players')
        .select('user_id, relationship, player_id');

      if (userPlayersError) console.error('Error fetching user players:', userPlayersError);

      // Get players data separately
      const { data: playersData, error: playersError } = await supabase
        .from('players')
        .select('id, name, team_id');

      if (playersError) console.error('Error fetching players:', playersError);

      // Get user-staff relationships
      const { data: userStaffData, error: userStaffError } = await supabase
        .from('user_staff')
        .select('user_id, relationship, staff_id');

      if (userStaffError) console.error('Error fetching user staff:', userStaffError);

      // Get staff data separately
      const { data: staffData, error: staffError } = await supabase
        .from('team_staff')
        .select('id, name, role, team_id');

      if (staffError) console.error('Error fetching staff:', staffError);

      // Process and combine all data
      const processedUsers: UserProfile[] = profiles.map(profile => {
        // Map user teams
        const userTeams = (userTeamsData || [])
          .filter(ut => ut.user_id === profile.id)
          .map(ut => {
            const team = (teamsData || []).find(t => t.id === ut.team_id);
            return {
              id: team?.id || '',
              name: team?.name || 'Unknown Team',
              role: ut.role
            };
          });

        // Map user clubs
        const userClubs = (userClubsData || [])
          .filter(uc => uc.user_id === profile.id)
          .map(uc => {
            const club = (clubsData || []).find(c => c.id === uc.club_id);
            return {
              id: club?.id || '',
              name: club?.name || 'Unknown Club',
              role: uc.role
            };
          });

        // Map user players
        const userPlayers = (userPlayersData || [])
          .filter(up => up.user_id === profile.id)
          .map(up => {
            const player = (playersData || []).find(p => p.id === up.player_id);
            const team = player ? (teamsData || []).find(t => t.id === player.team_id) : null;
            return {
              id: player?.id || '',
              name: player?.name || 'Unknown Player',
              team: team?.name || 'Unknown Team',
              relationship: up.relationship
            };
          });

        // Map user staff
        const userStaffMembers = (userStaffData || [])
          .filter(us => us.user_id === profile.id)
          .map(us => {
            const staff = (staffData || []).find(s => s.id === us.staff_id);
            const team = staff ? (teamsData || []).find(t => t.id === staff.team_id) : null;
            return {
              id: staff?.id || '',
              name: staff?.name || 'Unknown Staff',
              team: team?.name || 'Unknown Team',
              role: staff?.role || 'Unknown Role',
              relationship: us.relationship
            };
          });

        return {
          id: profile.id,
          name: profile.name || 'Unknown',
          email: profile.email || '',
          phone: profile.phone || '',
          roles: Array.isArray(profile.roles) ? profile.roles : [],
          created_at: profile.created_at,
          teams: userTeams,
          clubs: userClubs,
          playerLinks: userPlayers,
          staffLinks: userStaffMembers
        };
      });

      console.log('Processed users:', processedUsers);
      setUsers(processedUsers);
    } catch (error: any) {
      console.error('Error loading users:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to load users',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const filterUsers = () => {
    let filtered = users;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(user =>
        user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Role filter
    if (roleFilter !== 'all') {
      filtered = filtered.filter(user =>
        user.roles.includes(roleFilter)
      );
    }

    setFilteredUsers(filtered);
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'global_admin': return 'bg-red-500';
      case 'club_admin': return 'bg-blue-500';
      case 'team_manager': return 'bg-green-500';
      case 'coach': return 'bg-purple-500';
      case 'staff': return 'bg-orange-500';
      case 'parent': return 'bg-pink-500';
      case 'player': return 'bg-cyan-500';
      default: return 'bg-gray-500';
    }
  };

  const formatRoleName = (role: string): string => {
    return role.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  const [activeTab, setActiveTab] = useState('users');

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p>Loading users...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">User Management</h2>
          <p className="text-muted-foreground">
            Manage users, roles, and permissions across your organization
          </p>
        </div>
        <Button
          onClick={() => setShowInviteModal(true)}
          className="bg-puma-blue-500 hover:bg-puma-blue-600"
        >
          <UserPlus className="h-4 w-4 mr-2" />
          Invite User
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="linking">Manual Linking</TabsTrigger>
          <TabsTrigger value="dual-roles">Dual Roles</TabsTrigger>
          <TabsTrigger value="bulk-import">Bulk Import</TabsTrigger>
          <TabsTrigger value="invitations">Invitations</TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="mt-6">
          {/* Filters */}
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by name or email..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                </div>
                <div className="min-w-[200px]">
                  <Select value={roleFilter} onValueChange={setRoleFilter}>
                    <SelectTrigger>
                      <Filter className="h-4 w-4 mr-2" />
                      <SelectValue placeholder="Filter by role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Roles</SelectItem>
                      <SelectItem value="global_admin">Global Admin</SelectItem>
                      <SelectItem value="club_admin">Club Admin</SelectItem>
                      <SelectItem value="team_manager">Team Manager</SelectItem>
                      <SelectItem value="coach">Coach</SelectItem>
                      <SelectItem value="staff">Staff</SelectItem>
                      <SelectItem value="parent">Parent</SelectItem>
                      <SelectItem value="player">Player</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Users className="h-8 w-8 text-puma-blue-500" />
                  <div>
                    <p className="text-sm text-muted-foreground">Total Users</p>
                    <p className="text-2xl font-bold">{users.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Shield className="h-8 w-8 text-green-500" />
                  <div>
                    <p className="text-sm text-muted-foreground">Admins</p>
                    <p className="text-2xl font-bold">
                      {users.filter(u => u.roles.some(r => r.includes('admin'))).length}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Link2 className="h-8 w-8 text-purple-500" />
                  <div>
                    <p className="text-sm text-muted-foreground">Linked Accounts</p>
                    <p className="text-2xl font-bold">
                      {users.filter(u => u.playerLinks.length > 0 || u.staffLinks.length > 0).length}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Calendar className="h-8 w-8 text-orange-500" />
                  <div>
                    <p className="text-sm text-muted-foreground">Active This Month</p>
                    <p className="text-2xl font-bold">
                      {users.filter(u => {
                        const oneMonthAgo = new Date();
                        oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
                        return new Date(u.created_at) > oneMonthAgo;
                      }).length}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Users List */}
          <div className="space-y-4">
            {filteredUsers.length === 0 ? (
              <Card className="border-dashed border-2">
                <CardContent className="py-8 text-center">
                  <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="font-semibold mb-2">No Users Found</h3>
                  <p className="text-muted-foreground mb-4">
                    {searchTerm || roleFilter !== 'all' 
                      ? 'No users match your current filters.'
                      : 'No users have been created yet.'
                    }
                  </p>
                  {!searchTerm && roleFilter === 'all' && (
                    <Button
                      onClick={() => setShowInviteModal(true)}
                      className="bg-puma-blue-500 hover:bg-puma-blue-600"
                    >
                      Invite First User
                    </Button>
                  )}
                </CardContent>
              </Card>
            ) : (
              filteredUsers.map((user) => (
                <Card key={user.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-4 flex-1">
                        <Avatar className="h-12 w-12">
                          <AvatarFallback className="bg-puma-blue-100 text-puma-blue-500">
                            {user.name.substring(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        
                        <div className="flex-1 space-y-3">
                          <div>
                            <div className="flex items-center gap-3 mb-2">
                              <h4 className="font-semibold text-lg">{user.name}</h4>
                              <div className="flex flex-wrap gap-1">
                                {user.roles.map((role) => (
                                  <Badge 
                                    key={role} 
                                    className={`text-white ${getRoleColor(role)}`}
                                  >
                                    {formatRoleName(role)}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
                              <div className="flex items-center gap-1">
                                <Mail className="h-3 w-3" />
                                <span>{user.email}</span>
                              </div>
                              {user.phone && (
                                <div className="flex items-center gap-1">
                                  <Phone className="h-3 w-3" />
                                  <span>{user.phone}</span>
                                </div>
                              )}
                              <div className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                <span>Joined {new Date(user.created_at).toLocaleDateString()}</span>
                              </div>
                            </div>
                          </div>

                          <Tabs defaultValue="teams" className="w-full">
                            <TabsList className="grid grid-cols-4 w-fit">
                              <TabsTrigger value="teams">Teams</TabsTrigger>
                              <TabsTrigger value="clubs">Clubs</TabsTrigger>
                              <TabsTrigger value="players">Players</TabsTrigger>
                              <TabsTrigger value="staff">Staff</TabsTrigger>
                            </TabsList>

                            <TabsContent value="teams" className="mt-3">
                              {user.teams.length > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                  {user.teams.map((team) => (
                                    <div key={team.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                                      <span className="font-medium">{team.name}</span>
                                      <Badge variant="outline">{formatRoleName(team.role)}</Badge>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-sm text-muted-foreground">No team associations</p>
                              )}
                            </TabsContent>

                            <TabsContent value="clubs" className="mt-3">
                              {user.clubs.length > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                  {user.clubs.map((club) => (
                                    <div key={club.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                                      <span className="font-medium">{club.name}</span>
                                      <Badge variant="outline">{formatRoleName(club.role)}</Badge>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-sm text-muted-foreground">No club associations</p>
                              )}
                            </TabsContent>

                            <TabsContent value="players" className="mt-3">
                              {user.playerLinks.length > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                  {user.playerLinks.map((player) => (
                                    <div key={player.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                                      <div>
                                        <span className="font-medium">{player.name}</span>
                                        <p className="text-xs text-muted-foreground">{player.team}</p>
                                      </div>
                                      <Badge variant="outline">{formatRoleName(player.relationship)}</Badge>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-sm text-muted-foreground">No player links</p>
                              )}
                            </TabsContent>

                            <TabsContent value="staff" className="mt-3">
                              {user.staffLinks.length > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                  {user.staffLinks.map((staff) => (
                                    <div key={staff.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                                      <div>
                                        <span className="font-medium">{staff.name}</span>
                                        <p className="text-xs text-muted-foreground">{staff.team} - {formatRoleName(staff.role)}</p>
                                      </div>
                                      <Badge variant="outline">{formatRoleName(staff.relationship)}</Badge>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-sm text-muted-foreground">No staff links</p>
                              )}
                            </TabsContent>
                          </Tabs>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="linking" className="mt-6">
          <UserLinkingPanel />
        </TabsContent>

        <TabsContent value="dual-roles" className="mt-6">
          <DualRoleManagement />
        </TabsContent>

        <TabsContent value="bulk-import" className="mt-6">
          <BulkUserImport />
        </TabsContent>

        <TabsContent value="invitations" className="mt-6">
          <InvitationResendPanel />
        </TabsContent>
      </Tabs>

      <UserInvitationModal
        isOpen={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        onInviteSent={loadUsers}
      />
    </div>
  );
};
