
import { AvailabilityDrivenSquadManagement } from './AvailabilityDrivenSquadManagement';
import { DatabaseEvent } from '@/types/event';

interface TeamSelectionManagerProps {
  event: DatabaseEvent;
  teamId?: string;
  isOpen: boolean;
  onClose: () => void;
}

export const TeamSelectionManager: React.FC<TeamSelectionManagerProps> = ({
  event,
  teamId,
  isOpen,
  onClose
}) => {
  // Use the availability-driven squad management directly for proper team isolation
  return (
    <AvailabilityDrivenSquadManagement
      event={event}
      teamId={teamId}
      isOpen={isOpen}
      onClose={onClose}
    />
  );
};
