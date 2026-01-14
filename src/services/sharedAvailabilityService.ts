import { supabase } from '@/integrations/supabase/client';

/**
 * Get all user IDs that share availability for linked players.
 * This includes the current user, other parents linked to the same players,
 * and players who have their own accounts.
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
  records: Array<{ status: string; user_id: string }>
): { status: string; respondedBy: string | null } => {
  if (!records || records.length === 0) {
    return { status: 'pending', respondedBy: null };
  }

  // Find the first non-pending response
  const availableRecord = records.find(r => r.status === 'available');
  if (availableRecord) {
    return { status: 'available', respondedBy: availableRecord.user_id };
  }

  const unavailableRecord = records.find(r => r.status === 'unavailable');
  if (unavailableRecord) {
    return { status: 'unavailable', respondedBy: unavailableRecord.user_id };
  }

  return { status: 'pending', respondedBy: null };
};
