import React, { useState, useEffect } from 'react';
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
import { Player, Team } from '@/types';
import { Search, Users, Plus, UserPlus, Brain, Target, MessageSquare, BarChart3, Calendar as CalendarIcon, RefreshCw, UserMinus as UserMinusIcon } from 'lucide-react';
import { PlayerForm } from './PlayerForm';
import { FifaStylePlayerCard } from './FifaStylePlayerCard';
import { PlayerParentModal } from './PlayerParentModal';
import { PlayerAttributesModal } from './PlayerAttributesModal';
import { PlayerObjectivesModal } from './PlayerObjectivesModal';
import { PlayerCommentsModal } from './PlayerCommentsModal';
import { PlayerStatsModal } from './PlayerStatsModal';
import { PlayerHistoryModal } from './PlayerHistoryModal';
import { PlayerTransferForm } from './PlayerTransferForm';
import { PlayerLeaveForm } from './PlayerLeaveForm';

interface PlayerManagementProps {
  team: Team;
}

export const PlayerManagement: React.FC<PlayerManagementProps> = ({ team }) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [subscriptionFilter, setSubscriptionFilter] = useState<string>('all');
  const [showPlayerForm, setShowPlayerForm] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [activeModal, setActiveModal] = useState<string | null>(null);

  // Fetch active players
  const { data: players = [], isLoading } = useQuery({
    queryKey: ['active-players', team.id],
    queryFn: () => playersService.getActivePlayersByTeamId(team.id),
  });

  // Create player mutation
  const createPlayerMutation = useMutation({
    mutationFn: (playerData: any) => playersService.createPlayer(playerData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['active-players', team.id] });
      setShowPlayerForm(false);
      toast({
        title: 'Player Added',
        description: 'Player has been successfully added to the team.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to add player',
        variant: 'destructive',
      });
    },
  });

  // Update player mutation
  const updatePlayerMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Player> }) => 
      playersService.updatePlayer(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['active-players', team.id] });
      // General success actions, specific modal closing handled by handleModalClose or PlayerForm logic
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

  // Filter players based on search and subscription type
  const filteredPlayers = players.filter(player => {
    const matchesSearch = player.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      player.squadNumber?.toString().includes(searchTerm);
    
    const matchesSubscription = subscriptionFilter === 'all' || 
      player.subscriptionType === subscriptionFilter;
    
    return matchesSearch && matchesSubscription;
  });

  const handleModalOpen = (modal: string, player: Player) => {
    console.log(`[PlayerManagement] handleModalOpen: Modal "${modal}" for player "${player.name}"`);
    setSelectedPlayer(player);
    setActiveModal(modal);
  };

  const handleModalClose = () => {
    console.log("[PlayerManagement] handleModalClose called");
    setSelectedPlayer(null);
    setActiveModal(null);
  };

  const handlePlayerSubmit = (playerData: any) => {
    if (editingPlayer) {
      updatePlayerMutation.mutate({
        id: editingPlayer.id,
        data: playerData
      }, {
        onSuccess: () => { // Specific onSuccess for player form
          queryClient.invalidateQueries({ queryKey: ['active-players', team.id] });
          setEditingPlayer(null);
          setShowPlayerForm(false);
          toast({
            title: 'Player Updated',
            description: 'Player information has been successfully updated.',
          });
        }
      });
    } else {
      createPlayerMutation.mutate({
        ...playerData,
        team_id: team.id
      });
    }
  };

  const handlePlayerUpdate = (updatedData: any) => {
    if (!selectedPlayer) return;
    
    updatePlayerMutation.mutate({
      id: selectedPlayer.id,
      data: updatedData
    });
    handleModalClose();
  };

  const handleEditPlayer = (player: Player) => {
    console.log(`[PlayerManagement] handleEditPlayer called for player: ${player.name}`);
    setEditingPlayer(player);
    setShowPlayerForm(true);
  };

  const handleManageParents = (player: Player) => {
    console.log(`[PlayerManagement] handleManageParents for player: ${player.name}`);
    handleModalOpen('parents', player);
  };

  const handleRemoveFromSquad = (player: Player) => {
    // This is typically handled by the "Leave Team" flow or a specific remove button if needed.
    // For now, let's assume it's part of "Leave Team" or similar.
    // If there's a direct "Remove" on the card that isn't "Leave Team", it would need a specific mutation.
    // playerService.removePlayerFromSquad(playerId) is used in PlayerManagementTab
    // For now, this might be a bit redundant if 'Leave Team' covers it.
    // Let's make it call the leave team modal for consistency.
    console.log(`[PlayerManagement] handleRemoveFromSquad for player: ${player.name}`);
    if (window.confirm(`Are you sure you want to remove ${player.name} from the squad? This usually means they are leaving the team.`)) {
       // Example: use updatePlayerMutation to mark as inactive or call a specific service
      updatePlayerMutation.mutate({ id: player.id, data: { status: 'inactive' } }); // Or a dedicated remove mutation
       toast({
         title: 'Player Removed (Marked Inactive)',
         description: `${player.name} has been marked as inactive.`,
       });
    }
  };

  const handleUpdatePhoto = async (player: Player, file: File) => {
    console.log(`[PlayerManagement] handleUpdatePhoto for player: ${player.name}`);
    toast({
      title: 'Photo Upload (Not Implemented)',
      description: `Photo upload triggered for: ${player.name}. (Actual upload needs implementation)`,
    });
    // TODO: Implement actual photo upload service call and update player.photoUrl
    // Example:
    // const photoUrl = await playersService.uploadPlayerPhoto(player.id, file);
    // updatePlayerMutation.mutate({ id: player.id, data: { photoUrl } });
  };

  const handleSaveFunStats = (player: Player, stats: Record<string, number>) => {
    console.log(`[PlayerManagement] handleSaveFunStats for player: ${player.name}`, stats);
    updatePlayerMutation.mutate({
      id: player.id,
      data: { funStats: stats }
    });
  };

  const handleSavePlayStyle = (player: Player, playStyles: string[]) => {
    console.log(`[PlayerManagement] handleSavePlayStyle for player: ${player.name}`, playStyles);
    updatePlayerMutation.mutate({
      id: player.id,
      data: { playStyle: JSON.stringify(playStyles) }
    });
  };

  const handleSaveCardDesign = (player: Player, designId: string) => {
    console.log(`[PlayerManagement] handleSaveCardDesign for player: ${player.name}`, designId);
    updatePlayerMutation.mutate({
      id: player.id,
      data: { cardDesignId: designId }
    });
  };

  // New Handlers for Modals
  const handleManageAttributes = (player: Player) => {
    console.log(`[PlayerManagement] handleManageAttributes for player: ${player.name}`);
    handleModalOpen('attributes', player);
  };

  const handleManageObjectives = (player: Player) => {
    console.log(`[PlayerManagement] handleManageObjectives for player: ${player.name}`);
    handleModalOpen('objectives', player);
  };

  const handleManageComments = (player: Player) => {
    console.log(`[PlayerManagement] handleManageComments for player: ${player.name}`);
    handleModalOpen('comments', player);
  };

  const handleViewStats = (player: Player) => {
    console.log(`[PlayerManagement] handleViewStats for player: ${player.name}`);
    handleModalOpen('stats', player);
  };

  const handleViewHistory = (player: Player) => {
    console.log(`[PlayerManagement] handleViewHistory for player: ${player.name}`);
    handleModalOpen('history', player);
  };

  const handleTransferPlayer = (player: Player) => {
    console.log(`[PlayerManagement] handleTransferPlayer for player: ${player.name}`);
    handleModalOpen('transfer', player);
  };

  const handleLeaveTeam = (player: Player) => {
    console.log(`[PlayerManagement] handleLeaveTeam for player: ${player.name}`);
    handleModalOpen('leave', player);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="text-center py-8">Loading players...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            {team.name} Squad
          </CardTitle>
          <CardDescription>
            Manage your team's players with FIFA-style trading cards
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
              
              <Button onClick={() => { setEditingPlayer(null); setShowPlayerForm(true); }}>
                <Plus className="h-4 w-4 mr-2" />
                Add Player
              </Button>
            </div>

            {/* FIFA-Style Player Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 justify-items-center">
              {filteredPlayers.map((player) => (
                <FifaStylePlayerCard
                  key={player.id}
                  player={player}
                  team={team}
                  onEdit={handleEditPlayer}
                  onManageParents={handleManageParents}
                  onRemoveFromSquad={handleRemoveFromSquad}
                  onUpdatePhoto={handleUpdatePhoto}
                  onSaveFunStats={handleSaveFunStats}
                  onSavePlayStyle={handleSavePlayStyle}
                  onSaveCardDesign={handleSaveCardDesign}
                  // Add new handlers
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

            {filteredPlayers.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                {searchTerm || subscriptionFilter !== 'all' ? 'No players found matching your filters.' : 'No players found for this team.'}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Player Form Modal */}
      {showPlayerForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">
              {editingPlayer ? 'Edit Player' : 'Add New Player'}
            </h2>
            <PlayerForm
              player={editingPlayer}
              onSubmit={handlePlayerSubmit}
              onCancel={() => {
                setShowPlayerForm(false);
                setEditingPlayer(null);
              }}
              teamId={team.id}
            />
          </div>
        </div>
      )}

      {/* All Modals */}
      {selectedPlayer && (
        <>
          <PlayerParentModal
            player={selectedPlayer}
            isOpen={activeModal === 'parents'} // Updated
            onClose={handleModalClose} // Updated
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
                  currentTeamId={team.id}
                  onSubmit={() => {
                    handleModalClose();
                    queryClient.invalidateQueries({ queryKey: ['active-players', team.id] });
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
                  onSubmit={(leaveDate, leaveComments) => {
                    if (!selectedPlayer) return;
                    updatePlayerMutation.mutate({
                      id: selectedPlayer.id,
                      data: { 
                        status: 'left', 
                        leaveDate: leaveDate, // Corrected from leave_date
                        leave_comments: leaveComments 
                      }
                    });
                    handleModalClose();
                  }}
                  onCancel={handleModalClose}
                />
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
