import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, MapPin, Clock, Users, Trophy, FileText } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { eventsService } from '@/services/eventsService';

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
    game_format: '11v11',
    is_home: true,
    kit_selection: 'home',
    num_teams: 1,
  });
  const [loading, setLoading] = useState(false);
  const [performanceCategories, setPerformanceCategories] = useState<any[]>([]);

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
        game_format: eventData.gameFormat || eventData.game_format || '11v11',
        is_home: eventData.isHome !== undefined ? eventData.isHome : eventData.is_home !== undefined ? eventData.is_home : true,
        kit_selection: eventData.kitSelection || eventData.kit_selection || 'home',
        num_teams: eventData.num_teams || 1,
      });
    }
  }, [eventData, teamId]);

  useEffect(() => {
    if (formData.team_id) {
      loadPerformanceCategories();
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.team_id || !formData.title || !formData.date) {
      toast.error('Please fill in all required fields');
      return;
    }

    setLoading(true);

    try {
      const eventDataToSubmit = {
        ...formData,
        created_by: user?.id,
      };

      // If onSubmit prop is provided, use it (for new EventForm interface)
      if (onSubmit) {
        await onSubmit(eventDataToSubmit);
        return;
      }

      // Otherwise use the original logic
      if (isEditing && eventData?.id) {
        // Update existing event
        const { error } = await supabase
          .from('events')
          .update(eventDataToSubmit)
          .eq('id', eventData.id);

        if (error) throw error;

        toast.success('Event updated successfully');
        if (onEventCreated) onEventCreated(eventData.id);
      } else {
        // Create new event using the service
        const newEvent = await eventsService.createEvent({
          ...eventDataToSubmit,
          teamId: eventDataToSubmit.team_id,
          type: eventDataToSubmit.event_type as 'training' | 'match' | 'fixture' | 'tournament' | 'festival' | 'social' | 'friendly',
          startTime: eventDataToSubmit.start_time,
          endTime: eventDataToSubmit.end_time,
          isHome: eventDataToSubmit.is_home,
          gameFormat: eventDataToSubmit.game_format as any,
          kitSelection: eventDataToSubmit.kit_selection as 'home' | 'away' | 'training',
        });
        
        toast.success('Event created successfully');
        if (onEventCreated) onEventCreated(newEvent.id);
      }

      // Create event teams if num_teams > 1
      if (formData.num_teams > 1) {
        const eventId = eventData?.id || newEvent?.id;
        if (eventId) {
          for (let i = 1; i <= formData.num_teams; i++) {
            await supabase
              .from('event_teams')
              .insert({
                event_id: eventId,
                team_id: formData.team_id,
                team_number: i
              });
          }
        }
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

  const eventTypes = [
    { value: 'training', label: 'Training', icon: Users },
    { value: 'match', label: 'Match', icon: Trophy },
    { value: 'fixture', label: 'Fixture', icon: Trophy },
    { value: 'meeting', label: 'Meeting', icon: FileText },
    { value: 'other', label: 'Other', icon: Calendar },
  ];

  const gameFormats = ['11v11', '9v9', '7v7', '5v5', '3v3'];

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          {isEditing ? 'Edit Event' : 'Create New Event'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Info */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="title">Event Title *</Label>
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
          </div>

          {/* Date & Time */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
            <div>
              <Label htmlFor="start_time">Start Time</Label>
              <Input
                id="start_time"
                type="time"
                value={formData.start_time}
                onChange={(e) => setFormData(prev => ({ ...prev, start_time: e.target.value }))}
              />
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

          {/* Location */}
          <div>
            <Label htmlFor="location">Location</Label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="location"
                value={formData.location}
                onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                placeholder="Enter venue/location"
                className="pl-10"
              />
            </div>
          </div>

          {/* Match-specific fields */}
          {(formData.event_type === 'match' || formData.event_type === 'fixture') && (
            <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
              <h3 className="font-medium flex items-center gap-2">
                <Trophy className="h-4 w-4" />
                Match Details
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="opponent">Opponent</Label>
                  <Input
                    id="opponent"
                    value={formData.opponent}
                    onChange={(e) => setFormData(prev => ({ ...prev, opponent: e.target.value }))}
                    placeholder="Opposition team name"
                  />
                </div>
                
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
                        <SelectItem key={format} value={format}>
                          {format}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="is_home">Venue</Label>
                  <Select 
                    value={formData.is_home ? 'home' : 'away'} 
                    onValueChange={(value) => setFormData(prev => ({ ...prev, is_home: value === 'home' }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="home">Home</SelectItem>
                      <SelectItem value="away">Away</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="kit_selection">Kit Selection</Label>
                  <Select 
                    value={formData.kit_selection} 
                    onValueChange={(value) => setFormData(prev => ({ ...prev, kit_selection: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="home">Home Kit</SelectItem>
                      <SelectItem value="away">Away Kit</SelectItem>
                      <SelectItem value="third">Third Kit</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
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
              </div>
            </div>
          )}

          {/* Description & Notes */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Event description"
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Additional notes"
                rows={2}
              />
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex gap-2">
            <Button 
              type="submit" 
              className="flex-1" 
              disabled={loading}
            >
              {loading ? 'Saving...' : (isEditing ? 'Update Event' : 'Create Event')}
            </Button>
            {onCancel && (
              <Button 
                type="button" 
                variant="outline" 
                onClick={handleCancel}
                disabled={loading}
              >
                Cancel
              </Button>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
};
