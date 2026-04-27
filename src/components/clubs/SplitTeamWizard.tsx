import { logger } from '@/lib/logger';
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
import { teamsService } from "@/services/teamsService";
import { Users, Plus, Trash2, ArrowRight, CheckCircle2, AlertCircle, UserCheck } from "lucide-react";
import type { YearGroup } from "@/types/index";

interface Player {
  id: string;
  name: string;
  squad_number?: number;
}

interface StaffMember {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  role: string;
  user_id?: string | null;
  pvg_checked?: boolean | null;
  pvg_checked_at?: string | null;
  pvg_checked_by?: string | null;
  linking_code?: string | null;
  coaching_badges?: any;
  certificates?: any;
  kit_sizes?: any;
  assignedTeamIndex: number | null; // null = unassigned
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
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [newTeams, setNewTeams] = useState<NewTeam[]>([
    { name: "", ageGroup: yearGroup.name, gameFormat: yearGroup.playingFormat || "11-a-side", assignedPlayerIds: [] },
    { name: "", ageGroup: yearGroup.name, gameFormat: yearGroup.playingFormat || "11-a-side", assignedPlayerIds: [] }
  ]);
  const [seasonStart, setSeasonStart] = useState("");
  const [seasonEnd, setSeasonEnd] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen) {
      loadPlayersAndStaff();
      const currentYear = new Date().getFullYear();
      setSeasonStart(`${currentYear}-09-01`);
      setSeasonEnd(`${currentYear + 1}-06-30`);
    }
  }, [isOpen, yearGroup.id]);

  const loadPlayersAndStaff = async () => {
    try {
      setLoading(true);

      const { data: teamsData, error: teamsError } = await supabase
        .from('teams')
        .select('id')
        .eq('year_group_id', yearGroup.id);

      if (teamsError) throw teamsError;

      const teamIds = teamsData?.map(t => t.id) || [];

      if (teamIds.length === 0) {
        setPlayers([]);
        setStaff([]);
        return;
      }

      const [playersResult, staffResult] = await Promise.all([
        supabase
          .from('players')
          .select('id, name, squad_number')
          .in('team_id', teamIds)
          .order('name'),
        supabase
          .from('team_staff')
          .select('id, name, email, phone, role, user_id, pvg_checked, pvg_checked_at, pvg_checked_by, linking_code, coaching_badges, certificates, kit_sizes')
          .in('team_id', teamIds)
          .order('name'),
      ]);

      if (playersResult.error) throw playersResult.error;
      if (staffResult.error) throw staffResult.error;

      setPlayers(playersResult.data || []);

      // Deduplicate staff by user_id (if linked) or email
      const seen = new Set<string>();
      const deduped: StaffMember[] = [];
      for (const s of staffResult.data || []) {
        const key = s.user_id || s.email;
        if (!seen.has(key)) {
          seen.add(key);
          deduped.push({ ...s, assignedTeamIndex: null });
        }
      }
      setStaff(deduped);
    } catch (error) {
      logger.error('Error loading players/staff:', error);
      toast({ title: "Error", description: "Failed to load team data", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const addTeam = () => {
    setNewTeams([
      ...newTeams,
      { name: "", ageGroup: yearGroup.name, gameFormat: yearGroup.playingFormat || "11-a-side", assignedPlayerIds: [] }
    ]);
  };

  const removeTeam = (index: number) => {
    if (newTeams.length <= 2) {
      toast({ title: "Cannot Remove", description: "You must have at least 2 teams", variant: "destructive" });
      return;
    }
    // Unassign any players/staff pointing to this or later indices
    setNewTeams(newTeams.filter((_, i) => i !== index));
    setStaff(prev => prev.map(s => {
      if (s.assignedTeamIndex === index) return { ...s, assignedTeamIndex: null };
      if (s.assignedTeamIndex !== null && s.assignedTeamIndex > index) return { ...s, assignedTeamIndex: s.assignedTeamIndex - 1 };
      return s;
    }));
  };

  const updateTeam = (index: number, field: keyof NewTeam, value: any) => {
    const updated = [...newTeams];
    updated[index] = { ...updated[index], [field]: value };
    setNewTeams(updated);
  };

  const assignPlayerToTeam = (playerId: string, teamIndex: number) => {
    const updated = [...newTeams];
    updated.forEach(team => {
      team.assignedPlayerIds = team.assignedPlayerIds.filter(id => id !== playerId);
    });
    updated[teamIndex].assignedPlayerIds.push(playerId);
    setNewTeams(updated);
  };

  const assignStaffToTeam = (staffId: string, teamIndex: number | null) => {
    setStaff(prev => prev.map(s => s.id === staffId ? { ...s, assignedTeamIndex: teamIndex } : s));
  };

  const autoDistributePlayers = () => {
    const updated = [...newTeams];
    updated.forEach(team => (team.assignedPlayerIds = []));
    players.forEach((player, index) => {
      const teamIndex = index % newTeams.length;
      updated[teamIndex].assignedPlayerIds.push(player.id);
    });
    setNewTeams(updated);
    toast({ title: "Players Distributed", description: `Players evenly distributed across ${newTeams.length} teams` });
  };

  const autoAssignStaff = () => {
    setStaff(prev => prev.map((s, i) => ({ ...s, assignedTeamIndex: i % newTeams.length })));
    toast({ title: "Staff Assigned", description: `Staff evenly assigned across ${newTeams.length} teams` });
  };

  const validateStep1 = () => newTeams.every(t => t.name.trim() !== "") && !!seasonStart && !!seasonEnd;
  const validateStep2 = () => {
    const assigned = newTeams.reduce((sum, t) => sum + t.assignedPlayerIds.length, 0);
    return assigned === players.length;
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);

      // Create teams
      const teamsToCreate = newTeams.map(team => ({
        name: team.name,
        age_group: team.ageGroup,
        season_start: seasonStart,
        season_end: seasonEnd,
        year_group_id: yearGroup.id,
        club_id: yearGroup.clubId,
        game_format: team.gameFormat,
        subscription_type: 'free',
        kit_icons: {
          home: JSON.stringify({ shirtColor: '#FF0000', sleeveColor: '#FF0000', hasStripes: false, stripeColor: '', shortsColor: '#000000', socksColor: '#FF0000' }),
          away: JSON.stringify({ shirtColor: '#FFFFFF', sleeveColor: '#FFFFFF', hasStripes: false, stripeColor: '', shortsColor: '#000000', socksColor: '#FFFFFF' }),
          training: JSON.stringify({ shirtColor: '#0000FF', sleeveColor: '#0000FF', hasStripes: false, stripeColor: '', shortsColor: '#000000', socksColor: '#0000FF' }),
          goalkeeper: JSON.stringify({ shirtColor: '#00FF00', sleeveColor: '#00FF00', hasStripes: false, stripeColor: '', shortsColor: '#000000', socksColor: '#00FF00' })
        }
      }));

      const createdTeams = [];
      for (const teamData of teamsToCreate) {
        createdTeams.push(await teamsService.createTeam(teamData));
      }

      // Move players
      for (let i = 0; i < newTeams.length; i++) {
        const playerIds = newTeams[i].assignedPlayerIds;
        if (playerIds.length > 0) {
          const { error } = await supabase
            .from('players')
            .update({ team_id: createdTeams[i].id })
            .in('id', playerIds);
          if (error) throw error;
        }
      }

      // Assign staff: insert new team_staff rows for each assignment
      const staffToInsert = staff
        .filter(s => s.assignedTeamIndex !== null)
        .map(s => ({
          team_id: createdTeams[s.assignedTeamIndex!].id,
          name: s.name,
          email: s.email,
          phone: s.phone,
          role: s.role,
          user_id: s.user_id,
          pvg_checked: s.pvg_checked,
          pvg_checked_at: s.pvg_checked_at,
          pvg_checked_by: s.pvg_checked_by,
          linking_code: s.linking_code,
          coaching_badges: s.coaching_badges,
          certificates: s.certificates,
          kit_sizes: s.kit_sizes,
          suspended: false,
        }));

      if (staffToInsert.length > 0) {
        const { error: staffError } = await supabase.from('team_staff').insert(staffToInsert);
        if (staffError) throw staffError;
      }

      // Link new teams to the club via club_teams join table
      const clubLinkData = createdTeams.map(team => ({ club_id: yearGroup.clubId, team_id: team.id }));
      const { error: clubLinkError } = await supabase.from('club_teams').insert(clubLinkData);
      if (clubLinkError) throw clubLinkError;

      toast({ title: "Success!", description: `Created ${newTeams.length} teams, distributed ${players.length} players and ${staffToInsert.length} staff assignments` });
      onComplete();
      handleClose();
    } catch (error) {
      logger.error('Error creating teams:', error);
      toast({ title: "Error", description: "Failed to create teams. Please try again.", variant: "destructive" });
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
    setStaff(prev => prev.map(s => ({ ...s, assignedTeamIndex: null })));
    onClose();
  };

  const getPlayerById = (id: string) => players.find(p => p.id === id);
  const unassignedPlayers = players.filter(p => !newTeams.some(t => t.assignedPlayerIds.includes(p.id)));
  const unassignedStaff = staff.filter(s => s.assignedTeamIndex === null);

  const stepLabels = [
    { n: 1, label: "Team Setup" },
    { n: 2, label: "Players" },
    { n: 3, label: "Staff" },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Split Year Group: {yearGroup.name}</DialogTitle>
          <DialogDescription>Create multiple teams and distribute players and staff for the new season</DialogDescription>
        </DialogHeader>

        {/* Progress Indicator */}
        <div className="flex items-center justify-center gap-2 py-4 flex-wrap">
          {stepLabels.map(({ n, label }, idx) => (
            <div key={n} className="flex items-center gap-2">
              <div className={`flex items-center gap-2 ${step === n ? 'text-primary' : step > n ? 'text-muted-foreground' : 'text-muted-foreground'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${
                  step === n ? 'border-primary bg-primary text-primary-foreground' :
                  step > n ? 'border-green-500 bg-green-500 text-white' : 'border-muted-foreground'
                }`}>
                  {step > n ? <CheckCircle2 className="h-5 w-5" /> : n}
                </div>
                <span className="font-medium text-sm">{label}</span>
              </div>
              {idx < stepLabels.length - 1 && <ArrowRight className="h-4 w-4 text-muted-foreground" />}
            </div>
          ))}
        </div>

        <Separator />

        {/* ── Step 1: Team Setup ── */}
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
                  <Input type="date" value={seasonStart} onChange={e => setSeasonStart(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Season End</Label>
                  <Input type="date" value={seasonEnd} onChange={e => setSeasonEnd(e.target.value)} />
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
                    <Plus className="h-4 w-4 mr-2" />Add Team
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
                          <Button variant="ghost" size="sm" onClick={() => removeTeam(index)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="grid grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label>Team Name *</Label>
                        <Input value={team.name} onChange={e => updateTeam(index, 'name', e.target.value)} placeholder={`e.g., ${yearGroup.name} Red`} />
                      </div>
                      <div className="space-y-2">
                        <Label>Age Group</Label>
                        <Input value={team.ageGroup} onChange={e => updateTeam(index, 'ageGroup', e.target.value)} />
                      </div>
                      <div className="space-y-2">
                        <Label>Game Format</Label>
                        <Select value={team.gameFormat} onValueChange={value => updateTeam(index, 'gameFormat', value)}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
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
              <Button variant="outline" onClick={handleClose}>Cancel</Button>
              <Button onClick={() => setStep(2)} disabled={!validateStep1()}>
                Next: Distribute Players <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </div>
        )}

        {/* ── Step 2: Player Distribution ── */}
        {step === 2 && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Player Distribution</CardTitle>
                    <CardDescription>Assign {players.length} players to {newTeams.length} teams</CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={unassignedPlayers.length === 0 ? "default" : "destructive"}>
                      {unassignedPlayers.length === 0
                        ? <><CheckCircle2 className="h-3 w-3 mr-1" />All Assigned</>
                        : <><AlertCircle className="h-3 w-3 mr-1" />{unassignedPlayers.length} Unassigned</>}
                    </Badge>
                    <Button onClick={autoDistributePlayers} variant="outline" size="sm">Auto Distribute</Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {newTeams.map((team, teamIndex) => (
                  <Card key={teamIndex} className="border-2">
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center justify-between">
                        <span>{team.name}</span>
                        <Badge variant="secondary">{team.assignedPlayerIds.length} player{team.assignedPlayerIds.length !== 1 ? 's' : ''}</Badge>
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
                                {player.squad_number && <Badge variant="outline">#{player.squad_number}</Badge>}
                              </div>
                              <Select value={String(teamIndex)} onValueChange={v => assignPlayerToTeam(playerId, parseInt(v))}>
                                <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  {newTeams.map((t, i) => <SelectItem key={i} value={String(i)}>{t.name || `Team ${i + 1}`}</SelectItem>)}
                                </SelectContent>
                              </Select>
                            </div>
                          ) : null;
                        })}
                        {team.assignedPlayerIds.length === 0 && (
                          <div className="text-center py-4 text-muted-foreground">No players assigned yet</div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}

                {unassignedPlayers.length > 0 && (
                  <Card className="border-2 border-destructive">
                    <CardHeader>
                      <CardTitle className="text-lg text-destructive">Unassigned Players ({unassignedPlayers.length})</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {unassignedPlayers.map(player => (
                          <div key={player.id} className="flex items-center justify-between p-2 bg-muted rounded-lg">
                            <div className="flex items-center gap-2">
                              <AlertCircle className="h-4 w-4 text-destructive" />
                              <span>{player.name}</span>
                              {player.squad_number && <Badge variant="outline">#{player.squad_number}</Badge>}
                            </div>
                            <Select onValueChange={v => assignPlayerToTeam(player.id, parseInt(v))}>
                              <SelectTrigger className="w-48"><SelectValue placeholder="Assign to team..." /></SelectTrigger>
                              <SelectContent>
                                {newTeams.map((t, i) => <SelectItem key={i} value={String(i)}>{t.name || `Team ${i + 1}`}</SelectItem>)}
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
              <Button variant="outline" onClick={() => setStep(1)}>Back</Button>
              <Button onClick={() => setStep(3)} disabled={!validateStep2()}>
                Next: Assign Staff <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </div>
        )}

        {/* ── Step 3: Staff Assignment ── */}
        {step === 3 && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Staff Assignment</CardTitle>
                    <CardDescription>
                      Assign {staff.length} staff member{staff.length !== 1 ? 's' : ''} to the new teams.
                      Unassigned staff will not be copied.
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    {unassignedStaff.length > 0 && (
                      <Badge variant="outline" className="text-orange-600 border-orange-400">
                        <AlertCircle className="h-3 w-3 mr-1" />{unassignedStaff.length} Unassigned
                      </Badge>
                    )}
                    {staff.length > 0 && (
                      <Button onClick={autoAssignStaff} variant="outline" size="sm">Auto Assign</Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {staff.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <UserCheck className="h-10 w-10 mx-auto mb-3 opacity-40" />
                    <p>No staff found in this year group's teams.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {staff.map(member => (
                      <div key={member.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm truncate">{member.name}</div>
                          <div className="text-xs text-muted-foreground truncate">{member.email}</div>
                          <Badge variant="outline" className="capitalize text-xs mt-1">{member.role}</Badge>
                        </div>
                        <Select
                          value={member.assignedTeamIndex !== null ? String(member.assignedTeamIndex) : 'none'}
                          onValueChange={v => assignStaffToTeam(member.id, v === 'none' ? null : parseInt(v))}
                        >
                          <SelectTrigger className="w-48 ml-4">
                            <SelectValue placeholder="Assign to team..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">
                              <span className="text-muted-foreground">Do not assign</span>
                            </SelectItem>
                            <Separator />
                            {newTeams.map((t, i) => (
                              <SelectItem key={i} value={String(i)}>{t.name || `Team ${i + 1}`}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(2)}>Back</Button>
              <Button onClick={handleSubmit} disabled={loading}>
                {loading ? "Creating Teams..." : `Create ${newTeams.length} Teams`}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
