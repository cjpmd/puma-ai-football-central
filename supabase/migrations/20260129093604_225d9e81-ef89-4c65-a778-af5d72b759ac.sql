-- Add audit tracking columns to user_players for debugging parent links
ALTER TABLE user_players 
ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS creation_method text;

-- Add comments for documentation
COMMENT ON COLUMN user_players.created_by IS 'User who created this link (manager, self-signup, etc.)';
COMMENT ON COLUMN user_players.creation_method IS 'How link was created: signup_code, manager_invite, manager_direct, code_link';