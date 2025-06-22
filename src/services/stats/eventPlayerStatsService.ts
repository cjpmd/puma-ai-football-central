
import { supabase } from '@/integrations/supabase/client';

export const eventPlayerStatsService = {
  /**
   * Clear all existing event_player_stats
   */
  async clearAllEventPlayerStats(): Promise<void> {
    console.log('Step 1: Clearing existing event_player_stats...');
    const { error: clearError } = await supabase
      .from('event_player_stats')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');

    if (clearError) {
      console.error('Error clearing event_player_stats:', clearError);
      throw clearError;
    }
    console.log('✅ Cleared all existing event_player_stats');
  },

  /**
   * Create event_player_stats from event_selections with proper position handling
   */
  async regenerateFromSelections(): Promise<void> {
    console.log('=== REGENERATING EVENT_PLAYER_STATS FROM SELECTIONS ===');
    
    // Get all event selections with event data
    const { data: selections, error: selectionsError } = await supabase
      .from('event_selections')
      .select(`
        *,
        events!inner(date, end_time, opponent, title)
      `);

    if (selectionsError) {
      console.error('Error fetching event selections:', selectionsError);
      throw selectionsError;
    }

    if (!selections || selections.length === 0) {
      console.log('No event selections found');
      return;
    }

    console.log(`📋 Processing ${selections.length} event selections...`);

    let totalRecordsCreated = 0;
    const processedPlayerEvents = new Set<string>();

    // Process each selection
    for (const selection of selections) {
      const event = selection.events;
      
      console.log(`🏈 Processing selection for event: ${event.title} (${event.date}) vs ${event.opponent}`);
      
      // Only process completed events
      if (!this.isEventCompleted(event.date, event.end_time)) {
        console.log(`⏸️ Skipping uncompleted event: ${event.date}`);
        continue;
      }

      const playerPositions = selection.player_positions as any[];
      if (!Array.isArray(playerPositions)) {
        console.log('❌ Player positions is not an array, skipping');
        continue;
      }

      console.log(`👥 Found ${playerPositions.length} players in selection`);

      // Special logging for Andrew McDonald and Arbroath fixture
      const isArbroathFixture = event.opponent && event.opponent.toLowerCase().includes('arbroath');
      const andrewId = '1297cfba-5c6d-48bc-9441-96584ec6df1c';
      
      if (isArbroathFixture) {
        console.log('🎯 PROCESSING ARBROATH MAROONS FIXTURE');
        console.log('🎯 Player positions array:', JSON.stringify(playerPositions, null, 2));
        
        // Find Andrew specifically
        const andrewData = playerPositions.find(pp => 
          pp.playerId === andrewId || pp.player_id === andrewId
        );
        if (andrewData) {
          console.log('🎯 ANDREW FOUND IN ARBROATH SELECTION:');
          console.log(`🎯 Position: "${andrewData.position}"`);
          console.log(`🎯 Is Substitute: ${andrewData.isSubstitute}`);
          console.log('🎯 Full Andrew data:', JSON.stringify(andrewData, null, 2));
        }
      }

      // Process each player in the selection
      for (const playerPos of playerPositions) {
        const playerId = playerPos.playerId || playerPos.player_id;
        if (!playerId) {
          console.log('❌ No player ID found, skipping position:', playerPos);
          continue;
        }

        const playerEventKey = `${playerId}-${selection.event_id}-${selection.team_number || 1}-${selection.period_number || 1}`;
        if (processedPlayerEvents.has(playerEventKey)) {
          console.log(`⚠️ Skipping duplicate entry for player ${playerId} in event ${selection.event_id}`);
          continue;
        }

        const position = playerPos.position;
        const isAndrewMcDonald = playerId === andrewId;
        
        if (isAndrewMcDonald && isArbroathFixture) {
          console.log(`🎯 ANDREW MCDONALD - ARBROATH FIXTURE PROCESSING:`);
          console.log(`🎯 Raw position from selection: "${position}"`);
          console.log(`🎯 Player object:`, JSON.stringify(playerPos, null, 2));
        }

        // Skip substitutes and invalid positions
        const isValidPlayingPosition = position && 
          position !== 'SUB' && 
          position !== 'Substitute' && 
          position !== 'TBD' &&
          position.trim() !== '' &&
          !playerPos.isSubstitute;

        if (isAndrewMcDonald && isArbroathFixture) {
          console.log(`🎯 ANDREW - Is valid playing position: ${isValidPlayingPosition}`);
          console.log(`🎯 ANDREW - Position: "${position}"`);
          console.log(`🎯 ANDREW - isSubstitute flag: ${playerPos.isSubstitute}`);
        }

        if (isValidPlayingPosition) {
          const minutesPlayed = playerPos.minutes || selection.duration_minutes || 90;
          const isCaptain = playerId === selection.captain_id;

          if (isAndrewMcDonald && isArbroathFixture) {
            console.log(`🎯 ANDREW - About to insert event_player_stats:`);
            console.log(`🎯 ANDREW - Player ID: ${playerId}`);
            console.log(`🎯 ANDREW - Position: "${position}"`);
            console.log(`🎯 ANDREW - Minutes: ${minutesPlayed}`);
            console.log(`🎯 ANDREW - Is Captain: ${isCaptain}`);
          }

          const { error: insertError } = await supabase
            .from('event_player_stats')
            .insert({
              event_id: selection.event_id,
              player_id: playerId,
              team_number: selection.team_number || 1,
              period_number: selection.period_number || 1,
              position: position,
              minutes_played: minutesPlayed,
              is_captain: isCaptain,
              is_substitute: false,
              performance_category_id: selection.performance_category_id
            });

          if (insertError) {
            console.error(`❌ Error inserting stats for player ${playerId}:`, insertError);
            if (isAndrewMcDonald && isArbroathFixture) {
              console.log('🎯 ANDREW - INSERT FAILED!', insertError);
            }
          } else {
            console.log(`✅ Successfully created stats for player ${playerId} in position ${position}`);
            if (isAndrewMcDonald && isArbroathFixture) {
              console.log(`🎯 ANDREW - Successfully inserted ${position} for player ${playerId}`);
            }
            totalRecordsCreated++;
            processedPlayerEvents.add(playerEventKey);
          }
        } else {
          if (isAndrewMcDonald && isArbroathFixture) {
            console.log(`🎯 ANDREW - Skipping invalid/substitute position: "${position}"`);
          }
          console.log(`⏸️ Skipping player ${playerId} with invalid/substitute position: "${position}"`);
        }
      }
    }

    console.log(`📊 REGENERATION SUMMARY: ${totalRecordsCreated} records created`);
    console.log('🎉 SUCCESSFULLY REGENERATED EVENT_PLAYER_STATS FROM SELECTIONS');
  },

  isEventCompleted(eventDate: string, endTime?: string): boolean {
    const today = new Date();
    const eventDateObj = new Date(eventDate);
    
    if (eventDateObj.toDateString() < today.toDateString()) {
      return true;
    }
    
    if (eventDateObj.toDateString() === today.toDateString() && endTime) {
      const now = new Date();
      const [hours, minutes] = endTime.split(':').map(Number);
      const eventEndTime = new Date();
      eventEndTime.setHours(hours, minutes, 0, 0);
      
      return now > eventEndTime;
    }
    
    return false;
  }
};
