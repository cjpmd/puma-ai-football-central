-- Link Broughty United Panthers 2015s team to Broughty United club
INSERT INTO club_teams (club_id, team_id)
VALUES (
  '01f1fc5b-141c-4064-b795-84543e1a8a43',  -- Broughty United club
  'd26739b1-fd46-44ca-bd35-c08fd5348e20'   -- Broughty United Panthers 2015s
)
ON CONFLICT (club_id, team_id) DO NOTHING;