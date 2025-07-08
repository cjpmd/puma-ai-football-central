
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { LocationInput } from '@/components/ui/location-input';
import { WeatherService } from '@/services/weatherService';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Event, GameFormat } from '@/types';
import { CalendarIcon, Clock } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

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
  const [date, setDate] = useState<Date | undefined>(event?.date ? new Date(event.date) : new Date());
  
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
    playerOfTheMatchId: event?.playerOfMatchId || '',
    kitSelection: event?.kitSelection || 'home' as 'home' | 'away' | 'training',
    latitude: event?.latitude,
    longitude: event?.longitude
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
      const initialSlots = eventTeams.map((_: any, index: number) => ({
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
        playerOfTheMatchId: event.playerOfMatchId || '',
        kitSelection: event.kitSelection || 'home',
        latitude: event.latitude,
        longitude: event.longitude
      });
      
      if (event.date) {
        setDate(new Date(event.date));
      }
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
    setFormData(prev => ({ ...prev, location: location.address, latitude: location.lat, longitude: location.lng }));
    
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

  const handleDateChange = (newDate: Date | undefined) => {
    if (newDate) {
      setDate(newDate);
      setFormData(prev => ({ 
        ...prev, 
        date: newDate.toISOString().split('T')[0] 
      }));
    }
  };

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
      playerOfMatchId: formData.playerOfTheMatchId || undefined
    };

    if (formData.latitude && formData.longitude) {
      // @ts-ignore - Add these properties even if they're not in the type
      eventData.latitude = formData.latitude;
      // @ts-ignore
      eventData.longitude = formData.longitude;
    }

    console.log('Final event data being submitted:', eventData);
    onSubmit(eventData);
  };

  const gameFormats: GameFormat[] = ['3-a-side', '4-a-side', '5-a-side', '7-a-side', '9-a-side', '11-a-side'];
  const eventTypes = ['training', 'fixture', 'friendly', 'tournament', 'festival', 'social'];
  const kitOptions: ('home' | 'away' | 'training')[] = ['home', 'away', 'training'];

  return (
    <ScrollArea className="max-h-[70vh]">
      <form onSubmit={handleSubmit} className="space-y-4 p-1">
        <div className="grid grid-cols-1 gap-4">
          <div className="grid grid-cols-3 items-center gap-4">
            <Label htmlFor="type" className="text-right">Event Type</Label>
            <Select
              value={formData.type}
              onValueChange={(value) => setFormData(prev => ({ ...prev, type: value as any }))}
            >
              <SelectTrigger className="col-span-2">
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
          
          <div className="grid grid-cols-3 items-center gap-4">
            <Label htmlFor="title" className="text-right">Title</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              required
              className="col-span-2"
            />
          </div>
          
          <div className="grid grid-cols-3 items-center gap-4">
            <Label htmlFor="description" className="text-right">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Add event description..."
              className="col-span-2"
              rows={2}
            />
          </div>
          
          <div className="grid grid-cols-3 items-center gap-4">
            <Label htmlFor="kitSelection" className="text-right">Kit</Label>
            <Select
              value={formData.kitSelection}
              onValueChange={(value: 'home' | 'away' | 'training') => {
                setFormData(prev => ({ ...prev, kitSelection: value }));
              }}
            >
              <SelectTrigger className="col-span-2">
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
          
          <div className="grid grid-cols-3 items-center gap-4">
            <Label htmlFor="gameFormat" className="text-right">Game Format</Label>
            <Select
              value={formData.gameFormat}
              onValueChange={(value) => {
                setFormData(prev => ({ ...prev, gameFormat: value as GameFormat }));
              }}
            >
              <SelectTrigger className="col-span-2">
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
          
          <div className="grid grid-cols-3 items-center gap-4">
            <Label htmlFor="gameDuration" className="text-right">Game Duration</Label>
            <div className="col-span-2">
              <Input
                id="gameDuration"
                type="number"
                min="1"
                max="180"
                value={formData.gameDuration}
                onChange={(e) => {
                  const newDuration = parseInt(e.target.value) || teamDefaultGameDuration;
                  setFormData(prev => ({ ...prev, gameDuration: newDuration }));
                }}
                placeholder={teamDefaultGameDuration.toString()}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Team default: {teamDefaultGameDuration} minutes
              </p>
            </div>
          </div>
          
          {/* Opponent field for fixtures, friendlies, tournaments, and festivals */}
          {requiresOpponent && (
            <div className="grid grid-cols-3 items-center gap-4">
              <Label htmlFor="opponent" className="text-right">Opponent *</Label>
              <Input
                id="opponent"
                value={formData.opponent}
                onChange={(e) => setFormData(prev => ({ ...prev, opponent: e.target.value }))}
                placeholder="Enter opponent name"
                required
                className="col-span-2"
              />
            </div>
          )}
          
          <div className="grid grid-cols-3 items-center gap-4">
            <Label htmlFor="date" className="text-right">Date</Label>
            <div className="col-span-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !date && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {date ? format(date, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={handleDateChange}
                    initialFocus
                    className="p-3 pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
          
          <div className="grid grid-cols-3 items-center gap-4">
            <Label htmlFor="startTime" className="text-right">Start Time</Label>
            <Input
              id="startTime"
              type="time"
              value={formData.startTime}
              onChange={(e) => setFormData(prev => ({ ...prev, startTime: e.target.value }))}
              className="col-span-2"
            />
          </div>
          
          <div className="grid grid-cols-3 items-center gap-4">
            <Label htmlFor="endTime" className="text-right">End Time</Label>
            <Input
              id="endTime"
              type="time"
              value={formData.endTime}
              onChange={(e) => setFormData(prev => ({ ...prev, endTime: e.target.value }))}
              className="col-span-2"
            />
          </div>
          
          {/* Number of Teams selection */}
          {requiresOpponent && (
            <div className="grid grid-cols-3 items-center gap-4">
              <Label htmlFor="numberOfTeams" className="text-right">Number of Teams</Label>
              <Select
                value={numberOfTeams.toString()}
                onValueChange={(value) => handleNumberOfTeamsChange(parseInt(value))}
              >
                <SelectTrigger className="col-span-2">
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
          )}
          
          <div className="grid grid-cols-3 items-center gap-4">
            <Label htmlFor="location" className="text-right">Location *</Label>
            <LocationInput
              value={formData.location}
              onChange={(value) => setFormData(prev => ({ ...prev, location: value }))}
              onLocationSelect={handleLocationSelect}
              placeholder="Enter location or postcode"
              required
              weather={weather}
              className="col-span-2"
            />
          </div>
          
          {facilities.length > 0 && (
            <div className="grid grid-cols-3 items-center gap-4">
              <Label htmlFor="facility" className="text-right">Facility</Label>
              <Select
                value={formData.facilityId}
                onValueChange={(value) => setFormData(prev => ({ ...prev, facilityId: value === 'none' ? '' : value }))}
              >
                <SelectTrigger className="col-span-2">
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
          
          {/* Home/Away toggle for fixtures and friendlies */}
          {(formData.type === 'fixture' || formData.type === 'friendly') && (
            <div className="grid grid-cols-3 items-center gap-4">
              <Label htmlFor="isHome" className="text-right">Home game</Label>
              <div className="col-span-2">
                <Switch
                  id="isHome"
                  checked={formData.isHome}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isHome: checked }))}
                />
              </div>
            </div>
          )}
          
          {/* Scores Section */}
          {(formData.type === 'fixture' || formData.type === 'friendly') && (
            <>
              <div className="grid grid-cols-3 items-center gap-4">
                <Label htmlFor="homeScore" className="text-right">
                  {formData.isHome ? 'Our Score' : 'Opponent Score'}
                </Label>
                <Input
                  id="homeScore"
                  type="number"
                  min="0"
                  value={formData.homeScore}
                  onChange={(e) => setFormData(prev => ({ ...prev, homeScore: parseInt(e.target.value) || 0 }))}
                  className="col-span-2"
                />
              </div>
              
              <div className="grid grid-cols-3 items-center gap-4">
                <Label htmlFor="awayScore" className="text-right">
                  {formData.isHome ? 'Opponent Score' : 'Our Score'}
                </Label>
                <Input
                  id="awayScore"
                  type="number"
                  min="0"
                  value={formData.awayScore}
                  onChange={(e) => setFormData(prev => ({ ...prev, awayScore: parseInt(e.target.value) || 0 }))}
                  className="col-span-2"
                />
              </div>
            </>
          )}
          
          {/* Player of the Match */}
          {(formData.type === 'fixture' || formData.type === 'friendly') && (
            <div className="grid grid-cols-3 items-center gap-4">
              <Label htmlFor="playerOfTheMatch" className="text-right">Player of the Match</Label>
              <Select
                value={formData.playerOfTheMatchId}
                onValueChange={(value) => setFormData(prev => ({ ...prev, playerOfTheMatchId: value === 'none' ? '' : value }))}
              >
                <SelectTrigger className="col-span-2">
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
          
          {/* Notes Section */}
          <div className="grid grid-cols-3 items-center gap-4">
            <Label htmlFor="notes" className="text-right">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Add general notes about this event..."
              className="col-span-2"
              rows={2}
            />
          </div>
        </div>

        {/* Form Actions */}
        <div className="flex flex-row-reverse justify-start gap-2 pt-4">
          <Button type="submit">
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
