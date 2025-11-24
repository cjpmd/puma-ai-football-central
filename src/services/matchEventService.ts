import { supabase } from '@/integrations/supabase/client';
import { MatchEvent, MatchEventType, PlayerCardStatus } from '@/types/matchEvent';

export const matchEventService = {
  /**
   * Create a new match event with automatic yellow card to red card conversion
   */
  async createMatchEvent(eventData: {
    eventId: string;
    playerId: string;
    teamId: string;
    eventType: MatchEventType;
    minute?: number;
    periodNumber?: number;
    notes?: string;
  }): Promise<MatchEvent> {
    let finalEventType = eventData.eventType;
    let finalNotes = eventData.notes;

    // Check for existing yellow card if adding a yellow
    if (eventData.eventType === 'yellow_card') {
      const { data: existingYellow } = await supabase
        .from('match_events')
        .select('*')
        .eq('event_id', eventData.eventId)
        .eq('player_id', eventData.playerId)
        .eq('event_type', 'yellow_card')
        .maybeSingle();

      if (existingYellow) {
        // Auto-convert to red card
        finalEventType = 'red_card';
        finalNotes = 'Second yellow card (automatic red)';
      }
    }

    const { data, error } = await supabase
      .from('match_events')
      .insert([{
        event_id: eventData.eventId,
        player_id: eventData.playerId,
        team_id: eventData.teamId,
        event_type: finalEventType,
        minute: eventData.minute,
        period_number: eventData.periodNumber,
        notes: finalNotes
      }])
      .select(`
        *,
        players (
          id,
          name,
          squad_number
        )
      `)
      .single();

    if (error) throw error;
    return data as MatchEvent;
  },

  /**
   * Get all events for a match ordered by minute
   */
  async getMatchEvents(eventId: string): Promise<MatchEvent[]> {
    const { data, error } = await supabase
      .from('match_events')
      .select(`
        *,
        players (
          id,
          name,
          squad_number
        )
      `)
      .eq('event_id', eventId)
      .order('minute', { ascending: true });

    if (error) throw error;
    return (data || []) as MatchEvent[];
  },

  /**
   * Delete a match event
   */
  async deleteMatchEvent(matchEventId: string): Promise<void> {
    const { error } = await supabase
      .from('match_events')
      .delete()
      .eq('id', matchEventId);

    if (error) throw error;
  },

  /**
   * Get player's card status for the match
   */
  async getPlayerCardStatus(eventId: string, playerId: string): Promise<PlayerCardStatus> {
    const { data } = await supabase
      .from('match_events')
      .select('event_type')
      .eq('event_id', eventId)
      .eq('player_id', playerId)
      .in('event_type', ['yellow_card', 'red_card']);

    const hasYellow = data?.some(e => e.event_type === 'yellow_card') || false;
    const hasRed = data?.some(e => e.event_type === 'red_card') || false;

    return { hasYellow, hasRed };
  },

  /**
   * Get events for a specific player in a match
   */
  async getPlayerMatchEvents(eventId: string, playerId: string): Promise<MatchEvent[]> {
    const { data, error } = await supabase
      .from('match_events')
      .select('*')
      .eq('event_id', eventId)
      .eq('player_id', playerId)
      .order('minute', { ascending: true });

    if (error) throw error;
    return (data || []) as MatchEvent[];
  },

  /**
   * Get aggregated match events summary for an event
   */
  async getEventMatchEventsSummary(eventId: string): Promise<{
    goals: Array<{ playerId: string; playerName: string; count: number }>;
    assists: Array<{ playerId: string; playerName: string; count: number }>;
    saves: Array<{ playerId: string; playerName: string; count: number }>;
    yellowCards: Array<{ playerId: string; playerName: string; count: number }>;
    redCards: Array<{ playerId: string; playerName: string; count: number }>;
  }> {
    const { data, error } = await supabase
      .from('match_events')
      .select(`
        *,
        players (
          id,
          name,
          squad_number
        )
      `)
      .eq('event_id', eventId);

    if (error) throw error;

    const events = (data || []) as MatchEvent[];

    // Aggregate by event type and player
    const aggregateByType = (eventType: MatchEventType) => {
      const playerMap = new Map<string, { playerId: string; playerName: string; count: number }>();
      
      events
        .filter(e => e.event_type === eventType)
        .forEach(event => {
          const playerId = event.player_id;
          const playerName = event.players?.name || 'Unknown';
          
          if (playerMap.has(playerId)) {
            playerMap.get(playerId)!.count++;
          } else {
            playerMap.set(playerId, { playerId, playerName, count: 1 });
          }
        });
      
      return Array.from(playerMap.values()).sort((a, b) => b.count - a.count);
    };

    return {
      goals: aggregateByType('goal'),
      assists: aggregateByType('assist'),
      saves: aggregateByType('save'),
      yellowCards: aggregateByType('yellow_card'),
      redCards: aggregateByType('red_card'),
    };
  },

  /**
   * Calculate score from match events
   * Returns flexible score object - only includes teams that exist
   */
  async calculateEventScore(eventId: string): Promise<{ team_1?: string; team_2?: string; [key: string]: any }> {
    const { data, error } = await supabase
      .rpc('calculate_event_score', { event_uuid: eventId });

    if (error) throw error;
    
    // Return the actual data from RPC - don't fabricate teams
    if (data && typeof data === 'object') {
      return data;
    }
    
    return {};
  }
};
