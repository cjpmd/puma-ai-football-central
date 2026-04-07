import { logger } from '@/lib/logger';
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Trash2, Plus, Users, Link2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface TeamAssociation {
  user_id: string;
  team_id: string;
  role: string;
  created_at: string;
  team_name?: string;
}

interface PlayerLink {
  id: string;
  user_id: string;
  player_id: string;
  relationship: string;
  created_at: string;
  player_name?: string;
  team_name?: string;
}

interface AdminAssociationManagerProps {
  userId: string;
  onUpdate?: () => void;
}

const STAFF_ROLES = [
  { value: 'team_manager', label: 'Team Manager' },
  { value: 'manager', label: 'Manager' },
  { value: 'team_assistant_manager', label: 'Assistant Manager' },
  { value: 'team_coach', label: 'Coach' },
  { value: 'team_helper', label: 'Helper' },
  { value: 'team_parent', label: 'Parent' },
  { value: 'staff', label: 'Staff' },
];

export const AdminAssociationManager: React.FC<AdminAssociationManagerProps> = ({
  userId,
  onUpdate
}) => {
  const { toast } = useToast();
  const [teamAssociations, setTeamAssociations] = useState<TeamAssociation[]>([]);
  const [playerLinks, setPlayerLinks] = useState<PlayerLink[]>([]);
  const [allTeams, setAllTeams] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [addingTeam, setAddingTeam] = useState(false);
  const [newTeamId, setNewTeamId] = useState('');
  const [newRole, setNewRole] = useState('team_coach');

  useEffect(() => {
    if (userId) loadAll();
  }, [userId]);

  const loadAll = async () => {
    setLoading(true);
    try {
      await Promise.all([loadTeamAssociations(), loadPlayerLinks(), loadAllTeams()]);
    } finally {
      setLoading(false);
    }
  };

  const loadTeamAssociations = async () => {
    const { data, error } = await supabase
      .from('user_teams')
      .select('user_id, team_id, role, created_at')
      .eq('user_id', userId);

    if (error) {
      logger.error('Error loading team associations:', error);
      return;
    }

    if (data && data.length > 0) {
      const teamIds = [...new Set(data.map(d => d.team_id))];
      const { data: teams } = await supabase
        .from('teams')
        .select('id, name')
        .in('id', teamIds);

      const teamMap = new Map((teams || []).map(t => [t.id, t.name]));
      setTeamAssociations(data.map(d => ({
        ...d,
        team_name: teamMap.get(d.team_id) || 'Unknown'
      })));
    } else {
      setTeamAssociations([]);
    }
  };

  const loadPlayerLinks = async () => {
    const { data, error } = await supabase
      .from('user_players')
      .select('id, user_id, player_id, relationship, created_at')
      .eq('user_id', userId);

    if (error) {
      logger.error('Error loading player links:', error);
      return;
    }

    if (data && data.length > 0) {
      const playerIds = data.map(d => d.player_id);
      const { data: players } = await supabase
        .from('players')
        .select('id, name, team_id')
        .in('id', playerIds);

      const teamIds = [...new Set((players || []).map(p => p.team_id))];
      const { data: teams } = await supabase
        .from('teams')
        .select('id, name')
        .in('id', teamIds);

      const teamMap = new Map((teams || []).map(t => [t.id, t.name]));
      const playerMap = new Map((players || []).map(p => [p.id, { name: p.name, team_name: teamMap.get(p.team_id) || '' }]));

      setPlayerLinks(data.map(d => ({
        ...d,
        player_name: playerMap.get(d.player_id)?.name || 'Unknown',
        team_name: playerMap.get(d.player_id)?.team_name || ''
      })));
    } else {
      setPlayerLinks([]);
    }
  };

  const loadAllTeams = async () => {
    const { data } = await supabase
      .from('teams')
      .select('id, name')
      .order('name');
    setAllTeams(data || []);
  };

  const handleChangeRole = async (teamId: string, oldRole: string, newRoleValue: string) => {
    try {
      const { error } = await supabase
        .from('user_teams')
        .update({ role: newRoleValue })
        .eq('user_id', userId)
        .eq('team_id', teamId)
        .eq('role', oldRole);

      if (error) throw error;
      toast({ title: 'Role updated' });
      await loadTeamAssociations();
      onUpdate?.();
    } catch (error: any) {
      logger.error('Error updating role:', error);
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const handleRemoveTeamAssociation = async (teamId: string, role: string) => {
    if (!confirm('Remove this team association?')) return;
    try {
      const { error } = await supabase
        .from('user_teams')
        .delete()
        .eq('user_id', userId)
        .eq('team_id', teamId)
        .eq('role', role);

      if (error) throw error;
      toast({ title: 'Association removed' });
      await loadTeamAssociations();
      onUpdate?.();
    } catch (error: any) {
      logger.error('Error removing association:', error);
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const handleAddTeamAssociation = async () => {
    if (!newTeamId || !newRole) return;
    try {
      const { error } = await supabase
        .from('user_teams')
        .insert({ user_id: userId, team_id: newTeamId, role: newRole });

      if (error) {
        if (error.code === '23505') {
          toast({ title: 'Error', description: 'User already has this role for this team', variant: 'destructive' });
          return;
        }
        throw error;
      }
      toast({ title: 'Association added' });
      setAddingTeam(false);
      setNewTeamId('');
      setNewRole('team_coach');
      await loadTeamAssociations();
      onUpdate?.();
    } catch (error: any) {
      logger.error('Error adding association:', error);
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const handleRemovePlayerLink = async (linkId: string) => {
    if (!confirm('Remove this player link? This will unlink the parent/player relationship.')) return;
    try {
      const { error } = await supabase
        .from('user_players')
        .delete()
        .eq('id', linkId);

      if (error) throw error;
      toast({ title: 'Player link removed' });
      await loadPlayerLinks();
      onUpdate?.();
    } catch (error: any) {
      logger.error('Error removing player link:', error);
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const formatRole = (role: string) => {
    return STAFF_ROLES.find(r => r.value === role)?.label || role.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  if (loading) {
    return <div className="flex items-center justify-center p-4"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div></div>;
  }

  return (
    <div className="space-y-6">
      {/* Team Associations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Team Associations ({teamAssociations.length})
            </span>
            <Button size="sm" variant="outline" onClick={() => setAddingTeam(!addingTeam)}>
              <Plus className="h-4 w-4 mr-1" />
              Add to Team
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {addingTeam && (
            <div className="mb-4 p-4 border rounded-lg space-y-3">
              <div>
                <Label>Team</Label>
                <Select value={newTeamId} onValueChange={setNewTeamId}>
                  <SelectTrigger><SelectValue placeholder="Select team" /></SelectTrigger>
                  <SelectContent>
                    {allTeams.map(t => (
                      <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Role</Label>
                <Select value={newRole} onValueChange={setNewRole}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STAFF_ROLES.map(r => (
                      <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={handleAddTeamAssociation}>Add</Button>
                <Button size="sm" variant="outline" onClick={() => setAddingTeam(false)}>Cancel</Button>
              </div>
            </div>
          )}

          {teamAssociations.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Team</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {teamAssociations.map((assoc) => (
                  <TableRow key={`${assoc.team_id}-${assoc.role}`}>
                    <TableCell className="font-medium">{assoc.team_name}</TableCell>
                    <TableCell>
                      <Select
                        value={assoc.role}
                        onValueChange={(val) => handleChangeRole(assoc.team_id, assoc.role, val)}
                      >
                        <SelectTrigger className="w-[180px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {STAFF_ROLES.map(r => (
                            <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(assoc.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => handleRemoveTeamAssociation(assoc.team_id, assoc.role)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">No team associations</p>
          )}
        </CardContent>
      </Card>

      {/* Player Links */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Link2 className="h-5 w-5" />
            Player Links ({playerLinks.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {playerLinks.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Player</TableHead>
                  <TableHead>Team</TableHead>
                  <TableHead>Relationship</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {playerLinks.map((link) => (
                  <TableRow key={link.id}>
                    <TableCell className="font-medium">{link.player_name}</TableCell>
                    <TableCell>{link.team_name}</TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {link.relationship === 'self' ? 'Self (Player)' : 'Parent'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => handleRemovePlayerLink(link.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">No player links</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
