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
import { Search, Users, Plus, UserPlus, Brain, Target, MessageSquare, BarChart3, Calendar as CalendarIcon, RefreshCw, UserMinus as UserMinusIcon, X, UploadCloud, Trash2 } from 'lucide-react';
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
    onSuccess: (updatedPlayer) => { // updatedPlayer is the returned data from playersService.updatePlayer
      queryClient.invalidateQueries({ queryKey: ['active-players', team.id] });
      // Update selectedPlayer if it's the one being edited, to reflect changes immediately on the card
      if (selectedPlayer && selectedPlayer.id === updatedPlayer.id) {
        setSelectedPlayer(updatedPlayer);
      }
      if (editingPlayer && editingPlayer.id === updatedPlayer.id) {
        setEditingPlayer(updatedPlayer); // If editing in form, update that too
      }
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

  // Delete player photo mutation
  const deletePlayerPhotoMutation = useMutation({
    mutationFn: (playerId: string) => playersService.removePlayerPhoto(playerId),
    onSuccess: (updatedPlayer) => {
      queryClient.invalidateQueries({ queryKey: ['active-players', team.id] });
      // Update selectedPlayer if it's the one being edited, to reflect changes immediately on the card
      if (selectedPlayer && selectedPlayer.id === updatedPlayer.id) {
        setSelectedPlayer(updatedPlayer);
      }
      if (editingPlayer && editingPlayer.id === updatedPlayer.id) {
        setEditingPlayer(updatedPlayer); // If editing in form, update that too
      }
      const currentPlayers = queryClient.getQueryData<Player[]>(['active-players', team.id]);
      if (currentPlayers) {
        const updatedPlayersList = currentPlayers.map(p => p.id === updatedPlayer.id ? updatedPlayer : p);
        queryClient.setQueryData(['active-players', team.id], updatedPlayersList);
      }
      toast({
        title: 'Photo Deleted',
        description: 'Player photo has been successfully deleted.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error Deleting Photo',
        description: error.message || 'Failed to delete player photo',
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

  const handleClosePlayerForm = () => {
    setShowPlayerForm(false);
    setEditingPlayer(null);
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
        onSuccess: (updatedPlayer) => { 
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
      const dataForCreation = Object.assign({}, playerData, { team_id: team.id });
      createPlayerMutation.mutate(dataForCreation);
    }
  };

  const handlePlayerUpdate = (updatedData: any) => {
    if (!selectedPlayer) return;
    
    updatePlayerMutation.mutate({
      id: selectedPlayer.id,
      data: updatedData
    });
    // Modal close is handled by the specific modal's onClose or PlayerForm logic if it's a direct edit
    // If this is a generic update from a modal, close it:
    // handleModalClose(); // This might be too aggressive if called from PlayerForm, for example.
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
    console.log(`[PlayerManagement] handleRemoveFromSquad for player: ${player.name}`);
    if (window.confirm(`Are you sure you want to remove ${player.name} from the squad? This usually means they are leaving the team.`)) {
      updatePlayerMutation.mutate({ id: player.id, data: { status: 'inactive' } }); 
       toast({
         title: 'Player Removed (Marked Inactive)',
         description: `${player.name} has been marked as inactive.`,
       });
    }
  };

  const handleUpdatePhoto = async (player: Player, file: File) => {
    console.log(`[PlayerManagement] handleUpdatePhoto for player: ${player.name}`);
    if (!player || !file) {
      toast({ title: 'Upload Error', description: 'Player or file missing.', variant: 'destructive' });
      return;
    }
    try {
      toast({ title: 'Uploading Photo...', description: `Uploading ${file.name} for ${player.name}.` });
      const newPhotoUrl = await playersService.uploadPlayerPhoto(player.id, file);
      
      updatePlayerMutation.mutate({ 
        id: player.id, 
        data: { photoUrl: newPhotoUrl } 
      }, {
        onSuccess: (updatedPlayer) => {
          queryClient.invalidateQueries({ queryKey: ['active-players', team.id] });
          // If this player is currently selected for a modal or card view, update its state
          if (selectedPlayer && selectedPlayer.id === player.id) {
            setSelectedPlayer(prev => prev ? { ...prev, photoUrl: newPhotoUrl } : null);
          }
          // Update the player in the main 'players' list if possible, or rely on query invalidation
          const currentPlayers = queryClient.getQueryData<Player[]>(['active-players', team.id]);
          if (currentPlayers) {
            const updatedPlayers = currentPlayers.map(p => p.id === player.id ? { ...p, photoUrl: newPhotoUrl } : p);
            queryClient.setQueryData(['active-players', team.id], updatedPlayers);
          }

          toast({
            title: 'Photo Updated',
            description: `Photo for ${player.name} has been successfully updated.`,
          });
        },
        onError: (error: any) => {
          toast({
            title: 'Photo Update Failed',
            description: error.message || `Failed to save photo URL for ${player.name}.`,
            variant: 'destructive',
          });
        }
      });
    } catch (error: any) {
      console.error('Error uploading photo:', error);
      toast({
        title: 'Upload Failed',
        description: error.message || 'An unexpected error occurred during photo upload.',
        variant: 'destructive',
      });
    }
  };

  const handleDeletePlayerPhoto = (playerToDeletePhoto: Player) => {
    if (!playerToDeletePhoto.photoUrl) {
      toast({ title: 'No Photo Available', description: `${playerToDeletePhoto.name} does not have a photo to delete.`, variant: 'default' });
      return;
    }
    if (window.confirm(`Are you sure you want to delete the photo for ${playerToDeletePhoto.name}? This action cannot be undone.`)) {
      deletePlayerPhotoMutation.mutate(playerToDeletePhoto.id);
    }
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
      data: { playStyle: JSON.stringify(playStyles) } // Ensure playStyle is stringified if stored as JSON string in DB
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
                  onDeletePhoto={handleDeletePlayerPhoto} {/* ADDED THIS PROP */}
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-background text-foreground rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto relative shadow-xl">
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground"
              onClick={handleClosePlayerForm}
              aria-label="Close player form"
            >
              <X className="h-5 w-5" />
            </Button>
            <h2 className="text-xl font-bold mb-4">
              {editingPlayer ? 'Edit Player' : 'Add New Player'}
            </h2>
            <PlayerForm
              player={editingPlayer}
              onSubmit={handlePlayerSubmit}
              onCancel={handleClosePlayerForm}
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
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <div className="bg-background text-foreground rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto relative shadow-xl">
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute top-4 right-4 text-muted-foreground hover:text-foreground"
                  onClick={handleModalClose}
                  aria-label="Close transfer form"
                >
                  <X className="h-5 w-5" />
                </Button>
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
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <div className="bg-background text-foreground rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto relative shadow-xl">
                 <Button
                  variant="ghost"
                  size="icon"
                  className="absolute top-4 right-4 text-muted-foreground hover:text-foreground"
                  onClick={handleModalClose}
                  aria-label="Close leave form"
                >
                  <X className="h-5 w-5" />
                </Button>
                <PlayerLeaveForm
                  player={selectedPlayer}
                  onSubmit={(leaveDate, leaveComments) => {
                    if (!selectedPlayer) return;
                    updatePlayerMutation.mutate({
                      id: selectedPlayer.id,
                      data: { 
                        status: 'left', 
                        leaveDate: leaveDate, 
                        leaveComments: leaveComments 
                      }
                    }, {
                      onSuccess: () => {
                        queryClient.invalidateQueries({ queryKey: ['active-players', team.id] });
                        handleModalClose();
                         toast({
                           title: 'Player Left Team',
                           description: `${selectedPlayer.name} has been marked as left.`,
                         });
                      }
                    });
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
