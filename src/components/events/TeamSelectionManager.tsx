
import { EnhancedTeamSelectionManager } from './EnhancedTeamSelectionManager';
import { DatabaseEvent } from '@/types/event';

export interface TeamSelectionManagerProps {
  event: DatabaseEvent;
  teamId?: string;
  isOpen: boolean;
  onClose: () => void;
}

export const TeamSelectionManager: React.FC<TeamSelectionManagerProps> = (props) => {
  // For now, route to the enhanced version
  return <EnhancedTeamSelectionManager {...props} />;
};
