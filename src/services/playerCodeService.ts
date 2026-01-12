import { supabase } from "@/integrations/supabase/client";

export interface PlayerWithCodes {
  id: string;
  name: string;
  squad_number: number;
  team_id: string;
  team_name: string;
  linking_code: string;
  parent_linking_code: string;
  parent_linking_code_expires_at: string;
  photo_url: string | null;
}

export const playerCodeService = {
  // Get player by linking code (for player connection)
  async getPlayerByLinkingCode(linkingCode: string): Promise<PlayerWithCodes | null> {
    const { data, error } = await supabase
      .from('players')
      .select(`
        id,
        name,
        squad_number,
        team_id,
        linking_code,
        parent_linking_code,
        parent_linking_code_expires_at,
        photo_url,
        teams!players_team_id_fkey (
          name
        )
      `)
      .eq('linking_code', linkingCode)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    
    return {
      ...data,
      team_name: data.teams?.name || 'Unknown Team'
    };
  },

  // Get player by parent linking code (for parent connection)
  async getPlayerByParentLinkingCode(parentCode: string): Promise<PlayerWithCodes | null> {
    const { data, error } = await supabase
      .from('players')
      .select(`
        id,
        name,
        squad_number,
        team_id,
        linking_code,
        parent_linking_code,
        parent_linking_code_expires_at,
        photo_url,
        teams!players_team_id_fkey (
          name
        )
      `)
      .eq('parent_linking_code', parentCode)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    
    return {
      ...data,
      team_name: data.teams?.name || 'Unknown Team'
    };
  },

  // Link user to player account
  async linkUserToPlayer(linkingCode: string): Promise<void> {
    const player = await this.getPlayerByLinkingCode(linkingCode);
    if (!player) {
      throw new Error('Invalid player linking code');
    }
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User must be authenticated to link to player');
    }
    
    // Check if user is already linked to this player
    const { data: existingLink } = await supabase
      .from('user_players')
      .select('id')
      .eq('player_id', player.id)
      .eq('user_id', user.id)
      .single();
    
    if (existingLink) {
      throw new Error('You are already linked to this player');
    }
    
    // Create player link
    const { error: linkError } = await supabase
      .from('user_players')
      .insert({
        player_id: player.id,
        user_id: user.id,
        relationship: 'self'
      });
    
    if (linkError) throw linkError;
    
    // Add user to team as player
    const { error: teamError } = await supabase
      .from('user_teams')
      .insert({
        team_id: player.team_id,
        user_id: user.id,
        role: 'team_player'
      });
    
    if (teamError) throw teamError;
  },

  // Link user to player as parent
  async linkUserToPlayerAsParent(parentCode: string): Promise<void> {
    const player = await this.getPlayerByParentLinkingCode(parentCode);
    if (!player) {
      throw new Error('Invalid parent linking code');
    }
    
    // Check if code is expired
    if (new Date(player.parent_linking_code_expires_at) < new Date()) {
      throw new Error('Parent linking code has expired');
    }
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User must be authenticated to link as parent');
    }
    
    // Check if user is already linked to this player as parent
    const { data: existingLink } = await supabase
      .from('user_players')
      .select('id')
      .eq('player_id', player.id)
      .eq('user_id', user.id)
      .eq('relationship', 'parent')
      .single();
    
    if (existingLink) {
      throw new Error('You are already linked as a parent to this player');
    }
    
    // Create parent link
    const { error: linkError } = await supabase
      .from('user_players')
      .insert({
        player_id: player.id,
        user_id: user.id,
        relationship: 'parent'
      });
    
    if (linkError) throw linkError;
    
    // Add user to team as parent
    const { error: teamError } = await supabase
      .from('user_teams')
      .insert({
        team_id: player.team_id,
        user_id: user.id,
        role: 'team_parent'
      });
    
    if (teamError) throw teamError;
  },

  // Get players with codes for a team (for admin view)
  async getPlayersWithCodesForTeam(teamId: string): Promise<PlayerWithCodes[]> {
    const { data, error } = await supabase
      .from('players')
      .select(`
        id,
        name,
        squad_number,
        team_id,
        linking_code,
        parent_linking_code,
        parent_linking_code_expires_at,
        photo_url,
        teams!players_team_id_fkey (
          name
        )
      `)
      .eq('team_id', teamId)
      .eq('status', 'active')
      .order('squad_number');
    
    if (error) throw error;
    
    return data?.map(player => ({
      ...player,
      team_name: player.teams?.name || 'Unknown Team'
    })) || [];
  },

  // Regenerate player linking code
  async regeneratePlayerLinkingCode(playerId: string): Promise<string> {
    const newCode = Math.random().toString(36).substring(2, 18);
    
    const { error } = await supabase
      .from('players')
      .update({
        linking_code: newCode
      })
      .eq('id', playerId);
    
    if (error) throw error;
    
    return newCode;
  },

  // Regenerate parent linking code
  async regenerateParentLinkingCode(playerId: string): Promise<string> {
    const { data: newCode, error } = await supabase.rpc('generate_parent_linking_code');
    
    if (error) throw error;
    
    const { error: updateError } = await supabase
      .from('players')
      .update({
      parent_linking_code: newCode,
      parent_linking_code_expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days expiry
    })
      .eq('id', playerId);
    
    if (updateError) throw updateError;
    
    return newCode;
  }
};