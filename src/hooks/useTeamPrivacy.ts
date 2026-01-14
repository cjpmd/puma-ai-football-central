import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface TeamPrivacySettings {
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

export const useTeamPrivacy = (teamId: string) => {
  const [settings, setSettings] = useState<TeamPrivacySettings>({
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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPrivacySettings();
  }, [teamId]);

  const loadPrivacySettings = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('team_privacy_settings')
        .select('*')
        .eq('team_id', teamId)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;

      if (data) {
        setSettings({
          showScoresToParents: data.show_scores_to_parents ?? true,
          showScoresToPlayers: data.show_scores_to_players ?? true,
          showPlayerStatsToParents: data.show_player_stats_to_parents ?? true,
          showPlayerStatsToPlayers: data.show_player_stats_to_players ?? true,
          hideEditButtonFromParents: data.hide_edit_button_from_parents ?? false,
          hideTeamSelectionFromParents: data.hide_team_selection_from_parents ?? false,
          hideMatchReportFromParents: data.hide_match_report_from_parents ?? false,
          hideDeleteButtonFromParents: data.hide_delete_button_from_parents ?? false,
          hideGameDayFromParents: data.hide_gameday_from_parents ?? true,
          hideGameDayFromPlayers: data.hide_gameday_from_players ?? true,
          hideSetupFromParents: data.hide_setup_from_parents ?? true,
          hideSetupFromPlayers: data.hide_setup_from_players ?? true,
          hideFormationFromParents: data.hide_formation_from_parents ?? true,
          hideFormationFromPlayers: data.hide_formation_from_players ?? true
        });
      }
    } catch (error) {
      console.error('Error loading team privacy settings:', error);
    } finally {
      setLoading(false);
    }
  };

  return { settings, loading };
};