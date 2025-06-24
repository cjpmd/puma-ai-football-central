import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { PlayerSelectionWithAvailability } from './PlayerSelectionWithAvailability';
import { StaffSelectionSection } from './StaffSelectionSection';
import { ScoreInput } from './ScoreInput';
import { PostGameEditor } from './PostGameEditor';
import { DatabaseEvent, DatabasePlayer, DatabaseStaff } from '@/types/event';
import { GameFormat } from '@/types';
import { debugPlayerPositions } from '@/utils/debugPlayerPositions';
import { debugMasonCMIssue } from '@/utils/debugMasonCMIssue';
import { fixMasonIssue } from '@/utils/fixMasonIssue';
import { DataRepairPanel } from './DataRepairPanel';
import { Trash2, Users, FileText, Trophy, Clock, Settings, Bug, Wrench, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

interface TeamSelectionManagerProps {
  event: DatabaseEvent;
  isOpen: boolean;
  onClose: () => void;
}

interface PlayerPosition {
  playerId: string;
  position: string;
  isSubstitute?: boolean;
  minutes?: number;
}

interface StaffAssignment {
  staffId: string;
  role: string;
}

export const TeamSelectionManager: React.FC<TeamSelectionManagerProps> = ({
  event,
  isOpen,
  onClose
}) => {
  const [teamNumber, setTeamNumber] = useState(1);
  const [periodNumber, setPeriodNumber] = useState(1);
  const [durationMinutes, setDurationMinutes] = useState(90);
  const [playerPositions, setPlayerPositions] = useState<PlayerPosition[]>([]);
  const [substitutes, setSubstitutes] = useState<string[]>([]);
  const [substitutePlayers, setSubstitutePlayers] = useState<string[]>([]);
  const [staffAssignments, setStaffAssignments] = useState<StaffAssignment[]>([]);
  const [captainId, setCaptainId] = useState<string | null>(null);
  const [playerOfTheMatchId, setPlayerOfTheMatchId] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [homeScore, setHomeScore] = useState<number | null>(null);
  const [awayScore, setAwayScore] = useState<number | null>(null);
  const [performanceCategoryId, setPerformanceCategoryId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('selection');
  const queryClient = useQueryClient();

  const [availablePlayers, setAvailablePlayers] = useState<DatabasePlayer[]>([]);
  const [availableStaff, setAvailableStaff] = useState<DatabaseStaff[]>([]);
  const [performanceCategories, setPerformanceCategories] = useState<{ id: string; name: string; }[]>([]);

  useEffect(() => {
    loadInitialData();
  }, [event.id]);

  const loadInitialData = async () => {
    try {
      // Load existing selection data
      const { data: existingSelection, error: selectionError } = await supabase
        .from('event_selections')
        .select('*')
        .eq('event_id', event.id)
        .eq('team_number', teamNumber)
        .eq('period_number', periodNumber)
        .single();

      if (selectionError) {
        console.error('Error fetching existing selection:', selectionError);
      }

      if (existingSelection) {
        setPlayerPositions(existingSelection.player_positions as PlayerPosition[]);
        setSubstitutes(existingSelection.substitutes || []);
        setSubstitutePlayers(existingSelection.substitute_players || []);
        setStaffAssignments(existingSelection.staff_assignments as StaffAssignment[]);
        setCaptainId(existingSelection.captain_id);
        setPlayerOfTheMatchId(event.player_of_match_id || existingSelection.player_of_match_id || null);
        setNotes(existingSelection.notes || '');
        setHomeScore(existingSelection.home_score);
        setAwayScore(existingSelection.away_score);
        setDurationMinutes(existingSelection.duration_minutes || 90);
        setPerformanceCategoryId(existingSelection.performance_category_id || null);
      } else {
        // Reset to defaults if no existing selection
        setPlayerPositions([]);
        setSubstitutes([]);
        setSubstitutePlayers([]);
        setStaffAssignments([]);
        setCaptainId(null);
        setPlayerOfTheMatchId(event.player_of_match_id || null);
        setNotes('');
        setHomeScore(null);
        setAwayScore(null);
        setDurationMinutes(90);
        setPerformanceCategoryId(null);
      }

      // Load available players
      const { data: playersData, error: playersError } = await supabase
        .from('players')
        .select('*')
        .eq('team_id', event.team_id)
        .order('name', { ascending: true });

      if (playersError) {
        console.error('Error fetching available players:', playersError);
      } else {
        setAvailablePlayers(playersData || []);
      }

      // Load available staff
      const { data: staffData, error: staffError } = await supabase
        .from('staff')
        .select('*')
        .eq('team_id', event.team_id)
        .order('name', { ascending: true });

      if (staffError) {
        console.error('Error fetching available staff:', staffError);
      } else {
        setAvailableStaff(staffData || []);
      }

      // Load performance categories
      const { data: categoriesData, error: categoriesError } = await supabase
        .from('performance_categories')
        .select('id, name')
        .order('name', { ascending: true });

      if (categoriesError) {
        console.error('Error fetching performance categories:', categoriesError);
      } else {
        setPerformanceCategories(categoriesData || []);
      }

    } catch (error) {
      console.error('Error loading initial data:', error);
    }
  };

  const handleSaveSelection = async () => {
    try {
      // Validate player positions
      if (!playerPositions || playerPositions.length === 0) {
        toast.error('Please select player positions before saving.');
        return;
      }

      // Prepare the data to be saved
      const selectionData = {
        event_id: event.id,
        team_number: teamNumber,
        period_number: periodNumber,
        player_positions: playerPositions,
        substitutes: substitutes,
        substitute_players: substitutePlayers,
        staff_assignments: staffAssignments,
        captain_id: captainId,
        notes: notes,
        home_score: homeScore,
        away_score: awayScore,
        duration_minutes: durationMinutes,
        performance_category_id: performanceCategoryId,
      };

      // Check if a selection already exists for this event, team, and period
      const { data: existingSelection, error: selectError } = await supabase
        .from('event_selections')
        .select('id')
        .eq('event_id', event.id)
        .eq('team_number', teamNumber)
        .eq('period_number', periodNumber)
        .single();

      if (selectError) {
        console.error('Error checking existing selection:', selectError);
        toast.error('Error checking existing selection. Please try again.');
        return;
      }

      if (existingSelection) {
        // Update the existing selection
        const { error: updateError } = await supabase
          .from('event_selections')
          .update(selectionData)
          .eq('id', existingSelection.id);

        if (updateError) {
          console.error('Error updating selection:', updateError);
          toast.error('Error updating selection. Please try again.');
          return;
        } else {
          toast.success('Team selection updated successfully!');
        }
      } else {
        // Insert a new selection
        const { error: insertError } = await supabase
          .from('event_selections')
          .insert(selectionData);

        if (insertError) {
          console.error('Error saving selection:', insertError);
          toast.error('Error saving selection. Please try again.');
          return;
        } else {
          toast.success('Team selection saved successfully!');
        }
      }

      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['event', event.id] });
      queryClient.invalidateQueries({ queryKey: ['events'] });

    } catch (error) {
      console.error('Error saving team selection:', error);
      toast.error('Failed to save team selection. Please check the console for details.');
    }
  };

  const handleDeleteSelection = async () => {
    try {
      // Check if a selection exists for this event, team, and period
      const { data: existingSelection, error: selectError } = await supabase
        .from('event_selections')
        .select('id')
        .eq('event_id', event.id)
        .eq('team_number', teamNumber)
        .eq('period_number', periodNumber)
        .single();

      if (selectError) {
        console.error('Error checking existing selection:', selectError);
        toast.error('Error checking existing selection. Please try again.');
        return;
      }

      if (existingSelection) {
        // Delete the existing selection
        const { error: deleteError } = await supabase
          .from('event_selections')
          .delete()
          .eq('id', existingSelection.id);

        if (deleteError) {
          console.error('Error deleting selection:', deleteError);
          toast.error('Error deleting selection. Please try again.');
          return;
        } else {
          toast.success('Team selection deleted successfully!');
          // Reset the form after successful deletion
          setPlayerPositions([]);
          setSubstitutes([]);
          setSubstitutePlayers([]);
          setStaffAssignments([]);
          setCaptainId(null);
          setPlayerOfTheMatchId(null);
          setNotes('');
          setHomeScore(null);
          setAwayScore(null);
          setDurationMinutes(90);
          setPerformanceCategoryId(null);
        }
      } else {
        toast.error('No team selection found for this event, team, and period.');
      }

      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['event', event.id] });
      queryClient.invalidateQueries({ queryKey: ['events'] });

    } catch (error) {
      console.error('Error deleting team selection:', error);
      toast.error('Failed to delete team selection. Please check the console for details.');
    }
  };

  const handleUpdateEvent = async () => {
    try {
      // Prepare the data to be updated
      const eventData = {
        player_of_match_id: playerOfTheMatchId === '' ? null : playerOfTheMatchId,
        home_score: homeScore,
        away_score: awayScore,
      };

      // Update the event
      const { error: updateError } = await supabase
        .from('events')
        .update(eventData)
        .eq('id', event.id);

      if (updateError) {
        console.error('Error updating event:', updateError);
        toast.error('Error updating event. Please try again.');
        return;
      } else {
        toast.success('Event updated successfully!');
      }

      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['event', event.id] });
      queryClient.invalidateQueries({ queryKey: ['events'] });

    } catch (error) {
      console.error('Error updating event:', error);
      toast.error('Failed to update event. Please check the console for details.');
    }
  };

  const handleDebugPositions = async () => {
    try {
      await debugPlayerPositions(event.team_id, 'ALL PLAYERS');
      toast.success('Debug complete. Check console for details.');
    } catch (error) {
      console.error('Error debugging positions:', error);
      toast.error('Failed to debug positions. Check console for details.');
    }
  };

  const handleDebugMason = async () => {
    try {
      await debugMasonCMIssue();
      toast.success('Mason debug complete. Check console for details.');
    } catch (error) {
      console.error('Error debugging Mason:', error);
      toast.error('Failed to debug Mason. Check console for details.');
    }
  };

  const handleFixMason = async () => {
    try {
      await fixMasonIssue();
      toast.success('Mason issue fixed. Check console for details.');
    } catch (error) {
      console.error('Error fixing Mason:', error);
      toast.error('Failed to fix Mason. Check console for details.');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[95vw] w-full max-h-[95vh] p-0 overflow-hidden">
        <div className="flex flex-col h-[95vh]">
          <DialogHeader className="p-4 pb-2 border-b flex-shrink-0">
            <DialogTitle>
              Team Selection - {event.title} vs {event.opponent}
            </DialogTitle>
            <div className="flex items-center space-x-2">
              <Label htmlFor="teamNumber">Team:</Label>
              <Input
                type="number"
                id="teamNumber"
                value={teamNumber}
                onChange={(e) => setTeamNumber(Number(e.target.value))}
                className="w-20"
              />
              <Label htmlFor="periodNumber">Period:</Label>
              <Input
                type="number"
                id="periodNumber"
                value={periodNumber}
                onChange={(e) => setPeriodNumber(Number(e.target.value))}
                className="w-20"
              />
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-hidden">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
              <TabsList className="mx-4 mt-2 mb-0 flex-shrink-0">
                <TabsTrigger value="selection">Team Selection</TabsTrigger>
                <TabsTrigger value="debug">Debug & Repair</TabsTrigger>
              </TabsList>
              
              <div className="flex-1 overflow-hidden">
                <TabsContent value="selection" className="h-full mt-0 p-4 overflow-auto">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Player Selection */}
                    <Card>
                      <CardHeader>
                        <CardTitle>Player Positions</CardTitle>
                        <CardDescription>Select players and their positions for this event.</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <PlayerSelectionWithAvailability
                          availablePlayers={availablePlayers}
                          playerPositions={playerPositions}
                          setPlayerPositions={setPlayerPositions}
                        />
                      </CardContent>
                    </Card>

                    {/* Substitutes Selection */}
                    <Card>
                      <CardHeader>
                        <CardTitle>Substitutes</CardTitle>
                        <CardDescription>Select substitutes for this event.</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <Label className="block mb-2">Subs (old)</Label>
                        <Select onValueChange={(value) => setSubstitutes(value === '' ? [] : [value])}>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select substitute" />
                          </SelectTrigger>
                          <SelectContent>
                            {availablePlayers.map((player) => (
                              <SelectItem key={player.id} value={player.id}>{player.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>

                        <Label className="block mt-4 mb-2">Subs (new)</Label>
                        <Select onValueChange={(value) => setSubstitutePlayers(value === '' ? [] : [value])}>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select substitute player" />
                          </SelectTrigger>
                          <SelectContent>
                            {availablePlayers.map((player) => (
                              <SelectItem key={player.id} value={player.id}>{player.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </CardContent>
                    </Card>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                    {/* Staff Assignments */}
                    <Card>
                      <CardHeader>
                        <CardTitle>Staff Assignments</CardTitle>
                        <CardDescription>Assign staff roles for this event.</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <StaffSelectionSection
                          availableStaff={availableStaff}
                          staffAssignments={staffAssignments}
                          setStaffAssignments={setStaffAssignments}
                        />
                      </CardContent>
                    </Card>

                    {/* Captain Selection */}
                    <Card>
                      <CardHeader>
                        <CardTitle>Captain</CardTitle>
                        <CardDescription>Select the captain for this event.</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <Select onValueChange={(value) => setCaptainId(value === '' ? null : value)}>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select captain" />
                          </SelectTrigger>
                          <SelectContent>
                            {availablePlayers.map((player) => (
                              <SelectItem key={player.id} value={player.id}>{player.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </CardContent>
                    </Card>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                    {/* Performance Category Selection */}
                    <Card>
                      <CardHeader>
                        <CardTitle>Performance Category</CardTitle>
                        <CardDescription>Select the performance category for this event.</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <Select onValueChange={(value) => setPerformanceCategoryId(value === '' ? null : value)}>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                          <SelectContent>
                            {performanceCategories.map((category) => (
                              <SelectItem key={category.id} value={category.id}>{category.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </CardContent>
                    </Card>

                    {/* Duration Minutes Input */}
                    <Card>
                      <CardHeader>
                        <CardTitle>Duration Minutes</CardTitle>
                        <CardDescription>Set the duration in minutes for this event.</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <Label htmlFor="durationMinutes">Duration (minutes):</Label>
                        <Input
                          type="number"
                          id="durationMinutes"
                          value={durationMinutes}
                          onChange={(e) => setDurationMinutes(Number(e.target.value))}
                          className="w-full"
                        />
                      </CardContent>
                    </Card>
                  </div>

                  {/* Notes Section */}
                  <Card className="mt-4">
                    <CardHeader>
                      <CardTitle>Notes</CardTitle>
                      <CardDescription>Add any notes for this event selection.</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Label htmlFor="notes">Notes:</Label>
                      <Textarea
                        id="notes"
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        className="w-full"
                      />
                    </CardContent>
                  </Card>

                  {/* Save and Delete Buttons */}
                  <div className="flex justify-end space-x-2 mt-4">
                    <Button variant="destructive" onClick={handleDeleteSelection}>
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete Selection
                    </Button>
                    <Button onClick={handleSaveSelection}>
                      Save Selection
                    </Button>
                  </div>
                </TabsContent>

                <TabsContent value="debug" className="h-full mt-0 p-4 overflow-auto">
                  <div className="space-y-4">
                    <DataRepairPanel />
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Card>
                        <CardHeader>
                          <CardTitle>Update Event Details</CardTitle>
                          <CardDescription>Set scores and POTM</CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Label htmlFor="homeScore">Home Score:</Label>
                              <Input
                                type="number"
                                id="homeScore"
                                value={homeScore || ''}
                                onChange={(e) => setHomeScore(Number(e.target.value))}
                                className="w-full"
                              />
                            </div>
                            <div>
                              <Label htmlFor="awayScore">Away Score:</Label>
                              <Input
                                type="number"
                                id="awayScore"
                                value={awayScore || ''}
                                onChange={(e) => setAwayScore(Number(e.target.value))}
                                className="w-full"
                              />
                            </div>
                          </div>

                          <div className="mt-4">
                            <Label htmlFor="playerOfTheMatch">Player of the Match:</Label>
                            <Select onValueChange={(value) => setPlayerOfTheMatchId(value === '' ? null : value)}>
                              <SelectTrigger className="w-full">
                                <SelectValue placeholder="Select player" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="">-- Clear --</SelectItem>
                                {availablePlayers.map((player) => (
                                  <SelectItem key={player.id} value={player.id}>{player.name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <Button className="mt-4" onClick={handleUpdateEvent}>
                            Update Event
                          </Button>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader>
                          <CardTitle>Debug Tools</CardTitle>
                          <CardDescription>Run debug scripts</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <Button variant="outline" onClick={handleDebugPositions}>
                            <Users className="h-4 w-4 mr-2" />
                            Debug Player Positions
                          </Button>
                          <Button variant="outline" onClick={handleDebugMason}>
                            <Bug className="h-4 w-4 mr-2" />
                            Debug Mason CM Issue
                          </Button>
                          <Button variant="outline" onClick={handleFixMason}>
                            <Wrench className="h-4 w-4 mr-2" />
                            Attempt Fix Mason Issue
                          </Button>
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                </TabsContent>
              </div>
            </Tabs>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
