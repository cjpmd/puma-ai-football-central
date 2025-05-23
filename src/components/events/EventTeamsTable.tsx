
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TeamSelectionManager } from './TeamSelectionManager';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

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
  const [isTeamSelectionOpen, setIsTeamSelectionOpen] = useState(false);
  const [selectedTeamId, setSelectedTeamId] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    loadEventTeams();
  }, [eventId]);

  const loadEventTeams = async () => {
    try {
      // First get the teams from the event_teams table
      const { data: eventTeams, error: eventTeamsError } = await supabase
        .from('event_teams')
        .select('team_id')
        .eq('event_id', eventId);

      if (eventTeamsError) throw eventTeamsError;

      // If no event teams are stored yet, use the primary team
      if (!eventTeams || eventTeams.length === 0) {
        const { data: teamData, error: teamError } = await supabase
          .from('teams')
          .select('id, name')
          .eq('id', primaryTeamId)
          .single();
          
        if (teamError) throw teamError;
        
        setTeams([teamData]);
      } else {
        // Get all teams info
        const teamIds = eventTeams.map(team => team.team_id);
        const { data: teamsData, error: teamsError } = await supabase
          .from('teams')
          .select('id, name')
          .in('id', teamIds);
          
        if (teamsError) throw teamsError;
        
        setTeams(teamsData || []);
      }
      
      setLoading(false);
    } catch (error) {
      console.error('Error loading event teams:', error);
      toast({
        title: 'Error',
        description: 'Failed to load event teams',
        variant: 'destructive',
      });
      setLoading(false);
    }
  };

  const openTeamSelection = (teamId: string) => {
    setSelectedTeamId(teamId);
    setIsTeamSelectionOpen(true);
  };

  if (loading) {
    return <div className="text-center py-4">Loading teams...</div>;
  }

  return (
    <div className="space-y-4">
      {!isTeamSelectionOpen ? (
        <Card>
          <CardHeader>
            <CardTitle>Teams</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {teams.length === 0 ? (
                <p>No teams have been added to this event.</p>
              ) : (
                teams.map(team => (
                  <div key={team.id} className="flex items-center justify-between p-3 bg-background border rounded-md">
                    <div className="flex items-center space-x-2">
                      <Badge variant="outline">{team.id === primaryTeamId ? 'Primary' : 'Secondary'}</Badge>
                      <span>{team.name}</span>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => openTeamSelection(team.id)}
                    >
                      Manage Team Selection
                    </Button>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          <Button variant="outline" onClick={() => setIsTeamSelectionOpen(false)}>
            &larr; Back to Teams
          </Button>
          <TeamSelectionManager 
            eventId={eventId} 
            teamId={selectedTeamId} 
            gameFormat={gameFormat} 
          />
        </div>
      )}
    </div>
  );
};
