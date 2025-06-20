
import { supabase } from '@/integrations/supabase/client';

export const debugPlayerPositions = async (playerId: string, playerName: string) => {
  console.log(`=== DEBUGGING POSITIONS FOR ${playerName} (${playerId}) ===`);
  
  try {
    // 1. Check current player match_stats
    const { data: player, error: playerError } = await supabase
      .from('players')
      .select('match_stats, name')
      .eq('id', playerId)
      .single();

    if (playerError) {
      console.error('Error fetching player:', playerError);
      return;
    }

    console.log('1. CURRENT PLAYER MATCH_STATS:');
    console.log('Player name:', player.name);
    if (player.match_stats && typeof player.match_stats === 'object') {
      const stats = player.match_stats as any;
      console.log('Minutes by position:', stats.minutesByPosition);
      console.log('Recent games:', stats.recentGames?.slice(0, 3));
    }

    // 2. Check event_player_stats for this player
    const { data: playerStats, error: statsError } = await supabase
      .from('event_player_stats')
      .select(`
        *,
        events!inner(date, opponent, title)
      `)
      .eq('player_id', playerId)
      .order('events(date)', { ascending: false });

    if (statsError) {
      console.error('Error fetching event_player_stats:', statsError);
      return;
    }

    console.log('\n2. EVENT_PLAYER_STATS RECORDS:');
    console.log(`Found ${playerStats?.length || 0} records`);
    playerStats?.forEach((stat, index) => {
      console.log(`${index + 1}. Event: ${stat.events.title} (${stat.events.date})`);
      console.log(`   Position: ${stat.position}`);
      console.log(`   Minutes: ${stat.minutes_played}`);
      console.log(`   Is Captain: ${stat.is_captain}`);
      console.log(`   Is Substitute: ${stat.is_substitute}`);
      console.log(`   Event ID: ${stat.event_id}`);
      console.log(`   Performance Category ID: ${stat.performance_category_id}`);
    });

    // 3. Check event_selections for events where this player appears
    const eventIds = playerStats?.map(s => s.event_id) || [];
    if (eventIds.length > 0) {
      const { data: selections, error: selectionsError } = await supabase
        .from('event_selections')
        .select(`
          *,
          events!inner(date, opponent, title)
        `)
        .in('event_id', eventIds);

      if (selectionsError) {
        console.error('Error fetching event_selections:', selectionsError);
        return;
      }

      console.log('\n3. EVENT_SELECTIONS DATA:');
      selections?.forEach((selection, index) => {
        console.log(`${index + 1}. Event: ${selection.events.title} (${selection.events.date})`);
        console.log(`   Event ID: ${selection.event_id}`);
        
        const playerPositions = selection.player_positions as any[];
        if (Array.isArray(playerPositions)) {
          const playerInSelection = playerPositions.find((pp: any) => 
            pp.playerId === playerId || pp.player_id === playerId
          );
          
          if (playerInSelection) {
            console.log(`   ✅ Player found in selection:`);
            console.log(`      Position: ${playerInSelection.position}`);
            console.log(`      Minutes: ${playerInSelection.minutes || 'not specified'}`);
            console.log(`      Full data:`, playerInSelection);
          } else {
            console.log(`   ❌ Player NOT found in this selection`);
            console.log(`   Available players:`, playerPositions.map(pp => ({
              id: pp.playerId || pp.player_id,
              position: pp.position
            })));
          }
        } else {
          console.log(`   ❌ Player positions is not an array:`, typeof playerPositions);
        }
        
        // Check if player is captain
        if (selection.captain_id === playerId) {
          console.log(`   👑 Player is captain of this event`);
        }
        
        // Check substitutes
        const substitutes = selection.substitute_players || selection.substitutes || [];
        if (Array.isArray(substitutes)) {
          const playerInSubs = substitutes.find((sub: any) => 
            (sub.playerId || sub.player_id) === playerId
          );
          if (playerInSubs) {
            console.log(`   🔄 Player found in substitutes:`, playerInSubs);
          }
        }
      });
    }

    // 4. Check for any direct database inconsistencies
    console.log('\n4. INCONSISTENCY CHECK:');
    const cbStats = playerStats?.filter(stat => stat.position === 'CB') || [];
    console.log(`Found ${cbStats.length} CB position records in event_player_stats`);
    
    if (cbStats.length > 0) {
      console.log('CB Records details:');
      cbStats.forEach((stat, index) => {
        console.log(`${index + 1}. Event: ${stat.events.title} (${stat.events.date})`);
        console.log(`   Event ID: ${stat.event_id}`);
        console.log(`   Minutes: ${stat.minutes_played}`);
        console.log(`   Created: ${stat.created_at}`);
        console.log(`   Updated: ${stat.updated_at}`);
      });
      
      // Now check if these CB records have corresponding event_selections
      const cbEventIds = cbStats.map(s => s.event_id);
      const { data: cbSelections, error: cbSelectionsError } = await supabase
        .from('event_selections')
        .select(`
          *,
          events!inner(date, opponent, title)
        `)
        .in('event_id', cbEventIds);

      if (cbSelectionsError) {
        console.error('Error fetching CB event selections:', cbSelectionsError);
      } else {
        console.log('\n5. CB EVENTS - SELECTION vs STATS COMPARISON:');
        cbStats.forEach(stat => {
          const correspondingSelection = cbSelections?.find(sel => sel.event_id === stat.event_id);
          console.log(`Event: ${stat.events.title} (${stat.events.date})`);
          console.log(`  Stats says: Position = ${stat.position}, Minutes = ${stat.minutes_played}`);
          
          if (correspondingSelection) {
            const playerPositions = correspondingSelection.player_positions as any[];
            if (Array.isArray(playerPositions)) {
              const playerInSelection = playerPositions.find((pp: any) => 
                pp.playerId === playerId || pp.player_id === playerId
              );
              
              if (playerInSelection) {
                console.log(`  Selection says: Position = ${playerInSelection.position}, Minutes = ${playerInSelection.minutes || 'not specified'}`);
                
                if (playerInSelection.position !== stat.position) {
                  console.log(`  ⚠️  MISMATCH! Selection has ${playerInSelection.position} but stats has ${stat.position}`);
                }
              } else {
                console.log(`  ⚠️  Player not found in selection for this event!`);
              }
            }
          } else {
            console.log(`  ⚠️  No corresponding selection found for this event!`);
          }
        });
      }
    }

    console.log(`=== END DEBUGGING FOR ${playerName} ===\n`);

  } catch (error) {
    console.error(`Error debugging positions for ${playerName}:`, error);
  }
};
