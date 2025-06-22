
import { supabase } from '@/integrations/supabase/client';

export const debugPlayerPositions = async (playerId: string, playerName: string) => {
  console.log(`=== DEBUGGING POSITIONS FOR ${playerName} (${playerId}) ===`);
  
  try {
    // 1. Check event_selections for Arbroath fixture specifically
    const { data: arbroathSelections, error: selectionsError } = await supabase
      .from('event_selections')
      .select(`
        *,
        events!inner(date, opponent, title)
      `)
      .ilike('events.opponent', '%arbroath%');

    if (selectionsError) {
      console.error('Error fetching Arbroath selections:', selectionsError);
      return;
    }

    console.log('🎯 ARBROATH FIXTURES IN EVENT_SELECTIONS:');
    if (arbroathSelections && arbroathSelections.length > 0) {
      arbroathSelections.forEach(selection => {
        console.log(`Event: ${selection.events.title} (${selection.events.date})`);
        
        const playerPositions = selection.player_positions as any[];
        if (Array.isArray(playerPositions)) {
          const playerInSelection = playerPositions.find((pp: any) => 
            pp.playerId === playerId || pp.player_id === playerId
          );
          
          if (playerInSelection) {
            console.log(`🎯 FOUND PLAYER IN ARBROATH SELECTION:`);
            console.log(`🎯 Position: ${playerInSelection.position}`);
            console.log(`🎯 Minutes: ${playerInSelection.minutes || 'not specified'}`);
            console.log(`🎯 Full data:`, JSON.stringify(playerInSelection, null, 2));
          } else {
            console.log(`❌ Player NOT found in this Arbroath selection`);
          }
        }
      });
    } else {
      console.log('❌ No Arbroath fixtures found in event_selections');
    }

    // 2. Check event_player_stats for Arbroath fixture
    const { data: arbroathStats, error: statsError } = await supabase
      .from('event_player_stats')
      .select(`
        *,
        events!inner(date, opponent, title)
      `)
      .eq('player_id', playerId)
      .ilike('events.opponent', '%arbroath%');

    if (statsError) {
      console.error('Error fetching Arbroath stats:', statsError);
      return;
    }

    console.log('\n🎯 ARBROATH FIXTURES IN EVENT_PLAYER_STATS:');
    if (arbroathStats && arbroathStats.length > 0) {
      arbroathStats.forEach(stat => {
        console.log(`Event: ${stat.events.title} (${stat.events.date})`);
        console.log(`🎯 Position in stats: ${stat.position}`);
        console.log(`🎯 Minutes in stats: ${stat.minutes_played}`);
        console.log(`🎯 Is Captain: ${stat.is_captain}`);
        console.log(`🎯 Is Substitute: ${stat.is_substitute}`);
      });
    } else {
      console.log('❌ No Arbroath fixtures found in event_player_stats');
    }

    // 3. Check current player match_stats
    const { data: player, error: playerError } = await supabase
      .from('players')
      .select('match_stats, name')
      .eq('id', playerId)
      .single();

    if (playerError) {
      console.error('Error fetching player:', playerError);
      return;
    }

    console.log('\n🎯 CURRENT PLAYER MATCH_STATS:');
    console.log('Player name:', player.name);
    if (player.match_stats && typeof player.match_stats === 'object') {
      const stats = player.match_stats as any;
      console.log('🎯 Minutes by position:', stats.minutesByPosition);
      console.log('🎯 LM minutes:', stats.minutesByPosition?.LM || 0);
      console.log('🎯 CB minutes:', stats.minutesByPosition?.CB || 0);
      
      // Check recent games for Arbroath
      if (stats.recentGames && Array.isArray(stats.recentGames)) {
        const arbroathGame = stats.recentGames.find((game: any) => 
          game.opponent && game.opponent.toLowerCase().includes('arbroath')
        );
        
        if (arbroathGame) {
          console.log('🎯 ARBROATH GAME IN RECENT GAMES:');
          console.log('🎯 Opponent:', arbroathGame.opponent);
          console.log('🎯 Minutes by position:', arbroathGame.minutesByPosition);
          console.log('🎯 Total minutes:', arbroathGame.minutes);
        } else {
          console.log('❌ No Arbroath game found in recent games');
        }
      }
    }

    console.log(`=== END DEBUGGING FOR ${playerName} ===\n`);

  } catch (error) {
    console.error(`Error debugging positions for ${playerName}:`, error);
  }
};
