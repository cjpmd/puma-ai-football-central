
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
  // Extract the required props for AvailabilityDrivenSquadManagement
  const actualTeamId = teamId || event.team_id;
  
  return (
    <AvailabilityDrivenSquadManagement
      teamId={actualTeamId}
      eventId={event.id}
      isOpen={isOpen}
      onClose={onClose}
    />
  );
};
