
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { eventsService } from '@/services/eventsService';
import { format } from 'date-fns';
import { Calendar, Clock, MapPin, Users, X } from 'lucide-react';
import { GameFormat } from '@/types';

interface MobileEventFormProps {
  onClose: () => void;
  onEventCreated: () => void;
}

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
    notes: ''
  });

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
      await eventsService.createEvent({
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
      });

      toast({
        title: 'Success',
        description: 'Event created successfully',
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
                onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                required
              />
            </div>

            {/* Times */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="startTime" className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Start Time
                </Label>
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
                {loading ? 'Creating...' : 'Create Event'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};
