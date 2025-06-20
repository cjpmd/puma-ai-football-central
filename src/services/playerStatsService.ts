import { supabase } from '@/integrations/supabase/client';

export const playerStatsService = {
  /**
   * Update a specific player's match statistics using the database function
   */
  async updatePlayerStats(playerId: string): Promise<void> {
    try {
      console.log('=== DEBUGGING PLAYER STATS UPDATE ===');
      console.log('Updating stats for player:', playerId);
      
      // Debug: Check what position data exists for this player in event_player_stats
      const { data: playerStats, error: statsError } = await supabase
        .from('event_player_stats')
        .select(`
          *,
          events!inner(date, opponent, end_time)
        `)
        .eq('player_id', playerId)
        .order('events(date)', { ascending: false });

      if (statsError) {
        console.error('Error fetching player stats for debugging:', statsError);
      } else {
        console.log('=== EVENT_PLAYER_STATS DATA ===');
        console.log('Current event_player_stats for player:', playerStats);
        console.log('Position data breakdown:', 
          playerStats?.map(stat => ({
            date: stat.events?.date,
            opponent: stat.events?.opponent,
            position: stat.position,
            minutes: stat.minutes_played,
            eventId: stat.event_id,
            playerId: stat.player_id
          }))
        );
        
        // Specifically look for Arbroath Maroons fixture
        const arbroathFixture = playerStats?.find(stat => 
          stat.events?.opponent && stat.events.opponent.toLowerCase().includes('arbroath')
        );
        if (arbroathFixture) {
          console.log('🎯 ARBROATH MAROONS FIXTURE FOUND IN EVENT_PLAYER_STATS:');
          console.log('Position recorded:', arbroathFixture.position);
          console.log('Minutes recorded:', arbroathFixture.minutes_played);
          console.log('Event ID:', arbroathFixture.event_id);
        }
      }

      // Also check event_selections to see what was actually selected
      const { data: eventSelections, error: selectionsError } = await supabase
        .from('event_selections')
        .select(`
          *,
          events!inner(date, opponent)
        `)
        .in('event_id', playerStats?.map(s => s.event_id) || []);

      if (!selectionsError && eventSelections) {
        console.log('=== EVENT_SELECTIONS DATA ===');
        eventSelections.forEach(selection => {
          console.log(`Event ${selection.event_id} (${selection.events?.date} vs ${selection.events?.opponent}):`);
          console.log('Player positions in selection:', selection.player_positions);
          
          // Check if this player is in the selection - properly handle Json type
          const playerPositions = selection.player_positions;
          if (Array.isArray(playerPositions)) {
            const playerInSelection = playerPositions.find((pp: any) => 
              pp.playerId === playerId || pp.player_id === playerId
            );
            if (playerInSelection) {
              console.log('Player found in selection:', playerInSelection);
              
              // Specifically check Arbroath fixture
              if (selection.events?.opponent && selection.events.opponent.toLowerCase().includes('arbroath')) {
                console.log('🎯 ARBROATH MAROONS FIXTURE - SELECTION DATA:');
                console.log('Position in selection:', (playerInSelection as any).position);
                console.log('Should be LM, is it?', (playerInSelection as any).position === 'LM');
                console.log('Full player selection data:', JSON.stringify(playerInSelection, null, 2));
              }
            } else {
              console.log('Player NOT found in this selection');
            }
          } else {
            console.log('Player positions is not an array:', typeof playerPositions);
          }
        });
      }

      // Check the players table to see current match_stats
      const { data: currentPlayer, error: playerError } = await supabase
        .from('players')
        .select('match_stats')
        .eq('id', playerId)
        .single();

      if (!playerError && currentPlayer) {
        console.log('=== CURRENT PLAYER MATCH_STATS ===');
        console.log('Current match_stats:', currentPlayer.match_stats);
        
        // Safely access minutesByPosition with proper type checking
        const matchStats = currentPlayer.match_stats;
        if (matchStats && typeof matchStats === 'object' && !Array.isArray(matchStats)) {
          const statsObj = matchStats as any;
          if (statsObj.minutesByPosition) {
            console.log('Minutes by position:', statsObj.minutesByPosition);
            console.log('🎯 LM minutes:', statsObj.minutesByPosition.LM || 0);
            console.log('🎯 CB minutes:', statsObj.minutesByPosition.CB || 0);
          }
        }
      }

      const { error } = await supabase.rpc('update_player_match_stats', {
        player_uuid: playerId
      });

      if (error) {
        console.error('Error updating player stats:', error);
        throw error;
      }
      
      // Check the updated stats
      const { data: updatedPlayer, error: updatedError } = await supabase
        .from('players')
        .select('match_stats')
        .eq('id', playerId)
        .single();

      if (!updatedError && updatedPlayer) {
        console.log('=== UPDATED PLAYER MATCH_STATS ===');
        console.log('Updated match_stats:', updatedPlayer.match_stats);
        
        // Safely access minutesByPosition with proper type checking
        const updatedMatchStats = updatedPlayer.match_stats;
        if (updatedMatchStats && typeof updatedMatchStats === 'object' && !Array.isArray(updatedMatchStats)) {
          const updatedStatsObj = updatedMatchStats as any;
          if (updatedStatsObj.minutesByPosition) {
            console.log('Updated minutes by position:', updatedStatsObj.minutesByPosition);
            console.log('🎯 Updated LM minutes:', updatedStatsObj.minutesByPosition.LM || 0);
            console.log('🎯 Updated CB minutes:', updatedStatsObj.minutesByPosition.CB || 0);
          }
        }
      }
      
      console.log('Successfully updated player stats for:', playerId);
      console.log('=== END DEBUGGING ===');
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
      
      // First, clean up any events with "Unknown" opponents
      await this.cleanupUnknownOpponentEvents();
      
      // Then regenerate event_player_stats from event_selections with enhanced debugging
      await this.regenerateEventPlayerStatsFromSelections();
      
      // Finally regenerate all player match stats
      const { error } = await supabase.rpc('update_all_completed_events_stats');

      if (error) {
        console.error('Error regenerating player stats:', error);
        throw error;
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
      
      // Clear all existing event_player_stats with detailed logging
      const { data: existingStats, error: fetchError } = await supabase
        .from('event_player_stats')
        .select('id, player_id, position, event_id');

      if (!fetchError) {
        console.log(`📊 Found ${existingStats?.length || 0} existing event_player_stats records to delete`);
        
        // Log some examples of what we're about to delete
        if (existingStats && existingStats.length > 0) {
          console.log('Sample records being deleted:', existingStats.slice(0, 5));
        }
      }

      const { error: clearError } = await supabase
        .from('event_player_stats')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all records

      if (clearError) {
        console.error('Error clearing event_player_stats:', clearError);
        throw clearError;
      }

      console.log('✅ Cleared all existing event_player_stats');

      // Get all event selections with event data
      const { data: selections, error: selectionsError } = await supabase
        .from('event_selections')
        .select(`
          *,
          events!inner(date, end_time, opponent)
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

      let totalPlayersProcessed = 0;
      let totalRecordsCreated = 0;

      // Process each selection
      for (const selection of selections) {
        const event = selection.events;
        
        console.log(`🏈 Processing selection for event ${selection.event_id}:`);
        console.log(`   Date: ${event.date}`);
        console.log(`   Opponent: ${event.opponent}`);
        console.log(`   Team: ${selection.team_id}`);
        
        // Special logging for Arbroath fixture
        const isArbroathFixture = event.opponent && event.opponent.toLowerCase().includes('arbroath');
        if (isArbroathFixture) {
          console.log('🎯 PROCESSING ARBROATH MAROONS FIXTURE');
          console.log('🎯 Full selection data:', JSON.stringify(selection, null, 2));
        }
        
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
        if (isArbroathFixture) {
          console.log('🎯 ARBROATH - Player positions data:', JSON.stringify(playerPositions, null, 2));
        }

        // Process each player in the selection
        for (const playerPos of playerPositions) {
          totalPlayersProcessed++;
          const playerId = playerPos.playerId || playerPos.player_id;
          if (!playerId) {
            console.log('❌ No player ID found, skipping position:', playerPos);
            continue;
          }

          // Check if this player has a valid playing position (not a substitute position)
          const position = playerPos.position;
          const isValidPlayingPosition = position && 
            position !== 'SUB' && 
            position !== 'Substitute' && 
            position !== 'TBD' &&
            position.trim() !== '';

          if (isArbroathFixture && playerId) {
            console.log(`🎯 ARBROATH - Processing player ${playerId}:`);
            console.log(`🎯 Position: ${position}`);
            console.log(`🎯 Is valid playing position: ${isValidPlayingPosition}`);
            console.log(`🎯 Full player data:`, JSON.stringify(playerPos, null, 2));
          }

          if (isValidPlayingPosition) {
            // This is a player with an actual playing position
            const minutesPlayed = playerPos.minutes || selection.duration_minutes || 90;
            const isCaptain = playerId === selection.captain_id;

            console.log(`✅ Creating stats for player ${playerId}:`);
            console.log(`   Position: ${position}`);
            console.log(`   Minutes: ${minutesPlayed}`);
            console.log(`   Captain: ${isCaptain}`);
            console.log(`   Event: ${event.date} vs ${event.opponent}`);

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
            console.log(`⏸️ Skipping player ${playerId} with invalid/substitute position: ${position}`);
            if (isArbroathFixture && playerId) {
              console.log(`🎯 ARBROATH - Skipped player ${playerId} with position: ${position}`);
            }
          }
        }

        // Handle substitutes separately - they should get substitute records with 0 playing time
        const substitutes = selection.substitute_players as any[] || selection.substitutes as any[] || [];
        if (Array.isArray(substitutes) && substitutes.length > 0) {
          console.log(`🔄 Processing ${substitutes.length} substitutes`);
          
          for (const sub of substitutes) {
            const playerId = sub.playerId || sub.player_id;
            if (!playerId) continue;

            console.log(`🔄 Creating substitute stats for player ${playerId}: 0 minutes, no position`);

            const { error: insertError } = await supabase
              .from('event_player_stats')
              .insert({
                event_id: selection.event_id,
                player_id: playerId,
                team_number: selection.team_number || 1,
                period_number: selection.period_number || 1,
                position: null, // No position for substitutes
                minutes_played: 0, // Substitutes don't get playing minutes
                is_captain: false,
                is_substitute: true,
                performance_category_id: selection.performance_category_id
              });

            if (insertError) {
              console.error(`❌ Error inserting substitute stats for player ${playerId}:`, insertError);
            } else {
              console.log(`✅ Successfully created substitute record for player ${playerId}`);
              totalRecordsCreated++;
            }
          }
        }
      }

      console.log(`📊 REGENERATION SUMMARY:`);
      console.log(`   Total players processed: ${totalPlayersProcessed}`);
      console.log(`   Total records created: ${totalRecordsCreated}`);
      console.log('🎉 SUCCESSFULLY REGENERATED EVENT_PLAYER_STATS FROM SELECTIONS');
      
      // Verify the regeneration by checking some sample data
      const { data: sampleStats, error: sampleError } = await supabase
        .from('event_player_stats')
        .select(`
          *,
          events!inner(date, opponent),
          players!inner(name)
        `)
        .not('position', 'is', null)
        .order('events(date)', { ascending: false })
        .limit(10);

      if (!sampleError && sampleStats) {
        console.log('🔍 SAMPLE REGENERATED DATA:');
        sampleStats.forEach(stat => {
          console.log(`   ${stat.players.name}: ${stat.position} for ${stat.minutes_played}min on ${stat.events.date} vs ${stat.events.opponent}`);
        });
        
        // Look specifically for Arbroath data
        const arbroathSample = sampleStats.find(stat => 
          stat.events.opponent && stat.events.opponent.toLowerCase().includes('arbroath')
        );
        if (arbroathSample) {
          console.log('🎯 ARBROATH SAMPLE FROM REGENERATED DATA:');
          console.log(`🎯 ${arbroathSample.players.name}: ${arbroathSample.position} for ${arbroathSample.minutes_played}min`);
        }
      }

    } catch (error) {
      console.error('Error regenerating event_player_stats:', error);
      throw error;
    }
  },

  async cleanupUnknownOpponentEvents(): Promise<void> {
    try {
      console.log('Cleaning up events with unknown opponents...');
      
      // First, get the IDs of events with "Unknown" opponents
      const { data: unknownEvents, error: fetchError } = await supabase
        .from('events')
        .select('id')
        .ilike('opponent', 'unknown');

      if (fetchError) {
        console.error('Error fetching unknown opponent events:', fetchError);
        return;
      }

      if (!unknownEvents || unknownEvents.length === 0) {
        console.log('No unknown opponent events found');
        return;
      }

      const eventIds = unknownEvents.map(event => event.id);
      console.log('Found unknown opponent events:', eventIds);

      // Delete event_player_stats for these events
      const { error: deleteStatsError } = await supabase
        .from('event_player_stats')
        .delete()
        .in('event_id', eventIds);

      if (deleteStatsError) {
        console.error('Error deleting stats for unknown opponents:', deleteStatsError);
      }

      // Delete event_selections for these events
      const { error: deleteSelectionsError } = await supabase
        .from('event_selections')
        .delete()
        .in('event_id', eventIds);

      if (deleteSelectionsError) {
        console.error('Error deleting selections for unknown opponents:', deleteSelectionsError);
      }

      // Delete the events themselves
      const { error: deleteEventsError } = await supabase
        .from('events')
        .delete()
        .in('id', eventIds);

      if (deleteEventsError) {
        console.error('Error deleting unknown opponent events:', deleteEventsError);
      } else {
        console.log('Successfully cleaned up unknown opponent events');
      }

    } catch (error) {
      console.error('Error cleaning up unknown opponent events:', error);
      throw error;
    }
  },

  async cleanupOrphanedPlayerStats(): Promise<void> {
    try {
      console.log('Cleaning up orphaned player stats...');
      
      // Find event_player_stats that reference non-existent events
      const { data: orphanedStats, error: orphanedError } = await supabase
        .from('event_player_stats')
        .select(`
          id,
          event_id,
          player_id,
          events!left(id)
        `)
        .is('events.id', null);

      if (orphanedError) {
        console.error('Error finding orphaned stats:', orphanedError);
        throw orphanedError;
      }

      if (orphanedStats && orphanedStats.length > 0) {
        console.log(`Found ${orphanedStats.length} orphaned player stats`);
        
        // Get unique player IDs for stats update
        const affectedPlayerIds = [...new Set(orphanedStats.map(stat => stat.player_id))];
        
        // Delete orphaned stats
        const orphanedStatIds = orphanedStats.map(stat => stat.id);
        const { error: deleteError } = await supabase
          .from('event_player_stats')
          .delete()
          .in('id', orphanedStatIds);

        if (deleteError) {
          console.error('Error deleting orphaned stats:', deleteError);
          throw deleteError;
        }

        // Update match stats for affected players
        for (const playerId of affectedPlayerIds) {
          try {
            await this.updatePlayerStats(playerId);
          } catch (error) {
            console.error(`Error updating stats for player ${playerId}:`, error);
          }
        }

        console.log('Successfully cleaned up orphaned player stats');
      } else {
        console.log('No orphaned player stats found');
      }

    } catch (error) {
      console.error('Error during orphaned stats cleanup:', error);
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
