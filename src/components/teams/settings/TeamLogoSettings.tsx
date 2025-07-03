
import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LogoUpload } from '@/components/shared/LogoUpload';
import { Team } from '@/types';
import { supabase } from '@/integrations/supabase/client';

interface TeamLogoSettingsProps {
  team: Team;
  onUpdate: (updates: Partial<Team>) => void;
}

export const TeamLogoSettings: React.FC<TeamLogoSettingsProps> = ({ team, onUpdate }) => {
  const [logoUrl, setLogoUrl] = useState(team.logoUrl || null);

  const handleLogoChange = async (newLogoUrl: string | null) => {
    console.log('TeamLogoSettings: Logo changed to:', newLogoUrl);
    setLogoUrl(newLogoUrl);
    
    // Update parent component immediately for UI responsiveness
    onUpdate({ logoUrl: newLogoUrl });
    
    // Small delay to ensure the logo upload is complete, then force UI refresh
    setTimeout(() => {
      // Force browser to refresh the logo by updating the state
      setLogoUrl(null);
      setTimeout(() => {
        setLogoUrl(newLogoUrl);
        onUpdate({ logoUrl: newLogoUrl });
      }, 100);
    }, 500);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Team Logo</CardTitle>
        <CardDescription>
          Upload and manage your team's logo. This will appear next to your team name and in the header.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <LogoUpload
          currentLogoUrl={team.logoUrl}
          onLogoChange={handleLogoChange}
          entityType="team"
          entityId={team.id}
          entityName={team.name}
        />
      </CardContent>
    </Card>
  );
};
