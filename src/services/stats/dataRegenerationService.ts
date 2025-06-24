
import { supabase } from '@/integrations/supabase/client';

export const dataRegenerationService = {
  async regenerateAllPlayerStats(): Promise<void> {
    try {
      console.log('=== STARTING COMPLETE DATA REGENERATION ===');
      
      // Step 1: Use the improved database function to regenerate event_player_stats
      console.log('Step 1: Regenerating event_player_stats from event_selections...');
      const { error: regenerateError } = await supabase.rpc('regenerate_all_event_player_stats');
      
      if (regenerateError) {
        console.error('Error regenerating event_player_stats:', regenerateError);
        throw regenerateError;
      }
      
      console.log('✅ Successfully regenerated event_player_stats');

      // Step 2: Update all player match stats using the improved function
      console.log('Step 2: Updating all player match stats...');
      const { error: updateError } = await supabase.rpc('update_all_completed_events_stats');
      
      if (updateError) {
        console.error('Error updating player match stats:', updateError);
        throw updateError;
      }
      
      console.log('✅ Successfully updated all player match stats');
      
      // Step 3: Verify data was properly regenerated
      console.log('Step 3: Verifying regenerated data...');
      const { data: statsCount, error: verifyError } = await supabase
        .from('event_player_stats')
        .select('id', { count: 'exact' });
        
      if (verifyError) {
        console.error('Error verifying regenerated data:', verifyError);
      } else {
        console.log(`✅ Verification complete: ${statsCount?.length || 0} event_player_stats records created`);
      }
      
      console.log('=== COMPLETE DATA REGENERATION FINISHED ===');
    } catch (error) {
      console.error('Error regenerating player stats:', error);
      throw error;
    }
  },

  async debugAndRegenerateForPlayer(playerId: string, playerName: string): Promise<void> {
    try {
      console.log(`🎯 STARTING COMPREHENSIVE REGENERATION FOR ${playerName}`);
      
      // Debug current player positions before regeneration
      await this.debugPlayerPositions(playerId, playerName);
      
      // Use the complete regeneration service
      await this.regenerateAllPlayerStats();
      
      // Debug positions after regeneration
      console.log('🎯 POST-REGENERATION DEBUG:');
      await this.debugPlayerPositions(playerId, playerName);
      
      console.log(`🎉 REGENERATION COMPLETE FOR ${playerName}`);
    } catch (error) {
      console.error('Error in debug and regeneration:', error);
      throw error;
    }
  },

  async debugPlayerPositions(playerId: string, playerName: string): Promise<void> {
    try {
      console.log(`🔍 Debugging positions for ${playerName} (${playerId})`);
      
      const { error } = await supabase.rpc('debug_player_positions', {
        p_player_id: playerId,
        p_player_name: playerName
      });
      
      if (error) {
        console.error('Error running debug function:', error);
      }
      
      // COMPREHENSIVE DEBUG FOR FERRY ATHLETIC MATCH
      console.log('🚢 COMPREHENSIVE FERRY ATHLETIC DEBUG:');
      
      // First, let's find ALL events with "ferry" in the name
      const { data: ferryEvents, error: ferryEventsError } = await supabase
        .from('events')
        .select('*')
        .or('opponent.ilike.%ferry%,title.ilike.%ferry%');

      if (ferryEventsError) {
        console.error('Error fetching Ferry events:', ferryEventsError);
      } else {
        console.log(`🚢 Found ${ferryEvents?.length || 0} Ferry Athletic events in database:`);
        ferryEvents?.forEach(event => {
          console.log(`  - Event ID: ${event.id}, Title: "${event.title}", Opponent: "${event.opponent}", Date: ${event.date}`);
        });
      }

      // Now let's get ALL event_selections and search through them manually
      const { data: allSelections, error: allSelectionsError } = await supabase
        .from('event_selections')
        .select(`
          *,
          events!inner(id, title, opponent, date)
        `)
        .order('created_at', { ascending: false });

      if (allSelectionsError) {
        console.error('Error fetching all selections:', allSelectionsError);
      } else if (allSelections) {
        console.log(`🔍 Searching through ${allSelections.length} total selections...`);
        
        // Let's look for ANY selections that might contain Mason
        const masonSelections = allSelections.filter(selection => {
          const playerPositions = selection.player_positions as any[];
          if (!playerPositions || !Array.isArray(playerPositions)) return false;
          
          return playerPositions.some((p: any) => 
            p.playerId === playerId || p.player_id === playerId
          );
        });

        console.log(`👤 Found ${masonSelections.length} total selections containing ${playerName}:`);
        
        masonSelections.forEach((selection, index) => {
          const event = selection.events as any;
          console.log(`\n👤 Selection ${index + 1}: ${event.title} vs ${event.opponent} (${event.date})`);
          console.log(`    Event ID: ${event.id}`);
          
          const playerPositions = selection.player_positions as any[];
          const masonData = playerPositions?.find(p => p.playerId === playerId || p.player_id === playerId);
          
          if (masonData) {
            console.log(`    Mason's Position: "${masonData.position}"`);
            console.log(`    Mason's IsSubstitute: ${masonData.isSubstitute}`);
            console.log(`    Mason's Minutes: ${masonData.minutes || 'not specified'}`);
            console.log(`    Raw Mason Data:`, JSON.stringify(masonData, null, 2));
          }
        });

        // Now specifically filter for Ferry Athletic from Mason's selections
        const ferrySelections = masonSelections.filter(selection => {
          const event = selection.events as any;
          const isFerryEvent = event?.opponent?.toLowerCase().includes('ferry') || 
                             event?.title?.toLowerCase().includes('ferry');
          return isFerryEvent;
        });

        console.log(`\n🚢 Found ${ferrySelections.length} Ferry Athletic selections for ${playerName}:`);
        
        ferrySelections.forEach((selection, index) => {
          const event = selection.events as any;
          console.log(`\n🚢 Ferry Selection ${index + 1}: ${event.title} vs ${event.opponent} (${event.date})`);
          console.log(`    Event ID: ${event.id}`);
          console.log(`    Team Number: ${selection.team_number}, Period: ${selection.period_number}`);
          console.log(`    Duration Minutes: ${selection.duration_minutes}`);
          console.log(`    Performance Category ID: ${selection.performance_category_id}`);
          console.log(`    Captain ID: ${selection.captain_id}`);
          
          const playerPositions = selection.player_positions as any[];
          console.log(`    Total players in selection: ${playerPositions?.length || 0}`);
          
          const playerData = playerPositions?.find(p => p.playerId === playerId || p.player_id === playerId);
          
          if (playerData) {
            console.log(`    ✅ FOUND MASON IN FERRY SELECTION:`);
            console.log(`    RAW Player Data:`, JSON.stringify(playerData, null, 2));
            console.log(`    Position: "${playerData.position}"`);
            console.log(`    IsSubstitute: ${playerData.isSubstitute}`);
            console.log(`    Minutes: ${playerData.minutes || 'not specified'}`);
          } else {
            console.log(`    ❌ Mason not found in this Ferry selection`);
          }
        });
      }

      // Check what's in event_player_stats for Ferry matches
      console.log('\n🚢 FERRY ATHLETIC STATS RECORDS:');
      const { data: ferryStats, error: ferryStatsError } = await supabase
        .from('event_player_stats')
        .select(`
          *,
          events!inner(id, title, opponent, date)
        `)
        .eq('player_id', playerId);

      if (ferryStatsError) {
        console.error('Error fetching Ferry stats:', ferryStatsError);
      } else if (ferryStats) {
        const actualFerryStats = ferryStats.filter(stat => {
          const event = stat.events as any;
          return event?.opponent?.toLowerCase().includes('ferry') || 
                 event?.title?.toLowerCase().includes('ferry');
        });

        console.log(`📊 Found ${actualFerryStats.length} Ferry Athletic stats records for ${playerName}:`);
        actualFerryStats.forEach((stat, index) => {
          const event = stat.events as any;
          console.log(`\n📊 Ferry Stats ${index + 1}: ${event.title} vs ${event.opponent} (${event.date})`);
          console.log(`    Event ID: ${event.id}`);
          console.log(`    Position in stats: "${stat.position}"`);
          console.log(`    Minutes in stats: ${stat.minutes_played}`);
          console.log(`    Is Captain: ${stat.is_captain}`);
          console.log(`    Is Substitute: ${stat.is_substitute}`);
          console.log(`    Team: ${stat.team_number}, Period: ${stat.period_number}`);
          console.log(`    Performance Category ID: ${stat.performance_category_id}`);
          console.log(`    Record ID: ${stat.id}`);
        });
      }

      // Get current player match stats - use maybeSingle to avoid the error
      const { data: player, error: playerError } = await supabase
        .from('players')
        .select('name, match_stats')
        .eq('id', playerId)
        .maybeSingle();

      if (playerError) {
        console.error('Error fetching player:', playerError);
      } else if (player) {
        console.log('\n🎯 CURRENT PLAYER MATCH_STATS:');
        
        const matchStats = player.match_stats as any;
        if (matchStats?.minutesByPosition) {
          console.log('🎯 Minutes by position in match_stats:', matchStats.minutesByPosition);
          console.log('🎯 STC minutes:', matchStats.minutesByPosition.STC || 0);
          console.log('🎯 CM minutes:', matchStats.minutesByPosition.CM || 0);
          console.log('🎯 SUB minutes:', matchStats.minutesByPosition.SUB || 0);
        } else {
          console.log('❌ NO minutesByPosition data in match_stats');
        }
        
        console.log('🎯 Total games:', matchStats?.totalGames || 0);
        console.log('🎯 Total minutes:', matchStats?.totalMinutes || 0);
      } else {
        console.log('❌ Player not found in database');
      }
      
    } catch (error) {
      console.error('Error debugging player positions:', error);
    }
  }
};
