import { useQuery, useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/lib/queryKeys';
import { fetchRoster } from '@/hooks/usePrefetch';

export interface TeamPlayer {
  id: string;
  name: string;
  squad_number?: number;
  team_id: string;
  type: string;
  availability: string;
  status: string;
  date_of_birth?: string;
  photo_url?: string;
  subscription_type?: string;
  subscription_status?: string;
  performance_category_id?: string;
  attributes?: any;
  objectives?: any;
  comments?: any;
  match_stats?: any;
  kit_sizes?: any;
  card_design_id?: string;
  fun_stats?: any;
  play_style?: string;
  parent_id?: string;
  leave_date?: string;
  leave_comments?: string;
  created_at: string;
  updated_at: string;
}

export function useTeamPlayers(teamId: string | undefined) {
  const queryClient = useQueryClient();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: teamId ? QUERY_KEYS.teamPlayers(teamId) : ['team_players_empty'],
    queryFn: () => fetchRoster(teamId!),
    enabled: !!teamId,
    staleTime: 5 * 60_000,
    gcTime: 30 * 60_000,
    meta: { persist: true },
  });

  return {
    players: (data as TeamPlayer[]) ?? [],
    loading: isLoading,
    error: error as Error | null,
    refetch,
  };
}
