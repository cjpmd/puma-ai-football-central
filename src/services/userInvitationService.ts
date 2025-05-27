
import { supabase } from '@/integrations/supabase/client';

export interface InviteUserData {
  email: string;
  name: string;
  role: 'staff' | 'parent' | 'player';
  teamId?: string;
  playerId?: string; // For parent linking
}

export interface UserInvitation {
  id: string;
  email: string;
  name: string;
  role: string;
  team_id?: string;
  player_id?: string;
  invitation_code: string;
  expires_at: string;
  status: 'pending' | 'accepted' | 'expired';
  created_at: string;
  invited_by: string;
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
        invited_by: (await supabase.auth.getUser()).data.user?.id
      }])
      .select()
      .single();

    if (error) {
      console.error('Error creating invitation:', error);
      throw error;
    }

    // Send invitation email
    await this.sendInvitationEmail(data);
    
    return data as UserInvitation;
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
    return (data || []) as UserInvitation[];
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
        relationship: 'self' // or 'parent' if it's a parent linking
      }]);

    if (linkError) {
      console.error('Error linking player account:', linkError);
      throw linkError;
    }
  }
};
