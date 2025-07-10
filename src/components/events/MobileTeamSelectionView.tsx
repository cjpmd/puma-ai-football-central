
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Users, Gamepad2, User, Star, X, ChevronLeft } from 'lucide-react';
import { DatabaseEvent } from '@/types/event';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';

interface MobileTeamSelectionViewProps {
  event: DatabaseEvent;
  teamId: string;
  onOpenFullManager: () => void;
  onClose?: () => void;
  isExpanded?: boolean;
}

interface TeamSelection {
  teamNumber: number;
  performanceCategory?: string;
  periods: any[];
  squadPlayers: number;
}

export const MobileTeamSelectionView: React.FC<MobileTeamSelectionViewProps> = ({
  event,
  teamId,
  onOpenFullManager,
  onClose,
  isExpanded = false
}) => {
  const [teamSelections, setTeamSelections] = useState<TeamSelection[]>([]);
  const [currentTeamIndex, setCurrentTeamIndex] = useState(0);

  // Load performance categories for display names
  const { data: performanceCategories = [] } = useQuery({
    queryKey: ['performance-categories', teamId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('performance_categories')
        .select('*')
        .eq('team_id', teamId)
        .order('name');
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!teamId,
  });

  // Load team selections
  useEffect(() => {
    const loadTeamSelections = async () => {
      try {
        const { data: selections, error } = await supabase
          .from('event_selections')
          .select(`
            *,
            performance_categories!inner(name)
          `)
          .eq('event_id', event.id)
          .eq('team_id', teamId)
          .order('team_number', { ascending: true })
          .order('period_number', { ascending: true });

        if (error) throw error;

        // Group by team number
        const groupedSelections = selections?.reduce((acc, selection) => {
          const teamNum = selection.team_number || 1;
          if (!acc[teamNum]) {
            acc[teamNum] = {
              teamNumber: teamNum,
              performanceCategory: selection.performance_categories?.name || 'No category',
              periods: [],
              squadPlayers: 0
            };
          }
          acc[teamNum].periods.push(selection);
          return acc;
        }, {} as Record<number, TeamSelection>) || {};

        // Count unique squad players per team
        Object.values(groupedSelections).forEach(team => {
          const allPlayerIds = new Set();
          team.periods.forEach(period => {
            if (period.player_positions) {
              period.player_positions.forEach((pos: any) => {
                if (pos.playerId) allPlayerIds.add(pos.playerId);
              });
            }
            if (period.substitute_players) {
              period.substitute_players.forEach((playerId: string) => {
                allPlayerIds.add(playerId);
              });
            }
          });
          team.squadPlayers = allPlayerIds.size;
        });

        setTeamSelections(Object.values(groupedSelections));
      } catch (error) {
        console.error('Error loading team selections:', error);
      }
    };

    loadTeamSelections();
  }, [event.id, teamId]);

  const currentTeam = teamSelections[currentTeamIndex];

  if (teamSelections.length === 0) {
    return (
      <div className="w-full">
        {isExpanded && onClose && (
          <div className="flex items-center justify-between mb-3">
            <Button variant="ghost" size="sm" onClick={onClose}>
              <ChevronLeft className="h-4 w-4 mr-1" />
              Back
            </Button>
          </div>
        )}
        <Card className="w-full">
          <CardContent className="py-6 text-center">
            <Users className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
            <h3 className="font-medium mb-2">No Team Selection</h3>
            <p className="text-sm text-muted-foreground mb-4">
              No squad has been selected for this event yet.
            </p>
            <Button onClick={onOpenFullManager} size="sm" className="w-full">
              Set Up Team
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="w-full space-y-3">
      {/* Header with close button for expanded view */}
      {isExpanded && onClose && (
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={onClose}>
            <ChevronLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
          <h3 className="font-medium">Team Selection</h3>
          <div className="w-16" /> {/* Spacer for center alignment */}
        </div>
      )}

      {/* Team Tabs - Compact version for mobile */}
      {teamSelections.length > 1 && (
        <div className="flex gap-1 overflow-x-auto pb-2">
          {teamSelections.map((team, index) => (
            <Button
              key={team.teamNumber}
              variant={index === currentTeamIndex ? 'default' : 'outline'}
              size="sm"
              onClick={() => setCurrentTeamIndex(index)}
              className="flex-shrink-0 text-xs px-2 py-1"
            >
              Team {team.teamNumber}
            </Button>
          ))}
        </div>
      )}

      {currentTeam && (
        <Card className="w-full">
          <CardHeader className="pb-2 px-3 pt-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Team {currentTeam.teamNumber}</CardTitle>
              {!isExpanded && (
                <Button variant="outline" size="sm" onClick={onOpenFullManager} className="text-xs px-2 py-1">
                  Edit
                </Button>
              )}
            </div>
            <div className="flex gap-1 flex-wrap">
              <Badge variant="outline" className="text-xs">
                <Users className="h-3 w-3 mr-1" />
                {currentTeam.squadPlayers} players
              </Badge>
              <Badge variant="outline" className="text-xs">
                <Gamepad2 className="h-3 w-3 mr-1" />
                {currentTeam.periods.length} period{currentTeam.periods.length !== 1 ? 's' : ''}
              </Badge>
              {currentTeam.performanceCategory !== 'No category' && (
                <Badge variant="secondary" className="text-xs">
                  {currentTeam.performanceCategory}
                </Badge>
              )}
            </div>
          </CardHeader>

          <CardContent className="space-y-3 px-3 pb-3">
            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="grid w-full grid-cols-2 h-8">
                <TabsTrigger value="overview" className="text-xs">Overview</TabsTrigger>
                <TabsTrigger value="periods" className="text-xs">Periods</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-3 mt-3">
                <div className="text-sm">
                  <h4 className="font-medium mb-2 text-sm">Formation Summary</h4>
                  {currentTeam.periods.length > 0 ? (
                    <div className="space-y-2">
                      {currentTeam.periods.map((period, index) => (
                        <div key={index} className="flex justify-between items-center py-2 px-2 bg-muted/50 rounded text-xs">
                          <span className="font-medium">Period {period.period_number}</span>
                          <div className="flex items-center gap-2 text-xs">
                            <span>{period.formation}</span>
                            <span>•</span>
                            <span>{period.duration_minutes}min</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-xs">No periods configured</p>
                  )}
                </div>

                {currentTeam.periods[0]?.captain_id && (
                  <div className="text-sm">
                    <h4 className="font-medium mb-2 flex items-center gap-1 text-sm">
                      <Star className="h-3 w-3" />
                      Captain Selected
                    </h4>
                    <p className="text-muted-foreground text-xs">Team captain has been assigned</p>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="periods" className="space-y-2 mt-3">
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {currentTeam.periods.map((period, index) => (
                    <Card key={index} className="w-full">
                      <CardContent className="p-2">
                        <div className="flex justify-between items-start mb-2">
                          <h5 className="font-medium text-xs">Period {period.period_number}</h5>
                          <Badge variant="outline" className="text-xs">
                            {period.formation}
                          </Badge>
                        </div>
                        
                        <div className="text-xs text-muted-foreground space-y-1">
                          <div className="flex justify-between">
                            <span>Duration:</span>
                            <span>{period.duration_minutes} minutes</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Starting XI:</span>
                            <span>{period.player_positions?.length || 0} players</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Substitutes:</span>
                            <span>{period.substitute_players?.length || 0} players</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>
            </Tabs>

            <Button 
              onClick={onOpenFullManager} 
              className="w-full"
              variant="outline"
              size="sm"
            >
              <Gamepad2 className="h-4 w-4 mr-2" />
              Open Team Manager
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
