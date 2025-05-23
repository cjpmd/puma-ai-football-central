
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Event, EventType, GameFormat } from '@/types';

interface EventFormProps {
  event: Event | null;
  onSubmit: (data: Partial<Event>) => void;
  onCancel: () => void;
  teamId: string;
}

export const EventForm: React.FC<EventFormProps> = ({
  event,
  onSubmit,
  onCancel,
  teamId
}) => {
  const [formData, setFormData] = useState<Partial<Event>>({
    type: event?.type || 'training',
    teamId: teamId,
    title: event?.title || '',
    date: event?.date || new Date().toISOString().split('T')[0],
    meetingTime: event?.meetingTime || '09:00',
    startTime: event?.startTime || '10:00',
    endTime: event?.endTime || '11:30',
    location: event?.location || '',
    gameFormat: event?.gameFormat || '7-a-side',
    opponent: event?.opponent || '',
    isHome: event?.isHome || true,
    teams: event?.teams || [teamId]
  });

  const handleChange = (field: keyof Partial<Event>, value: any) => {
    setFormData({
      ...formData,
      [field]: value
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const isMatchType = formData.type === 'fixture' || formData.type === 'friendly' || formData.type === 'tournament';

  return (
    <form onSubmit={handleSubmit} className="space-y-4 py-4">
      <div className="grid grid-cols-1 gap-4">
        <div className="space-y-2">
          <Label htmlFor="type">Event Type</Label>
          <Select 
            value={formData.type}
            onValueChange={(value) => handleChange('type', value as EventType)}
            required
          >
            <SelectTrigger id="type">
              <SelectValue placeholder="Select event type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="fixture">Fixture</SelectItem>
              <SelectItem value="friendly">Friendly</SelectItem>
              <SelectItem value="tournament">Tournament</SelectItem>
              <SelectItem value="festival">Festival</SelectItem>
              <SelectItem value="training">Training</SelectItem>
              <SelectItem value="social">Social Event</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="title">Event Title</Label>
          <Input
            id="title"
            value={formData.title}
            onChange={(e) => handleChange('title', e.target.value)}
            placeholder="e.g. Training Session or vs Arsenal FC"
            required
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="date">Date</Label>
            <Input
              id="date"
              type="date"
              value={formData.date}
              onChange={(e) => handleChange('date', e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="meetingTime">Meeting Time</Label>
            <Input
              id="meetingTime"
              type="time"
              value={formData.meetingTime}
              onChange={(e) => handleChange('meetingTime', e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="startTime">Start Time</Label>
            <Input
              id="startTime"
              type="time"
              value={formData.startTime}
              onChange={(e) => handleChange('startTime', e.target.value)}
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="endTime">End Time</Label>
            <Input
              id="endTime"
              type="time"
              value={formData.endTime}
              onChange={(e) => handleChange('endTime', e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="location">Location</Label>
            <Input
              id="location"
              value={formData.location}
              onChange={(e) => handleChange('location', e.target.value)}
              placeholder="e.g. Training Ground or Stadium Name"
              required
            />
          </div>
        </div>

        {isMatchType && (
          <>
            <div className="space-y-2">
              <Label htmlFor="opponent">Opponent</Label>
              <Input
                id="opponent"
                value={formData.opponent}
                onChange={(e) => handleChange('opponent', e.target.value)}
                placeholder="e.g. Arsenal FC"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="gameFormat">Game Format</Label>
                <Select 
                  value={formData.gameFormat}
                  onValueChange={(value) => handleChange('gameFormat', value as GameFormat)}
                  required
                >
                  <SelectTrigger id="gameFormat">
                    <SelectValue placeholder="Select game format" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="3-a-side">3-a-side</SelectItem>
                    <SelectItem value="4-a-side">4-a-side</SelectItem>
                    <SelectItem value="5-a-side">5-a-side</SelectItem>
                    <SelectItem value="7-a-side">7-a-side</SelectItem>
                    <SelectItem value="9-a-side">9-a-side</SelectItem>
                    <SelectItem value="11-a-side">11-a-side</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="venue">Venue</Label>
                <Select 
                  value={formData.isHome ? 'home' : 'away'}
                  onValueChange={(value) => handleChange('isHome', value === 'home')}
                  required
                >
                  <SelectTrigger id="venue">
                    <SelectValue placeholder="Select venue" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="home">Home</SelectItem>
                    <SelectItem value="away">Away</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </>
        )}
      </div>

      <div className="flex justify-end space-x-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" className="bg-puma-blue-500 hover:bg-puma-blue-600">
          {event ? 'Update Event' : 'Create Event'}
        </Button>
      </div>
    </form>
  );
};
