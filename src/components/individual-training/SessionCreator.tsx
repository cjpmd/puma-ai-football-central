import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { IndividualTrainingService } from '@/services/individualTrainingService';
import { toast } from 'sonner';
import { Clock, MapPin, Zap, Target } from 'lucide-react';

interface SessionCreatorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  planId: string;
  dayOfWeek: number;
  onSessionCreated?: () => void;
}

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export function SessionCreator({ 
  open, 
  onOpenChange, 
  planId, 
  dayOfWeek,
  onSessionCreated 
}: SessionCreatorProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    target_duration_minutes: 30,
    intensity: 3,
    location: 'home' as 'home' | 'pitch' | 'gym'
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title.trim()) {
      toast.error('Please enter a session title');
      return;
    }

    setLoading(true);
    try {
      await IndividualTrainingService.createSession({
        plan_id: planId,
        day_of_week: dayOfWeek,
        warmup_drill_ids: [],
        cooldown_drill_ids: [],
        session_order: 1,
        ...formData
      });

      toast.success('Training session created successfully');
      onSessionCreated?.();
      onOpenChange(false);
      
      // Reset form
      setFormData({
        title: '',
        description: '',
        target_duration_minutes: 30,
        intensity: 3,
        location: 'home' as 'home' | 'pitch' | 'gym'
      });
    } catch (error) {
      console.error('Error creating session:', error);
      toast.error('Failed to create training session');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Target className="w-5 h-5" />
            Add Session - {DAY_NAMES[dayOfWeek]}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Session Title</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              placeholder="e.g., Ball Control Training"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Brief description of the session goals..."
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="duration" className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                Duration (minutes)
              </Label>
              <Input
                id="duration"
                type="number"
                min="10"
                max="180"
                value={formData.target_duration_minutes}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  target_duration_minutes: parseInt(e.target.value) || 30 
                }))}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="intensity" className="flex items-center gap-1">
                <Zap className="w-4 h-4" />
                Intensity (1-5)
              </Label>
              <Select
                value={formData.intensity.toString()}
                onValueChange={(value) => setFormData(prev => ({ 
                  ...prev, 
                  intensity: parseInt(value) 
                }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 - Very Light</SelectItem>
                  <SelectItem value="2">2 - Light</SelectItem>
                  <SelectItem value="3">3 - Moderate</SelectItem>
                  <SelectItem value="4">4 - Hard</SelectItem>
                  <SelectItem value="5">5 - Very Hard</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="location" className="flex items-center gap-1">
              <MapPin className="w-4 h-4" />
              Location
            </Label>
            <Select
              value={formData.location}
              onValueChange={(value: 'home' | 'pitch' | 'gym') => setFormData(prev => ({ ...prev, location: value }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="home">Home</SelectItem>
                <SelectItem value="pitch">Training Pitch</SelectItem>
                <SelectItem value="gym">Gym/Indoor</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={loading}
              className="flex-1"
            >
              {loading ? 'Creating...' : 'Create Session'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}