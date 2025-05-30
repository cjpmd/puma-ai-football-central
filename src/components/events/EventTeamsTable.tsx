import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { TeamSelectionManager } from './TeamSelectionManager';
import { GameFormat } from '@/types';
import { DatabaseEvent } from '@/types/event';

interface EventTeamsTableProps {
  eventId: string;
  primaryTeamId: string;
  gameFormat: string;
}

interface Team {
  id: string;
  name: string;
}

export const EventTeamsTable: React.FC<EventTeamsTableProps> = ({ 
  eventId, 
  primaryTeamId,
  gameFormat
}) => {
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTeam, setActiveTeam] = useState<string>(primaryTeamId);
  const { teams: userTeams } = useAuth();

  useEffect(() => {
    loadEventTeams();
  }, [eventId, primaryTeamId]);

  const loadEventTeams = async () => {
    try {
      // First check if there are multiple teams in the event_teams table
      const { data: eventTeamsData, error: eventTeamsError } = await supabase
        .from('event_teams')
        .select('team_id')
        .eq('event_id', eventId);

      if (eventTeamsError) throw eventTeamsError;
      
      // If there are teams in event_teams, use those
      if (eventTeamsData && eventTeamsData.length > 0) {
        const teamIds = eventTeamsData.map(et => et.team_id);
        
        // Filter user teams to only include teams in the event
        const eventTeams = userTeams.filter(team => teamIds.includes(team.id));
        setTeams(eventTeams.map(team => ({ id: team.id, name: team.name })));
      } else {
        // Otherwise, just use the primary team
        const primaryTeam = userTeams.find(t => t.id === primaryTeamId);
        if (primaryTeam) {
          setTeams([{ id: primaryTeam.id, name: primaryTeam.name }]);
        }
      }
      
      setLoading(false);
    } catch (error) {
      console.error('Error loading event teams:', error);
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-center py-4">Loading teams...</div>;
  }

  if (teams.length === 0) {
    return <div className="text-center py-4">No teams found for this event.</div>;
  }

  return (
    <div className="h-[75vh] max-h-[700px] flex flex-col">
      <Card className="flex-1 flex flex-col min-h-0">
        <CardHeader className="flex-shrink-0 pb-3">
          <CardTitle className="text-base">Team Selection</CardTitle>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col min-h-0 p-3">
          <Tabs value={activeTeam} onValueChange={setActiveTeam} className="flex-1 flex flex-col min-h-0">
            <TabsList className="mb-2 flex-shrink-0 grid w-full" style={{ gridTemplateColumns: `repeat(${teams.length}, 1fr)` }}>
              {teams.map(team => (
                <TabsTrigger key={team.id} value={team.id} className="text-xs py-1">
                  {team.name}
                </TabsTrigger>
              ))}
            </TabsList>

            <div className="flex-1 min-h-0 overflow-hidden">
              {teams.map(team => (
                <TabsContent key={team.id} value={team.id} className="h-full mt-0 data-[state=active]:flex data-[state=active]:flex-col">
                  <ScrollArea className="flex-1 pr-2">
                    <TeamSelectionManager 
                      event={{ id: eventId, team_id: team.id, game_format: gameFormat } as DatabaseEvent}
                      isOpen={true}
                      onClose={() => {}}
                    />
                  </ScrollArea>
                </TabsContent>
              ))}
            </div>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};
