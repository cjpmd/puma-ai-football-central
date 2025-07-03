
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
    
    // Delay slightly to ensure database write is complete, then refresh
    setTimeout(async () => {
      try {
        const { data: freshTeam, error } = await supabase
          .from('teams')
          .select('logo_url')
          .eq('id', team.id)
          .single();
          
        if (!error && freshTeam) {
          console.log('Fresh logo URL from database:', freshTeam.logo_url);
          setLogoUrl(freshTeam.logo_url);
          onUpdate({ logoUrl: freshTeam.logo_url });
          
          // Force a page refresh to reload the logo
          window.location.reload();
        }
      } catch (error) {
        console.error('Error refreshing team logo:', error);
      }
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
