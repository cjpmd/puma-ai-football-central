import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { FifaStylePlayerCard } from '@/components/players/FifaStylePlayerCard';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Player, Team } from '@/types';
import { Users, X } from 'lucide-react';

interface TeamFifaCardsModalProps {
  isOpen: boolean;
  onClose: () => void;
  teamId: string;
  teamName: string;
}

export const TeamFifaCardsModal: React.FC<TeamFifaCardsModalProps> = ({
  isOpen,
  onClose,
  teamId,
  teamName
}) => {
  const [players, setPlayers] = useState<Player[]>([]);
  const [team, setTeam] = useState<Team | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && teamId) {
      loadTeamPlayers();
    }
  }, [isOpen, teamId]);

  const loadTeamPlayers = async () => {
    try {
      setLoading(true);
      
      // Load team data and convert to proper format
      const { data: teamData, error: teamError } = await supabase
        .from('teams')
        .select('*')
        .eq('id', teamId)
        .single();

      if (teamError) throw teamError;
      
      // Convert team data to expected format (using direct assignment for simplicity)
      setTeam(teamData as any);

      // Load all players in the team and convert to proper format
      const { data: playersData, error: playersError } = await supabase
        .from('players')
        .select('*')
        .eq('team_id', teamId)
        .eq('status', 'active')
        .order('squad_number', { ascending: true });

      if (playersError) throw playersError;
      
      // Convert players data to expected format (using direct assignment for simplicity)
      setPlayers(playersData as any || []);
    } catch (error) {
      console.error('Error loading team players:', error);
      toast({
        title: 'Error',
        description: 'Failed to load team players',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-7xl h-[90vh] overflow-hidden">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-2xl flex items-center gap-2">
              <Users className="h-6 w-6" />
              {teamName} - Team FIFA Cards
            </DialogTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-muted-foreground">Loading team players...</div>
            </div>
          ) : players.length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-semibold mb-2">No Players Found</h3>
              <p className="text-muted-foreground">
                No active players found for this team.
              </p>
            </div>
          ) : (
            <>
              <div className="text-center mb-6">
                <h3 className="text-lg font-semibold text-muted-foreground">
                  {players.length} Players
                </h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 justify-items-center">
                {players.map((player) => (
                  <div key={player.id} className="w-full max-w-[280px]">
                    <FifaStylePlayerCard
                      player={player}
                      team={team}
                      // Disable all interaction buttons in this view
                      onEdit={undefined}
                      onManageParents={undefined}
                      onRemoveFromSquad={undefined}
                      onUpdatePhoto={undefined}
                      onDeletePhoto={undefined}
                      onSaveFunStats={undefined}
                      onSavePlayStyle={undefined}
                      onSaveCardDesign={undefined}
                      onManageAttributes={undefined}
                      onManageObjectives={undefined}
                      onManageComments={undefined}
                      onViewStats={undefined}
                      onViewHistory={undefined}
                      onTransferPlayer={undefined}
                      onLeaveTeam={undefined}
                    />
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};