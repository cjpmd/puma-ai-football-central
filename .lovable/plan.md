Plan: show POTM for all teams in Report

I’ll update the report data loading so every visible team card gets a Player of the Match selector, including teams that were synthesized from saved scores.

What will change:
1. Update `PostGameEditor.tsx` team loading
   - Keep the existing multi-team detection from `event.scores`.
   - Load players for each team from the authoritative `team_squads` table using `event_id`, `team_id`, and `team_number`.
   - Fall back to `event_selections.player_positions` if no `team_squads` rows exist.

2. Remove the “players required to show POTM” gap
   - Currently the POTM dropdown only renders when `team.players.length > 0`.
   - After the player loading fix, each team should have its own player list.
   - If a team genuinely has no players, show a disabled/empty POTM field or a short “No squad players found” message instead of silently hiding the whole POTM section.

3. Preserve existing saved POTM values
   - Continue reading/writing `scores.potm_team_1`, `scores.potm_team_2`, etc.
   - Keep `player_of_match_id` as the first selected POTM for backward compatibility.

Technical details:
- `PostGameEditor` currently synthesizes missing team cards from `scores.team_N`, but synthesized teams are created with `players: []`, so the POTM selector is hidden for those teams.
- The fix is to build a `playersByTeamNumber` map from `team_squads`, then apply it to both explicit `event_selections` teams and synthesized score-only teams.
- This should make the Report match the Team Selection and Score/Performance views for Messi/Ronaldo-style multi-category games.