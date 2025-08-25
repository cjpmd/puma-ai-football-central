import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { IndividualTrainingService } from '@/services/individualTrainingService';
import { PlanCreationData } from '@/types/individualTraining';
import { toast } from 'sonner';
import { 
  CalendarIcon, 
  Target, 
  MapPin, 
  Zap,
  Brain,
  User,
  Users,
  Eye,
  EyeOff
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface IndividualPlanCreatorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userPlayers?: Array<{ id: string; name: string; team_id: string }>;
  selectedPlayerId?: string;
}

const FOCUS_AREAS = [
  'Ball Control', 'Passing', 'Shooting', 'Dribbling', 'Defending',
  'Crossing', 'Heading', 'First Touch', 'Weak Foot', 'Speed',
  'Agility', 'Endurance', 'Strength', 'Balance', 'Coordination'
];

export function IndividualPlanCreator({ 
  open, 
  onOpenChange, 
  userPlayers = [],
  selectedPlayerId 
}: IndividualPlanCreatorProps) {
  const [formData, setFormData] = useState<PlanCreationData & { player_ids: string[] }>({
    player_ids: selectedPlayerId ? [selectedPlayerId] : [],
    title: '',
    objective_text: '',
    plan_type: 'self',
    start_date: format(new Date(), 'yyyy-MM-dd'),
    end_date: format(new Date(Date.now() + 28 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'), // 4 weeks from now
    weekly_sessions: 3,
    focus_areas: [],
    visibility: 'private',
    location_preference: 'home',
    intensity_preference: 3
  });

  const [startDate, setStartDate] = useState<Date>(new Date());
  const [endDate, setEndDate] = useState<Date>(new Date(Date.now() + 28 * 24 * 60 * 60 * 1000));

  const queryClient = useQueryClient();

  const createPlanMutation = useMutation({
    mutationFn: async (data: PlanCreationData & { player_ids: string[] }) => {
      return IndividualTrainingService.createPlan(data);
    },
    onSuccess: () => {
      toast.success('Training plan created successfully!');
      queryClient.invalidateQueries({ queryKey: ['individual-training-plans'] });
      onOpenChange(false);
      resetForm();
    },
    onError: (error) => {
      toast.error('Failed to create training plan');
      console.error('Error creating plan:', error);
    },
  });

  const resetForm = () => {
    setFormData({
      player_ids: selectedPlayerId ? [selectedPlayerId] : [],
      title: '',
      objective_text: '',
      plan_type: 'self',
      start_date: format(new Date(), 'yyyy-MM-dd'),
      end_date: format(new Date(Date.now() + 28 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'),
      weekly_sessions: 3,
      focus_areas: [],
      visibility: 'private',
      location_preference: 'home',
      intensity_preference: 3
    });
    setStartDate(new Date());
    setEndDate(new Date(Date.now() + 28 * 24 * 60 * 60 * 1000));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.player_ids || formData.player_ids.length === 0) {
      toast.error('Please select at least one player');
      return;
    }
    
    if (!formData.title.trim()) {
      toast.error('Please enter a plan title');
      return;
    }

    createPlanMutation.mutate({
      ...formData,
      start_date: format(startDate, 'yyyy-MM-dd'),
      end_date: format(endDate, 'yyyy-MM-dd')
    });
  };

  const handleFocusAreaToggle = (area: string) => {
    setFormData(prev => ({
      ...prev,
      focus_areas: prev.focus_areas.includes(area)
        ? prev.focus_areas.filter(a => a !== area)
        : [...prev.focus_areas, area]
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Target className="w-5 h-5" />
            Create Individual Training Plan
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Player Selection */}
          {userPlayers.length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="players">Players *</Label>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {userPlayers.map((player) => (
                  <div key={player.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={player.id}
                      checked={formData.player_ids.includes(player.id)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setFormData(prev => ({
                            ...prev,
                            player_ids: [...prev.player_ids, player.id]
                          }));
                        } else {
                          setFormData(prev => ({
                            ...prev,
                            player_ids: prev.player_ids.filter(id => id !== player.id)
                          }));
                        }
                      }}
                    />
                    <Label htmlFor={player.id} className="text-sm font-normal cursor-pointer">
                      {player.name}
                    </Label>
                  </div>
                ))}
              </div>
              {formData.player_ids.length > 0 && (
                <div className="text-sm text-muted-foreground">
                  {formData.player_ids.length} player{formData.player_ids.length > 1 ? 's' : ''} selected
                  {formData.player_ids.length > 1 && (
                    <Badge variant="secondary" className="ml-2">Group Plan</Badge>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Basic Info */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="title">Plan Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="e.g., 4-Week Shooting Improvement"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="plan_type">Plan Type</Label>
              <Select 
                value={formData.plan_type} 
                onValueChange={(value: 'self' | 'coach' | 'ai') => 
                  setFormData(prev => ({ ...prev, plan_type: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="self">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4" />
                      Self-Created
                    </div>
                  </SelectItem>
                  <SelectItem value="ai">
                    <div className="flex items-center gap-2">
                      <Brain className="w-4 h-4" />
                      AI-Generated
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="objective">Training Objective</Label>
            <Textarea
              id="objective"
              value={formData.objective_text}
              onChange={(e) => setFormData(prev => ({ ...prev, objective_text: e.target.value }))}
              placeholder="Describe what you want to achieve with this training plan..."
              rows={3}
            />
          </div>

          {/* Date Range */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Start Date *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !startDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {startDate ? format(startDate, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={(date) => date && setStartDate(date)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>End Date *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !endDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {endDate ? format(endDate, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={endDate}
                    onSelect={(date) => date && setEndDate(date)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Training Preferences */}
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="weekly_sessions">Sessions per Week</Label>
              <Select 
                value={formData.weekly_sessions.toString()} 
                onValueChange={(value) => 
                  setFormData(prev => ({ ...prev, weekly_sessions: parseInt(value) }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 5, 6, 7].map((num) => (
                    <SelectItem key={num} value={num.toString()}>
                      {num} session{num > 1 ? 's' : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="location">Preferred Location</Label>
              <Select 
                value={formData.location_preference} 
                onValueChange={(value: 'home' | 'pitch' | 'gym') => 
                  setFormData(prev => ({ ...prev, location_preference: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="home">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4" />
                      Home/Garden
                    </div>
                  </SelectItem>
                  <SelectItem value="pitch">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4" />
                      Football Pitch
                    </div>
                  </SelectItem>
                  <SelectItem value="gym">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4" />
                      Gym/Indoor
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="intensity">Intensity Level</Label>
              <Select 
                value={formData.intensity_preference.toString()} 
                onValueChange={(value) => 
                  setFormData(prev => ({ ...prev, intensity_preference: parseInt(value) }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">
                    <div className="flex items-center gap-2">
                      <Zap className="w-4 h-4" />
                      Light (1/5)
                    </div>
                  </SelectItem>
                  <SelectItem value="2">
                    <div className="flex items-center gap-2">
                      <Zap className="w-4 h-4" />
                      Easy (2/5)
                    </div>
                  </SelectItem>
                  <SelectItem value="3">
                    <div className="flex items-center gap-2">
                      <Zap className="w-4 h-4" />
                      Moderate (3/5)
                    </div>
                  </SelectItem>
                  <SelectItem value="4">
                    <div className="flex items-center gap-2">
                      <Zap className="w-4 h-4" />
                      Hard (4/5)
                    </div>
                  </SelectItem>
                  <SelectItem value="5">
                    <div className="flex items-center gap-2">
                      <Zap className="w-4 h-4" />
                      Intense (5/5)
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Focus Areas */}
          <div className="space-y-3">
            <Label>Focus Areas</Label>
            <div className="grid gap-2 md:grid-cols-3">
              {FOCUS_AREAS.map((area) => (
                <div key={area} className="flex items-center space-x-2">
                  <Checkbox
                    id={area}
                    checked={formData.focus_areas.includes(area)}
                    onCheckedChange={() => handleFocusAreaToggle(area)}
                  />
                  <Label htmlFor={area} className="text-sm font-normal cursor-pointer">
                    {area}
                  </Label>
                </div>
              ))}
            </div>
            {formData.focus_areas.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {formData.focus_areas.map((area) => (
                  <Badge key={area} variant="secondary" className="text-xs">
                    {area}
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Privacy */}
          <div className="space-y-2">
            <Label htmlFor="visibility">Plan Visibility</Label>
            <Select 
              value={formData.visibility} 
              onValueChange={(value: 'private' | 'coach' | 'teamStaff') => 
                setFormData(prev => ({ ...prev, visibility: value }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="private">
                  <div className="flex items-center gap-2">
                    <EyeOff className="w-4 h-4" />
                    Private (Only You)
                  </div>
                </SelectItem>
                <SelectItem value="coach">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4" />
                    Visible to Coaches
                  </div>
                </SelectItem>
                <SelectItem value="teamStaff">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    Visible to Team Staff
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end gap-3 pt-4">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={createPlanMutation.isPending}
            >
              {createPlanMutation.isPending ? 'Creating...' : 'Create Plan'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}