-- Clear all legacy team selection and player stats data to start fresh
-- This preserves players, teams, and events but removes inconsistent legacy data

-- Clear all event player stats
DELETE FROM event_player_stats WHERE id IS NOT NULL;

-- Clear all event selections 
DELETE FROM event_selections WHERE id IS NOT NULL;

-- Reset all player match stats to empty/default values
UPDATE players 
SET match_stats = jsonb_build_object(
    'totalGames', 0,
    'totalMinutes', 0, 
    'captainGames', 0,
    'playerOfTheMatchCount', 0,
    'minutesByPosition', '{}',
    'recentGames', '[]'
),
updated_at = now()
WHERE id IS NOT NULL;