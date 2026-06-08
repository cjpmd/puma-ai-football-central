/** Centralised React Query key factory — ensures prefetch and component queries share the same keys. */
export const QUERY_KEYS = {
  teamPlayers: (teamId: string) => ['team_players', teamId] as const,
  upcomingEvents: (teamId: string) => ['upcoming_events', teamId] as const,
  todayMatch: (teamId: string, date: string) => ['today_match', teamId, date] as const,
};
