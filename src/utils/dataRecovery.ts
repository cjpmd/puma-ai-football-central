
import { supabase } from '@/integrations/supabase/client';

export interface EventSelectionData {
  id: string;
  event_id: string;
  team_id: string;
  team_number: number;
  period_number: number;
  formation: string;
  player_positions: any[];
  substitutes: string[];
  substitute_players: string[];
  captain_id: string | null;
  staff_selection: any[];
  performance_category_id: string | null;
  duration_minutes: number;
  created_at: string;
  updated_at: string;
}

export const checkEventSelections = async (eventTitle: string): Promise<{
  event: any | null;
  selections: EventSelectionData[];
  playerStats: any[];
}> => {
  try {
    console.log('Searching for event with title:', eventTitle);
    
    // First, find the event by title
    const { data: events, error: eventError } = await supabase
      .from('events')
      .select('*')
      .ilike('title', `%${eventTitle}%`);

    if (eventError) {
      console.error('Error finding event:', eventError);
      throw eventError;
    }

    console.log('Found events:', events);

    if (!events || events.length === 0) {
      return { event: null, selections: [], playerStats: [] };
    }

    const targetEvent = events[0];
    console.log('Target event:', targetEvent);

    // Check for existing event selections
    const { data: selections, error: selectionsError } = await supabase
      .from('event_selections')
      .select('*')
      .eq('event_id', targetEvent.id);

    if (selectionsError) {
      console.error('Error finding selections:', selectionsError);
      throw selectionsError;
    }

    console.log('Found selections:', selections);

    // Check for existing player stats
    const { data: playerStats, error: statsError } = await supabase
      .from('event_player_stats')
      .select('*')
      .eq('event_id', targetEvent.id);

    if (statsError) {
      console.error('Error finding player stats:', statsError);
      throw statsError;
    }

    console.log('Found player stats:', playerStats);

    return {
      event: targetEvent,
      selections: selections || [],
      playerStats: playerStats || []
    };

  } catch (error) {
    console.error('Error checking event selections:', error);
    throw error;
  }
};

export const restoreEventSelections = async (eventId: string, selectionsData: EventSelectionData[]) => {
  try {
    console.log('Restoring selections for event:', eventId);
    console.log('Selections data:', selectionsData);

    // Delete existing selections first
    const { error: deleteError } = await supabase
      .from('event_selections')
      .delete()
      .eq('event_id', eventId);

    if (deleteError) {
      console.error('Error deleting existing selections:', deleteError);
      throw deleteError;
    }

    // Insert restored selections
    const { data, error: insertError } = await supabase
      .from('event_selections')
      .insert(selectionsData.map(selection => ({
        event_id: selection.event_id,
        team_id: selection.team_id,
        team_number: selection.team_number,
        period_number: selection.period_number,
        formation: selection.formation,
        player_positions: selection.player_positions,
        substitutes: selection.substitutes,
        substitute_players: selection.substitute_players,
        captain_id: selection.captain_id,
        staff_selection: selection.staff_selection,
        performance_category_id: selection.performance_category_id,
        duration_minutes: selection.duration_minutes
      })));

    if (insertError) {
      console.error('Error inserting restored selections:', insertError);
      throw insertError;
    }

    console.log('Successfully restored selections:', data);
    return data;

  } catch (error) {
    console.error('Error restoring event selections:', error);
    throw error;
  }
};
