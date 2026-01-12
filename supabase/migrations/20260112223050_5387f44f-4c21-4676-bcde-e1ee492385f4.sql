-- Step 1: Fix all problematic constraints FIRST (before any deletes)

-- Fix user_invitations constraint to SET NULL on delete
ALTER TABLE public.user_invitations 
DROP CONSTRAINT IF EXISTS user_invitations_accepted_by_fkey;

ALTER TABLE public.user_invitations 
ADD CONSTRAINT user_invitations_accepted_by_fkey 
FOREIGN KEY (accepted_by) REFERENCES auth.users(id) ON DELETE SET NULL;

-- Fix team_code_usage constraint to cascade on delete
ALTER TABLE public.team_code_usage 
DROP CONSTRAINT IF EXISTS team_code_usage_user_id_fkey;

ALTER TABLE public.team_code_usage 
ADD CONSTRAINT team_code_usage_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;

-- Fix security_audit_logs constraint to SET NULL on delete
ALTER TABLE public.security_audit_logs 
DROP CONSTRAINT IF EXISTS security_audit_logs_user_id_fkey;

ALTER TABLE public.security_audit_logs 
ADD CONSTRAINT security_audit_logs_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;

-- Step 2: Now delete the users (CASCADE/SET NULL will handle related records)
DELETE FROM auth.users 
WHERE id IN (
  'c98db1da-5f7b-4450-b6f0-9055be0c69b3',
  '9eb48f9d-a697-4863-80e1-9a648ede7836'
);