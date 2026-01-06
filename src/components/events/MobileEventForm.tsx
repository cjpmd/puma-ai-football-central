
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { eventsService } from '@/services/eventsService';
import { format, getDay } from 'date-fns';
import { Calendar, Clock, MapPin, Users, X, Repeat } from 'lucide-react';
import { GameFormat } from '@/types';

interface MobileEventFormProps {
  onClose: () => void;
  onEventCreated: () => void;
}

const DAYS_OF_WEEK = [
  { value: 0, label: 'Sunday' },
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
];

export const MobileEventForm: React.FC<MobileEventFormProps> = ({
  onClose,
  onEventCreated
}) => {
  const { teams } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    startTime: '',
    endTime: '',
    location: '',
    type: 'training' as 'training' | 'match' | 'fixture' | 'friendly',
    opponent: '',
    isHome: true,
    gameFormat: '11-a-side' as GameFormat,
    gameDuration: 90,
    notes: '',
    // Recurring fields
    isRecurring: false,
    recurrencePattern: 'weekly' as 'weekly' | 'biweekly' | 'monthly',
    recurrenceDayOfWeek: getDay(new Date()),
    recurrenceEndType: 'occurrences' as 'occurrences' | 'date',
    recurrenceOccurrences: 10,
    recurrenceEndDate: '',
  });

  // Update day of week when date changes
  const handleDateChange = (newDate: string) => {
    const dayOfWeek = getDay(new Date(newDate));
    setFormData(prev => ({
      ...prev,
      date: newDate,
      recurrenceDayOfWeek: dayOfWeek
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teams?.[0]?.id) {
      toast({
        title: 'Error',
        description: 'No team found',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const eventData: any = {
        title: formData.title,
        description: formData.description,
        date: formData.date,
        startTime: formData.startTime || undefined,
        endTime: formData.endTime || undefined,
        location: formData.location || undefined,
        type: formData.type,
        opponent: formData.opponent || undefined,
        isHome: formData.isHome,
        gameFormat: formData.gameFormat,
        gameDuration: formData.gameDuration,
        notes: formData.notes || undefined,
        teamId: teams[0].id,
      };

      // Add recurring fields if enabled
      if (formData.isRecurring) {
        eventData.isRecurring = true;
        eventData.recurrencePattern = formData.recurrencePattern;
        eventData.recurrenceDayOfWeek = formData.recurrenceDayOfWeek;
        if (formData.recurrenceEndType === 'occurrences') {
          eventData.recurrenceOccurrences = formData.recurrenceOccurrences;
        } else {
          eventData.recurrenceEndDate = formData.recurrenceEndDate;
        }
      }

      const result = await eventsService.createEvent(eventData);

      const eventCount = formData.isRecurring ? (result as any).createdCount || 1 : 1;
      toast({
        title: 'Success',
        description: formData.isRecurring 
          ? `Created ${eventCount} recurring events`
          : 'Event created successfully',
      });

      onEventCreated();
      onClose();
    } catch (error: any) {
      console.error('Error creating event:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to create event',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const isMatchType = ['match', 'fixture', 'friendly'].includes(formData.type);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-start justify-center p-4 overflow-y-auto">
      <Card className="w-full max-w-md mx-auto my-8">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="text-lg">Create Event</CardTitle>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Event Type */}
            <div className="space-y-2">
              <Label htmlFor="type">Event Type</Label>
              <Select value={formData.type} onValueChange={(value: any) => setFormData(prev => ({ ...prev, type: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="training">Training</SelectItem>
                  <SelectItem value="match">Match</SelectItem>
                  <SelectItem value="fixture">Fixture</SelectItem>
                  <SelectItem value="friendly">Friendly</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Enter event title"
                required
              />
            </div>

            {/* Opponent (for matches) */}
            {isMatchType && (
              <div className="space-y-2">
                <Label htmlFor="opponent">Opponent</Label>
                <Input
                  id="opponent"
                  value={formData.opponent}
                  onChange={(e) => setFormData(prev => ({ ...prev, opponent: e.target.value }))}
                  placeholder="Enter opponent name"
                />
              </div>
            )}

            {/* Date */}
            <div className="space-y-2">
              <Label htmlFor="date" className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Date *
              </Label>
              <Input
                id="date"
                type="date"
                value={formData.date}
                onChange={(e) => handleDateChange(e.target.value)}
                required
                className="min-w-0"
              />
            </div>

            {/* Times */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2 min-w-0">
                <Label htmlFor="startTime" className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Start Time
                </Label>
                <Input
                  id="startTime"
                  type="time"
                  value={formData.startTime}
                  onChange={(e) => setFormData(prev => ({ ...prev, startTime: e.target.value }))}
                  className="min-w-0"
                />
              </div>
              <div className="space-y-2 min-w-0">
                <Label htmlFor="endTime">End Time</Label>
                <Input
                  id="endTime"
                  type="time"
                  value={formData.endTime}
                  onChange={(e) => setFormData(prev => ({ ...prev, endTime: e.target.value }))}
                  className="min-w-0"
                />
              </div>
            </div>

            {/* Location */}
            <div className="space-y-2">
              <Label htmlFor="location" className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Location
              </Label>
              <Input
                id="location"
                value={formData.location}
                onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                placeholder="Enter location"
              />
            </div>

            {/* Match Settings */}
            {isMatchType && (
              <>
                <div className="flex items-center justify-between">
                  <Label htmlFor="isHome">Home Game</Label>
                  <Switch
                    id="isHome"
                    checked={formData.isHome}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isHome: checked }))}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="gameFormat" className="flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      Format
                    </Label>
                    <Select value={formData.gameFormat} onValueChange={(value: GameFormat) => setFormData(prev => ({ ...prev, gameFormat: value }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="11-a-side">11-a-side</SelectItem>
                        <SelectItem value="9-a-side">9-a-side</SelectItem>
                        <SelectItem value="7-a-side">7-a-side</SelectItem>
                        <SelectItem value="5-a-side">5-a-side</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="gameDuration">Duration</Label>
                    <Input
                      id="gameDuration"
                      type="number"
                      min="30"
                      max="120"
                      value={formData.gameDuration}
                      onChange={(e) => setFormData(prev => ({ ...prev, gameDuration: parseInt(e.target.value) || 90 }))}
                    />
                  </div>
                </div>
              </>
            )}

            {/* Recurring Event Toggle */}
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <Label htmlFor="isRecurring" className="flex items-center gap-2">
                <Repeat className="h-4 w-4" />
                Recurring Event
              </Label>
              <Switch
                id="isRecurring"
                checked={formData.isRecurring}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isRecurring: checked }))}
              />
            </div>

            {/* Recurring Options */}
            {formData.isRecurring && (
              <div className="space-y-4 p-3 border rounded-lg bg-muted/20">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="recurrencePattern">Repeat</Label>
                    <Select 
                      value={formData.recurrencePattern} 
                      onValueChange={(value: 'weekly' | 'biweekly' | 'monthly') => setFormData(prev => ({ ...prev, recurrencePattern: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="biweekly">Bi-weekly</SelectItem>
                        <SelectItem value="monthly">Monthly</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="recurrenceDayOfWeek">On</Label>
                    <Select 
                      value={formData.recurrenceDayOfWeek.toString()} 
                      onValueChange={(value) => setFormData(prev => ({ ...prev, recurrenceDayOfWeek: parseInt(value) }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {DAYS_OF_WEEK.map(day => (
                          <SelectItem key={day.value} value={day.value.toString()}>
                            {day.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-3">
                  <Label>End</Label>
                  <RadioGroup 
                    value={formData.recurrenceEndType} 
                    onValueChange={(value: 'occurrences' | 'date') => setFormData(prev => ({ ...prev, recurrenceEndType: value }))}
                    className="space-y-2"
                  >
                    <div className="flex items-center gap-3">
                      <RadioGroupItem value="occurrences" id="occurrences" />
                      <Label htmlFor="occurrences" className="flex items-center gap-2 flex-1">
                        After
                        <Input
                          type="number"
                          min="2"
                          max="52"
                          value={formData.recurrenceOccurrences}
                          onChange={(e) => setFormData(prev => ({ ...prev, recurrenceOccurrences: parseInt(e.target.value) || 10 }))}
                          className="w-16 h-8"
                          disabled={formData.recurrenceEndType !== 'occurrences'}
                        />
                        occurrences
                      </Label>
                    </div>
                    <div className="flex items-center gap-3">
                      <RadioGroupItem value="date" id="endDate" />
                      <Label htmlFor="endDate" className="flex items-center gap-2 flex-1">
                        Until
                        <Input
                          type="date"
                          value={formData.recurrenceEndDate}
                          onChange={(e) => setFormData(prev => ({ ...prev, recurrenceEndDate: e.target.value }))}
                          className="h-8"
                          disabled={formData.recurrenceEndType !== 'date'}
                        />
                      </Label>
                    </div>
                  </RadioGroup>
                </div>
              </div>
            )}

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Enter event description"
                rows={2}
              />
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Additional notes"
                rows={2}
              />
            </div>

            {/* Submit Buttons */}
            <div className="flex gap-3 pt-4">
              <Button type="button" variant="outline" onClick={onClose} className="flex-1">
                Cancel
              </Button>
              <Button type="submit" disabled={loading} className="flex-1">
                {loading ? 'Creating...' : formData.isRecurring ? 'Create Events' : 'Create Event'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};
