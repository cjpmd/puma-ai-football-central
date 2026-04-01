import { logger } from '@/lib/logger';
import { supabase } from '@/integrations/supabase/client';

export const positionDebuggingService = {
  /**
   * Comprehensive debugging for Andrew McDonald to understand the data flow
   */
  async debugAndrewMcDonaldData(): Promise<void> {
    logger.log('🔍 === COMPREHENSIVE DEBUGGING FOR ANDREW MCDONALD ===');
    
    try {
      // Get Andrew McDonald's player ID
      const { data: andrewPlayer } = await supabase
        .from('players')
        .select('id, name')
        .eq('name', 'Andrew McDonald')
        .single();
        
      if (!andrewPlayer) {
        logger.log('❌ Andrew McDonald not found');
        return;
      }
      
      const andrewId = andrewPlayer.id;
      logger.log(`👤 Andrew McDonald ID: ${andrewId}`);
      
      // 1. Check what Andrew was actually selected for in event_selections
      logger.log('\n📋 === EVENT SELECTIONS (WHAT WAS ACTUALLY SELECTED) ===');
      const { data: eventSelections } = await supabase
        .from('event_selections')
        .select(`
          event_id,
          team_number,
          period_number,
          formation,
          player_positions,
          events!inner(title, opponent, date)
        `)
        .order('events(date)', { ascending: false });
        
      if (eventSelections) {
        for (const selection of eventSelections) {
          const playerPositions = selection.player_positions as any[];
          const andrewPosition = playerPositions?.find(pp => 
            pp.playerId === andrewId || pp.player_id === andrewId
          );
          
          if (andrewPosition) {
            logger.log(`📅 ${selection.events.date} vs ${selection.events.opponent}:`);
            logger.log(`   Team ${selection.team_number}, Period ${selection.period_number}`);
            logger.log(`   Selected Position: "${andrewPosition.position}"`);
            logger.log(`   Minutes: ${andrewPosition.minutes || 'Not specified'}`);
            logger.log(`   Is Substitute: ${andrewPosition.isSubstitute || false}`);
          }
        }
      }
      
      // 2. Check what's in event_player_stats (generated data)
      logger.log('\n📊 === EVENT PLAYER STATS (GENERATED DATA) ===');
      const { data: playerStats } = await supabase
        .from('event_player_stats')
        .select(`
          position,
          minutes_played,
          is_substitute,
          team_number,
          period_number,
          events!inner(title, opponent, date)
        `)
        .eq('player_id', andrewId)
        .order('events(date)', { ascending: false });
        
      if (playerStats) {
        for (const stat of playerStats) {
          logger.log(`📅 ${stat.events.date} vs ${stat.events.opponent}:`);
          logger.log(`   Team ${stat.team_number}, Period ${stat.period_number}`);
          logger.log(`   Generated Position: "${stat.position}"`);
          logger.log(`   Generated Minutes: ${stat.minutes_played}`);
          logger.log(`   Is Substitute: ${stat.is_substitute}`);
        }
      }
      
      // 3. Check Andrew's current match_stats JSON
      logger.log('\n📈 === PLAYER MATCH STATS (AGGREGATED DATA) ===');
      const { data: andrewFullData } = await supabase
        .from('players')
        .select('match_stats')
        .eq('id', andrewId)
        .single();
        
      if (andrewFullData?.match_stats) {
        const stats = andrewFullData.match_stats as any;
        logger.log('Total Games:', stats.totalGames);
        logger.log('Total Minutes:', stats.totalMinutes);
        logger.log('Minutes by Position:', stats.minutesByPosition);
        logger.log('Recent Games Sample:', stats.recentGames?.slice(0, 3));
      }
      
      // 4. Identify discrepancies
      logger.log('\n🔍 === DISCREPANCY ANALYSIS ===');
      logger.log('Check the logs above to identify:');
      logger.log('1. Position mismatches between selections and stats');
      logger.log('2. Minutes discrepancies');
      logger.log('3. Multiple records for same event/period');
      logger.log('4. Missing or extra data');
      
    } catch (error) {
      logger.error('❌ Error in debugging:', error);
    }
  },

  /**
   * Clean and regenerate data for a specific event
   */
  async debugAndFixSpecificEvent(eventId: string, eventTitle: string): Promise<void> {
    logger.log(`🔧 === DEBUGGING EVENT: ${eventTitle} ===`);
    
    try {
      // 1. Show current event_selections for this event
      const { data: selections } = await supabase
        .from('event_selections')
        .select('*')
        .eq('event_id', eventId);
        
      logger.log('📋 Event Selections:');
      selections?.forEach((sel, idx) => {
        logger.log(`Selection ${idx + 1}: Team ${sel.team_number}, Period ${sel.period_number}`);
        logger.log('Player Positions:', sel.player_positions);
      });
      
      // 2. Show current event_player_stats for this event
      const { data: stats } = await supabase
        .from('event_player_stats')
        .select(`
          player_id,
          position,
          minutes_played,
          is_substitute,
          team_number,
          period_number,
          players!inner(name)
        `)
        .eq('event_id', eventId);
        
      logger.log('\n📊 Generated Player Stats:');
      stats?.forEach(stat => {
        logger.log(`${stat.players.name}: ${stat.position}, ${stat.minutes_played}m, Team ${stat.team_number}, Period ${stat.period_number}, Sub: ${stat.is_substitute}`);
      });
      
      // 3. Clear and regenerate just this event
      logger.log('\n🔄 Clearing and regenerating this event...');
      
      // Delete existing stats for this event
      const { error: deleteError } = await supabase
        .from('event_player_stats')
        .delete()
        .eq('event_id', eventId);
        
      if (deleteError) throw deleteError;
      
      // Regenerate using database function
      const { error: regenError } = await supabase.rpc('regenerate_all_event_player_stats');
      if (regenError) throw regenError;
      
      logger.log('✅ Event regenerated successfully');
      
    } catch (error) {
      logger.error('❌ Error debugging event:', error);
    }
  },

  /**
   * Fix minutes aggregation issues
   */
  async fixMinutesAggregation(): Promise<void> {
    logger.log('🔧 === FIXING MINUTES AGGREGATION ISSUES ===');
    
    try {
      // Update the database function to properly aggregate minutes per game
      await supabase.rpc('regenerate_all_event_player_stats');
      await supabase.rpc('update_all_completed_events_stats');
      
      logger.log('✅ Minutes aggregation fixed');
    } catch (error) {
      logger.error('❌ Error fixing minutes aggregation:', error);
    }
  }
};