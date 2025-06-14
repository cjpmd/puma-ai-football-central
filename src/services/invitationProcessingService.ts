
import { supabase } from '@/integrations/supabase/client';

export interface ProcessInvitationResult {
  success: boolean;
  message: string;
  userProfile?: any;
}

export const invitationProcessingService = {
  async processUserSignup(userId: string, email: string): Promise<ProcessInvitationResult> {
    try {
      console.log('Processing signup for user:', userId, email);

      // Check if there's a pending invitation for this email
      const { data: invitation, error: invitationError } = await supabase
        .from('user_invitations')
        .select('*')
        .eq('email', email)
        .eq('status', 'pending')
        .single();

      if (invitationError && invitationError.code !== 'PGRST116') {
        console.error('Error checking invitation:', invitationError);
        throw invitationError;
      }

      if (!invitation) {
        console.log('No pending invitation found for email:', email);
        return {
          success: true,
          message: 'User signed up successfully without invitation'
        };
      }

      console.log('Found pending invitation:', invitation);

      // Accept the invitation
      const { error: acceptError } = await supabase
        .from('user_invitations')
        .update({
          status: 'accepted',
          accepted_by: userId,
          accepted_at: new Date().toISOString()
        })
        .eq('id', invitation.id);

      if (acceptError) {
        console.error('Error accepting invitation:', acceptError);
        throw acceptError;
      }

      // Update user profile with role
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          roles: [invitation.role]
        })
        .eq('id', userId);

      if (profileError) {
        console.error('Error updating profile roles:', profileError);
        throw profileError;
      }

      // Link to team if team_id exists
      if (invitation.team_id) {
        const { error: teamLinkError } = await supabase
          .from('user_teams')
          .insert({
            user_id: userId,
            team_id: invitation.team_id,
            role: invitation.role
          });

        if (teamLinkError) {
          console.error('Error linking user to team:', teamLinkError);
          throw teamLinkError;
        }
      }

      // Link to staff record if staff_id exists
      if (invitation.staff_id) {
        // Update the staff record with the user_id
        const { error: staffUpdateError } = await supabase
          .from('team_staff')
          .update({
            user_id: userId
          })
          .eq('id', invitation.staff_id);

        if (staffUpdateError) {
          console.error('Error updating staff record:', staffUpdateError);
          throw staffUpdateError;
        }

        // Create user_staff relationship
        const { error: userStaffError } = await supabase
          .from('user_staff')
          .insert({
            user_id: userId,
            staff_id: invitation.staff_id,
            relationship: 'self'
          });

        if (userStaffError) {
          console.error('Error creating user_staff relationship:', userStaffError);
          throw userStaffError;
        }
      }

      console.log('Successfully processed invitation for user:', userId);

      return {
        success: true,
        message: `Successfully linked account as ${invitation.role}`
      };

    } catch (error: any) {
      console.error('Error processing user signup:', error);
      return {
        success: false,
        message: error.message || 'Failed to process invitation'
      };
    }
  },

  async linkExistingUserToInvitation(invitationCode: string, userId: string): Promise<ProcessInvitationResult> {
    try {
      console.log('Linking existing user to invitation:', { invitationCode, userId });

      // Find the invitation
      const { data: invitation, error: invitationError } = await supabase
        .from('user_invitations')
        .select('*')
        .eq('invitation_code', invitationCode)
        .eq('status', 'pending')
        .single();

      if (invitationError) {
        console.error('Error finding invitation:', invitationError);
        throw new Error('Invalid or expired invitation code');
      }

      // Process the invitation acceptance
      return await this.processUserSignup(userId, invitation.email);

    } catch (error: any) {
      console.error('Error linking user to invitation:', error);
      return {
        success: false,
        message: error.message || 'Failed to link account to invitation'
      };
    }
  }
};
