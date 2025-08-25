import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { IndividualTrainingService } from '@/services/individualTrainingService';
import { SessionCreator } from './SessionCreator';
import { format, startOfWeek, addDays, isSameDay, parseISO } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { 
  Calendar, 
  Clock, 
  MapPin, 
  Play, 
  CheckCircle2,
  Zap,
  Target,
  Plus,
  Edit
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface WeeklyPlanViewProps {
  planId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onExecuteSession?: (sessionId: string) => void;
}

const DAYS_OF_WEEK = [
  { key: 0, label: 'Sunday' },
  { key: 1, label: 'Monday' },
  { key: 2, label: 'Tuesday' },
  { key: 3, label: 'Wednesday' },
  { key: 4, label: 'Thursday' },
  { key: 5, label: 'Friday' },
  { key: 6, label: 'Saturday' },
];

export function WeeklyPlanView({ 
  planId, 
  open, 
  onOpenChange, 
  onExecuteSession 
}: WeeklyPlanViewProps) {
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [showSessionCreator, setShowSessionCreator] = useState(false);
  const [selectedDay, setSelectedDay] = useState<number | null>(0);
  const queryClient = useQueryClient();

  // Fetch the plan
  const { data: plan } = useQuery({
    queryKey: ['individual-training-plan', planId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('individual_training_plans')
        .select('*')
        .eq('id', planId)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: open && !!planId,
  });

  // Fetch sessions for this plan
  const { data: sessions = [] } = useQuery({
    queryKey: ['individual-training-sessions', planId],
    queryFn: () => IndividualTrainingService.getPlanSessions(planId),
    enabled: open && !!planId,
  });

  // Get week start and dates
  const weekStart = startOfWeek(currentWeek, { weekStartsOn: 1 }); // Start on Monday
  const weekDates = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  // Group sessions by day of week
  const sessionsByDay = sessions.reduce((acc, session) => {
    if (session.day_of_week !== null) {
      if (!acc[session.day_of_week]) acc[session.day_of_week] = [];
      acc[session.day_of_week].push(session);
    }
    return acc;
  }, {} as Record<number, typeof sessions>);

  const getIntensityColor = (intensity: number) => {
    if (intensity <= 2) return 'bg-green-100 text-green-800';
    if (intensity <= 3) return 'bg-yellow-100 text-yellow-800';
    if (intensity <= 4) return 'bg-orange-100 text-orange-800';
    return 'bg-red-100 text-red-800';
  };

  const getLocationIcon = (location: string) => {
    return <MapPin className="w-3 h-3" />;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[95vh] overflow-hidden flex flex-col p-4 md:p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            {plan?.title || 'Training Plan'} - Weekly View
          </DialogTitle>
        </DialogHeader>

        {plan && (
          <div className="flex flex-col space-y-4 overflow-hidden">
            {/* Plan Info */}
            <div className="flex flex-wrap items-center gap-4 p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4" />
                <span className="font-medium">Goal:</span>
                <span className="text-sm">{plan.objective_text || 'General improvement'}</span>
              </div>
              <Badge variant="outline">
                {plan.weekly_sessions} sessions/week
              </Badge>
              <Badge variant={plan.plan_type === 'ai' ? 'default' : 'secondary'}>
                {plan.plan_type === 'ai' ? 'AI Generated' : plan.plan_type === 'coach' ? 'Coach Assigned' : 'Self Created'}
              </Badge>
            </div>

            {/* Week Navigation */}
            <div className="flex flex-col sm:flex-row justify-between items-center gap-3">
              <div className="flex gap-2 order-2 sm:order-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentWeek(addDays(currentWeek, -7))}
                  className="flex items-center gap-1"
                >
                  <span className="text-xs">←</span>
                  <span className="hidden sm:inline">Previous</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentWeek(addDays(currentWeek, 7))}
                  className="flex items-center gap-1"
                >
                  <span className="hidden sm:inline">Next</span>
                  <span className="text-xs">→</span>
                </Button>
              </div>
              <h3 className="font-semibold text-center order-1 sm:order-2">
                <span className="hidden sm:inline">Week of </span>
                {format(weekStart, 'MMM d')} - {format(addDays(weekStart, 6), 'MMM d, yyyy')}
              </h3>
            </div>

            {/* Weekly Calendar Grid */}
            <div className="flex-1 overflow-y-auto">
              {/* Desktop Grid View */}
              <div className="hidden md:block">
                <div className="grid grid-cols-7 gap-2 min-h-[400px]">
                  {DAYS_OF_WEEK.map((day, index) => {
                    const dayDate = weekDates[index];
                    const isToday = isSameDay(dayDate, new Date());
                    const daySessions = sessionsByDay[day.key] || [];
                    
                    return (
                      <div
                        key={day.key}
                        className={cn(
                          "border rounded-lg p-3 space-y-2",
                          isToday && "ring-2 ring-primary bg-primary/5"
                        )}
                      >
                        {/* Day Header */}
                        <div className="text-center">
                          <div className="font-medium text-sm">{day.label}</div>
                          <div className="text-xs text-muted-foreground">
                            {format(dayDate, 'MMM d')}
                          </div>
                        </div>

                        {/* Sessions */}
                        <div className="space-y-2">
                          {daySessions.length === 0 ? (
                            <div className="text-center py-4">
                              <div className="text-xs text-muted-foreground">No sessions</div>
                            </div>
                          ) : (
                            daySessions.map((session) => (
                              <Card 
                                key={session.id} 
                                className="cursor-pointer hover:shadow-md transition-shadow"
                                onClick={() => onExecuteSession?.(session.id)}
                              >
                                <CardHeader className="p-3 pb-2">
                                  <CardTitle className="text-sm">{session.title}</CardTitle>
                                </CardHeader>
                                <CardContent className="p-3 pt-0 space-y-2">
                                  <div className="flex flex-wrap gap-1">
                                    <Badge 
                                      variant="outline" 
                                      className="text-xs flex items-center gap-1"
                                    >
                                      <Clock className="w-3 h-3" />
                                      {session.target_duration_minutes}min
                                    </Badge>
                                    
                                    <Badge 
                                      className={cn("text-xs flex items-center gap-1", getIntensityColor(session.intensity))}
                                    >
                                      <Zap className="w-3 h-3" />
                                      {session.intensity}/5
                                    </Badge>
                                    
                                    <Badge 
                                      variant="outline" 
                                      className="text-xs flex items-center gap-1"
                                    >
                                      {getLocationIcon(session.location)}
                                      {session.location}
                                    </Badge>
                                  </div>

                                  {session.description && (
                                    <p className="text-xs text-muted-foreground line-clamp-2">
                                      {session.description}
                                    </p>
                                  )}

                                  <div className="flex gap-1">
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="h-7 text-xs flex-1"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        onExecuteSession?.(session.id);
                                      }}
                                    >
                                      <Play className="w-3 h-3 mr-1" />
                                      Start
                                    </Button>
                                  </div>
                                </CardContent>
                              </Card>
                            ))
                          )}
                          
                          {/* Add Session Button */}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="w-full h-8 text-xs"
                            onClick={() => {
                              setSelectedDay(day.key);
                              setShowSessionCreator(true);
                            }}
                          >
                            <Plus className="w-3 h-3 mr-1" />
                            Add Session
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Mobile Mini Calendar View */}
              <div className="md:hidden">
                {/* Week Grid - All 7 days visible */}
                <div className="grid grid-cols-7 gap-1 mb-4">
                  {DAYS_OF_WEEK.map((day, index) => {
                    const dayDate = weekDates[index];
                    const isToday = isSameDay(dayDate, new Date());
                    const daySessions = sessionsByDay[day.key] || [];
                    
                    return (
                      <Button
                        key={day.key}
                        variant={isToday ? "default" : "outline"}
                        size="sm"
                        className={cn(
                          "h-16 p-1 flex flex-col items-center justify-center text-xs relative",
                          selectedDay === day.key && "ring-2 ring-primary",
                          daySessions.length > 0 && "bg-blue-50 hover:bg-blue-100"
                        )}
                        onClick={() => setSelectedDay(day.key)}
                      >
                        <div className="font-medium truncate w-full text-center">
                          {day.label.slice(0, 3)}
                        </div>
                        <div className="text-xs opacity-70">
                          {format(dayDate, 'd')}
                        </div>
                        {daySessions.length > 0 && (
                          <div className="absolute -top-1 -right-1 w-4 h-4 bg-primary text-white rounded-full flex items-center justify-center text-xs font-bold">
                            {daySessions.length}
                          </div>
                        )}
                      </Button>
                    );
                  })}
                </div>

                {/* Selected Day Details */}
                {selectedDay !== null && (
                  <Card className="mb-4">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base flex items-center justify-between">
                        {DAYS_OF_WEEK[selectedDay]?.label} - {format(weekDates[selectedDay], 'MMM d')}
                        <Button
                          size="sm"
                          onClick={() => {
                            setShowSessionCreator(true);
                          }}
                        >
                          <Plus className="w-3 h-3 mr-1" />
                          Add
                        </Button>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {sessionsByDay[selectedDay]?.length === 0 ? (
                        <div className="text-center py-4 text-muted-foreground">
                          <Calendar className="w-6 h-6 mx-auto mb-2 opacity-50" />
                          <p className="text-sm">No sessions planned</p>
                        </div>
                      ) : (
                        sessionsByDay[selectedDay]?.map((session) => (
                          <div 
                            key={session.id}
                            className="p-3 bg-muted/30 rounded-lg cursor-pointer hover:bg-muted/50 transition-colors border-l-3 border-l-primary"
                            onClick={() => onExecuteSession?.(session.id)}
                          >
                            <div className="flex items-center justify-between mb-2">
                              <h5 className="font-medium text-sm truncate flex-1 mr-2">
                                {session.title}
                              </h5>
                              <Button
                                size="sm"
                                className="h-7 px-3 text-xs"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onExecuteSession?.(session.id);
                                }}
                              >
                                <Play className="w-3 h-3 mr-1" />
                                Start
                              </Button>
                            </div>
                            
                            {session.description && (
                              <p className="text-xs text-muted-foreground mb-2 line-clamp-1">
                                {session.description}
                              </p>
                            )}
                            
                            <div className="flex gap-1">
                              <Badge variant="outline" className="text-xs px-2 py-0 h-5">
                                <Clock className="w-3 h-3 mr-1" />
                                {session.target_duration_minutes}min
                              </Badge>
                              <Badge 
                                className={cn("text-xs px-2 py-0 h-5", getIntensityColor(session.intensity))}
                              >
                                <Zap className="w-3 h-3 mr-1" />
                                {session.intensity}/5
                              </Badge>
                              <Badge variant="outline" className="text-xs px-2 py-0 h-5">
                                {getLocationIcon(session.location)}
                                {session.location}
                              </Badge>
                            </div>
                          </div>
                        ))
                      )}
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>

            {/* Focus Areas */}
            {plan.focus_areas.length > 0 && (
              <div className="flex flex-wrap gap-2 items-center p-4 bg-muted/50 rounded-lg">
                <span className="text-sm font-medium">Focus Areas:</span>
                {plan.focus_areas.map((area) => (
                  <Badge key={area} variant="secondary" className="text-xs">
                    {area}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Close Button */}
        <div className="flex justify-end pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
        {/* Session Creator Modal */}
        {selectedDay !== null && (
          <SessionCreator
            open={showSessionCreator}
            onOpenChange={setShowSessionCreator}
            planId={planId}
            planTitle={plan?.title}
            dayOfWeek={selectedDay}
            onSessionCreated={() => {
              queryClient.invalidateQueries({ queryKey: ['individual-training-sessions', planId] });
            }}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}