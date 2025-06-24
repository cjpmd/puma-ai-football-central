
import { supabase } from '@/integrations/supabase/client';

// Define Mason's player ID for debugging
const masonPlayerId = 'bb4de0de-c98c-485b-85b6-b70dd67736e4';

// Define types for the JSON data structures
interface PlayerPosition {
  playerId?: string;
  player_id?: string;
  position?: string;
  minutes?: number;
  isSubstitute?: boolean;
  substitution_time?: number;
}

interface MatchStats {
  minutesByPosition?: Record<string, number>;
  recentGames?: Array<{
    opponent: string;
    minutesByPosition: Record<string, number>;
  }>;
}

export const playerStatsRebuilder = {
  /**
   * Complete rebuild using ONLY the database function (safest approach)
   */
  async rebuildAllPlayerStats(): Promise<void> {
    console.log('🔄 STARTING SAFE DATABASE FUNCTION REBUILD');
    
    try {
      // Use ONLY the database function - it handles deletion safely
      console.log('Step 1: Running database function regeneration...');
      const { error: regenerateError } = await supabase.rpc('regenerate_all_event_player_stats');
      
      if (regenerateError) {
        console.error('Database function error:', regenerateError);
        throw regenerateError;
      }
      
      console.log('✅ Database function regeneration completed successfully');

      // Step 2: Update all player match stats using database function
      console.log('Step 2: Updating all player match statistics...');
      const { error: updateError } = await supabase.rpc('update_all_completed_events_stats');
      
      if (updateError) {
        console.error('Error updating match stats:', updateError);
        throw updateError;
      }
      
      console.log('✅ Successfully updated all player match statistics');

      // Step 3: Final verification of Mason's Ferry data
      console.log('🔍 FINAL VERIFICATION - Mason\'s Ferry data:');
      const { data: masonFerryStats, error: ferryStatsError } = await supabase
        .from('event_player_stats')
        .select(`
          position,
          minutes_played,
          is_substitute,
          events!inner(title, opponent, date)
        `)
        .eq('player_id', masonPlayerId)
        .or('events.opponent.ilike.%ferry%,events.title.ilike.%ferry%')
        .order('events(date)', { ascending: false });

      if (ferryStatsError) {
        console.error('Error fetching Mason Ferry stats:', ferryStatsError);
      } else {
        console.log(`Found ${masonFerryStats?.length || 0} Mason Ferry records:`);
        masonFerryStats?.forEach((stat, index) => {
          const event = stat.events;
          console.log(`  ${index + 1}. ${event?.title} vs ${event?.opponent} (${event?.date}): Position="${stat.position}", Minutes=${stat.minutes_played}`);
        });
      }

      console.log('🎉 SAFE DATABASE REBUILD COMPLETED SUCCESSFULLY');
      
    } catch (error) {
      console.error('❌ Error in safe rebuild:', error);
      throw error;
    }
  },

  /**
   * Rebuild match stats for a specific player using database function
   */
  async rebuildPlayerMatchStats(playerId: string, playerName: string): Promise<void> {
    console.log(`📊 Rebuilding match stats for ${playerName} using database function...`);
    
    try {
      // Use the database function to update player stats
      const { error: updateError } = await supabase.rpc('update_player_match_stats', {
        player_uuid: playerId
      });

      if (updateError) {
        console.error(`Error updating ${playerName} stats:`, updateError);
        throw updateError;
      }

      console.log(`✅ Updated ${playerName} stats using database function`);
      
    } catch (error) {
      console.error(`Error rebuilding stats for ${playerName}:`, error);
      throw error;
    }
  }
};
