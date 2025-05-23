
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Team } from '@/types/team';
import { TeamStaffSettings } from './settings/TeamStaffSettings';

interface TeamStaffModalProps {
  team: Team;
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
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[800px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Staff Management - {team.name}</DialogTitle>
          <DialogDescription>
            Manage your team's coaching staff and helpers.
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4">
          <TeamStaffSettings team={team} onUpdate={onUpdate} />
        </div>
      </DialogContent>
    </Dialog>
  );
};
