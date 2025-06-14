
import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { invitationProcessingService } from '@/services/invitationProcessingService';
import { useToast } from '@/hooks/use-toast';

export const useInvitationProcessing = () => {
  const { user, profile } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    const processInvitation = async () => {
      if (!user || !user.email) return;

      console.log('Checking for pending invitations for user:', user.email);

      try {
        const result = await invitationProcessingService.processUserSignup(user.id, user.email);
        
        if (result.success && result.message !== 'User signed up successfully without invitation') {
          toast({
            title: 'Invitation Processed',
            description: result.message,
          });
          
          // Refresh the page to load new permissions
          window.location.reload();
        }
      } catch (error) {
        console.error('Error processing invitation:', error);
      }
    };

    // Only process once when user first logs in
    if (user && profile && !profile.roles?.length) {
      processInvitation();
    }
  }, [user, profile, toast]);
};
