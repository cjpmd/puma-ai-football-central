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
import { Edit, Plus, Trash2 } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ManagePlayerParents } from './ManagePlayerParents';
import { ManagePlayerAttributes } from './ManagePlayerAttributes';
import { ManagePlayerObjectives } from './ManagePlayerObjectives';
import { ManagePlayerComments } from './ManagePlayerComments';
import { ViewPlayerStats } from './ViewPlayerStats';
import { ViewPlayerHistory } from './ViewPlayerHistory';
import { ConfirmDeleteDialog } from './ConfirmDeleteDialog';
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

  const { data: players, refetch } = useQuery({
    queryKey: ['players', team.id],
    queryFn: () => playersService.getPlayersByTeamId(team.id),
  });

  useEffect(() => {
    refetch();
  }, [team.id, refetch]);

  const createPlayerMutation = useMutation(playersService.createPlayer, {
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

  const updatePlayerMutation = useMutation(playersService.updatePlayer, {
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

  const deletePlayerMutation = useMutation(playersService.deletePlayer, {
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
      await playersService.leaveTeam(player.id);
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
        await playersService.transferPlayer(player.id, newTeamId);
        await refetch();
        toast({
          title: "Player Transferred",
          description: `${player.name} has been transferred to team ${newTeamId}.`,
        });
      } else {
        toast({
          title: "Transfer Cancelled",
          description: "No Team ID provided. Transfer cancelled.",
          variant: "warning",
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
      await playersService.resurrectPlayer(player.id);
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

  const filteredPlayers = players
    ?.filter(player => player.leaveDate === null)
    .filter(player => player.name.toLowerCase().includes(searchQuery.toLowerCase())) || [];

  const inactivePlayers = players
    ?.filter(player => player.leaveDate !== null)
    .filter(player => player.name.toLowerCase().includes(searchQuery.toLowerCase())) || [];

  const handleUpdatePlayerPhoto = async (player: Player, file: File) => {
    try {
      setIsLoading(true);
      
      // Create form data for file upload
      const formData = new FormData();
      formData.append('file', file);
      formData.append('playerId', player.id);
      
      // For now, we'll create a simple blob URL as a placeholder
      // In a real implementation, you'd upload to your storage service
      const photoUrl = URL.createObjectURL(file);
      
      // Update player with new photo URL
      const updatedPlayer = { ...player, photoUrl };
      
      // Update the player in the database
      const { error } = await supabase
        .from('players')
        .update({ photo_url: photoUrl })
        .eq('id', player.id);

      if (error) throw error;

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
          <TabsTrigger value="active">Active Players</TabsTrigger>
          <TabsTrigger value="inactive">Inactive Players</TabsTrigger>
        </TabsList>
        
        <TabsContent value="active" className="space-y-4">
          <div className="flex items-center justify-between">
            <Input
              type="search"
              placeholder="Search players..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          
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
        </TabsContent>

        <TabsContent value="inactive" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Inactive Players</h3>
          </div>
          
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
        </TabsContent>

        <ManagePlayerParents
          open={isParentModalOpen}
          onOpenChange={setIsParentModalOpen}
          player={playerForParents}
          refetch={refetch}
        />

        <ManagePlayerAttributes
          open={isAttributeModalOpen}
          onOpenChange={setIsAttributeModalOpen}
          player={playerForAttributes}
          refetch={refetch}
        />

        <ManagePlayerObjectives
          open={isObjectivesModalOpen}
          onOpenChange={setIsObjectivesModalOpen}
          player={playerForObjectives}
          refetch={refetch}
        />

        <ManagePlayerComments
          open={isCommentsModalOpen}
          onOpenChange={setIsCommentsModalOpen}
          player={playerForComments}
          refetch={refetch}
        />

        <ViewPlayerStats
          open={isStatsModalOpen}
          onOpenChange={setIsStatsModalOpen}
          player={playerForStats}
        />

        <ViewPlayerHistory
          open={isHistoryModalOpen}
          onOpenChange={setIsHistoryModalOpen}
          player={playerForHistory}
        />

        <ConfirmDeleteDialog
          open={isDeleteConfirmationOpen}
          onOpenChange={setIsDeleteConfirmationOpen}
          itemName={playerToDelete?.name}
          onConfirm={confirmDeletePlayer}
        />
      </Tabs>
    </div>
  );
};
