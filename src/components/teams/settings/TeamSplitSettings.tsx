import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Team } from '@/types';
import { TeamSplitWizard } from '../TeamSplitWizard';
import { AlertTriangle, GitBranch } from 'lucide-react';

interface TeamSplitSettingsProps {
  team: Team;
  onUpdate: (teamData: Partial<Team>) => void;
}

export const TeamSplitSettings: React.FC<TeamSplitSettingsProps> = ({ team, onUpdate }) => {
  const [showWizard, setShowWizard] = useState(false);

  return (
    <div className="space-y-6">
      {/* Warning Banner */}
      <Alert variant="destructive" className="border-2">
        <AlertTriangle className="h-5 w-5" />
        <AlertDescription className="ml-2">
          <div className="space-y-3">
            <h3 className="font-bold text-lg">⚠️ CAUTION: Irreversible Action</h3>
            
            <p className="font-semibold">Splitting this team will:</p>
            <ul className="list-disc ml-5 space-y-1">
              <li>Create new team(s) based on your configuration</li>
              <li>Permanently redistribute players between teams</li>
              <li>Cannot be undone automatically</li>
            </ul>

            <p className="font-semibold mt-4">Before proceeding, ensure you have:</p>
            <ul className="list-disc ml-5 space-y-1">
              <li>✓ Confirmed the new team structure with stakeholders</li>
              <li>✓ Notified affected players/parents</li>
              <li>✓ Reviewed player assignments carefully</li>
            </ul>

            <p className="mt-4 text-sm">
              This action requires careful consideration. Once completed, you would need to 
              manually transfer players back to reverse this.
            </p>
          </div>
        </AlertDescription>
      </Alert>

      {/* Split Description */}
      <div className="rounded-lg border bg-card p-6">
        <div className="flex items-start gap-4">
          <div className="rounded-lg bg-primary/10 p-3">
            <GitBranch className="h-6 w-6 text-primary" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-lg mb-2">Split Team</h3>
            <p className="text-muted-foreground mb-4">
              Split this team into multiple teams for the new season or to separate age groups. 
              You can distribute players between the new teams and configure each team's settings.
            </p>
            <p className="text-sm text-muted-foreground mb-4">
              <strong>Note:</strong> This is typically used when:
            </p>
            <ul className="text-sm text-muted-foreground list-disc ml-5 space-y-1 mb-4">
              <li>Starting a new season with different age group divisions</li>
              <li>Separating players into competitive and development teams</li>
              <li>Creating multiple teams from a large squad</li>
            </ul>
            <Button 
              onClick={() => setShowWizard(true)}
              variant="destructive"
              size="lg"
            >
              <GitBranch className="mr-2 h-4 w-4" />
              Split Team
            </Button>
          </div>
        </div>
      </div>

      {/* Split Wizard Dialog */}
      {showWizard && (
        <TeamSplitWizard
          team={team}
          isOpen={showWizard}
          onClose={() => setShowWizard(false)}
          onComplete={() => {
            setShowWizard(false);
            // Refresh or notify parent component
          }}
        />
      )}
    </div>
  );
};
