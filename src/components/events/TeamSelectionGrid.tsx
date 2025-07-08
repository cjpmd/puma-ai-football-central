
import React from 'react';
import { TeamSelectionState } from '@/types/teamSelection';

interface TeamSelectionGridProps {
  teamSelection: TeamSelectionState;
  onTeamSelectionChange: (teamSelection: TeamSelectionState) => void;
}

export const TeamSelectionGrid: React.FC<TeamSelectionGridProps> = ({
  teamSelection,
  onTeamSelectionChange
}) => {
  return (
    <div className="p-4">
      <h3 className="text-lg font-semibold mb-4">Team Selection Grid</h3>
      <p className="text-sm text-gray-600 mb-4">
        Team selection functionality will be implemented here.
      </p>
      
      {/* Basic display of current state */}
      <div className="space-y-2">
        <p><strong>Team ID:</strong> {teamSelection.teamId}</p>
        <p><strong>Event ID:</strong> {teamSelection.eventId}</p>
        <p><strong>Squad Players:</strong> {teamSelection.squadPlayers.length}</p>
        <p><strong>Periods:</strong> {teamSelection.periods.length}</p>
      </div>
    </div>
  );
};
