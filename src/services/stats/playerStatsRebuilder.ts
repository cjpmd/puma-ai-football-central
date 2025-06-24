
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
   * Complete rebuild of player statistics with FIXED position extraction
   */
  async rebuildAllPlayerStats(): Promise<void> {
    console.log('🔄 STARTING COMPLETE PLAYER STATS REBUILD WITH POSITION FIX');
    
    try {
      // Step 1: Debug Mason's event_selections data specifically
      console.log('Step 1: Debugging Mason\'s event_selections data...');
      const masonPlayerId = 'bb4de0de-c98c-485b-85b6-b70dd67736e4';
      
      const { data: masonSelections, error: masonSelectionsError } = await supabase
        .from('event_selections')
        .select(`
          id,
          event_id,
          player_positions,
          events!inner(title, opponent, date)
        `)
        .or('events.opponent.ilike.%ferry%,events.title.ilike.%ferry%');

      if (masonSelectionsError) {
        console.error('Error fetching Mason\'s selections:', masonSelectionsError);
      } else if (masonSelections) {
        console.log(`Found ${masonSelections.length} Ferry Athletic selections`);
        
        for (const selection of masonSelections) {
          console.log(`\n🎯 FERRY SELECTION ANALYSIS:`);
          console.log(`Event: ${selection.events?.title} vs ${selection.events?.opponent}`);
          console.log(`Event ID: ${selection.event_id}`);
          console.log(`Selection ID: ${selection.id}`);
          
          const playerPositions = selection.player_positions as PlayerPosition[];
          console.log(`Total players in selection: ${playerPositions?.length || 0}`);
          
          // Find Mason in this selection
          const masonPosition = playerPositions?.find(pp => 
            pp.playerId === masonPlayerId || pp.player_id === masonPlayerId
          );
          
          if (masonPosition) {
            console.log(`🎯 MASON FOUND IN SELECTION:`);
            console.log(`  Position: "${masonPosition.position}"`);
            console.log(`  PlayerId: ${masonPosition.playerId || masonPosition.player_id}`);
            console.log(`  Minutes: ${masonPosition.minutes}`);
            console.log(`  IsSubstitute: ${masonPosition.isSubstitute}`);
            console.log(`  Raw object:`, JSON.stringify(masonPosition, null, 2));
          } else {
            console.log(`❌ Mason NOT found in this selection`);
            console.log(`Available player IDs:`, playerPositions?.map(pp => pp.playerId || pp.player_id));
          }
        }
      }

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

      // Step 3: Get all event_selections and process them
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

      console.log(`Found ${selections?.length || 0} event selections to process`);

      // Step 4: Process each selection with enhanced position validation
      let processedRecords = 0;
      
      for (const selection of selections || []) {
        const event = selection.events;
        console.log(`Processing: ${event?.title} vs ${event?.opponent} (${event?.date})`);
        
        if (!selection.player_positions || !Array.isArray(selection.player_positions)) {
          console.warn('No player_positions data for selection:', selection.id);
          continue;
        }

        const playerPositions = selection.player_positions as PlayerPosition[];

        for (const playerPosition of playerPositions) {
          const playerId = playerPosition.playerId || playerPosition.player_id;
          
          if (!playerId) {
            console.warn('No player ID found in position:', playerPosition);
            continue;
          }

          // CRITICAL: Extract position with strict validation and trimming
          let position = playerPosition.position;
          if (!position || typeof position !== 'string') {
            console.warn(`Invalid position for player ${playerId}:`, position);
            continue;
          }
          
          // Trim whitespace and validate
          position = position.trim();
          if (position === '') {
            console.warn(`Empty position after trim for player ${playerId}`);
            continue;
          }

          // FIXED: Use actual minutes from playerPosition, not event duration
          const minutesPlayedForThisPosition = playerPosition.minutes || 0;
          
          // Enhanced logging for Mason and Ferry matches
          if (playerId === masonPlayerId && event?.opponent?.toLowerCase().includes('ferry')) {
            console.log('🎯 PROCESSING MASON FOR FERRY MATCH:');
            console.log('  Event:', event?.title, 'vs', event?.opponent);
            console.log('  Raw playerPosition:', JSON.stringify(playerPosition, null, 2));
            console.log('  Extracted position:', `"${position}"`);
            console.log('  Position type:', typeof position);
            console.log('  Position length:', position.length);
            console.log('  Minutes from playerPosition:', playerPosition.minutes);
            console.log('  Using minutes:', minutesPlayedForThisPosition);
          }

          const isCaptain = playerId === selection.captain_id;
          const isSubstitute = playerPosition.isSubstitute || position === 'SUB' || position === 'Substitute';

          // Insert the record with the EXACT position from selection
          const { error: insertError } = await supabase
            .from('event_player_stats')
            .insert({
              event_id: selection.event_id,
              player_id: playerId,
              team_number: selection.team_number || 1,
              period_number: selection.period_number || 1,
              position: position, // Use the exact trimmed position
              minutes_played: minutesPlayedForThisPosition,
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
              minutes_played: minutesPlayedForThisPosition
            });
            throw insertError;
          }

          // Immediate verification for Mason in Ferry matches
          if (playerId === masonPlayerId && event?.opponent?.toLowerCase().includes('ferry')) {
            const { data: verifyData } = await supabase
              .from('event_player_stats')
              .select('position, minutes_played')
              .eq('event_id', selection.event_id)
              .eq('player_id', playerId)
              .single();
              
            console.log('🔍 IMMEDIATE VERIFICATION - Mason Ferry record:', verifyData);
          }

          processedRecords++;
        }
      }

      console.log(`✅ Processed ${processedRecords} player stat records`);

      // Step 5: Final verification of Mason's Ferry data
      console.log('🔍 FINAL VERIFICATION - Mason\'s Ferry data in event_player_stats:');
      const { data: masonFerryStats, error: ferryStatsError } = await supabase
        .from('event_player_stats')
        .select(`
          position,
          minutes_played,
          is_substitute,
          events!inner(title, opponent, date)
        `)
        .eq('player_id', masonPlayerId)
        .or('events.opponent.ilike.%ferry%,events.title.ilike.%ferry%');

      if (ferryStatsError) {
        console.error('Error fetching Mason Ferry stats:', ferryStatsError);
      } else {
        console.log(`Found ${masonFerryStats?.length || 0} Mason Ferry records:`);
        masonFerryStats?.forEach((stat, index) => {
          const event = stat.events;
          console.log(`  ${index + 1}. ${event?.title} vs ${event?.opponent}: Position="${stat.position}", Minutes=${stat.minutes_played}`);
        });
      }

      // Step 6: Rebuild individual player match stats
      console.log('Step 6: Rebuilding individual player match stats...');
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
      // Get all player stats from event_player_stats
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

      // Get performance categories separately
      const { data: performanceCategories, error: categoriesError } = await supabase
        .from('performance_categories')
        .select('id, name');

      if (categoriesError) {
        console.error('Error fetching performance categories:', categoriesError);
        throw categoriesError;
      }

      const categoryMap = new Map(
        performanceCategories?.map(cat => [cat.id, cat.name]) || []
      );

      // Calculate totals
      const totalGames = new Set(playerStats.map(s => s.event_id)).size;
      const totalMinutes = playerStats.reduce((sum, stat) => sum + (stat.minutes_played || 0), 0);
      const captainGames = new Set(playerStats.filter(s => s.is_captain).map(s => s.event_id)).size;
      const potmCount = new Set(playerStats.filter(s => s.events?.player_of_match_id === playerId).map(s => s.event_id)).size;

      // Calculate minutes by position - sum actual playing minutes per position
      const minutesByPosition: Record<string, number> = {};
      
      playerStats.forEach(stat => {
        if (stat.position && stat.minutes_played > 0) {
          minutesByPosition[stat.position] = (minutesByPosition[stat.position] || 0) + stat.minutes_played;
        }
      });

      // Special logging for Mason
      if (playerId === masonPlayerId) {
        console.log('🔍 MASON FINAL POSITIONS:', JSON.stringify(minutesByPosition, null, 2));
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
  }
};
