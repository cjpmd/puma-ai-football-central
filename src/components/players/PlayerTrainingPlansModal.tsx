import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { IndividualTrainingDashboard } from '@/components/individual-training/IndividualTrainingDashboard';
import { Player } from '@/types';
import { useAuth } from '@/contexts/AuthContext';

interface PlayerTrainingPlansModalProps {
  player: Player;
  isOpen: boolean;
  onClose: () => void;
}

export const PlayerTrainingPlansModal: React.FC<PlayerTrainingPlansModalProps> = ({
  player,
  isOpen,
  onClose
}) => {
  const { user } = useAuth();

  // Filter to show only this specific player's training plans
  const playerData = [{
    id: player.id,
    name: player.name,
    team_id: player.teamId
  }];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="text-xl">
            Training Plans - {player.name}
          </DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto">
          <IndividualTrainingDashboard 
            userId={user?.id || ''} 
            userPlayers={playerData}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};