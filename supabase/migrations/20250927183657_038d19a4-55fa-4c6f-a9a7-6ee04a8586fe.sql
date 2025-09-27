-- Drop existing policies if they exist to recreate them properly
DROP POLICY IF EXISTS "Club members can view year groups" ON year_groups;
DROP POLICY IF EXISTS "Club admins can manage year groups for their clubs" ON year_groups;
DROP POLICY IF EXISTS "Club officials can manage year groups" ON year_groups;
DROP POLICY IF EXISTS "Global admins can manage all year groups" ON year_groups;

-- Enable RLS on year_groups table (if not already enabled)
ALTER TABLE year_groups ENABLE ROW LEVEL SECURITY;

-- Policy for club admins to manage year groups for their clubs
CREATE POLICY "Club admins can manage year groups for their clubs" ON year_groups
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_clubs uc 
      WHERE uc.club_id = year_groups.club_id 
        AND uc.user_id = auth.uid() 
        AND uc.role = ANY(ARRAY['club_admin', 'club_chair'])
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_clubs uc 
      WHERE uc.club_id = year_groups.club_id 
        AND uc.user_id = auth.uid() 
        AND uc.role = ANY(ARRAY['club_admin', 'club_chair'])
    )
  );

-- Policy for club officials to manage year groups
CREATE POLICY "Club officials can manage year groups" ON year_groups
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM club_officials co 
      WHERE co.club_id = year_groups.club_id 
        AND co.user_id = auth.uid() 
        AND co.role = ANY(ARRAY['admin', 'manager', 'secretary'])
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM club_officials co 
      WHERE co.club_id = year_groups.club_id 
        AND co.user_id = auth.uid() 
        AND co.role = ANY(ARRAY['admin', 'manager', 'secretary'])
    )
  );

-- Policy for club members to view year groups
CREATE POLICY "Club members can view year groups" ON year_groups
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_clubs uc 
      WHERE uc.club_id = year_groups.club_id 
        AND uc.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM club_officials co 
      WHERE co.club_id = year_groups.club_id 
        AND co.user_id = auth.uid()
    )
  );

-- Policy for global admins to manage all year groups
CREATE POLICY "Global admins can manage all year groups" ON year_groups
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles p 
      WHERE p.id = auth.uid() 
        AND 'global_admin' = ANY(p.roles)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p 
      WHERE p.id = auth.uid() 
        AND 'global_admin' = ANY(p.roles)
    )
  );