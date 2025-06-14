import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Search, Filter, Users, AlertCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { PlayerCard } from './PlayerCard';
import { PlayerForm } from './PlayerForm';
import { PlayerInvitationPrompt } from './PlayerInvitationPrompt';
import { UserInvitationModal } from '@/components/users/UserInvitationModal';
import { playersService } from '@/services/playersService';
import { Player, Team } from '@/types';
import { toast } from 'sonner';

interface PlayerManagementProps {
  team: Team;
}

export const PlayerManagement: React.FC<PlayerManagementProps> = ({ team }) => {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'outfield' | 'goalkeeper'>('all');
  const [filterAvailability, setFilterAvailability] = useState<'all' | 'green' | 'amber' | 'red'>('all');
  const [isAddingPlayer, setIsAddingPlayer] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [showInvitationPrompt, setShowInvitationPrompt] = useState(false);
  const [showInvitationModal, setShowInvitationModal] = useState(false);
  const [newlyCreatedPlayer, setNewlyCreatedPlayer] = useState<Player | null>(null);
  const [invitationType, setInvitationType] = useState<'player' | 'parent'>('player');

  useEffect(() => {
    loadPlayers();
  }, [team.id]);

  const loadPlayers = async () => {
    try {
      setLoading(true);
      const playersData = await playersService.getActivePlayersByTeamId(team.id);
      setPlayers(playersData);
    } catch (error) {
      console.error('Error loading players:', error);
      toast.error('Failed to load players');
    } finally {
      setLoading(false);
    }
  };

  const handleAddPlayer = async (playerData: Partial<Player>) => {
    try {
      const newPlayer = await playersService.createPlayer(playerData);
      setPlayers(prev => [...prev, newPlayer]);
      setIsAddingPlayer(false);
      setNewlyCreatedPlayer(newPlayer);
      setShowInvitationPrompt(true);
      toast.success('Player added successfully!');
    } catch (error) {
      console.error('Error adding player:', error);
      toast.error('Failed to add player');
    }
  };

  const handleUpdatePlayer = async (playerData: Partial<Player>) => {
    if (!selectedPlayer) return;
    
    try {
      const updatedPlayer = await playersService.updatePlayer(selectedPlayer.id, playerData);
      setPlayers(prev => prev.map(p => p.id === selectedPlayer.id ? updatedPlayer : p));
      setSelectedPlayer(null);
      toast.success('Player updated successfully!');
    } catch (error) {
      console.error('Error updating player:', error);
      toast.error('Failed to update player');
    }
  };

  const handleInvitePlayer = () => {
    setInvitationType('player');
    setShowInvitationPrompt(false);
    setShowInvitationModal(true);
  };

  const handleInviteParent = () => {
    setInvitationType('parent');
    setShowInvitationPrompt(false);
    setShowInvitationModal(true);
  };

  const handleInvitationSent = () => {
    setShowInvitationModal(false);
    setNewlyCreatedPlayer(null);
    toast.success(`Invitation sent successfully!`);
  };

  const handleSkipInvitation = () => {
    setShowInvitationPrompt(false);
    setNewlyCreatedPlayer(null);
  };

  const filteredPlayers = players.filter(player => {
    const matchesSearch = player.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         player.squadNumber.toString().includes(searchTerm);
    const matchesType = filterType === 'all' || player.type === filterType;
    const matchesAvailability = filterAvailability === 'all' || player.availability === filterAvailability;
    
    return matchesSearch && matchesType && matchesAvailability;
  });

  const getAvailabilityCounts = () => {
    return {
      green: players.filter(p => p.availability === 'green').length,
      amber: players.filter(p => p.availability === 'amber').length,
      red: players.filter(p => p.availability === 'red').length
    };
  };

  const availabilityCounts = getAvailabilityCounts();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-muted-foreground">Loading players...</div>
      </div>
    );
  }

  if (isAddingPlayer) {
    return (
      <PlayerForm
        teamId={team.id}
        onSubmit={handleAddPlayer}
        onCancel={() => setIsAddingPlayer(false)}
      />
    );
  }

  if (selectedPlayer) {
    return (
      <PlayerForm
        player={selectedPlayer}
        teamId={team.id}
        onSubmit={handleUpdatePlayer}
        onCancel={() => setSelectedPlayer(null)}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with stats */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold">Squad Management</h2>
          <p className="text-muted-foreground">{players.length} players in {team.name}</p>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
              <div className="w-2 h-2 bg-green-500 rounded-full mr-1"></div>
              {availabilityCounts.green} Available
            </Badge>
            <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
              <div className="w-2 h-2 bg-amber-500 rounded-full mr-1"></div>
              {availabilityCounts.amber} Limited
            </Badge>
            <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
              <div className="w-2 h-2 bg-red-500 rounded-full mr-1"></div>
              {availabilityCounts.red} Unavailable
            </Badge>
          </div>
          
          <Button onClick={() => setIsAddingPlayer(true)} className="bg-puma-blue-500 hover:bg-puma-blue-600">
            <Plus className="h-4 w-4 mr-2" />
            Add Player
          </Button>
        </div>
      </div>

      {/* Search and filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search by name or squad number..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            
            <Select value={filterType} onValueChange={(value: any) => setFilterType(value)}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Players</SelectItem>
                <SelectItem value="outfield">Outfield</SelectItem>
                <SelectItem value="goalkeeper">Goalkeepers</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={filterAvailability} onValueChange={(value: any) => setFilterAvailability(value)}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Filter by availability" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Availability</SelectItem>
                <SelectItem value="green">Available</SelectItem>
                <SelectItem value="amber">Limited</SelectItem>
                <SelectItem value="red">Unavailable</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Players grid */}
      {filteredPlayers.length === 0 ? (
        <Card className="border-dashed border-2 border-muted">
          <CardContent className="py-8 flex flex-col items-center justify-center text-center">
            <div className="rounded-full bg-muted p-3 mb-4">
              <Users className="h-6 w-6 text-muted-foreground" />
            </div>
            <h3 className="font-semibold text-lg mb-1">
              {searchTerm || filterType !== 'all' || filterAvailability !== 'all' ? 'No players found' : 'No players yet'}
            </h3>
            <p className="text-muted-foreground mb-4 max-w-md">
              {searchTerm || filterType !== 'all' || filterAvailability !== 'all' 
                ? 'Try adjusting your search terms or filters.' 
                : 'Get started by adding your first player to the squad.'
              }
            </p>
            {!searchTerm && filterType === 'all' && filterAvailability === 'all' && (
              <Button onClick={() => setIsAddingPlayer(true)} className="bg-puma-blue-500 hover:bg-puma-blue-600">
                <Plus className="h-4 w-4 mr-2" />
                Add First Player
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredPlayers.map((player) => (
            <PlayerCard
              key={player.id}
              player={player}
              onEdit={() => setSelectedPlayer(player)}
              onDelete={loadPlayers}
            />
          ))}
        </div>
      )}

      {/* Player Invitation Prompt */}
      <PlayerInvitationPrompt
        isOpen={showInvitationPrompt}
        onClose={() => setShowInvitationPrompt(false)}
        onInvitePlayer={handleInvitePlayer}
        onInviteParent={handleInviteParent}
        onSkip={handleSkipInvitation}
        playerName={newlyCreatedPlayer?.name || ''}
      />

      {/* User Invitation Modal */}
      <UserInvitationModal
        isOpen={showInvitationModal}
        onClose={() => setShowInvitationModal(false)}
        onInviteSent={handleInvitationSent}
        prefilledData={{
          teamId: team.id,
          playerId: newlyCreatedPlayer?.id
        }}
      />
    </div>
  );
};
