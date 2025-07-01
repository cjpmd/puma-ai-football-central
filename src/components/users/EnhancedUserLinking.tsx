
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Link2, Unlink, Search, Users, UserX, UserCheck } from 'lucide-react';

interface UserWithLinks {
  id: string;
  name: string;
  email: string;
  roles: string[];
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

interface Player {
  id: string;
  name: string;
  team_name: string;
  team_id: string;
}

interface StaffMember {
  id: string;
  name: string;
  role: string;
  team_name: string;
  team_id: string;
}

export const EnhancedUserLinking: React.FC = () => {
  const [users, setUsers] = useState<UserWithLinks[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState<string>('');
  const [selectedPlayer, setSelectedPlayer] = useState<string>('');
  const [selectedStaff, setSelectedStaff] = useState<string>('');
  const [relationship, setRelationship] = useState<string>('');
  const [linkType, setLinkType] = useState<'player' | 'staff'>('player');
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        loadUsers(),
        loadPlayers(),
        loadStaff()
      ]);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = async () => {
    try {
      console.log('Loading users with links...');
      
      // Get all users
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('name');

      if (profilesError) throw profilesError;

      if (!profiles) {
        setUsers([]);
        return;
      }

      // Get user-player relationships
      const { data: userPlayers, error: userPlayersError } = await supabase
        .from('user_players')
        .select(`
          user_id,
          player_id,
          relationship,
          players!inner(
            id,
            name,
            team_id,
            teams!inner(name)
          )
        `);

      if (userPlayersError) {
        console.error('Error fetching user players:', userPlayersError);
      }

      // Get user-staff relationships
      const { data: userStaff, error: userStaffError } = await supabase
        .from('user_staff')
        .select(`
          user_id,
          staff_id,
          relationship,
          team_staff!inner(
            id,
            name,
            role,
            team_id,
            teams!inner(name)
          )
        `);

      if (userStaffError) {
        console.error('Error fetching user staff:', userStaffError);
      }

      console.log('User-player links:', userPlayers?.length || 0);
      console.log('User-staff links:', userStaff?.length || 0);

      // Combine data
      const usersWithLinks: UserWithLinks[] = profiles.map(profile => {
        // Map player links
        const playerLinks = (userPlayers || [])
          .filter(up => up.user_id === profile.id)
          .map(up => {
            const player = up.players as any;
            const team = player?.teams;
            return {
              id: up.player_id,
              name: player?.name || 'Unknown Player',
              team: team?.name || 'Unknown Team',
              relationship: up.relationship
            };
          });

        // Map staff links
        const staffLinks = (userStaff || [])
          .filter(us => us.user_id === profile.id)
          .map(us => {
            const staff = us.team_staff as any;
            const team = staff?.teams;
            return {
              id: us.staff_id,
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
          roles: Array.isArray(profile.roles) ? profile.roles : [],
          playerLinks,
          staffLinks
        };
      });

      console.log('Processed users with links:', usersWithLinks.length);
      setUsers(usersWithLinks);
    } catch (error) {
      console.error('Error loading users:', error);
      toast({
        title: 'Error',
        description: 'Failed to load users',
        variant: 'destructive',
      });
    }
  };

  const loadPlayers = async () => {
    try {
      const { data, error } = await supabase
        .from('players')
        .select(`
          id,
          name,
          team_id,
          teams!inner(name)
        `)
        .eq('status', 'active')
        .order('name');

      if (error) throw error;

      const playersWithTeams = (data || []).map(player => ({
        id: player.id,
        name: player.name,
        team_name: (player as any).teams?.name || 'Unknown Team',
        team_id: player.team_id
      }));

      setPlayers(playersWithTeams);
    } catch (error) {
      console.error('Error loading players:', error);
    }
  };

  const loadStaff = async () => {
    try {
      const { data, error } = await supabase
        .from('team_staff')
        .select(`
          id,
          name,
          role,
          team_id,
          teams!inner(name)
        `)
        .order('name');

      if (error) throw error;

      const staffWithTeams = (data || []).map(staffMember => ({
        id: staffMember.id,
        name: staffMember.name,
        role: staffMember.role,
        team_name: (staffMember as any).teams?.name || 'Unknown Team',
        team_id: staffMember.team_id
      }));

      setStaff(staffWithTeams);
    } catch (error) {
      console.error('Error loading staff:', error);
    }
  };

  const handleCreateLink = async () => {
    if (!selectedUser || (!selectedPlayer && !selectedStaff) || !relationship) {
      toast({
        title: 'Missing Information',
        description: 'Please select a user, target, and relationship type.',
        variant: 'destructive',
      });
      return;
    }

    try {
      if (linkType === 'player' && selectedPlayer) {
        const { error } = await supabase
          .from('user_players')
          .insert({
            user_id: selectedUser,
            player_id: selectedPlayer,
            relationship
          });

        if (error) throw error;
      } else if (linkType === 'staff' && selectedStaff) {
        const { error } = await supabase
          .from('user_staff')
          .insert({
            user_id: selectedUser,
            staff_id: selectedStaff,
            relationship
          });

        if (error) throw error;
      }

      toast({
        title: 'Success',
        description: 'Link created successfully',
      });

      // Reset form
      setSelectedUser('');
      setSelectedPlayer('');
      setSelectedStaff('');
      setRelationship('');

      // Reload data
      await loadUsers();
    } catch (error: any) {
      console.error('Error creating link:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to create link',
        variant: 'destructive',
      });
    }
  };

  const handleRemoveLink = async (userId: string, linkId: string, linkType: 'player' | 'staff') => {
    try {
      if (linkType === 'player') {
        const { error } = await supabase
          .from('user_players')
          .delete()
          .eq('user_id', userId)
          .eq('player_id', linkId);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('user_staff')
          .delete()
          .eq('user_id', userId)
          .eq('staff_id', linkId);

        if (error) throw error;
      }

      toast({
        title: 'Success',
        description: 'Link removed successfully',
      });

      await loadUsers();
    } catch (error: any) {
      console.error('Error removing link:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to remove link',
        variant: 'destructive',
      });
    }
  };

  const filteredUsers = users.filter(user =>
    user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Get users with links for summary
  const usersWithLinks = users.filter(user => 
    user.playerLinks.length > 0 || user.staffLinks.length > 0
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p>Loading user links...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Summary */}
      <div>
        <h3 className="text-lg font-semibold">Enhanced User Linking</h3>
        <p className="text-sm text-muted-foreground">
          Link users to players or staff members, and manage existing relationships
        </p>
        <div className="flex gap-4 mt-2 text-sm">
          <span className="text-blue-600">Total Users: {users.length}</span>
          <span className="text-green-600">Users with Links: {usersWithLinks.length}</span>
          <span className="text-orange-600">Available Players: {players.length}</span>
          <span className="text-purple-600">Available Staff: {staff.length}</span>
        </div>
      </div>

      {/* Create New Link */}
      <Card>
        <CardHeader>
          <CardTitle>Create New Link</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Select User</label>
              <Select value={selectedUser} onValueChange={setSelectedUser}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose user..." />
                </SelectTrigger>
                <SelectContent>
                  {users.map(user => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.name} ({user.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Link Type</label>
              <Select value={linkType} onValueChange={(value: 'player' | 'staff') => {
                setLinkType(value);
                setSelectedPlayer('');
                setSelectedStaff('');
              }}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="player">Player</SelectItem>
                  <SelectItem value="staff">Staff</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {linkType === 'player' && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Select Player</label>
                <Select value={selectedPlayer} onValueChange={setSelectedPlayer}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose player..." />
                  </SelectTrigger>
                  <SelectContent>
                    {players.map(player => (
                      <SelectItem key={player.id} value={player.id}>
                        {player.name} ({player.team_name})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {linkType === 'staff' && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Select Staff</label>
                <Select value={selectedStaff} onValueChange={setSelectedStaff}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose staff member..." />
                  </SelectTrigger>
                  <SelectContent>
                    {staff.map(staffMember => (
                      <SelectItem key={staffMember.id} value={staffMember.id}>
                        {staffMember.name} ({staffMember.role}, {staffMember.team_name})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium">Relationship</label>
              <Select value={relationship} onValueChange={setRelationship}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose relationship..." />
                </SelectTrigger>
                <SelectContent>
                  {linkType === 'player' ? (
                    <>
                      <SelectItem value="parent">Parent</SelectItem>
                      <SelectItem value="guardian">Guardian</SelectItem>
                      <SelectItem value="self">Self</SelectItem>
                    </>
                  ) : (
                    <>
                      <SelectItem value="self">Self</SelectItem>
                      <SelectItem value="manager">Manager</SelectItem>
                    </>
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button onClick={handleCreateLink} className="w-full">
            <Link2 className="h-4 w-4 mr-2" />
            Create Link
          </Button>
        </CardContent>
      </Card>

      {/* Search and Filter */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
        <Input
          placeholder="Search users..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Users with Links */}
      <div className="space-y-4">
        {filteredUsers.map(user => (
          <Card key={user.id}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-4">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="bg-blue-100 text-blue-800">
                      {user.name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-gray-900">{user.name}</h4>
                    <p className="text-sm text-gray-600">{user.email}</p>
                    
                    <div className="flex flex-wrap gap-1 mt-2">
                      {user.roles.map(role => (
                        <Badge key={role} variant="outline" className="text-xs">
                          {role.replace('_', ' ')}
                        </Badge>
                      ))}
                    </div>

                    {/* Player Links */}
                    {user.playerLinks.length > 0 && (
                      <div className="mt-3">
                        <h5 className="text-xs font-medium text-gray-500 mb-2">Player Links:</h5>
                        <div className="space-y-2">
                          {user.playerLinks.map(link => (
                            <div key={link.id} className="flex items-center justify-between bg-green-50 p-2 rounded">
                              <div className="flex items-center space-x-2">
                                <UserCheck className="h-4 w-4 text-green-600" />
                                <span className="text-sm">
                                  {link.name} ({link.team}) - {link.relationship}
                                </span>
                              </div>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleRemoveLink(user.id, link.id, 'player')}
                                className="text-red-600 hover:text-red-700"
                              >
                                <Unlink className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Staff Links */}
                    {user.staffLinks.length > 0 && (
                      <div className="mt-3">
                        <h5 className="text-xs font-medium text-gray-500 mb-2">Staff Links:</h5>
                        <div className="space-y-2">
                          {user.staffLinks.map(link => (
                            <div key={link.id} className="flex items-center justify-between bg-blue-50 p-2 rounded">
                              <div className="flex items-center space-x-2">
                                <Users className="h-4 w-4 text-blue-600" />
                                <span className="text-sm">
                                  {link.name} ({link.role}, {link.team}) - {link.relationship}
                                </span>
                              </div>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleRemoveLink(user.id, link.id, 'staff')}
                                className="text-red-600 hover:text-red-700"
                              >
                                <Unlink className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {user.playerLinks.length === 0 && user.staffLinks.length === 0 && (
                      <div className="mt-3 text-sm text-gray-500 italic">
                        No links found
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {filteredUsers.length === 0 && (
          <Card className="p-8 text-center">
            <UserX className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No users found</h3>
            <p className="text-gray-600">
              {searchTerm ? 'Try adjusting your search criteria.' : 'No users available.'}
            </p>
          </Card>
        )}
      </div>
    </div>
  );
};
