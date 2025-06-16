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
  onClose?: () => void;
}

interface Team {
  id: string;
  name: string;
}

export const EventTeamsTable: React.FC<EventTeamsTableProps> = ({ 
  eventId, 
  primaryTeamId,
  gameFormat,
  onClose
}) => {
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTeam, setActiveTeam] = useState<string>(primaryTeamId);
  const [event, setEvent] = useState<DatabaseEvent | null>(null);
  const { teams: userTeams } = useAuth();

  useEffect(() => {
    loadEventAndTeams();
  }, [eventId, primaryTeamId]);

  const loadEventAndTeams = async () => {
    try {
      // Load the event first
      const { data: eventData, error: eventError } = await supabase
        .from('events')
        .select('*')
        .eq('id', eventId)
        .single();

      if (eventError) throw eventError;
      setEvent(eventData as DatabaseEvent);

      // Then check if there are multiple teams in the event_teams table
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
      console.error('Error loading event and teams:', error);
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-center py-4">Loading teams...</div>;
  }

  if (teams.length === 0) {
    return <div className="text-center py-4">No teams found for this event.</div>;
  }

  if (!event) {
    return <div className="text-center py-4">Event not found.</div>;
  }

  return (
    <div className="h-[75vh] max-h-[700px] flex flex-col">
      <Card className="flex-1 overflow-hidden">
        <CardHeader className="flex-shrink-0">
          <CardTitle>Team Selection</CardTitle>
        </CardHeader>
        <CardContent className="flex-1 overflow-hidden p-0">
          <TeamSelectionManager
            eventId={eventId}
            team={{ id: primaryTeamId, name: teams[0]?.name || 'Team', team_number: 1 }}
            periods={[{ id: '1', period_number: 1, duration_minutes: event.game_duration || 90 }]}
            gameFormat={gameFormat as GameFormat}
            eventType={event.event_type}
            isOpen={true}
            onClose={onClose || (() => {})}
          />
        </CardContent>
      </Card>
    </div>
  );
};
