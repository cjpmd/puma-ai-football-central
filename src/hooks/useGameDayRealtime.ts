/**
 * useGameDayRealtime
 *
 * Subscribes to Supabase Realtime changes on the tables that
 * power the Game Day view.  When any relevant row changes
 * (goal scored, substitution made, selection updated) the
 * corresponding TanStack Query cache keys are invalidated so
 * every connected device — coaches on the touchline, parents
 * in the stands — sees the update without manual refreshing.
 *
 * Usage:
 *   // Inside GameDayView.tsx
 *   useGameDayRealtime(eventId);
 */

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';

export function useGameDayRealtime(eventId: string | undefined) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!eventId) return;

    logger.log('[useGameDayRealtime] Subscribing to event', eventId);

    const channel = supabase
      .channel(`game-day-${eventId}`)

      // Team selections changed (formation, player positions)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'event_selections',
          filter: `event_id=eq.${eventId}`,
        },
        () => {
          logger.log('[useGameDayRealtime] event_selections changed, invalidating cache');
          queryClient.invalidateQueries({ queryKey: ['event-selections', eventId] });
        }
      )

      // Player stats changed (goals, assists, bookings, minutes)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'event_player_stats',
          filter: `event_id=eq.${eventId}`,
        },
        () => {
          logger.log('[useGameDayRealtime] event_player_stats changed, invalidating cache');
          queryClient.invalidateQueries({ queryKey: ['event-selections', eventId] });
          queryClient.invalidateQueries({ queryKey: ['event', eventId] });
        }
      )

      // Event itself changed (score, status, notes)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'events',
          filter: `id=eq.${eventId}`,
        },
        () => {
          logger.log('[useGameDayRealtime] event updated, invalidating cache');
          queryClient.invalidateQueries({ queryKey: ['event', eventId] });
        }
      )

      .subscribe((status) => {
        logger.log('[useGameDayRealtime] channel status:', status);
      });

    return () => {
      logger.log('[useGameDayRealtime] Unsubscribing from event', eventId);
      supabase.removeChannel(channel);
    };
  }, [eventId, queryClient]);
}
