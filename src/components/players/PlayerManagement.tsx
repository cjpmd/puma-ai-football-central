import React, { useState, useEffect } from 'react';
import { Player, Team, PlayerAttribute } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toast } from "@/components/ui/use-toast"
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { playersService } from '@/services/playersService';
import { PlayerCard } from './PlayerCard';
import { Edit, Plus, Trash2, ArrowUpDown } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PlayerParentModal } from './PlayerParentModal';
import { PlayerAttributesModal } from './PlayerAttributesModal';
import { PlayerObjectivesModal } from './PlayerObjectivesModal';
import { PlayerCommentsModal } from './PlayerCommentsModal';
import { PlayerStatsModal } from './PlayerStatsModal';
import { PlayerHistoryModal } from './PlayerHistoryModal';
import { supabase } from '@/integrations/supabase/client';

interface PlayerManagementProps {
  team: Team;
}

interface PlayerForm {
  name: string;
  dateOfBirth: string;
  squadNumber: number;
  position: string;
  type: 'goalkeeper' | 'outfield';
  subscriptionType: 'full_squad' | 'training' | 'trialist';
  availability: 'green' | 'amber' | 'red';
}

type SortField = 'name' | 'squadNumber' | 'subscriptionType';
type SortOrder = 'asc' | 'desc';

export const PlayerManagement: React.FC<PlayerManagementProps> = ({ team }) => {
  const [open, setOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [playerToEdit, setPlayerToEdit] = useState<Player | null>(null);
  const [form, setForm] = useState<PlayerForm>({
    name: '',
    dateOfBirth: '',
    squadNumber: 0,
    position: '',
    type: 'outfield',
    subscriptionType: 'full_squad',
    availability: 'green',
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const [isLoading, setIsLoading] = useState(false);
  const [isParentModalOpen, setIsParentModalOpen] = useState(false);
  const [playerForParents, setPlayerForParents] = useState<Player | null>(null);
  const [isAttributeModalOpen, setIsAttributeModalOpen] = useState(false);
  const [playerForAttributes, setPlayerForAttributes] = useState<Player | null>(null);
  const [isObjectivesModalOpen, setIsObjectivesModalOpen] = useState(false);
  const [playerForObjectives, setPlayerForObjectives] = useState<Player | null>(null);
  const [isCommentsModalOpen, setIsCommentsModalOpen] = useState(false);
  const [playerForComments, setPlayerForComments] = useState<Player | null>(null);
  const [isStatsModalOpen, setIsStatsModalOpen] = useState(false);
  const [playerForStats, setPlayerForStats] = useState<Player | null>(null);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [playerForHistory, setPlayerForHistory] = useState<Player | null>(null);
  const [playerToDelete, setPlayerToDelete] = useState<Player | null>(null);
  const [isDeleteConfirmationOpen, setIsDeleteConfirmationOpen] = useState(false);

  const queryClient = useQueryClient();

  const { data: players, refetch, isLoading: playersLoading, error } = useQuery({
    queryKey: ['players', team.id],
    queryFn: () => playersService.getPlayersByTeamId(team.id),
  });

  // Add debugging logs
  useEffect(() => {
    console.log('Team ID:', team.id);
    console.log('Players data:', players);
    console.log('Players loading:', playersLoading);
    console.log('Players error:', error);
  }, [team.id, players, playersLoading, error]);

  useEffect(() => {
    refetch();
  }, [team.id, refetch]);

  const createPlayerMutation = useMutation({
    mutationFn: playersService.createPlayer,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['players', team.id] });
      setOpen(false);
      setForm({
        name: '',
        dateOfBirth: '',
        squadNumber: 0,
        position: '',
        type: 'outfield',
        subscriptionType: 'full_squad',
        availability: 'green',
      });
      toast({
        title: "Player Created",
        description: "New player has been added to the team.",
      });
    },
    onError: (error) => {
      console.error("Error creating player:", error);
      toast({
        title: "Error",
        description: "Failed to create player. Please try again.",
        variant: "destructive",
      });
    },
  });

  const updatePlayerMutation = useMutation({
    mutationFn: ({ id, ...data }: { id: string } & Partial<Player>) => 
      playersService.updatePlayer(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['players', team.id] });
      setOpen(false);
      setForm({
        name: '',
        dateOfBirth: '',
        squadNumber: 0,
        position: '',
        type: 'outfield',
        subscriptionType: 'full_squad',
        availability: 'green',
      });
      toast({
        title: "Player Updated",
        description: "Player information has been updated successfully.",
      });
    },
    onError: (error) => {
      console.error("Error updating player:", error);
      toast({
        title: "Error",
        description: "Failed to update player. Please try again.",
        variant: "destructive",
      });
    },
  });

  const deletePlayerMutation = useMutation({
    mutationFn: playersService.deletePlayer,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['players', team.id] });
      setIsDeleteConfirmationOpen(false);
      setPlayerToDelete(null);
      toast({
        title: "Player Deleted",
        description: "Player has been removed from the team.",
      });
    },
    onError: (error) => {
      console.error("Error deleting player:", error);
      toast({
        title: "Error",
        description: "Failed to delete player. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const playerData = {
      ...form,
      team_id: team.id,
    };

    if (isEditMode && playerToEdit) {
      updatePlayerMutation.mutate({ id: playerToEdit.id, ...playerData });
    } else {
      createPlayerMutation.mutate(playerData);
    }
  };

  const handleEditPlayer = (player: Player) => {
    setIsEditMode(true);
    setPlayerToEdit(player);
    setForm({
      name: player.name,
      dateOfBirth: player.dateOfBirth || '',
      squadNumber: player.squadNumber || 0,
      position: player.position || '',
      type: player.type || 'outfield',
      subscriptionType: player.subscriptionType || 'full_squad',
      availability: player.availability || 'green',
    });
    setOpen(true);
  };

  const handleManageParents = (player: Player) => {
    setPlayerForParents(player);
    setIsParentModalOpen(true);
  };

  const handleManageAttributes = (player: Player) => {
    setPlayerForAttributes(player);
    setIsAttributeModalOpen(true);
  };

  const handleManageObjectives = (player: Player) => {
    setPlayerForObjectives(player);
    setIsObjectivesModalOpen(true);
  };

  const handleManageComments = (player: Player) => {
    setPlayerForComments(player);
    setIsCommentsModalOpen(true);
  };

  const handleViewStats = (player: Player) => {
    setPlayerForStats(player);
    setIsStatsModalOpen(true);
  };

  const handleViewHistory = (player: Player) => {
    setPlayerForHistory(player);
    setIsHistoryModalOpen(true);
  };

  const handleLeaveTeam = async (player: Player) => {
    try {
      setIsLoading(true);
      await playersService.updatePlayer(player.id, { 
        leaveDate: new Date().toISOString().split('T')[0] 
      });
      await refetch();
      toast({
        title: "Player Left Team",
        description: `${player.name} has been moved to inactive players.`,
      });
    } catch (error) {
      console.error("Error moving player to inactive:", error);
      toast({
        title: "Error",
        description: "Failed to move player to inactive. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleTransferPlayer = async (player: Player) => {
    try {
      setIsLoading(true);
      const newTeamId = prompt(`Enter the Team ID to transfer ${player.name} to:`);
      if (newTeamId) {
        await playersService.updatePlayer(player.id, { team_id: newTeamId });
        await refetch();
        toast({
          title: "Player Transferred",
          description: `${player.name} has been transferred to team ${newTeamId}.`,
        });
      } else {
        toast({
          title: "Transfer Cancelled",
          description: "No Team ID provided. Transfer cancelled.",
        });
      }
    } catch (error) {
      console.error("Error transferring player:", error);
      toast({
        title: "Error",
        description: "Failed to transfer player. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleResurrectPlayer = async (player: Player) => {
    try {
      setIsLoading(true);
      await playersService.updatePlayer(player.id, { leaveDate: null });
      await refetch();
      toast({
        title: "Player Resurrected",
        description: `${player.name} has been returned to active players.`,
      });
    } catch (error) {
      console.error("Error resurrecting player:", error);
      toast({
        title: "Error",
        description: "Failed to return player to active. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeletePlayer = (player: Player) => {
    setPlayerToDelete(player);
    setIsDeleteConfirmationOpen(true);
  };

  const confirmDeletePlayer = async () => {
    if (playerToDelete) {
      deletePlayerMutation.mutate(playerToDelete.id);
    }
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const sortPlayers = (playerList: Player[]) => {
    return [...playerList].sort((a, b) => {
      let aValue: string | number;
      let bValue: string | number;

      switch (sortField) {
        case 'name':
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case 'squadNumber':
          aValue = a.squadNumber || 0;
          bValue = b.squadNumber || 0;
          break;
        case 'subscriptionType':
          aValue = a.subscriptionType || '';
          bValue = b.subscriptionType || '';
          break;
        default:
          return 0;
      }

      if (sortOrder === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });
  };

  // Fix the filtering logic and add safety checks
  const filteredPlayers = sortPlayers(
    (players || [])
      .filter(player => player && player.leaveDate === null)
      .filter(player => player.name && player.name.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const inactivePlayers = sortPlayers(
    (players || [])
      .filter(player => player && player.leaveDate !== null)
      .filter(player => player.name && player.name.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  console.log('Filtered players:', filteredPlayers);
  console.log('Inactive players:', inactivePlayers);

  const handleUpdatePlayerPhoto = async (player: Player, file: File) => {
    try {
      setIsLoading(true);
      
      // Validate file type and size
      if (!file.type.startsWith('image/')) {
        toast({
          title: "Invalid File Type",
          description: "Please select an image file.",
          variant: "destructive",
        });
        return;
      }

      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        toast({
          title: "File Too Large",
          description: "Please select an image smaller than 5MB.",
          variant: "destructive",
        });
        return;
      }

      // Create a unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `${player.id}-${Date.now()}.${fileExt}`;
      
      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('player-photos')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: true
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        toast({
          title: "Upload Failed",
          description: "Failed to upload photo. Please try again.",
          variant: "destructive",
        });
        return;
      }

      // Get the public URL
      const { data: { publicUrl } } = supabase.storage
        .from('player-photos')
        .getPublicUrl(fileName);
      
      // Update the player record with the photo URL
      await playersService.updatePlayer(player.id, { photoUrl: publicUrl });
      
      // Refresh players list
      await refetch();
      
      toast({
        title: "Photo Updated",
        description: "Player photo has been updated successfully.",
      });
    } catch (error) {
      console.error('Error updating player photo:', error);
      toast({
        title: "Error",
        description: "Failed to update player photo. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Show loading state
  if (playersLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-semibold tracking-tight">Team: {team.name}</h2>
        </div>
        <div className="text-center py-8">
          Loading players...
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-semibold tracking-tight">Team: {team.name}</h2>
        </div>
        <div className="text-center py-8 text-red-600">
          Error loading players: {error.message}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-semibold tracking-tight">Team: {team.name}</h2>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button variant="default">
              <Plus className="h-4 w-4 mr-2" />
              Add Player
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>{isEditMode ? 'Edit Player' : 'Add Player'}</DialogTitle>
              <DialogDescription>
                {isEditMode ? 'Update player details.' : 'Create a new player for your team.'}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="name" className="text-right">
                  Name
                </Label>
                <Input type="text" name="name" id="name" value={form.name} onChange={handleInputChange} className="col-span-3" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="dateOfBirth" className="text-right">
                  Date of Birth
                </Label>
                <Input
                  type="date"
                  name="dateOfBirth"
                  id="dateOfBirth"
                  value={form.dateOfBirth}
                  onChange={handleInputChange}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="squadNumber" className="text-right">
                  Squad Number
                </Label>
                <Input
                  type="number"
                  name="squadNumber"
                  id="squadNumber"
                  value={form.squadNumber}
                  onChange={handleInputChange}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="position" className="text-right">
                  Position
                </Label>
                <Input type="text" name="position" id="position" value={form.position} onChange={handleInputChange} className="col-span-3" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="type" className="text-right">
                  Type
                </Label>
                <Select value={form.type} onValueChange={(value) => setForm(prev => ({ ...prev, type: value as 'goalkeeper' | 'outfield' }))}>
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="goalkeeper">Goalkeeper</SelectItem>
                    <SelectItem value="outfield">Outfield</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="subscriptionType" className="text-right">
                  Subscription
                </Label>
                <Select value={form.subscriptionType} onValueChange={(value) => setForm(prev => ({ ...prev, subscriptionType: value as 'full_squad' | 'training' | 'trialist' }))}>
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Select subscription" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="full_squad">Full Squad</SelectItem>
                    <SelectItem value="training">Training Only</SelectItem>
                    <SelectItem value="trialist">Trialist</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="availability" className="text-right">
                  Availability
                </Label>
                <Select value={form.availability} onValueChange={(value) => setForm(prev => ({ ...prev, availability: value as 'green' | 'amber' | 'red' }))}>
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Select availability" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="green">Green</SelectItem>
                    <SelectItem value="amber">Amber</SelectItem>
                    <SelectItem value="red">Red</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button type="submit" onClick={handleSubmit}>
              {isEditMode ? 'Update Player' : 'Create Player'}
            </Button>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="active" className="space-y-4">
        <TabsList>
          <TabsTrigger value="active">Active Players ({filteredPlayers.length})</TabsTrigger>
          <TabsTrigger value="inactive">Inactive Players ({inactivePlayers.length})</TabsTrigger>
        </TabsList>
        
        <TabsContent value="active" className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <Input
              type="search"
              placeholder="Search players..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="max-w-sm"
            />
            
            <div className="flex items-center gap-2">
              <Label className="text-sm font-medium">Sort by:</Label>
              <Button
                variant={sortField === 'name' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleSort('name')}
                className="flex items-center gap-1"
              >
                Name
                <ArrowUpDown className="h-3 w-3" />
              </Button>
              <Button
                variant={sortField === 'squadNumber' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleSort('squadNumber')}
                className="flex items-center gap-1"
              >
                Squad #
                <ArrowUpDown className="h-3 w-3" />
              </Button>
              <Button
                variant={sortField === 'subscriptionType' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleSort('subscriptionType')}
                className="flex items-center gap-1"
              >
                Subscription
                <ArrowUpDown className="h-3 w-3" />
              </Button>
            </div>
          </div>
          
          {filteredPlayers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {searchQuery ? 'No players found matching your search.' : 'No active players found for this team.'}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
              {filteredPlayers.map((player) => (
                <PlayerCard
                  key={player.id}
                  player={player}
                  onEdit={handleEditPlayer}
                  onManageParents={handleManageParents}
                  onManageAttributes={handleManageAttributes}
                  onManageObjectives={handleManageObjectives}
                  onManageComments={handleManageComments}
                  onViewStats={handleViewStats}
                  onViewHistory={handleViewHistory}
                  onLeave={handleLeaveTeam}
                  onTransfer={handleTransferPlayer}
                  onUpdatePhoto={handleUpdatePlayerPhoto}
                  showSubscription={true}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="inactive" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Inactive Players</h3>
          </div>
          
          {inactivePlayers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No inactive players found.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
              {inactivePlayers.map((player) => (
                <PlayerCard
                  key={player.id}
                  player={player}
                  onViewStats={handleViewStats}
                  onViewHistory={handleViewHistory}
                  onResurrect={handleResurrectPlayer}
                  onDelete={handleDeletePlayer}
                  onUpdatePhoto={handleUpdatePlayerPhoto}
                  inactive={true}
                  showSubscription={false}
                />
              ))}
            </div>
          )}
        </TabsContent>

        {/* Only render modals when there's a player selected */}
        {playerForParents && (
          <PlayerParentModal
            player={playerForParents}
            isOpen={isParentModalOpen}
            onClose={() => {
              setIsParentModalOpen(false);
              setPlayerForParents(null);
            }}
          />
        )}

        {playerForAttributes && (
          <PlayerAttributesModal
            player={playerForAttributes}
            isOpen={isAttributeModalOpen}
            onClose={() => {
              setIsAttributeModalOpen(false);
              setPlayerForAttributes(null);
            }}
            onSave={(attributes) => {
              if (playerForAttributes) {
                playersService.updatePlayer(playerForAttributes.id, { attributes });
                refetch();
              }
            }}
          />
        )}

        {playerForObjectives && (
          <PlayerObjectivesModal
            player={playerForObjectives}
            isOpen={isObjectivesModalOpen}
            onClose={() => {
              setIsObjectivesModalOpen(false);
              setPlayerForObjectives(null);
            }}
            onSave={(objectives) => {
              if (playerForObjectives) {
                playersService.updatePlayer(playerForObjectives.id, { objectives });
                refetch();
              }
            }}
          />
        )}

        {playerForComments && (
          <PlayerCommentsModal
            player={playerForComments}
            isOpen={isCommentsModalOpen}
            onClose={() => {
              setIsCommentsModalOpen(false);
              setPlayerForComments(null);
            }}
            onSave={(comments) => {
              if (playerForComments) {
                playersService.updatePlayer(playerForComments.id, { comments });
                refetch();
              }
            }}
          />
        )}

        {playerForStats && (
          <PlayerStatsModal
            player={playerForStats}
            isOpen={isStatsModalOpen}
            onClose={() => {
              setIsStatsModalOpen(false);
              setPlayerForStats(null);
            }}
          />
        )}

        {playerForHistory && (
          <PlayerHistoryModal
            player={playerForHistory}
            isOpen={isHistoryModalOpen}
            onClose={() => {
              setIsHistoryModalOpen(false);
              setPlayerForHistory(null);
            }}
          />
        )}

        {/* Simple delete confirmation dialog */}
        <Dialog open={isDeleteConfirmationOpen} onOpenChange={setIsDeleteConfirmationOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirm Delete</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete {playerToDelete?.name}? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsDeleteConfirmationOpen(false)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={confirmDeletePlayer}>
                Delete
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </Tabs>
    </div>
  );
};

export default PlayerManagement;
