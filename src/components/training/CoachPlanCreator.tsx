import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AIRecommendationPanel } from '@/components/individual-training/AIRecommendationPanel';
import { IndividualTrainingService } from '@/services/individualTrainingService';
import { PlanCreationData } from '@/types/individualTraining';
import { useAuth } from '@/contexts/AuthContext';
import { Users, Bot, User, Calendar, Target } from 'lucide-react';
import { toast } from 'sonner';

interface CoachPlanCreatorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  players: Array<{
    id: string;
    name: string;
    team_id: string;
  }>;
  onPlanCreated: () => void;
}

const FOCUS_AREAS = [
  'Ball Control',
  'Passing',
  'Shooting',
  'Dribbling',
  'Defending',
  'Fitness',
  'Crossing',
  'Heading',
  'Speed',
  'Agility'
];

export const CoachPlanCreator: React.FC<CoachPlanCreatorProps> = ({
  open,
  onOpenChange,
  players,
  onPlanCreated
}) => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('manual');
  const [selectedPlayers, setSelectedPlayers] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  
  const [planData, setPlanData] = useState<PlanCreationData>({
    title: '',
    objective_text: '',
    plan_type: 'coach',
    start_date: new Date().toISOString().split('T')[0],
    end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    weekly_sessions: 3,
    focus_areas: [],
    visibility: 'teamStaff',
    location_preference: 'pitch',
    intensity_preference: 3
  });

  const handlePlayerToggle = (playerId: string) => {
    setSelectedPlayers(prev => 
      prev.includes(playerId) 
        ? prev.filter(id => id !== playerId)
        : [...prev, playerId]
    );
  };

  const handleFocusAreaToggle = (area: string) => {
    setPlanData(prev => ({
      ...prev,
      focus_areas: prev.focus_areas.includes(area)
        ? prev.focus_areas.filter(a => a !== area)
        : [...prev.focus_areas, area]
    }));
  };

  const handleCreatePlans = async () => {
    if (selectedPlayers.length === 0) {
      toast.error('Please select at least one player');
      return;
    }

    if (!planData.title.trim()) {
      toast.error('Please enter a plan title');
      return;
    }

    try {
      setLoading(true);
      
      // Create plans for each selected player
      const createPromises = selectedPlayers.map(playerId => 
        IndividualTrainingService.createPlan({
          ...planData,
          player_id: playerId,
          coach_id: user?.id
        })
      );

      await Promise.all(createPromises);
      
      toast.success(`Created ${selectedPlayers.length} training plan(s) successfully`);
      onPlanCreated();
      
      // Reset form
      setSelectedPlayers([]);
      setPlanData({
        title: '',
        objective_text: '',
        plan_type: 'coach',
        start_date: new Date().toISOString().split('T')[0],
        end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        weekly_sessions: 3,
        focus_areas: [],
        visibility: 'teamStaff',
        location_preference: 'pitch',
        intensity_preference: 3
      });
      
    } catch (error) {
      console.error('Error creating plans:', error);
      toast.error('Failed to create training plans');
    } finally {
      setLoading(false);
    }
  };

  const handleAIRecommendation = (recommendation: any) => {
    setPlanData(prev => ({
      ...prev,
      title: recommendation.title || prev.title,
      objective_text: recommendation.objective || prev.objective_text,
      focus_areas: recommendation.focus_areas || prev.focus_areas,
      weekly_sessions: recommendation.weekly_sessions || prev.weekly_sessions,
      intensity_preference: recommendation.intensity || prev.intensity_preference
    }));
    setActiveTab('manual');
    toast.success('AI recommendations applied to plan');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Create Individual Training Plans
          </DialogTitle>
          <DialogDescription>
            Create personalized training plans for your players with manual setup or AI assistance
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="manual" className="flex items-center gap-2">
                <User className="w-4 h-4" />
                Manual Setup
              </TabsTrigger>
              <TabsTrigger value="ai" className="flex items-center gap-2">
                <Bot className="w-4 h-4" />
                AI Assistant
              </TabsTrigger>
            </TabsList>

            <TabsContent value="manual" className="space-y-6 mt-6">
              {/* Player Selection */}
              <div className="space-y-3">
                <Label className="flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Select Players ({selectedPlayers.length} selected)
                </Label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-32 overflow-y-auto border rounded-lg p-3">
                  {players.map((player) => (
                    <div key={player.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`player-${player.id}`}
                        checked={selectedPlayers.includes(player.id)}
                        onCheckedChange={() => handlePlayerToggle(player.id)}
                      />
                      <Label 
                        htmlFor={`player-${player.id}`}
                        className="text-sm font-normal cursor-pointer"
                      >
                        {player.name}
                      </Label>
                    </div>
                  ))}
                </div>
                {selectedPlayers.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {selectedPlayers.map(playerId => {
                      const player = players.find(p => p.id === playerId);
                      return (
                        <Badge key={playerId} variant="secondary" className="text-xs">
                          {player?.name}
                        </Badge>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Plan Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Plan Title</Label>
                  <Input
                    id="title"
                    value={planData.title}
                    onChange={(e) => setPlanData(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="e.g., Ball Control Focus - Week 1"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="weekly-sessions">Weekly Sessions</Label>
                  <Select
                    value={planData.weekly_sessions.toString()}
                    onValueChange={(value) => setPlanData(prev => ({ ...prev, weekly_sessions: parseInt(value) }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[1, 2, 3, 4, 5, 6, 7].map(num => (
                        <SelectItem key={num} value={num.toString()}>
                          {num} session{num !== 1 ? 's' : ''} per week
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="start-date">Start Date</Label>
                  <Input
                    id="start-date"
                    type="date"
                    value={planData.start_date}
                    onChange={(e) => setPlanData(prev => ({ ...prev, start_date: e.target.value }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="end-date">End Date</Label>
                  <Input
                    id="end-date"
                    type="date"
                    value={planData.end_date}
                    onChange={(e) => setPlanData(prev => ({ ...prev, end_date: e.target.value }))}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="objective">Training Objective</Label>
                <Textarea
                  id="objective"
                  value={planData.objective_text}
                  onChange={(e) => setPlanData(prev => ({ ...prev, objective_text: e.target.value }))}
                  placeholder="Describe the main goals and objectives for this training plan..."
                  rows={3}
                />
              </div>

              {/* Focus Areas */}
              <div className="space-y-3">
                <Label className="flex items-center gap-2">
                  <Target className="w-4 h-4" />
                  Focus Areas
                </Label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {FOCUS_AREAS.map((area) => (
                    <div key={area} className="flex items-center space-x-2">
                      <Checkbox
                        id={`focus-${area}`}
                        checked={planData.focus_areas.includes(area)}
                        onCheckedChange={() => handleFocusAreaToggle(area)}
                      />
                      <Label 
                        htmlFor={`focus-${area}`}
                        className="text-sm font-normal cursor-pointer"
                      >
                        {area}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Additional Settings */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Preferred Location</Label>
                  <Select
                    value={planData.location_preference}
                    onValueChange={(value: any) => setPlanData(prev => ({ ...prev, location_preference: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="home">Home/Indoor</SelectItem>
                      <SelectItem value="pitch">Pitch/Field</SelectItem>
                      <SelectItem value="gym">Gym</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Intensity Level (1-5)</Label>
                  <Select
                    value={planData.intensity_preference.toString()}
                    onValueChange={(value) => setPlanData(prev => ({ ...prev, intensity_preference: parseInt(value) }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[1, 2, 3, 4, 5].map(level => (
                        <SelectItem key={level} value={level.toString()}>
                          Level {level} {level === 1 ? '(Light)' : level === 5 ? '(Intense)' : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="ai" className="space-y-4 mt-6">
              <div className="text-center py-8">
                <Bot className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="font-semibold mb-2">AI Training Assistant</h3>
                <p className="text-muted-foreground mb-4">
                  AI-powered training plan generation is coming soon. For now, use the manual setup to create custom plans.
                </p>
                <Button 
                  variant="outline" 
                  onClick={() => setActiveTab('manual')}
                >
                  Use Manual Setup
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </div>

        <div className="flex items-center justify-between pt-4 border-t">
          <p className="text-sm text-muted-foreground">
            {selectedPlayers.length} player(s) selected
          </p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleCreatePlans}
              disabled={loading || selectedPlayers.length === 0}
            >
              {loading ? 'Creating...' : `Create Plan${selectedPlayers.length > 1 ? 's' : ''}`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};