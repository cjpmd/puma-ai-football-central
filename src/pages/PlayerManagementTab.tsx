import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { playersService } from '@/services/playersService';
import { useToast } from '@/hooks/use-toast';
import { Player } from '@/types';
import { Search, Users, Cog, Calendar, BarChart3, MessageSquare, Target, TrendingUp, TrendingDown, Minus, Brain, Crown, Trophy } from 'lucide-react';
import { PlayerParentModal } from '@/components/players/PlayerParentModal';
import { PlayerAttributesModal } from '@/components/players/PlayerAttributesModal';
import { PlayerObjectivesModal } from '@/components/players/PlayerObjectivesModal';
import { PlayerCommentsModal } from '@/components/players/PlayerCommentsModal';
import { PlayerStatsModal } from '@/components/players/PlayerStatsModal';
import { PlayerHistoryModal } from '@/components/players/PlayerHistoryModal';
import { PlayerTransferForm } from '@/components/players/PlayerTransferForm';
import { PlayerLeaveForm } from '@/components/players/PlayerLeaveForm';
import { FifaStylePlayerCard } from '@/components/players/FifaStylePlayerCard';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { calculatePerformanceTrend, PerformanceTrend } from '@/utils/performanceUtils';

const PlayerManagementTab = () => {
  const { teams } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedTeamId, setSelectedTeamId] = useState<string>(teams[0]?.id || '');
  const [searchTerm, setSearchTerm] = useState('');
  const [subscriptionFilter, setSubscriptionFilter] = useState<string>('all');
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [performanceTrends, setPerformanceTrends] = useState<Map<string, PerformanceTrend>>(new Map());
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');

  // Fetch active players
  const { data: players = [], isLoading } = useQuery({
    queryKey: ['active-players', selectedTeamId],
    queryFn: () => selectedTeamId ? playersService.getActivePlayersByTeamId(selectedTeamId) : [],
    enabled: !!selectedTeamId,
  });

  // Load performance trends for all players
  useEffect(() => {
    const loadPerformanceTrends = async () => {
      if (players.length === 0) return;
      
      const trends = new Map<string, PerformanceTrend>();
      
      await Promise.all(
        players.map(async (player) => {
          try {
            const trend = await calculatePerformanceTrend(player.id);
            trends.set(player.id, trend);
          } catch (error) {
            console.error(`Error loading trend for player ${player.id}:`, error);
            trends.set(player.id, 'maintaining');
          }
        })
      );
      
      setPerformanceTrends(trends);
    };

    loadPerformanceTrends();
  }, [players]);

  // Update player mutation
  const updatePlayerMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Player> }) => 
      playersService.updatePlayer(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['active-players'] });
      toast({
        title: 'Player Updated',
        description: 'Player information has been successfully updated.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update player',
        variant: 'destructive',
      });
    },
  });

  // Remove player mutation
  const removePlayerMutation = useMutation({
    mutationFn: (playerId: string) => playersService.removePlayerFromSquad(playerId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['active-players'] });
      toast({
        title: 'Player Removed',
        description: 'Player has been removed from the squad.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to remove player',
        variant: 'destructive',
      });
    },
  });

  // Filter players based on search and subscription type
  const filteredPlayers = players.filter(player => {
    const matchesSearch = player.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      player.squadNumber?.toString().includes(searchTerm);
    
    const matchesSubscription = subscriptionFilter === 'all' || 
      player.subscriptionType === subscriptionFilter;
    
    return matchesSearch && matchesSubscription;
  });

  const handleModalOpen = (modal: string, player: Player) => {
    setSelectedPlayer(player);
    setActiveModal(modal);
  };

  const handleModalClose = () => {
    setSelectedPlayer(null);
    setActiveModal(null);
  };

  const handlePlayerUpdate = (updatedData: any) => {
    if (!selectedPlayer) return;
    
    updatePlayerMutation.mutate({
      id: selectedPlayer.id,
      data: updatedData
    });
    handleModalClose();
  };

  // FIFA Card specific handlers
  const handleEditPlayer = (player: Player) => {
    toast({
      title: 'Edit Player (handler called)',
      description: `Edit player clicked: ${player.name}`,
    });
    // TODO: Implement edit player functionality
  };

  const handleManageParents = (player: Player) => {
    toast({
      title: 'Parents (handler called)',
      description: `Parents for: ${player.name}`,
    });
    handleModalOpen('parents', player);
  };

  const handleRemoveFromSquad = (player: Player) => {
    toast({
      title: 'Remove from Squad (handler called)',
      description: `Remove from squad: ${player.name}`,
    });
    if (window.confirm(`Are you sure you want to remove ${player.name} from the squad?`)) {
      removePlayerMutation.mutate(player.id);
    }
  };

  const handleUpdatePhoto = async (player: Player, file: File) => {
    toast({
      title: 'Photo Upload (handler called)',
      description: `Photo upload triggered for: ${player.name}`,
    });
    // TODO: Implement photo upload
  };

  const handleSaveFunStats = (player: Player, stats: Record<string, number>) => {
    toast({
      title: 'Fun Stats (handler called)',
      description: `Saving fun stats for: ${player.name}`,
    });
    updatePlayerMutation.mutate({
      id: player.id,
      data: { funStats: stats }
    });
  };

  const handleSavePlayStyle = (player: Player, playStyles: string[]) => {
    toast({
      title: 'Play Style (handler called)',
      description: `Saving play styles for: ${player.name}`,
    });
    updatePlayerMutation.mutate({
      id: player.id,
      data: { playStyle: JSON.stringify(playStyles) }
    });
  };

  const handleSaveCardDesign = (player: Player, designId: string) => {
    toast({
      title: 'Card Design (handler called)',
      description: `Saving card design for: ${player.name}`,
    });
    updatePlayerMutation.mutate({
      id: player.id,
      data: { cardDesignId: designId }
    });
  };

  const handleManageAttributes = (player: Player) => {
    toast({
      title: 'Attributes (handler called)',
      description: `Attributes for: ${player.name}`,
    });
    handleModalOpen('attributes', player);
  };

  const handleManageObjectives = (player: Player) => {
    toast({
      title: 'Objectives (handler called)',
      description: `Objectives for: ${player.name}`,
    });
    handleModalOpen('objectives', player);
  };

  const handleManageComments = (player: Player) => {
    toast({
      title: 'Comments (handler called)',
      description: `Comments for: ${player.name}`,
    });
    handleModalOpen('comments', player);
  };

  const handleViewStats = (player: Player) => {
    toast({
      title: 'View Stats (handler called)',
      description: `Stats for: ${player.name}`,
    });
    handleModalOpen('stats', player);
  };

  const handleViewHistory = (player: Player) => {
    toast({
      title: 'History (handler called)',
      description: `History for: ${player.name}`,
    });
    handleModalOpen('history', player);
  };

  const handleTransferPlayer = (player: Player) => {
    toast({
      title: 'Transfer (handler called)',
      description: `Transfer dialog for: ${player.name}`,
    });
    handleModalOpen('transfer', player);
  };

  const handleLeaveTeam = (player: Player) => {
    toast({
      title: 'Leave Team (handler called)',
      description: `Leave team dialog for: ${player.name}`,
    });
    handleModalOpen('leave', player);
  };

  const renderPerformanceIcon = (playerId: string) => {
    const trend = performanceTrends.get(playerId);
    if (!trend) return <Minus className="h-4 w-4 text-gray-400" />;
    
    switch (trend) {
      case 'improving':
        return <TrendingUp className="h-4 w-4 text-green-600" />;
      case 'needs-work':
        return <TrendingDown className="h-4 w-4 text-red-600" />;
      case 'maintaining':
      default:
        return <Minus className="h-4 w-4 text-gray-600" />;
    }
  };

  const renderTopPositions = (player: Player) => {
    const positions = player.matchStats?.minutesByPosition || {};
    
    // Convert positions object to array and ensure values are numbers
    const positionEntries = Object.entries(positions).map(([position, minutes]) => [
      position, 
      typeof minutes === 'number' ? minutes : 0
    ] as [string, number]);
    
    const sortedPositions = positionEntries
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);
    
    if (sortedPositions.length === 0) {
      return <span className="text-muted-foreground text-xs">No data</span>;
    }
    
    return (
      <div className="flex flex-wrap gap-1">
        {sortedPositions.map(([position, minutes]) => (
          <Badge key={position} variant="outline" className="text-xs">
            {position}: {minutes}m
          </Badge>
        ))}
      </div>
    );
  };

  const selectedTeam = teams.find(t => t.id === selectedTeamId);

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <div className="text-center py-8">Loading players...</div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Player Management</h1>
            <p className="text-muted-foreground">
              Comprehensive player data management and analytics
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex rounded-lg border p-1">
              <Button
                variant={viewMode === 'table' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('table')}
              >
                Table
              </Button>
              <Button
                variant={viewMode === 'cards' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('cards')}
              >
                Cards
              </Button>
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
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              {selectedTeam?.name} Players
            </CardTitle>
            <CardDescription>
              Manage all aspects of your players' data and performance
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Search players..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                
                <Select value={subscriptionFilter} onValueChange={setSubscriptionFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Filter by subscription" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Players</SelectItem>
                    <SelectItem value="full_squad">Full Squad</SelectItem>
                    <SelectItem value="training">Training Only</SelectItem>
                  </SelectContent>
                </Select>
                
                <Badge variant="secondary">
                  {filteredPlayers.length} player{filteredPlayers.length !== 1 ? 's' : ''}
                </Badge>
              </div>

              {viewMode === 'cards' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 justify-items-center">
                  {filteredPlayers.map((player) => (
                    <FifaStylePlayerCard
                      key={player.id}
                      player={player}
                      team={selectedTeam}
                      onEdit={handleEditPlayer}
                      onManageParents={handleManageParents}
                      onRemoveFromSquad={handleRemoveFromSquad}
                      onUpdatePhoto={handleUpdatePhoto}
                      onSaveFunStats={handleSaveFunStats}
                      onSavePlayStyle={handleSavePlayStyle}
                      onSaveCardDesign={handleSaveCardDesign}
                      onManageAttributes={handleManageAttributes}
                      onManageObjectives={handleManageObjectives}
                      onManageComments={handleManageComments}
                      onViewStats={handleViewStats}
                      onViewHistory={handleViewHistory}
                      onTransferPlayer={handleTransferPlayer}
                      onLeaveTeam={handleLeaveTeam}
                    />
                  ))}
                </div>
              ) : (
                <div className="border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Player</TableHead>
                        <TableHead>Squad #</TableHead>
                        <TableHead>Subscription</TableHead>
                        <TableHead>Games</TableHead>
                        <TableHead>Minutes</TableHead>
                        <TableHead>Top Positions</TableHead>
                        <TableHead>Performance</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredPlayers.map((player) => (
                        <TableRow key={player.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{player.name}</p>
                              <p className="text-sm text-muted-foreground">
                                {player.type === 'goalkeeper' ? 'Goalkeeper' : 'Outfield Player'}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              #{player.squadNumber}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge 
                              variant={player.subscriptionType === 'full_squad' ? 'default' : 'secondary'}
                            >
                              {player.subscriptionType === 'full_squad' ? 'Full Squad' : 'Training Only'}
                            </Badge>
                          </TableCell>
                          <TableCell>{player.matchStats?.totalGames || 0}</TableCell>
                          <TableCell>{player.matchStats?.totalMinutes || 0}</TableCell>
                          <TableCell>
                            {renderTopPositions(player)}
                          </TableCell>
                          <TableCell>
                            {renderPerformanceIcon(player.id)}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleModalOpen('parents', player)}
                                className="h-8 w-8 p-0"
                                title="Manage Parents"
                              >
                                <Users className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleModalOpen('attributes', player)}
                                className="h-8 w-8 p-0"
                                title="Manage Attributes"
                              >
                                <Brain className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleModalOpen('objectives', player)}
                                className="h-8 w-8 p-0"
                                title="Manage Objectives"
                              >
                                <Target className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleModalOpen('comments', player)}
                                className="h-8 w-8 p-0"
                                title="Manage Comments"
                              >
                                <MessageSquare className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleModalOpen('stats', player)}
                                className="h-8 w-8 p-0"
                                title="View Statistics"
                              >
                                <BarChart3 className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleModalOpen('history', player)}
                                className="h-8 w-8 p-0"
                                title="View History"
                              >
                                <Calendar className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}

              {filteredPlayers.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  {searchTerm || subscriptionFilter !== 'all' ? 'No players found matching your filters.' : 'No players found for this team.'}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Modals */}
        {selectedPlayer && (
          <>
            <PlayerParentModal
              player={selectedPlayer}
              isOpen={activeModal === 'parents'}
              onClose={handleModalClose}
            />
            
            <PlayerAttributesModal
              player={selectedPlayer}
              isOpen={activeModal === 'attributes'}
              onClose={handleModalClose}
              onSave={(attributes) => handlePlayerUpdate({ attributes })}
            />
            
            <PlayerObjectivesModal
              player={selectedPlayer}
              isOpen={activeModal === 'objectives'}
              onClose={handleModalClose}
              onSave={(objectives) => handlePlayerUpdate({ objectives })}
            />
            
            <PlayerCommentsModal
              player={selectedPlayer}
              isOpen={activeModal === 'comments'}
              onClose={handleModalClose}
              onSave={(comments) => handlePlayerUpdate({ comments })}
            />
            
            <PlayerStatsModal
              player={selectedPlayer}
              isOpen={activeModal === 'stats'}
              onClose={handleModalClose}
            />
            
            <PlayerHistoryModal
              player={selectedPlayer}
              isOpen={activeModal === 'history'}
              onClose={handleModalClose}
            />

            {activeModal === 'transfer' && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                  <PlayerTransferForm
                    player={selectedPlayer}
                    currentTeamId={selectedTeamId}
                    onSubmit={() => {
                      handleModalClose();
                      // Refresh data after transfer
                      queryClient.invalidateQueries({ queryKey: ['active-players'] });
                    }}
                    onCancel={handleModalClose}
                  />
                </div>
              </div>
            )}

            {activeModal === 'leave' && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                  <PlayerLeaveForm
                    player={selectedPlayer}
                    onSubmit={() => {
                      handleModalClose();
                      // Refresh data after leave
                      queryClient.invalidateQueries({ queryKey: ['active-players'] });
                    }}
                    onCancel={handleModalClose}
                  />
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
};

export default PlayerManagementTab;
