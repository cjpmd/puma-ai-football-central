
import { useState, useEffect } from 'react';
import { MobileLayout } from '@/components/layout/MobileLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Search, Plus, Settings, Users, Trophy, Calendar } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useClubContext } from '@/contexts/ClubContext';

interface Team {
  id: string;
  name: string;
  age_group: string;
  logo_url?: string;
  player_count: number;
  upcoming_events: number;
  season_start?: string;
  season_end?: string;
}

export default function TeamManagementMobile() {
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { user } = useAuth();
  const { filteredTeams: clubTeams } = useClubContext();
  const [teamsData, setTeamsData] = useState<Team[]>([]);

  useEffect(() => {
    loadTeamsData();
  }, [clubTeams]);

  const loadTeamsData = async () => {
    try {
      if (!clubTeams || clubTeams.length === 0) {
        setTeamsData([]);
        setLoading(false);
        return;
      }
      
      const teamIds = clubTeams.map(t => t.id);
      
      const { data, error } = await supabase
        .from('teams')
        .select(`
          id,
          name,
          age_group,
          logo_url,
          season_start,
          season_end,
          players(count)
        `)
        .in('id', teamIds)
        .order('name');

      if (error) throw error;
      
      const transformedTeams: Team[] = (data || []).map((team: any) => ({
        id: team.id,
        name: team.name,
        age_group: team.age_group || 'Unknown',
        logo_url: team.logo_url,
        player_count: team.players?.[0]?.count || 0,
        upcoming_events: 0, // TODO: Calculate from events
        season_start: team.season_start,
        season_end: team.season_end
      }));
      
      setTeamsData(transformedTeams);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to load teams',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredTeams = teamsData.filter(team =>
    team.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    team.age_group.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  return (
    <MobileLayout>
      <div className="space-y-4">
        {/* Search and Actions */}
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search teams..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 h-12"
            />
          </div>
          <Button size="sm" className="h-12 px-3">
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        {/* Teams List */}
        <div className="space-y-3">
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
              <p className="mt-2 text-sm text-muted-foreground">Loading teams...</p>
            </div>
          ) : filteredTeams.length === 0 ? (
            <div className="text-center py-8">
              <Trophy className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No teams found</p>
            </div>
          ) : (
            filteredTeams.map((team) => (
              <Card key={team.id} className="touch-manipulation">
                <CardContent className="p-4">
                  <div className="flex items-center space-x-4">
                    <Avatar className="h-12 w-12">
                      {team.logo_url ? (
                        <AvatarImage src={team.logo_url} alt={team.name} />
                      ) : (
                        <AvatarFallback className="text-lg font-medium">
                          {getInitials(team.name)}
                        </AvatarFallback>
                      )}
                    </Avatar>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h3 className="font-medium text-lg truncate">{team.name}</h3>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <Settings className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="flex items-center space-x-2 mt-1">
                        <Badge variant="outline" className="text-xs">
                          {team.age_group}
                        </Badge>
                        <div className="flex items-center text-sm text-muted-foreground">
                          <Users className="h-3 w-3 mr-1" />
                          <span>{team.player_count} players</span>
                        </div>
                        <div className="flex items-center text-sm text-muted-foreground">
                          <Calendar className="h-3 w-3 mr-1" />
                          <span>{team.upcoming_events} events</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </MobileLayout>
  );
}
