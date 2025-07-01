
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
      return data || [];
    } catch (error) {
      console.error('Error fetching active players:', error);
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
  }
};
