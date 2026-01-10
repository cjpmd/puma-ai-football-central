import { useState, useEffect } from 'react';
import { MobileLayout } from '@/components/layout/MobileLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, Settings } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useClubContext } from '@/contexts/ClubContext';
import { useTeamContext } from '@/contexts/TeamContext';
import { FifaStylePlayerCard } from '@/components/players/FifaStylePlayerCard';
import { Player, Team } from '@/types';

// Mobile-specific components
import { PlayerActionSheet } from '@/components/players/mobile/PlayerActionSheet';
import { EditPlayerModal } from '@/components/players/mobile/EditPlayerModal';
import { PlayerStatsModal } from '@/components/players/mobile/PlayerStatsModal';
import { PlayerAttributesModal } from '@/components/players/mobile/PlayerAttributesModal';
import { PlayerObjectivesModal } from '@/components/players/mobile/PlayerObjectivesModal';
import { PlayerCommentsModal } from '@/components/players/mobile/PlayerCommentsModal';
import { PlayerHistoryModal } from '@/components/players/mobile/PlayerHistoryModal';
import { PlayerParentsModal } from '@/components/players/mobile/PlayerParentsModal';
import { PlayerTrainingPlansModal } from '@/components/players/PlayerTrainingPlansModal';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

// Use the actual database player type
type DatabasePlayerRow = {
  id: string;
  name: string;
  squad_number: number;
  team_id: string;
  availability: string;
  type: string;
  date_of_birth: string;
  attributes?: any;
  objectives?: any;
  comments?: any;
  match_stats?: any;
  kit_sizes?: any;
  subscription_type?: string;
  subscription_status?: string;
  status?: string;
  leave_date?: string;
  leave_comments?: string;
  performance_category_id?: string;
  photo_url?: string;
  card_design_id?: string;
  fun_stats?: any;
  play_style?: string;
  linking_code?: string;
  parent_id?: string;
  created_at: string;
  updated_at: string;
};

export default function PlayerManagementMobile() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { filteredTeams: teams } = useClubContext();
  const { currentTeam, viewMode } = useTeamContext();

  // Modal states
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [actionSheetOpen, setActionSheetOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [statsModalOpen, setStatsModalOpen] = useState(false);
  const [attributesModalOpen, setAttributesModalOpen] = useState(false);
  const [objectivesModalOpen, setObjectivesModalOpen] = useState(false);
  const [commentsModalOpen, setCommentsModalOpen] = useState(false);
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [parentsModalOpen, setParentsModalOpen] = useState(false);
  const [trainingPlansModalOpen, setTrainingPlansModalOpen] = useState(false);

  useEffect(() => {
    loadPlayers();
  }, [currentTeam, viewMode]);

  const loadPlayers = async () => {
    try {
      // Use current team if in single mode, otherwise don't load players
      if (viewMode === 'all' || !currentTeam) {
        setPlayers([]);
        setLoading(false);
        return;
      }
      
      const { data, error } = await supabase
        .from('players')
        .select('*')
        .eq('team_id', currentTeam.id)
        .order('squad_number', { ascending: true });

      if (error) throw error;
      
      // Transform database players to display format
      const transformedPlayers: Player[] = (data || []).map((player: DatabasePlayerRow) => ({
        id: player.id,
        name: player.name,
        squadNumber: player.squad_number,
        teamId: player.team_id,
        team_id: player.team_id,
        dateOfBirth: player.date_of_birth,
        type: (player.type === 'goalkeeper' ? 'goalkeeper' : 'outfield') as 'goalkeeper' | 'outfield',
        availability: (player.availability || 'green') as 'green' | 'amber' | 'red',
        status: player.status || 'active',
        subscriptionType: (player.subscription_type || 'full_squad') as 'full_squad' | 'training' | 'trialist',
        subscriptionStatus: (player.subscription_status || 'active') as 'active' | 'inactive' | 'pending' | 'paused',
        attributes: player.attributes || [],
        objectives: player.objectives || [],
        comments: player.comments || [],
        matchStats: player.match_stats || {},
        kitSizes: player.kit_sizes || {},
        performanceCategoryId: player.performance_category_id,
        photoUrl: player.photo_url,
        cardDesignId: player.card_design_id || 'goldRare',
        funStats: player.fun_stats || {},
        playStyle: player.play_style,
        linkingCode: player.linking_code,
        parentId: player.parent_id,
        leaveDate: player.leave_date,
        leaveComments: player.leave_comments,
        createdAt: player.created_at,
        updatedAt: player.updated_at
      }));
      
      setPlayers(transformedPlayers);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to load players',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredPlayers = players.filter(player =>
    player.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    player.squadNumber?.toString().includes(searchTerm)
  );

  // Mock team data for the cards - use current team from context
  const teamForCard: Team = currentTeam || {
    id: 'mock-team-id',
    name: 'Team',
    logoUrl: undefined,
    ageGroup: 'Unknown',
    gameFormat: '11-a-side' as const,
    seasonStart: undefined,
    seasonEnd: undefined,
    subscriptionType: 'free' as const,
    kitIcons: {
      home: '',
      away: '',
      training: '',
      goalkeeper: ''
    },
    performanceCategories: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  const handleEditPlayer = (player: Player) => {
    setSelectedPlayer(player);
    setEditModalOpen(true);
    setActionSheetOpen(false);
  };

  const handleManageParents = (player: Player) => {
    setSelectedPlayer(player);
    setParentsModalOpen(true);
    setActionSheetOpen(false);
  };

  const handleRemoveFromSquad = async (player: Player) => {
    if (!confirm(`Are you sure you want to remove ${player.name} from the squad?`)) {
      return;
    }
    
    try {
      const { error } = await supabase
        .from('players')
        .update({ status: 'inactive' })
        .eq('id', player.id);

      if (error) throw error;

      toast({
        title: 'Player Removed',
        description: `${player.name} has been removed from the squad`,
      });
      
      // Reload players
      loadPlayers();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to remove player',
        variant: 'destructive',
      });
    }
  };

  const handleUpdatePhoto = async (player: Player, file: File) => {
    try {
      toast({ 
        title: 'Uploading Photo', 
        description: `Uploading photo for ${player.name}...`,
      });

      // Upload to Supabase storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${player.id}-${Math.random()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('player_photos')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data } = supabase.storage
        .from('player_photos')
        .getPublicUrl(fileName);

      // Update player with photo URL
      const { error: updateError } = await supabase
        .from('players')
        .update({ photo_url: data.publicUrl })
        .eq('id', player.id);

      if (updateError) throw updateError;

      toast({
        title: 'Photo Updated',
        description: `Photo updated for ${player.name}`,
      });
      
      loadPlayers();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update photo',
        variant: 'destructive',
      });
    }
  };

  const handleDeletePhoto = async (player: Player) => {
    if (!player.photoUrl) {
      toast({ title: 'No Photo', description: 'This player has no photo to delete' });
      return;
    }

    if (!confirm(`Are you sure you want to delete the photo for ${player.name}?`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('players')
        .update({ photo_url: null })
        .eq('id', player.id);

      if (error) throw error;

      toast({
        title: 'Photo Deleted',
        description: `Photo deleted for ${player.name}`,
      });
      
      loadPlayers();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete photo',
        variant: 'destructive',
      });
    }
  };

  const handleSaveFunStats = async (player: Player, stats: Record<string, number>) => {
    try {
      const { error } = await supabase
        .from('players')
        .update({ fun_stats: stats })
        .eq('id', player.id);

      if (error) throw error;

      toast({
        title: 'Stats Updated',
        description: `Fun stats updated for ${player.name}`,
      });
      
      loadPlayers();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update stats',
        variant: 'destructive',
      });
    }
  };

  const handleSavePlayStyle = async (player: Player, playStyles: string[]) => {
    try {
      const { error } = await supabase
        .from('players')
        .update({ play_style: JSON.stringify(playStyles) })
        .eq('id', player.id);

      if (error) throw error;

      toast({
        title: 'Play Style Updated',
        description: `Play style updated for ${player.name}`,
      });
      
      loadPlayers();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update play style',
        variant: 'destructive',
      });
    }
  };

  const handleSaveCardDesign = async (player: Player, designId: string) => {
    try {
      const { error } = await supabase
        .from('players')
        .update({ card_design_id: designId })
        .eq('id', player.id);

      if (error) throw error;

      toast({
        title: 'Card Design Updated',
        description: `Card design updated for ${player.name}`,
      });
      
      loadPlayers();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update card design',
        variant: 'destructive',
      });
    }
  };

  const handleManageAttributes = (player: Player) => {
    setSelectedPlayer(player);
    setAttributesModalOpen(true);
    setActionSheetOpen(false);
  };

  const handleManageObjectives = (player: Player) => {
    setSelectedPlayer(player);
    setObjectivesModalOpen(true);
    setActionSheetOpen(false);
  };

  const handleManageComments = (player: Player) => {
    setSelectedPlayer(player);
    setCommentsModalOpen(true);
    setActionSheetOpen(false);
  };

  const handleViewStats = (player: Player) => {
    setSelectedPlayer(player);
    setStatsModalOpen(true);
    setActionSheetOpen(false);
  };

  const handleViewHistory = (player: Player) => {
    setSelectedPlayer(player);
    setHistoryModalOpen(true);
    setActionSheetOpen(false);
  };

  const handleViewTrainingPlans = (player: Player) => {
    setSelectedPlayer(player);
    setTrainingPlansModalOpen(true);
    setActionSheetOpen(false);
  };

  const handleTransferPlayer = (player: Player) => {
    setActionSheetOpen(false);
    toast({ 
      title: 'Transfer Player', 
      description: `Transfer functionality for ${player.name} - Feature coming soon`,
    });
  };

  const handleLeaveTeam = async (player: Player) => {
    setActionSheetOpen(false);
    if (!confirm(`Are you sure ${player.name} wants to leave the team?`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('players')
        .update({ 
          status: 'left',
          leave_date: new Date().toISOString().split('T')[0],
          leave_comments: 'Left team via mobile interface'
        })
        .eq('id', player.id);

      if (error) throw error;

      toast({
        title: 'Player Left Team',
        description: `${player.name} has left the team`,
      });
      
      loadPlayers();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to process team leave',
        variant: 'destructive',
      });
    }
  };

  const handlePlayerCardClick = (player: Player) => {
    setSelectedPlayer(player);
    setActionSheetOpen(true);
  };

  return (
    <MobileLayout>
      <div className="space-y-4">
        {/* Header Actions */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or squad number..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 h-12"
          />
        </div>

        {/* Player Count Badge */}
        <div className="flex justify-center">
          <Badge variant="secondary" className="text-sm">
            {filteredPlayers.length} player{filteredPlayers.length !== 1 ? 's' : ''}
          </Badge>
        </div>

        {/* Player Cards Grid - Single Column with Max Width */}
        <div className="space-y-4">
          {loading ? (
            <div className="text-center py-8">
              <LoadingSpinner size="md" message="Loading players..." />
            </div>
          ) : filteredPlayers.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No players found</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {filteredPlayers.map((player) => (
                  <div key={player.id} className="flex justify-center">
                    <div className="w-full max-w-[300px] relative">
                      <FifaStylePlayerCard
                        player={player}
                        team={teamForCard}
                        onEdit={handleEditPlayer}
                        onManageParents={handleManageParents}
                        onRemoveFromSquad={handleRemoveFromSquad}
                        onUpdatePhoto={handleUpdatePhoto}
                        onDeletePhoto={handleDeletePhoto}
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
                    </div>
                  </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Mobile Modals */}
      {selectedPlayer && (
        <>
          <PlayerActionSheet
            player={selectedPlayer}
            isOpen={actionSheetOpen}
            onClose={() => setActionSheetOpen(false)}
            onEditPlayer={handleEditPlayer}
            onManageParents={handleManageParents}
            onManageAttributes={handleManageAttributes}
            onManageObjectives={handleManageObjectives}
            onManageComments={handleManageComments}
            onViewStats={handleViewStats}
            onViewHistory={handleViewHistory}
            onViewTrainingPlans={handleViewTrainingPlans}
            onTransferPlayer={handleTransferPlayer}
            onLeaveTeam={handleLeaveTeam}
          />
          
          <EditPlayerModal
            player={selectedPlayer}
            isOpen={editModalOpen}
            onClose={() => setEditModalOpen(false)}
            onSave={() => {
              loadPlayers();
              setEditModalOpen(false);
            }}
          />
          
          <PlayerStatsModal
            player={selectedPlayer}
            isOpen={statsModalOpen}
            onClose={() => setStatsModalOpen(false)}
          />
          
          <PlayerAttributesModal
            player={selectedPlayer}
            isOpen={attributesModalOpen}
            onClose={() => setAttributesModalOpen(false)}
            onSave={() => {
              loadPlayers();
              setAttributesModalOpen(false);
            }}
          />
          
          <PlayerObjectivesModal
            player={selectedPlayer}
            isOpen={objectivesModalOpen}
            onClose={() => setObjectivesModalOpen(false)}
            onSave={() => {
              loadPlayers();
              setObjectivesModalOpen(false);
            }}
          />
          
          <PlayerCommentsModal
            player={selectedPlayer}
            isOpen={commentsModalOpen}
            onClose={() => setCommentsModalOpen(false)}
            onSave={() => {
              loadPlayers();
              setCommentsModalOpen(false);
            }}
          />
          
          <PlayerHistoryModal
            player={selectedPlayer}
            isOpen={historyModalOpen}
            onClose={() => setHistoryModalOpen(false)}
          />
          
          <PlayerParentsModal
            player={selectedPlayer}
            isOpen={parentsModalOpen}
            onClose={() => setParentsModalOpen(false)}
            onSave={() => {
              loadPlayers();
              setParentsModalOpen(false);
            }}
          />

          <PlayerTrainingPlansModal
            player={selectedPlayer}
            isOpen={trainingPlansModalOpen}
            onClose={() => setTrainingPlansModalOpen(false)}
          />
        </>
      )}
    </MobileLayout>
  );
}
