
import { AvailabilityDrivenSquadManagement } from './AvailabilityDrivenSquadManagement';
import { EnhancedTeamSelectionManager } from './EnhancedTeamSelectionManager';
import { DatabaseEvent } from '@/types/event';

interface TeamSelectionManagerProps {
  event: DatabaseEvent;
  teamId?: string;
  isOpen: boolean;
  onClose: () => void;
}

export const TeamSelectionManager: React.FC<TeamSelectionManagerProps> = (props) => {
  // Route to the enhanced version which now uses AvailabilityDrivenSquadManagement
  return <EnhancedTeamSelectionManager {...props} />;
};
