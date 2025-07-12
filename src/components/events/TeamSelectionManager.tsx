
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
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
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Team Selection - {event.title}</DialogTitle>
        </DialogHeader>
        <AvailabilityDrivenSquadManagement
          teamId={actualTeamId}
          eventId={event.id}
        />
      </DialogContent>
    </Dialog>
  );
};
