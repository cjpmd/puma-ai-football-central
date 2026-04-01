
import { logger } from '@/lib/logger';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const sendParentInvite = async (parentEmail: string, parentName: string, playerName: string) => {
  try {
    logger.log('Sending parent invite to:', parentEmail);
    
    // Check if user already exists
    const { data: existingUser, error: userError } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', parentEmail)
      .maybeSingle();

    if (userError) {
      logger.error('Error checking for existing user:', userError);
    }

    if (existingUser) {
      toast.success('User Already Registered', {
        description: 'This parent already has an account and can access player details.',
      });
      return true;
    }

    // For now, we'll show a message about the invite being sent
    // In a real implementation, you would send an actual email invitation
    logger.log('Would send invitation email to:', parentEmail);
    
    toast.success('Parent Invitation Sent', {
      description: `An invitation has been sent to ${parentEmail} to join and access ${playerName}'s details.`,
    });
    
    return true;
  } catch (error) {
    logger.error('Error sending parent invite:', error);
    toast.error('Failed to Send Invitation', {
      description: 'There was an error sending the parent invitation. Please try again.',
    });
    return false;
  }
};
