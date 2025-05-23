
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Team } from '@/types/team';
import { TeamStaffSettings } from './settings/TeamStaffSettings';

interface TeamStaffModalProps {
  team: Team | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (teamData: Partial<Team>) => void;
}

export const TeamStaffModal: React.FC<TeamStaffModalProps> = ({
  team,
  isOpen,
  onClose,
  onUpdate
}) => {
  if (!team || !isOpen) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[700px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Staff Management - {team.name}</DialogTitle>
          <DialogDescription>
            Manage your team's coaching staff and helpers.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6">
          <TeamStaffSettings team={team} onUpdate={onUpdate} />
        </div>
      </DialogContent>
    </Dialog>
  );
};
