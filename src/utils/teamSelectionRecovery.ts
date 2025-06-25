
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
    
    // Get event details first
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('*')
      .eq('id', eventId)
      .single();

    if (eventError || !event) {
      throw new Error(`Event not found: ${eventError?.message}`);
    }

    // Get all player stats for this event with detailed logging
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
      .eq('event_id', eventId)
      .order('team_number, period_number, position');

    if (statsError) {
      throw statsError;
    }

    if (!playerStats || playerStats.length === 0) {
      throw new Error('No player stats found for this event');
    }

    console.log(`Found ${playerStats.length} player stats records`);
    
    // Debug: Log first few records to see actual data structure
    console.log('Sample player stats data:', playerStats.slice(0, 3));

    // Delete existing selections for this event first to avoid conflicts
    console.log('Clearing existing selections...');
    const { error: deleteError } = await supabase
      .from('event_selections')
      .delete()
      .eq('event_id', eventId);

    if (deleteError) {
      console.warn('Warning deleting existing selections:', deleteError);
    }

    // Group by team_number and period_number
    const groupedStats = playerStats.reduce((acc, stat) => {
      const key = `${stat.team_number}-${stat.period_number}`;
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(stat);
      return acc;
    }, {} as Record<string, PlayerStatsData[]>);

    console.log(`Processing ${Object.keys(groupedStats).length} team/period combinations`);

    // Process each group and create selections
    const selectionsToCreate = [];
    
    for (const [key, stats] of Object.entries(groupedStats)) {
      const [teamNumber, periodNumber] = key.split('-').map(Number);
      
      console.log(`Processing team ${teamNumber}, period ${periodNumber} with ${stats.length} players`);
      
      // Debug: Log positions for this group
      console.log('Positions in this group:', stats.map(s => ({ 
        player_id: s.player_id, 
        position: s.position, 
        is_substitute: s.is_substitute 
      })));
      
      // Find captain
      const captainStat = stats.find(s => s.is_captain);
      
      // Separate starting players and substitutes based on the is_substitute flag from database
      const startingPlayers = stats.filter(s => !s.is_substitute);
      const substitutePlayers = stats.filter(s => s.is_substitute);
      
      console.log(`Starting players: ${startingPlayers.length}, Substitutes: ${substitutePlayers.length}`);
      
      // Create player positions array for starting players - use exact position from database
      const playerPositions = startingPlayers.map(stat => ({
        playerId: stat.player_id,
        position: stat.position || 'Unknown', // Use exact position from database
        minutes: stat.minutes_played,
        isSubstitute: false
      }));

      // Create substitute players array - use exact position from database
      const substitutePositions = substitutePlayers.map(stat => ({
        playerId: stat.player_id,
        position: stat.position || 'SUB', // Use exact position from database
        minutes: stat.minutes_played,
        isSubstitute: true
      }));

      // Determine formation based on starting positions only
      const formation = determineFormation(startingPlayers);

      console.log(`Team ${teamNumber}: Formation ${formation}, Starting: ${playerPositions.length}, Subs: ${substitutePositions.length}`);

      const selectionData = {
        event_id: eventId,
        team_id: event.team_id,
        team_number: teamNumber,
        period_number: periodNumber,
        formation: formation,
        player_positions: playerPositions,
        substitute_players: substitutePositions,
        substitutes: substitutePositions, // Legacy field for compatibility
        captain_id: captainStat?.player_id || null,
        staff_selection: [],
        performance_category_id: stats[0]?.performance_category_id || null,
        duration_minutes: Math.max(...stats.map(s => s.minutes_played), 90)
      };

      selectionsToCreate.push(selectionData);
    }

    console.log(`Creating ${selectionsToCreate.length} team selections...`);

    // Insert all selections
    const { data: createdSelections, error: insertError } = await supabase
      .from('event_selections')
      .insert(selectionsToCreate)
      .select();

    if (insertError) {
      console.error('Insert error:', insertError);
      throw insertError;
    }

    console.log('Successfully recovered team selections:', createdSelections?.length || 0);
    
    return {
      success: true,
      message: `Successfully recovered ${selectionsToCreate.length} team selection(s)`,
      selectionsCreated: selectionsToCreate.length,
      playersRecovered: playerStats.length,
      details: selectionsToCreate.map(s => ({
        team: s.team_number,
        period: s.period_number,
        formation: s.formation,
        startingPlayers: s.player_positions.length,
        substitutes: s.substitute_players.length
      }))
    };

  } catch (error) {
    console.error('Error recovering team selection:', error);
    throw error;
  }
};

const determineFormation = (startingPlayers: PlayerStatsData[]): string => {
  // Use actual positions from database to determine formation
  const positions = startingPlayers
    .map(p => p.position?.toLowerCase() || '')
    .filter(p => p && p !== 'unknown');
  
  console.log('Determining formation from positions:', positions);
  
  // Count position types based on actual position data
  const defenders = positions.filter(p => 
    p.includes('cb') || p.includes('lb') || p.includes('rb') || 
    p.includes('def') || p.includes('back') || p.includes('centre back') ||
    p.includes('left back') || p.includes('right back') || p.includes('dl') || p.includes('dr') || p.includes('dc')
  ).length;
  
  const midfielders = positions.filter(p => 
    p.includes('cm') || p.includes('cdm') || p.includes('cam') || 
    p.includes('lm') || p.includes('rm') || p.includes('mid') ||
    p.includes('centre mid') || p.includes('left mid') || p.includes('right mid') ||
    p.includes('ml') || p.includes('mr') || p.includes('mc') || p.includes('aml') || p.includes('amr') || p.includes('amc')
  ).length;
  
  const forwards = positions.filter(p => 
    p.includes('cf') || p.includes('lw') || p.includes('rw') || 
    p.includes('st') || p.includes('forward') || p.includes('striker') ||
    p.includes('centre forward') || p.includes('left wing') || p.includes('right wing') ||
    p.includes('stc') || p.includes('stl') || p.includes('str')
  ).length;

  const goalkeepers = positions.filter(p => 
    p.includes('gk') || p.includes('goalkeeper')
  ).length;

  console.log(`Formation analysis: ${goalkeepers} GK, ${defenders} defenders, ${midfielders} midfielders, ${forwards} forwards`);

  // Determine formation based on outfield players
  const outfieldPlayers = startingPlayers.filter(p => {
    const pos = p.position?.toLowerCase() || '';
    return !pos.includes('gk') && !pos.includes('goalkeeper');
  }).length;

  // Formation patterns based on typical team structures
  if (outfieldPlayers >= 10) {
    if (defenders >= 4 && midfielders >= 4 && forwards >= 2) {
      return '4-4-2';
    } else if (defenders >= 4 && midfielders >= 3 && forwards >= 3) {
      return '4-3-3';
    } else if (defenders >= 3 && midfielders >= 5) {
      return '3-5-2';
    } else if (defenders >= 5) {
      return '5-3-2';
    }
  }
  
  // For smaller sided games
  if (outfieldPlayers <= 6) {
    return '2-2-2';
  } else if (outfieldPlayers <= 8) {
    return '3-3-2';
  }
  
  // Default fallback
  return '4-4-2';
};
