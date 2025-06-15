
import { supabase } from '@/integrations/supabase/client';

export interface InviteUserData {
  email: string;
  name: string;
  role: 'staff' | 'parent' | 'player';
  teamId?: string;
  playerId?: string; // For parent linking
  staffId?: string; // For staff linking
}

export interface UserInvitation {
  id: string;
  email: string;
  name: string;
  role: string;
  team_id?: string;
  player_id?: string;
  staff_id?: string;
  invitation_code: string;
  expires_at: string;
  status: 'pending' | 'accepted' | 'expired';
  created_at: string;
  invited_by: string;
  accepted_by?: string;
  accepted_at?: string;
}

export const userInvitationService = {
  async inviteUser(inviteData: InviteUserData): Promise<UserInvitation> {
    console.log('Inviting user:', inviteData);
    
    const { data, error } = await supabase
      .from('user_invitations')
      .insert([{
        email: inviteData.email,
        name: inviteData.name,
        role: inviteData.role,
        team_id: inviteData.teamId,
        player_id: inviteData.playerId,
        staff_id: inviteData.staffId,
        invited_by: (await supabase.auth.getUser()).data.user?.id
      }])
      .select()
      .single();

    if (error) {
      console.error('Error creating invitation:', error);
      throw error;
    }

    // Send invitation email
    await this.sendInvitationEmail(data as unknown as UserInvitation);
    
    return data as unknown as UserInvitation;
  },

  async sendInvitationEmail(invitation: UserInvitation): Promise<void> {
    try {
      const { error } = await supabase.functions.invoke('send-invitation-email', {
        body: {
          email: invitation.email,
          name: invitation.name,
          invitationCode: invitation.invitation_code,
          role: invitation.role
        }
      });

      if (error) {
        console.error('Error sending invitation email:', error);
        throw error;
      }
    } catch (error) {
      console.error('Failed to send invitation email:', error);
      // Don't throw here, invitation was created successfully
    }
  },

  async getInvitations(): Promise<UserInvitation[]> {
    const { data, error } = await supabase
      .from('user_invitations')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []) as unknown as UserInvitation[];
  },

  async acceptInvitation(invitationCode: string, userId: string): Promise<void> {
    const { error } = await supabase
      .from('user_invitations')
      .update({ 
        status: 'accepted',
        accepted_by: userId,
        accepted_at: new Date().toISOString()
      })
      .eq('invitation_code', invitationCode)
      .eq('status', 'pending');

    if (error) {
      console.error('Error accepting invitation:', error);
      throw error;
    }
  },

  async processUserInvitation(email: string): Promise<{ processed: boolean; message: string }> {
    try {
      console.log('Processing invitation for email:', email);
      
      // Find the user's profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('email', email)
        .single();

      if (profileError || !profile) {
        return { processed: false, message: 'User profile not found' };
      }

      // Find pending invitations for this email
      const { data: invitations, error: invitationError } = await supabase
        .from('user_invitations')
        .select('*')
        .eq('email', email)
        .eq('status', 'pending');

      if (invitationError) {
        throw invitationError;
      }

      if (!invitations || invitations.length === 0) {
        return { processed: false, message: 'No pending invitations found' };
      }

      let processedCount = 0;

      for (const invitation of invitations) {
        // Update invitation status
        const { error: updateError } = await supabase
          .from('user_invitations')
          .update({
            status: 'accepted',
            accepted_by: profile.id,
            accepted_at: new Date().toISOString()
          })
          .eq('id', invitation.id);

        if (updateError) {
          console.error('Error updating invitation:', updateError);
          continue;
        }

        // Update user's profile with the role
        const updatedRoles = Array.isArray(profile.roles) 
          ? [...new Set([...profile.roles, invitation.role])]
          : [invitation.role];

        const { error: profileUpdateError } = await supabase
          .from('profiles')
          .update({ roles: updatedRoles })
          .eq('id', profile.id);

        if (profileUpdateError) {
          console.error('Error updating profile roles:', profileUpdateError);
        }

        // Create team association if team_id exists
        if (invitation.team_id) {
          const { error: teamError } = await supabase
            .from('user_teams')
            .insert([{
              user_id: profile.id,
              team_id: invitation.team_id,
              role: invitation.role
            }]);

          if (teamError && teamError.code !== '23505') { // Ignore duplicate key errors
            console.error('Error creating team association:', teamError);
          }
        }

        // Create player association if player_id exists
        if (invitation.player_id) {
          const { error: playerError } = await supabase
            .from('user_players')
            .insert([{
              user_id: profile.id,
              player_id: invitation.player_id,
              relationship: invitation.role === 'parent' ? 'parent' : 'self'
            }]);

          if (playerError && playerError.code !== '23505') { // Ignore duplicate key errors
            console.error('Error creating player association:', playerError);
          }
        }

        // Create staff association if staff_id exists
        if (invitation.staff_id) {
          const { error: staffError } = await supabase
            .from('user_staff')
            .insert([{
              user_id: profile.id,
              staff_id: invitation.staff_id,
              relationship: 'self'
            }]);

          if (staffError && staffError.code !== '23505') { // Ignore duplicate key errors
            console.error('Error creating staff association:', staffError);
          }
        }

        processedCount++;
      }

      return { 
        processed: processedCount > 0, 
        message: `Processed ${processedCount} invitation(s) for ${email}` 
      };
    } catch (error: any) {
      console.error('Error processing user invitation:', error);
      return { processed: false, message: error.message };
    }
  },

  async linkPlayerAccount(linkingCode: string, userId: string): Promise<void> {
    // Find the player with the linking code
    const { data: player, error: playerError } = await supabase
      .from('players')
      .select('*')
      .eq('linking_code', linkingCode)
      .single();

    if (playerError || !player) {
      throw new Error('Invalid linking code');
    }

    // Create the user-player relationship
    const { error: linkError } = await supabase
      .from('user_players')
      .insert([{
        user_id: userId,
        player_id: player.id,
        relationship: 'self'
      }]);

    if (linkError) {
      console.error('Error linking player account:', linkError);
      throw linkError;
    }
  },

  async linkStaffAccount(linkingCode: string, userId: string): Promise<void> {
    // Find the staff member with the linking code
    const { data: staff, error: staffError } = await supabase
      .from('team_staff')
      .select('*')
      .eq('linking_code', linkingCode)
      .single();

    if (staffError || !staff) {
      throw new Error('Invalid linking code');
    }

    // Create the user-staff relationship
    const { error: linkError } = await supabase
      .from('user_staff')
      .insert([{
        user_id: userId,
        staff_id: staff.id,
        relationship: 'self'
      }]);

    if (linkError) {
      console.error('Error linking staff account:', linkError);
      throw linkError;
    }
  }
};
