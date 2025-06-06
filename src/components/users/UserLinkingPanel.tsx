import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Search, Link2, Users, UserCheck } from 'lucide-react';

interface UnlinkedUser {
  id: string;
  name: string;
  email: string;
  roles: string[];
  created_at: string;
  team_names: string[];
}

interface LinkableEntity {
  id: string;
  name: string;
  type: 'player' | 'staff';
  team_name?: string;
  role?: string;
}

export const UserLinkingPanel: React.FC = () => {
  const { teams, user } = useAuth();
  const [unlinkedUsers, setUnlinkedUsers] = useState<UnlinkedUser[]>([]);
  const [availableEntities, setAvailableEntities] = useState<LinkableEntity[]>([]);
  const [selectedUser, setSelectedUser] = useState<string>('');
  const [selectedEntity, setSelectedEntity] = useState<string>('');
  const [linkType, setLinkType] = useState<'self' | 'parent' | 'guardian'>('self');
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadUnlinkedUsers();
    loadAvailableEntities();
  }, []);

  const loadUnlinkedUsers = async () => {
    try {
      // Get all users with their team associations
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select(`
          *,
          user_teams!inner(
            team_id,
            teams!inner(name)
          )
        `);

      if (error) throw error;

      // Get users who have player or staff links
      const { data: playerLinks } = await supabase
        .from('user_players')
        .select('user_id');

      const { data: staffLinks } = await supabase
        .from('user_staff')
        .select('user_id');

      const linkedUserIds = new Set([
        ...(playerLinks?.map(pl => pl.user_id) || []),
        ...(staffLinks?.map(sl => sl.user_id) || [])
      ]);

      // Filter users who have team associations but no player/staff links
      const unlinked = profiles?.filter(profile => 
        !linkedUserIds.has(profile.id) && profile.id !== user?.id
      ).map(profile => ({
        ...profile,
        team_names: (profile as any).user_teams?.map((ut: any) => ut.teams.name) || []
      })) || [];

      setUnlinkedUsers(unlinked);
    } catch (error) {
      console.error('Error loading unlinked users:', error);
      toast.error('Failed to load unlinked users');
    }
  };

  const loadAvailableEntities = async () => {
    try {
      const entities: LinkableEntity[] = [];

      // Load players without user links
      const { data: players, error: playersError } = await supabase
        .from('players')
        .select(`
          id, name, team_id,
          teams!inner(name)
        `)
        .eq('status', 'active');

      if (playersError) throw playersError;

      // Get players without user links
      const { data: playerLinks } = await supabase
        .from('user_players')
        .select('player_id');

      const linkedPlayerIds = new Set(playerLinks?.map(pl => pl.player_id) || []);

      players?.forEach(player => {
        if (!linkedPlayerIds.has(player.id)) {
          entities.push({
            id: player.id,
            name: player.name,
            type: 'player',
            team_name: (player as any).teams?.name
          });
        }
      });

      // Load staff without user links
      const { data: staff, error: staffError } = await supabase
        .from('team_staff')
        .select(`
          id, name, role, team_id,
          teams!inner(name)
        `);

      if (staffError) throw staffError;

      const { data: staffLinks } = await supabase
        .from('user_staff')
        .select('staff_id');

      const linkedStaffIds = new Set(staffLinks?.map(sl => sl.staff_id) || []);

      staff?.forEach(staffMember => {
        if (!linkedStaffIds.has(staffMember.id)) {
          entities.push({
            id: staffMember.id,
            name: staffMember.name,
            type: 'staff',
            role: staffMember.role,
            team_name: (staffMember as any).teams?.name
          });
        }
      });

      setAvailableEntities(entities);
    } catch (error) {
      console.error('Error loading available entities:', error);
      toast.error('Failed to load available entities');
    }
  };

  const handleLinkUser = async () => {
    if (!selectedUser || !selectedEntity) {
      toast.error('Please select both a user and an entity to link');
      return;
    }

    setIsLoading(true);
    try {
      const entity = availableEntities.find(e => e.id === selectedEntity);
      if (!entity) throw new Error('Entity not found');

      if (entity.type === 'player') {
        // Link user to player
        const { error } = await supabase
          .from('user_players')
          .insert({
            user_id: selectedUser,
            player_id: selectedEntity,
            relationship: linkType
          });

        if (error) throw error;

        // If linking as self, add player role
        if (linkType === 'self') {
          const { data: profile } = await supabase
            .from('profiles')
            .select('roles')
            .eq('id', selectedUser)
            .single();

          const currentRoles = profile?.roles || [];
          if (!currentRoles.includes('player')) {
            await supabase
              .from('profiles')
              .update({ roles: [...currentRoles, 'player'] })
              .eq('id', selectedUser);
          }
        } else {
          // If linking as parent/guardian, add parent role
          const { data: profile } = await supabase
            .from('profiles')
            .select('roles')
            .eq('id', selectedUser)
            .single();

          const currentRoles = profile?.roles || [];
          if (!currentRoles.includes('parent')) {
            await supabase
              .from('profiles')
              .update({ roles: [...currentRoles, 'parent'] })
              .eq('id', selectedUser);
          }
        }

        // Add user to team
        const { data: player } = await supabase
          .from('players')
          .select('team_id')
          .eq('id', selectedEntity)
          .single();

        if (player) {
          await supabase
            .from('user_teams')
            .insert({
              user_id: selectedUser,
              team_id: player.team_id,
              role: linkType === 'self' ? 'player' : 'parent'
            });
        }
      } else if (entity.type === 'staff') {
        // Link user to staff
        const { error } = await supabase
          .from('user_staff')
          .insert({
            user_id: selectedUser,
            staff_id: selectedEntity,
            relationship: linkType
          });

        if (error) throw error;

        // Add staff role
        const { data: profile } = await supabase
          .from('profiles')
          .select('roles')
          .eq('id', selectedUser)
          .single();

        const currentRoles = profile?.roles || [];
        if (!currentRoles.includes('staff')) {
          await supabase
            .from('profiles')
            .update({ roles: [...currentRoles, 'staff'] })
            .eq('id', selectedUser);
        }

        // Add user to team
        const { data: staff } = await supabase
          .from('team_staff')
          .select('team_id')
          .eq('id', selectedEntity)
          .single();

        if (staff) {
          await supabase
            .from('user_teams')
            .insert({
              user_id: selectedUser,
              team_id: staff.team_id,
              role: 'staff'
            });
        }
      }

      toast.success('User linked successfully!');
      setSelectedUser('');
      setSelectedEntity('');
      setLinkType('self');
      loadUnlinkedUsers();
      loadAvailableEntities();
    } catch (error: any) {
      console.error('Error linking user:', error);
      toast.error(error.message || 'Failed to link user');
    } finally {
      setIsLoading(false);
    }
  };

  const filteredUsers = unlinkedUsers.filter(user =>
    user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredEntities = availableEntities.filter(entity =>
    entity.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Link2 className="h-5 w-5" />
            Manual User Linking
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Search Users/Entities</Label>
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
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Select User</Label>
              <Select value={selectedUser} onValueChange={setSelectedUser}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose user" />
                </SelectTrigger>
                <SelectContent>
                  {filteredUsers.map(user => (
                    <SelectItem key={user.id} value={user.id}>
                      <div className="flex items-center gap-2">
                        <div>
                          <div className="font-medium">{user.name}</div>
                          <div className="text-xs text-muted-foreground">{user.email}</div>
                        </div>
                        <div className="flex gap-1">
                          {user.roles.map(role => (
                            <Badge key={role} variant="outline" className="text-xs">
                              {role}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Select Player/Staff</Label>
              <Select value={selectedEntity} onValueChange={setSelectedEntity}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose entity" />
                </SelectTrigger>
                <SelectContent>
                  {filteredEntities.map(entity => (
                    <SelectItem key={entity.id} value={entity.id}>
                      <div className="flex items-center gap-2">
                        <Badge variant={entity.type === 'player' ? 'default' : 'secondary'}>
                          {entity.type}
                        </Badge>
                        <div>
                          <div className="font-medium">{entity.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {entity.team_name} {entity.role && `- ${entity.role}`}
                          </div>
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Relationship</Label>
              <Select value={linkType} onValueChange={(value: any) => setLinkType(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="self">Self</SelectItem>
                  <SelectItem value="parent">Parent</SelectItem>
                  <SelectItem value="guardian">Guardian</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button 
            onClick={handleLinkUser}
            disabled={!selectedUser || !selectedEntity || isLoading}
            className="w-full"
          >
            {isLoading ? 'Linking...' : 'Link User'}
          </Button>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Users Without Player/Staff Links ({filteredUsers.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              These users have team access but aren't linked to any player or staff profile.
            </p>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {filteredUsers.map(user => (
                <div key={user.id} className="flex items-center justify-between p-2 border rounded">
                  <div>
                    <div className="font-medium">{user.name}</div>
                    <div className="text-sm text-muted-foreground">{user.email}</div>
                    <div className="flex gap-1 mt-1">
                      {user.roles.map(role => (
                        <Badge key={role} variant="outline" className="text-xs">
                          {role}
                        </Badge>
                      ))}
                    </div>
                    {user.team_names.length > 0 && (
                      <div className="text-xs text-blue-600 mt-1">
                        Teams: {user.team_names.join(', ')}
                      </div>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(user.created_at).toLocaleDateString()}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserCheck className="h-5 w-5" />
              Available Entities ({filteredEntities.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {filteredEntities.map(entity => (
                <div key={entity.id} className="flex items-center justify-between p-2 border rounded">
                  <div>
                    <div className="flex items-center gap-2">
                      <Badge variant={entity.type === 'player' ? 'default' : 'secondary'}>
                        {entity.type}
                      </Badge>
                      <span className="font-medium">{entity.name}</span>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {entity.team_name} {entity.role && `- ${entity.role}`}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
