
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { LocationInput } from '@/components/ui/location-input';
import { WeatherService } from '@/services/weatherService';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Event, GameFormat } from '@/types';
import { CalendarIcon } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { TeamSelector } from './TeamSelector';
import { Switch } from '@/components/ui/switch';

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
  const [numberOfTeams, setNumberOfTeams] = useState(event?.teams?.length || 1);
  const [selectedTeams, setSelectedTeams] = useState<string[]>(event?.teams || [teamId]);
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
    isHome: event?.isHome !== undefined ? event.isHome : true,
    facilityId: event?.facilityId || '',
    trainingNotes: event?.trainingNotes || '',
    notes: event?.notes || '',
    kitSelection: event?.kitSelection || 'home' as 'home' | 'away' | 'training',
    latitude: event?.latitude,
    longitude: event?.longitude,
  });

  // Get current team data
  const currentTeam = teams?.find(t => t.id === teamId);

  useEffect(() => {
    loadFacilities();
    loadPlayers();
    loadTeamDefaults();
  }, [teamId]);

  useEffect(() => {
    // Update form data when team defaults are loaded or when editing an existing event
    if (event) {
      console.log('Editing existing event, using event-specific values');
      const eventTeams = event.teams || [teamId];
      setSelectedTeams(eventTeams);
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
        isHome: event.isHome !== undefined ? event.isHome : true,
        facilityId: event.facilityId || '',
        trainingNotes: event.trainingNotes || '',
        notes: event.notes || '',
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

  // Handle home/away toggle
  useEffect(() => {
    if (formData.isHome && currentTeam?.homeLocation && !event) {
      // Auto-populate home location for new events
      setFormData(prev => ({
        ...prev,
        location: currentTeam.homeLocation || '',
        latitude: currentTeam.homeLatitude,
        longitude: currentTeam.homeLongitude
      }));
      
      if (currentTeam.homeLatitude && currentTeam.homeLongitude) {
        setCoordinates({ lat: currentTeam.homeLatitude, lng: currentTeam.homeLongitude });
      }
    } else if (!formData.isHome && !event) {
      // Clear location for away games on new events
      setFormData(prev => ({
        ...prev,
        location: '',
        latitude: undefined,
        longitude: undefined
      }));
      setCoordinates(null);
    }
  }, [formData.isHome, currentTeam, event]);

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
    
    // Create an array of team IDs
    // For the first team, use the actual teamId
    // For additional teams, we'll use teamId as a base identifier
    const teams: string[] = [teamId];
    for (let i = 1; i < newNumber; i++) {
      teams.push(teamId);
    }
    
    setSelectedTeams(teams);
    
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

  const handleTeamsChange = (teams: string[]) => {
    setSelectedTeams(teams);
    setNumberOfTeams(teams.length);
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
    console.log('Teams selected:', selectedTeams);
    
    const eventData: Partial<Event> = {
      ...formData,
      teamId,
      teams: selectedTeams,
      meetingTime: primaryTimeSlot.meetingTime,
      startTime: primaryTimeSlot.startTime || formData.startTime,
      endTime: primaryTimeSlot.endTime || formData.endTime,
      opponent: requiresOpponent ? formData.opponent : undefined,
      type: formData.type as any, // Make sure type is explicitly set
    };

    if (formData.latitude && formData.longitude) {
      eventData.latitude = formData.latitude;
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-4">
            <div>
              <Label htmlFor="type" className="text-sm font-medium">Event Type</Label>
              <Select
                value={formData.type}
                onValueChange={(value) => setFormData(prev => ({ ...prev, type: value as any }))}
              >
                <SelectTrigger className="w-full mt-1">
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
            
            <div>
              <Label htmlFor="title" className="text-sm font-medium">Title</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                required
                className="mt-1"
              />
            </div>
            
            <div>
              <Label htmlFor="description" className="text-sm font-medium">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Add event description..."
                className="mt-1"
                rows={2}
              />
            </div>
            
            <div>
              <Label htmlFor="kitSelection" className="text-sm font-medium">Kit</Label>
              <Select
                value={formData.kitSelection}
                onValueChange={(value: 'home' | 'away' | 'training') => {
                  setFormData(prev => ({ ...prev, kitSelection: value }));
                }}
              >
                <SelectTrigger className="w-full mt-1">
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
            
            <div>
              <Label htmlFor="gameFormat" className="text-sm font-medium">Game Format</Label>
              <Select
                value={formData.gameFormat}
                onValueChange={(value) => {
                  setFormData(prev => ({ ...prev, gameFormat: value as GameFormat }));
                }}
              >
                <SelectTrigger className="w-full mt-1">
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
            
            <div>
              <Label htmlFor="gameDuration" className="text-sm font-medium">Game Duration</Label>
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
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Team default: {teamDefaultGameDuration} minutes
              </p>
            </div>
            
            {/* Opponent field for fixtures, friendlies, tournaments, and festivals */}
            {requiresOpponent && (
              <div>
                <Label htmlFor="opponent" className="text-sm font-medium">Opponent *</Label>
                <Input
                  id="opponent"
                  value={formData.opponent}
                  onChange={(e) => setFormData(prev => ({ ...prev, opponent: e.target.value }))}
                  placeholder="Enter opponent name"
                  required
                  className="mt-1"
                />
              </div>
            )}

            {/* Home/Away Toggle for match types */}
            {requiresOpponent && (
              <>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="isHome"
                    checked={formData.isHome}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isHome: checked }))}
                  />
                  <Label htmlFor="isHome" className="text-sm font-medium">
                    {formData.isHome ? 'Home Game' : 'Away Game'}
                  </Label>
                </div>
                
                {formData.isHome && currentTeam?.homeLocation && (
                  <div className="text-xs text-muted-foreground">
                    Using team's home location: {currentTeam.homeLocation}
                  </div>
                )}
              </>
            )}
            
            {/* Number of Teams selection */}
            {requiresOpponent && (
              <div>
                <Label htmlFor="numberOfTeams" className="text-sm font-medium">Number of Teams</Label>
                <Select
                  value={numberOfTeams.toString()}
                  onValueChange={(value) => handleNumberOfTeamsChange(parseInt(value))}
                >
                  <SelectTrigger className="w-full mt-1">
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
                <p className="text-xs text-muted-foreground mt-1">
                  This will create {numberOfTeams} {numberOfTeams === 1 ? 'team' : 'teams'} in the team selection interface
                </p>
              </div>
            )}
          </div>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="date" className="text-sm font-medium">Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full mt-1 justify-start text-left font-normal",
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
            
            <div>
              <Label htmlFor="startTime" className="text-sm font-medium">Start Time</Label>
              <Input
                id="startTime"
                type="time"
                value={formData.startTime}
                onChange={(e) => setFormData(prev => ({ ...prev, startTime: e.target.value }))}
                className="mt-1"
              />
            </div>
            
            <div>
              <Label htmlFor="endTime" className="text-sm font-medium">End Time</Label>
              <Input
                id="endTime"
                type="time"
                value={formData.endTime}
                onChange={(e) => setFormData(prev => ({ ...prev, endTime: e.target.value }))}
                className="mt-1"
              />
            </div>
            
            <div>
              <Label htmlFor="location" className="text-sm font-medium">Location *</Label>
              <LocationInput
                value={formData.location}
                onChange={(value) => setFormData(prev => ({ ...prev, location: value }))}
                onLocationSelect={handleLocationSelect}
                placeholder={formData.isHome && currentTeam?.homeLocation ? currentTeam.homeLocation : "Enter location or postcode"}
                required
                weather={weather}
                className="mt-1"
              />
              {formData.isHome && currentTeam?.homeLocation && (
                <p className="text-xs text-muted-foreground mt-1">
                  Home location will be automatically filled
                </p>
              )}
            </div>
            
            {facilities.length > 0 && (
              <div>
                <Label htmlFor="facility" className="text-sm font-medium">Facility</Label>
                <Select
                  value={formData.facilityId}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, facilityId: value === 'none' ? '' : value }))}
                >
                  <SelectTrigger className="w-full mt-1">
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
            
            {/* Notes Section */}
            <div>
              <Label htmlFor="notes" className="text-sm font-medium">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Add general notes about this event..."
                className="mt-1"
                rows={2}
              />
            </div>
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
