/**
 * usePrefetch — warms the React Query cache immediately after auth resolves.
 *
 * Fires once per session for each team the user belongs to.  Supabase calls
 * that hit a warm Postgres connection return in ~80-150 ms; subsequent
 * navigations serve from the in-memory cache in < 5 ms.
 */

import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { QUERY_KEYS } from '@/lib/queryKeys';

export function usePrefetch() {
  const { teams, user } = useAuth();
  const queryClient = useQueryClient();
  const prefetchedRef = useRef(false);

  useEffect(() => {
    // Only prefetch once per session after auth resolves with teams
    if (!user || teams.length === 0 || prefetchedRef.current) return;
    prefetchedRef.current = true;

    const teamIds = teams.map((t) => t.id);

    // Prime all team rosters in parallel
    teamIds.forEach((teamId) => {
      queryClient.prefetchQuery({
        queryKey: QUERY_KEYS.teamPlayers(teamId),
        queryFn: () => fetchRoster(teamId),
        staleTime: 5 * 60_000,
      });
    });

    // Prime upcoming fixtures (next 3 events per team)
    teamIds.forEach((teamId) => {
      queryClient.prefetchQuery({
        queryKey: QUERY_KEYS.upcomingEvents(teamId),
        queryFn: () => fetchUpcomingEvents(teamId),
        staleTime: 5 * 60_000,
      });
    });

    // Prime today's match if scheduled
    const today = new Date().toISOString().slice(0, 10);
    teamIds.forEach((teamId) => {
      queryClient.prefetchQuery({
        queryKey: QUERY_KEYS.todayMatch(teamId, today),
        queryFn: () => fetchTodayMatch(teamId, today),
        staleTime: 5 * 60_000,
      });
    });
  }, [user, teams, queryClient]);
}

// ── Fetch functions (shared with useQuery callers via QUERY_KEYS) ────────────

export async function fetchRoster(teamId: string) {
  const { data, error } = await supabase
    .from('players')
    .select(
      'id,name,squad_number,team_id,type,availability,status,' +
      'date_of_birth,photo_url,subscription_type,subscription_status,' +
      'performance_category_id,attributes,card_design_id,play_style,' +
      'parent_id,leave_date,created_at,updated_at'
    )
    .eq('team_id', teamId)
    .neq('status', 'left')
    .neq('status', 'inactive')
    .order('squad_number', { ascending: true })
    .limit(100);
  if (error) throw error;
  return data ?? [];
}

export async function fetchUpcomingEvents(teamId: string) {
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from('events')
    .select('id,title,event_type,date,time,location,opponent,team_id,home_away')
    .eq('team_id', teamId)
    .gte('date', now.slice(0, 10))
    .order('date', { ascending: true })
    .limit(3);
  if (error) throw error;
  return data ?? [];
}

export async function fetchTodayMatch(teamId: string, today: string) {
  const { data, error } = await supabase
    .from('events')
    .select('id,title,event_type,date,time,location,opponent,team_id,home_away')
    .eq('team_id', teamId)
    .eq('date', today)
    .in('event_type', ['match', 'game'])
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data;
}
