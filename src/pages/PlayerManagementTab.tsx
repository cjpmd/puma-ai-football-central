
import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  Users, 
  Plus, 
  Search, 
  Edit
} from 'lucide-react';
import { Team } from '@/types/team';

// Define types and interfaces
interface Player {
  id: string;
  name: string;
  date_of_birth: string;
  type: string;
  squad_number?: number;
  availability: string;
  subscription_type: string;
  status: string;
  team_id: string;
  photo_url?: string;
  created_at: string;
  updated_at: string;
}

interface TransformedPlayer {
  id: string;
  name: string;
  dateOfBirth: string;
  position: string;
  jerseyNumber?: number;
  email?: string;
  phone?: string;
  address?: string;
  emergencyContact?: string;
  medicalInfo?: string;
  profileImage?: string;
  subscriptionType: 'full_squad' | 'training_only' | 'trialist';
  joinDate: string;
  leaveDate?: string;
  status: 'active' | 'inactive' | 'on_leave';
  teamId: string;
  parentId?: string;
  attributes?: Record<string, any>;
  comments?: string;
  objectives?: string[];
  kitSizes?: Record<string, string>;
  stats?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

const PlayerManagementTab = () => {
  const { teams } = useAuth();
  const [selectedTeamId, setSelectedTeamId] = useState<string>(teams[0]?.id || '');
  const [players, setPlayers] = useState<TransformedPlayer[]>([]);
  const [isPlayerDialogOpen, setIsPlayerDialogOpen] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState<TransformedPlayer | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterPosition, setFilterPosition] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const selectedTeam = teams.find(team => team.id === selectedTeamId);

  useEffect(() => {
    if (selectedTeamId) {
      fetchPlayers(selectedTeamId);
    }
  }, [selectedTeamId]);

  const handleTeamChange = (teamId: string) => {
    setSelectedTeamId(teamId);
  };

  const fetchPlayers = async (teamId: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('players')
        .select('*')
        .eq('team_id', teamId);

      if (error) {
        console.error('Error fetching players:', error);
        toast({
          title: 'Error fetching players',
          description: error.message,
          variant: 'destructive',
        });
      } else {
        // Transform database players to match our interface
        const transformedPlayers: TransformedPlayer[] = (data || []).map((player: any) => ({
          id: player.id,
          name: player.name,
          dateOfBirth: player.date_of_birth,
          position: player.type || 'outfield',
          jerseyNumber: player.squad_number,
          subscriptionType: player.subscription_type as 'full_squad' | 'training_only' | 'trialist',
          joinDate: player.created_at,
          status: player.status as 'active' | 'inactive' | 'on_leave',
          teamId: player.team_id,
          profileImage: player.photo_url,
          createdAt: player.created_at,
          updatedAt: player.updated_at
        }));
        setPlayers(transformedPlayers);
      }
    } catch (error) {
      console.error('Error fetching players:', error);
      toast({
        title: 'Error fetching players',
        description: 'Failed to load players. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const positions = [
    'Goalkeeper', 'Defender', 'Midfielder', 'Forward',
    'Centre-back', 'Full-back', 'Wing-back', 'Defensive Midfielder',
    'Central Midfielder', 'Attacking Midfielder', 'Winger', 'Striker'
  ];

  const filteredPlayers = players.filter((player) => {
    const searchTermLower = searchTerm.toLowerCase();
    const matchesSearch =
      player.name.toLowerCase().includes(searchTermLower) ||
      player.position.toLowerCase().includes(searchTermLower);

    const matchesPosition =
      filterPosition === 'all' || player.position.toLowerCase() === filterPosition;

    const matchesStatus =
      filterStatus === 'all' || player.status === filterStatus;

    return matchesSearch && matchesPosition && matchesStatus;
  });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Player Management</h1>
            <p className="text-muted-foreground">
              Manage your squad and player information
            </p>
          </div>

          {teams.length > 1 && (
            <div className="min-w-[250px]">
              <Select value={selectedTeamId} onValueChange={setSelectedTeamId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select team" />
                </SelectTrigger>
                <SelectContent>
                  {teams.map((team) => (
                    <SelectItem key={team.id} value={team.id}>
                      {team.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        {teams.length === 0 ? (
          <Card className="border-dashed border-2 border-muted">
            <CardContent className="py-8 flex flex-col items-center justify-center text-center">
              <div className="rounded-full bg-muted p-3 mb-4">
                <Users className="h-6 w-6 text-muted-foreground" />
              </div>
              <h3 className="font-semibold text-lg mb-1">No Teams Yet</h3>
              <p className="text-muted-foreground mb-4 max-w-md">
                You need to create a team first before you can manage players.
              </p>
              <Button
                onClick={() => window.location.href = '/teams'}
                className="bg-puma-blue-500 hover:bg-puma-blue-600"
              >
                Create Team
              </Button>
            </CardContent>
          </Card>
        ) : selectedTeam ? (
          <div className="space-y-6">
            {/* Team Header */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 flex items-center justify-center rounded-lg bg-muted">
                      {selectedTeam.logoUrl ? (
                        <img
                          src={selectedTeam.logoUrl}
                          alt={`${selectedTeam.name} logo`}
                          className="w-10 h-10 object-contain rounded"
                        />
                      ) : (
                        <Users className="h-6 w-6 text-muted-foreground" />
                      )}
                    </div>
                    <div>
                      <CardTitle>{selectedTeam.name}</CardTitle>
                      <CardDescription>
                        {selectedTeam.ageGroup} • {selectedTeam.gameFormat} • {players.length} players
                      </CardDescription>
                    </div>
                  </div>
                  <Dialog open={isPlayerDialogOpen} onOpenChange={setIsPlayerDialogOpen}>
                    <DialogTrigger asChild>
                      <Button 
                        onClick={() => setSelectedPlayer(null)}
                        className="bg-puma-blue-500 hover:bg-puma-blue-600"
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        Add Player
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[500px]">
                      <DialogHeader>
                        <DialogTitle>
                          {selectedPlayer ? 'Edit Player' : 'Add New Player'}
                        </DialogTitle>
                        <DialogDescription>
                          {selectedPlayer
                            ? 'Update player information and settings.'
                            : 'Add a new player to your team squad.'}
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <p className="text-sm text-muted-foreground">
                          Player form implementation would go here.
                        </p>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
            </Card>

            {/* Search and Filters */}
            <Card>
              <CardContent className="p-6">
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex-1">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search players..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>
                  <Select value={filterPosition} onValueChange={setFilterPosition}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Position" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Positions</SelectItem>
                      {positions.map((position) => (
                        <SelectItem key={position} value={position.toLowerCase()}>
                          {position}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                      <SelectItem value="on_leave">On Leave</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Players Grid */}
            {players.length === 0 ? (
              <Card className="border-dashed border-2 border-muted">
                <CardContent className="py-8 flex flex-col items-center justify-center text-center">
                  <div className="rounded-full bg-muted p-3 mb-4">
                    <Users className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <h3 className="font-semibold text-lg mb-1">No Players Yet</h3>
                  <p className="text-muted-foreground mb-4 max-w-md">
                    Start building your squad by adding your first player.
                  </p>
                  <Button
                    onClick={() => setIsPlayerDialogOpen(true)}
                    className="bg-puma-blue-500 hover:bg-puma-blue-600"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add First Player
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {filteredPlayers.map((player) => (
                  <Card key={player.id} className="hover:shadow-lg transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={player.profileImage} alt={player.name} />
                            <AvatarFallback>
                              {player.name.split(' ').map(n => n[0]).join('')}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <CardTitle className="text-lg">{player.name}</CardTitle>
                            <CardDescription>
                              {player.position}
                              {player.jerseyNumber && ` • #${player.jerseyNumber}`}
                            </CardDescription>
                          </div>
                        </div>
                        <Badge variant={player.status === 'active' ? 'default' : 'secondary'}>
                          {player.status}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Subscription:</span>
                          <span className="capitalize">
                            {player.subscriptionType.replace('_', ' ')}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Joined:</span>
                          <span>{new Date(player.joinDate).toLocaleDateString()}</span>
                        </div>
                      </div>
                      <div className="flex gap-2 mt-4">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedPlayer(player);
                            setIsPlayerDialogOpen(true);
                          }}
                          className="flex-1"
                        >
                          <Edit className="mr-2 h-4 w-4" />
                          Edit
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1"
                        >
                          View
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-8">
            Please select a team to manage players.
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default PlayerManagementTab;
