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
import { LocationInput } from '@/components/ui/location-input';
import { WeatherService } from '@/services/weatherService';
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

interface WeatherData {
  temp: number;
  description: string;
  icon: string;
}

export const EventForm: React.FC<EventFormProps> = ({ event, teamId, onSubmit, onCancel }) => {
  const { teams } = useAuth();
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [numberOfTeams, setNumberOfTeams] = useState(1);
  const [teamTimeSlots, setTeamTimeSlots] = useState<TeamTimeSlot[]>([
    { teamNumber: 1, meetingTime: '09:00', startTime: '10:00', endTime: '11:30' }
  ]);
  const [teamDefaultGameFormat, setTeamDefaultGameFormat] = useState<GameFormat>('7-a-side');
  const [teamDefaultGameDuration, setTeamDefaultGameDuration] = useState<number>(90);
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [coordinates, setCoordinates] = useState<{ lat: number; lng: number } | null>(null);
  
  const [formData, setFormData] = useState({
    type: event?.type || 'training' as const,
    title: event?.title || '',
    description: event?.description || '',
    date: event?.date || new Date().toISOString().split('T')[0],
    startTime: event?.startTime || '10:00',
    endTime: event?.endTime || '11:00',
    location: event?.location || '',
    gameFormat: event?.gameFormat || teamDefaultGameFormat,
    gameDuration: event?.gameDuration || teamDefaultGameDuration,
    opponent: event?.opponent || '',
    isHome: event?.isHome ?? true,
    facilityId: event?.facilityId || '',
    trainingNotes: event?.trainingNotes || '',
    notes: event?.notes || '',
    homeScore: event?.scores?.home || 0,
    awayScore: event?.scores?.away || 0,
    playerOfTheMatchId: event?.playerOfTheMatchId || '',
    kitSelection: event?.kitSelection || 'home' as 'home' | 'away' | 'training'
  });

  useEffect(() => {
    loadFacilities();
    loadPlayers();
    loadTeamDefaults();
  }, [teamId]);

  useEffect(() => {
    // Update form data when team defaults are loaded or when editing an existing event
    if (event) {
      console.log('Editing existing event, using event-specific values');
      const eventTeams = (event as any).teams || [teamId];
      setNumberOfTeams(eventTeams.length || 1);
      const initialSlots = eventTeams.map((_, index: number) => ({
        teamNumber: index + 1,
        meetingTime: event.meetingTime || '09:00',
        startTime: event.startTime || '10:00',
        endTime: event.endTime || '11:30'
      }));
      setTeamTimeSlots(initialSlots);
      
      setFormData({
        type: event.type || 'training',
        title: event.title || '',
        description: event.description || '',
        date: event.date || new Date().toISOString().split('T')[0],
        startTime: event.startTime || '10:00',
        endTime: event.endTime || '11:00',
        location: event.location || '',
        gameFormat: event.gameFormat || teamDefaultGameFormat,
        gameDuration: event.gameDuration || teamDefaultGameDuration,
        opponent: event.opponent || '',
        isHome: event.isHome ?? true,
        facilityId: event.facilityId || '',
        trainingNotes: event.trainingNotes || '',
        notes: event.notes || '',
        homeScore: event.scores?.home || 0,
        awayScore: event.scores?.away || 0,
        playerOfTheMatchId: event.playerOfTheMatchId || '',
        kitSelection: event.kitSelection || 'home'
      });
    } else {
      console.log('Creating new event, using team defaults - gameFormat:', teamDefaultGameFormat, 'gameDuration:', teamDefaultGameDuration);
      // For new events, use team defaults
      setFormData(prev => ({
        ...prev,
        gameFormat: teamDefaultGameFormat,
        gameDuration: teamDefaultGameDuration
      }));
    }
  }, [event, teamId, teamDefaultGameFormat, teamDefaultGameDuration]);

  const loadTeamDefaults = async () => {
    try {
      console.log('Loading team defaults for team:', teamId);
      const { data: team, error } = await supabase
        .from('teams')
        .select('game_format, game_duration')
        .eq('id', teamId)
        .single();

      if (error) {
        console.error('Error loading team defaults:', error);
        return;
      }
      
      console.log('Team defaults loaded:', team);
      
      if (team?.game_format) {
        console.log('Setting team default game format:', team.game_format);
        setTeamDefaultGameFormat(team.game_format as GameFormat);
      }

      if (team?.game_duration) {
        console.log('Setting team default game duration:', team.game_duration);
        setTeamDefaultGameDuration(team.game_duration);
      }
    } catch (error) {
      console.error('Error loading team defaults:', error);
    }
  };

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

  const handleLocationSelect = async (location: { lat: number; lng: number; address: string }) => {
    setCoordinates({ lat: location.lat, lng: location.lng });
    setFormData(prev => ({ ...prev, location: location.address }));
    
    // Fetch weather data for the location
    try {
      const weatherData = await WeatherService.getWeatherForecast(
        location.lat, 
        location.lng, 
        formData.date
      );
      setWeather(weatherData);
    } catch (error) {
      console.error('Error fetching weather:', error);
    }
  };

  const handleNumberOfTeamsChange = (newNumber: number) => {
    setNumberOfTeams(newNumber);
    
    const newSlots: TeamTimeSlot[] = [];
    for (let i = 1; i <= newNumber; i++) {
      const existingSlot = teamTimeSlots.find(slot => slot.teamNumber === i);
      if (existingSlot) {
        newSlots.push(existingSlot);
      } else {
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

  const requiresOpponent = ['fixture', 'friendly', 'tournament', 'festival'].includes(formData.type);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (requiresOpponent && !formData.opponent.trim()) {
      alert('Opponent name is required for this event type');
      return;
    }
    
    const primaryTimeSlot = teamTimeSlots[0];
    
    console.log('Submitting event with game duration:', formData.gameDuration);
    
    const eventData: Partial<Event> = {
      ...formData,
      teamId,
      teams: numberOfTeams > 1 ? Array(numberOfTeams).fill(teamId) : [teamId],
      meetingTime: primaryTimeSlot.meetingTime,
      startTime: primaryTimeSlot.startTime || formData.startTime,
      endTime: primaryTimeSlot.endTime || formData.endTime,
      opponent: requiresOpponent ? formData.opponent : undefined,
      scores: (formData.type === 'fixture' || formData.type === 'friendly') && (formData.homeScore > 0 || formData.awayScore > 0) 
        ? { home: formData.homeScore, away: formData.awayScore }
        : undefined,
      playerOfTheMatchId: formData.playerOfTheMatchId || undefined,
      kitSelection: formData.kitSelection,
      ...(coordinates && {
        latitude: coordinates.lat,
        longitude: coordinates.lng
      })
    };

    console.log('Final event data being submitted:', eventData);
    onSubmit(eventData);
  };

  const gameFormats: GameFormat[] = ['3-a-side', '4-a-side', '5-a-side', '7-a-side', '9-a-side', '11-a-side'];
  const eventTypes = ['training', 'fixture', 'friendly', 'tournament', 'festival', 'social'];
  const kitOptions: ('home' | 'away' | 'training')[] = ['home', 'away', 'training'];

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

        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            value={formData.description}
            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
            placeholder="Add event description..."
            rows={2}
          />
        </div>

        {/* Kit Selection */}
        <div className="space-y-2">
          <Label htmlFor="kitSelection">Kit Selection</Label>
          <Select
            value={formData.kitSelection}
            onValueChange={(value: 'home' | 'away' | 'training') => {
              console.log('Kit selection changed to:', value);
              setFormData(prev => ({ ...prev, kitSelection: value }));
            }}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {kitOptions.map((kit) => (
                <SelectItem key={kit} value={kit}>
                  {kit.charAt(0).toUpperCase() + kit.slice(1)} Kit
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Opponent field for fixtures, friendlies, tournaments, and festivals */}
        {requiresOpponent && (
          <div className="space-y-2">
            <Label htmlFor="opponent">Opponent Name *</Label>
            <Input
              id="opponent"
              value={formData.opponent}
              onChange={(e) => setFormData(prev => ({ ...prev, opponent: e.target.value }))}
              placeholder="Enter opponent name (e.g., Riverside)"
              required
            />
            <p className="text-sm text-muted-foreground">
              This opponent name will be used for all teams in this event
            </p>
          </div>
        )}

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
              onValueChange={(value) => {
                console.log('Game format changed to:', value);
                setFormData(prev => ({ ...prev, gameFormat: value as GameFormat }));
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {gameFormats.map((format) => (
                  <SelectItem key={format} value={format}>
                    {format} {format === teamDefaultGameFormat ? '(Team Default)' : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Game Duration */}
        <div className="space-y-2">
          <Label htmlFor="gameDuration">Game Duration (minutes)</Label>
          <Input
            id="gameDuration"
            type="number"
            min="1"
            max="180"
            value={formData.gameDuration}
            onChange={(e) => {
              const newDuration = parseInt(e.target.value) || teamDefaultGameDuration;
              console.log('Game duration changed to:', newDuration);
              setFormData(prev => ({ ...prev, gameDuration: newDuration }));
            }}
            placeholder={teamDefaultGameDuration.toString()}
          />
          <p className="text-sm text-muted-foreground">
            Team default: {teamDefaultGameDuration} minutes
          </p>
        </div>

        {/* Time fields for non-opponent events or when not using team slots */}
        {!requiresOpponent && (
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startTime">Start Time</Label>
              <Input
                id="startTime"
                type="time"
                value={formData.startTime}
                onChange={(e) => setFormData(prev => ({ ...prev, startTime: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endTime">End Time</Label>
              <Input
                id="endTime"
                type="time"
                value={formData.endTime}
                onChange={(e) => setFormData(prev => ({ ...prev, endTime: e.target.value }))}
              />
            </div>
          </div>
        )}

        {/* Number of Teams for fixtures, friendlies, tournaments, and festivals */}
        {requiresOpponent && (
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

        {/* Enhanced Location Input with Weather */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <LocationInput
              value={formData.location}
              onChange={(value) => setFormData(prev => ({ ...prev, location: value }))}
              onLocationSelect={handleLocationSelect}
              label="Location"
              placeholder="Enter location or postcode"
              required
              weather={weather}
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

        {/* Home/Away toggle for fixtures and friendlies */}
        {(formData.type === 'fixture' || formData.type === 'friendly') && (
          <div className="flex items-center space-x-2">
            <Switch
              id="isHome"
              checked={formData.isHome}
              onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isHome: checked }))}
            />
            <Label htmlFor="isHome">Home game</Label>
          </div>
        )}

        {/* Scores Section */}
        {(formData.type === 'fixture' || formData.type === 'friendly') && (
          <div className="space-y-4">
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
        )}

        {/* Player of the Match */}
        {(formData.type === 'fixture' || formData.type === 'friendly') && (
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

        {/* General Notes */}
        <div className="space-y-2">
          <Label htmlFor="notes">Notes</Label>
          <Textarea
            id="notes"
            value={formData.notes}
            onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
            placeholder="Add general notes about this event..."
            rows={3}
          />
        </div>

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
