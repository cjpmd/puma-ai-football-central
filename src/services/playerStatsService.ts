
import { supabase } from '@/integrations/supabase/client';

export const playerStatsService = {
  /**
   * Update a specific player's match statistics using the database function
   */
  async updatePlayerStats(playerId: string): Promise<void> {
    try {
      console.log('=== UPDATING PLAYER STATS ===');
      console.log('Player ID:', playerId);
      
      const { error } = await supabase.rpc('update_player_match_stats', {
        player_uuid: playerId
      });

      if (error) {
        console.error('Error updating player stats:', error);
        throw error;
      }
      
      console.log('Successfully updated player stats for:', playerId);
    } catch (error) {
      console.error('Error updating player stats:', error);
      throw error;
    }
  },

  /**
   * Update all player stats for a specific event
   */
  async updateEventPlayerStats(eventId: string): Promise<void> {
    try {
      console.log('Updating stats for all players in event:', eventId);
      
      const { error } = await supabase.rpc('update_event_player_stats', {
        event_uuid: eventId
      });

      if (error) {
        console.error('Error updating event player stats:', error);
        throw error;
      }
      
      console.log('Completed updating all player stats for event');
    } catch (error) {
      console.error('Error updating event player stats:', error);
      throw error;
    }
  },

  async updateAllCompletedEventsStats(): Promise<void> {
    try {
      console.log('Starting bulk update of all completed events');
      
      const { error } = await supabase.rpc('update_all_completed_events_stats');

      if (error) {
        console.error('Error updating all completed events stats:', error);
        throw error;
      }
      
      console.log('Completed bulk update of all events');
    } catch (error) {
      console.error('Error updating all completed events stats:', error);
      throw error;
    }
  },

  async regenerateAllPlayerStats(): Promise<void> {
    try {
      console.log('=== STARTING COMPLETE DATA REGENERATION ===');
      
      // Step 1: Clear all existing event_player_stats
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

      // Step 2: Regenerate event_player_stats from event_selections
      console.log('Step 2: Regenerating event_player_stats from event_selections...');
      await this.regenerateEventPlayerStatsFromSelections();

      // Step 3: Update all player match stats
      console.log('Step 3: Updating all player match stats...');
      const { error: updateError } = await supabase.rpc('update_all_completed_events_stats');

      if (updateError) {
        console.error('Error updating player stats:', updateError);
        throw updateError;
      }
      
      console.log('=== COMPLETE DATA REGENERATION FINISHED ===');
    } catch (error) {
      console.error('Error regenerating player stats:', error);
      throw error;
    }
  },

  async regenerateEventPlayerStatsFromSelections(): Promise<void> {
    try {
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
      const processedPlayerEvents = new Set<string>(); // Track processed player+event combinations

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

        // Special logging for Arbroath fixture and Andrew McDonald
        const isArbroathFixture = event.opponent && event.opponent.toLowerCase().includes('arbroath');
        if (isArbroathFixture) {
          console.log('🎯 PROCESSING ARBROATH MAROONS FIXTURE');
          console.log('🎯 Player positions array:', JSON.stringify(playerPositions, null, 2));
        }

        // Process each player in the selection
        for (const playerPos of playerPositions) {
          const playerId = playerPos.playerId || playerPos.player_id;
          if (!playerId) {
            console.log('❌ No player ID found, skipping position:', playerPos);
            continue;
          }

          // Create unique key to prevent duplicates
          const playerEventKey = `${playerId}-${selection.event_id}-${selection.team_number || 1}-${selection.period_number || 1}`;
          if (processedPlayerEvents.has(playerEventKey)) {
            console.log(`⚠️ Skipping duplicate entry for player ${playerId} in event ${selection.event_id}`);
            continue;
          }

          const position = playerPos.position;
          
          // Check if this is Andrew McDonald for debugging
          const isAndrewMcDonald = playerId === '1297cfba-5c6d-48bc-9441-96584ec6df1c';
          
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
            // This is a player with an actual playing position
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

        // Handle substitutes separately if they exist
        const substitutes = selection.substitute_players as any[] || selection.substitutes as any[] || [];
        if (Array.isArray(substitutes) && substitutes.length > 0) {
          console.log(`🔄 Processing ${substitutes.length} substitutes`);
          
          for (const sub of substitutes) {
            const playerId = sub.playerId || sub.player_id;
            if (!playerId) continue;

            const playerEventKey = `${playerId}-${selection.event_id}-${selection.team_number || 1}-${selection.period_number || 1}-SUB`;
            if (processedPlayerEvents.has(playerEventKey)) {
              console.log(`⚠️ Skipping duplicate substitute entry for player ${playerId}`);
              continue;
            }

            console.log(`🔄 Creating substitute stats for player ${playerId}`);

            const { error: insertError } = await supabase
              .from('event_player_stats')
              .insert({
                event_id: selection.event_id,
                player_id: playerId,
                team_number: selection.team_number || 1,
                period_number: selection.period_number || 1,
                position: null,
                minutes_played: 0,
                is_captain: false,
                is_substitute: true,
                performance_category_id: selection.performance_category_id
              });

            if (insertError) {
              console.error(`❌ Error inserting substitute stats:`, insertError);
            } else {
              totalRecordsCreated++;
              processedPlayerEvents.add(playerEventKey);
            }
          }
        }
      }

      console.log(`📊 REGENERATION SUMMARY: ${totalRecordsCreated} records created`);
      console.log(`🔍 Processed ${processedPlayerEvents.size} unique player-event combinations`);
      
      // Verify Andrew's data specifically after regeneration
      const { data: andrewStats, error: andrewError } = await supabase
        .from('event_player_stats')
        .select(`
          *,
          events!inner(date, opponent, title)
        `)
        .eq('player_id', '1297cfba-5c6d-48bc-9441-96584ec6df1c')
        .ilike('events.opponent', '%arbroath%');

      if (!andrewError && andrewStats) {
        console.log('🎯 ANDREW VERIFICATION - Records in event_player_stats after regeneration:');
        andrewStats.forEach(stat => {
          console.log(`🎯 ANDREW: Position "${stat.position}" for ${stat.minutes_played}min vs ${stat.events.opponent} (Captain: ${stat.is_captain}, Sub: ${stat.is_substitute})`);
        });
      }

      console.log('🎉 SUCCESSFULLY REGENERATED EVENT_PLAYER_STATS FROM SELECTIONS');

    } catch (error) {
      console.error('Error regenerating event_player_stats:', error);
      throw error;
    }
  },

  isEventCompleted(eventDate: string, endTime?: string): boolean {
    const today = new Date();
    const eventDateObj = new Date(eventDate);
    
    // If event date is in the past, it's completed
    if (eventDateObj.toDateString() < today.toDateString()) {
      return true;
    }
    
    // If event is today and has an end time, check if end time has passed
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
