
import { supabase } from '@/integrations/supabase/client';

/**
 * DIRECT COPY REBUILDER - ZERO COMPLEXITY
 * 
 * This rebuilder does ONLY one thing:
 * 1. Delete all event_player_stats
 * 2. Copy EXACTLY what's in event_selections.player_positions to event_player_stats
 * 
 * NO transformations, NO database functions, NO position mapping - just pure copy
 */

export const directCopyRebuilder = {
  async rebuildWithDirectCopy(): Promise<void> {
    console.log('🔄 Starting DIRECT COPY rebuild - zero complexity approach');
    
    try {
      // Step 1: Clear ALL existing event_player_stats manually
      console.log('Step 1: Manually clearing ALL event_player_stats...');
      const { error: clearError } = await supabase
        .from('event_player_stats')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // This will delete all records
      
      if (clearError) {
        console.error('Error clearing stats:', clearError);
        throw clearError;
      }
      
      console.log('✅ Manually cleared all existing stats');

      // Step 2: Get ALL event selections
      console.log('Step 2: Getting ALL event selections...');
      const { data: selections, error: selectionsError } = await supabase
        .from('event_selections')
        .select(`
          id,
          event_id,
          team_number,
          period_number,
          player_positions,
          captain_id,
          duration_minutes,
          performance_category_id
        `);
      
      if (selectionsError) {
        console.error('Error fetching selections:', selectionsError);
        throw selectionsError;
      }

      if (!selections || selections.length === 0) {
        console.log('No event selections found');
        return;
      }

      console.log(`Found ${selections.length} event selections to process`);

      // Step 3: Process each selection with DIRECT COPY
      const recordsToInsert: any[] = [];
      
      for (const selection of selections) {
        console.log(`Processing selection ${selection.id} for event ${selection.event_id}`);
        
        const playerPositions = selection.player_positions as any[];
        
        if (!playerPositions || playerPositions.length === 0) {
          console.log(`No players in selection ${selection.id} - skipping`);
          continue;
        }

        // Process each player - DIRECT COPY only
        for (const playerPos of playerPositions) {
          // Handle both playerId and player_id formats
          const playerId = playerPos.playerId || playerPos.player_id;
          
          if (!playerId) {
            console.log('Skipping player with no ID:', playerPos);
            continue;
          }

          // DIRECT COPY - use exactly what's in the selection
          const position = playerPos.position; // Exact copy
          const minutes = playerPos.minutes || selection.duration_minutes || 90; // Exact copy
          const isSubstitute = playerPos.isSubstitute || false; // Exact copy
          const isCaptain = playerId === selection.captain_id;

          // Create the record for batch insert
          const statRecord = {
            event_id: selection.event_id,
            player_id: playerId,
            team_number: selection.team_number || 1,
            period_number: selection.period_number || 1,
            position: position, // DIRECT COPY
            minutes_played: minutes, // DIRECT COPY
            is_captain: isCaptain,
            is_substitute: isSubstitute, // DIRECT COPY
            substitution_time: playerPos.substitution_time || null,
            performance_category_id: selection.performance_category_id
          };

          recordsToInsert.push(statRecord);
          
          // Special logging for Mason to verify the direct copy
          if (playerId === 'bb4de0de-c98c-485b-85b6-b70dd67736e4') {
            console.log(`MASON DIRECT COPY: Event ${selection.event_id}, Original Position: "${position}", Original Minutes: ${minutes}`);
          }
        }
      }

      // Step 4: Batch insert all records
      console.log(`Step 4: Batch inserting ${recordsToInsert.length} stat records...`);
      
      if (recordsToInsert.length > 0) {
        const { error: insertError } = await supabase
          .from('event_player_stats')
          .insert(recordsToInsert);

        if (insertError) {
          console.error('Error batch inserting stats:', insertError);
          throw insertError;
        }

        console.log(`✅ Successfully inserted ${recordsToInsert.length} stat records via direct copy`);
      }

      // Step 5: Update player match stats using ONLY the proven database function
      console.log('Step 5: Updating player match statistics using database function...');
      const { error: updateError } = await supabase.rpc('update_all_completed_events_stats');
      
      if (updateError) {
        console.error('Error updating match stats:', updateError);
        throw updateError;
      }
      
      console.log('✅ Successfully updated all player match statistics');

      // Step 6: Verify Mason's Ferry data after direct copy
      console.log('🔍 VERIFICATION - Mason\'s data after direct copy:');
      const { data: masonStats, error: masonError } = await supabase
        .from('event_player_stats')
        .select(`
          position,
          minutes_played,
          is_substitute,
          events!inner(title, opponent, date)
        `)
        .eq('player_id', 'bb4de0de-c98c-485b-85b6-b70dd67736e4')
        .or('events.opponent.ilike.%ferry%,events.title.ilike.%ferry%')
        .order('events(date)', { ascending: false });

      if (masonError) {
        console.error('Error fetching Mason verification:', masonError);
      } else {
        console.log(`Mason has ${masonStats?.length || 0} Ferry records after direct copy:`);
        masonStats?.forEach((stat, index) => {
          const event = stat.events;
          console.log(`  ${index + 1}. ${event?.title} vs ${event?.opponent}: Position="${stat.position}", Minutes=${stat.minutes_played}`);
        });
      }

      console.log('🎉 DIRECT COPY REBUILD COMPLETED - Positions should now match team selections exactly');
      
    } catch (error) {
      console.error('❌ Error in direct copy rebuild:', error);
      throw error;
    }
  }
};
