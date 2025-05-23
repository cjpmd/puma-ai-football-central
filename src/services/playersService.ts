
import { supabase } from '@/integrations/supabase/client';
import { Player } from '@/types';

export const playersService = {
  async getPlayersByTeamId(teamId: string): Promise<Player[]> {
    const { data, error } = await supabase
      .from('players')
      .select('*')
      .eq('team_id', teamId)
      .order('squad_number');

    if (error) {
      console.error('Error fetching players:', error);
      throw error;
    }

    return data || [];
  },

  async createPlayer(playerData: Partial<Player>): Promise<Player> {
    const { data, error } = await supabase
      .from('players')
      .insert([{
        name: playerData.name,
        date_of_birth: playerData.dateOfBirth,
        squad_number: playerData.squadNumber,
        type: playerData.type,
        team_id: playerData.teamId,
        availability: playerData.availability || 'green',
        subscription_type: playerData.subscriptionType || 'full_squad',
        subscription_status: playerData.subscriptionStatus || 'active',
        attributes: playerData.attributes || [],
        objectives: playerData.objectives || [],
        comments: playerData.comments || [],
        match_stats: playerData.matchStats || {
          totalGames: 0,
          captainGames: 0,
          playerOfTheMatchCount: 0,
          totalMinutes: 0,
          minutesByPosition: {},
          recentGames: []
        }
      }])
      .select()
      .single();

    if (error) {
      console.error('Error creating player:', error);
      throw error;
    }

    return {
      id: data.id,
      name: data.name,
      dateOfBirth: data.date_of_birth,
      squadNumber: data.squad_number,
      type: data.type,
      teamId: data.team_id,
      availability: data.availability,
      subscriptionType: data.subscription_type,
      subscriptionStatus: data.subscription_status,
      attributes: data.attributes || [],
      objectives: data.objectives || [],
      comments: data.comments || [],
      matchStats: data.match_stats || {
        totalGames: 0,
        captainGames: 0,
        playerOfTheMatchCount: 0,
        totalMinutes: 0,
        minutesByPosition: {},
        recentGames: []
      },
      createdAt: data.created_at,
      updatedAt: data.updated_at
    };
  },

  async updatePlayer(playerId: string, playerData: Partial<Player>): Promise<Player> {
    const { data, error } = await supabase
      .from('players')
      .update({
        name: playerData.name,
        date_of_birth: playerData.dateOfBirth,
        squad_number: playerData.squadNumber,
        type: playerData.type,
        availability: playerData.availability,
        subscription_type: playerData.subscriptionType,
        subscription_status: playerData.subscriptionStatus,
        updated_at: new Date().toISOString()
      })
      .eq('id', playerId)
      .select()
      .single();

    if (error) {
      console.error('Error updating player:', error);
      throw error;
    }

    return {
      id: data.id,
      name: data.name,
      dateOfBirth: data.date_of_birth,
      squadNumber: data.squad_number,
      type: data.type,
      teamId: data.team_id,
      availability: data.availability,
      subscriptionType: data.subscription_type,
      subscriptionStatus: data.subscription_status,
      attributes: data.attributes || [],
      objectives: data.objectives || [],
      comments: data.comments || [],
      matchStats: data.match_stats || {
        totalGames: 0,
        captainGames: 0,
        playerOfTheMatchCount: 0,
        totalMinutes: 0,
        minutesByPosition: {},
        recentGames: []
      },
      createdAt: data.created_at,
      updatedAt: data.updated_at
    };
  },

  async deletePlayer(playerId: string): Promise<void> {
    const { error } = await supabase
      .from('players')
      .delete()
      .eq('id', playerId);

    if (error) {
      console.error('Error deleting player:', error);
      throw error;
    }
  }
};
