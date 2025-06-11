
import { supabase } from '@/integrations/supabase/client';
import { Player, Parent, PlayerTransfer, AttributeHistory } from '@/types';

export const playersService = {
  async getActivePlayersByTeamId(teamId: string): Promise<Player[]> {
    console.log('Fetching active players for team:', teamId);
    
    const { data, error } = await supabase
      .from('players')
      .select('*')
      .eq('team_id', teamId)
      .eq('status', 'active')
      .order('squad_number', { ascending: true });

    if (error) {
      console.error('Error fetching players:', error);
      throw error;
    }

    // Transform database fields to match our TypeScript types
    const players = (data || []).map(player => ({
      ...player,
      teamId: player.team_id,
      squadNumber: player.squad_number,
      dateOfBirth: player.date_of_birth,
      subscriptionType: player.subscription_type as 'full_squad' | 'training' | 'trialist',
      subscriptionStatus: player.subscription_status as 'active' | 'inactive' | 'pending' | 'paused',
      kitSizes: (player.kit_sizes as any) || {},
      matchStats: (player.match_stats as any) || {},
      leaveDate: player.leave_date,
      leaveComments: player.leave_comments,
      cardDesignId: player.card_design_id,
      funStats: (player.fun_stats as Record<string, number>) || {},
      playStyle: player.play_style,
      createdAt: player.created_at,
      updatedAt: player.updated_at,
      type: player.type as 'goalkeeper' | 'outfield',
      availability: player.availability as 'green' | 'amber' | 'red',
      attributes: (player.attributes as any) || [],
      objectives: (player.objectives as any) || [],
      comments: (player.comments as any) || []
    }));

    console.log('Players fetched successfully:', players);
    return players;
  },

  async createPlayer(playerData: Partial<Player>): Promise<Player> {
    console.log('Creating player:', playerData);
    
    // Transform our TypeScript types to database field names
    const dbData = {
      name: playerData.name,
      team_id: playerData.team_id || playerData.teamId,
      squad_number: playerData.squadNumber,
      date_of_birth: playerData.dateOfBirth,
      type: playerData.type,
      subscription_type: playerData.subscriptionType,
      subscription_status: playerData.subscriptionStatus,
      availability: playerData.availability,
      kit_sizes: playerData.kit_sizes || playerData.kitSizes,
      attributes: playerData.attributes,
      objectives: playerData.objectives,
      comments: playerData.comments,
      card_design_id: playerData.cardDesignId,
      fun_stats: playerData.funStats,
      play_style: playerData.playStyle
    };
    
    const { data, error } = await supabase
      .from('players')
      .insert([dbData])
      .select()
      .single();

    if (error) {
      console.error('Error creating player:', error);
      throw error;
    }

    // Transform back to our types
    const player = {
      ...data,
      teamId: data.team_id,
      squadNumber: data.squad_number,
      dateOfBirth: data.date_of_birth,
      subscriptionType: data.subscription_type as 'full_squad' | 'training' | 'trialist',
      subscriptionStatus: data.subscription_status as 'active' | 'inactive' | 'pending' | 'paused',
      kitSizes: (data.kit_sizes as any) || {},
      matchStats: (data.match_stats as any) || {},
      leaveDate: data.leave_date,
      leaveComments: data.leave_comments,
      cardDesignId: data.card_design_id,
      funStats: (data.fun_stats as Record<string, number>) || {},
      playStyle: data.play_style,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      type: data.type as 'goalkeeper' | 'outfield',
      availability: data.availability as 'green' | 'amber' | 'red',
      attributes: (data.attributes as any) || [],
      objectives: (data.objectives as any) || [],
      comments: (data.comments as any) || []
    };

    console.log('Player created successfully:', player);
    return player;
  },

  async updatePlayer(id: string, playerData: Partial<Player>): Promise<Player> {
    console.log('Updating player:', id, playerData);
    
    // Transform our TypeScript types to database field names
    const dbData: any = {};
    
    if (playerData.name !== undefined) dbData.name = playerData.name;
    if (playerData.squadNumber !== undefined) dbData.squad_number = playerData.squadNumber;
    if (playerData.dateOfBirth !== undefined) dbData.date_of_birth = playerData.dateOfBirth;
    if (playerData.type !== undefined) dbData.type = playerData.type;
    if (playerData.subscriptionType !== undefined) dbData.subscription_type = playerData.subscriptionType;
    if (playerData.subscriptionStatus !== undefined) dbData.subscription_status = playerData.subscriptionStatus;
    if (playerData.availability !== undefined) dbData.availability = playerData.availability;
    if (playerData.kit_sizes !== undefined || playerData.kitSizes !== undefined) {
      dbData.kit_sizes = playerData.kit_sizes || playerData.kitSizes;
    }
    if (playerData.attributes !== undefined) dbData.attributes = playerData.attributes;
    if (playerData.objectives !== undefined) dbData.objectives = playerData.objectives;
    if (playerData.comments !== undefined) dbData.comments = playerData.comments;
    if (playerData.cardDesignId !== undefined) dbData.card_design_id = playerData.cardDesignId;
    if (playerData.funStats !== undefined) dbData.fun_stats = playerData.funStats;
    if (playerData.playStyle !== undefined) dbData.play_style = playerData.playStyle;

    const { data, error } = await supabase
      .from('players')
      .update(dbData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating player:', error);
      throw error;
    }

    // Transform back to our types
    const player = {
      ...data,
      teamId: data.team_id,
      squadNumber: data.squad_number,
      dateOfBirth: data.date_of_birth,
      subscriptionType: data.subscription_type as 'full_squad' | 'training' | 'trialist',
      subscriptionStatus: data.subscription_status as 'active' | 'inactive' | 'pending' | 'paused',
      kitSizes: (data.kit_sizes as any) || {},
      matchStats: (data.match_stats as any) || {},
      leaveDate: data.leave_date,
      leaveComments: data.leave_comments,
      cardDesignId: data.card_design_id,
      funStats: (data.fun_stats as Record<string, number>) || {},
      playStyle: data.play_style,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      type: data.type as 'goalkeeper' | 'outfield',
      availability: data.availability as 'green' | 'amber' | 'red',
      attributes: (data.attributes as any) || [],
      objectives: (data.objectives as any) || [],
      comments: (data.comments as any) || []
    };

    console.log('Player updated successfully:', player);
    return player;
  },

  async deletePlayer(id: string): Promise<void> {
    console.log('Deleting player:', id);
    
    const { error } = await supabase
      .from('players')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting player:', error);
      throw error;
    }

    console.log('Player deleted successfully');
  },

  async getPlayerById(id: string): Promise<Player | null> {
    console.log('Fetching player by ID:', id);
    
    const { data, error } = await supabase
      .from('players')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      console.error('Error fetching player:', error);
      throw error;
    }

    if (!data) {
      console.log('Player not found');
      return null;
    }

    // Transform database fields to match our TypeScript types
    const player = {
      ...data,
      teamId: data.team_id,
      squadNumber: data.squad_number,
      dateOfBirth: data.date_of_birth,
      subscriptionType: data.subscription_type as 'full_squad' | 'training' | 'trialist',
      subscriptionStatus: data.subscription_status as 'active' | 'inactive' | 'pending' | 'paused',
      kitSizes: (data.kit_sizes as any) || {},
      matchStats: (data.match_stats as any) || {},
      leaveDate: data.leave_date,
      leaveComments: data.leave_comments,
      cardDesignId: data.card_design_id,
      funStats: (data.fun_stats as Record<string, number>) || {},
      playStyle: data.play_style,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      type: data.type as 'goalkeeper' | 'outfield',
      availability: data.availability as 'green' | 'amber' | 'red',
      attributes: (data.attributes as any) || [],
      objectives: (data.objectives as any) || [],
      comments: (data.comments as any) || []
    };

    console.log('Player fetched by ID:', player);
    return player;
  },

  // Parent management methods
  async getParentsByPlayerId(playerId: string): Promise<Parent[]> {
    console.log('Fetching parents for player:', playerId);
    
    const { data, error } = await supabase
      .from('parents')
      .select('*')
      .eq('player_id', playerId);

    if (error) {
      console.error('Error fetching parents:', error);
      throw error;
    }

    // Transform database fields to match our TypeScript types
    const parents = (data || []).map(parent => ({
      ...parent,
      playerId: parent.player_id,
      linkCode: parent.link_code,
      subscriptionType: parent.subscription_type as 'full_squad' | 'training' | 'trialist',
      subscriptionStatus: parent.subscription_status as 'active' | 'inactive' | 'pending' | 'paused',
      createdAt: parent.created_at,
      updatedAt: parent.updated_at
    }));

    console.log('Parents fetched successfully:', parents);
    return parents;
  },

  async createParent(parentData: Partial<Parent>): Promise<Parent> {
    console.log('Creating parent:', parentData);
    
    const dbData = {
      name: parentData.name,
      email: parentData.email,
      phone: parentData.phone,
      player_id: parentData.playerId,
      subscription_type: parentData.subscriptionType,
      subscription_status: parentData.subscriptionStatus
    };
    
    const { data, error } = await supabase
      .from('parents')
      .insert([dbData])
      .select()
      .single();

    if (error) {
      console.error('Error creating parent:', error);
      throw error;
    }

    const parent = {
      ...data,
      playerId: data.player_id,
      linkCode: data.link_code,
      subscriptionType: data.subscription_type as 'full_squad' | 'training' | 'trialist',
      subscriptionStatus: data.subscription_status as 'active' | 'inactive' | 'pending' | 'paused',
      createdAt: data.created_at,
      updatedAt: data.updated_at
    };

    console.log('Parent created successfully:', parent);
    return parent;
  },

  async updateParent(id: string, parentData: Partial<Parent>): Promise<Parent> {
    console.log('Updating parent:', id, parentData);
    
    const dbData: any = {};
    if (parentData.name !== undefined) dbData.name = parentData.name;
    if (parentData.email !== undefined) dbData.email = parentData.email;
    if (parentData.phone !== undefined) dbData.phone = parentData.phone;
    if (parentData.subscriptionType !== undefined) dbData.subscription_type = parentData.subscriptionType;
    if (parentData.subscriptionStatus !== undefined) dbData.subscription_status = parentData.subscriptionStatus;

    const { data, error } = await supabase
      .from('parents')
      .update(dbData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating parent:', error);
      throw error;
    }

    const parent = {
      ...data,
      playerId: data.player_id,
      linkCode: data.link_code,
      subscriptionType: data.subscription_type as 'full_squad' | 'training' | 'trialist',
      subscriptionStatus: data.subscription_status as 'active' | 'inactive' | 'pending' | 'paused',
      createdAt: data.created_at,
      updatedAt: data.updated_at
    };

    console.log('Parent updated successfully:', parent);
    return parent;
  },

  async deleteParent(id: string): Promise<void> {
    console.log('Deleting parent:', id);
    
    const { error } = await supabase
      .from('parents')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting parent:', error);
      throw error;
    }

    console.log('Parent deleted successfully');
  },

  async regenerateParentLinkCode(id: string): Promise<string> {
    console.log('Regenerating link code for parent:', id);
    
    // Generate new link code (8 random bytes as hex)
    const newLinkCode = Array.from(crypto.getRandomValues(new Uint8Array(8)))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    
    const { data, error } = await supabase
      .from('parents')
      .update({ link_code: newLinkCode })
      .eq('id', id)
      .select('link_code')
      .single();

    if (error) {
      console.error('Error regenerating link code:', error);
      throw error;
    }

    console.log('Link code regenerated successfully:', data.link_code);
    return data.link_code;
  },

  // Transfer history methods
  async getTransferHistory(playerId: string): Promise<PlayerTransfer[]> {
    console.log('Fetching transfer history for player:', playerId);
    
    const { data, error } = await supabase
      .from('player_transfers')
      .select('*')
      .eq('player_id', playerId)
      .order('transfer_date', { ascending: false });

    if (error) {
      console.error('Error fetching transfer history:', error);
      throw error;
    }

    const transfers = (data || []).map(transfer => ({
      ...transfer,
      playerId: transfer.player_id,
      fromTeamId: transfer.from_team_id,
      toTeamId: transfer.to_team_id,
      transferDate: transfer.transfer_date,
      dataTransferOptions: (transfer.data_transfer_options as any) || {
        full: false,
        attributes: false,
        comments: false,
        objectives: false,
        events: false
      },
      requestedBy: transfer.requested_by,
      acceptedBy: transfer.accepted_by,
      createdAt: transfer.created_at,
      updatedAt: transfer.updated_at,
      status: transfer.status as 'pending' | 'accepted' | 'rejected'
    }));

    console.log('Transfer history fetched successfully:', transfers);
    return transfers;
  },

  // Attribute history methods
  async getAttributeHistory(playerId: string, attributeName: string): Promise<AttributeHistory[]> {
    console.log('Fetching attribute history for player:', playerId, 'attribute:', attributeName);
    
    const { data, error } = await supabase
      .from('player_attribute_history')
      .select('*')
      .eq('player_id', playerId)
      .eq('attribute_name', attributeName)
      .order('recorded_date', { ascending: false });

    if (error) {
      console.error('Error fetching attribute history:', error);
      throw error;
    }

    const history = (data || []).map(record => ({
      ...record,
      playerId: record.player_id,
      attributeName: record.attribute_name,
      attributeGroup: record.attribute_group,
      recordedDate: record.recorded_date,
      recordedBy: record.recorded_by,
      createdAt: record.created_at
    }));

    console.log('Attribute history fetched successfully:', history);
    return history;
  }
};
