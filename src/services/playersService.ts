
import { supabase } from '@/integrations/supabase/client';
import { Player, Parent } from '@/types';

export const playersService = {
  async getParentsByPlayerId(playerId: string): Promise<Parent[]> {
    try {
      // Get manually added parents from parents table
      const { data: manualParents, error: parentsError } = await supabase
        .from('parents')
        .select('*')
        .eq('player_id', playerId);

      if (parentsError) {
        console.error('Error fetching manual parents:', parentsError);
        throw parentsError;
      }

      // Get user-linked parents from user_players table
      const { data: userParents, error: userParentsError } = await supabase
        .from('user_players')
        .select(`
          id,
          relationship,
          user_id,
          profiles!inner(
            id,
            name,
            email,
            phone
          )
        `)
        .eq('player_id', playerId)
        .in('relationship', ['parent', 'guardian']);

      if (userParentsError) {
        console.error('Error fetching user parents:', userParentsError);
        throw userParentsError;
      }

      // Convert manual parents to consistent format
      const formattedManualParents: Parent[] = (manualParents || []).map(parent => ({
        id: parent.id,
        name: parent.name,
        email: parent.email,
        phone: parent.phone || '',
        playerId: parent.player_id,
        subscriptionType: parent.subscription_type,
        subscriptionStatus: parent.subscription_status,
        linkCode: parent.link_code,
        createdAt: parent.created_at,
        updatedAt: parent.updated_at,
        isUserLinked: false
      }));

      // Convert user-linked parents to consistent format
      const formattedUserParents: Parent[] = (userParents || []).map(userParent => ({
        id: userParent.id,
        name: (userParent as any).profiles.name || 'Unknown',
        email: (userParent as any).profiles.email || '',
        phone: (userParent as any).profiles.phone || '',
        playerId: playerId,
        subscriptionType: 'full_squad',
        subscriptionStatus: 'active',
        linkCode: userParent.user_id, // Use user_id as identifier for user links
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isUserLinked: true,
        userId: userParent.user_id,
        relationship: userParent.relationship
      }));

      // Combine both types of parents
      return [...formattedManualParents, ...formattedUserParents];
    } catch (error) {
      console.error('Error in getParentsByPlayerId:', error);
      throw error;
    }
  },

  async getActivePlayersByTeamId(teamId: string): Promise<Player[]> {
    try {
      const { data, error } = await supabase
        .from('players')
        .select('*')
        .eq('team_id', teamId)
        .eq('status', 'active')
        .order('name');

      if (error) throw error;
      return (data || []).map(player => ({
        ...player,
        attributes: Array.isArray(player.attributes) ? player.attributes : [],
        comments: Array.isArray(player.comments) ? player.comments : [],
        objectives: Array.isArray(player.objectives) ? player.objectives : [],
        kit_sizes: player.kit_sizes || {},
        fun_stats: player.fun_stats || {},
        match_stats: player.match_stats || {}
      }));
    } catch (error) {
      console.error('Error fetching active players:', error);
      throw error;
    }
  },

  async createPlayer(playerData: Partial<Player>): Promise<Player> {
    try {
      // Ensure required fields are present
      if (!playerData.date_of_birth || !playerData.name || !playerData.squad_number || !playerData.team_id || !playerData.type) {
        throw new Error('Missing required fields: date_of_birth, name, squad_number, team_id, and type are required');
      }

      // Convert attributes to proper format for database
      const dbPlayerData = {
        name: playerData.name,
        date_of_birth: playerData.date_of_birth,
        squad_number: playerData.squad_number,
        team_id: playerData.team_id,
        type: playerData.type,
        availability: playerData.availability || 'green',
        status: playerData.status || 'active',
        subscription_type: playerData.subscription_type || 'full_squad',
        subscription_status: playerData.subscription_status || 'active',
        attributes: playerData.attributes ? JSON.stringify(playerData.attributes) : null,
        comments: playerData.comments ? JSON.stringify(playerData.comments) : null,
        objectives: playerData.objectives ? JSON.stringify(playerData.objectives) : null,
        kit_sizes: playerData.kit_sizes ? JSON.stringify(playerData.kit_sizes) : null,
        fun_stats: playerData.fun_stats ? JSON.stringify(playerData.fun_stats) : null,
        match_stats: playerData.match_stats ? JSON.stringify(playerData.match_stats) : null,
        photo_url: playerData.photo_url || null,
        play_style: playerData.play_style || null,
        card_design_id: playerData.card_design_id || 'goldRare',
        linking_code: playerData.linking_code || null,
        performance_category_id: playerData.performance_category_id || null,
        parent_id: playerData.parent_id || null,
        leave_date: playerData.leave_date || null,
        leave_comments: playerData.leave_comments || null
      };

      const { data, error } = await supabase
        .from('players')
        .insert(dbPlayerData)
        .select()
        .single();

      if (error) throw error;
      return {
        ...data,
        attributes: Array.isArray(data.attributes) ? data.attributes : [],
        comments: Array.isArray(data.comments) ? data.comments : [],
        objectives: Array.isArray(data.objectives) ? data.objectives : [],
        kit_sizes: data.kit_sizes || {},
        fun_stats: data.fun_stats || {},
        match_stats: data.match_stats || {}
      };
    } catch (error) {
      console.error('Error creating player:', error);
      throw error;
    }
  },

  async updatePlayer(playerId: string, playerData: Partial<Player>): Promise<Player> {
    try {
      const { data, error } = await supabase
        .from('players')
        .update(playerData)
        .eq('id', playerId)
        .select()
        .single();

      if (error) throw error;
      return {
        ...data,
        attributes: Array.isArray(data.attributes) ? data.attributes : [],
        comments: Array.isArray(data.comments) ? data.comments : [],
        objectives: Array.isArray(data.objectives) ? data.objectives : [],
        kit_sizes: data.kit_sizes || {},
        fun_stats: data.fun_stats || {},
        match_stats: data.match_stats || {}
      };
    } catch (error) {
      console.error('Error updating player:', error);
      throw error;
    }
  },

  async deletePlayerPhoto(playerId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('players')
        .update({ photo_url: null })
        .eq('id', playerId);

      if (error) throw error;
    } catch (error) {
      console.error('Error deleting player photo:', error);
      throw error;
    }
  },

  async uploadPlayerPhoto(playerId: string, file: File): Promise<string> {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${playerId}-${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('player_photos')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('player_photos')
        .getPublicUrl(fileName);

      return publicUrl;
    } catch (error) {
      console.error('Error uploading player photo:', error);
      throw error;
    }
  },

  async getTransferHistory(playerId: string): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('player_transfers')
        .select('*')
        .eq('player_id', playerId)
        .order('transfer_date', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching transfer history:', error);
      throw error;
    }
  },

  async getAttributeHistory(playerId: string): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('player_attribute_history')
        .select('*')
        .eq('player_id', playerId)
        .order('recorded_date', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching attribute history:', error);
      throw error;
    }
  },

  async createParent(parentData: Partial<Parent>): Promise<void> {
    const { error } = await supabase
      .from('parents')
      .insert({
        name: parentData.name,
        email: parentData.email,
        phone: parentData.phone,
        player_id: parentData.playerId,
        subscription_type: parentData.subscriptionType,
        subscription_status: parentData.subscriptionStatus || 'active'
      });

    if (error) throw error;
  },

  async updateParent(parentId: string, parentData: Partial<Parent>): Promise<void> {
    const { error } = await supabase
      .from('parents')
      .update({
        name: parentData.name,
        email: parentData.email,
        phone: parentData.phone,
        subscription_type: parentData.subscriptionType,
        subscription_status: parentData.subscriptionStatus
      })
      .eq('id', parentId);

    if (error) throw error;
  },

  async deleteParent(parentId: string): Promise<void> {
    const { error } = await supabase
      .from('parents')
      .delete()
      .eq('id', parentId);

    if (error) throw error;
  },

  async removeUserParentLink(linkId: string): Promise<void> {
    const { error } = await supabase
      .from('user_players')
      .delete()
      .eq('id', linkId);

    if (error) throw error;
  },

  async regenerateParentLinkCode(parentId: string): Promise<string> {
    const newLinkCode = Math.random().toString(36).substring(2, 15);
    
    const { error } = await supabase
      .from('parents')
      .update({ link_code: newLinkCode })
      .eq('id', parentId);

    if (error) throw error;
    
    return newLinkCode;
  },

};
