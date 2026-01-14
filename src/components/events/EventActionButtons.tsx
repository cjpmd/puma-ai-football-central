import { Button } from '@/components/ui/button';
import { Edit, Users, Trophy, Trash2, ClipboardList, Gamepad2 } from 'lucide-react';
import { DatabaseEvent } from '@/types/event';
import { useTeamPrivacy } from '@/hooks/useTeamPrivacy';
import { ViewRole } from '@/contexts/SmartViewContext';

interface EventActionButtonsProps {
  event: DatabaseEvent;
  completed: boolean;
  matchType: boolean;
  currentView: ViewRole;
  onEditEvent: (event: DatabaseEvent) => void;
  onTeamSelection: (event: DatabaseEvent) => void;
  onPostGameEdit: (event: DatabaseEvent) => void;
  onDeleteEvent: (eventId: string) => void;
  onTrainingPack?: (event: DatabaseEvent) => void;
  onGameDay?: (event: DatabaseEvent) => void;
  size?: 'xs' | 'sm' | 'md';
}

export const EventActionButtons: React.FC<EventActionButtonsProps> = ({
  event,
  completed,
  matchType,
  currentView,
  onEditEvent,
  onTeamSelection,
  onPostGameEdit,
  onDeleteEvent,
  onTrainingPack,
  onGameDay,
  size = 'xs'
}) => {
  const { settings } = useTeamPrivacy(event.team_id);
  const isParent = currentView === 'parent';
  const isPlayer = currentView === 'player';
  const isTrainingEvent = event.event_type === 'training';
  const isMatchEvent = event.event_type === 'match' || event.event_type === 'friendly' || event.event_type === 'fixture';

  // Determine button classes based on size
  const buttonClass = size === 'xs' ? "h-6 w-6 p-0" : size === 'sm' ? "h-8 w-8 p-0" : "";
  const iconClass = size === 'xs' ? "h-3 w-3" : "h-4 w-4";
  const isFullSize = size === 'md';

  const shouldShowButton = (buttonType: keyof typeof settings) => {
    if (!isParent) return true; // Always show to non-parents (except specific player restrictions)
    return !settings[buttonType]; // Hide if setting is true for parents
  };

  // Check visibility for Game Day button (respects both parent and player settings)
  const shouldShowGameDay = () => {
    if (isParent && settings.hideGameDayFromParents) return false;
    if (isPlayer && settings.hideGameDayFromPlayers) return false;
    return true;
  };

  // Check visibility for Team Selection button (respects both parent and player settings)
  const shouldShowTeamSelection = () => {
    if (isParent && settings.hideSetupFromParents) return false;
    if (isPlayer && settings.hideSetupFromPlayers) return false;
    return true;
  };

  const containerClass = size === 'sm' ? "flex flex-wrap gap-1 mt-3 pt-3 border-t" : size === 'md' ? "flex gap-2 pt-3 border-t" : "flex gap-1";

  return (
    <div className={containerClass}>
      {shouldShowButton('hideEditButtonFromParents') && (
        <Button
          variant={isFullSize ? "default" : "ghost"}
          size="sm"
          className={buttonClass}
          onClick={() => onEditEvent(event)}
          title="Edit Event"
        >
          <Edit className={iconClass} />
          {isFullSize && <span className="ml-2">Edit Event</span>}
        </Button>
      )}
      
      {shouldShowTeamSelection() && (
        <Button
          variant={isFullSize ? "outline" : "ghost"}
          size="sm"
          className={buttonClass}
          onClick={() => onTeamSelection(event)}
          title="Team Selection"
        >
          <Users className={iconClass} />
          {isFullSize && <span className="ml-2">Team Selection</span>}
        </Button>
      )}
      
      {completed && matchType && shouldShowButton('hideMatchReportFromParents') && (
        <Button
          variant="ghost"
          size="sm"
          className={buttonClass}
          onClick={() => onPostGameEdit(event)}
          title="Post-Game Editor"
        >
          <Trophy className={iconClass} />
          {isFullSize && <span className="ml-2">Match Report</span>}
        </Button>
      )}

      {isTrainingEvent && onTrainingPack && (
        <Button
          variant={isFullSize ? "outline" : "ghost"}
          size="sm"
          className={buttonClass}
          onClick={() => onTrainingPack(event)}
          title="Training Pack"
        >
          <ClipboardList className={iconClass} />
          {isFullSize && <span className="ml-2">Training Pack</span>}
        </Button>
      )}

      {isMatchEvent && onGameDay && shouldShowGameDay() && (
        <Button
          variant={isFullSize ? "default" : "ghost"}
          size="sm"
          className={buttonClass}
          onClick={() => onGameDay(event)}
          title="Game Day"
        >
          <Gamepad2 className={iconClass} />
          {isFullSize && <span className="ml-2">Game Day</span>}
        </Button>
      )}
      
      {shouldShowButton('hideDeleteButtonFromParents') && (
        <Button
          variant="ghost"
          size="sm"
          className={`${buttonClass} text-red-600 hover:text-red-700`}
          onClick={() => onDeleteEvent(event.id)}
          title="Delete Event"
        >
          <Trash2 className={iconClass} />
          {isFullSize && <span className="ml-2">Delete</span>}
        </Button>
      )}
    </div>
  );
};