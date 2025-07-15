import { supabase } from "@/integrations/supabase/client";

export interface TeamCodeUsage {
  id: string;
  team_id: string;
  code_used: string;
  user_id: string | null;
  role_joined: string;
  joined_at: string;
  created_at: string;
  ip_address: string | null;
  user_agent: string | null;
}

export interface TeamWithCode {
  id: string;
  name: string;
  team_join_code: string;
  team_join_code_expires_at: string;
  logo_url: string | null;
  club_name: string | null;
}

export const teamCodeService = {
  // Generate new team join code
  async generateTeamJoinCode(teamId: string): Promise<string> {
    const { data, error } = await supabase.rpc('generate_team_join_code', {
      team_name: 'temp' // We'll get the actual team name in the function
    });
    
    if (error) throw error;
    
    // Update the team with the new code
    const { error: updateError } = await supabase
      .from('teams')
      .update({
        team_join_code: data,
        team_join_code_expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
      })
      .eq('id', teamId);
    
    if (updateError) throw updateError;
    
    return data;
  },

  // Get team by join code
  async getTeamByJoinCode(joinCode: string): Promise<TeamWithCode | null> {
    const { data, error } = await supabase
      .from('teams')
      .select(`
        id,
        name,
        team_join_code,
        team_join_code_expires_at,
        logo_url,
        club_id,
        clubs!teams_club_id_fkey (
          name
        )
      `)
      .eq('team_join_code', joinCode)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    
    return {
      ...data,
      club_name: data.clubs?.name || null
    };
  },

  // Join team using code
  async joinTeamWithCode(
    joinCode: string, 
    role: 'player' | 'parent' | 'staff',
    additionalData?: { playerName?: string; parentName?: string; staffName?: string; email?: string }
  ): Promise<void> {
    const team = await this.getTeamByJoinCode(joinCode);
    if (!team) {
      throw new Error('Invalid join code');
    }
    
    // Check if code is expired
    if (new Date(team.team_join_code_expires_at) < new Date()) {
      throw new Error('Join code has expired');
    }
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User must be authenticated to join team');
    }
    
    // Check if user is already part of the team
    const { data: existingMembership } = await supabase
      .from('user_teams')
      .select('id')
      .eq('team_id', team.id)
      .eq('user_id', user.id)
      .single();
    
    if (existingMembership) {
      throw new Error('You are already a member of this team');
    }
    
    // Add user to team
    const { error: membershipError } = await supabase
      .from('user_teams')
      .insert({
        team_id: team.id,
        user_id: user.id,
        role: role === 'player' ? 'team_player' : 
              role === 'parent' ? 'team_parent' : 
              'team_staff'
      });
    
    if (membershipError) throw membershipError;
    
    // Create player/staff record if needed
    if (role === 'player' && additionalData?.playerName) {
      const { error: playerError } = await supabase
        .from('players')
        .insert({
          team_id: team.id,
          name: additionalData.playerName,
          date_of_birth: new Date().toISOString().split('T')[0], // Default to today, should be updated
          squad_number: 999, // Default, should be updated
          type: 'player'
        });
      
      if (playerError) throw playerError;
    }
    
    if (role === 'staff' && additionalData?.staffName && additionalData?.email) {
      const { error: staffError } = await supabase
        .from('team_staff')
        .insert({
          team_id: team.id,
          name: additionalData.staffName,
          email: additionalData.email,
          role: 'assistant'
        });
      
      if (staffError) throw staffError;
    }
    
    // Track code usage
    await this.trackCodeUsage(team.id, joinCode, user.id, role);
  },

  // Track code usage
  async trackCodeUsage(teamId: string, codeUsed: string, userId: string, role: string): Promise<void> {
    const { error } = await supabase
      .from('team_code_usage')
      .insert({
        team_id: teamId,
        code_used: codeUsed,
        user_id: userId,
        role_joined: role,
        ip_address: null, // Could be captured from request
        user_agent: navigator.userAgent
      });
    
    if (error) throw error;
  },

  // Get code usage for a team
  async getCodeUsageForTeam(teamId: string): Promise<TeamCodeUsage[]> {
    const { data, error } = await supabase
      .from('team_code_usage')
      .select('*')
      .eq('team_id', teamId)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
  },

  // Get teams with their codes (for admin view)
  async getTeamsWithCodes(): Promise<TeamWithCode[]> {
    const { data, error } = await supabase
      .from('teams')
      .select(`
        id,
        name,
        team_join_code,
        team_join_code_expires_at,
        logo_url,
        club_id,
        clubs!teams_club_id_fkey (
          name
        )
      `)
      .not('team_join_code', 'is', null)
      .order('name');
    
    if (error) throw error;
    
    return data?.map(team => ({
      ...team,
      club_name: team.clubs?.name || null
    })) || [];
  },

  // Regenerate team join code
  async regenerateTeamJoinCode(teamId: string): Promise<string> {
    const { data: team } = await supabase
      .from('teams')
      .select('name')
      .eq('id', teamId)
      .single();
    
    if (!team) throw new Error('Team not found');
    
    const { data: newCode, error } = await supabase.rpc('generate_team_join_code', {
      team_name: team.name
    });
    
    if (error) throw error;
    
    const { error: updateError } = await supabase
      .from('teams')
      .update({
        team_join_code: newCode,
        team_join_code_expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
      })
      .eq('id', teamId);
    
    if (updateError) throw updateError;
    
    return newCode;
  }
};