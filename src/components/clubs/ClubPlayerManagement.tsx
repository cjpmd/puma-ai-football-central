
import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Users, Search, Calendar } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface Player {
  id: string;
  name: string;
  dateOfBirth: string;
  squadNumber: number;
  type: string;
  status: string;
  teamId: string;
  teamName: string;
  ageGroup: string;
  availability: string;
  matchStats: any;
}

interface ClubPlayerManagementProps {
  clubId: string;
  clubName: string;
}

export const ClubPlayerManagement: React.FC<ClubPlayerManagementProps> = ({
  clubId,
  clubName
}) => {
  const [players, setPlayers] = useState<Player[]>([]);
  const [filteredPlayers, setFilteredPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTeam, setSelectedTeam] = useState<string>('all');
  const [teamSummaries, setTeamSummaries] = useState<Record<string, any>>({});
  const { toast } = useToast();

  useEffect(() => {
    if (clubId) {
      loadClubPlayers();
    }
  }, [clubId]);

  useEffect(() => {
    filterPlayers();
  }, [players, searchTerm, selectedTeam]);

  const loadClubPlayers = async () => {
    try {
      setLoading(true);
      console.log('Loading players for club:', clubId);

      // Get all teams linked to this club
      const { data: clubTeams, error: clubTeamsError } = await supabase
        .from('club_teams')
        .select(`
          team_id,
          teams!inner(
            id,
            name,
            age_group
          )
        `)
        .eq('club_id', clubId);

      if (clubTeamsError) throw clubTeamsError;

      if (!clubTeams || clubTeams.length === 0) {
        setPlayers([]);
        return;
      }

      const teamIds = clubTeams.map(ct => ct.team_id);

      // Get all players from linked teams
      const { data: playersData, error: playersError } = await supabase
        .from('players')
        .select('*')
        .in('team_id', teamIds)
        .eq('status', 'active');

      if (playersError) throw playersError;

      // Transform data to include team information
      const playersWithTeams = playersData?.map(player => {
        const teamData = clubTeams.find(ct => ct.team_id === player.team_id)?.teams;
        return {
          id: player.id,
          name: player.name,
          dateOfBirth: player.date_of_birth,
          squadNumber: player.squad_number,
          type: player.type,
          status: player.status,
          teamId: player.team_id,
          teamName: teamData?.name || 'Unknown Team',
          ageGroup: teamData?.age_group || 'Unknown',
          availability: player.availability,
          matchStats: player.match_stats || {
            totalGames: 0,
            totalMinutes: 0,
            captainGames: 0,
            playerOfTheMatchCount: 0,
            minutesByPosition: {},
            recentGames: []
          }
        };
      }) || [];

      // Calculate team summaries
      const summaries = playersWithTeams.reduce((acc, player) => {
        const teamId = player.teamId;
        if (!acc[teamId]) {
          acc[teamId] = {
            teamName: player.teamName,
            ageGroup: player.ageGroup,
            totalPlayers: 0,
            goalkeepers: 0,
            outfieldPlayers: 0,
            availableCount: 0
          };
        }
        
        acc[teamId].totalPlayers++;
        if (player.type === 'goalkeeper') {
          acc[teamId].goalkeepers++;
        } else {
          acc[teamId].outfieldPlayers++;
        }
        if (player.availability === 'green') {
          acc[teamId].availableCount++;
        }
        
        return acc;
      }, {} as Record<string, any>);

      setPlayers(playersWithTeams);
      setTeamSummaries(summaries);
    } catch (error: any) {
      console.error('Error loading club players:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to load club players',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const filterPlayers = () => {
    let filtered = players;

    if (searchTerm) {
      filtered = filtered.filter(player =>
        player.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        player.squadNumber.toString().includes(searchTerm)
      );
    }

    if (selectedTeam !== 'all') {
      filtered = filtered.filter(player => player.teamId === selectedTeam);
    }

    setFilteredPlayers(filtered);
  };

  const getAvailabilityColor = (availability: string) => {
    switch (availability) {
      case 'green': return 'bg-green-500';
      case 'amber': return 'bg-yellow-500';
      case 'red': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const calculateAge = (dateOfBirth: string) => {
    const today = new Date();
    const birth = new Date(dateOfBirth);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p>Loading club players...</p>
        </div>
      </div>
    );
  }

  const teams = Array.from(new Set(players.map(p => ({ id: p.teamId, name: p.teamName }))))
    .filter((team, index, arr) => arr.findIndex(t => t.id === team.id) === index);

  return (
    <div className="space-y-4">
      {/* Team Summaries - Mobile Optimized */}
      <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {Object.values(teamSummaries).map((summary: any, index) => (
          <Card key={index}>
            <CardHeader className="pb-2 p-3 sm:p-4">
              <CardTitle className="text-sm font-medium truncate">{summary.teamName}</CardTitle>
              <CardDescription className="text-xs">{summary.ageGroup}</CardDescription>
            </CardHeader>
            <CardContent className="p-3 sm:p-4 pt-0">
              <div className="grid grid-cols-2 gap-2 text-xs sm:text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Players:</span>
                  <span className="font-semibold">{summary.totalPlayers}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Available:</span>
                  <span className="text-green-600 font-semibold">{summary.availableCount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">GK:</span>
                  <span>{summary.goalkeepers}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Outfield:</span>
                  <span>{summary.outfieldPlayers}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters - Mobile Optimized */}
      <Card>
        <CardHeader className="pb-2 p-3 sm:p-4">
          <CardTitle className="text-base sm:text-lg">Players - {clubName}</CardTitle>
          <CardDescription className="text-xs sm:text-sm">
            {filteredPlayers.length} players from {Object.keys(teamSummaries).length} teams
          </CardDescription>
        </CardHeader>
        <CardContent className="p-3 sm:p-4 pt-0">
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 mb-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search players..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={selectedTeam} onValueChange={setSelectedTeam}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Filter by team" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Teams</SelectItem>
                {teams.map((team) => (
                  <SelectItem key={team.id} value={team.id}>
                    {team.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Players List - Mobile Optimized Summary View */}
          {filteredPlayers.length === 0 ? (
            <div className="text-center py-6">
              <Users className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <h3 className="font-semibold mb-1 text-sm">No Players Found</h3>
              <p className="text-muted-foreground text-xs">
                {players.length === 0 
                  ? "No teams are linked to this club yet."
                  : "No players match your current filters."
                }
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredPlayers.map((player) => (
                <div 
                  key={player.id} 
                  className="flex items-center justify-between p-2 sm:p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                    <div className={`w-2 h-2 sm:w-3 sm:h-3 rounded-full flex-shrink-0 ${getAvailabilityColor(player.availability)}`} />
                    <span className="font-semibold text-sm sm:text-base flex-shrink-0">#{player.squadNumber}</span>
                    <div className="min-w-0 flex-1">
                      <h4 className="font-medium text-sm truncate">{player.name}</h4>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <span className="truncate">{player.teamName}</span>
                        <span>•</span>
                        <span className="flex-shrink-0">{calculateAge(player.dateOfBirth)}y</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right text-xs text-muted-foreground flex-shrink-0 ml-2">
                    <div>{player.matchStats?.totalGames || 0} games</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
