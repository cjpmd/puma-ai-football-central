
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
        events!inner(id, date, end_time, opponent, title)
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

      // Special logging for Ferry Athletic fixture
      const isFerryFixture = (event.opponent && event.opponent.toLowerCase().includes('ferry')) || 
                            (event.title && event.title.toLowerCase().includes('ferry'));
      const masonId = 'bb4de0de-c98c-485b-85b6-b70dd67736e4'; // Mason McPherson ID
      
      if (isFerryFixture) {
        console.log('🎯 PROCESSING FERRY ATHLETIC FIXTURE');
        console.log('🎯 Event title:', event.title);
        console.log('🎯 Event opponent:', event.opponent);
        console.log('🎯 Selection team number:', selection.team_number);
        console.log('🎯 Selection period number:', selection.period_number);
        console.log('🎯 Player positions array:', JSON.stringify(playerPositions, null, 2));
        
        // Find Mason specifically
        const masonData = playerPositions.find(pp => 
          pp.playerId === masonId || pp.player_id === masonId
        );
        if (masonData) {
          console.log('🎯 MASON FOUND IN FERRY SELECTION:');
          console.log(`🎯 Position: "${masonData.position}"`);
          console.log(`🎯 Is Substitute: ${masonData.isSubstitute}`);
          console.log('🎯 Full Mason data:', JSON.stringify(masonData, null, 2));
        }
      }

      // Process each player in the selection
      for (const playerPos of playerPositions) {
        const playerId = playerPos.playerId || playerPos.player_id;
        if (!playerId) {
          console.log('❌ No player ID found, skipping position:', playerPos);
          continue;
        }

        const position = playerPos.position;
        const isMasonMcPherson = playerId === masonId;
        
        if (isMasonMcPherson && isFerryFixture) {
          console.log(`🎯 MASON MCPHERSON - FERRY FIXTURE PROCESSING:`);
          console.log(`🎯 Raw position from selection: "${position}"`);
          console.log(`🎯 Team/Period: ${selection.team_number}/${selection.period_number}`);
          console.log(`🎯 Player object:`, JSON.stringify(playerPos, null, 2));
        }

        // Create unique key for this player-event-team-period combination
        const playerEventKey = `${playerId}-${selection.event_id}-${selection.team_number || 1}-${selection.period_number || 1}`;
        if (processedPlayerEvents.has(playerEventKey)) {
          console.log(`⚠️ Skipping duplicate entry for player ${playerId} in event ${selection.event_id}, team ${selection.team_number}, period ${selection.period_number}`);
          continue;
        }

        // Handle both substitutes and playing positions
        const isSubstitute = playerPos.isSubstitute || position === 'SUB' || position === 'Substitute';
        const minutesPlayed = playerPos.minutes || selection.duration_minutes || 90;
        const isCaptain = playerId === selection.captain_id;

        if (isMasonMcPherson && isFerryFixture) {
          console.log(`🎯 MASON - Processing entry:`);
          console.log(`🎯 MASON - Position: "${position}"`);
          console.log(`🎯 MASON - Is Substitute: ${isSubstitute}`);
          console.log(`🎯 MASON - Minutes: ${minutesPlayed}`);
          console.log(`🎯 MASON - Is Captain: ${isCaptain}`);
        }

        // Insert all entries (both playing positions and substitutes)
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
            is_substitute: isSubstitute,
            performance_category_id: selection.performance_category_id
          });

        if (insertError) {
          console.error(`❌ Error inserting stats for player ${playerId}:`, insertError);
          if (isMasonMcPherson && isFerryFixture) {
            console.log('🎯 MASON - INSERT FAILED!', insertError);
          }
        } else {
          console.log(`✅ Successfully created stats for player ${playerId} in position ${position} (substitute: ${isSubstitute})`);
          if (isMasonMcPherson && isFerryFixture) {
            console.log(`🎯 MASON - Successfully inserted ${position} for player ${playerId} (substitute: ${isSubstitute})`);
          }
          totalRecordsCreated++;
          processedPlayerEvents.add(playerEventKey);
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
