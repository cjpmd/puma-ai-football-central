-- Extend team_privacy_settings table with button visibility controls
ALTER TABLE team_privacy_settings 
ADD COLUMN IF NOT EXISTS hide_edit_button_from_parents BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS hide_team_selection_from_parents BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS hide_match_report_from_parents BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS hide_delete_button_from_parents BOOLEAN DEFAULT FALSE;