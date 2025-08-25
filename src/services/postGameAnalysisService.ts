import { supabase } from '@/integrations/supabase/client';

interface PerformanceAnalysis {
  positives: {
    on_ball: string[];
    off_ball: string[];
  };
  challenges: {
    on_ball: string[];
    off_ball: string[];
  };
}

interface EventPerformanceData {
  eventId: string;
  eventDate: string;
  eventTitle: string;
  analysis: PerformanceAnalysis;
}

interface RecommendedDrill {
  id: string;
  name: string;
  description: string;
  difficulty_level: string;
  duration_minutes: number;
  tags: Array<{
    id: string;
    name: string;
    color: string;
  }>;
  relevanceScore: number;
  matchingChallenges: string[];
}

export class PostGameAnalysisService {
  
  /**
   * Get recent performance analysis data for a team
   */
  static async getTeamPerformanceHistory(teamId: string, days = 30): Promise<EventPerformanceData[]> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const { data: events, error } = await supabase
      .from('events')
      .select('id, title, date, scores')
      .eq('team_id', teamId)
      .gte('date', cutoffDate.toISOString().split('T')[0])
      .order('date', { ascending: false });

    if (error) throw error;

    return events
      .filter(event => {
        const scores = event.scores as any;
        return scores?.performance_analysis;
      })
      .map(event => {
        const scores = event.scores as any;
        return {
          eventId: event.id,
          eventDate: event.date,
          eventTitle: event.title,
          analysis: scores.performance_analysis as PerformanceAnalysis
        };
      });
  }

  /**
   * Get recommended drills based on recent challenges identified in post-game reports
   */
  static async getRecommendedDrillsFromChallenges(
    teamId: string, 
    options: {
      recentGames?: number;
      maxRecommendations?: number;
      difficultyLevel?: string;
    } = {}
  ): Promise<RecommendedDrill[]> {
    const { recentGames = 3, maxRecommendations = 10, difficultyLevel } = options;

    try {
      // Get recent performance data
      const performanceHistory = await this.getTeamPerformanceHistory(teamId, 30);
      
      // Take only the most recent games
      const recentPerformance = performanceHistory.slice(0, recentGames);
      
      if (recentPerformance.length === 0) {
        return [];
      }

      // Collect all challenge tags from recent games with frequency tracking
      const challengeTagFrequency = new Map<string, number>();
      const challengeTagDetails = new Map<string, string[]>(); // Track which games had each challenge

      recentPerformance.forEach(performance => {
        const allChallenges = [
          ...performance.analysis.challenges.on_ball,
          ...performance.analysis.challenges.off_ball
        ];
        
        allChallenges.forEach(tagId => {
          challengeTagFrequency.set(tagId, (challengeTagFrequency.get(tagId) || 0) + 1);
          
          if (!challengeTagDetails.has(tagId)) {
            challengeTagDetails.set(tagId, []);
          }
          challengeTagDetails.get(tagId)!.push(performance.eventTitle);
        });
      });

      if (challengeTagFrequency.size === 0) {
        return [];
      }

      // Get drills that have matching tags
      let drillQuery = supabase
        .from('drills')
        .select(`
          id,
          name,
          description,
          difficulty_level,
          duration_minutes,
          drill_tag_assignments!inner (
            tag_id,
            drill_tags (
              id,
              name,
              color
            )
          )
        `)
        .eq('is_public', true);

      if (difficultyLevel) {
        drillQuery = drillQuery.eq('difficulty_level', difficultyLevel);
      }

      const { data: drills, error } = await drillQuery;

      if (error) throw error;

      // Process drills and calculate relevance scores
      const drillRecommendations: RecommendedDrill[] = [];

      drills?.forEach(drill => {
        const drillTags = drill.drill_tag_assignments?.map((assignment: any) => ({
          id: assignment.drill_tags.id,
          name: assignment.drill_tags.name,
          color: assignment.drill_tags.color
        })) || [];

        // Calculate relevance score based on matching challenge tags
        let relevanceScore = 0;
        const matchingChallenges: string[] = [];

        drillTags.forEach(tag => {
          const frequency = challengeTagFrequency.get(tag.id) || 0;
          if (frequency > 0) {
            relevanceScore += frequency * 10; // Base score of 10 per match
            matchingChallenges.push(tag.name);
          }
        });

        // Boost score for drills that address multiple recent challenges
        if (matchingChallenges.length > 1) {
          relevanceScore += matchingChallenges.length * 5;
        }

        // Only include drills with some relevance
        if (relevanceScore > 0) {
          drillRecommendations.push({
            id: drill.id,
            name: drill.name,
            description: drill.description || '',
            difficulty_level: drill.difficulty_level || 'intermediate',
            duration_minutes: drill.duration_minutes || 15,
            tags: drillTags,
            relevanceScore,
            matchingChallenges
          });
        }
      });

      // Sort by relevance score and return top recommendations
      return drillRecommendations
        .sort((a, b) => b.relevanceScore - a.relevanceScore)
        .slice(0, maxRecommendations);

    } catch (error) {
      console.error('Error getting drill recommendations:', error);
      return [];
    }
  }

  /**
   * Get performance trends for a team over time
   */
  static async getPerformanceTrends(teamId: string, days = 60): Promise<{
    improvingAreas: string[];
    persistentChallenges: string[];
    recentPositives: string[];
  }> {
    const performanceHistory = await this.getTeamPerformanceHistory(teamId, days);
    
    if (performanceHistory.length < 2) {
      return {
        improvingAreas: [],
        persistentChallenges: [],
        recentPositives: []
      };
    }

    // Split into recent and older periods
    const midPoint = Math.floor(performanceHistory.length / 2);
    const recentPeriod = performanceHistory.slice(0, midPoint);
    const olderPeriod = performanceHistory.slice(midPoint);

    // Count tag frequencies in each period
    const getTagFrequencies = (performances: EventPerformanceData[]) => {
      const frequencies = new Map<string, number>();
      performances.forEach(p => {
        [...p.analysis.challenges.on_ball, ...p.analysis.challenges.off_ball].forEach(tagId => {
          frequencies.set(tagId, (frequencies.get(tagId) || 0) + 1);
        });
      });
      return frequencies;
    };

    const getPositiveFrequencies = (performances: EventPerformanceData[]) => {
      const frequencies = new Map<string, number>();
      performances.forEach(p => {
        [...p.analysis.positives.on_ball, ...p.analysis.positives.off_ball].forEach(tagId => {
          frequencies.set(tagId, (frequencies.get(tagId) || 0) + 1);
        });
      });
      return frequencies;
    };

    const recentChallenges = getTagFrequencies(recentPeriod);
    const olderChallenges = getTagFrequencies(olderPeriod);
    const recentPositives = getPositiveFrequencies(recentPeriod);

    // Get tag names for display
    const { data: tags } = await supabase
      .from('drill_tags')
      .select('id, name');

    const tagNameMap = new Map(tags?.map(tag => [tag.id, tag.name]) || []);

    // Find improving areas (challenges that decreased)
    const improvingAreas: string[] = [];
    olderChallenges.forEach((oldFreq, tagId) => {
      const newFreq = recentChallenges.get(tagId) || 0;
      if (newFreq < oldFreq) {
        const tagName = tagNameMap.get(tagId);
        if (tagName) improvingAreas.push(tagName);
      }
    });

    // Find persistent challenges (challenges that remained or increased)
    const persistentChallenges: string[] = [];
    recentChallenges.forEach((recentFreq, tagId) => {
      const oldFreq = olderChallenges.get(tagId) || 0;
      if (recentFreq >= oldFreq && recentFreq >= 2) { // Appeared in at least 2 recent games
        const tagName = tagNameMap.get(tagId);
        if (tagName) persistentChallenges.push(tagName);
      }
    });

    // Get most frequent recent positives
    const topPositives: string[] = [];
    const sortedPositives = Array.from(recentPositives.entries())
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5);
    
    sortedPositives.forEach(([tagId]) => {
      const tagName = tagNameMap.get(tagId);
      if (tagName) topPositives.push(tagName);
    });

    return {
      improvingAreas,
      persistentChallenges,
      recentPositives: topPositives
    };
  }
}

export const postGameAnalysisService = new PostGameAnalysisService();