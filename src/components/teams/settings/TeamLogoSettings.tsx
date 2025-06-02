
import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LogoUpload } from '@/components/shared/LogoUpload';
import { Team } from '@/types';

interface TeamLogoSettingsProps {
  team: Team;
  onUpdate: (updates: Partial<Team>) => void;
}

export const TeamLogoSettings: React.FC<TeamLogoSettingsProps> = ({ team, onUpdate }) => {
  const [logoUrl, setLogoUrl] = useState(team.logoUrl || null);

  const handleLogoChange = (newLogoUrl: string | null) => {
    setLogoUrl(newLogoUrl);
    onUpdate({ logoUrl: newLogoUrl });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Team Logo</CardTitle>
        <CardDescription>
          Upload and manage your team's logo
        </CardDescription>
      </CardHeader>
      <CardContent>
        <LogoUpload
          currentLogoUrl={logoUrl}
          onLogoChange={handleLogoChange}
          entityType="team"
          entityId={team.id}
          entityName={team.name}
        />
      </CardContent>
    </Card>
  );
};
