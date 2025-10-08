import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Calendar, MapPin, Clock, Users, Trophy, FileText, UserCheck } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { eventsService } from '@/services/eventsService';
import { GameFormat } from '@/types';
import { EventSquadPicker } from './EventSquadPicker';

interface EventFormProps {
  onEventCreated?: (eventId: string) => void;
  initialData?: any;
  isEditing?: boolean;
  // New props for compatibility
  event?: any;
  teamId?: string;
  onSubmit?: (eventData: any) => void;
  onCancel?: () => void;
}

export const EventForm: React.FC<EventFormProps> = ({ 
  onEventCreated, 
  initialData, 
  isEditing = false,
  event,
  teamId,
  onSubmit,
  onCancel 
}) => {
  const { teams, user } = useAuth();
  
  // Use event prop if provided, otherwise use initialData
  const eventData = event || initialData;
  const actualIsEditing = isEditing || !!eventData?.id;
  
  const [formData, setFormData] = useState({
    title: '',
    date: '',
    start_time: '',
    end_time: '',
    location: '',
    event_type: 'training',
    team_id: teamId || '',
    opponent: '',
    description: '',
    notes: '',
    game_format: '7-a-side',
    game_duration: 50,
    is_home: true,
    kit_selection: 'home',
    facility_id: '',
    num_teams: 1,
    meeting_time: '',
  });
  const [teamTimes, setTeamTimes] = useState<{[teamNumber: number]: {start_time: string, meeting_time: string}}>({});
  const [loading, setLoading] = useState(false);
  const [performanceCategories, setPerformanceCategories] = useState<any[]>([]);
  const [facilities, setFacilities] = useState<any[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<any>(null);
  
  // New states for invitation management
  const [invitationType, setInvitationType] = useState<'everyone' | 'pick_squad'>('everyone');
  const [showSquadPicker, setShowSquadPicker] = useState(false);
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<string[]>([]);
  const [selectedStaffIds, setSelectedStaffIds] = useState<string[]>([]);

  // Load team settings when team is selected
  useEffect(() => {
    const loadTeamSettings = async () => {
      if (formData.team_id) {
        const team = teams.find(t => t.id === formData.team_id);
        if (team) {
          setSelectedTeam(team);
          // Set defaults from team settings if not editing existing event
          if (!eventData) {
            setFormData(prev => ({
              ...prev,
              game_format: team.gameFormat || '7-a-side',
              game_duration: team.gameDuration || 50
            }));
          }
        }
      }
    };

    loadTeamSettings();
  }, [formData.team_id, teams, eventData]);

  useEffect(() => {
    if (eventData) {
      setFormData({
        title: eventData.title || '',
        date: eventData.date || '',
        start_time: eventData.startTime || eventData.start_time || '',
        end_time: eventData.endTime || eventData.end_time || '',
        location: eventData.location || '',
        event_type: eventData.type || eventData.event_type || 'training',
        team_id: eventData.teamId || eventData.team_id || teamId || '',
        opponent: eventData.opponent || '',
        description: eventData.description || '',
        notes: eventData.notes || '',
        game_format: eventData.gameFormat || eventData.game_format || '7-a-side',
        game_duration: eventData.gameDuration || eventData.game_duration || 50,
        is_home: eventData.isHome !== undefined ? eventData.isHome : eventData.is_home !== undefined ? eventData.is_home : true,
        kit_selection: eventData.kitSelection || eventData.kit_selection || 'home',
        facility_id: eventData.facilityId || eventData.facility_id || '',
        num_teams: eventData.num_teams || 1,
        meeting_time: eventData.meetingTime || eventData.meeting_time || '',
      });
      
      // Load team-specific times if editing
      if (eventData?.id && actualIsEditing) {
        loadTeamTimes(eventData.id);
      }
    }
  }, [eventData, teamId, actualIsEditing]);

  useEffect(() => {
    if (formData.team_id) {
      loadPerformanceCategories();
      loadFacilities();
    }
  }, [formData.team_id]);

  const loadPerformanceCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('performance_categories')
        .select('*')
        .eq('team_id', formData.team_id)
        .order('name');

      if (error) throw error;
      setPerformanceCategories(data || []);
    } catch (error) {
      console.error('Error loading performance categories:', error);
    }
  };

  const loadFacilities = async () => {
    try {
      // Get team's club first
      const { data: teamData, error: teamError } = await supabase
        .from('teams')
        .select('club_id')
        .eq('id', formData.team_id)
        .single();

      if (teamError || !teamData?.club_id) {
        setFacilities([]);
        return;
      }

      const { data, error } = await supabase
        .from('facilities')
        .select('*')
        .eq('club_id', teamData.club_id)
        .order('name');

      if (error) throw error;
      setFacilities(data || []);
    } catch (error) {
      console.error('Error loading facilities:', error);
      setFacilities([]);
    }
  };

  const loadTeamTimes = async (eventId: string) => {
    try {
      const { data, error } = await supabase
        .from('event_teams')
        .select('team_number, start_time, meeting_time')
        .eq('event_id', eventId);

      if (error) throw error;

      const timesMap: {[teamNumber: number]: {start_time: string, meeting_time: string}} = {};
      data?.forEach(team => {
        timesMap[team.team_number] = {
          start_time: team.start_time || '',
          meeting_time: team.meeting_time || ''
        };
      });

      setTeamTimes(timesMap);
      
      // Update num_teams based on loaded data
      if (data && data.length > 1) {
        setFormData(prev => ({ ...prev, num_teams: data.length }));
      }
    } catch (error) {
      console.error('Error loading team times:', error);
    }
  };

  // Auto-calculate meeting time (30 mins before start time)
  const calculateMeetingTime = (startTime: string): string => {
    if (!startTime) return '';
    
    const [hours, minutes] = startTime.split(':').map(Number);
    const startDate = new Date();
    startDate.setHours(hours, minutes, 0, 0);
    
    const meetingDate = new Date(startDate.getTime() - 30 * 60 * 1000); // 30 minutes earlier
    
    return `${meetingDate.getHours().toString().padStart(2, '0')}:${meetingDate.getMinutes().toString().padStart(2, '0')}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // If pick squad is selected and squad picker not shown yet, show it instead of submitting
    if (invitationType === 'pick_squad' && !showSquadPicker) {
      setShowSquadPicker(true);
      return;
    }
    
    if (!formData.team_id || !formData.title || !formData.date) {
      toast.error('Please fill in all required fields');
      return;
    }

    setLoading(true);

    try {
      // Clean up the form data to ensure proper format
      const cleanEventData = {
        teamId: formData.team_id,
        title: formData.title,
        date: formData.date,
        startTime: formData.start_time,
        endTime: formData.end_time,
        location: formData.location,
        type: formData.event_type as 'training' | 'match' | 'fixture' | 'tournament' | 'festival' | 'social' | 'friendly',
        opponent: formData.opponent,
        description: formData.description,
        notes: formData.notes,
        gameFormat: formData.game_format as GameFormat,
        gameDuration: formData.game_duration,
        isHome: formData.is_home,
        kitSelection: formData.kit_selection as 'home' | 'away' | 'training',
        facilityId: formData.facility_id,
        meetingTime: formData.meeting_time,
        teams: formData.num_teams > 1 ? Array.from({ length: formData.num_teams }, (_, i) => {
          const teamNumber = i + 1;
          const teamStartTime = teamTimes[teamNumber]?.start_time || formData.start_time;
          const teamMeetingTime = teamTimes[teamNumber]?.meeting_time || (teamStartTime ? calculateMeetingTime(teamStartTime) : formData.meeting_time);
          return {
            id: formData.team_id,
            start_time: teamStartTime,
            meeting_time: teamMeetingTime
          };
        }) : undefined,
      };

      // If onSubmit prop is provided, use it (for new EventForm interface)
      if (onSubmit) {
        await onSubmit(cleanEventData);
        return;
      }

      let eventId: string;

      // Otherwise use the original logic
      if (actualIsEditing && eventData?.id) {
        // Update existing event
        const { error } = await supabase
          .from('events')
          .update({
            team_id: cleanEventData.teamId,
            title: cleanEventData.title,
            date: cleanEventData.date,
            start_time: cleanEventData.startTime,
            end_time: cleanEventData.endTime,
            location: cleanEventData.location,
            event_type: cleanEventData.type,
            opponent: cleanEventData.opponent,
            description: cleanEventData.description,
            notes: cleanEventData.notes,
            game_format: cleanEventData.gameFormat,
            game_duration: cleanEventData.gameDuration,
            is_home: cleanEventData.isHome,
            kit_selection: cleanEventData.kitSelection,
            facility_id: cleanEventData.facilityId || null,
            meeting_time: formData.meeting_time,
            teams: cleanEventData.teams || null,
          })
          .eq('id', eventData.id);

        if (error) throw error;

        // Update or create team-specific times
        if (formData.num_teams > 1) {
          // Delete existing event_teams first
          await supabase
            .from('event_teams')
            .delete()
            .eq('event_id', eventData.id);

          // Insert updated team times
          for (let i = 1; i <= formData.num_teams; i++) {
            const teamStartTime = teamTimes[i]?.start_time || formData.start_time;
            const teamMeetingTime = teamTimes[i]?.meeting_time || (teamStartTime ? calculateMeetingTime(teamStartTime) : formData.meeting_time);
            
            await supabase
              .from('event_teams')
              .insert({
                event_id: eventData.id,
                team_id: formData.team_id,
                team_number: i,
                start_time: teamStartTime,
                meeting_time: teamMeetingTime
              });
          }
        } else {
          // Single team - update or create event_teams record
          const { data: existingTeam } = await supabase
            .from('event_teams')
            .select('id')
            .eq('event_id', eventData.id)
            .eq('team_number', 1)
            .single();

          if (existingTeam) {
            await supabase
              .from('event_teams')
              .update({
                start_time: formData.start_time,
                meeting_time: formData.meeting_time || (formData.start_time ? calculateMeetingTime(formData.start_time) : '')
              })
              .eq('event_id', eventData.id)
              .eq('team_number', 1);
          } else {
            await supabase
              .from('event_teams')
              .insert({
                event_id: eventData.id,
                team_id: formData.team_id,
                team_number: 1,
                start_time: formData.start_time,
                meeting_time: formData.meeting_time || (formData.start_time ? calculateMeetingTime(formData.start_time) : '')
              });
          }
        }

        toast.success('Event updated successfully');
        if (onEventCreated) onEventCreated(eventData.id);
        eventId = eventData.id;
      } else {
        // Create new event using the service with invitation data
        const newEvent = await eventsService.createEvent(cleanEventData, {
          type: invitationType,
          selectedPlayerIds: invitationType === 'pick_squad' ? selectedPlayerIds : undefined,
          selectedStaffIds: invitationType === 'pick_squad' ? selectedStaffIds : undefined
        });
        
        toast.success('Event created successfully');
        if (onEventCreated) onEventCreated(newEvent.id);
        eventId = newEvent.id;
      }

    } catch (error: any) {
      console.error('Error saving event:', error);
      toast.error(error.message || 'Failed to save event');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    }
  };
  
  // Squad picker handlers
  const handlePlayerToggle = (playerId: string) => {
    setSelectedPlayerIds(prev => 
      prev.includes(playerId) 
        ? prev.filter(id => id !== playerId)
        : [...prev, playerId]
    );
  };
  
  const handleStaffToggle = (staffId: string) => {
    setSelectedStaffIds(prev => 
      prev.includes(staffId) 
        ? prev.filter(id => id !== staffId)
        : [...prev, staffId]
    );
  };
  
  const handleSelectAll = (type: 'full_squad' | 'training' | 'trialist' | 'staff') => {
    if (!formData.team_id) return;
    
    if (type === 'staff') {
      // Select all staff
      // @ts-ignore - Supabase type inference causes excessive depth
      supabase
        .from('team_staff')
        .select('id')
        .eq('team_id', formData.team_id)
        .eq('is_active', true)
        .then(({ data }: any) => {
          if (data) {
            const staffIds = data.map((s: any) => s.id);
            setSelectedStaffIds(prev => [...new Set([...prev, ...staffIds])]);
          }
        });
    } else {
      // Select all players of subscription type
      // @ts-ignore - Supabase type inference causes excessive depth
      supabase
        .from('players')
        .select('id')
        .eq('team_id', formData.team_id)
        .eq('is_active', true)
        .eq('subscription_type', type)
        .then(({ data }: any) => {
          if (data) {
            const playerIds = data.map((p: any) => p.id);
            setSelectedPlayerIds(prev => [...new Set([...prev, ...playerIds])]);
          }
        });
    }
  };
  
  const handleDeselectAll = (type: 'full_squad' | 'training' | 'trialist' | 'staff') => {
    if (!formData.team_id) return;
    
    if (type === 'staff') {
      // Deselect all staff
      // @ts-ignore - Supabase type inference causes excessive depth
      supabase
        .from('team_staff')
        .select('id')
        .eq('team_id', formData.team_id)
        .eq('is_active', true)
        .then(({ data }: any) => {
          if (data) {
            const staffIds = data.map((s: any) => s.id);
            setSelectedStaffIds(prev => prev.filter(id => !staffIds.includes(id)));
          }
        });
    } else {
      // Deselect all players of subscription type
      // @ts-ignore - Supabase type inference causes excessive depth
      supabase
        .from('players')
        .select('id')
        .eq('team_id', formData.team_id)
        .eq('is_active', true)
        .eq('subscription_type', type)
        .then(({ data }: any) => {
          if (data) {
            const playerIds = data.map((p: any) => p.id);
            setSelectedPlayerIds(prev => prev.filter(id => !playerIds.includes(id)));
          }
        });
    }
  };

  const eventTypes = [
    { value: 'training', label: 'Training', icon: Users },
    { value: 'fixture', label: 'Fixture', icon: Trophy },
    { value: 'tournament', label: 'Tournament', icon: Trophy },
    { value: 'festival', label: 'Festival', icon: Calendar },
    { value: 'social', label: 'Social', icon: Users },
    { value: 'friendly', label: 'Friendly', icon: Trophy },
  ];

  const gameFormats = [
    { value: '7-a-side', label: '7-a-side (Team Default)' },
    { value: '11-a-side', label: '11-a-side' },
    { value: '9-a-side', label: '9-a-side' },
    { value: '5-a-side', label: '5-a-side' },
    { value: '3-a-side', label: '3-a-side' },
  ];

  const kitOptions = [
    { value: 'home', label: 'Home Kit' },
    { value: 'away', label: 'Away Kit' },
    { value: 'training', label: 'Training Kit' },
  ];

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          {actualIsEditing ? 'Edit Event' : 'Create New Event'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="event_type">Event Type</Label>
              <Select 
                value={formData.event_type} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, event_type: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {eventTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      <div className="flex items-center gap-2">
                        <type.icon className="h-4 w-4" />
                        {type.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="date">Date *</Label>
              <Input
                id="date"
                type="date"
                value={formData.date}
                onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                required
              />
            </div>
          </div>

          <div>
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              placeholder="Enter event title"
              required
            />
          </div>

          <div>
            <Label htmlFor="team_id">Team *</Label>
            <Select 
              value={formData.team_id} 
              onValueChange={(value) => setFormData(prev => ({ ...prev, team_id: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select team" />
              </SelectTrigger>
              <SelectContent>
                {teams.map((team) => (
                  <SelectItem key={team.id} value={team.id}>
                    {team.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Add event description..."
              rows={3}
            />
          </div>

          {/* Location */}
          <div>
            <Label htmlFor="location">Location *</Label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="location"
                value={formData.location}
                onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                placeholder="Location"
                className="pl-10"
              />
            </div>
          </div>

          {/* Kit Selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="kit_selection">Kit</Label>
              <Select 
                value={formData.kit_selection} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, kit_selection: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {kitOptions.map((kit) => (
                    <SelectItem key={kit.value} value={kit.value}>
                      {kit.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="facility_id">Facility</Label>
              <Select 
                value={formData.facility_id} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, facility_id: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select facility" />
                </SelectTrigger>
                <SelectContent>
                  {facilities.map((facility) => (
                    <SelectItem key={facility.id} value={facility.id}>
                      {facility.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Match/Fixture specific fields */}
          {(formData.event_type === 'fixture' || formData.event_type === 'friendly' || formData.event_type === 'tournament') && (
            <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
              <h3 className="font-medium flex items-center gap-2">
                <Trophy className="h-4 w-4" />
                Match Details
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="game_format">Game Format</Label>
                  <Select 
                    value={formData.game_format} 
                    onValueChange={(value) => setFormData(prev => ({ ...prev, game_format: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {gameFormats.map((format) => (
                        <SelectItem key={format.value} value={format.value}>
                          {format.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="game_duration">Game Duration (minutes)</Label>
                  <Input
                    id="game_duration"
                    type="number"
                    value={formData.game_duration}
                    onChange={(e) => setFormData(prev => ({ ...prev, game_duration: parseInt(e.target.value) || 50 }))}
                    placeholder="50"
                  />
                  <p className="text-sm text-muted-foreground mt-1">
                    Team default: {selectedTeam?.gameDuration || 50} minutes
                  </p>
                </div>
              </div>

              <div>
                <Label htmlFor="opponent">Opponent *</Label>
                <Input
                  id="opponent"
                  value={formData.opponent}
                  onChange={(e) => setFormData(prev => ({ ...prev, opponent: e.target.value }))}
                  placeholder="Fairmuir"
                />
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="is_away"
                  checked={!formData.is_home}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_home: !checked }))}
                />
                <Label htmlFor="is_away">Away Game</Label>
              </div>

              {/* Team Count Selection */}
              <div>
                <Label htmlFor="num_teams">Number of Teams</Label>
                <Select 
                  value={formData.num_teams.toString()} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, num_teams: parseInt(value) }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 Team</SelectItem>
                    <SelectItem value="2">2 Teams</SelectItem>
                    <SelectItem value="3">3 Teams</SelectItem>
                    <SelectItem value="4">4 Teams</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground mt-1">
                  This will create {formData.num_teams} team{formData.num_teams > 1 ? 's' : ''} in the team selection interface
                </p>
              </div>
            </div>
          )}

          {/* Time Settings - Now available for all event types */}
          <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
            <h3 className="font-medium flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Time Settings
            </h3>
            
            {/* Start Time Settings */}
            {formData.num_teams > 1 ? (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="start_time">Default Start Time</Label>
                    <Input
                      id="start_time"
                      type="time"
                      value={formData.start_time}
                      onChange={(e) => setFormData(prev => ({ ...prev, start_time: e.target.value }))}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Used as default for all teams
                    </p>
                  </div>
                  <div>
                    <Label htmlFor="end_time">End Time</Label>
                    <Input
                      id="end_time"
                      type="time"
                      value={formData.end_time}
                      onChange={(e) => setFormData(prev => ({ ...prev, end_time: e.target.value }))}
                    />
                  </div>
                </div>
                
                {/* Team-specific times */}
                <div className="space-y-3 p-4 border rounded-lg bg-muted/50">
                  <h3 className="font-medium flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Team-Specific Times
                  </h3>
                  
                  {Array.from({ length: formData.num_teams }, (_, i) => i + 1).map(teamNumber => {
                    const currentStartTime = teamTimes[teamNumber]?.start_time || formData.start_time;
                    const currentMeetingTime = teamTimes[teamNumber]?.meeting_time;
                    const calculatedMeetingTime = currentStartTime ? calculateMeetingTime(currentStartTime) : '';
                    
                    return (
                      <div key={teamNumber} className="grid grid-cols-1 md:grid-cols-3 gap-3 items-center">
                        <Label className="text-sm font-medium">Team {teamNumber}</Label>
                        <div>
                          <Label htmlFor={`team_${teamNumber}_start_time`} className="text-xs">KO</Label>
                          <Input
                            id={`team_${teamNumber}_start_time`}
                            type="time"
                            value={currentStartTime}
                            onChange={(e) => {
                              const newStartTime = e.target.value;
                              setTeamTimes(prev => ({
                                ...prev,
                                [teamNumber]: {
                                  start_time: newStartTime,
                                  meeting_time: calculateMeetingTime(newStartTime)
                                }
                              }));
                            }}
                            className="text-sm"
                          />
                        </div>
                        <div>
                          <Label htmlFor={`team_${teamNumber}_meeting_time`} className="text-xs">Meeting Time</Label>
                          <Input
                            id={`team_${teamNumber}_meeting_time`}
                            type="time"
                            value={currentMeetingTime || calculatedMeetingTime}
                            onChange={(e) => {
                              setTeamTimes(prev => ({
                                ...prev,
                                [teamNumber]: {
                                  ...prev[teamNumber],
                                  start_time: prev[teamNumber]?.start_time || formData.start_time,
                                  meeting_time: e.target.value
                                }
                              }));
                            }}
                            placeholder="Auto-calculated"
                            className="text-sm"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="start_time">Start Time</Label>
                  <Input
                    id="start_time"
                    type="time"
                    value={formData.start_time}
                    onChange={(e) => {
                      const newStartTime = e.target.value;
                      setFormData(prev => ({ 
                        ...prev, 
                        start_time: newStartTime,
                        meeting_time: formData.event_type !== 'training' && !prev.meeting_time ? calculateMeetingTime(newStartTime) : prev.meeting_time
                      }));
                    }}
                  />
                </div>
                {formData.event_type !== 'training' && (
                  <div>
                    <Label htmlFor="meeting_time">Meeting Time</Label>
                    <Input
                      id="meeting_time"
                      type="time"
                      value={formData.meeting_time}
                      onChange={(e) => setFormData(prev => ({ ...prev, meeting_time: e.target.value }))}
                      placeholder="30 mins before start"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Defaults to 30 mins before start time
                    </p>
                  </div>
                )}
                <div>
                  <Label htmlFor="end_time">End Time</Label>
                  <Input
                    id="end_time"
                    type="time"
                    value={formData.end_time}
                    onChange={(e) => setFormData(prev => ({ ...prev, end_time: e.target.value }))}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Who's Invited Section - Only show for non-editing mode */}
          {!actualIsEditing && !showSquadPicker && (
            <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
              <h3 className="font-medium flex items-center gap-2">
                <UserCheck className="h-4 w-4" />
                Who's Invited
              </h3>
              
              <RadioGroup value={invitationType} onValueChange={(value: 'everyone' | 'pick_squad') => setInvitationType(value)}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="everyone" id="everyone" />
                  <Label htmlFor="everyone" className="cursor-pointer">Everyone</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="pick_squad" id="pick_squad" />
                  <Label htmlFor="pick_squad" className="cursor-pointer">Pick Squad</Label>
                </div>
              </RadioGroup>
            </div>
          )}

          {/* Squad Picker View */}
          {showSquadPicker && formData.team_id && (
            <div className="space-y-4">
              <EventSquadPicker
                teamId={formData.team_id}
                selectedPlayerIds={selectedPlayerIds}
                selectedStaffIds={selectedStaffIds}
                onPlayerToggle={handlePlayerToggle}
                onStaffToggle={handleStaffToggle}
                onSelectAll={handleSelectAll}
                onDeselectAll={handleDeselectAll}
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowSquadPicker(false)}
                className="w-full"
              >
                Back to Event Details
              </Button>
            </div>
          )}

          {!showSquadPicker && (
            <>
              <div>
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Add general notes about this event..."
                  rows={3}
                />
              </div>

              {/* Submit Button */}
              <div className="flex gap-2">
            {onCancel && (
              <Button 
                type="button" 
                variant="outline" 
                onClick={handleCancel}
                disabled={loading}
                className="flex-1"
              >
                Cancel
              </Button>
            )}
            <Button 
              type="submit" 
              className="flex-1" 
              disabled={loading}
            >
              {loading ? 'Saving...' : (
                showSquadPicker ? 'Create Event' : 
                invitationType === 'pick_squad' ? 'Pick Squad' : 
                actualIsEditing ? 'Update Event' : 'Create Event'
              )}
            </Button>
              </div>
            </>
          )}
        </form>
      </CardContent>
    </Card>
  );
};
