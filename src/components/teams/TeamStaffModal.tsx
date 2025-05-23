
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Team } from '@/types/team';
import { StaffManagementModal } from './StaffManagementModal';

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
    <StaffManagementModal 
      team={team}
      isOpen={isOpen}
      onClose={onClose}
      onUpdate={onUpdate}
    />
  );
};
