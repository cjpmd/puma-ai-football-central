
import { supabase } from '@/integrations/supabase/client';

export interface EventSelectionData {
  id: string;
  event_id: string;
  team_id: string;
  team_number: number;
  period_number: number;
  formation: string;
  player_positions: any;
  substitutes: any;
  substitute_players: any;
  captain_id: string | null;
  staff_selection: any;
  performance_category_id: string | null;
  duration_minutes: number;
  created_at: string;
  updated_at: string;
}

export interface DataRecoveryResults {
  event: any | null;
  selections: EventSelectionData[];
  playerStats: any[];
  deletionLogs: any[];
  recentSelections: any[];
}

export const comprehensiveDataCheck = async (eventTitle: string): Promise<DataRecoveryResults> => {
  try {
    console.log('Starting comprehensive data check for event:', eventTitle);
    
    // Find the event by title
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
      return { 
        event: null, 
        selections: [], 
        playerStats: [], 
        deletionLogs: [],
        recentSelections: []
      };
    }

    const targetEvent = events[0];
    console.log('Target event:', targetEvent);

    // Check for existing event selections
    const { data: selections, error: selectionsError } = await supabase
      .from('event_selections')
      .select('*')
      .eq('event_id', targetEvent.id)
      .order('created_at', { ascending: false });

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

    // Check for any recent selections in the same team (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const { data: recentSelections, error: recentError } = await supabase
      .from('event_selections')
      .select(`
        *,
        events!inner(title, date, event_type)
      `)
      .eq('team_id', targetEvent.team_id)
      .gte('created_at', sevenDaysAgo.toISOString())
      .order('created_at', { ascending: false })
      .limit(20);

    if (recentError) {
      console.error('Error finding recent selections:', recentError);
    }

    console.log('Found recent selections:', recentSelections);

    // Try to find any deletion-related logs or patterns
    // Check if there are any event_teams entries that might indicate deletion
    const { data: eventTeams, error: eventTeamsError } = await supabase
      .from('event_teams')
      .select('*')
      .eq('event_id', targetEvent.id);

    if (eventTeamsError) {
      console.error('Error checking event teams:', eventTeamsError);
    }

    console.log('Event teams data:', eventTeams);

    return {
      event: targetEvent,
      selections: selections || [],
      playerStats: playerStats || [],
      deletionLogs: [], // We don't have deletion logs in current schema
      recentSelections: recentSelections || []
    };

  } catch (error) {
    console.error('Error in comprehensive data check:', error);
    throw error;
  }
};

export const checkEventSelections = async (eventTitle: string): Promise<{
  event: any | null;
  selections: EventSelectionData[];
  playerStats: any[];
}> => {
  const results = await comprehensiveDataCheck(eventTitle);
  return {
    event: results.event,
    selections: results.selections,
    playerStats: results.playerStats
  };
};

export const restoreEventSelections = async (eventId: string, selectionsData: EventSelectionData[]) => {
  try {
    console.log('Restoring selections for event:', eventId);
    console.log('Selections data:', selectionsData);

    // Don't delete existing selections, just insert new ones with conflict handling
    const restoreData = selectionsData.map(selection => ({
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
    }));

    const { data, error: insertError } = await supabase
      .from('event_selections')
      .upsert(restoreData, {
        onConflict: 'event_id,team_number,period_number'
      });

    if (insertError) {
      console.error('Error restoring selections:', insertError);
      throw insertError;
    }

    console.log('Successfully restored selections:', data);
    return data;

  } catch (error) {
    console.error('Error restoring event selections:', error);
    throw error;
  }
};

export const createSelectionsFromTemplate = async (eventId: string, templateSelections: any[]) => {
  try {
    console.log('Creating selections from template for event:', eventId);
    
    const newSelections = templateSelections.map(template => ({
      event_id: eventId,
      team_id: template.team_id,
      team_number: template.team_number,
      period_number: template.period_number,
      formation: template.formation,
      player_positions: template.player_positions,
      substitutes: template.substitutes,
      substitute_players: template.substitute_players,
      captain_id: template.captain_id,
      staff_selection: template.staff_selection,
      performance_category_id: template.performance_category_id,
      duration_minutes: template.duration_minutes
    }));

    const { data, error } = await supabase
      .from('event_selections')
      .insert(newSelections);

    if (error) {
      console.error('Error creating selections from template:', error);
      throw error;
    }

    console.log('Successfully created selections from template:', data);
    return data;

  } catch (error) {
    console.error('Error creating selections from template:', error);
    throw error;
  }
};

// New function to force restore selections even if they exist
export const forceRestoreEventSelections = async (eventId: string, selectionsData: EventSelectionData[]) => {
  try {
    console.log('Force restoring selections for event:', eventId);
    
    // First delete existing selections for this event
    const { error: deleteError } = await supabase
      .from('event_selections')
      .delete()
      .eq('event_id', eventId);

    if (deleteError) {
      console.error('Error deleting existing selections:', deleteError);
      throw deleteError;
    }

    // Then insert the new selections
    const restoreData = selectionsData.map(selection => ({
      event_id: eventId,
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
    }));

    const { data, error: insertError } = await supabase
      .from('event_selections')
      .insert(restoreData);

    if (insertError) {
      console.error('Error inserting restored selections:', insertError);
      throw insertError;
    }

    console.log('Successfully force restored selections:', data);
    return data;

  } catch (error) {
    console.error('Error force restoring event selections:', error);
    throw error;
  }
};
