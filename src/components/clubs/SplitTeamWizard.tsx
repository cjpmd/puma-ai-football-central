import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Users, Plus, Trash2, ArrowRight, CheckCircle2, AlertCircle } from "lucide-react";
import type { YearGroup } from "@/types/index";

interface Player {
  id: string;
  name: string;
  squad_number?: number;
}

interface NewTeam {
  name: string;
  ageGroup: string;
  gameFormat: string;
  assignedPlayerIds: string[];
}

interface SplitTeamWizardProps {
  yearGroup: YearGroup;
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
}

export const SplitTeamWizard = ({ yearGroup, isOpen, onClose, onComplete }: SplitTeamWizardProps) => {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [players, setPlayers] = useState<Player[]>([]);
  const [newTeams, setNewTeams] = useState<NewTeam[]>([
    { name: "", ageGroup: yearGroup.name, gameFormat: yearGroup.playingFormat || "11-a-side", assignedPlayerIds: [] },
    { name: "", ageGroup: yearGroup.name, gameFormat: yearGroup.playingFormat || "11-a-side", assignedPlayerIds: [] }
  ]);
  const [seasonStart, setSeasonStart] = useState("");
  const [seasonEnd, setSeasonEnd] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen) {
      loadPlayers();
      // Set default season dates (current year)
      const currentYear = new Date().getFullYear();
      setSeasonStart(`${currentYear}-09-01`);
      setSeasonEnd(`${currentYear + 1}-06-30`);
    }
  }, [isOpen, yearGroup.id]);

  const loadPlayers = async () => {
    try {
      setLoading(true);
      
      // Get all teams in this year group
      const { data: teamsData, error: teamsError } = await supabase
        .from('teams')
        .select('id')
        .eq('year_group_id', yearGroup.id);

      if (teamsError) throw teamsError;

      const teamIds = teamsData?.map(t => t.id) || [];

      if (teamIds.length === 0) {
        setPlayers([]);
        return;
      }

      // Get all players from those teams
      const { data: playersData, error: playersError } = await supabase
        .from('players')
        .select('id, name, squad_number')
        .in('team_id', teamIds)
        .order('name');

      if (playersError) throw playersError;

      setPlayers(playersData || []);
    } catch (error) {
      console.error('Error loading players:', error);
      toast({
        title: "Error",
        description: "Failed to load players",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const addTeam = () => {
    setNewTeams([
      ...newTeams,
      { 
        name: "", 
        ageGroup: yearGroup.name, 
        gameFormat: yearGroup.playingFormat || "11-a-side", 
        assignedPlayerIds: [] 
      }
    ]);
  };

  const removeTeam = (index: number) => {
    if (newTeams.length <= 2) {
      toast({
        title: "Cannot Remove",
        description: "You must have at least 2 teams",
        variant: "destructive",
      });
      return;
    }
    setNewTeams(newTeams.filter((_, i) => i !== index));
  };

  const updateTeam = (index: number, field: keyof NewTeam, value: any) => {
    const updated = [...newTeams];
    updated[index] = { ...updated[index], [field]: value };
    setNewTeams(updated);
  };

  const assignPlayerToTeam = (playerId: string, teamIndex: number) => {
    const updated = [...newTeams];
    
    // Remove from all teams first
    updated.forEach(team => {
      team.assignedPlayerIds = team.assignedPlayerIds.filter(id => id !== playerId);
    });
    
    // Add to selected team
    updated[teamIndex].assignedPlayerIds.push(playerId);
    
    setNewTeams(updated);
  };

  const autoDistribute = () => {
    const unassignedPlayers = players.filter(
      p => !newTeams.some(t => t.assignedPlayerIds.includes(p.id))
    );
    
    const playersPerTeam = Math.ceil(players.length / newTeams.length);
    const updated = [...newTeams];
    
    // Clear current assignments
    updated.forEach(team => team.assignedPlayerIds = []);
    
    // Distribute players evenly
    players.forEach((player, index) => {
      const teamIndex = Math.floor(index / playersPerTeam) % newTeams.length;
      updated[teamIndex].assignedPlayerIds.push(player.id);
    });
    
    setNewTeams(updated);
    
    toast({
      title: "Players Distributed",
      description: `Players have been evenly distributed across ${newTeams.length} teams`,
    });
  };

  const validateStep1 = () => {
    return newTeams.every(team => team.name.trim() !== "") && seasonStart && seasonEnd;
  };

  const validateStep2 = () => {
    const assignedCount = newTeams.reduce((sum, team) => sum + team.assignedPlayerIds.length, 0);
    return assignedCount === players.length;
  };

  const handleSubmit = async () => {
    if (!validateStep2()) {
      toast({
        title: "Incomplete Distribution",
        description: "All players must be assigned to a team",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);

      // Create teams
      const teamsToCreate = newTeams.map(team => ({
        name: team.name,
        age_group: team.ageGroup,
        season_start: seasonStart,
        season_end: seasonEnd,
        year_group_id: yearGroup.id,
        game_format: team.gameFormat,
        subscription_type: 'free',
        kit_icons: {
          home: JSON.stringify({ shirtColor: '#FF0000', sleeveColor: '#FF0000', hasStripes: false, stripeColor: '', shortsColor: '#000000', socksColor: '#FF0000' }),
          away: JSON.stringify({ shirtColor: '#FFFFFF', sleeveColor: '#FFFFFF', hasStripes: false, stripeColor: '', shortsColor: '#000000', socksColor: '#FFFFFF' }),
          training: JSON.stringify({ shirtColor: '#0000FF', sleeveColor: '#0000FF', hasStripes: false, stripeColor: '', shortsColor: '#000000', socksColor: '#0000FF' }),
          goalkeeper: JSON.stringify({ shirtColor: '#00FF00', sleeveColor: '#00FF00', hasStripes: false, stripeColor: '', shortsColor: '#000000', socksColor: '#00FF00' })
        }
      }));

      const { data: createdTeams, error: teamsError } = await supabase
        .from('teams')
        .insert(teamsToCreate)
        .select();

      if (teamsError) throw teamsError;

      // Update players' team assignments
      for (let i = 0; i < newTeams.length; i++) {
        const teamId = createdTeams[i].id;
        const playerIds = newTeams[i].assignedPlayerIds;

        if (playerIds.length > 0) {
          const { error: playersError } = await supabase
            .from('players')
            .update({ team_id: teamId })
            .in('id', playerIds);

          if (playersError) throw playersError;
        }
      }

      // Link teams to club
      const clubLinkData = createdTeams.map(team => ({
        club_id: yearGroup.clubId,
        team_id: team.id
      }));

      const { error: clubLinkError } = await supabase
        .from('club_teams')
        .insert(clubLinkData);

      if (clubLinkError) throw clubLinkError;

      toast({
        title: "Success!",
        description: `Created ${newTeams.length} teams and distributed ${players.length} players`,
      });

      onComplete();
      handleClose();
    } catch (error) {
      console.error('Error creating teams:', error);
      toast({
        title: "Error",
        description: "Failed to create teams. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setStep(1);
    setNewTeams([
      { name: "", ageGroup: yearGroup.name, gameFormat: yearGroup.playingFormat || "11-a-side", assignedPlayerIds: [] },
      { name: "", ageGroup: yearGroup.name, gameFormat: yearGroup.playingFormat || "11-a-side", assignedPlayerIds: [] }
    ]);
    onClose();
  };

  const getPlayerById = (playerId: string) => players.find(p => p.id === playerId);

  const unassignedPlayers = players.filter(
    p => !newTeams.some(t => t.assignedPlayerIds.includes(p.id))
  );

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Split Year Group: {yearGroup.name}</DialogTitle>
          <DialogDescription>
            Create multiple teams and distribute players for the new season
          </DialogDescription>
        </DialogHeader>

        {/* Progress Indicator */}
        <div className="flex items-center justify-center gap-4 py-4">
          <div className={`flex items-center gap-2 ${step === 1 ? 'text-primary' : 'text-muted-foreground'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${step === 1 ? 'border-primary bg-primary text-primary-foreground' : 'border-muted-foreground'}`}>
              {step > 1 ? <CheckCircle2 className="h-5 w-5" /> : '1'}
            </div>
            <span className="font-medium">Team Setup</span>
          </div>
          <ArrowRight className="h-4 w-4 text-muted-foreground" />
          <div className={`flex items-center gap-2 ${step === 2 ? 'text-primary' : 'text-muted-foreground'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${step === 2 ? 'border-primary bg-primary text-primary-foreground' : 'border-muted-foreground'}`}>
              2
            </div>
            <span className="font-medium">Player Distribution</span>
          </div>
        </div>

        <Separator />

        {/* Step 1: Team Setup */}
        {step === 1 && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Season Information</CardTitle>
                <CardDescription>Set the season dates for the new teams</CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Season Start</Label>
                  <Input
                    type="date"
                    value={seasonStart}
                    onChange={(e) => setSeasonStart(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Season End</Label>
                  <Input
                    type="date"
                    value={seasonEnd}
                    onChange={(e) => setSeasonEnd(e.target.value)}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>New Teams ({newTeams.length})</CardTitle>
                    <CardDescription>Configure the teams to create</CardDescription>
                  </div>
                  <Button onClick={addTeam} size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Team
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {newTeams.map((team, index) => (
                  <Card key={index} className="border-2">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">Team {index + 1}</CardTitle>
                        {newTeams.length > 2 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeTeam(index)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="grid grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label>Team Name *</Label>
                        <Input
                          value={team.name}
                          onChange={(e) => updateTeam(index, 'name', e.target.value)}
                          placeholder={`e.g., ${yearGroup.name} Red`}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Age Group</Label>
                        <Input
                          value={team.ageGroup}
                          onChange={(e) => updateTeam(index, 'ageGroup', e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Game Format</Label>
                        <Select
                          value={team.gameFormat}
                          onValueChange={(value) => updateTeam(index, 'gameFormat', value)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="5-a-side">5-a-side</SelectItem>
                            <SelectItem value="7-a-side">7-a-side</SelectItem>
                            <SelectItem value="9-a-side">9-a-side</SelectItem>
                            <SelectItem value="11-a-side">11-a-side</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </CardContent>
            </Card>

            <div className="flex justify-between">
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button onClick={() => setStep(2)} disabled={!validateStep1()}>
                Next: Distribute Players
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: Player Distribution */}
        {step === 2 && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Player Distribution</CardTitle>
                    <CardDescription>
                      Assign {players.length} players to {newTeams.length} teams
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={unassignedPlayers.length === 0 ? "default" : "destructive"}>
                      {unassignedPlayers.length === 0 ? (
                        <><CheckCircle2 className="h-3 w-3 mr-1" /> All Assigned</>
                      ) : (
                        <><AlertCircle className="h-3 w-3 mr-1" /> {unassignedPlayers.length} Unassigned</>
                      )}
                    </Badge>
                    <Button onClick={autoDistribute} variant="outline" size="sm">
                      Auto Distribute
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {newTeams.map((team, teamIndex) => (
                  <Card key={teamIndex} className="border-2">
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center justify-between">
                        <span>{team.name}</span>
                        <Badge variant="secondary">
                          {team.assignedPlayerIds.length} player{team.assignedPlayerIds.length !== 1 ? 's' : ''}
                        </Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {team.assignedPlayerIds.map(playerId => {
                          const player = getPlayerById(playerId);
                          return player ? (
                            <div key={playerId} className="flex items-center justify-between p-2 bg-muted rounded-lg">
                              <div className="flex items-center gap-2">
                                <Users className="h-4 w-4 text-muted-foreground" />
                                <span>{player.name}</span>
                                {player.squad_number && (
                                  <Badge variant="outline">#{player.squad_number}</Badge>
                                )}
                              </div>
                              <Select
                                value={String(teamIndex)}
                                onValueChange={(value) => assignPlayerToTeam(playerId, parseInt(value))}
                              >
                                <SelectTrigger className="w-48">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {newTeams.map((t, i) => (
                                    <SelectItem key={i} value={String(i)}>
                                      {t.name || `Team ${i + 1}`}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          ) : null;
                        })}
                        {team.assignedPlayerIds.length === 0 && (
                          <div className="text-center py-4 text-muted-foreground">
                            No players assigned yet
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}

                {unassignedPlayers.length > 0 && (
                  <Card className="border-2 border-destructive">
                    <CardHeader>
                      <CardTitle className="text-lg text-destructive">
                        Unassigned Players ({unassignedPlayers.length})
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {unassignedPlayers.map(player => (
                          <div key={player.id} className="flex items-center justify-between p-2 bg-muted rounded-lg">
                            <div className="flex items-center gap-2">
                              <AlertCircle className="h-4 w-4 text-destructive" />
                              <span>{player.name}</span>
                              {player.squad_number && (
                                <Badge variant="outline">#{player.squad_number}</Badge>
                              )}
                            </div>
                            <Select
                              onValueChange={(value) => assignPlayerToTeam(player.id, parseInt(value))}
                            >
                              <SelectTrigger className="w-48">
                                <SelectValue placeholder="Assign to team..." />
                              </SelectTrigger>
                              <SelectContent>
                                {newTeams.map((t, i) => (
                                  <SelectItem key={i} value={String(i)}>
                                    {t.name || `Team ${i + 1}`}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </CardContent>
            </Card>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(1)}>
                Back
              </Button>
              <Button 
                onClick={handleSubmit} 
                disabled={!validateStep2() || loading}
              >
                {loading ? "Creating Teams..." : `Create ${newTeams.length} Teams`}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
