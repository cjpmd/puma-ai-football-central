import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { IndividualTrainingService } from '@/services/individualTrainingService';
import { IndividualSessionDrill } from '@/types/individualTraining';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { 
  Play, 
  Pause, 
  Square, 
  Clock, 
  CheckCircle2,
  SkipForward,
  Timer,
  Target,
  Zap
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface SessionExecutionModeProps {
  sessionId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SessionExecutionMode({ 
  sessionId, 
  open, 
  onOpenChange 
}: SessionExecutionModeProps) {
  const [currentDrillIndex, setCurrentDrillIndex] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [drillResults, setDrillResults] = useState<Record<string, any>>({});
  const [sessionNotes, setSessionNotes] = useState('');
  const [rpe, setRpe] = useState<number>(5);
  const [isCompleting, setIsCompleting] = useState(false);

  const queryClient = useQueryClient();

  // Get session details
  const { data: session, isLoading: sessionLoading, error: sessionError } = useQuery({
    queryKey: ['individual-training-session', sessionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('individual_training_sessions')
        .select('*')
        .eq('id', sessionId)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: open && !!sessionId,
  });

  // Get session drills
  const { data: drills = [], isLoading: drillsLoading } = useQuery({
    queryKey: ['individual-session-drills', sessionId],
    queryFn: () => IndividualTrainingService.getSessionDrills(sessionId),
    enabled: open && !!sessionId,
  });

  // Timer effect
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRunning && open) {
      interval = setInterval(() => {
        setElapsedSeconds(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRunning, open]);

  // Complete session mutation
  const completeSessionMutation = useMutation({
    mutationFn: async (completionData: {
      actual_duration_minutes: number;
      rpe: number;
      notes: string;
      drill_results: Record<string, any>;
    }) => {
      // First get player_id from session
      const { data: sessionData, error: sessionError } = await supabase
        .from('individual_training_sessions')
        .select('plan_id')
        .eq('id', sessionId)
        .single();
      
      if (sessionError) throw sessionError;

      const { data: planData, error: planError } = await supabase
        .from('individual_training_plans')
        .select('player_id')
        .eq('id', sessionData.plan_id)
        .single();
      
      if (planError) throw planError;

      return IndividualTrainingService.completeSession({
        session_id: sessionId,
        player_id: planData.player_id,
        completed_date: new Date().toISOString().split('T')[0],
        actual_duration_minutes: completionData.actual_duration_minutes,
        rpe: completionData.rpe,
        notes: completionData.notes,
        drill_results: completionData.drill_results,
        video_evidence_urls: [],
        completed: true
      });
    },
    onSuccess: () => {
      toast.success('Session completed successfully!');
      queryClient.invalidateQueries({ queryKey: ['individual-training-sessions'] });
      onOpenChange(false);
      resetSession();
    },
    onError: (error) => {
      toast.error('Failed to complete session');
      console.error('Error completing session:', error);
    },
  });

  const resetSession = () => {
    setCurrentDrillIndex(0);
    setIsRunning(false);
    setElapsedSeconds(0);
    setDrillResults({});
    setSessionNotes('');
    setRpe(5);
    setIsCompleting(false);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleStartPause = () => {
    setIsRunning(!isRunning);
  };

  const handleStop = () => {
    setIsRunning(false);
    setIsCompleting(true);
  };

  const handleNextDrill = () => {
    if (currentDrillIndex < drills.length - 1) {
      setCurrentDrillIndex(prev => prev + 1);
    }
  };

  const handlePreviousDrill = () => {
    if (currentDrillIndex > 0) {
      setCurrentDrillIndex(prev => prev - 1);
    }
  };

  const handleDrillResultChange = (drillId: string, key: string, value: any) => {
    setDrillResults(prev => ({
      ...prev,
      [drillId]: {
        ...prev[drillId],
        [key]: value
      }
    }));
  };

  const handleCompleteSession = () => {
    completeSessionMutation.mutate({
      actual_duration_minutes: Math.round(elapsedSeconds / 60),
      rpe,
      notes: sessionNotes,
      drill_results: drillResults
    });
  };

  const currentDrill = drills[currentDrillIndex];
  const progress = drills.length > 0 ? ((currentDrillIndex + 1) / drills.length) * 100 : 0;

  // Handle loading and error states
  if (sessionError) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Error Loading Session</DialogTitle>
          </DialogHeader>
          <div className="text-center py-8">
            <p className="text-red-500 mb-4">Failed to load training session</p>
            <Button onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (sessionLoading || drillsLoading || !session) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Loading Session...</DialogTitle>
          </DialogHeader>
          <div className="text-center py-8">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p>Loading training session details...</p>
            <Button 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              className="mt-4"
            >
              Cancel
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Timer className="w-5 h-5" />
            {session.title}
          </DialogTitle>
        </DialogHeader>

        {!isCompleting ? (
          <div className="space-y-6">
            {/* Session Info */}
            <div className="flex justify-between items-center p-4 bg-muted/50 rounded-lg">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  <span className="font-medium">Target: {session.target_duration_minutes} minutes</span>
                </div>
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4" />
                  <span className="text-sm text-muted-foreground">Intensity: {session.intensity}/5</span>
                </div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold">{formatTime(elapsedSeconds)}</div>
                <div className="text-sm text-muted-foreground">Elapsed</div>
              </div>
            </div>

            {/* Progress */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Progress</span>
                <span>Drill {currentDrillIndex + 1} of {drills.length}</span>
              </div>
              <Progress value={progress} className="w-full" />
            </div>

            {/* Timer Controls */}
            <div className="flex justify-center gap-4">
              <Button
                size="lg"
                onClick={handleStartPause}
                className={cn(
                  "px-8",
                  isRunning ? "bg-yellow-600 hover:bg-yellow-700" : "bg-green-600 hover:bg-green-700"
                )}
              >
                {isRunning ? (
                  <>
                    <Pause className="w-5 h-5 mr-2" />
                    Pause
                  </>
                ) : (
                  <>
                    <Play className="w-5 h-5 mr-2" />
                    Start
                  </>
                )}
              </Button>
              
              <Button
                size="lg"
                variant="destructive"
                onClick={handleStop}
                disabled={elapsedSeconds === 0}
              >
                <Square className="w-5 h-5 mr-2" />
                Finish Session
              </Button>
            </div>

            {/* Current Drill */}
            {currentDrill && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>{currentDrill.drill?.name || currentDrill.custom_drill_name}</span>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handlePreviousDrill}
                        disabled={currentDrillIndex === 0}
                      >
                        Previous
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleNextDrill}
                        disabled={currentDrillIndex === drills.length - 1}
                      >
                        <SkipForward className="w-4 h-4 mr-1" />
                        Next
                      </Button>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {(currentDrill.drill?.description || currentDrill.custom_drill_description) && (
                    <p className="text-muted-foreground">
                      {currentDrill.drill?.description || currentDrill.custom_drill_description}
                    </p>
                  )}

                  <div className="flex flex-wrap gap-2">
                    {currentDrill.target_duration_minutes && (
                      <Badge variant="outline" className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {currentDrill.target_duration_minutes} min
                      </Badge>
                    )}
                    
                    {currentDrill.target_repetitions && (
                      <Badge variant="outline" className="flex items-center gap-1">
                        <Target className="w-3 h-3" />
                        {currentDrill.target_repetitions} reps
                      </Badge>
                    )}
                    
                    <Badge variant="secondary">
                      Level {currentDrill.progression_level}
                    </Badge>
                  </div>

                  {/* Drill Results Input */}
                  <div className="grid gap-4 md:grid-cols-2">
                    {currentDrill.target_repetitions && (
                      <div className="space-y-2">
                        <Label>Repetitions Completed</Label>
                        <Input
                          type="number"
                          placeholder={`Target: ${currentDrill.target_repetitions}`}
                          value={drillResults[currentDrill.id]?.reps || ''}
                          onChange={(e) => handleDrillResultChange(
                            currentDrill.id, 
                            'reps', 
                            parseInt(e.target.value) || 0
                          )}
                        />
                      </div>
                    )}
                    
                    <div className="space-y-2">
                      <Label>Quality (1-10)</Label>
                      <Input
                        type="number"
                        min="1"
                        max="10"
                        placeholder="Rate quality"
                        value={drillResults[currentDrill.id]?.quality || ''}
                        onChange={(e) => handleDrillResultChange(
                          currentDrill.id, 
                          'quality', 
                          parseInt(e.target.value) || 0
                        )}
                      />
                    </div>
                  </div>

                  {currentDrill.notes && (
                    <div className="p-3 bg-muted/50 rounded-lg">
                      <h4 className="font-medium mb-1">Coach Notes:</h4>
                      <p className="text-sm text-muted-foreground">{currentDrill.notes}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        ) : (
          /* Session Completion Form */
          <div className="space-y-6">
            <div className="text-center">
              <CheckCircle2 className="w-16 h-16 mx-auto text-green-600 mb-4" />
              <h3 className="text-xl font-semibold">Session Complete!</h3>
              <p className="text-muted-foreground">
                Duration: {formatTime(elapsedSeconds)} ({Math.round(elapsedSeconds / 60)} minutes)
              </p>
            </div>

            {/* RPE Rating */}
            <div className="space-y-2">
              <Label>Rate of Perceived Exertion (1-10)</Label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((rating) => (
                  <Button
                    key={rating}
                    variant={rpe === rating ? "default" : "outline"}
                    size="sm"
                    onClick={() => setRpe(rating)}
                    className="w-10 h-10"
                  >
                    {rating}
                  </Button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                1 = Very Easy, 5 = Moderate, 10 = Maximum Effort
              </p>
            </div>

            {/* Session Notes */}
            <div className="space-y-2">
              <Label>Session Notes</Label>
              <Textarea
                placeholder="How did the session go? Any observations or improvements for next time?"
                value={sessionNotes}
                onChange={(e) => setSessionNotes(e.target.value)}
                rows={4}
              />
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setIsCompleting(false)}
                className="flex-1"
              >
                Back to Session
              </Button>
              <Button
                onClick={handleCompleteSession}
                disabled={completeSessionMutation.isPending}
                className="flex-1"
              >
                {completeSessionMutation.isPending ? 'Saving...' : 'Complete Session'}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}