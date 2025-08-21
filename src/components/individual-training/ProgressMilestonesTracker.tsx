import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Target, TrendingUp, CheckCircle, Plus, Trophy, Calendar, Edit } from 'lucide-react';
import { IndividualTrainingService } from '@/services/individualTrainingService';
import { toast } from 'sonner';
import type { IndividualProgressMilestone, IndividualTrainingPlan } from '@/types/individualTraining';

interface ProgressMilestonesTrackerProps {
  plan: IndividualTrainingPlan;
  onMilestoneUpdate?: () => void;
}

export const ProgressMilestonesTracker: React.FC<ProgressMilestonesTrackerProps> = ({
  plan,
  onMilestoneUpdate
}) => {
  const [milestones, setMilestones] = useState<IndividualProgressMilestone[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showUpdateDialog, setShowUpdateDialog] = useState(false);
  const [selectedMilestone, setSelectedMilestone] = useState<IndividualProgressMilestone | null>(null);
  
  // Form states
  const [milestoneName, setMilestoneName] = useState('');
  const [targetValue, setTargetValue] = useState('');
  const [unit, setUnit] = useState('');
  const [notes, setNotes] = useState('');
  const [currentValue, setCurrentValue] = useState('');
  const [progressNotes, setProgressNotes] = useState('');

  useEffect(() => {
    loadMilestones();
  }, [plan.id]);

  const loadMilestones = async () => {
    try {
      const data = await IndividualTrainingService.getPlanMilestones(plan.id);
      setMilestones(data);
    } catch (error) {
      console.error('Error loading milestones:', error);
      toast.error('Failed to load progress milestones');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateMilestone = async () => {
    if (!milestoneName.trim()) {
      toast.error('Please enter a milestone name');
      return;
    }

    try {
      await IndividualTrainingService.createMilestone(plan.id, {
        milestone_name: milestoneName,
        target_value: targetValue ? parseFloat(targetValue) : undefined,
        unit: unit.trim() || undefined,
        notes: notes.trim() || undefined
      });

      toast.success('Milestone created successfully');
      loadMilestones();
      setShowCreateDialog(false);
      resetForm();
      onMilestoneUpdate?.();
    } catch (error) {
      console.error('Error creating milestone:', error);
      toast.error('Failed to create milestone');
    }
  };

  const handleUpdateProgress = async () => {
    if (!selectedMilestone || !currentValue.trim()) {
      toast.error('Please enter a progress value');
      return;
    }

    try {
      await IndividualTrainingService.updateMilestoneProgress(
        selectedMilestone.id,
        parseFloat(currentValue),
        progressNotes.trim() || undefined
      );

      toast.success('Progress updated successfully');
      loadMilestones();
      setShowUpdateDialog(false);
      setSelectedMilestone(null);
      setCurrentValue('');
      setProgressNotes('');
      onMilestoneUpdate?.();
    } catch (error) {
      console.error('Error updating progress:', error);
      toast.error('Failed to update progress');
    }
  };

  const resetForm = () => {
    setMilestoneName('');
    setTargetValue('');
    setUnit('');
    setNotes('');
  };

  const getProgressPercentage = (milestone: IndividualProgressMilestone) => {
    if (!milestone.target_value) return 0;
    return Math.min((milestone.current_value / milestone.target_value) * 100, 100);
  };

  const isAchieved = (milestone: IndividualProgressMilestone) => {
    return !!milestone.achieved_at;
  };

  const formatValue = (value: number, unit?: string) => {
    return `${value}${unit ? ` ${unit}` : ''}`;
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-blue-600" />
            Progress Milestones
          </CardTitle>
          
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Milestone
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Progress Milestone</DialogTitle>
              </DialogHeader>
              
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Milestone Name *</label>
                  <Input
                    value={milestoneName}
                    onChange={(e) => setMilestoneName(e.target.value)}
                    placeholder="e.g., Complete 50 ball touches"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Target Value</label>
                    <Input
                      type="number"
                      value={targetValue}
                      onChange={(e) => setTargetValue(e.target.value)}
                      placeholder="50"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Unit</label>
                    <Input
                      value={unit}
                      onChange={(e) => setUnit(e.target.value)}
                      placeholder="touches, minutes, goals"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="text-sm font-medium">Notes</label>
                  <Textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Additional details about this milestone..."
                    rows={2}
                  />
                </div>
                
                <div className="flex gap-2 pt-4">
                  <Button onClick={handleCreateMilestone}>
                    Create Milestone
                  </Button>
                  <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      
      <CardContent>
        {milestones.length === 0 ? (
          <Alert>
            <Target className="h-4 w-4" />
            <AlertDescription>
              No progress milestones set yet. Create milestones to track your training progress and achievements.
            </AlertDescription>
          </Alert>
        ) : (
          <div className="space-y-4">
            {milestones.map((milestone) => (
              <div key={milestone.id} className="border rounded-lg p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    {isAchieved(milestone) ? (
                      <Trophy className="h-5 w-5 text-yellow-500" />
                    ) : (
                      <TrendingUp className="h-5 w-5 text-blue-500" />
                    )}
                    <div>
                      <div className="font-medium">{milestone.milestone_name}</div>
                      <div className="text-sm text-muted-foreground">
                        Created {new Date(milestone.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {isAchieved(milestone) && (
                      <Badge className="bg-green-100 text-green-700 border-green-200">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Achieved
                      </Badge>
                    )}
                    
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setSelectedMilestone(milestone);
                        setCurrentValue(milestone.current_value.toString());
                        setProgressNotes('');
                        setShowUpdateDialog(true);
                      }}
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Update
                    </Button>
                  </div>
                </div>
                
                {/* Progress Bar */}
                {milestone.target_value && (
                  <div className="mb-3">
                    <div className="flex justify-between text-sm mb-1">
                      <span>Progress</span>
                      <span>
                        {formatValue(milestone.current_value, milestone.unit)} / {formatValue(milestone.target_value, milestone.unit)}
                      </span>
                    </div>
                    <Progress 
                      value={getProgressPercentage(milestone)} 
                      className={`h-2 ${isAchieved(milestone) ? 'bg-green-100' : ''}`}
                    />
                    <div className="text-right text-xs text-muted-foreground mt-1">
                      {Math.round(getProgressPercentage(milestone))}% complete
                    </div>
                  </div>
                )}
                
                {/* Current Value (for milestones without target) */}
                {!milestone.target_value && (
                  <div className="mb-3">
                    <div className="text-sm text-muted-foreground">Current Value:</div>
                    <div className="font-medium">{formatValue(milestone.current_value, milestone.unit)}</div>
                  </div>
                )}
                
                {/* Achievement Date */}
                {isAchieved(milestone) && (
                  <div className="mb-3 p-2 bg-green-50 rounded-md">
                    <div className="flex items-center gap-2 text-green-700">
                      <Calendar className="h-4 w-4" />
                      <span className="text-sm">
                        Achieved on {new Date(milestone.achieved_at!).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                )}
                
                {/* Notes */}
                {milestone.notes && (
                  <div className="text-sm text-muted-foreground border-t pt-2 mt-2">
                    <div className="font-medium mb-1">Notes:</div>
                    {milestone.notes}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
        
        {/* Update Progress Dialog */}
        {selectedMilestone && (
          <Dialog open={showUpdateDialog} onOpenChange={setShowUpdateDialog}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Update Progress: {selectedMilestone.milestone_name}</DialogTitle>
              </DialogHeader>
              
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">
                    Current Value {selectedMilestone.unit && `(${selectedMilestone.unit})`}
                  </label>
                  <Input
                    type="number"
                    value={currentValue}
                    onChange={(e) => setCurrentValue(e.target.value)}
                    placeholder="Enter current progress value"
                  />
                </div>
                
                <div>
                  <label className="text-sm font-medium">Progress Notes</label>
                  <Textarea
                    value={progressNotes}
                    onChange={(e) => setProgressNotes(e.target.value)}
                    placeholder="Add notes about your progress..."
                    rows={3}
                  />
                </div>
                
                <div className="flex gap-2 pt-4">
                  <Button onClick={handleUpdateProgress}>
                    Update Progress
                  </Button>
                  <Button variant="outline" onClick={() => setShowUpdateDialog(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </CardContent>
    </Card>
  );
};