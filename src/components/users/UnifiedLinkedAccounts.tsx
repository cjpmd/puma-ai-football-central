import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { 
  Link2, 
  Users, 
  Building2, 
  User, 
  X, 
  Plus,
  UserPlus,
  Shield,
  Trophy,
  QrCode
} from 'lucide-react';
import { TeamJoinModal } from '@/components/codes/TeamJoinModal';
import { PlayerLinkModal } from '@/components/codes/PlayerLinkModal';

interface LinkedEntity {
  id: string;
  type: 'team' | 'club' | 'player' | 'staff';
  name: string;
  role?: string;
  relationship?: string;
  context?: string;
  canRemove: boolean;
}

interface UnifiedLinkedAccountsProps {
  isOpen: boolean;
  onClose: () => void;
  onUpdate?: () => void;
}

export const UnifiedLinkedAccounts: React.FC<UnifiedLinkedAccountsProps> = ({
  isOpen,
  onClose,
  onUpdate
}) => {
  const { user, teams, clubs, connectedPlayers, refreshUserData } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [linkedEntities, setLinkedEntities] = useState<LinkedEntity[]>([]);
  const [teamJoinModalOpen, setTeamJoinModalOpen] = useState(false);
  const [playerLinkModalOpen, setPlayerLinkModalOpen] = useState(false);
  
  // Manual linking codes
  const [clubCode, setClubCode] = useState('');
  const [staffCode, setStaffCode] = useState('');

  useEffect(() => {
    if (isOpen) {
      loadLinkedEntities();
    }
  }, [isOpen]);

  const loadLinkedEntities = async () => {
    if (!user?.id) return;

    setLoading(true);
    try {
      const entities: LinkedEntity[] = [];

      // Add teams
      if (teams) {
        teams.forEach(team => {
          entities.push({
            id: `team_${team.id}`,
            type: 'team',
            name: team.name,
            context: `${team.ageGroup || 'Team'} • ${team.gameFormat || 'Football'}`,
            canRemove: true
          });
        });
      }

      // Add clubs
      if (clubs) {
        clubs.forEach(club => {
          entities.push({
            id: `club_${club.id}`,
            type: 'club',
            name: club.name,
            context: club.serialNumber ? `Serial: ${club.serialNumber}` : 'Club Member',
            canRemove: true
          });
        });
      }

      // Add connected players
      if (connectedPlayers) {
        connectedPlayers.forEach(player => {
          entities.push({
            id: `player_${player.id}`,
            type: 'player',
            name: player.name,
            relationship: 'parent',
            context: 'Connected as Parent',
            canRemove: true
          });
        });
      }

      // Load staff assignments
      const { data: staffData } = await supabase
        .from('user_staff')
        .select(`
          id,
          relationship,
          team_staff!inner(
            id, name, role,
            teams!inner(name)
          )
        `)
        .eq('user_id', user.id);

      if (staffData) {
        staffData.forEach(link => {
          const staff = link.team_staff as any;
          const team = staff.teams;
          
          entities.push({
            id: `staff_${link.id}`,
            type: 'staff',
            name: staff.name,
            role: staff.role,
            context: `${staff.role} at ${team.name}`,
            canRemove: true
          });
        });
      }

      setLinkedEntities(entities);
    } catch (error: any) {
      console.error('Error loading linked entities:', error);
      toast({
        title: 'Error',
        description: 'Failed to load linked accounts',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveEntity = async (entity: LinkedEntity) => {
    if (!confirm(`Are you sure you want to remove the connection to ${entity.name}?`)) {
      return;
    }

    setLoading(true);
    try {
      const [entityType, entityId] = entity.id.split('_');

      switch (entityType) {
        case 'team':
          const { error: teamError } = await supabase
            .from('user_teams')
            .delete()
            .eq('user_id', user.id)
            .eq('team_id', entityId);
          if (teamError) throw teamError;
          break;

        case 'club':
          const { error: clubError } = await supabase
            .from('user_clubs')
            .delete()
            .eq('user_id', user.id)
            .eq('club_id', entityId);
          if (clubError) throw clubError;
          break;

        case 'player':
          const { error: playerError } = await supabase
            .from('user_players')
            .delete()
            .eq('user_id', user.id)
            .eq('player_id', entityId);
          if (playerError) throw playerError;
          break;

        case 'staff':
          const { error: staffError } = await supabase
            .from('user_staff')
            .delete()
            .eq('id', entityId);
          if (staffError) throw staffError;
          break;

        default:
          throw new Error('Unknown entity type');
      }

      toast({
        title: 'Success',
        description: `Removed connection to ${entity.name}`
      });

      await loadLinkedEntities();
      await refreshUserData();
      onUpdate?.();
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
      const { data: clubData, error: clubError } = await supabase
        .from('clubs')
        .select('*')
        .or(`serial_number.eq.${clubCode.trim()},reference_number.eq.${clubCode.trim()}`)
        .single();

      if (clubError || !clubData) {
        throw new Error('Invalid club connection code');
      }

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
      await loadLinkedEntities();
      await refreshUserData();
      onUpdate?.();
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

  const handleStaffConnection = async () => {
    if (!staffCode.trim()) return;
    
    setLoading(true);
    try {
      const { data: staffData, error: staffError } = await supabase
        .from('team_staff')
        .select('*, teams(name)')
        .eq('linking_code', staffCode.trim())
        .single();

      if (staffError || !staffData) {
        throw new Error('Invalid staff connection code');
      }

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

      setStaffCode('');
      await loadLinkedEntities();
      await refreshUserData();
      onUpdate?.();
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

  const getEntityIcon = (type: string) => {
    switch (type) {
      case 'team': return <Trophy className="h-4 w-4" />;
      case 'club': return <Building2 className="h-4 w-4" />;
      case 'player': return <User className="h-4 w-4" />;
      case 'staff': return <Shield className="h-4 w-4" />;
      default: return <Link2 className="h-4 w-4" />;
    }
  };

  const getEntityBadgeColor = (type: string) => {
    switch (type) {
      case 'team': return 'bg-blue-100 text-blue-800';
      case 'club': return 'bg-green-100 text-green-800';
      case 'player': return 'bg-purple-100 text-purple-800';
      case 'staff': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="h-5 w-5" />
            Linked Accounts Management
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="current" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="current">Current Connections</TabsTrigger>
            <TabsTrigger value="add">Add Connections</TabsTrigger>
          </TabsList>

          <TabsContent value="current" className="space-y-4">
            {loading ? (
              <div className="flex items-center justify-center h-32">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
              </div>
            ) : linkedEntities.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {linkedEntities.map((entity) => (
                  <Card key={entity.id} className="relative">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3 flex-1">
                          <div className="p-2 rounded-lg bg-muted">
                            {getEntityIcon(entity.type)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium truncate">{entity.name}</h4>
                            <p className="text-sm text-muted-foreground truncate">
                              {entity.context}
                            </p>
                            <div className="flex gap-2 mt-2">
                              <Badge 
                                variant="outline" 
                                className={getEntityBadgeColor(entity.type)}
                              >
                                {entity.type}
                              </Badge>
                              {entity.role && (
                                <Badge variant="outline">
                                  {entity.role}
                                </Badge>
                              )}
                              {entity.relationship && (
                                <Badge variant="outline">
                                  {entity.relationship}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                        {entity.canRemove && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveEntity(entity)}
                            className="text-muted-foreground hover:text-destructive"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Link2 className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No linked accounts found</p>
                <p className="text-sm">Use the "Add Connections" tab to link accounts</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="add" className="space-y-6">
            {/* Team Join */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <QrCode className="h-5 w-5" />
                  Join Team
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Use a team join code to connect as a player, parent, or staff member
                </p>
                <Button 
                  onClick={() => setTeamJoinModalOpen(true)}
                  className="w-full"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Join Team with Code
                </Button>
              </CardContent>
            </Card>

            {/* Player Link */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UserPlus className="h-5 w-5" />
                  Link to Player
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Use a player linking code to connect as a parent
                </p>
                <Button 
                  onClick={() => setPlayerLinkModalOpen(true)}
                  className="w-full"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Link to Player
                </Button>
              </CardContent>
            </Card>

            {/* Club Connection */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
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
                <Button 
                  onClick={handleClubConnection} 
                  disabled={loading || !clubCode.trim()}
                  className="w-full"
                >
                  Connect to Club
                </Button>
              </CardContent>
            </Card>

            {/* Staff Connection */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Connect as Staff
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label htmlFor="staffCode">Staff Linking Code</Label>
                  <Input
                    id="staffCode"
                    value={staffCode}
                    onChange={(e) => setStaffCode(e.target.value)}
                    placeholder="Enter staff linking code"
                  />
                </div>
                <Button 
                  onClick={handleStaffConnection} 
                  disabled={loading || !staffCode.trim()}
                  className="w-full"
                >
                  Connect as Staff
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Join Modals */}
        <TeamJoinModal
          isOpen={teamJoinModalOpen}
          onClose={() => setTeamJoinModalOpen(false)}
          onSuccess={() => {
            setTeamJoinModalOpen(false);
            loadLinkedEntities();
            refreshUserData();
            onUpdate?.();
          }}
        />

        <PlayerLinkModal
          isOpen={playerLinkModalOpen}
          onClose={() => setPlayerLinkModalOpen(false)}
          onSuccess={() => {
            setPlayerLinkModalOpen(false);
            loadLinkedEntities();
            refreshUserData();
            onUpdate?.();
          }}
        />
      </DialogContent>
    </Dialog>
  );
};