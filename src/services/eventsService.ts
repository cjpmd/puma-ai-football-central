import { supabase } from '@/integrations/supabase/client';
import { DatabaseEvent } from '@/types/event';
import { playerStatsService } from './playerStatsService';

export interface CreateEventData {
  team_id: string;
  title: string;
  description?: string;
  date: string;
  start_time?: string;
  end_time?: string;
  location?: string;
  notes?: string;
  event_type: 'training' | 'match' | 'fixture' | 'tournament' | 'festival' | 'social' | 'friendly';
  opponent?: string;
  is_home?: boolean;
  scores?: {
    home: number;
    away: number;
  };
  player_of_match_id?: string;
  game_format?: string;
  game_duration?: number; // Added game duration
  kit_selection?: 'home' | 'away' | 'training';
}

export interface UpdateEventData extends CreateEventData {
  id: string;
  coach_notes?: string;
  staff_notes?: string;
  training_notes?: string;
}

export const eventsService = {
  async getEventsByTeamId(teamId: string): Promise<DatabaseEvent[]> {
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .eq('team_id', teamId)
      .order('date', { ascending: true });

    if (error) throw error;
    return (data || []) as DatabaseEvent[];
  },

  async getEventById(eventId: string): Promise<DatabaseEvent> {
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .eq('id', eventId)
      .single();

    if (error) {
      console.error('Error fetching event:', error);
      throw new Error(error.message);
    }

    return data as DatabaseEvent;
  },

  async createEvent(eventData: CreateEventData): Promise<DatabaseEvent> {
    console.log('Creating event with data:', eventData);
    
    const { data, error } = await supabase
      .from('events')
      .insert([eventData])
      .select()
      .single();

    if (error) {
      console.error('Error creating event:', error);
      throw error;
    }
    console.log('Event created successfully:', data);
    return data as DatabaseEvent;
  },

  async updateEvent(eventData: UpdateEventData): Promise<DatabaseEvent> {
    const { id, ...updateData } = eventData;
    console.log('Updating event with data:', updateData);
    
    // Ensure all fields are properly included in the update
    const cleanUpdateData = {
      team_id: updateData.team_id,
      title: updateData.title,
      description: updateData.description,
      date: updateData.date,
      start_time: updateData.start_time,
      end_time: updateData.end_time,
      location: updateData.location,
      notes: updateData.notes,
      event_type: updateData.event_type,
      opponent: updateData.opponent,
      is_home: updateData.is_home,
      scores: updateData.scores,
      player_of_match_id: updateData.player_of_match_id,
      game_format: updateData.game_format,
      game_duration: updateData.game_duration, // Include game duration
      kit_selection: updateData.kit_selection,
      coach_notes: updateData.coach_notes,
      staff_notes: updateData.staff_notes,
      training_notes: updateData.training_notes,
      updated_at: new Date().toISOString()
    };
    
    console.log('Clean update data with game_duration:', cleanUpdateData);
    
    const { data, error } = await supabase
      .from('events')
      .update(cleanUpdateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating event:', error);
      throw error;
    }
    console.log('Event updated successfully with game_duration:', data);
    return data as DatabaseEvent;
  },

  async deleteEvent(eventId: string, eventTitle?: string): Promise<void> {
    // Show confirmation dialog
    const confirmMessage = eventTitle 
      ? `Are you sure you want to delete the event "${eventTitle}"? This action cannot be undone and will remove all associated player statistics.`
      : 'Are you sure you want to delete this event? This action cannot be undone and will remove all associated player statistics.';
    
    if (!window.confirm(confirmMessage)) {
      throw new Error('Event deletion cancelled by user');
    }

    console.log(`Deleting event ${eventId} and cleaning up player stats...`);

    // Get all players who have stats for this event so we can update their match_stats
    const { data: playersWithStats, error: playersError } = await supabase
      .from('event_player_stats')
      .select('player_id')
      .eq('event_id', eventId);

    if (playersError) {
      console.error('Error fetching players with stats for event:', playersError);
    }

    // First delete any related event_player_stats
    const { error: statsError } = await supabase
      .from('event_player_stats')
      .delete()
      .eq('event_id', eventId);

    if (statsError) {
      console.error('Error deleting event player stats:', statsError);
      throw statsError;
    }

    // Delete any event selections
    const { error: selectionsError } = await supabase
      .from('event_selections')
      .delete()
      .eq('event_id', eventId);

    if (selectionsError) {
      console.error('Error deleting event selections:', selectionsError);
      throw selectionsError;
    }

    // Then delete the event
    const { error } = await supabase
      .from('events')
      .delete()
      .eq('id', eventId);

    if (error) {
      console.error('Error deleting event:', error);
      throw error;
    }

    // Update match stats for all affected players
    if (playersWithStats && playersWithStats.length > 0) {
      console.log(`Updating match stats for ${playersWithStats.length} players after event deletion`);
      const uniquePlayerIds = [...new Set(playersWithStats.map(p => p.player_id))];
      
      for (const playerId of uniquePlayerIds) {
        try {
          await playerStatsService.updatePlayerStats(playerId);
        } catch (error) {
          console.error(`Error updating stats for player ${playerId}:`, error);
        }
      }
    }

    console.log('Event deleted successfully and player stats updated');
  },

  async cleanupDeletedEventStats(): Promise<void> {
    try {
      console.log('Cleaning up stats for deleted events...');
      
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
            await playerStatsService.updatePlayerStats(playerId);
          } catch (error) {
            console.error(`Error updating stats for player ${playerId}:`, error);
          }
        }

        console.log('Successfully cleaned up orphaned player stats');
      } else {
        console.log('No orphaned player stats found');
      }

      // Also clean up orphaned event selections
      const { data: orphanedSelections, error: selectionsError } = await supabase
        .from('event_selections')
        .select(`
          id,
          event_id,
          events!left(id)
        `)
        .is('events.id', null);

      if (selectionsError) {
        console.error('Error finding orphaned selections:', selectionsError);
      } else if (orphanedSelections && orphanedSelections.length > 0) {
        console.log(`Found ${orphanedSelections.length} orphaned event selections`);
        
        const orphanedSelectionIds = orphanedSelections.map(sel => sel.id);
        const { error: deleteSelectionsError } = await supabase
          .from('event_selections')
          .delete()
          .in('id', orphanedSelectionIds);

        if (deleteSelectionsError) {
          console.error('Error deleting orphaned selections:', deleteSelectionsError);
        } else {
          console.log('Successfully cleaned up orphaned event selections');
        }
      }

    } catch (error) {
      console.error('Error during cleanup:', error);
      throw error;
    }
  }
};
