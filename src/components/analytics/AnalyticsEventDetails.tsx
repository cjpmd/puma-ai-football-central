import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { matchEventService } from '@/services/matchEventService';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { format } from 'date-fns';
import { Target, Trophy, Shield, AlertCircle, CheckCircle, Calendar, Clock, MapPin } from 'lucide-react';

interface AnalyticsEventDetailsProps {
  eventId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface EventData {
  id: string;
  title: string;
  date: string;
  start_time: string | null;
  opponent: string | null;
  event_type: string;
  location: string | null;
  scores: any;
  player_of_match_id: string | null;
  coach_notes: string | null;
  staff_notes: string | null;
}

interface MatchEventsSummary {
  goals: Array<{ playerId: string; playerName: string; count: number }>;
  assists: Array<{ playerId: string; playerName: string; count: number }>;
  saves: Array<{ playerId: string; playerName: string; count: number }>;
  yellowCards: Array<{ playerId: string; playerName: string; count: number }>;
  redCards: Array<{ playerId: string; playerName: string; count: number }>;
}

export const AnalyticsEventDetails: React.FC<AnalyticsEventDetailsProps> = ({
  eventId,
  open,
  onOpenChange,
}) => {
  const [event, setEvent] = useState<EventData | null>(null);
  const [matchEventsSummary, setMatchEventsSummary] = useState<MatchEventsSummary | null>(null);
  const [potmPlayer, setPotmPlayer] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (open && eventId) {
      loadEventDetails();
    }
  }, [open, eventId]);

  const loadEventDetails = async () => {
    try {
      setLoading(true);

      // Fetch event data
      const { data: eventData, error: eventError } = await supabase
        .from('events')
        .select('id, title, date, start_time, opponent, event_type, location, scores, player_of_match_id, coach_notes, staff_notes')
        .eq('id', eventId)
        .single();

      if (eventError) throw eventError;
      setEvent(eventData);

      // Fetch match events summary
      const summary = await matchEventService.getEventMatchEventsSummary(eventId);
      setMatchEventsSummary(summary);

      // Fetch POTM player name
      if (eventData.player_of_match_id) {
        const { data: playerData } = await supabase
          .from('players')
          .select('name')
          .eq('id', eventData.player_of_match_id)
          .single();
        
        if (playerData) {
          setPotmPlayer(playerData.name);
        }
      } else if (eventData.scores && typeof eventData.scores === 'object' && 'potm_team_1' in eventData.scores) {
        setPotmPlayer(eventData.scores.potm_team_1 as string);
      }

    } catch (error) {
      console.error('Error loading event details:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderScore = () => {
    if (!event?.scores) return 'No score recorded';

    const scores = event.scores;
    
    // Multi-team format
    if (scores.team_1 !== undefined) {
      const parts = [];
      let teamNum = 1;
      while (scores[`team_${teamNum}`] !== undefined) {
        const teamScore = scores[`team_${teamNum}`];
        const opponent = scores[`opponent_${teamNum}`] || `Opponent ${teamNum}`;
        parts.push(`${opponent}: ${teamScore}`);
        teamNum++;
      }
      return parts.join(' | ');
    }
    
    // Home/away format
    if (scores.home !== undefined && scores.away !== undefined) {
      return `${scores.home} - ${scores.away}`;
    }
    
    return 'No score recorded';
  };

  const renderPerformanceAnalysis = () => {
    const analysis = event?.scores?.performance_analysis;
    if (!analysis) return null;

    return (
      <Card>
        <CardHeader className="p-4 sm:p-6 pb-2 sm:pb-4">
          <CardTitle className="text-sm">Performance Analysis</CardTitle>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 pt-0 space-y-4">
          {/* Positives */}
          {(analysis.positives?.on_ball?.length > 0 || analysis.positives?.off_ball?.length > 0) && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="h-4 w-4 text-success" />
                <h4 className="text-sm font-semibold">Positives</h4>
              </div>
              <div className="space-y-2">
                {analysis.positives.on_ball?.length > 0 && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">On Ball:</p>
                    <div className="flex flex-wrap gap-1">
                      {analysis.positives.on_ball.map((tag: string, idx: number) => (
                        <Badge key={idx} variant="outline" className="bg-success/10 text-success border-success/20">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                {analysis.positives.off_ball?.length > 0 && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Off Ball:</p>
                    <div className="flex flex-wrap gap-1">
                      {analysis.positives.off_ball.map((tag: string, idx: number) => (
                        <Badge key={idx} variant="outline" className="bg-success/10 text-success border-success/20">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Challenges */}
          {(analysis.challenges?.on_ball?.length > 0 || analysis.challenges?.off_ball?.length > 0) && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Target className="h-4 w-4 text-warning" />
                <h4 className="text-sm font-semibold">Areas for Development</h4>
              </div>
              <div className="space-y-2">
                {analysis.challenges.on_ball?.length > 0 && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">On Ball:</p>
                    <div className="flex flex-wrap gap-1">
                      {analysis.challenges.on_ball.map((tag: string, idx: number) => (
                        <Badge key={idx} variant="outline" className="bg-warning/10 text-warning border-warning/20">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                {analysis.challenges.off_ball?.length > 0 && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Off Ball:</p>
                    <div className="flex flex-wrap gap-1">
                      {analysis.challenges.off_ball.map((tag: string, idx: number) => (
                        <Badge key={idx} variant="outline" className="bg-warning/10 text-warning border-warning/20">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  if (loading || !event) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="w-[calc(100vw-2rem)] max-w-3xl max-h-[90vh] p-3 sm:p-6 overflow-hidden">
          <div className="flex items-center justify-center h-64">
            <p className="text-sm text-muted-foreground">Loading event details...</p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-2rem)] max-w-3xl max-h-[90vh] p-3 sm:p-6 overflow-hidden">
        <DialogHeader>
          <DialogTitle className="text-base sm:text-lg break-words">{event.title}</DialogTitle>
        </DialogHeader>
        
        <ScrollArea className="max-h-[calc(90vh-120px)] pr-2 sm:pr-4 overflow-x-hidden">
          <div className="space-y-4 sm:space-y-6">
            {/* Event Info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span>{format(new Date(event.date), 'EEE, MMM dd, yyyy')}</span>
              </div>
              {event.start_time && (
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span>{event.start_time}</span>
                </div>
              )}
              {event.opponent && (
                <div className="flex items-center gap-2 text-sm sm:col-span-2">
                  <Shield className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <span className="break-words">vs {event.opponent}</span>
                </div>
              )}
              {event.location && (
                <div className="flex items-center gap-2 text-sm sm:col-span-2">
                  <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <span className="break-words">{event.location}</span>
                </div>
              )}
              <div className="sm:col-span-2">
                <Badge variant="outline">{event.event_type}</Badge>
              </div>
            </div>

            <Separator />

            {/* Score */}
            <Card>
              <CardHeader className="p-4 sm:p-6 pb-2 sm:pb-4">
                <CardTitle className="text-sm">Score</CardTitle>
              </CardHeader>
              <CardContent className="p-4 sm:p-6 pt-0">
                <p className="text-xl sm:text-2xl font-bold break-words">{renderScore()}</p>
              </CardContent>
            </Card>

            {/* Match Events Summary */}
            {matchEventsSummary && (
              <Card>
                <CardHeader className="p-4 sm:p-6 pb-2 sm:pb-4">
                  <CardTitle className="text-sm">Match Events</CardTitle>
                </CardHeader>
                <CardContent className="p-4 sm:p-6 pt-0 space-y-4">
                  {matchEventsSummary.goals.length > 0 && (
                    <div>
                      <h4 className="text-xs font-semibold mb-2 flex items-center gap-2">
                        <Target className="h-3 w-3" />
                        Goals
                      </h4>
                      <div className="space-y-1">
                        {matchEventsSummary.goals.map((goal, idx) => (
                          <div key={idx} className="text-sm flex items-center justify-between">
                            <span>{goal.playerName}</span>
                            <Badge variant="secondary">{goal.count}</Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {matchEventsSummary.assists.length > 0 && (
                    <div>
                      <h4 className="text-xs font-semibold mb-2">Assists</h4>
                      <div className="space-y-1">
                        {matchEventsSummary.assists.map((assist, idx) => (
                          <div key={idx} className="text-sm flex items-center justify-between">
                            <span>{assist.playerName}</span>
                            <Badge variant="secondary">{assist.count}</Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {matchEventsSummary.saves.length > 0 && (
                    <div>
                      <h4 className="text-xs font-semibold mb-2">Saves</h4>
                      <div className="space-y-1">
                        {matchEventsSummary.saves.map((save, idx) => (
                          <div key={idx} className="text-sm flex items-center justify-between">
                            <span>{save.playerName}</span>
                            <Badge variant="secondary">{save.count}</Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {matchEventsSummary.yellowCards.length > 0 && (
                    <div>
                      <h4 className="text-xs font-semibold mb-2 flex items-center gap-2">
                        <AlertCircle className="h-3 w-3 text-warning" />
                        Yellow Cards
                      </h4>
                      <div className="space-y-1">
                        {matchEventsSummary.yellowCards.map((card, idx) => (
                          <div key={idx} className="text-sm flex items-center justify-between">
                            <span>{card.playerName}</span>
                            <Badge variant="outline" className="bg-warning/10 text-warning">{card.count}</Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {matchEventsSummary.redCards.length > 0 && (
                    <div>
                      <h4 className="text-xs font-semibold mb-2 flex items-center gap-2">
                        <AlertCircle className="h-3 w-3 text-destructive" />
                        Red Cards
                      </h4>
                      <div className="space-y-1">
                        {matchEventsSummary.redCards.map((card, idx) => (
                          <div key={idx} className="text-sm flex items-center justify-between">
                            <span>{card.playerName}</span>
                            <Badge variant="destructive">{card.count}</Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {matchEventsSummary.goals.length === 0 && 
                   matchEventsSummary.assists.length === 0 && 
                   matchEventsSummary.saves.length === 0 &&
                   matchEventsSummary.yellowCards.length === 0 &&
                   matchEventsSummary.redCards.length === 0 && (
                    <p className="text-sm text-muted-foreground">No match events recorded</p>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Performance Analysis */}
            {renderPerformanceAnalysis()}

            {/* Player of the Match */}
            {potmPlayer && (
              <Card>
                <CardHeader className="p-4 sm:p-6 pb-2 sm:pb-4">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Trophy className="h-4 w-4 text-warning" />
                    Player of the Match
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 sm:p-6 pt-0">
                  <p className="text-base sm:text-lg font-semibold">{potmPlayer}</p>
                </CardContent>
              </Card>
            )}

            {/* Notes */}
            {(event.coach_notes || event.staff_notes) && (
              <Card>
                <CardHeader className="p-4 sm:p-6 pb-2 sm:pb-4">
                  <CardTitle className="text-sm">Notes</CardTitle>
                </CardHeader>
                <CardContent className="p-4 sm:p-6 pt-0 space-y-4">
                  {event.coach_notes && (
                    <div>
                      <h4 className="text-xs font-semibold mb-1">Coach Notes:</h4>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">{event.coach_notes}</p>
                    </div>
                  )}
                  {event.staff_notes && (
                    <div>
                      <h4 className="text-xs font-semibold mb-1">Staff Notes:</h4>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">{event.staff_notes}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};