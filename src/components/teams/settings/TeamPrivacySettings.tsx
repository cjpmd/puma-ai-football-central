
import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Team } from '@/types';
import { Shield, Eye, EyeOff } from 'lucide-react';

interface TeamPrivacySettingsProps {
  team: Team;
  onUpdate: (teamData: Partial<Team>) => void;
}

interface PrivacySettings {
  showScoresToParents: boolean;
  showScoresToPlayers: boolean;
  showPlayerStatsToParents: boolean;
  showPlayerStatsToPlayers: boolean;
}

export const TeamPrivacySettings: React.FC<TeamPrivacySettingsProps> = ({ team, onUpdate }) => {
  const [settings, setSettings] = useState<PrivacySettings>({
    showScoresToParents: true,
    showScoresToPlayers: true,
    showPlayerStatsToParents: true,
    showPlayerStatsToPlayers: true
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadPrivacySettings();
  }, [team.id]);

  const loadPrivacySettings = async () => {
    try {
      const { data, error } = await supabase
        .from('team_privacy_settings')
        .select('*')
        .eq('team_id', team.id)
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      if (data) {
        setSettings({
          showScoresToParents: data.show_scores_to_parents ?? true,
          showScoresToPlayers: data.show_scores_to_players ?? true,
          showPlayerStatsToParents: data.show_player_stats_to_parents ?? true,
          showPlayerStatsToPlayers: data.show_player_stats_to_players ?? true
        });
      }
    } catch (error: any) {
      console.error('Error loading privacy settings:', error);
      toast.error('Failed to load privacy settings');
    }
  };

  const handleSave = async () => {
    try {
      setLoading(true);

      const { error } = await supabase
        .from('team_privacy_settings')
        .upsert({
          team_id: team.id,
          show_scores_to_parents: settings.showScoresToParents,
          show_scores_to_players: settings.showScoresToPlayers,
          show_player_stats_to_parents: settings.showPlayerStatsToParents,
          show_player_stats_to_players: settings.showPlayerStatsToPlayers
        });

      if (error) throw error;

      toast.success('Privacy settings updated successfully');
    } catch (error: any) {
      console.error('Error saving privacy settings:', error);
      toast.error('Failed to save privacy settings');
    } finally {
      setLoading(false);
    }
  };

  const updateSetting = (key: keyof PrivacySettings, value: boolean) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Privacy Settings
        </h3>
        <p className="text-sm text-muted-foreground">
          Control what information is visible to parents and players
        </p>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="h-4 w-4" />
              Score Visibility
            </CardTitle>
            <CardDescription>
              Control who can see match scores and results
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="scores-parents" className="text-sm font-medium">
                Show scores to parents
              </Label>
              <Switch
                id="scores-parents"
                checked={settings.showScoresToParents}
                onCheckedChange={(checked) => updateSetting('showScoresToParents', checked)}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="scores-players" className="text-sm font-medium">
                Show scores to players
              </Label>
              <Switch
                id="scores-players"
                checked={settings.showScoresToPlayers}
                onCheckedChange={(checked) => updateSetting('showScoresToPlayers', checked)}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <EyeOff className="h-4 w-4" />
              Player Statistics Visibility
            </CardTitle>
            <CardDescription>
              Control who can see detailed player statistics and performance data
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="stats-parents" className="text-sm font-medium">
                Show player stats to parents
              </Label>
              <Switch
                id="stats-parents"
                checked={settings.showPlayerStatsToParents}
                onCheckedChange={(checked) => updateSetting('showPlayerStatsToParents', checked)}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="stats-players" className="text-sm font-medium">
                Show player stats to players
              </Label>
              <Switch
                id="stats-players"
                checked={settings.showPlayerStatsToPlayers}
                onCheckedChange={(checked) => updateSetting('showPlayerStatsToPlayers', checked)}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={loading}>
          {loading ? 'Saving...' : 'Save Settings'}
        </Button>
      </div>
    </div>
  );
};
