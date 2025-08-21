import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { IndividualTrainingService } from '@/services/individualTrainingService';
import { PlanCreationData } from '@/types/individualTraining';
import { useAuth } from '@/contexts/AuthContext';
import { Users, Copy, Zap, Target, Calendar } from 'lucide-react';
import { toast } from 'sonner';

interface BulkPlanActionsProps {
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

const PLAN_TEMPLATES = [
  {
    id: 'ball_control_beginner',
    name: 'Ball Control - Beginner',
    description: 'Basic ball control and first touch training',
    focus_areas: ['Ball Control', 'Dribbling'],
    weekly_sessions: 3,
    intensity: 2,
    weeks: 4
  },
  {
    id: 'fitness_conditioning',
    name: 'Fitness Conditioning',
    description: 'Physical conditioning and endurance training',
    focus_areas: ['Fitness', 'Speed', 'Agility'],
    weekly_sessions: 4,
    intensity: 4,
    weeks: 6
  },
  {
    id: 'shooting_accuracy',
    name: 'Shooting Accuracy',
    description: 'Improve shooting technique and accuracy',
    focus_areas: ['Shooting', 'Ball Control'],
    weekly_sessions: 3,
    intensity: 3,
    weeks: 3
  },
  {
    id: 'defensive_fundamentals',
    name: 'Defensive Fundamentals',
    description: 'Core defensive skills and positioning',
    focus_areas: ['Defending', 'Fitness'],
    weekly_sessions: 3,
    intensity: 3,
    weeks: 4
  }
];

export const BulkPlanActions: React.FC<BulkPlanActionsProps> = ({
  players,
  onPlanCreated
}) => {
  const { user } = useAuth();
  const [activeAction, setActiveAction] = useState<'template' | 'custom' | null>(null);
  const [selectedPlayers, setSelectedPlayers] = useState<string[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [loading, setLoading] = useState(false);

  const [customPlanData, setCustomPlanData] = useState<PlanCreationData>({
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

  const selectAllPlayers = () => {
    setSelectedPlayers(players.map(p => p.id));
  };

  const clearSelection = () => {
    setSelectedPlayers([]);
  };

  const handleFocusAreaToggle = (area: string) => {
    setCustomPlanData(prev => ({
      ...prev,
      focus_areas: prev.focus_areas.includes(area)
        ? prev.focus_areas.filter(a => a !== area)
        : [...prev.focus_areas, area]
    }));
  };

  const handleTemplateCreate = async () => {
    if (selectedPlayers.length === 0) {
      toast.error('Please select at least one player');
      return;
    }

    if (!selectedTemplate) {
      toast.error('Please select a template');
      return;
    }

    const template = PLAN_TEMPLATES.find(t => t.id === selectedTemplate);
    if (!template) {
      toast.error('Invalid template selected');
      return;
    }

    try {
      setLoading(true);

      const endDate = new Date();
      endDate.setDate(endDate.getDate() + (template.weeks * 7));

      const planData: PlanCreationData = {
        title: template.name,
        objective_text: template.description,
        plan_type: 'coach',
        start_date: new Date().toISOString().split('T')[0],
        end_date: endDate.toISOString().split('T')[0],
        weekly_sessions: template.weekly_sessions,
        focus_areas: template.focus_areas,
        visibility: 'teamStaff',
        location_preference: 'pitch',
        intensity_preference: template.intensity
      };

      const createPromises = selectedPlayers.map(playerId => 
        IndividualTrainingService.createPlan({
          ...planData,
          player_id: playerId,
          coach_id: user?.id
        })
      );

      await Promise.all(createPromises);
      
      toast.success(`Created ${selectedPlayers.length} training plans from template`);
      onPlanCreated();
      setActiveAction(null);
      setSelectedPlayers([]);
      setSelectedTemplate('');
      
    } catch (error) {
      console.error('Error creating template plans:', error);
      toast.error('Failed to create training plans from template');
    } finally {
      setLoading(false);
    }
  };

  const handleCustomCreate = async () => {
    if (selectedPlayers.length === 0) {
      toast.error('Please select at least one player');
      return;
    }

    if (!customPlanData.title.trim()) {
      toast.error('Please enter a plan title');
      return;
    }

    try {
      setLoading(true);
      
      const createPromises = selectedPlayers.map(playerId => 
        IndividualTrainingService.createPlan({
          ...customPlanData,
          player_id: playerId,
          coach_id: user?.id
        })
      );

      await Promise.all(createPromises);
      
      toast.success(`Created ${selectedPlayers.length} custom training plans`);
      onPlanCreated();
      setActiveAction(null);
      setSelectedPlayers([]);
      setCustomPlanData({
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
      console.error('Error creating custom plans:', error);
      toast.error('Failed to create custom training plans');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5" />
            Bulk Training Plan Actions
          </CardTitle>
          <CardDescription>
            Create training plans for multiple players at once using templates or custom settings
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Player Selection */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                Select Players ({selectedPlayers.length} selected)
              </Label>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={selectAllPlayers}>
                  Select All
                </Button>
                <Button variant="outline" size="sm" onClick={clearSelection}>
                  Clear
                </Button>
              </div>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-32 overflow-y-auto border rounded-lg p-3">
              {players.map((player) => (
                <div key={player.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={`bulk-player-${player.id}`}
                    checked={selectedPlayers.includes(player.id)}
                    onCheckedChange={() => handlePlayerToggle(player.id)}
                  />
                  <Label 
                    htmlFor={`bulk-player-${player.id}`}
                    className="text-sm font-normal cursor-pointer"
                  >
                    {player.name}
                  </Label>
                </div>
              ))}
            </div>
            
            {selectedPlayers.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {selectedPlayers.slice(0, 5).map(playerId => {
                  const player = players.find(p => p.id === playerId);
                  return (
                    <Badge key={playerId} variant="secondary" className="text-xs">
                      {player?.name}
                    </Badge>
                  );
                })}
                {selectedPlayers.length > 5 && (
                  <Badge variant="secondary" className="text-xs">
                    +{selectedPlayers.length - 5} more
                  </Badge>
                )}
              </div>
            )}
          </div>

          <Separator />

          {/* Action Selection */}
          {!activeAction && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="cursor-pointer hover:bg-accent" onClick={() => setActiveAction('template')}>
                <CardContent className="p-6">
                  <div className="flex items-center gap-3">
                    <Copy className="w-8 h-8 text-primary" />
                    <div>
                      <h3 className="font-semibold">Use Template</h3>
                      <p className="text-sm text-muted-foreground">
                        Choose from pre-built training plan templates
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="cursor-pointer hover:bg-accent" onClick={() => setActiveAction('custom')}>
                <CardContent className="p-6">
                  <div className="flex items-center gap-3">
                    <Target className="w-8 h-8 text-primary" />
                    <div>
                      <h3 className="font-semibold">Custom Plan</h3>
                      <p className="text-sm text-muted-foreground">
                        Create a custom training plan for all selected players
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Template Selection */}
          {activeAction === 'template' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">Select Template</h3>
                <Button variant="ghost" size="sm" onClick={() => setActiveAction(null)}>
                  Back
                </Button>
              </div>
              
              <div className="grid gap-4">
                {PLAN_TEMPLATES.map((template) => (
                  <Card 
                    key={template.id} 
                    className={`cursor-pointer transition-colors ${
                      selectedTemplate === template.id ? 'ring-2 ring-primary bg-accent' : 'hover:bg-accent'
                    }`}
                    onClick={() => setSelectedTemplate(template.id)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="font-medium">{template.name}</h4>
                          <p className="text-sm text-muted-foreground mb-2">{template.description}</p>
                          <div className="flex flex-wrap gap-1">
                            {template.focus_areas.map(area => (
                              <Badge key={area} variant="outline" className="text-xs">
                                {area}
                              </Badge>
                            ))}
                          </div>
                        </div>
                        <div className="text-right text-sm text-muted-foreground">
                          <div>{template.weekly_sessions} sessions/week</div>
                          <div>{template.weeks} weeks</div>
                          <div>Intensity: {template.intensity}/5</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <div className="flex justify-end gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => setActiveAction(null)}
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleTemplateCreate}
                  disabled={loading || selectedPlayers.length === 0 || !selectedTemplate}
                >
                  {loading ? 'Creating...' : `Create ${selectedPlayers.length} Plan(s)`}
                </Button>
              </div>
            </div>
          )}

          {/* Custom Plan Form */}
          {activeAction === 'custom' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">Custom Plan Details</h3>
                <Button variant="ghost" size="sm" onClick={() => setActiveAction(null)}>
                  Back
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="custom-title">Plan Title</Label>
                  <Input
                    id="custom-title"
                    value={customPlanData.title}
                    onChange={(e) => setCustomPlanData(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="e.g., Team Fitness Week"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="custom-sessions">Weekly Sessions</Label>
                  <Select
                    value={customPlanData.weekly_sessions.toString()}
                    onValueChange={(value) => setCustomPlanData(prev => ({ ...prev, weekly_sessions: parseInt(value) }))}
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
              </div>

              <div className="space-y-2">
                <Label htmlFor="custom-objective">Training Objective</Label>
                <Textarea
                  id="custom-objective"
                  value={customPlanData.objective_text}
                  onChange={(e) => setCustomPlanData(prev => ({ ...prev, objective_text: e.target.value }))}
                  placeholder="Describe the main goals for this training plan..."
                  rows={3}
                />
              </div>

              <div className="space-y-3">
                <Label>Focus Areas</Label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {FOCUS_AREAS.map((area) => (
                    <div key={area} className="flex items-center space-x-2">
                      <Checkbox
                        id={`custom-focus-${area}`}
                        checked={customPlanData.focus_areas.includes(area)}
                        onCheckedChange={() => handleFocusAreaToggle(area)}
                      />
                      <Label 
                        htmlFor={`custom-focus-${area}`}
                        className="text-sm font-normal cursor-pointer"
                      >
                        {area}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => setActiveAction(null)}
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleCustomCreate}
                  disabled={loading || selectedPlayers.length === 0 || !customPlanData.title.trim()}
                >
                  {loading ? 'Creating...' : `Create ${selectedPlayers.length} Plan(s)`}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};