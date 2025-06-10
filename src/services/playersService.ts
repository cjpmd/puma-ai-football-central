
import { supabase } from '@/integrations/supabase/client';
import { Player, Parent, PlayerTransfer, AttributeHistory } from '@/types';

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
    return (data || []) as Player[];
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
    return (data || []) as Player[];
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

    return data as Player;
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

    return (data || []) as Player[];
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

    return (data || []) as Player[];
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

    return data as Player;
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
    const { data, error } = await supabase
      .from('user_players')
      .select(`
        *,
        profiles (*)
      `)
      .eq('player_id', playerId)
      .eq('relationship', 'parent');

    if (error) {
      console.error('Error fetching parents:', error);
      throw error;
    }

    return (data || []).map(item => ({
      id: item.profiles.id,
      name: item.profiles.name,
      email: item.profiles.email,
      phone: item.profiles.phone,
      playerId: playerId,
      linkCode: '',
      subscriptionType: 'full_squad',
      subscriptionStatus: 'active',
      createdAt: item.created_at,
      updatedAt: item.updated_at
    })) as Parent[];
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

    return (data || []) as PlayerTransfer[];
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

    return (data || []) as AttributeHistory[];
  }
};
