import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Calendar, Clock, MapPin, Users, Trophy, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { eventsService } from '@/services/eventsService';

const eventFormSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  date: z.string().min(1, 'Date is required'),
  start_time: z.string().min(1, 'Start time is required'),
  end_time: z.string().optional(),
  location: z.string().optional(),
  event_type: z.enum(['training', 'match', 'fixture', 'tournament', 'festival', 'social', 'friendly']),
  opponent: z.string().optional(),
  is_home: z.boolean().default(true),
  game_format: z.enum(['11v11', '9v9', '7v7', '5v5', '3v3']).optional(),
  game_duration: z.number().optional(),
  notes: z.string().optional(),
  meeting_time: z.string().optional(),
  kit_selection: z.enum(['home', 'away', 'training']).default('home'),
  num_teams: z.number().min(1).max(10).default(1),
});

type EventFormData = z.infer<typeof eventFormSchema>;

interface EventFormProps {
  event?: any;
  teamId: string;
  onSubmit: (data: any) => void;
  onCancel: () => void;
  onEventCreated: (eventId: string) => void;
}

export const EventForm: React.FC<EventFormProps> = ({
  event,
  teamId,
  onSubmit,
  onCancel,
  onEventCreated,
}) => {
  const { toast } = useToast();
  const { teams } = useAuth();
  const [loading, setLoading] = useState(false);
  const isEditing = !!event?.id;

  const form = useForm<EventFormData>({
    resolver: zodResolver(eventFormSchema),
    defaultValues: {
      title: event?.title || '',
      description: event?.description || '',
      date: event?.date || '',
      start_time: event?.startTime || event?.start_time || '',
      end_time: event?.endTime || event?.end_time || '',
      location: event?.location || '',
      event_type: (event?.type || event?.event_type || 'training') as any,
      opponent: event?.opponent || '',
      is_home: event?.isHome ?? event?.is_home ?? true,
      game_format: (event?.gameFormat || event?.game_format || '11v11') as any,
      game_duration: event?.gameDuration || event?.game_duration || 90,
      notes: event?.notes || '',
      meeting_time: event?.meetingTime || event?.meeting_time || '',
      kit_selection: (event?.kitSelection || event?.kit_selection || 'home') as any,
      num_teams: event?.teams || 1,
    },
  });

  const handleSubmit = async (formData: EventFormData) => {
    try {
      setLoading(true);
      
      const eventData = {
        title: formData.title,
        description: formData.description,
        date: formData.date,
        start_time: formData.start_time,
        end_time: formData.end_time,
        location: formData.location,
        event_type: formData.event_type,
        opponent: formData.opponent,
        is_home: formData.is_home,
        game_format: formData.game_format,
        game_duration: formData.game_duration,
        notes: formData.notes,
        meeting_time: formData.meeting_time,
        kit_selection: formData.kit_selection,
        teams: formData.num_teams,
        team_id: teamId,
      };

      // Call the parent's onSubmit to handle the event creation/update
      if (onSubmit) {
        await onSubmit(eventData);
        return;
      }

      let eventId: string;

      // Otherwise use the original logic
      if (isEditing && event?.id) {
        // Update existing event
        const { error } = await supabase
          .from('events')
          .update(eventData)
          .eq('id', event.id);

        if (error) throw error;

        toast({
          title: 'Success',
          description: 'Event updated successfully',
        });
        if (onEventCreated) onEventCreated(event.id);
        eventId = event.id;
      } else {
        // Create new event using the service
        const newEvent = await eventsService.createEvent({
          ...eventData,
          teamId: teamId,
          type: eventData.event_type,
        });
        
        if (!newEvent) {
          throw new Error('Failed to create event');
        }
        
        toast({
          title: 'Success',
          description: 'Event created successfully',
        });
        if (onEventCreated) onEventCreated(newEvent.id);
        eventId = newEvent.id;
      }

      // Create event teams if num_teams > 1
      if (formData.num_teams > 1) {
        if (eventId) {
          for (let i = 1; i <= formData.num_teams; i++) {
            await supabase
              .from('event_teams')
              .insert({
                event_id: eventId,
                team_id: teamId,
                team_number: i,
              });
          }
        }
      }

      // Reset form
      form.reset();
      
    } catch (error: any) {
      console.error('Error saving event:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to save event',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const eventType = form.watch('event_type');
  const isMatchType = ['match', 'fixture', 'tournament', 'friendly'].includes(eventType);

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              {isEditing ? 'Edit Event' : 'Create New Event'}
            </CardTitle>
            <CardDescription>
              {isEditing ? 'Update event details' : 'Set up a new event for your team'}
            </CardDescription>
          </div>
          <Button variant="ghost" size="icon" onClick={onCancel}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
          {/* Basic Information */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="title">Event Title *</Label>
              <Input
                id="title"
                {...form.register('title')}
                placeholder="Enter event title"
              />
              {form.formState.errors.title && (
                <p className="text-sm text-red-600 mt-1">
                  {form.formState.errors.title.message}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                {...form.register('description')}
                placeholder="Event description (optional)"
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor="event_type">Event Type *</Label>
              <Select 
                value={form.watch('event_type')} 
                onValueChange={(value) => form.setValue('event_type', value as any)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select event type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="training">Training</SelectItem>
                  <SelectItem value="match">Match</SelectItem>
                  <SelectItem value="fixture">Fixture</SelectItem>
                  <SelectItem value="tournament">Tournament</SelectItem>
                  <SelectItem value="festival">Festival</SelectItem>
                  <SelectItem value="social">Social</SelectItem>
                  <SelectItem value="friendly">Friendly</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Date and Time */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="date">Date *</Label>
              <Input
                id="date"
                type="date"
                {...form.register('date')}
              />
              {form.formState.errors.date && (
                <p className="text-sm text-red-600 mt-1">
                  {form.formState.errors.date.message}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="start_time">Start Time *</Label>
              <Input
                id="start_time"
                type="time"
                {...form.register('start_time')}
              />
              {form.formState.errors.start_time && (
                <p className="text-sm text-red-600 mt-1">
                  {form.formState.errors.start_time.message}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="end_time">End Time</Label>
              <Input
                id="end_time"
                type="time"
                {...form.register('end_time')}
              />
            </div>

            <div>
              <Label htmlFor="meeting_time">Meeting Time</Label>
              <Input
                id="meeting_time"
                type="time"
                {...form.register('meeting_time')}
              />
            </div>
          </div>

          {/* Location */}
          <div>
            <Label htmlFor="location">Location</Label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                id="location"
                {...form.register('location')}
                placeholder="Enter location or venue"
                className="pl-10"
              />
            </div>
          </div>

          {/* Match-specific fields */}
          {isMatchType && (
            <div className="space-y-4 border-t pt-4">
              <h3 className="font-medium text-lg flex items-center gap-2">
                <Trophy className="h-5 w-5" />
                Match Details
              </h3>
              
              <div>
                <Label htmlFor="opponent">Opponent</Label>
                <Input
                  id="opponent"
                  {...form.register('opponent')}
                  placeholder="Enter opponent team name"
                />
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="is_home"
                  checked={form.watch('is_home')}
                  onCheckedChange={(checked) => form.setValue('is_home', checked)}
                />
                <Label htmlFor="is_home">Home Game</Label>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="game_format">Game Format</Label>
                  <Select 
                    value={form.watch('game_format')} 
                    onValueChange={(value) => form.setValue('game_format', value as any)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select format" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="11v11">11v11</SelectItem>
                      <SelectItem value="9v9">9v9</SelectItem>
                      <SelectItem value="7v7">7v7</SelectItem>
                      <SelectItem value="5v5">5v5</SelectItem>
                      <SelectItem value="3v3">3v3</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="game_duration">Duration (minutes)</Label>
                  <Input
                    id="game_duration"
                    type="number"
                    {...form.register('game_duration', { valueAsNumber: true })}
                    placeholder="90"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="kit_selection">Kit Selection</Label>
                <Select 
                  value={form.watch('kit_selection')} 
                  onValueChange={(value) => form.setValue('kit_selection', value as any)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select kit" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="home">Home Kit</SelectItem>
                    <SelectItem value="away">Away Kit</SelectItem>
                    <SelectItem value="training">Training Kit</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {/* Multiple Teams */}
          <div className="space-y-4 border-t pt-4">
            <h3 className="font-medium text-lg flex items-center gap-2">
              <Users className="h-5 w-5" />
              Team Configuration
            </h3>
            
            <div>
              <Label htmlFor="num_teams">Number of Teams</Label>
              <Select 
                value={form.watch('num_teams')?.toString()} 
                onValueChange={(value) => form.setValue('num_teams', parseInt(value))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Number of teams" />
                </SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                    <SelectItem key={num} value={num.toString()}>
                      {num} Team{num > 1 ? 's' : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground mt-1">
                Create multiple teams for this event (e.g., Team A, Team B)
              </p>
            </div>
          </div>

          {/* Notes */}
          <div>
            <Label htmlFor="notes">Additional Notes</Label>
            <Textarea
              id="notes"
              {...form.register('notes')}
              placeholder="Any additional information or instructions"
              rows={3}
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : isEditing ? 'Update Event' : 'Create Event'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};
