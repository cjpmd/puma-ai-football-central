import { supabase } from '@/integrations/supabase/client';
import type { Team } from '@/types';
import { logger } from '@/lib/logger';

export const teamsService = {
  async createTeam(teamData: Record<string, any>): Promise<{ id: string; [key: string]: any }> {
    const { data, error } = await supabase
      .from('teams')
      .insert({ ...teamData, updated_at: new Date().toISOString() })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async updateTeam(teamId: string, updates: Record<string, any>): Promise<void> {
    const { error } = await supabase
      .from('teams')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', teamId);
    if (error) throw error;
  },

  async deleteTeam(teamId: string): Promise<void> {
    const { error } = await supabase
      .from('teams')
      .delete()
      .eq('id', teamId);
    if (error) throw error;
  },

  async addPlayerToTeam(teamId: string, playerId: string): Promise<void> {
    const { error } = await supabase
      .from('players')
      .update({ team_id: teamId })
      .eq('id', playerId);
    if (error) throw error;
  },

  async removePlayerFromTeam(playerId: string): Promise<void> {
    const { error } = await supabase
      .from('players')
      .update({ team_id: null })
      .eq('id', playerId);
    if (error) throw error;
  },

  async getTeamWithMembers(teamId: string): Promise<any> {
    const { data, error } = await supabase
      .from('teams')
      .select('*, players(id, name, squad_number, type, availability, status)')
      .eq('id', teamId)
      .single();
    if (error) throw error;
    return data;
  },
};
