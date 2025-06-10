
import { supabase } from '@/integrations/supabase/client';
import { Player, Parent, PlayerTransfer, AttributeHistory } from '@/types';

// Helper function to transform database player record to Player type
const transformDatabasePlayerToPlayer = (dbPlayer: any): Player => {
  return {
    id: dbPlayer.id,
    name: dbPlayer.name,
    dateOfBirth: dbPlayer.date_of_birth,
    squadNumber: dbPlayer.squad_number,
    position: dbPlayer.position,
    type: dbPlayer.type,
    team_id: dbPlayer.team_id,
    availability: dbPlayer.availability,
    subscriptionType: dbPlayer.subscription_type,
    leaveDate: dbPlayer.leave_date,
    kit_sizes: dbPlayer.kit_sizes || {},
    attributes: Array.isArray(dbPlayer.attributes) ? dbPlayer.attributes : [],
    objectives: Array.isArray(dbPlayer.objectives) ? dbPlayer.objectives : [],
    comments: Array.isArray(dbPlayer.comments) ? dbPlayer.comments : [],
    matchStats: dbPlayer.match_stats || {
      totalGames: 0,
      totalMinutes: 0,
      captainGames: 0,
      playerOfTheMatchCount: 0,
      minutesByPosition: {},
      recentGames: []
    },
    photoUrl: dbPlayer.photo_url,
    subscriptionStatus: dbPlayer.subscription_status,
    status: dbPlayer.status,
    leaveComments: dbPlayer.leave_comments,
    created_at: dbPlayer.created_at,
    updated_at: dbPlayer.updated_at
  };
};

export const playersService = {
  async getPlayersByTeamId(teamId: string): Promise<Player[]> {
    console.log('Getting players for team ID:', teamId);
    
    const { data, error } = await supabase
      .from('players')
      .select('*')
      .eq('team_id', teamId)
      .order('name');

    if (error) {
      console.error('Error fetching players:', error);
      throw error;
    }

    console.log('Returning players:', data);
    return (data || []).map(transformDatabasePlayerToPlayer);
  },

  async getActivePlayersByTeamId(teamId: string): Promise<Player[]> {
    console.log('Getting active players for team ID:', teamId);
    
    const { data, error } = await supabase
      .from('players')
      .select('*')
      .eq('team_id', teamId)
      .is('leave_date', null)
      .order('name');

    if (error) {
      console.error('Error fetching active players:', error);
      throw error;
    }

    console.log('Returning active players:', data);
    return (data || []).map(transformDatabasePlayerToPlayer);
  },

  async createPlayer(playerData: Partial<Player>): Promise<Player> {
    console.log('Creating player:', playerData);
    
    const { data, error } = await supabase
      .from('players')
      .insert([{
        name: playerData.name,
        date_of_birth: playerData.dateOfBirth,
        squad_number: playerData.squadNumber,
        position: playerData.position,
        type: playerData.type,
        team_id: playerData.team_id,
        availability: playerData.availability,
        subscription_type: playerData.subscriptionType,
        kit_sizes: playerData.kit_sizes || {}
      }])
      .select()
      .single();

    if (error) {
      console.error('Error creating player:', error);
      throw error;
    }

    return transformDatabasePlayerToPlayer(data);
  },

  async getAllPlayers(): Promise<Player[]> {
    const { data, error } = await supabase
      .from('players')
      .select('*')
      .order('name');

    if (error) {
      console.error('Error fetching all players:', error);
      throw error;
    }

    return (data || []).map(transformDatabasePlayerToPlayer);
  },

  async getInactivePlayers(teamId: string): Promise<Player[]> {
    const { data, error } = await supabase
      .from('players')
      .select('*')
      .eq('team_id', teamId)
      .not('leave_date', 'is', null)
      .order('name');

    if (error) {
      console.error('Error fetching inactive players:', error);
      throw error;
    }

    return (data || []).map(transformDatabasePlayerToPlayer);
  },

  async updatePlayer(playerId: string, updates: Partial<Player>): Promise<Player> {
    console.log('Updating player:', playerId, updates);
    
    // Handle database field mappings
    const dbUpdates: any = {};
    
    if (updates.name !== undefined) dbUpdates.name = updates.name;
    if (updates.dateOfBirth !== undefined) dbUpdates.date_of_birth = updates.dateOfBirth;
    if (updates.squadNumber !== undefined) dbUpdates.squad_number = updates.squadNumber;
    if (updates.position !== undefined) dbUpdates.position = updates.position;
    if (updates.type !== undefined) dbUpdates.type = updates.type;
    if (updates.team_id !== undefined) dbUpdates.team_id = updates.team_id;
    if (updates.availability !== undefined) dbUpdates.availability = updates.availability;
    if (updates.subscriptionType !== undefined) dbUpdates.subscription_type = updates.subscriptionType;
    if (updates.leaveDate !== undefined) dbUpdates.leave_date = updates.leaveDate;
    if (updates.kit_sizes !== undefined) dbUpdates.kit_sizes = updates.kit_sizes;
    if (updates.attributes !== undefined) dbUpdates.attributes = updates.attributes;
    if (updates.objectives !== undefined) dbUpdates.objectives = updates.objectives;
    if (updates.comments !== undefined) dbUpdates.comments = updates.comments;
    if (updates.photoUrl !== undefined) dbUpdates.photo_url = updates.photoUrl;

    const { data, error } = await supabase
      .from('players')
      .update(dbUpdates)
      .eq('id', playerId)
      .select()
      .single();

    if (error) {
      console.error('Error updating player:', error);
      throw error;
    }

    return transformDatabasePlayerToPlayer(data);
  },

  async deletePlayer(playerId: string): Promise<void> {
    console.log('Deleting player:', playerId);
    
    const { error } = await supabase
      .from('players')
      .delete()
      .eq('id', playerId);

    if (error) {
      console.error('Error deleting player:', error);
      throw error;
    }
  },

  async getParentsByPlayerId(playerId: string): Promise<Parent[]> {
    // For now, return empty array since the query structure needs revision
    // The current query tries to join tables that may not have proper relationships
    console.log('Getting parents for player:', playerId);
    return [];
  },

  async createParent(parentData: Partial<Parent>): Promise<Parent> {
    // This would typically involve creating a user invitation
    const newParent: Parent = {
      id: `parent-${Date.now()}`,
      name: parentData.name || '',
      email: parentData.email || '',
      phone: parentData.phone,
      playerId: parentData.playerId || '',
      linkCode: `LINK-${Math.random().toString(36).substr(2, 8).toUpperCase()}`,
      subscriptionType: parentData.subscriptionType || 'full_squad',
      subscriptionStatus: parentData.subscriptionStatus || 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    return newParent;
  },

  async updateParent(parentId: string, updates: Partial<Parent>): Promise<Parent> {
    // Mock update - in real implementation, this would update the database
    return {
      id: parentId,
      name: updates.name || 'Updated Parent',
      email: updates.email || 'updated@example.com',
      phone: updates.phone,
      playerId: updates.playerId || '',
      linkCode: 'UPDATED123',
      subscriptionType: updates.subscriptionType || 'full_squad',
      subscriptionStatus: updates.subscriptionStatus || 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  },

  async deleteParent(parentId: string): Promise<void> {
    // Mock deletion
  },

  async regenerateParentLinkCode(parentId: string): Promise<string> {
    const newLinkCode = `LINK-${Math.random().toString(36).substr(2, 8).toUpperCase()}`;
    return newLinkCode;
  },

  async getTransferHistory(playerId: string): Promise<PlayerTransfer[]> {
    const { data, error } = await supabase
      .from('player_transfers')
      .select('*')
      .eq('player_id', playerId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching transfer history:', error);
      return [];
    }

    // Transform database records to match PlayerTransfer interface
    return (data || []).map(transfer => ({
      id: transfer.id,
      playerId: transfer.player_id,
      fromTeamId: transfer.from_team_id,
      toTeamId: transfer.to_team_id,
      transferDate: transfer.transfer_date,
      status: transfer.status as "pending" | "accepted" | "rejected",
      dataTransferOptions: {
        full: transfer.data_transfer_options?.full || false,
        attributes: transfer.data_transfer_options?.attributes || false,
        comments: transfer.data_transfer_options?.comments || false,
        objectives: transfer.data_transfer_options?.objectives || false,
        events: transfer.data_transfer_options?.events || false,
      },
      requestedBy: transfer.requested_by,
      acceptedBy: transfer.accepted_by,
      createdAt: transfer.created_at,
      updatedAt: transfer.updated_at
    }));
  },

  async getAttributeHistory(playerId: string, attributeName: string): Promise<AttributeHistory[]> {
    const { data, error } = await supabase
      .from('player_attribute_history')
      .select('*')
      .eq('player_id', playerId)
      .eq('attribute_name', attributeName)
      .order('recorded_date', { ascending: false });

    if (error) {
      console.error('Error fetching attribute history:', error);
      return [];
    }

    // Transform database records to match AttributeHistory interface
    return (data || []).map(history => ({
      id: history.id,
      playerId: history.player_id,
      attributeName: history.attribute_name,
      attributeGroup: history.attribute_group,
      value: history.value,
      recordedDate: history.recorded_date,
      recordedBy: history.recorded_by,
      createdAt: history.created_at
    }));
  }
};
