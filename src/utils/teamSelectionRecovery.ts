
import { supabase } from '@/integrations/supabase/client';

export interface PlayerStatsData {
  player_id: string;
  position: string;
  minutes_played: number;
  is_captain: boolean;
  is_substitute: boolean;
  team_number: number;
  period_number: number;
  performance_category_id: string | null;
}

export const recoverTeamSelectionFromStats = async (eventId: string) => {
  try {
    console.log('Starting team selection recovery for event:', eventId);
    
    // Get event details
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('*')
      .eq('id', eventId)
      .single();

    if (eventError || !event) {
      throw new Error(`Event not found: ${eventError?.message}`);
    }

    // Get all player stats for this event
    const { data: playerStats, error: statsError } = await supabase
      .from('event_player_stats')
      .select(`
        player_id,
        position,
        minutes_played,
        is_captain,
        is_substitute,
        team_number,
        period_number,
        performance_category_id
      `)
      .eq('event_id', eventId);

    if (statsError) {
      throw statsError;
    }

    if (!playerStats || playerStats.length === 0) {
      throw new Error('No player stats found for this event');
    }

    console.log(`Found ${playerStats.length} player stats records to recover from`);

    // Group by team_number and period_number
    const groupedStats = playerStats.reduce((acc, stat) => {
      const key = `${stat.team_number}-${stat.period_number}`;
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(stat);
      return acc;
    }, {} as Record<string, PlayerStatsData[]>);

    // Create team selections for each group
    const selectionsToCreate = [];
    
    for (const [key, stats] of Object.entries(groupedStats)) {
      const [teamNumber, periodNumber] = key.split('-').map(Number);
      
      // Find captain
      const captainStat = stats.find(s => s.is_captain);
      
      // Create player positions array
      const playerPositions = stats
        .filter(s => !s.is_substitute && s.position) // Only non-substitutes with positions
        .map(stat => ({
          playerId: stat.player_id,
          position: stat.position,
          minutes: stat.minutes_played,
          isSubstitute: false
        }));

      // Create substitute players array
      const substitutePositions = stats
        .filter(s => s.is_substitute)
        .map(stat => ({
          playerId: stat.player_id,
          position: stat.position || 'SUB',
          minutes: stat.minutes_played,
          isSubstitute: true
        }));

      // Add substitutes to main player positions for now (simplified approach)
      const allPlayerPositions = [...playerPositions, ...substitutePositions];

      // Determine formation based on positions (simplified)
      const formation = determineFormation(playerPositions);

      const selectionData = {
        event_id: eventId,
        team_id: event.team_id,
        team_number: teamNumber,
        period_number: periodNumber,
        formation: formation,
        player_positions: allPlayerPositions,
        substitute_players: substitutePositions,
        substitutes: substitutePositions, // Legacy field
        captain_id: captainStat?.player_id || null,
        staff_selection: [],
        performance_category_id: stats[0]?.performance_category_id || null,
        duration_minutes: Math.max(...stats.map(s => s.minutes_played), 90)
      };

      selectionsToCreate.push(selectionData);
    }

    console.log(`Creating ${selectionsToCreate.length} team selections`);

    // Delete existing selections for this event first
    const { error: deleteError } = await supabase
      .from('event_selections')
      .delete()
      .eq('event_id', eventId);

    if (deleteError) {
      console.warn('Error deleting existing selections:', deleteError);
    }

    // Insert the recovered selections
    const { data: createdSelections, error: insertError } = await supabase
      .from('event_selections')
      .insert(selectionsToCreate);

    if (insertError) {
      throw insertError;
    }

    console.log('Successfully recovered team selections:', createdSelections);
    
    return {
      success: true,
      message: `Successfully recovered ${selectionsToCreate.length} team selection(s)`,
      selectionsCreated: selectionsToCreate.length,
      playersRecovered: playerStats.length
    };

  } catch (error) {
    console.error('Error recovering team selection:', error);
    throw error;
  }
};

const determineFormation = (playerPositions: any[]): string => {
  // Simple formation detection based on positions
  const positions = playerPositions.map(p => p.position?.toLowerCase() || '');
  
  // Count position types
  const defenders = positions.filter(p => 
    p.includes('cb') || p.includes('lb') || p.includes('rb') || 
    p.includes('def') || p.includes('back')
  ).length;
  
  const midfielders = positions.filter(p => 
    p.includes('cm') || p.includes('cdm') || p.includes('cam') || 
    p.includes('lm') || p.includes('rm') || p.includes('mid')
  ).length;
  
  const forwards = positions.filter(p => 
    p.includes('cf') || p.includes('lw') || p.includes('rw') || 
    p.includes('st') || p.includes('forward') || p.includes('striker')
  ).length;

  // Basic formation patterns
  if (defenders >= 4 && midfielders >= 4 && forwards >= 2) {
    return '4-4-2';
  } else if (defenders >= 4 && midfielders >= 3 && forwards >= 3) {
    return '4-3-3';
  } else if (defenders >= 3 && midfielders >= 5) {
    return '3-5-2';
  } else if (defenders >= 5) {
    return '5-3-2';
  }
  
  // Default fallback
  return '4-4-2';
};
