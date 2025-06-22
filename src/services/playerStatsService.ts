
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

        // Special logging for Arbroath fixture
        const isArbroathFixture = event.opponent && event.opponent.toLowerCase().includes('arbroath');
        if (isArbroathFixture) {
          console.log('🎯 PROCESSING ARBROATH MAROONS FIXTURE');
          console.log('🎯 Player positions:', JSON.stringify(playerPositions, null, 2));
        }

        // Process each player in the selection
        for (const playerPos of playerPositions) {
          const playerId = playerPos.playerId || playerPos.player_id;
          if (!playerId) {
            console.log('❌ No player ID found, skipping position:', playerPos);
            continue;
          }

          const position = playerPos.position;
          const isValidPlayingPosition = position && 
            position !== 'SUB' && 
            position !== 'Substitute' && 
            position !== 'TBD' &&
            position.trim() !== '';

          if (isArbroathFixture) {
            console.log(`🎯 ARBROATH - Processing player ${playerId}:`);
            console.log(`🎯 Position: ${position}`);
            console.log(`🎯 Is valid playing position: ${isValidPlayingPosition}`);
          }

          if (isValidPlayingPosition) {
            // This is a player with an actual playing position
            const minutesPlayed = playerPos.minutes || selection.duration_minutes || 90;
            const isCaptain = playerId === selection.captain_id;

            console.log(`✅ Creating stats for player ${playerId}: ${position} for ${minutesPlayed} minutes`);

            if (isArbroathFixture) {
              console.log('🎯 ARBROATH - About to insert event_player_stats:');
              console.log(`🎯 Player ID: ${playerId}`);
              console.log(`🎯 Position: ${position}`);
              console.log(`🎯 Minutes: ${minutesPlayed}`);
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
              if (isArbroathFixture) {
                console.log('🎯 ARBROATH - INSERT FAILED!', insertError);
              }
            } else {
              console.log(`✅ Successfully created stats for player ${playerId}`);
              if (isArbroathFixture) {
                console.log(`🎯 ARBROATH - Successfully inserted ${position} for player ${playerId}`);
              }
              totalRecordsCreated++;
            }
          } else {
            console.log(`⏸️ Skipping player ${playerId} with invalid position: ${position}`);
          }
        }

        // Handle substitutes separately
        const substitutes = selection.substitute_players as any[] || selection.substitutes as any[] || [];
        if (Array.isArray(substitutes) && substitutes.length > 0) {
          console.log(`🔄 Processing ${substitutes.length} substitutes`);
          
          for (const sub of substitutes) {
            const playerId = sub.playerId || sub.player_id;
            if (!playerId) continue;

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
            }
          }
        }
      }

      console.log(`📊 REGENERATION SUMMARY: ${totalRecordsCreated} records created`);
      
      // Verify Arbroath data specifically
      const { data: arbroathCheck, error: checkError } = await supabase
        .from('event_player_stats')
        .select(`
          *,
          events!inner(date, opponent, title),
          players!inner(name)
        `)
        .ilike('events.opponent', '%arbroath%')
        .not('position', 'is', null);

      if (!checkError && arbroathCheck) {
        console.log('🎯 ARBROATH VERIFICATION - Records in event_player_stats:');
        arbroathCheck.forEach(stat => {
          console.log(`🎯 ${stat.players.name}: ${stat.position} for ${stat.minutes_played}min vs ${stat.events.opponent}`);
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
