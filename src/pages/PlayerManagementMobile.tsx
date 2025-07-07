
import { useState, useEffect } from 'react';
import { MobileLayout } from '@/components/layout/MobileLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, Plus, Filter } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { FifaStylePlayerCard } from '@/components/players/FifaStylePlayerCard';
import { Player, Team } from '@/types';

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
  const { teams } = useAuth();

  useEffect(() => {
    loadPlayers();
  }, [teams]);

  const loadPlayers = async () => {
    try {
      if (!teams || teams.length === 0) return;
      
      const { data, error } = await supabase
        .from('players')
        .select('*')
        .eq('team_id', teams[0].id)
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
    player.type.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Mock team data for the cards - complete Team object with all required properties
  const currentTeam: Team = teams[0] || {
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
    toast({ title: 'Edit Player', description: `Edit functionality for ${player.name} coming soon` });
  };

  const handleManageParents = (player: Player) => {
    toast({ title: 'Manage Parents', description: `Parent management for ${player.name} coming soon` });
  };

  const handleRemoveFromSquad = (player: Player) => {
    toast({ title: 'Remove Player', description: `Remove functionality for ${player.name} coming soon` });
  };

  const handleUpdatePhoto = async (player: Player, file: File) => {
    toast({ title: 'Update Photo', description: `Photo update for ${player.name} coming soon` });
  };

  const handleDeletePhoto = (player: Player) => {
    toast({ title: 'Delete Photo', description: `Photo deletion for ${player.name} coming soon` });
  };

  const handleSaveFunStats = (player: Player, stats: Record<string, number>) => {
    toast({ title: 'Save Stats', description: `Stats update for ${player.name} coming soon` });
  };

  const handleSavePlayStyle = (player: Player, playStyles: string[]) => {
    toast({ title: 'Save Play Style', description: `Play style update for ${player.name} coming soon` });
  };

  const handleSaveCardDesign = (player: Player, designId: string) => {
    toast({ title: 'Save Card Design', description: `Card design update for ${player.name} coming soon` });
  };

  const handleManageAttributes = (player: Player) => {
    toast({ title: 'Manage Attributes', description: `Attributes for ${player.name} coming soon` });
  };

  const handleManageObjectives = (player: Player) => {
    toast({ title: 'Manage Objectives', description: `Objectives for ${player.name} coming soon` });
  };

  const handleManageComments = (player: Player) => {
    toast({ title: 'Manage Comments', description: `Comments for ${player.name} coming soon` });
  };

  const handleViewStats = (player: Player) => {
    toast({ title: 'View Stats', description: `Stats for ${player.name} coming soon` });
  };

  const handleViewHistory = (player: Player) => {
    toast({ title: 'View History', description: `History for ${player.name} coming soon` });
  };

  const handleTransferPlayer = (player: Player) => {
    toast({ title: 'Transfer Player', description: `Transfer for ${player.name} coming soon` });
  };

  const handleLeaveTeam = (player: Player) => {
    toast({ title: 'Leave Team', description: `Leave team for ${player.name} coming soon` });
  };

  return (
    <MobileLayout>
      <div className="space-y-4">
        {/* Header Actions */}
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search players..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 h-12"
            />
          </div>
          <Button size="sm" variant="outline" className="h-12 px-3">
            <Filter className="h-4 w-4" />
          </Button>
          <Button size="sm" className="h-12 px-3">
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        {/* Player Count Badge */}
        <div className="flex justify-center">
          <Badge variant="secondary" className="text-sm">
            {filteredPlayers.length} player{filteredPlayers.length !== 1 ? 's' : ''}
          </Badge>
        </div>

        {/* Player Cards Grid - Scaled for Mobile */}
        <div className="space-y-4">
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
              <p className="mt-2 text-sm text-muted-foreground">Loading players...</p>
            </div>
          ) : filteredPlayers.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No players found</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 justify-items-center">
              {filteredPlayers.map((player) => (
                <div key={player.id} className="transform scale-75 origin-top">
                  <FifaStylePlayerCard
                    player={player}
                    team={currentTeam}
                    onEdit={() => toast({ title: 'Edit Player', description: `Edit functionality for ${player.name} coming soon` })}
                    onManageParents={() => toast({ title: 'Manage Parents', description: `Parent management for ${player.name} coming soon` })}
                    onRemoveFromSquad={() => toast({ title: 'Remove Player', description: `Remove functionality for ${player.name} coming soon` })}
                    onUpdatePhoto={async () => toast({ title: 'Update Photo', description: `Photo update for ${player.name} coming soon` })}
                    onDeletePhoto={() => toast({ title: 'Delete Photo', description: `Photo deletion for ${player.name} coming soon` })}
                    onSaveFunStats={() => toast({ title: 'Save Stats', description: `Stats update for ${player.name} coming soon` })}
                    onSavePlayStyle={() => toast({ title: 'Save Play Style', description: `Play style update for ${player.name} coming soon` })}
                    onSaveCardDesign={() => toast({ title: 'Save Card Design', description: `Card design update for ${player.name} coming soon` })}
                    onManageAttributes={() => toast({ title: 'Manage Attributes', description: `Attributes for ${player.name} coming soon` })}
                    onManageObjectives={() => toast({ title: 'Manage Objectives', description: `Objectives for ${player.name} coming soon` })}
                    onManageComments={() => toast({ title: 'Manage Comments', description: `Comments for ${player.name} coming soon` })}
                    onViewStats={() => toast({ title: 'View Stats', description: `Stats for ${player.name} coming soon` })}
                    onViewHistory={() => toast({ title: 'View History', description: `History for ${player.name} coming soon` })}
                    onTransferPlayer={() => toast({ title: 'Transfer Player', description: `Transfer for ${player.name} coming soon` })}
                    onLeaveTeam={() => toast({ title: 'Leave Team', description: `Leave team for ${player.name} coming soon` })}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </MobileLayout>
  );
}
