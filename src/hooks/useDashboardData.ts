/**
 * Dashboard data for the mobile home screen.
 *
 * Moved out of DashboardMobile so the screen renders state it is given rather
 * than orchestrating eight Supabase calls itself. The query is seeded from the
 * on-device snapshot (see useOfflineAwareQuery), so opening the app with no
 * signal shows the last known fixtures and results instead of a spinner.
 *
 * The fetch body is unchanged from the version that lived in the component:
 * two batches, the second depending on ids from the first.
 */

import { useCallback, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOfflineAwareQuery } from '@/hooks/useOfflineAwareQuery';
import {
  getLinkedPlayerIds,
  getPlayerAvailabilityForEvents,
} from '@/services/sharedAvailabilityService';

export interface TeamPrivacy {
  team_id: string;
  show_scores_to_parents: boolean;
  show_scores_to_players: boolean;
}

export interface DashboardData {
  playersCount: number;
  eventsCount: number;
  upcomingEvents: any[];
  recentResults: any[];
  pendingAvailability: any[];
  /**
   * Keyed by team_id. A plain object rather than a Map because this payload is
   * serialised to storage — a Map survives neither JSON.stringify nor the
   * React Query persister, and would come back as {} on the cached render.
   */
  teamPrivacy: Record<string, TeamPrivacy>;
}

export const EMPTY_DASHBOARD: DashboardData = {
  playersCount: 0,
  eventsCount: 0,
  upcomingEvents: [],
  recentResults: [],
  pendingAvailability: [],
  teamPrivacy: {},
};

interface FetchArgs {
  userId: string;
  teamIds: string[];
}

async function fetchDashboardData({ userId, teamIds }: FetchArgs): Promise<DashboardData> {
  const today = new Date().toISOString().split('T')[0];

    // ─── Batch 1: all independent queries fire in parallel ────────────────
    console.time('[perf] DashboardMobile batch-1');
    const [
      privacyResult,
      playersCountResult,
      eventsCountResult,
      upcomingEventsResult,
      recentResultsResult,
      staffCheckResult,
      linkedPlayerIds,
    ] = await Promise.all([
      supabase
        .from('team_privacy_settings')
        .select('team_id, show_scores_to_parents, show_scores_to_players')
        .in('team_id', teamIds),

      supabase
        .from('players')
        .select('id', { count: 'exact', head: true })
        .in('team_id', teamIds),

      supabase
        .from('events')
        .select('id', { count: 'exact', head: true })
        .in('team_id', teamIds)
        .gte('date', today),

      supabase
        .from('events')
        .select(`
          id, title, date, start_time, event_type, opponent, is_home, team_id, scores,
          teams!inner(
            id, name, logo_url, kit_designs, club_id,
            clubs!teams_club_id_fkey(name, logo_url)
          )
        `)
        .in('team_id', teamIds)
        .gte('date', today)
        .order('date', { ascending: true })
        .limit(5),

      supabase
        .from('events')
        .select(`
          id, title, date, start_time, event_type, opponent, team_id, scores,
          teams!inner(
            id, name, logo_url, kit_designs, club_id,
            clubs!teams_club_id_fkey(name, logo_url)
          )
        `)
        .in('team_id', teamIds)
        .lt('date', today)
        .not('scores', 'is', null)
        .order('date', { ascending: false })
        .limit(10),

      supabase
        .from('team_staff')
        .select('id')
        .eq('user_id', userId)
        .limit(1),

      getLinkedPlayerIds(userId),
    ]);
    console.timeEnd('[perf] DashboardMobile batch-1');

    const upcomingEventIds = upcomingEventsResult.data?.map(e => e.id) || [];
    const recentEventIds   = recentResultsResult.data?.map(e => e.id) || [];

    // ─── Batch 2: queries that depend on batch-1 IDs, also parallel ───────
    console.time('[perf] DashboardMobile batch-2');
    const [
      playerAvailabilityData,
      userAvailabilityResult,
      eventSelectionsResult,
    ] = await Promise.all([
      getPlayerAvailabilityForEvents(linkedPlayerIds, upcomingEventIds),

      upcomingEventIds.length > 0
        ? supabase
            .from('event_availability')
            .select('event_id, status, role')
            .eq('user_id', userId)
            .in('event_id', upcomingEventIds)
        : Promise.resolve({ data: [] as Array<{ event_id: string; status: string; role: string }>, error: null }),

      recentEventIds.length > 0
        ? supabase
            .from('event_selections')
            .select('event_id, team_number, performance_category_id, performance_categories(name)')
            .in('event_id', recentEventIds)
        : Promise.resolve({ data: [] as any[], error: null }),
    ]);
    console.timeEnd('[perf] DashboardMobile batch-2');

    // ─── Privacy settings map ─────────────────────────────────────────────
    const settingsMap = new Map<string, TeamPrivacy>();
    privacyResult.data?.forEach(setting => {
      settingsMap.set(setting.team_id, setting);
    });
    const teamPrivacy: Record<string, TeamPrivacy> = Object.fromEntries(settingsMap);

    // ─── Upcoming events + availability map ───────────────────────────────
    const userAvailabilityData = userAvailabilityResult.data || [];

    const availabilityMap = new Map<string, string>();
    playerAvailabilityData.forEach(record => {
      availabilityMap.set(record.event_id, record.status);
    });
    userAvailabilityData.forEach(record => {
      if (!availabilityMap.has(record.event_id)) {
        availabilityMap.set(record.event_id, record.status);
      }
    });

    // Build per-event role map: which roles does the user already have an
    // availability record for? Used to render the inline availability
    // buttons even when an `event_invitations` row is missing.
    const eventRolesMap = new Map<string, Set<'player' | 'staff'>>();
    userAvailabilityData.forEach(record => {
      const role = record.role === 'staff' ? 'staff' : 'player';
      const set = eventRolesMap.get(record.event_id) ?? new Set<'player' | 'staff'>();
      set.add(role);
      eventRolesMap.set(record.event_id, set);
    });
    playerAvailabilityData.forEach(record => {
      const set = eventRolesMap.get(record.event_id) ?? new Set<'player' | 'staff'>();
      set.add('player');
      eventRolesMap.set(record.event_id, set);
    });

    const upcomingEvents = upcomingEventsResult.data?.map(event => ({
      ...event,
      team_context: {
        name: event.teams.name,
        logo_url: event.teams.logo_url,
        club_name: event.teams.clubs?.name,
        club_logo_url: event.teams.clubs?.logo_url
      },
      user_availability: availabilityMap.get(event.id) || null,
      assumed_roles: Array.from(eventRolesMap.get(event.id) ?? []) as Array<'player' | 'staff'>
    })) || [];

    // ─── Recent results ───────────────────────────────────────────────────
    const eventSelectionsData = eventSelectionsResult.data || [];
    const categoryMap: Record<string, Record<number, string>> = {};
    eventSelectionsData.forEach(selection => {
      if (!categoryMap[selection.event_id]) {
        categoryMap[selection.event_id] = {};
      }
      const categoryName = (selection.performance_categories as any)?.name;
      if (categoryName && selection.team_number) {
        categoryMap[selection.event_id][selection.team_number] = categoryName;
      }
    });

    const recentResults: any[] = [];
    recentResultsResult.data?.forEach(event => {
      const scores = event.scores as any;
      const eventCategories = categoryMap[event.id] || {};
      const teamContext = {
        name: event.teams.name,
        logo_url: event.teams.logo_url,
        club_name: event.teams.clubs?.name,
        club_logo_url: event.teams.clubs?.logo_url
      };

      let teamNumber = 1;
      let hasMultiTeam = false;
      while (scores && scores[`team_${teamNumber}`] !== undefined) {
        hasMultiTeam = true;
        const ourScore = scores[`team_${teamNumber}`];
        const opponentScore = scores[`opponent_${teamNumber}`];
        const categoryName = eventCategories[teamNumber];

        recentResults.push({
          id: `${event.id}_team_${teamNumber}`,
          ...event,
          team_number: teamNumber,
          category_name: categoryName,
          our_score: ourScore,
          opponent_score: opponentScore,
          team_context: teamContext,
          display_name: categoryName
            ? `${teamContext.name} - ${categoryName}`
            : teamContext.name
        });
        teamNumber++;
      }

      if (!hasMultiTeam && scores) {
        recentResults.push({
          id: event.id,
          ...event,
          team_number: 1,
          our_score: scores.home,
          opponent_score: scores.away,
          team_context: teamContext,
          display_name: teamContext.name
        });
      }
    });

    recentResults.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    const limitedRecentResults = recentResults.slice(0, 6);

    // ─── Pending availability (reuse batch-2 data, no extra round-trips) ──
    // Mirror the same logic as CalendarEventsMobile: query by user_id across
    // all roles, group by event, show as pending only when ALL roles pending.
    const now = new Date();
    const upcomingEventsForAvailability = upcomingEvents.filter(event =>
      new Date(event.date) > now
    );
    const futureEventIds = new Set(upcomingEventsForAvailability.map(e => e.id));

    // Group user's availability records by event_id (all roles, future events only)
    const availabilityByEvent = new Map<string, string[]>();
    userAvailabilityData
      .filter(a => futureEventIds.has(a.event_id))
      .forEach(a => {
        const list = availabilityByEvent.get(a.event_id) ?? [];
        list.push(a.status);
        availabilityByEvent.set(a.event_id, list);
      });

    // Also merge player_id-based records (parent/multi-player scenario)
    playerAvailabilityData
      .filter(a => futureEventIds.has(a.event_id))
      .forEach(a => {
        if (!availabilityByEvent.has(a.event_id)) {
          availabilityByEvent.set(a.event_id, [a.status]);
        }
      });

    // An event needs a response only if the user has been invited (has records)
    // AND every record for that event is still 'pending'
    const pendingAvailabilityData = upcomingEventsForAvailability
      .filter(event => {
        const statuses = availabilityByEvent.get(event.id);
        return statuses && statuses.length > 0 && statuses.every(s => s === 'pending');
      })
      .map(event => ({
        id: `${event.id}_${userId}`,
        event_id: event.id,
        user_id: userId,
        role: 'player',
        status: 'pending',
        events: { ...event, team_context: event.team_context }
      }));

  return {
    playersCount: playersCountResult.count || 0,
    eventsCount: eventsCountResult.count || 0,
    upcomingEvents: upcomingEvents || [],
    recentResults: limitedRecentResults || [],
    pendingAvailability: pendingAvailabilityData,
    teamPrivacy,
  };
}

interface UseDashboardDataArgs {
  userId: string | undefined;
  teamIds: string[];
  /** Distinguishes the all-teams view from a single-team view in the cache key. */
  scope: string;
}

/**
 * One query per (user, scope). Switching teams switches query key, so React
 * Query serves that scope's own cache and a slow response for the team you
 * just left can no longer land on the team you are now looking at — which is
 * what the manual sequence guard in the component used to protect against.
 */
export function useDashboardData({ userId, teamIds, scope }: UseDashboardDataArgs) {
  const queryClient = useQueryClient();

  // The team set belongs in the key, not just the scope. In all-teams mode the
  // scope string is constant while teamIds arrives asynchronously from
  // AuthContext and can grow — keyed on scope alone, the query would never
  // refetch for the teams that showed up late.
  const teamIdsKey = useMemo(() => [...teamIds].sort().join(','), [teamIds]);

  const queryKey = useMemo(
    () => ['dashboard-mobile', userId ?? 'anon', scope, teamIdsKey] as const,
    [userId, scope, teamIdsKey],
  );

  const queryFn = useCallback(
    () => fetchDashboardData({ userId: userId!, teamIds }),
    [userId, teamIds],
  );

  const result = useOfflineAwareQuery<DashboardData>({
    cacheKey: `offline_dashboard_${userId ?? 'anon'}_${scope}`,
    queryKey,
    queryFn,
    enabled: !!userId && teamIds.length > 0,
    retry: 1,
  });

  /**
   * Apply a local change without a refetch — used when the user answers an
   * availability prompt and should see it reflected instantly.
   */
  const update = useCallback(
    (updater: (previous: DashboardData) => DashboardData) => {
      queryClient.setQueryData<DashboardData>(queryKey, (previous) =>
        previous ? updater(previous) : previous,
      );
    },
    [queryClient, queryKey],
  );

  return { ...result, update };
}
