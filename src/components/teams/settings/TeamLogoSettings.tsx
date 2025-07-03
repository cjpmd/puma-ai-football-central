
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
    
    // Update parent component immediately for UI responsiveness
    onUpdate({ logoUrl: newLogoUrl });
    
    // Force complete re-render by unmounting and remounting the component
    setLogoUrl(null);
    await new Promise(resolve => setTimeout(resolve, 100));
    setLogoUrl(newLogoUrl);
    
    // Force a complete app refresh to ensure logo displays
    setTimeout(() => {
      window.location.reload();
    }, 1000);
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
