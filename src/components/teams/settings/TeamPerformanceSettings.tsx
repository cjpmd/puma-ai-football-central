
import { PerformanceCategoryManager } from "../PerformanceCategoryManager";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface TeamPerformanceSettingsProps {
  teamId: string;
  onRefreshTeam?: () => void;
}

export const TeamPerformanceSettings = ({ 
  teamId,
  onRefreshTeam
}: TeamPerformanceSettingsProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Performance Categories</CardTitle>
        <CardDescription>
          Create and manage performance categories for your team. 
          Performance categories help organize players for matches and training.
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-2">
        <PerformanceCategoryManager teamId={teamId} onRefresh={onRefreshTeam} />
      </CardContent>
    </Card>
  );
};
