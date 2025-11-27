-- Ensure Dundee East Girls U16s is linked to Dundee East Girls club
-- Insert into club_teams if the link doesn't already exist
INSERT INTO club_teams (club_id, team_id)
SELECT 
  'd66e1bc4-b8e0-42f6-baf2-7b83b7f93031'::uuid,
  '803d7b65-f710-4703-8a89-dc19809e2ebb'::uuid
WHERE NOT EXISTS (
  SELECT 1 FROM club_teams 
  WHERE club_id = 'd66e1bc4-b8e0-42f6-baf2-7b83b7f93031'::uuid 
  AND team_id = '803d7b65-f710-4703-8a89-dc19809e2ebb'::uuid
);