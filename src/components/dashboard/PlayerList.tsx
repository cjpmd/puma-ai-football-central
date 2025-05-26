
import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';

interface Player {
  id: string;
  name: string;
  squad_number: number;
  type: string;
  availability: string;
  team_name: string;
}

export function PlayerList() {
  const { teams } = useAuth();
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    if (teams.length > 0) {
      loadPlayers();
    }
  }, [teams]);

  const loadPlayers = async () => {
    try {
      const teamIds = teams.map(t => t.id);
      
      const { data: playersData, error } = await supabase
        .from('players')
        .select('id, name, squad_number, type, availability, team_id')
        .in('team_id', teamIds)
        .eq('status', 'active')
        .order('squad_number', { ascending: true })
        .limit(10);

      if (error) {
        console.error('Error loading players:', error);
        setPlayers([]);
        return;
      }

      const playersWithTeams = (playersData || []).map(player => {
        const team = teams.find(t => t.id === player.team_id);
        return {
          ...player,
          team_name: team?.name || 'Unknown Team'
        };
      });

      setPlayers(playersWithTeams);
    } catch (error) {
      console.error('Error in loadPlayers:', error);
      setPlayers([]);
    } finally {
      setLoading(false);
    }
  };

  const getAvailabilityColor = (availability: string) => {
    switch (availability) {
      case 'green':
        return 'bg-green-500';
      case 'amber':
        return 'bg-yellow-500';
      case 'red':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const handleViewSquad = () => {
    navigate('/players');
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold tracking-tight">Squad Players</h2>
        </div>
        <div className="text-center py-8">Loading players...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight">Squad Players</h2>
        <Button size="sm" onClick={handleViewSquad}>
          View Squad
        </Button>
      </div>
      
      <div className="grid gap-4">
        {players.map((player) => (
          <Card key={player.id} className="hover:shadow-md transition-shadow">
            <CardHeader>
              <CardTitle className="text-lg">{player.name}</CardTitle>
              <CardDescription>#{player.squad_number} • {player.team_name}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Type</p>
                  <p className="text-sm">{player.type}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Availability</p>
                  <Badge className={getAvailabilityColor(player.availability)}>
                    {player.availability.charAt(0).toUpperCase() + player.availability.slice(1)}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
