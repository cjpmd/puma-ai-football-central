
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
      
      // FIRST: Verify the player exists in the database
      console.log('🔍 PLAYER VERIFICATION:');
      const { data: playerCheck, error: playerCheckError } = await supabase
        .from('players')
        .select('id, name, team_id')
        .eq('id', playerId)
        .maybeSingle();

      if (playerCheckError) {
        console.error('❌ Error checking player existence:', playerCheckError);
      } else if (!playerCheck) {
        console.log('❌ CRITICAL: Player not found in players table!');
        return;
      } else {
        console.log(`✅ Player found: ${playerCheck.name} (Team ID: ${playerCheck.team_id})`);
      }

      // SECOND: Check for Ferry Athletic events
      console.log('🚢 FERRY ATHLETIC EVENT VERIFICATION:');
      const { data: ferryEvents, error: ferryEventsError } = await supabase
        .from('events')
        .select('*')
        .or('opponent.ilike.%ferry%,title.ilike.%ferry%');

      if (ferryEventsError) {
        console.error('❌ Error fetching Ferry events:', ferryEventsError);
      } else {
        console.log(`🚢 Found ${ferryEvents?.length || 0} Ferry Athletic events in database:`);
        ferryEvents?.forEach(event => {
          console.log(`  - Event ID: ${event.id}, Title: "${event.title}", Opponent: "${event.opponent}", Date: ${event.date}`);
        });
      }

      // THIRD: Examine ALL event_selections for this team
      console.log('🔍 TEAM EVENT SELECTIONS ANALYSIS:');
      if (playerCheck?.team_id) {
        const { data: teamSelections, error: teamSelectionsError } = await supabase
          .from('event_selections')
          .select(`
            *,
            events!inner(id, title, opponent, date, team_id)
          `)
          .eq('events.team_id', playerCheck.team_id)
          .order('events.date', { ascending: false })
          .limit(20);

        if (teamSelectionsError) {
          console.error('❌ Error fetching team selections:', teamSelectionsError);
        } else if (teamSelections) {
          console.log(`📋 Found ${teamSelections.length} selections for this team. Analyzing each one...`);
          
          let masonFoundCount = 0;
          let ferrySelectionFound = false;
          
          teamSelections.forEach((selection, index) => {
            const event = selection.events as any;
            const isFerryEvent = event?.opponent?.toLowerCase().includes('ferry') || 
                               event?.title?.toLowerCase().includes('ferry');
            
            console.log(`\n📋 Selection ${index + 1}: "${event.title}" vs "${event.opponent}" (${event.date})`);
            console.log(`    Event ID: ${event.id}`);
            console.log(`    Is Ferry Event: ${isFerryEvent}`);
            
            const playerPositions = selection.player_positions as any[];
            console.log(`    Total players in selection: ${playerPositions?.length || 0}`);
            
            // Check each player in this selection
            if (playerPositions && Array.isArray(playerPositions)) {
              playerPositions.forEach((player, playerIndex) => {
                const currentPlayerId = player.playerId || player.player_id;
                if (currentPlayerId === playerId) {
                  console.log(`    ✅ FOUND MASON at index ${playerIndex}:`);
                  console.log(`       Position: "${player.position}"`);
                  console.log(`       IsSubstitute: ${player.isSubstitute}`);
                  console.log(`       Minutes: ${player.minutes || 'not specified'}`);
                  console.log(`       Raw Data: ${JSON.stringify(player)}`);
                  masonFoundCount++;
                  
                  if (isFerryEvent) {
                    ferrySelectionFound = true;
                    console.log(`    🚢 THIS IS THE FERRY ATHLETIC SELECTION!`);
                  }
                }
              });
              
              // If this is Ferry and Mason wasn't found, log all players
              if (isFerryEvent && !playerPositions.some(p => (p.playerId || p.player_id) === playerId)) {
                console.log(`    🚢 FERRY EVENT - Mason NOT found. All players in this selection:`);
                playerPositions.forEach((player, playerIndex) => {
                  console.log(`       Player ${playerIndex + 1}: ID=${player.playerId || player.player_id}, Position="${player.position}"`);
                });
              }
            } else {
              console.log(`    ⚠️ Invalid player_positions data: ${typeof playerPositions}`);
            }
          });
          
          console.log(`\n📊 SUMMARY:`);
          console.log(`   Mason found in ${masonFoundCount} selections`);
          console.log(`   Ferry selection with Mason found: ${ferrySelectionFound}`);
          
          if (!ferrySelectionFound && ferryEvents && ferryEvents.length > 0) {
            console.log(`\n🚨 PROBLEM IDENTIFIED: Ferry event exists but Mason not found in any Ferry selections!`);
          }
        }
      }

      // FOURTH: Check current event_player_stats for Ferry matches
      console.log('\n🚢 FERRY ATHLETIC STATS RECORDS:');
      const { data: ferryStats, error: ferryStatsError } = await supabase
        .from('event_player_stats')
        .select(`
          *,
          events!inner(id, title, opponent, date)
        `)
        .eq('player_id', playerId);

      if (ferryStatsError) {
        console.error('❌ Error fetching Ferry stats:', ferryStatsError);
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
        });
      }

      // FIFTH: Get current player match_stats
      const { data: player, error: playerError } = await supabase
        .from('players')
        .select('name, match_stats')
        .eq('id', playerId)
        .maybeSingle();

      if (playerError) {
        console.error('❌ Error fetching player match stats:', playerError);
      } else if (player) {
        console.log('\n🎯 CURRENT PLAYER MATCH_STATS:');
        
        const matchStats = player.match_stats as any;
        if (matchStats?.minutesByPosition) {
          console.log('🎯 Minutes by position in match_stats:', matchStats.minutesByPosition);
          Object.entries(matchStats.minutesByPosition).forEach(([position, minutes]) => {
            console.log(`   ${position}: ${minutes} minutes`);
          });
        } else {
          console.log('❌ NO minutesByPosition data in match_stats');
        }
        
        console.log(`🎯 Total games: ${matchStats?.totalGames || 0}`);
        console.log(`🎯 Total minutes: ${matchStats?.totalMinutes || 0}`);
      } else {
        console.log('❌ Player not found when fetching match stats');
      }
      
    } catch (error) {
      console.error('❌ Error debugging player positions:', error);
    }
  }
};
