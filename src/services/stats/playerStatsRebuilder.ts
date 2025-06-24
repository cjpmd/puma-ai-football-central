import { supabase } from '@/integrations/supabase/client';

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
   * Complete rebuild of player statistics with detailed logging
   */
  async rebuildAllPlayerStats(): Promise<void> {
    console.log('🔄 STARTING COMPLETE PLAYER STATS REBUILD');
    
    try {
      // Step 1: Debug current event_selections data with detailed position logging
      console.log('Step 1: Analyzing event_selections data...');
      const { data: selections, error: selectionsError } = await supabase
        .from('event_selections')
        .select(`
          id,
          event_id,
          player_positions,
          duration_minutes,
          captain_id,
          performance_category_id,
          team_number,
          period_number,
          events (
            title,
            opponent,
            date
          )
        `)
        .order('events(date)', { ascending: false });

      if (selectionsError) {
        console.error('Error fetching event selections:', selectionsError);
        throw selectionsError;
      }

      console.log(`Found ${selections?.length || 0} event selections`);

      // Step 2: Clear all existing event_player_stats
      console.log('Step 2: Clearing existing event_player_stats...');
      const { error: clearError } = await supabase
        .from('event_player_stats')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');

      if (clearError) {
        console.error('Error clearing event_player_stats:', clearError);
        throw clearError;
      }

      console.log('✅ Cleared existing event_player_stats');

      // Step 3: Process each selection manually with detailed logging
      let processedRecords = 0;
      const masonPlayerId = 'bb4de0de-c98c-485b-85b6-b70dd67736e4';
      
      for (const selection of selections || []) {
        const event = selection.events;
        console.log(`Processing: ${event?.title} vs ${event?.opponent} (${event?.date})`);
        
        if (!selection.player_positions || !Array.isArray(selection.player_positions)) {
          console.warn('No player_positions data for selection:', selection.id);
          continue;
        }

        // Cast to proper type
        const playerPositions = selection.player_positions as PlayerPosition[];

        for (const playerPosition of playerPositions) {
          const playerId = playerPosition.playerId || playerPosition.player_id;
          
          if (!playerId) {
            console.warn('No player ID found in position:', playerPosition);
            continue;
          }

          // Extract position with detailed logging for Mason
          const position = playerPosition.position;
          if (!position) {
            console.warn('No position found for player:', playerId);
            continue;
          }

          // Special logging for Mason to track the exact data flow
          if (playerId === masonPlayerId) {
            console.log('🎯 PROCESSING MASON - DETAILED TRACE:');
            console.log('  Event:', event?.title, 'vs', event?.opponent);
            console.log('  Raw playerPosition object:', JSON.stringify(playerPosition, null, 2));
            console.log('  Extracted position VALUE:', position);
            console.log('  Position type:', typeof position);
            console.log('  Position length:', position.length);
            console.log('  Position char codes:', position.split('').map(c => `${c}(${c.charCodeAt(0)})`));
            console.log('  About to insert into database with position:', position);
          }

          const minutes = playerPosition.minutes || selection.duration_minutes || 90;
          const isCaptain = playerId === selection.captain_id;
          const isSubstitute = playerPosition.isSubstitute || position === 'SUB' || position === 'Substitute';

          console.log(`  Player ${playerId}: "${position}" for ${minutes} minutes`);

          // Insert the record with exact position as stored
          const { error: insertError } = await supabase
            .from('event_player_stats')
            .insert({
              event_id: selection.event_id,
              player_id: playerId,
              team_number: selection.team_number || 1,
              period_number: selection.period_number || 1,
              position: position, // Use the exact position string
              minutes_played: minutes,
              is_captain: isCaptain,
              is_substitute: isSubstitute,
              substitution_time: playerPosition.substitution_time,
              performance_category_id: selection.performance_category_id
            });

          if (insertError) {
            console.error('Error inserting player stat:', insertError);
            console.error('Failed data:', {
              event_id: selection.event_id,
              player_id: playerId,
              position: position,
              minutes_played: minutes
            });
            throw insertError;
          }

          // Immediately verify Mason's insertion
          if (playerId === masonPlayerId) {
            const { data: verifyData } = await supabase
              .from('event_player_stats')
              .select('position, minutes_played')
              .eq('event_id', selection.event_id)
              .eq('player_id', playerId)
              .single();
              
            console.log('🔍 IMMEDIATE VERIFICATION - Just inserted Mason record:', verifyData);
          }

          processedRecords++;
        }
      }

      console.log(`✅ Processed ${processedRecords} player stat records`);

      // Step 4: Verify ALL of Mason's data after processing
      console.log('🔍 FINAL VERIFICATION - ALL MASON DATA IN DATABASE:');
      const { data: allMasonStats, error: masonStatsError } = await supabase
        .from('event_player_stats')
        .select(`
          position,
          minutes_played,
          events (title, opponent, date)
        `)
        .eq('player_id', masonPlayerId)
        .order('events(date)', { ascending: false });

      if (masonStatsError) {
        console.error('Error fetching Mason stats for verification:', masonStatsError);
      } else {
        console.log(`Found ${allMasonStats?.length || 0} Mason records in database:`);
        allMasonStats?.forEach((stat, index) => {
          const event = stat.events;
          console.log(`  ${index + 1}. ${event?.title} vs ${event?.opponent} (${event?.date}): Position="${stat.position}", Minutes=${stat.minutes_played}`);
        });
      }

      // Step 5: Rebuild individual player match stats
      console.log('Step 5: Rebuilding individual player match stats...');
      const { data: players, error: playersError } = await supabase
        .from('players')
        .select('id, name')
        .eq('status', 'active');

      if (playersError) {
        console.error('Error fetching players:', playersError);
        throw playersError;
      }

      for (const player of players || []) {
        await this.rebuildPlayerMatchStats(player.id, player.name);
      }

      // Step 6: Final check of Mason's match_stats
      console.log('🔍 FINAL CHECK - MASON MATCH STATS:');
      const { data: masonPlayer } = await supabase
        .from('players')
        .select('match_stats')
        .eq('id', masonPlayerId)
        .single();
        
      if (masonPlayer?.match_stats) {
        const matchStats = masonPlayer.match_stats as MatchStats;
        console.log('Mason final match_stats minutesByPosition:', matchStats.minutesByPosition);
        console.log('Mason final match_stats recentGames (first 3):');
        const recentGames = matchStats.recentGames?.slice(0, 3) || [];
        recentGames.forEach((game, index) => {
          console.log(`  ${index + 1}. ${game.opponent}: positions=${JSON.stringify(game.minutesByPosition)}`);
        });
      }

      console.log('🎉 COMPLETE PLAYER STATS REBUILD SUCCESSFUL');
      
    } catch (error) {
      console.error('❌ Error in rebuild:', error);
      throw error;
    }
  },

  /**
   * Rebuild match stats for a specific player
   */
  async rebuildPlayerMatchStats(playerId: string, playerName: string): Promise<void> {
    console.log(`📊 Rebuilding match stats for ${playerName}...`);
    
    try {
      // Get all player stats from event_player_stats - fix the relation issue
      const { data: playerStats, error: statsError } = await supabase
        .from('event_player_stats')
        .select(`
          *,
          events (
            id,
            date,
            opponent,
            title,
            start_time,
            player_of_match_id
          )
        `)
        .eq('player_id', playerId)
        .order('events(date)', { ascending: false });

      if (statsError) {
        console.error(`Error fetching stats for ${playerName}:`, statsError);
        throw statsError;
      }

      if (!playerStats || playerStats.length === 0) {
        console.log(`No stats found for ${playerName}`);
        return;
      }

      // Special debugging for Mason
      if (playerId === 'bb4de0de-c98c-485b-85b6-b70dd67736e4') {
        console.log('🔍 MASON DETAILED AGGREGATION DEBUG:');
        console.log(`Found ${playerStats.length} event_player_stats records for Mason`);
        
        playerStats.forEach((stat, index) => {
          const event = stat.events;
          console.log(`  Record ${index + 1}: ${event?.title} vs ${event?.opponent}`);
          console.log(`    - Position in DB: "${stat.position}" (type: ${typeof stat.position})`);
          console.log(`    - Minutes: ${stat.minutes_played}`);
          console.log(`    - Will contribute to aggregation: ${stat.position && stat.minutes_played > 0 ? 'YES' : 'NO'}`);
        });
      }

      // Get performance categories separately to avoid relation issues
      const { data: performanceCategories, error: categoriesError } = await supabase
        .from('performance_categories')
        .select('id, name');

      if (categoriesError) {
        console.error('Error fetching performance categories:', categoriesError);
        throw categoriesError;
      }

      // Create a map for quick category lookup
      const categoryMap = new Map(
        performanceCategories?.map(cat => [cat.id, cat.name]) || []
      );

      // Calculate totals
      const totalGames = new Set(playerStats.map(s => s.event_id)).size;
      const totalMinutes = playerStats.reduce((sum, stat) => sum + (stat.minutes_played || 0), 0);
      const captainGames = new Set(playerStats.filter(s => s.is_captain).map(s => s.event_id)).size;
      const potmCount = new Set(playerStats.filter(s => s.events?.player_of_match_id === playerId).map(s => s.event_id)).size;

      // Calculate minutes by position with detailed logging for Mason
      const minutesByPosition: Record<string, number> = {};
      
      if (playerId === 'bb4de0de-c98c-485b-85b6-b70dd67736e4') {
        console.log('🔍 MASON POSITION AGGREGATION STEP-BY-STEP:');
      }
      
      playerStats.forEach((stat, index) => {
        if (stat.position && stat.minutes_played > 0) {
          const currentMinutes = minutesByPosition[stat.position] || 0;
          const newMinutes = currentMinutes + stat.minutes_played;
          minutesByPosition[stat.position] = newMinutes;
          
          if (playerId === 'bb4de0de-c98c-485b-85b6-b70dd67736e4') {
            console.log(`  Step ${index + 1}: Adding "${stat.position}" + ${stat.minutes_played} minutes`);
            console.log(`    - Previous total for "${stat.position}": ${currentMinutes}`);
            console.log(`    - New total for "${stat.position}": ${newMinutes}`);
            console.log(`    - Current minutesByPosition object:`, JSON.stringify(minutesByPosition, null, 2));
          }
        }
      });

      if (playerId === 'bb4de0de-c98c-485b-85b6-b70dd67736e4') {
        console.log('🔍 MASON FINAL AGGREGATED POSITIONS:', JSON.stringify(minutesByPosition, null, 2));
      }

      // Calculate performance category stats
      const performanceCategoryStats: Record<string, any> = {};
      const categoryGroups = playerStats.reduce((groups, stat) => {
        const categoryName = categoryMap.get(stat.performance_category_id || '');
        if (categoryName) {
          if (!groups[categoryName]) {
            groups[categoryName] = [];
          }
          groups[categoryName].push(stat);
        }
        return groups;
      }, {} as Record<string, typeof playerStats>);

      Object.entries(categoryGroups).forEach(([categoryName, stats]) => {
        const categoryTotalGames = new Set(stats.map(s => s.event_id)).size;
        const categoryTotalMinutes = stats.reduce((sum, stat) => sum + (stat.minutes_played || 0), 0);
        const categoryCaptainGames = new Set(stats.filter(s => s.is_captain).map(s => s.event_id)).size;
        const categoryPotmCount = new Set(stats.filter(s => s.events?.player_of_match_id === playerId).map(s => s.event_id)).size;
        
        const categoryMinutesByPosition: Record<string, number> = {};
        stats.forEach(stat => {
          if (stat.position && stat.minutes_played > 0) {
            categoryMinutesByPosition[stat.position] = (categoryMinutesByPosition[stat.position] || 0) + stat.minutes_played;
          }
        });

        performanceCategoryStats[categoryName] = {
          totalGames: categoryTotalGames,
          totalMinutes: categoryTotalMinutes,
          captainGames: categoryCaptainGames,
          potmCount: categoryPotmCount,
          minutesByPosition: categoryMinutesByPosition
        };
      });

      // Get recent games data
      const gameAggregates = playerStats.reduce((games, stat) => {
        const eventId = stat.event_id;
        if (!games[eventId]) {
          const categoryName = categoryMap.get(stat.performance_category_id || '');
          games[eventId] = {
            id: eventId,
            date: stat.events?.date,
            opponent: stat.events?.opponent || 'Unknown',
            title: stat.events?.title,
            performanceCategory: categoryName,
            minutes: 0,
            minutesByPosition: {} as Record<string, number>,
            captain: false,
            playerOfTheMatch: stat.events?.player_of_match_id === playerId,
            wasSubstitute: false
          };
        }
        
        games[eventId].minutes += stat.minutes_played || 0;
        if (stat.position && stat.minutes_played > 0) {
          games[eventId].minutesByPosition[stat.position] = (games[eventId].minutesByPosition[stat.position] || 0) + stat.minutes_played;
        }
        if (stat.is_captain) games[eventId].captain = true;
        if (stat.is_substitute) games[eventId].wasSubstitute = true;
        
        return games;
      }, {} as Record<string, any>);

      const recentGames = Object.values(gameAggregates)
        .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 10);

      // Update player's match_stats
      const matchStats = {
        totalGames,
        totalMinutes,
        captainGames,
        playerOfTheMatchCount: potmCount,
        minutesByPosition,
        performanceCategoryStats,
        recentGames
      };

      if (playerId === 'bb4de0de-c98c-485b-85b6-b70dd67736e4') {
        console.log('🔍 MASON FINAL MATCH STATS BEFORE DB UPDATE:', JSON.stringify(matchStats, null, 2));
      }

      const { error: updateError } = await supabase
        .from('players')
        .update({ 
          match_stats: matchStats,
          updated_at: new Date().toISOString()
        })
        .eq('id', playerId);

      if (updateError) {
        console.error(`Error updating ${playerName} stats:`, updateError);
        throw updateError;
      }

      console.log(`✅ Updated ${playerName}: ${totalGames} games, ${totalMinutes} minutes`);
      console.log(`   Positions:`, minutesByPosition);
      
    } catch (error) {
      console.error(`Error rebuilding stats for ${playerName}:`, error);
      throw error;
    }
  },

  /**
   * Debug a specific player's data transformation
   */
  async debugPlayerDataFlow(playerId: string, playerName: string): Promise<void> {
    console.log(`🔍 DEBUGGING DATA FLOW FOR ${playerName} (${playerId})`);
    
    try {
      // Check event_selections
      const { data: selections } = await supabase
        .from('event_selections')
        .select(`
          id,
          player_positions,
          duration_minutes,
          events (title, opponent, date)
        `)
        .contains('player_positions', [{ playerId }])
        .order('events(date)', { ascending: false })
        .limit(5);

      console.log('EVENT SELECTIONS:');
      selections?.forEach(selection => {
        const event = selection.events;
        console.log(`  ${event?.title} vs ${event?.opponent} (${event?.date})`);
        
        const playerPositions = selection.player_positions as PlayerPosition[];
        const playerPos = playerPositions?.find(p => p.playerId === playerId || p.player_id === playerId);
        if (playerPos) {
          console.log(`    Selection: ${playerPos.position} for ${playerPos.minutes || selection.duration_minutes || 90} minutes`);
        }
      });

      // Check event_player_stats
      const { data: stats } = await supabase
        .from('event_player_stats')
        .select(`
          position,
          minutes_played,
          is_substitute,
          events (title, opponent, date)
        `)
        .eq('player_id', playerId)
        .order('events(date)', { ascending: false })
        .limit(5);

      console.log('EVENT PLAYER STATS:');
      stats?.forEach(stat => {
        const event = stat.events;
        console.log(`  ${event?.title} vs ${event?.opponent} (${event?.date})`);
        console.log(`    Stats: ${stat.position} for ${stat.minutes_played} minutes (substitute: ${stat.is_substitute})`);
      });

    } catch (error) {
      console.error('Error in debug:', error);
    }
  }
};
