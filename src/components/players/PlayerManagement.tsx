import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Player, Team } from '@/types';
import { PlayerForm } from './PlayerForm';
import { PlayerCard } from './PlayerCard';
import { PlayerLeaveForm } from './PlayerLeaveForm';
import { PlayerTransferForm } from './PlayerTransferForm';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { playersService } from '@/services/playersService';
import { PlusCircle, UserMinus, ArrowRightLeft, Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { PlayerParentModal } from './PlayerParentModal';
import { PlayerAttributesModal } from './PlayerAttributesModal';
import { PlayerObjectivesModal } from './PlayerObjectivesModal';
import { PlayerCommentsModal } from './PlayerCommentsModal';
import { PlayerStatsModal } from './PlayerStatsModal';
import { PlayerHistoryModal } from './PlayerHistoryModal';

interface PlayerManagementProps {
  team: Team;
}

export const PlayerManagement: React.FC<PlayerManagementProps> = ({ team }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('active');
  const [isPlayerDialogOpen, setIsPlayerDialogOpen] = useState(false);
  const [isLeaveDialogOpen, setIsLeaveDialogOpen] = useState(false);
  const [isTransferDialogOpen, setIsTransferDialogOpen] = useState(false);
  const [isParentModalOpen, setIsParentModalOpen] = useState(false);
  const [isAttributesModalOpen, setIsAttributesModalOpen] = useState(false);
  const [isObjectivesModalOpen, setIsObjectivesModalOpen] = useState(false);
  const [isCommentsModalOpen, setIsCommentsModalOpen] = useState(false);
  const [isStatsModalOpen, setIsStatsModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);

  // Fetch active players
  const { data: activePlayers = [], isLoading: isActiveLoading } = useQuery({
    queryKey: ['active-players', team.id],
    queryFn: () => playersService.getActivePlayersByTeamId(team.id),
  });

  // Fetch inactive players
  const { data: inactivePlayers = [], isLoading: isInactiveLoading } = useQuery({
    queryKey: ['inactive-players', team.id],
    queryFn: () => playersService.getInactivePlayersByTeamId(team.id),
  });

  // Mutation for creating players
  const createPlayerMutation = useMutation({
    mutationFn: playersService.createPlayer,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['active-players'] });
      setIsPlayerDialogOpen(false);
      toast({
        title: 'Player Added',
        description: 'Player has been successfully added to the squad.',
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

  // Mutation for updating players
  const updatePlayerMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Player> }) => 
      playersService.updatePlayer(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['active-players'] });
      queryClient.invalidateQueries({ queryKey: ['inactive-players'] });
      setIsPlayerDialogOpen(false);
      toast({
        title: 'Player Updated',
        description: 'Player has been successfully updated.',
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

  // Mutation for marking player as inactive
  const markInactiveMutation = useMutation({
    mutationFn: ({ id, leaveDate, leaveComments }: { id: string; leaveDate: string; leaveComments?: string }) => 
      playersService.markPlayerAsInactive(id, leaveDate, leaveComments),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['active-players'] });
      queryClient.invalidateQueries({ queryKey: ['inactive-players'] });
      setIsLeaveDialogOpen(false);
      setSelectedPlayer(null);
      toast({
        title: 'Player Left',
        description: 'Player has been marked as having left the team.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to mark player as inactive',
        variant: 'destructive',
      });
    },
  });

  // Mutation for resurrecting players
  const resurrectPlayerMutation = useMutation({
    mutationFn: playersService.resurrectPlayer,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['active-players'] });
      queryClient.invalidateQueries({ queryKey: ['inactive-players'] });
      toast({
        title: 'Player Resurrected',
        description: 'Player has been returned to the active squad.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to resurrect player',
        variant: 'destructive',
      });
    },
  });

  // Mutation for initiating transfers
  const initiateTransferMutation = useMutation({
    mutationFn: playersService.initiatePlayerTransfer,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-transfers'] });
      setIsTransferDialogOpen(false);
      setSelectedPlayer(null);
      toast({
        title: 'Transfer Initiated',
        description: 'Player transfer has been initiated.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to initiate transfer',
        variant: 'destructive',
      });
    },
  });

  // Mutation for deleting players
  const deletePlayerMutation = useMutation({
    mutationFn: playersService.deletePlayer,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['active-players'] });
      queryClient.invalidateQueries({ queryKey: ['inactive-players'] });
      toast({
        title: 'Player Deleted',
        description: 'Player has been permanently deleted.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete player',
        variant: 'destructive',
      });
    },
  });

  const handleCreatePlayer = (playerData: Partial<Player>) => {
    if (selectedPlayer) {
      updatePlayerMutation.mutate({ 
        id: selectedPlayer.id, 
        data: playerData
      });
    } else {
      createPlayerMutation.mutate({
        ...playerData,
        teamId: team.id
      });
    }
  };

  const handleEditPlayer = (player: Player) => {
    setSelectedPlayer(player);
    setIsPlayerDialogOpen(true);
  };

  const handleLeavePlayer = (player: Player) => {
    setSelectedPlayer(player);
    setIsLeaveDialogOpen(true);
  };

  const handleResurrectPlayer = (player: Player) => {
    resurrectPlayerMutation.mutate(player.id);
  };

  const handleMarkPlayerInactive = (playerId: string, leaveDate: string, leaveComments?: string) => {
    markInactiveMutation.mutate({ id: playerId, leaveDate, leaveComments });
  };

  const handleDeletePlayer = (player: Player) => {
    if (window.confirm(`Are you sure you want to permanently delete ${player.name}? This action cannot be undone.`)) {
      deletePlayerMutation.mutate(player.id);
    }
  };

  const handleTransferPlayer = (player: Player) => {
    setSelectedPlayer(player);
    setIsTransferDialogOpen(true);
  };

  const handleInitiateTransfer = (transferData: any) => {
    if (!selectedPlayer || !user) return;

    initiateTransferMutation.mutate({
      playerId: selectedPlayer.id,
      fromTeamId: team.id,
      toTeamId: transferData.toTeamId,
      dataTransferOptions: transferData.dataTransferOptions,
      requestedById: user.id
    });
  };

  const handleManageParents = (player: Player) => {
    setSelectedPlayer(player);
    setIsParentModalOpen(true);
  };

  const handleManageAttributes = (player: Player) => {
    setSelectedPlayer(player);
    setIsAttributesModalOpen(true);
  };

  const handleManageObjectives = (player: Player) => {
    setSelectedPlayer(player);
    setIsObjectivesModalOpen(true);
  };

  const handleManageComments = (player: Player) => {
    setSelectedPlayer(player);
    setIsCommentsModalOpen(true);
  };

  const handleViewStats = (player: Player) => {
    setSelectedPlayer(player);
    setIsStatsModalOpen(true);
  };

  const handleViewHistory = (player: Player) => {
    setSelectedPlayer(player);
    setIsHistoryModalOpen(true);
  };
  
  const isLoading = isActiveLoading || isInactiveLoading;

  return (
    <div className="space-y-6 h-full flex flex-col">
      <div className="flex justify-between items-center flex-shrink-0">
        <div>
          <h2 className="text-2xl font-bold">{team.name} Squad</h2>
          <p className="text-muted-foreground">
            Manage your team's players and their details
          </p>
        </div>
        <div className="flex space-x-2">
          <Dialog open={isPlayerDialogOpen} onOpenChange={setIsPlayerDialogOpen}>
            <Button 
              onClick={() => {
                setSelectedPlayer(null);
                setIsPlayerDialogOpen(true);
              }} 
              className="bg-puma-blue-500 hover:bg-puma-blue-600"
            >
              <PlusCircle className="mr-2 h-4 w-4" />
              Add Player
            </Button>
            <DialogContent className="sm:max-w-[600px] max-h-[90vh]">
              <ScrollArea className="max-h-[80vh]">
                <DialogHeader>
                  <DialogTitle>
                    {selectedPlayer ? 'Edit Player' : 'Add New Player'}
                  </DialogTitle>
                </DialogHeader>
                <div className="px-1">
                  <PlayerForm 
                    player={selectedPlayer} 
                    teamId={team.id}
                    onSubmit={handleCreatePlayer} 
                    onCancel={() => {
                      setIsPlayerDialogOpen(false);
                      setSelectedPlayer(null);
                    }}
                  />
                </div>
              </ScrollArea>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="flex-1 min-h-0">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
          <TabsList className="flex-shrink-0">
            <TabsTrigger value="active" className="flex items-center gap-2">
              Active Squad
              {activePlayers.length > 0 && (
                <Badge variant="secondary" className="ml-1">{activePlayers.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="inactive" className="flex items-center gap-2">
              Previous Players
              {inactivePlayers.length > 0 && (
                <Badge variant="secondary" className="ml-1">{inactivePlayers.length}</Badge>
              )}
            </TabsTrigger>
          </TabsList>
          
          <div className="flex-1 mt-6 min-h-0">
            <TabsContent value="active" className="h-full">
              {isLoading ? (
                <div className="text-center py-8">Loading players...</div>
              ) : activePlayers.length === 0 ? (
                <Card className="border-dashed border-2 border-muted">
                  <CardContent className="py-8 flex flex-col items-center justify-center text-center">
                    <div className="rounded-full bg-muted p-3 mb-4">
                      <Users className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <h3 className="font-semibold text-lg mb-1">No Players Yet</h3>
                    <p className="text-muted-foreground mb-4 max-w-md">
                      You haven't added any players to this team yet.
                    </p>
                    <Button 
                      onClick={() => {
                        setSelectedPlayer(null);
                        setIsPlayerDialogOpen(true);
                      }}
                      className="bg-puma-blue-500 hover:bg-puma-blue-600"
                    >
                      <PlusCircle className="mr-2 h-4 w-4" />
                      Add Your First Player
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <ScrollArea className="h-full">
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 pb-4">
                    {activePlayers.map((player) => (
                      <PlayerCard
                        key={player.id}
                        player={player}
                        onEdit={() => handleEditPlayer(player)}
                        onLeave={() => handleLeavePlayer(player)}
                        onTransfer={() => handleTransferPlayer(player)}
                        onManageParents={() => handleManageParents(player)}
                        onManageAttributes={() => handleManageAttributes(player)}
                        onManageObjectives={() => handleManageObjectives(player)}
                        onManageComments={() => handleManageComments(player)}
                        onViewStats={() => handleViewStats(player)}
                        onViewHistory={() => handleViewHistory(player)}
                      />
                    ))}

                    {/* Add Player Card */}
                    <Card className="border-dashed border-2 border-muted hover:border-puma-blue-300 transition-colors cursor-pointer h-[440px] flex items-center justify-center"
                          onClick={() => {
                            setSelectedPlayer(null);
                            setIsPlayerDialogOpen(true);
                          }}>
                      <CardContent className="py-8 flex flex-col items-center justify-center text-center">
                        <PlusCircle className="h-8 w-8 text-muted-foreground mb-2" />
                        <p className="text-sm font-medium">Add Player</p>
                      </CardContent>
                    </Card>
                  </div>
                </ScrollArea>
              )}
            </TabsContent>

            <TabsContent value="inactive" className="h-full">
              {isLoading ? (
                <div className="text-center py-8">Loading previous players...</div>
              ) : inactivePlayers.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No previous players found.
                </div>
              ) : (
                <ScrollArea className="h-full">
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 pb-4">
                    {inactivePlayers.map((player) => (
                      <PlayerCard
                        key={player.id}
                        player={player}
                        inactive={true}
                        onResurrect={() => handleResurrectPlayer(player)}
                        onDelete={() => handleDeletePlayer(player)}
                        onViewStats={() => handleViewStats(player)}
                        onViewHistory={() => handleViewHistory(player)}
                      />
                    ))}
                  </div>
                </ScrollArea>
              )}
            </TabsContent>
          </div>
        </Tabs>
      </div>

      {/* Leave Team Dialog */}
      <Dialog open={isLeaveDialogOpen} onOpenChange={setIsLeaveDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Player Leaving Team</DialogTitle>
          </DialogHeader>
          {selectedPlayer && (
            <PlayerLeaveForm
              player={selectedPlayer}
              onSubmit={(leaveDate, leaveComments) => {
                handleMarkPlayerInactive(selectedPlayer.id, leaveDate, leaveComments);
              }}
              onCancel={() => {
                setIsLeaveDialogOpen(false);
                setSelectedPlayer(null);
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Transfer Player Dialog */}
      <Dialog open={isTransferDialogOpen} onOpenChange={setIsTransferDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Transfer Player</DialogTitle>
          </DialogHeader>
          {selectedPlayer && (
            <PlayerTransferForm
              player={selectedPlayer}
              currentTeamId={team.id}
              onSubmit={handleInitiateTransfer}
              onCancel={() => {
                setIsTransferDialogOpen(false);
                setSelectedPlayer(null);
              }}
            />
          )}
        </DialogContent>
      </Dialog>
      
      {/* Parent Management Modal */}
      {selectedPlayer && (
        <PlayerParentModal
          player={selectedPlayer}
          isOpen={isParentModalOpen}
          onClose={() => {
            setIsParentModalOpen(false);
            setSelectedPlayer(null);
          }}
        />
      )}
      
      {/* Player Attributes Modal */}
      {selectedPlayer && (
        <PlayerAttributesModal
          player={selectedPlayer}
          isOpen={isAttributesModalOpen}
          onClose={() => {
            setIsAttributesModalOpen(false);
            setSelectedPlayer(null);
          }}
          onSave={(updatedAttributes) => {
            updatePlayerMutation.mutate({
              id: selectedPlayer.id,
              data: { attributes: updatedAttributes }
            });
            setIsAttributesModalOpen(false);
            setSelectedPlayer(null);
          }}
        />
      )}
      
      {/* Player Objectives Modal */}
      {selectedPlayer && (
        <PlayerObjectivesModal
          player={selectedPlayer}
          isOpen={isObjectivesModalOpen}
          onClose={() => {
            setIsObjectivesModalOpen(false);
            setSelectedPlayer(null);
          }}
          onSave={(updatedObjectives) => {
            updatePlayerMutation.mutate({
              id: selectedPlayer.id,
              data: { objectives: updatedObjectives }
            });
            setIsObjectivesModalOpen(false);
            setSelectedPlayer(null);
          }}
        />
      )}
      
      {/* Player Comments Modal */}
      {selectedPlayer && (
        <PlayerCommentsModal
          player={selectedPlayer}
          isOpen={isCommentsModalOpen}
          onClose={() => {
            setIsCommentsModalOpen(false);
            setSelectedPlayer(null);
          }}
          onSave={(updatedComments) => {
            updatePlayerMutation.mutate({
              id: selectedPlayer.id,
              data: { comments: updatedComments }
            });
            setIsCommentsModalOpen(false);
            setSelectedPlayer(null);
          }}
        />
      )}
      
      {/* Player Stats Modal */}
      {selectedPlayer && (
        <PlayerStatsModal
          player={selectedPlayer}
          isOpen={isStatsModalOpen}
          onClose={() => {
            setIsStatsModalOpen(false);
            setSelectedPlayer(null);
          }}
        />
      )}
      
      {/* Player History Modal */}
      {selectedPlayer && (
        <PlayerHistoryModal
          player={selectedPlayer}
          isOpen={isHistoryModalOpen}
          onClose={() => {
            setIsHistoryModalOpen(false);
            setSelectedPlayer(null);
          }}
        />
      )}
    </div>
  );
};
