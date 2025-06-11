
import { supabase } from '@/integrations/supabase/client';
import { Player } from '@/types';

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

    console.log('Players fetched successfully:', data);
    return data || [];
  },

  async createPlayer(playerData: Partial<Player>): Promise<Player> {
    console.log('Creating player:', playerData);
    
    const { data, error } = await supabase
      .from('players')
      .insert([playerData])
      .select()
      .single();

    if (error) {
      console.error('Error creating player:', error);
      throw error;
    }

    console.log('Player created successfully:', data);
    return data;
  },

  async updatePlayer(id: string, playerData: Partial<Player>): Promise<Player> {
    console.log('Updating player:', id, playerData);
    
    // Handle JSON fields properly
    const updateData: any = { ...playerData };
    
    // Ensure JSON fields are properly formatted
    if (updateData.funStats) {
      updateData.fun_stats = updateData.funStats;
      delete updateData.funStats;
    }
    
    if (updateData.playStyle) {
      updateData.play_style = updateData.playStyle;
      delete updateData.playStyle;
    }
    
    if (updateData.cardDesignId) {
      updateData.card_design_id = updateData.cardDesignId;
      delete updateData.cardDesignId;
    }

    const { data, error } = await supabase
      .from('players')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating player:', error);
      throw error;
    }

    console.log('Player updated successfully:', data);
    return data;
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

    console.log('Player fetched by ID:', data);
    return data;
  }
};
