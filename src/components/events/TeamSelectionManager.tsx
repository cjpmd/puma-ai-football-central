
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Plus } from 'lucide-react';
import { GameFormat } from '@/types';
import { PlayerSelectionPanel } from './PlayerSelectionPanel';

interface TeamSelectionManagerProps {
  eventId: string;
  teamId: string;
  gameFormat: string;
}

export const TeamSelectionManager: React.FC<TeamSelectionManagerProps> = ({
  eventId,
  teamId,
  gameFormat
}) => {
  const [loading, setLoading] = useState(true);
  const [activeTeamTab, setActiveTeamTab] = useState('team-1');
  const [activePeriodTab, setActivePeriodTab] = useState('period-1');
  const [periods, setPeriods] = useState<{ [key: string]: number }>({ 'team-1': 1 });
  const [totalTeams, setTotalTeams] = useState(1);
  const { toast } = useToast();

  useEffect(() => {
    loadEventTeams();
    loadExistingTeamSelections();
  }, [eventId, teamId]);

  const loadEventTeams = async () => {
    try {
      // Check if this event has multiple teams configured
      const { data: eventTeams, error } = await supabase
        .from('event_teams')
        .select('team_number')
        .eq('event_id', eventId)
        .eq('team_id', teamId);

      if (error) throw error;

      if (eventTeams && eventTeams.length > 0) {
        const maxTeamNumber = Math.max(...eventTeams.map(et => et.team_number));
        setTotalTeams(maxTeamNumber);
        
        // Initialize periods for all teams
        const initialPeriods: { [key: string]: number } = {};
        for (let i = 1; i <= maxTeamNumber; i++) {
          initialPeriods[`team-${i}`] = 1;
        }
        setPeriods(initialPeriods);
      } else {
        // Default single team
        setTotalTeams(1);
        setPeriods({ 'team-1': 1 });
      }
    } catch (error) {
      console.error('Error loading event teams:', error);
      setTotalTeams(1);
      setPeriods({ 'team-1': 1 });
    }
  };

  const loadExistingTeamSelections = async () => {
    try {
      const { data, error } = await supabase
        .from('event_selections')
        .select('team_number, period_number')
        .eq('event_id', eventId)
        .eq('team_id', teamId);

      if (error) throw error;

      if (data && data.length > 0) {
        const periodCounts: { [key: string]: number } = {};
        
        data.forEach(selection => {
          const teamNumber = selection.team_number || 1;
          const teamKey = `team-${teamNumber}`;
          const periodNumber = selection.period_number;
          
          if (!periodCounts[teamKey] || periodNumber > periodCounts[teamKey]) {
            periodCounts[teamKey] = periodNumber;
          }
        });
        
        setPeriods(periodCounts);
        
        // Update total teams if we found more teams in selections
        const maxTeamFromSelections = Math.max(...Object.keys(periodCounts).map(key => 
          parseInt(key.replace('team-', ''))
        ));
        if (maxTeamFromSelections > totalTeams) {
          setTotalTeams(maxTeamFromSelections);
        }
      }
      
      setLoading(false);
    } catch (error) {
      console.error('Error loading team selections:', error);
      setLoading(false);
    }
  };

  const handleAddPeriod = (teamNumber: string) => {
    const currentPeriods = periods[teamNumber] || 0;
    const newPeriodNumber = currentPeriods + 1;
    
    setPeriods({
      ...periods,
      [teamNumber]: newPeriodNumber
    });
    
    setActivePeriodTab(`period-${newPeriodNumber}`);
  };

  const addTeam = () => {
    const teamNumbers = Object.keys(periods)
      .map(key => parseInt(key.replace('team-', '')))
      .sort((a, b) => a - b);
    
    const nextTeamNumber = teamNumbers.length > 0 ? teamNumbers[teamNumbers.length - 1] + 1 : 1;
    const newTeamKey = `team-${nextTeamNumber}`;
    
    setPeriods({
      ...periods,
      [newTeamKey]: 1
    });
    
    setTotalTeams(nextTeamNumber);
    setActiveTeamTab(newTeamKey);
    setActivePeriodTab('period-1');
  };

  if (loading) {
    return <div className="text-center py-8">Loading team selection...</div>;
  }

  return (
    <div className="space-y-3">
      <Card className="min-h-0">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Team Configuration</CardTitle>
            <Button onClick={addTeam} variant="outline" size="sm">
              <Plus className="h-3 w-3 mr-1" /> Add Team
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-0 pb-3">
          <Tabs value={activeTeamTab} onValueChange={setActiveTeamTab} className="w-full">
            <TabsList className="grid w-full mb-3" style={{ gridTemplateColumns: `repeat(${Object.keys(periods).length}, 1fr)` }}>
              {Object.keys(periods).sort().map((teamKey) => (
                <TabsTrigger key={teamKey} value={teamKey} className="text-sm">
                  Team {teamKey.replace('team-', '')}
                </TabsTrigger>
              ))}
            </TabsList>
            
            {Object.keys(periods).sort().map((teamKey) => (
              <TabsContent key={teamKey} value={teamKey} className="mt-0">
                <Tabs value={activePeriodTab} onValueChange={setActivePeriodTab}>
                  <div className="flex items-center justify-between mb-3">
                    <TabsList className="flex-1 grid" style={{ gridTemplateColumns: `repeat(${periods[teamKey] || 1}, 1fr)` }}>
                      {Array.from({ length: periods[teamKey] || 1 }, (_, i) => (
                        <TabsTrigger key={i} value={`period-${i + 1}`} className="text-sm">
                          Period {i + 1}
                        </TabsTrigger>
                      ))}
                    </TabsList>
                    
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => handleAddPeriod(teamKey)}
                      className="ml-2"
                    >
                      <Plus className="h-3 w-3 mr-1" /> Add Period
                    </Button>
                  </div>
                  
                  {Array.from({ length: periods[teamKey] || 1 }, (_, i) => (
                    <TabsContent key={i} value={`period-${i + 1}`} className="mt-0">
                      <PlayerSelectionPanel
                        eventId={eventId}
                        teamId={teamId}
                        gameFormat={gameFormat}
                        periodNumber={i + 1}
                        teamNumber={parseInt(teamKey.replace('team-', ''))}
                        totalTeams={totalTeams}
                      />
                    </TabsContent>
                  ))}
                </Tabs>
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};
