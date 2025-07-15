import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Link2, UserPlus, Building2, Users, X, QrCode, Hash } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { TeamJoinModal } from '@/components/codes/TeamJoinModal';
import { PlayerLinkModal } from '@/components/codes/PlayerLinkModal';

interface ManageConnectionsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface LinkablePlayer {
  id: string;
  name: string;
  team_name: string;
  linking_code: string;
}

interface ConnectedPlayer {
  id: string;
  name: string;
  squad_number: number;
  team_name: string;
  age_group: string;
  relationship: string;
}

export const ManageConnectionsModal: React.FC<ManageConnectionsModalProps> = ({ 
  isOpen, onClose 
}) => {
  const { user, profile, teams, clubs, refreshUserData } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [teamCode, setTeamCode] = useState('');
  const [clubCode, setClubCode] = useState('');
  const [playerCode, setPlayerCode] = useState('');
  const [availablePlayers, setAvailablePlayers] = useState<LinkablePlayer[]>([]);
  const [connectedPlayers, setConnectedPlayers] = useState<ConnectedPlayer[]>([]);
  const [teamJoinModalOpen, setTeamJoinModalOpen] = useState(false);
  const [playerLinkModalOpen, setPlayerLinkModalOpen] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadAvailablePlayers();
      loadConnectedPlayers();
    }
  }, [isOpen]);

  const loadAvailablePlayers = async () => {
    try {
      // Load players that could be linked to this user as parent
      const { data, error } = await supabase
        .from('players')
        .select(`
          id,
          name,
          linking_code,
          teams!inner(name)
        `)
        .not('linking_code', 'is', null);

      if (error) throw error;

      const players = data?.map(player => ({
        id: player.id,
        name: player.name,
        team_name: (player.teams as any)?.name || 'Unknown Team',
        linking_code: player.linking_code
      })) || [];

      setAvailablePlayers(players);
    } catch (error: any) {
      console.error('Error loading players:', error);
    }
  };

  const loadConnectedPlayers = async () => {
    try {
      const { data, error } = await supabase
        .from('user_players')
        .select(`
          id,
          relationship,
          players!inner(
            id,
            name,
            squad_number,
            teams!inner(
              name,
              age_group
            )
          )
        `)
        .eq('user_id', user.id);

      if (error) throw error;

      const players = data?.map(connection => ({
        id: connection.id,
        name: (connection.players as any).name,
        squad_number: (connection.players as any).squad_number,
        team_name: (connection.players as any).teams?.name || 'Unknown Team',
        age_group: (connection.players as any).teams?.age_group || 'Unknown',
        relationship: connection.relationship
      })) || [];

      setConnectedPlayers(players);
    } catch (error: any) {
      console.error('Error loading connected players:', error);
    }
  };

  const handleRemovePlayerConnection = async (connectionId: string, playerName: string) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('user_players')
        .delete()
        .eq('id', connectionId);

      if (error) throw error;

      toast({
        title: 'Success',
        description: `Removed connection to ${playerName}`
      });

      await loadConnectedPlayers();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleTeamConnection = async () => {
    if (!teamCode.trim()) return;
    
    setLoading(true);
    try {
      // Find team staff with this linking code
      const { data: staffData, error: staffError } = await supabase
        .from('team_staff')
        .select('*, teams(name)')
        .eq('linking_code', teamCode.trim())
        .single();

      if (staffError || !staffData) {
        throw new Error('Invalid team connection code');
      }

      // Link user to staff member
      const { error: linkError } = await supabase
        .from('user_staff')
        .insert({
          user_id: user.id,
          staff_id: staffData.id,
          relationship: 'self'
        });

      if (linkError) throw linkError;

      toast({
        title: 'Success',
        description: `Connected to ${(staffData.teams as any)?.name || 'team'} as ${staffData.role}`
      });

      setTeamCode('');
      await refreshUserData();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClubConnection = async () => {
    if (!clubCode.trim()) return;
    
    setLoading(true);
    try {
      // Find club by serial number or reference number
      const { data: clubData, error: clubError } = await supabase
        .from('clubs')
        .select('*')
        .or(`serial_number.eq.${clubCode.trim()},reference_number.eq.${clubCode.trim()}`)
        .single();

      if (clubError || !clubData) {
        throw new Error('Invalid club connection code');
      }

      // Add user to club with default role
      const { error: linkError } = await supabase
        .from('user_clubs')
        .insert({
          user_id: user.id,
          club_id: clubData.id,
          role: 'member'
        });

      if (linkError) throw linkError;

      toast({
        title: 'Success',
        description: `Connected to ${clubData.name}`
      });

      setClubCode('');
      await refreshUserData();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePlayerConnection = async () => {
    if (!playerCode.trim()) return;
    
    setLoading(true);
    try {
      // Find player with this linking code
      const { data: playerData, error: playerError } = await supabase
        .from('players')
        .select('*, teams(name)')
        .eq('linking_code', playerCode.trim())
        .single();

      if (playerError || !playerData) {
        throw new Error('Invalid player connection code');
      }

      // Link user as parent to player
      const { error: linkError } = await supabase
        .from('user_players')
        .insert({
          user_id: user.id,
          player_id: playerData.id,
          relationship: 'parent'
        });

      if (linkError) throw linkError;

      toast({
        title: 'Success',
        description: `Connected as parent to ${playerData.name}`
      });

      setPlayerCode('');
      await refreshUserData();
      await loadConnectedPlayers();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="h-5 w-5" />
            Manage Connections
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="connect" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="connect">Connect</TabsTrigger>
            <TabsTrigger value="current">Current Connections</TabsTrigger>
          </TabsList>

          <TabsContent value="connect" className="space-y-4">
            {/* New Team Join with Code */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <QrCode className="h-5 w-5" />
                  Join Team with Code
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Use a team join code to connect as a player, parent, or staff member
                </p>
                <Button 
                  onClick={() => setTeamJoinModalOpen(true)}
                  className="w-full"
                >
                  Join Team with Code
                </Button>
              </CardContent>
            </Card>

            {/* New Player Link with Code */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Hash className="h-5 w-5" />
                  Link to Player
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Use a player or parent linking code to connect to a specific player
                </p>
                <Button 
                  onClick={() => setPlayerLinkModalOpen(true)}
                  className="w-full"
                >
                  Link to Player
                </Button>
              </CardContent>
            </Card>

            {/* Legacy Team Connection */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Users className="h-5 w-5" />
                  Connect to Team (Legacy)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label htmlFor="teamCode">Team Connection Code</Label>
                  <Input
                    id="teamCode"
                    value={teamCode}
                    onChange={(e) => setTeamCode(e.target.value)}
                    placeholder="Enter team staff linking code"
                  />
                </div>
                <Button onClick={handleTeamConnection} disabled={loading || !teamCode.trim()}>
                  Connect to Team
                </Button>
              </CardContent>
            </Card>

            {/* Club Connection */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Building2 className="h-5 w-5" />
                  Connect to Club
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label htmlFor="clubCode">Club Code</Label>
                  <Input
                    id="clubCode"
                    value={clubCode}
                    onChange={(e) => setClubCode(e.target.value)}
                    placeholder="Enter club serial or reference number"
                  />
                </div>
                <Button onClick={handleClubConnection} disabled={loading || !clubCode.trim()}>
                  Connect to Club
                </Button>
              </CardContent>
            </Card>

            {/* Legacy Player Connection */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <UserPlus className="h-5 w-5" />
                  Connect as Parent (Legacy)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label htmlFor="playerCode">Player Linking Code</Label>
                  <Input
                    id="playerCode"
                    value={playerCode}
                    onChange={(e) => setPlayerCode(e.target.value)}
                    placeholder="Enter player linking code"
                  />
                </div>
                <Button onClick={handlePlayerConnection} disabled={loading || !playerCode.trim()}>
                  Connect as Parent
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="current" className="space-y-4">
            {/* Current Teams */}
            {teams && teams.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Connected Teams</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {teams.map((team) => (
                      <div key={team.id} className="flex items-center justify-between p-2 border rounded">
                        <div>
                          <div className="font-medium">{team.name}</div>
                          <div className="text-sm text-muted-foreground">{team.ageGroup} • {team.gameFormat}</div>
                        </div>
                        <Badge variant="outline">Team Member</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Current Clubs */}
            {clubs && clubs.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Connected Clubs</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {clubs.map((club) => (
                      <div key={club.id} className="flex items-center justify-between p-2 border rounded">
                        <div>
                          <div className="font-medium">{club.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {club.serialNumber && `Serial: ${club.serialNumber}`}
                          </div>
                        </div>
                        <Badge variant="outline">Club Member</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Connected Players */}
            {connectedPlayers && connectedPlayers.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Connected Players</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {connectedPlayers.map((player) => (
                      <div key={player.id} className="flex items-center justify-between p-2 border rounded">
                        <div>
                          <div className="font-medium">{player.name} #{player.squad_number}</div>
                          <div className="text-sm text-muted-foreground">
                            {player.team_name} • {player.age_group}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{player.relationship}</Badge>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleRemovePlayerConnection(player.id, player.name)}
                            disabled={loading}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Current Roles */}
            {profile?.roles && profile.roles.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Your Roles</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {profile.roles.map((role) => (
                      <Badge key={role} variant="secondary">
                        {role.replace('_', ' ').toUpperCase()}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {(!teams || teams.length === 0) && (!clubs || clubs.length === 0) && (!connectedPlayers || connectedPlayers.length === 0) && (
              <div className="text-center py-8 text-muted-foreground">
                <Link2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No connections found. Use the Connect tab to link your account.</p>
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* New Code-Based Modals */}
        <TeamJoinModal 
          isOpen={teamJoinModalOpen} 
          onClose={() => setTeamJoinModalOpen(false)}
          onSuccess={refreshUserData}
        />
        <PlayerLinkModal 
          isOpen={playerLinkModalOpen} 
          onClose={() => setPlayerLinkModalOpen(false)}
          onSuccess={refreshUserData}
        />
      </DialogContent>
    </Dialog>
  );
};