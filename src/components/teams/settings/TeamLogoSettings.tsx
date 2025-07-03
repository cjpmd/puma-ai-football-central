
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
    
    // Save logo URL to database immediately
    try {
      const { error } = await supabase
        .from('teams')
        .update({ 
          logo_url: newLogoUrl,
          updated_at: new Date().toISOString()
        })
        .eq('id', team.id);

      if (error) {
        console.error('Error saving logo URL:', error);
        throw error;
      }

      console.log('Logo URL saved to database successfully');
      // Update parent component
      onUpdate({ logoUrl: newLogoUrl });
    } catch (error) {
      console.error('Error saving team logo:', error);
    }
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
