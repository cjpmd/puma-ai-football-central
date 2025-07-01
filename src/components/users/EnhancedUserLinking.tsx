import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Search, Link2, Users, UserCheck, Unlink } from 'lucide-react';

interface UserProfile {
  id: string;
  name: string;
  email: string;
  roles: string[];
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

interface ExistingLink {
  id: string;
  user_id: string;
  player_id?: string;
  staff_id?: string;
  relationship: string;
  player_name?: string;
  staff_name?: string;
  team_name?: string;
}

export const EnhancedUserLinking: React.FC = () => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [existingLinks, setExistingLinks] = useState<ExistingLink[]>([]);
  const [selectedUser, setSelectedUser] = useState<string>('');
  const [linkType, setLinkType] = useState<'player' | 'staff'>('player');
  const [selectedEntity, setSelectedEntity] = useState<string>('');
  const [relationship, setRelationship] = useState<'self' | 'parent' | 'guardian'>('self');
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showLinkModal, setShowLinkModal] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      await Promise.all([
        loadUsers(),
        loadPlayers(),
        loadStaff(),
        loadExistingLinks()
      ]);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load data');
    }
  };

  const loadUsers = async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('name');

    if (error) throw error;
    setUsers(data || []);
  };

  const loadPlayers = async () => {
    const { data, error } = await supabase
      .from('players')
      .select(`
        id, name, team_id,
        teams!inner(name)
      `)
      .eq('status', 'active');

    if (error) throw error;

    const playersWithTeams = data?.map(player => ({
      id: player.id,
      name: player.name,
      team_id: player.team_id,
      team_name: (player as any).teams?.name || 'Unknown Team'
    })) || [];

    setPlayers(playersWithTeams);
  };

  const loadStaff = async () => {
    const { data, error } = await supabase
      .from('team_staff')
      .select(`
        id, name, role, team_id,
        teams!inner(name)
      `);

    if (error) throw error;

    const staffWithTeams = data?.map(staffMember => ({
      id: staffMember.id,
      name: staffMember.name,
      role: staffMember.role,
      team_id: staffMember.team_id,
      team_name: (staffMember as any).teams?.name || 'Unknown Team'
    })) || [];

    setStaff(staffWithTeams);
  };

  const loadExistingLinks = async () => {
    try {
      // Load player links
      const { data: playerLinks, error: playerError } = await supabase
        .from('user_players')
        .select(`
          id, user_id, player_id, relationship,
          players!inner(name, team_id),
          teams!inner(name)
        `);

      if (playerError) throw playerError;

      // Load staff links
      const { data: staffLinks, error: staffError } = await supabase
        .from('user_staff')
        .select(`
          id, user_id, staff_id, relationship,
          team_staff!inner(name, team_id),
          teams!inner(name)
        `);

      if (staffError) throw staffError;

      const allLinks: ExistingLink[] = [
        ...(playerLinks?.map(link => ({
          id: link.id,
          user_id: link.user_id,
          player_id: link.player_id,
          relationship: link.relationship,
          player_name: (link as any).players?.name,
          team_name: (link as any).teams?.name
        })) || []),
        ...(staffLinks?.map(link => ({
          id: link.id,
          user_id: link.user_id,
          staff_id: link.staff_id,
          relationship: link.relationship,
          staff_name: (link as any).team_staff?.name,
          team_name: (link as any).teams?.name
        })) || [])
      ];

      setExistingLinks(allLinks);
    } catch (error) {
      console.error('Error loading existing links:', error);
    }
  };

  const handleCreateLink = async () => {
    if (!selectedUser || !selectedEntity) {
      toast.error('Please select both a user and an entity to link');
      return;
    }

    setIsLoading(true);
    try {
      if (linkType === 'player') {
        const { error } = await supabase
          .from('user_players')
          .insert({
            user_id: selectedUser,
            player_id: selectedEntity,
            relationship: relationship
          });

        if (error) throw error;

        // Update user roles based on relationship
        const { data: profile } = await supabase
          .from('profiles')
          .select('roles')
          .eq('id', selectedUser)
          .single();

        const currentRoles = profile?.roles || [];
        const newRole = relationship === 'self' ? 'player' : 'parent';
        
        if (!currentRoles.includes(newRole)) {
          await supabase
            .from('profiles')
            .update({ roles: [...currentRoles, newRole] })
            .eq('id', selectedUser);
        }

      } else if (linkType === 'staff') {
        const { error } = await supabase
          .from('user_staff')
          .insert({
            user_id: selectedUser,
            staff_id: selectedEntity,
            relationship: relationship
          });

        if (error) throw error;

        // Add staff-related roles
        const { data: profile } = await supabase
          .from('profiles')
          .select('roles')
          .eq('id', selectedUser)
          .single();

        const currentRoles = profile?.roles || [];
        const staffMember = staff.find(s => s.id === selectedEntity);
        const roleToAdd = staffMember?.role || 'team_helper';
        
        if (!currentRoles.includes(roleToAdd)) {
          await supabase
            .from('profiles')
            .update({ roles: [...currentRoles, roleToAdd] })
            .eq('id', selectedUser);
        }
      }

      toast.success('Link created successfully!');
      setSelectedUser('');
      setSelectedEntity('');
      setRelationship('self');
      setShowLinkModal(false);
      await loadData();
    } catch (error: any) {
      console.error('Error creating link:', error);
      toast.error(error.message || 'Failed to create link');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveLink = async (link: ExistingLink) => {
    try {
      if (link.player_id) {
        const { error } = await supabase
          .from('user_players')
          .delete()
          .eq('id', link.id);

        if (error) throw error;
      } else if (link.staff_id) {
        const { error } = await supabase
          .from('user_staff')
          .delete()
          .eq('id', link.id);

        if (error) throw error;
      }

      toast.success('Link removed successfully!');
      await loadData();
    } catch (error: any) {
      console.error('Error removing link:', error);
      toast.error(error.message || 'Failed to remove link');
    }
  };

  const filteredUsers = users.filter(user =>
    user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredEntities = linkType === 'player' 
    ? players.filter(player => 
        player.name.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : staff.filter(staffMember => 
        staffMember.name.toLowerCase().includes(searchTerm.toLowerCase())
      );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Link2 className="h-5 w-5" />
            Enhanced User Linking
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-between items-center mb-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search users or entities..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Dialog open={showLinkModal} onOpenChange={setShowLinkModal}>
              <DialogTrigger asChild>
                <Button>
                  <Link2 className="h-4 w-4 mr-2" />
                  Create Link
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Create User Link</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  {/* User Selection */}
                  <div className="space-y-2">
                    <Label>Select User</Label>
                    <Select value={selectedUser} onValueChange={setSelectedUser}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose user" />
                      </SelectTrigger>
                      <SelectContent>
                        {filteredUsers.map(user => (
                          <SelectItem key={user.id} value={user.id}>
                            <div>
                              <div className="font-medium">{user.name}</div>
                              <div className="text-xs text-muted-foreground">{user.email}</div>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Link Type */}
                  <div className="space-y-2">
                    <Label>Link Type</Label>
                    <Select value={linkType} onValueChange={(value: any) => setLinkType(value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="player">Player</SelectItem>
                        <SelectItem value="staff">Staff</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Entity Selection */}
                  <div className="space-y-2">
                    <Label>Select {linkType === 'player' ? 'Player' : 'Staff Member'}</Label>
                    <Select value={selectedEntity} onValueChange={setSelectedEntity}>
                      <SelectTrigger>
                        <SelectValue placeholder={`Choose ${linkType}`} />
                      </SelectTrigger>
                      <SelectContent>
                        {filteredEntities.map(entity => (
                          <SelectItem key={entity.id} value={entity.id}>
                            <div>
                              <div className="font-medium">{entity.name}</div>
                              <div className="text-xs text-muted-foreground">
                                {entity.team_name}
                                {linkType === 'staff' && ` - ${(entity as StaffMember).role}`}
                              </div>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Relationship */}
                  <div className="space-y-2">
                    <Label>Relationship</Label>
                    <Select value={relationship} onValueChange={(value: any) => setRelationship(value)}>
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

                  <Button 
                    onClick={handleCreateLink}
                    disabled={!selectedUser || !selectedEntity || isLoading}
                    className="w-full"
                  >
                    {isLoading ? 'Creating Link...' : 'Create Link'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* Existing Links */}
          <div className="space-y-3">
            <h3 className="font-semibold">Existing Links ({existingLinks.length})</h3>
            {existingLinks.map(link => {
              const user = users.find(u => u.id === link.user_id);
              return (
                <div key={link.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div>
                      <div className="font-medium">{user?.name || 'Unknown User'}</div>
                      <div className="text-sm text-muted-foreground">{user?.email}</div>
                    </div>
                    <div className="text-muted-foreground">→</div>
                    <div>
                      <div className="font-medium">
                        {link.player_name || link.staff_name}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {link.team_name} ({link.relationship})
                      </div>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleRemoveLink(link)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Unlink className="h-4 w-4" />
                  </Button>
                </div>
              );
            })}
            
            {existingLinks.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No existing links found
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
