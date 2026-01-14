
import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Team } from '@/types';
import { Shield, Eye, EyeOff, Gamepad2, Users, LayoutGrid } from 'lucide-react';

interface TeamPrivacySettingsProps {
  team: Team;
  onUpdate: (teamData: Partial<Team>) => void;
}

interface PrivacySettings {
  showScoresToParents: boolean;
  showScoresToPlayers: boolean;
  showPlayerStatsToParents: boolean;
  showPlayerStatsToPlayers: boolean;
  hideEditButtonFromParents: boolean;
  hideTeamSelectionFromParents: boolean;
  hideMatchReportFromParents: boolean;
  hideDeleteButtonFromParents: boolean;
  hideGameDayFromParents: boolean;
  hideGameDayFromPlayers: boolean;
  hideSetupFromParents: boolean;
  hideSetupFromPlayers: boolean;
  hideFormationFromParents: boolean;
  hideFormationFromPlayers: boolean;
}

export const TeamPrivacySettings: React.FC<TeamPrivacySettingsProps> = ({ team, onUpdate }) => {
  const [settings, setSettings] = useState<PrivacySettings>({
    showScoresToParents: true,
    showScoresToPlayers: true,
    showPlayerStatsToParents: true,
    showPlayerStatsToPlayers: true,
    hideEditButtonFromParents: false,
    hideTeamSelectionFromParents: false,
    hideMatchReportFromParents: false,
    hideDeleteButtonFromParents: false,
    hideGameDayFromParents: true,
    hideGameDayFromPlayers: true,
    hideSetupFromParents: true,
    hideSetupFromPlayers: true,
    hideFormationFromParents: true,
    hideFormationFromPlayers: true
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
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;

      if (data) {
        setSettings({
          showScoresToParents: (data as any).show_scores_to_parents ?? true,
          showScoresToPlayers: (data as any).show_scores_to_players ?? true,
          showPlayerStatsToParents: (data as any).show_player_stats_to_parents ?? true,
          showPlayerStatsToPlayers: (data as any).show_player_stats_to_players ?? true,
          hideEditButtonFromParents: (data as any).hide_edit_button_from_parents ?? false,
          hideTeamSelectionFromParents: (data as any).hide_team_selection_from_parents ?? false,
          hideMatchReportFromParents: (data as any).hide_match_report_from_parents ?? false,
          hideDeleteButtonFromParents: (data as any).hide_delete_button_from_parents ?? false,
          hideGameDayFromParents: (data as any).hide_gameday_from_parents ?? true,
          hideGameDayFromPlayers: (data as any).hide_gameday_from_players ?? true,
          hideSetupFromParents: (data as any).hide_setup_from_parents ?? true,
          hideSetupFromPlayers: (data as any).hide_setup_from_players ?? true,
          hideFormationFromParents: (data as any).hide_formation_from_parents ?? true,
          hideFormationFromPlayers: (data as any).hide_formation_from_players ?? true
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
          show_player_stats_to_players: settings.showPlayerStatsToPlayers,
          hide_edit_button_from_parents: settings.hideEditButtonFromParents,
          hide_team_selection_from_parents: settings.hideTeamSelectionFromParents,
          hide_match_report_from_parents: settings.hideMatchReportFromParents,
          hide_delete_button_from_parents: settings.hideDeleteButtonFromParents,
          hide_gameday_from_parents: settings.hideGameDayFromParents,
          hide_gameday_from_players: settings.hideGameDayFromPlayers,
          hide_setup_from_parents: settings.hideSetupFromParents,
          hide_setup_from_players: settings.hideSetupFromPlayers,
          hide_formation_from_parents: settings.hideFormationFromParents,
          hide_formation_from_players: settings.hideFormationFromPlayers
        }, {
          onConflict: 'team_id'
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

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Gamepad2 className="h-4 w-4" />
              Game Day Button Visibility
            </CardTitle>
            <CardDescription>
              Control who can see the Game Day button on calendar events
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="hide-gameday-parents" className="text-sm font-medium">
                Show Game Day to parents
              </Label>
              <Switch
                id="hide-gameday-parents"
                checked={!settings.hideGameDayFromParents}
                onCheckedChange={(checked) => updateSetting('hideGameDayFromParents', !checked)}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="hide-gameday-players" className="text-sm font-medium">
                Show Game Day to players
              </Label>
              <Switch
                id="hide-gameday-players"
                checked={!settings.hideGameDayFromPlayers}
                onCheckedChange={(checked) => updateSetting('hideGameDayFromPlayers', !checked)}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Team Selection Button Visibility
            </CardTitle>
            <CardDescription>
              Control who can see the Team Selection (Set Up) button on calendar events
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="hide-setup-parents" className="text-sm font-medium">
                Show Team Selection to parents
              </Label>
              <Switch
                id="hide-setup-parents"
                checked={!settings.hideSetupFromParents}
                onCheckedChange={(checked) => updateSetting('hideSetupFromParents', !checked)}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="hide-setup-players" className="text-sm font-medium">
                Show Team Selection to players
              </Label>
              <Switch
                id="hide-setup-players"
                checked={!settings.hideSetupFromPlayers}
                onCheckedChange={(checked) => updateSetting('hideSetupFromPlayers', !checked)}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LayoutGrid className="h-4 w-4" />
              Formation Tab Visibility
            </CardTitle>
            <CardDescription>
              Control who can see the Formation tab in Team Manager
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="hide-formation-parents" className="text-sm font-medium">
                Show Formation to parents
              </Label>
              <Switch
                id="hide-formation-parents"
                checked={!settings.hideFormationFromParents}
                onCheckedChange={(checked) => updateSetting('hideFormationFromParents', !checked)}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="hide-formation-players" className="text-sm font-medium">
                Show Formation to players
              </Label>
              <Switch
                id="hide-formation-players"
                checked={!settings.hideFormationFromPlayers}
                onCheckedChange={(checked) => updateSetting('hideFormationFromPlayers', !checked)}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Other Button Visibility for Parents
            </CardTitle>
            <CardDescription>
              Control which other action buttons are visible to parent users on calendar events
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="hide-edit-parents" className="text-sm font-medium">
                Hide Edit button from parents
              </Label>
              <Switch
                id="hide-edit-parents"
                checked={settings.hideEditButtonFromParents}
                onCheckedChange={(checked) => updateSetting('hideEditButtonFromParents', checked)}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="hide-team-selection-parents" className="text-sm font-medium">
                Hide Team Selection button from parents
              </Label>
              <Switch
                id="hide-team-selection-parents"
                checked={settings.hideTeamSelectionFromParents}
                onCheckedChange={(checked) => updateSetting('hideTeamSelectionFromParents', checked)}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="hide-match-report-parents" className="text-sm font-medium">
                Hide Match Report button from parents
              </Label>
              <Switch
                id="hide-match-report-parents"
                checked={settings.hideMatchReportFromParents}
                onCheckedChange={(checked) => updateSetting('hideMatchReportFromParents', checked)}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="hide-delete-parents" className="text-sm font-medium">
                Hide Delete button from parents
              </Label>
              <Switch
                id="hide-delete-parents"
                checked={settings.hideDeleteButtonFromParents}
                onCheckedChange={(checked) => updateSetting('hideDeleteButtonFromParents', checked)}
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
