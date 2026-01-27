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
    totalGoals: number;
    totalAssists: number;
    totalSaves: number;
    yellowCards: number;
    redCards: number;
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

// Helper to safely parse JSON that might be a string or object
const safeParseJson = (value: any, fallback: any = {}): any => {
  if (!value) return fallback;
  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch {
      return fallback;
    }
  }
  return typeof value === 'object' ? value : fallback;
};

// Helper to safely get an array from potentially malformed data
const safeGetArray = (value: any): any[] => {
  if (!value) return [];
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return Array.isArray(value) ? value : [];
};

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
        try {
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
          
          // Safely extract match_stats with defensive parsing
          const matchStats = safeParseJson(player.match_stats, {});
          
          // Safely get recentGames as an array
          const recentGames = safeGetArray(matchStats.recentGames);
          const matchHistory = recentGames.map((game: any) => ({
          eventId: game.eventId,
          opponent: game.opponent || 'Unknown',
          date: game.date,
          minutes: game.minutes || 0,
          captain: game.captain || false,
          playerOfTheMatch: game.playerOfTheMatch || false,
          minutesByPosition: game.minutesByPosition || {},
          performanceCategory: game.performanceCategory,
          wasSubstitute: game.wasSubstitute || false,
          matchStats: {
            goals: game.goals || 0,
            assists: game.assists || 0,
            saves: game.saves || 0,
            yellowCards: game.yellowCards || 0,
            redCards: game.redCards || 0
          }
        }));
        
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
        const totalGames = matchStats.totalGames || 0;
        const totalMinutes = matchStats.totalMinutes || 0;
        const totalGoals = matchStats.totalGoals || 0;
        const totalAssists = matchStats.totalAssists || 0;
        const totalSaves = matchStats.totalSaves || 0;
        const yellowCards = matchStats.yellowCards || 0;
        const redCards = matchStats.redCards || 0;
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
            totalGoals,
            totalAssists,
            totalSaves,
            yellowCards,
            redCards,
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
        } catch (playerError) {
          console.error(`Error processing player ${userPlayer.player_id}:`, playerError);
          // Continue processing other players
        }
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