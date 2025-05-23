import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Event, GameFormat } from '@/types';
import { Plus, X } from 'lucide-react';

interface EventFormProps {
  event?: Event | null;
  teamId: string;
  onSubmit: (eventData: Partial<Event>) => void;
  onCancel: () => void;
}

interface TeamTimeSlot {
  teamNumber: number;
  meetingTime: string;
  startTime: string;
  endTime: string;
}

interface Facility {
  id: string;
  name: string;
  description?: string;
}

interface Player {
  id: string;
  name: string;
}

export const EventForm: React.FC<EventFormProps> = ({ event, teamId, onSubmit, onCancel }) => {
  const { teams } = useAuth();
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [numberOfTeams, setNumberOfTeams] = useState(1);
  const [teamTimeSlots, setTeamTimeSlots] = useState<TeamTimeSlot[]>([
    { teamNumber: 1, meetingTime: '09:00', startTime: '10:00', endTime: '11:30' }
  ]);
  
  const [formData, setFormData] = useState({
    type: event?.type || 'training' as const,
    title: event?.title || '',
    date: event?.date || new Date().toISOString().split('T')[0],
    location: event?.location || '',
    gameFormat: event?.gameFormat || '7-a-side' as GameFormat,
    opponent: event?.opponent || '',
    isHome: event?.isHome ?? true,
    facilityId: event?.facilityId || '',
    trainingNotes: event?.trainingNotes || '',
    homeScore: event?.scores?.home || 0,
    awayScore: event?.scores?.away || 0,
    playerOfTheMatchId: event?.playerOfTheMatchId || ''
  });

  useEffect(() => {
    loadFacilities();
    loadPlayers();
    if (event) {
      setNumberOfTeams(event.teams?.length || 1);
      const initialSlots = event.teams?.map((_, index) => ({
        teamNumber: index + 1,
        meetingTime: event.meetingTime || '09:00',
        startTime: event.startTime || '10:00',
        endTime: event.endTime || '11:30'
      })) || [{ teamNumber: 1, meetingTime: event.meetingTime || '09:00', startTime: event.startTime || '10:00', endTime: event.endTime || '11:30' }];
      setTeamTimeSlots(initialSlots);
    }
  }, [event]);

  const loadFacilities = async () => {
    try {
      const team = teams.find(t => t.id === teamId);
      if (!team?.clubId) return;

      const { data, error } = await supabase
        .from('facilities')
        .select('*')
        .eq('club_id', team.clubId)
        .order('name');

      if (error) throw error;
      setFacilities(data || []);
    } catch (error) {
      console.error('Error loading facilities:', error);
    }
  };

  const loadPlayers = async () => {
    try {
      const { data, error } = await supabase
        .from('players')
        .select('id, name')
        .eq('team_id', teamId)
        .eq('status', 'active')
        .order('name');

      if (error) throw error;
      setPlayers(data || []);
    } catch (error) {
      console.error('Error loading players:', error);
    }
  };

  const handleNumberOfTeamsChange = (newNumber: number) => {
    setNumberOfTeams(newNumber);
    
    // Adjust team time slots
    const newSlots: TeamTimeSlot[] = [];
    for (let i = 1; i <= newNumber; i++) {
      const existingSlot = teamTimeSlots.find(slot => slot.teamNumber === i);
      if (existingSlot) {
        newSlots.push(existingSlot);
      } else {
        // Create new slot based on the last slot or default
        const lastSlot = teamTimeSlots[teamTimeSlots.length - 1] || teamTimeSlots[0];
        newSlots.push({
          teamNumber: i,
          meetingTime: lastSlot?.meetingTime || '09:00',
          startTime: lastSlot?.startTime || '10:00',
          endTime: lastSlot?.endTime || '11:30'
        });
      }
    }
    setTeamTimeSlots(newSlots);
  };

  const updateTeamTimeSlot = (teamNumber: number, field: keyof Omit<TeamTimeSlot, 'teamNumber'>, value: string) => {
    setTeamTimeSlots(prev => prev.map(slot => 
      slot.teamNumber === teamNumber 
        ? { ...slot, [field]: value }
        : slot
    ));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const primaryTimeSlot = teamTimeSlots[0];
    
    const eventData: Partial<Event> = {
      ...formData,
      teamId,
      teams: numberOfTeams > 1 ? Array(numberOfTeams).fill(teamId) : [teamId],
      meetingTime: primaryTimeSlot.meetingTime,
      startTime: primaryTimeSlot.startTime,
      endTime: primaryTimeSlot.endTime,
      scores: (formData.type === 'fixture' || formData.type === 'friendly') && (formData.homeScore > 0 || formData.awayScore > 0) 
        ? { home: formData.homeScore, away: formData.awayScore }
        : undefined,
      playerOfTheMatchId: formData.playerOfTheMatchId || undefined
    };

    onSubmit(eventData);
  };

  const gameFormats: GameFormat[] = ['3-a-side', '4-a-side', '5-a-side', '7-a-side', '9-a-side', '11-a-side'];
  const eventTypes = ['training', 'fixture', 'friendly', 'tournament', 'festival', 'social'];

  return (
    <ScrollArea className="max-h-[80vh] pr-4">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Event Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="type">Event Type</Label>
            <Select
              value={formData.type}
              onValueChange={(value) => setFormData(prev => ({ ...prev, type: value as any }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {eventTypes.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="title">Event Title</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="date">Date</Label>
            <Input
              id="date"
              type="date"
              value={formData.date}
              onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="gameFormat">Game Format</Label>
            <Select
              value={formData.gameFormat}
              onValueChange={(value) => setFormData(prev => ({ ...prev, gameFormat: value as GameFormat }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {gameFormats.map((format) => (
                  <SelectItem key={format} value={format}>
                    {format}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Number of Teams for fixtures, friendlies, tournaments, and festivals */}
        {(['fixture', 'friendly', 'tournament', 'festival'].includes(formData.type)) && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Number of Teams</Label>
              <Select
                value={numberOfTeams.toString()}
                onValueChange={(value) => handleNumberOfTeamsChange(parseInt(value))}
              >
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4].map((num) => (
                    <SelectItem key={num} value={num.toString()}>
                      {num} {num === 1 ? 'Team' : 'Teams'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Team Time Slots */}
            <div className="space-y-4">
              <Label className="text-lg font-semibold">Team Schedules</Label>
              {teamTimeSlots.map((slot) => (
                <Card key={slot.teamNumber}>
                  <CardHeader>
                    <CardTitle className="text-base">Team {slot.teamNumber}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label>Meeting Time</Label>
                        <Input
                          type="time"
                          value={slot.meetingTime}
                          onChange={(e) => updateTeamTimeSlot(slot.teamNumber, 'meetingTime', e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Start Time</Label>
                        <Input
                          type="time"
                          value={slot.startTime}
                          onChange={(e) => updateTeamTimeSlot(slot.teamNumber, 'startTime', e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>End Time</Label>
                        <Input
                          type="time"
                          value={slot.endTime}
                          onChange={(e) => updateTeamTimeSlot(slot.teamNumber, 'endTime', e.target.value)}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Single team time slots for other event types */}
        {!(['fixture', 'friendly', 'tournament', 'festival'].includes(formData.type)) && (
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="meetingTime">Meeting Time</Label>
              <Input
                id="meetingTime"
                type="time"
                value={teamTimeSlots[0]?.meetingTime || '09:00'}
                onChange={(e) => updateTeamTimeSlot(1, 'meetingTime', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="startTime">Start Time</Label>
              <Input
                id="startTime"
                type="time"
                value={teamTimeSlots[0]?.startTime || '10:00'}
                onChange={(e) => updateTeamTimeSlot(1, 'startTime', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endTime">End Time</Label>
              <Input
                id="endTime"
                type="time"
                value={teamTimeSlots[0]?.endTime || '11:30'}
                onChange={(e) => updateTeamTimeSlot(1, 'endTime', e.target.value)}
              />
            </div>
          </div>
        )}

        {/* Location and Facility */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="location">Location</Label>
            <Input
              id="location"
              value={formData.location}
              onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
              required
            />
          </div>

          {facilities.length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="facility">Facility</Label>
              <Select
                value={formData.facilityId}
                onValueChange={(value) => setFormData(prev => ({ ...prev, facilityId: value === 'none' ? '' : value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select facility" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No facility</SelectItem>
                  {facilities.map((facility) => (
                    <SelectItem key={facility.id} value={facility.id}>
                      {facility.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        {/* Opponent for fixtures and friendlies */}
        {(formData.type === 'fixture' || formData.type === 'friendly') && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="opponent">Opponent</Label>
              <Input
                id="opponent"
                value={formData.opponent}
                onChange={(e) => setFormData(prev => ({ ...prev, opponent: e.target.value }))}
                placeholder="Enter opponent name"
              />
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="isHome"
                checked={formData.isHome}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isHome: checked }))}
              />
              <Label htmlFor="isHome">Home game</Label>
            </div>

            {/* Scores Section */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Match Result</CardTitle>
                <CardDescription>Enter the final score if the match has been played</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="homeScore">
                      {formData.isHome ? 'Our Score' : 'Opponent Score'}
                    </Label>
                    <Input
                      id="homeScore"
                      type="number"
                      min="0"
                      value={formData.homeScore}
                      onChange={(e) => setFormData(prev => ({ ...prev, homeScore: parseInt(e.target.value) || 0 }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="awayScore">
                      {formData.isHome ? 'Opponent Score' : 'Our Score'}
                    </Label>
                    <Input
                      id="awayScore"
                      type="number"
                      min="0"
                      value={formData.awayScore}
                      onChange={(e) => setFormData(prev => ({ ...prev, awayScore: parseInt(e.target.value) || 0 }))}
                    />
                  </div>
                </div>

                {/* Player of the Match */}
                <div className="space-y-2">
                  <Label htmlFor="playerOfTheMatch">Player of the Match</Label>
                  <Select
                    value={formData.playerOfTheMatchId}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, playerOfTheMatchId: value === 'none' ? '' : value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select player of the match" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No player selected</SelectItem>
                      {players.map((player) => (
                        <SelectItem key={player.id} value={player.id}>
                          {player.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Training Notes */}
        {formData.type === 'training' && (
          <div className="space-y-2">
            <Label htmlFor="trainingNotes">Training Notes</Label>
            <Textarea
              id="trainingNotes"
              value={formData.trainingNotes}
              onChange={(e) => setFormData(prev => ({ ...prev, trainingNotes: e.target.value }))}
              placeholder="Add notes about this training session..."
              rows={3}
            />
          </div>
        )}

        {/* Form Actions */}
        <div className="flex gap-2 pt-4">
          <Button type="submit" className="flex-1">
            {event ? 'Update Event' : 'Create Event'}
          </Button>
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </form>
    </ScrollArea>
  );
};
