import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

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

const PLAYER_FIELDS = [
  'id','name','squad_number','team_id','type','availability','status',
  'date_of_birth','photo_url','subscription_type','subscription_status',
  'performance_category_id','attributes','objectives','comments','match_stats',
  'kit_sizes','card_design_id','fun_stats','play_style','parent_id',
  'leave_date','leave_comments','created_at','updated_at',
].join(',');

export function useTeamPlayers(teamId: string | undefined) {
  const [players, setPlayers] = useState<TeamPlayer[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchPlayers = useCallback(async () => {
    if (!teamId) {
      setPlayers([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { data, error: queryError } = await supabase
        .from('players')
        .select(PLAYER_FIELDS)
        .eq('team_id', teamId)
        .neq('status', 'left')
        .neq('status', 'inactive')
        .order('squad_number', { ascending: true });
      if (queryError) throw queryError;
      setPlayers(((data as unknown) as TeamPlayer[]) || []);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load players'));
    } finally {
      setLoading(false);
    }
  }, [teamId]);

  useEffect(() => {
    fetchPlayers();
  }, [fetchPlayers]);

  return { players, loading, error, refetch: fetchPlayers };
}
