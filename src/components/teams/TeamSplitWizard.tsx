import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Team } from '@/types';
import { Loader2, Plus, Trash2, Users } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface TeamSplitWizardProps {
  team: Team;
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
}

interface NewTeamConfig {
  id: string;
  name: string;
  ageGroup: string;
  gameFormat: string;
  seasonStart: string;
  seasonEnd: string;
}

interface Player {
  id: string;
  first_name: string;
  last_name: string;
  assigned_team?: string;
}

export const TeamSplitWizard: React.FC<TeamSplitWizardProps> = ({ 
  team, 
  isOpen, 
  onClose, 
  onComplete 
}) => {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [players, setPlayers] = useState<Player[]>([]);
  const [newTeams, setNewTeams] = useState<NewTeamConfig[]>([
    {
      id: crypto.randomUUID(),
      name: `${team.name} - Team A`,
      ageGroup: team.ageGroup || 'U10',
      gameFormat: team.gameFormat || '9v9',
      seasonStart: new Date().toISOString().split('T')[0],
      seasonEnd: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0],
    },
    {
      id: crypto.randomUUID(),
      name: `${team.name} - Team B`,
      ageGroup: team.ageGroup || 'U10',
      gameFormat: team.gameFormat || '9v9',
      seasonStart: new Date().toISOString().split('T')[0],
      seasonEnd: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0],
    },
  ]);

  useEffect(() => {
    if (isOpen) {
      loadPlayers();
    }
  }, [isOpen, team.id]);

  const loadPlayers = async () => {
    try {
      const { data, error } = await supabase
        .from('players')
        .select('id, name')
        .eq('team_id', team.id)
        .order('name');

      if (error) throw error;
      
      // Map the data to match our Player interface
      const mappedPlayers = (data || []).map(p => {
        const [firstName = '', ...lastNameParts] = (p.name || '').split(' ');
        return {
          id: p.id,
          first_name: firstName,
          last_name: lastNameParts.join(' ') || firstName,
        };
      });
      
      setPlayers(mappedPlayers);
    } catch (error) {
      console.error('Error loading players:', error);
      toast({
        title: "Error",
        description: "Failed to load players",
        variant: "destructive",
      });
    }
  };

  const addTeam = () => {
    const letter = String.fromCharCode(65 + newTeams.length); // A, B, C, etc.
    setNewTeams([
      ...newTeams,
      {
        id: crypto.randomUUID(),
        name: `${team.name} - Team ${letter}`,
        ageGroup: team.ageGroup || 'U10',
        gameFormat: team.gameFormat || '9v9',
        seasonStart: new Date().toISOString().split('T')[0],
        seasonEnd: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0],
      },
    ]);
  };

  const removeTeam = (id: string) => {
    if (newTeams.length <= 2) {
      toast({
        title: "Minimum teams required",
        description: "You must create at least 2 teams when splitting",
        variant: "destructive",
      });
      return;
    }
    setNewTeams(newTeams.filter(t => t.id !== id));
    // Clear assignments for removed team
    setPlayers(players.map(p => p.assigned_team === id ? { ...p, assigned_team: undefined } : p));
  };

  const updateTeam = (id: string, field: keyof NewTeamConfig, value: string) => {
    setNewTeams(newTeams.map(t => t.id === id ? { ...t, [field]: value } : t));
  };

  const assignPlayer = (playerId: string, teamId: string) => {
    setPlayers(players.map(p => p.id === playerId ? { ...p, assigned_team: teamId } : p));
  };

  const autoDistribute = () => {
    const shuffled = [...players].sort(() => Math.random() - 0.5);
    const distributed = shuffled.map((player, index) => ({
      ...player,
      assigned_team: newTeams[index % newTeams.length].id,
    }));
    setPlayers(distributed);
    toast({
      title: "Players distributed",
      description: "Players have been evenly distributed across teams",
    });
  };

  const handleSubmit = async () => {
    // Validate all players are assigned
    const unassigned = players.filter(p => !p.assigned_team);
    if (unassigned.length > 0) {
      toast({
        title: "Incomplete assignments",
        description: `${unassigned.length} player(s) need to be assigned to a team`,
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      // Get club_id if team is linked to a club
      const { data: clubTeam } = await supabase
        .from('club_teams')
        .select('club_id')
        .eq('team_id', team.id)
        .single();

      // Create new teams
      for (const newTeam of newTeams) {
        const { data: createdTeam, error: teamError } = await supabase
          .from('teams')
          .insert({
            name: newTeam.name,
            age_group: newTeam.ageGroup,
            game_format: newTeam.gameFormat,
            season_start: newTeam.seasonStart,
            season_end: newTeam.seasonEnd,
            subscription_type: team.subscriptionType,
            kit_icons: {
              home: 'home-kit-icon.svg',
              away: 'away-kit-icon.svg',
              training: 'training-kit-icon.svg',
              goalkeeper: 'gk-kit-icon.svg',
            },
          })
          .select()
          .single();

        if (teamError) throw teamError;

        // Link team to club if applicable
        if (clubTeam?.club_id && createdTeam) {
          const { error: linkError } = await supabase
            .from('club_teams')
            .insert({
              club_id: clubTeam.club_id,
              team_id: createdTeam.id,
            });

          if (linkError) console.error('Error linking team to club:', linkError);
        }

        // Assign players to this team
        const teamPlayers = players.filter(p => p.assigned_team === newTeam.id);
        if (teamPlayers.length > 0 && createdTeam) {
          const { error: playerError } = await supabase
            .from('players')
            .update({ team_id: createdTeam.id })
            .in('id', teamPlayers.map(p => p.id));

          if (playerError) throw playerError;
        }
      }

      toast({
        title: "Teams split successfully",
        description: `Created ${newTeams.length} new teams and distributed ${players.length} players`,
      });

      onComplete();
    } catch (error) {
      console.error('Error splitting team:', error);
      toast({
        title: "Error",
        description: "Failed to split team. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getTeamPlayerCount = (teamId: string) => {
    return players.filter(p => p.assigned_team === teamId).length;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Split Team: {team.name}</DialogTitle>
          <DialogDescription>
            {step === 1 ? 'Configure the new teams' : 'Assign players to teams'}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col">
          {step === 1 ? (
            <ScrollArea className="flex-1 pr-4">
              <div className="space-y-4">
                {newTeams.map((newTeam, index) => (
                  <Card key={newTeam.id}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-base font-medium">
                        Team {String.fromCharCode(65 + index)}
                      </CardTitle>
                      {newTeams.length > 2 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeTeam(newTeam.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </CardHeader>
                    <CardContent className="grid gap-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>Team Name</Label>
                          <Input
                            value={newTeam.name}
                            onChange={(e) => updateTeam(newTeam.id, 'name', e.target.value)}
                          />
                        </div>
                        <div>
                          <Label>Age Group</Label>
                          <Input
                            value={newTeam.ageGroup}
                            onChange={(e) => updateTeam(newTeam.id, 'ageGroup', e.target.value)}
                          />
                        </div>
                        <div>
                          <Label>Game Format</Label>
                          <Select
                            value={newTeam.gameFormat}
                            onValueChange={(value) => updateTeam(newTeam.id, 'gameFormat', value)}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="5v5">5v5</SelectItem>
                              <SelectItem value="7v7">7v7</SelectItem>
                              <SelectItem value="9v9">9v9</SelectItem>
                              <SelectItem value="11v11">11v11</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label>Season Start</Label>
                          <Input
                            type="date"
                            value={newTeam.seasonStart}
                            onChange={(e) => updateTeam(newTeam.id, 'seasonStart', e.target.value)}
                          />
                        </div>
                        <div className="col-span-2">
                          <Label>Season End</Label>
                          <Input
                            type="date"
                            value={newTeam.seasonEnd}
                            onChange={(e) => updateTeam(newTeam.id, 'seasonEnd', e.target.value)}
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}

                <Button
                  variant="outline"
                  onClick={addTeam}
                  className="w-full"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add Another Team
                </Button>
              </div>
            </ScrollArea>
          ) : (
            <div className="flex-1 overflow-hidden flex flex-col space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    {players.length} players to distribute
                  </span>
                </div>
                <Button variant="outline" onClick={autoDistribute} size="sm">
                  Auto Distribute
                </Button>
              </div>

              <div className="grid grid-cols-2 gap-4 flex-1 overflow-hidden">
                <Card className="flex flex-col overflow-hidden">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium">Players</CardTitle>
                  </CardHeader>
                  <CardContent className="flex-1 overflow-hidden p-0">
                    <ScrollArea className="h-full px-6 pb-6">
                      <div className="space-y-2">
                        {players.map((player) => (
                          <div
                            key={player.id}
                            className="flex items-center justify-between p-2 rounded-md border bg-card hover:bg-accent"
                          >
                            <span className="text-sm">
                              {player.first_name} {player.last_name}
                            </span>
                            {player.assigned_team && (
                              <Badge variant="secondary" className="text-xs">
                                Team{' '}
                                {String.fromCharCode(
                                  65 + newTeams.findIndex(t => t.id === player.assigned_team)
                                )}
                              </Badge>
                            )}
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>

                <Card className="flex flex-col overflow-hidden">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium">Teams</CardTitle>
                  </CardHeader>
                  <CardContent className="flex-1 overflow-hidden p-0">
                    <ScrollArea className="h-full px-6 pb-6">
                      <div className="space-y-4">
                        {newTeams.map((newTeam, index) => (
                          <Card key={newTeam.id}>
                            <CardHeader className="pb-2">
                              <CardTitle className="text-sm flex items-center justify-between">
                                <span>Team {String.fromCharCode(65 + index)}</span>
                                <Badge variant="outline">
                                  {getTeamPlayerCount(newTeam.id)} players
                                </Badge>
                              </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-2">
                              <Select
                                value=""
                                onValueChange={(playerId) => assignPlayer(playerId, newTeam.id)}
                              >
                                <SelectTrigger className="h-8 text-xs">
                                  <SelectValue placeholder="Assign player..." />
                                </SelectTrigger>
                                <SelectContent>
                                  {players
                                    .filter(p => !p.assigned_team || p.assigned_team === newTeam.id)
                                    .map(player => (
                                      <SelectItem key={player.id} value={player.id}>
                                        {player.first_name} {player.last_name}
                                      </SelectItem>
                                    ))}
                                </SelectContent>
                              </Select>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-between pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <div className="flex gap-2">
            {step === 2 && (
              <Button variant="outline" onClick={() => setStep(1)}>
                Back
              </Button>
            )}
            {step === 1 ? (
              <Button onClick={() => setStep(2)}>
                Next: Assign Players
              </Button>
            ) : (
              <Button onClick={handleSubmit} disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Split Team
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
