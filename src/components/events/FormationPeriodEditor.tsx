
import React from 'react';
import { TeamSelectionState } from '@/types/teamSelection';

interface FormationPeriodEditorProps {
  teamSelection: TeamSelectionState;
  onTeamSelectionChange: (teamSelection: TeamSelectionState) => void;
}

export const FormationPeriodEditor: React.FC<FormationPeriodEditorProps> = ({
  teamSelection,
  onTeamSelectionChange
}) => {
  return (
    <div className="p-4">
      <h3 className="text-lg font-semibold mb-4">Formation Period Editor</h3>
      <p className="text-sm text-gray-600 mb-4">
        Formation period editing functionality will be implemented here.
      </p>
      
      {/* Basic display of periods */}
      <div className="space-y-2">
        {teamSelection.periods.map((period, index) => (
          <div key={period.id} className="border p-2 rounded">
            <p><strong>Period {period.periodNumber}:</strong> {period.formation}</p>
            <p><strong>Duration:</strong> {period.duration} minutes</p>
            <p><strong>Positions:</strong> {period.positions.length}</p>
          </div>
        ))}
      </div>
    </div>
  );
};
