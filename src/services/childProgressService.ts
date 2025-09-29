import { supabase } from '@/integrations/supabase/client';
import { calculatePerformanceTrend, getPlayerMatchHistory } from '@/utils/performanceUtils';

export interface ChildProgressData {
  id: string;
  name: string;
  photo?: string;
  age: number;
  squadNumber?: number;
  position?: string;
  teamName: string;
  teamId: string;
  clubName?: string;
  performanceTrend: 'improving' | 'maintaining' | 'needs-work';
  stats: {
    totalGames: number;
    totalMinutes: number;
    captainGames: number;
    playerOfTheMatchCount: number;
    trainingCompletionRate: number;
    lastMatchDate?: string;
    nextMatchDate?: string;
  };
  recentAchievements: Array<{
    type: 'captain' | 'potm' | 'training_milestone' | 'goal_achieved';
    title: string;
    date: string;
    description?: string;
  }>;
  upcomingActivities: Array<{
    id: string;
    title: string;
    type: 'match' | 'training' | 'session';
    date: string;
    time?: string;
    location?: string;
  }>;
  matchHistory: any[];
  trainingAnalytics?: any;
  attributes?: any;
}

export const childProgressService = {
  async getChildrenForParent(userId: string): Promise<ChildProgressData[]> {
    try {
      // Get all children linked to this parent
      const { data: userPlayers, error: playersError } = await supabase
        .from('user_players')
        .select(`
          player_id,
          players!inner (
            id,
            name,
            photo_url,
            date_of_birth,
            squad_number,
            play_style,
            match_stats,
            team_id,
            teams!inner (
              id,
              name,
              club_id
            )
          )
        `)
        .eq('user_id', userId);

      console.log('Child progress query result:', { userPlayers, playersError });

      if (playersError) throw playersError;

      const childrenData: ChildProgressData[] = [];

      for (const userPlayer of userPlayers || []) {
        const player = userPlayer.players;
        
        // Calculate age
        const age = new Date().getFullYear() - new Date(player.date_of_birth).getFullYear();
        
        // Get club name separately to avoid complex join
        let clubName = null;
        if (player.teams.club_id) {
          const { data: clubData } = await supabase
            .from('clubs')
            .select('name')
            .eq('id', player.teams.club_id)
            .single();
          clubName = clubData?.name;
        }
        
        // Get performance trend
        const performanceTrend = await calculatePerformanceTrend(player.id);
        
        // Get match history
        const matchHistory = await getPlayerMatchHistory(player.id);
        
        // Get training analytics
        const { data: trainingAnalytics } = await supabase
          .from('individual_training_analytics')
          .select('*')
          .eq('player_id', player.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        // Get upcoming events
        const { data: upcomingEvents } = await supabase
          .from('events')
          .select('id, title, event_type, date, start_time, location')
          .eq('team_id', player.team_id)
          .gte('date', new Date().toISOString().split('T')[0])
          .order('date', { ascending: true })
          .limit(5);

        // Calculate stats from match_stats
        const matchStats = (typeof player.match_stats === 'object' && player.match_stats !== null) ? player.match_stats as any : {};
        const totalGames = matchStats.totalGames || 0;
        const totalMinutes = matchStats.totalMinutes || 0;
        const captainGames = matchStats.captainGames || 0;
        const playerOfTheMatchCount = matchStats.playerOfTheMatchCount || 0;
        
        // Calculate training completion rate
        const completionRate = trainingAnalytics?.completion_rate || 0;

        // Build recent achievements
        const recentAchievements = [];
        
        // Add captain achievements from recent games
        const recentCaptainGames = matchHistory
          .filter(game => game.captain)
          .slice(0, 3)
          .map(game => ({
            type: 'captain' as const,
            title: `Team Captain`,
            date: game.date,
            description: `vs ${game.opponent}`
          }));
        
        // Add POTM achievements
        const recentPOTM = matchHistory
          .filter(game => game.playerOfTheMatch)
          .slice(0, 2)
          .map(game => ({
            type: 'potm' as const,
            title: `Player of the Match`,
            date: game.date,
            description: `vs ${game.opponent}`
          }));

        recentAchievements.push(...recentCaptainGames, ...recentPOTM);

        // Get last and next match dates
        const lastMatch = matchHistory[0];
        const nextMatch = upcomingEvents?.find(e => e.event_type === 'match');

        const childData: ChildProgressData = {
          id: player.id,
          name: player.name,
          photo: player.photo_url,
          age,
          squadNumber: player.squad_number,
          position: player.play_style,
          teamName: player.teams.name,
          teamId: player.team_id,
          clubName: clubName,
          performanceTrend,
          stats: {
            totalGames,
            totalMinutes,
            captainGames,
            playerOfTheMatchCount,
            trainingCompletionRate: completionRate,
            lastMatchDate: lastMatch?.date,
            nextMatchDate: nextMatch?.date
          },
          recentAchievements: recentAchievements.slice(0, 5),
          upcomingActivities: (upcomingEvents || []).map(event => ({
            id: event.id,
            title: event.title,
            type: event.event_type as 'match' | 'training',
            date: event.date,
            time: event.start_time,
            location: event.location
          })),
          matchHistory,
          trainingAnalytics,
          attributes: null // Will be expanded later
        };

        childrenData.push(childData);
      }

      return childrenData;
    } catch (error) {
      console.error('Error fetching child progress data:', error);
      throw error;
    }
  },

  async getDetailedChildProgress(playerId: string) {
    try {
      // Get detailed training plans
      const { data: trainingPlans } = await supabase
        .from('individual_training_plans')
        .select(`
          *,
          individual_training_sessions (
            *,
            individual_session_completions (*)
          )
        `)
        .eq('player_id', playerId)
        .order('created_at', { ascending: false });

      // Get player attributes from the players table
      const { data: playerData } = await supabase
        .from('players')
        .select('attributes, objectives')
        .eq('id', playerId)
        .single();

      // Get attribute history if available
      const { data: attributeHistory } = await supabase
        .from('player_attribute_history')
        .select('*')
        .eq('player_id', playerId)
        .order('created_at', { ascending: false })
        .limit(5);

      return {
        trainingPlans,
        attributes: playerData?.attributes,
        objectives: playerData?.objectives,
        attributeHistory
      };
    } catch (error) {
      console.error('Error fetching detailed child progress:', error);
      throw error;
    }
  }
};