
import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { PlusCircle, Users, Settings, UserPlus } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { PlayerForm } from '@/components/players/PlayerForm';
import { Player } from '@/types';
import { useToast } from '@/hooks/use-toast';

const PlayerManagement = () => {
  const { teams } = useAuth();
  const [isPlayerDialogOpen, setIsPlayerDialogOpen] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [selectedTeamId, setSelectedTeamId] = useState<string>('');
  const { toast } = useToast();

  // Mock players data - in real app this would come from database
  const mockPlayers: Player[] = [
    {
      id: "1",
      name: "Jack Smith",
      type: "outfield",
      squadNumber: 7,
      availability: "green",
      subscriptionStatus: "active",
      subscriptionType: "full_squad",
      dateOfBirth: "2010-03-15",
      teamId: teams[0]?.id || '',
      attributes: [],
      objectives: [],
      comments: [],
      matchStats: {
        totalGames: 15,
        captainGames: 3,
        playerOfTheMatchCount: 2,
        totalMinutes: 1200,
        minutesByPosition: {} as any,
        recentGames: []
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  ];

  const handleCreatePlayer = async (playerData: Partial<Player>) => {
    try {
      // In real app, this would create player in database
      console.log('Creating player:', playerData);
      setIsPlayerDialogOpen(false);
      toast({
        title: 'Player Added',
        description: `${playerData.name} has been successfully added to the squad.`,
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to add player',
        variant: 'destructive',
      });
    }
  };

  const getAvailabilityColor = (availability: string) => {
    switch (availability) {
      case 'green': return 'bg-green-500';
      case 'amber': return 'bg-yellow-500';
      case 'red': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getAvailabilityText = (availability: string) => {
    switch (availability) {
      case 'green': return 'Available';
      case 'amber': return 'Uncertain';
      case 'red': return 'Unavailable';
      default: return 'Unknown';
    }
  };

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
          {teams.length > 0 && (
            <Dialog open={isPlayerDialogOpen} onOpenChange={setIsPlayerDialogOpen}>
              <DialogTrigger asChild>
                <Button 
                  onClick={() => {
                    setSelectedPlayer(null);
                    setSelectedTeamId(teams[0]?.id || '');
                  }} 
                  className="bg-puma-blue-500 hover:bg-puma-blue-600"
                >
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Add Player
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                  <DialogTitle>Add New Player</DialogTitle>
                  <DialogDescription>
                    Add a new player to your squad.
                  </DialogDescription>
                </DialogHeader>
                <PlayerForm 
                  player={selectedPlayer} 
                  teamId={selectedTeamId}
                  onSubmit={handleCreatePlayer} 
                  onCancel={() => setIsPlayerDialogOpen(false)}
                />
              </DialogContent>
            </Dialog>
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
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {teams.map((team) => (
              <div key={team.id} className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold">{team.name}</h2>
                  <Badge variant="outline">{team.gameFormat}</Badge>
                </div>
                
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {mockPlayers
                    .filter(player => player.teamId === team.id)
                    .map((player) => (
                    <Card key={player.id} className="relative">
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-lg">{player.name}</CardTitle>
                          <div className="flex items-center gap-2">
                            <div className={`w-3 h-3 rounded-full ${getAvailabilityColor(player.availability)}`} />
                            <span className="text-2xl font-bold">#{player.squadNumber}</span>
                          </div>
                        </div>
                        <CardDescription>
                          {player.type === 'goalkeeper' ? 'Goalkeeper' : 'Outfield Player'}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          <div className="flex justify-between items-center text-sm">
                            <span className="text-muted-foreground">Status:</span>
                            <Badge variant={player.availability === 'green' ? 'default' : 'secondary'}>
                              {getAvailabilityText(player.availability)}
                            </Badge>
                          </div>
                          <div className="flex justify-between items-center text-sm">
                            <span className="text-muted-foreground">Subscription:</span>
                            <span className="font-medium capitalize">
                              {player.subscriptionType?.replace('_', ' ')}
                            </span>
                          </div>
                          <div className="flex justify-between items-center text-sm">
                            <span className="text-muted-foreground">Games:</span>
                            <span className="font-medium">
                              {player.matchStats.totalGames}
                            </span>
                          </div>
                        </div>
                      </CardContent>
                      <CardFooter className="flex justify-between">
                        <Button variant="outline" size="sm">
                          <UserPlus className="mr-2 h-4 w-4" />
                          Parent
                        </Button>
                        <Button size="sm">
                          <Settings className="mr-2 h-4 w-4" />
                          Edit
                        </Button>
                      </CardFooter>
                    </Card>
                  ))}
                  
                  {/* Add Player Card */}
                  <Card className="border-dashed border-2 border-muted hover:border-puma-blue-300 transition-colors cursor-pointer"
                        onClick={() => {
                          setSelectedPlayer(null);
                          setSelectedTeamId(team.id);
                          setIsPlayerDialogOpen(true);
                        }}>
                    <CardContent className="py-8 flex flex-col items-center justify-center text-center">
                      <PlusCircle className="h-8 w-8 text-muted-foreground mb-2" />
                      <p className="text-sm font-medium">Add Player</p>
                    </CardContent>
                  </Card>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default PlayerManagement;
