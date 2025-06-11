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
import { Search, Users, Plus, UserPlus } from 'lucide-react';
import { PlayerForm } from './PlayerForm';
import { FifaStylePlayerCard } from './FifaStylePlayerCard';
import { PlayerParentModal } from './PlayerParentModal';

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
  const [showParentModal, setShowParentModal] = useState(false);

  // Fetch active players
  const { data: players = [], isLoading } = useQuery({
    queryKey: ['active-players', team.id],
    queryFn: () => playersService.getActivePlayersByTeamId(team.id),
  });

  // Create player mutation
  const createPlayerMutation = useMutation({
    mutationFn: (playerData: any) => playersService.createPlayer(playerData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['active-players'] });
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
      queryClient.invalidateQueries({ queryKey: ['active-players'] });
      setEditingPlayer(null);
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

  const handlePlayerSubmit = (playerData: any) => {
    if (editingPlayer) {
      updatePlayerMutation.mutate({
        id: editingPlayer.id,
        data: playerData
      });
    } else {
      createPlayerMutation.mutate({
        ...playerData,
        team_id: team.id
      });
    }
  };

  const handleEditPlayer = (player: Player) => {
    setEditingPlayer(player);
    setShowPlayerForm(true);
  };

  const handleManageParents = (player: Player) => {
    setSelectedPlayer(player);
    setShowParentModal(true);
  };

  const handleSetCaptain = (player: Player) => {
    // Implementation for setting captain
    toast({
      title: 'Captain Set',
      description: `${player.name} has been set as captain.`,
    });
  };

  const handleRemoveFromSquad = (player: Player) => {
    // Implementation for removing from squad
    toast({
      title: 'Player Removed',
      description: `${player.name} has been removed from the squad.`,
    });
  };

  const handleUpdatePhoto = async (player: Player, file: File) => {
    // Implementation for photo upload
    toast({
      title: 'Photo Updated',
      description: `${player.name}'s photo has been updated.`,
    });
  };

  const handleSaveFunStats = (player: Player, stats: Record<string, number>) => {
    updatePlayerMutation.mutate({
      id: player.id,
      data: { funStats: stats }
    });
  };

  const handleSavePlayStyle = (player: Player, playStyles: string[]) => {
    updatePlayerMutation.mutate({
      id: player.id,
      data: { playStyle: JSON.stringify(playStyles) }
    });
  };

  const handleSaveCardDesign = (player: Player, designId: string) => {
    updatePlayerMutation.mutate({
      id: player.id,
      data: { cardDesignId: designId }
    });
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
              
              <Button onClick={() => setShowPlayerForm(true)}>
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
                  onSetCaptain={handleSetCaptain}
                  onRemoveFromSquad={handleRemoveFromSquad}
                  onUpdatePhoto={handleUpdatePhoto}
                  onSaveFunStats={handleSaveFunStats}
                  onSavePlayStyle={handleSavePlayStyle}
                  onSaveCardDesign={handleSaveCardDesign}
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

      {/* Parent Management Modal */}
      {showParentModal && selectedPlayer && (
        <PlayerParentModal
          player={selectedPlayer}
          isOpen={showParentModal}
          onClose={() => {
            setShowParentModal(false);
            setSelectedPlayer(null);
          }}
        />
      )}
    </div>
  );
};
