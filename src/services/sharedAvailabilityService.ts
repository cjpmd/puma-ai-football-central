import { supabase } from '@/integrations/supabase/client';

/**
 * Get the linked player IDs for a user.
 */
export const getLinkedPlayerIds = async (userId: string): Promise<string[]> => {
  try {
    const { data } = await supabase
      .from('user_players')
      .select('player_id')
      .eq('user_id', userId);
    return data?.map(r => r.player_id) || [];
  } catch (error) {
    console.error('Error getting linked player IDs:', error);
    return [];
  }
};

/**
 * Get player availability for events by player_id (the shared approach).
 */
export const getPlayerAvailabilityForEvents = async (
  playerIds: string[],
  eventIds: string[]
): Promise<Array<{ event_id: string; status: string; player_id: string }>> => {
  if (!playerIds.length || !eventIds.length) return [];
  
  try {
    const { data } = await supabase
      .from('event_availability')
      .select('event_id, status, player_id')
      .in('player_id', playerIds)
      .in('event_id', eventIds)
      .eq('role', 'player');
    
    return data || [];
  } catch (error) {
    console.error('Error getting player availability:', error);
    return [];
  }
};

/**
 * Get all user IDs that share availability for linked players.
 * This includes the current user, other parents linked to the same players,
 * and players who have their own accounts.
 * @deprecated Use getLinkedPlayerIds and getPlayerAvailabilityForEvents instead
 */
export const getSharedUserIds = async (userId: string): Promise<string[]> => {
  const userIds = [userId];
  
  try {
    // Get players linked to this user
    const { data: myLinks } = await supabase
      .from('user_players')
      .select('player_id')
      .eq('user_id', userId);
    
    if (myLinks && myLinks.length > 0) {
      const playerIds = myLinks.map(l => l.player_id);
      
      // Get all users linked to the same players
      const { data: otherLinks } = await supabase
        .from('user_players')
        .select('user_id')
        .in('player_id', playerIds);
      
      if (otherLinks) {
        otherLinks.forEach(link => {
          if (!userIds.includes(link.user_id)) {
            userIds.push(link.user_id);
          }
        });
      }
    }
  } catch (error) {
    console.error('Error getting shared user IDs:', error);
  }
  
  return userIds;
};

/**
 * Get the best availability status from multiple user records.
 * Priority: available > unavailable > pending
 */
export const getBestAvailabilityStatus = (
  records: Array<{ status: string; user_id?: string; player_id?: string }>
): { status: string; respondedBy: string | null } => {
  if (!records || records.length === 0) {
    return { status: 'pending', respondedBy: null };
  }

  // Find the first non-pending response
  const availableRecord = records.find(r => r.status === 'available');
  if (availableRecord) {
    return { status: 'available', respondedBy: availableRecord.user_id || availableRecord.player_id || null };
  }

  const unavailableRecord = records.find(r => r.status === 'unavailable');
  if (unavailableRecord) {
    return { status: 'unavailable', respondedBy: unavailableRecord.user_id || unavailableRecord.player_id || null };
  }

  return { status: 'pending', respondedBy: null };
};
