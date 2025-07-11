
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
import { createEvent } from '@/services/eventsService';

interface EventFormProps {
  onEventCreated: (eventId: string) => void;
  initialData?: any;
  isEditing?: boolean;
}

export const EventForm: React.FC<EventFormProps> = ({ 
  onEventCreated, 
  initialData, 
  isEditing = false 
}) => {
  const { teams, user } = useAuth();
  const [formData, setFormData] = useState({
    title: '',
    date: '',
    start_time: '',
    end_time: '',
    location: '',
    event_type: 'training',
    team_id: '',
    opponent: '',
    description: '',
    notes: '',
    game_format: '11v11',
    is_home: true,
    kit_selection: 'home',
    num_teams: 1, // New field for team count
  });
  const [loading, setLoading] = useState(false);
  const [performanceCategories, setPerformanceCategories] = useState<any[]>([]);

  useEffect(() => {
    if (initialData) {
      setFormData({
        ...initialData,
        date: initialData.date || '',
        start_time: initialData.start_time || '',
        end_time: initialData.end_time || '',
        num_teams: initialData.num_teams || 1,
      });
    }
  }, [initialData]);

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
      const eventData = {
        ...formData,
        created_by: user?.id,
      };

      if (isEditing && initialData?.id) {
        // Update existing event
        const { error } = await supabase
          .from('events')
          .update(eventData)
          .eq('id', initialData.id);

        if (error) throw error;

        toast.success('Event updated successfully');
        onEventCreated(initialData.id);
      } else {
        // Create new event with team creation
        const eventId = await createEvent(eventData, formData.num_teams);
        
        toast.success('Event created successfully');
        onEventCreated(eventId);
      }
    } catch (error: any) {
      console.error('Error saving event:', error);
      toast.error(error.message || 'Failed to save event');
    } finally {
      setLoading(false);
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
          <Button 
            type="submit" 
            className="w-full" 
            disabled={loading}
          >
            {loading ? 'Saving...' : (isEditing ? 'Update Event' : 'Create Event')}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};
