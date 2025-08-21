import { supabase } from '@/integrations/supabase/client';

interface Drill {
  id: string;
  name: string;
  description?: string;
  duration_minutes?: number;
  difficulty_level?: 'beginner' | 'intermediate' | 'advanced';
  is_public?: boolean;
  created_by?: string;
  tags?: DrillTag[];
}

interface DrillTag {
  id: string;
  name: string;
  color: string;
}

interface Player {
  id: string;
  name: string;
  objectives?: string;
  comments?: string;
}

interface RecommendedDrill {
  drill: Drill;
  score: number;
  matchedTags: string[];
  reasons: string[];
}

interface TeamContext {
  players: Player[];
  recentNotes: string[];
  recentDrillIds: string[];
}

// Keywords mapped to common football drill concepts
const KEYWORD_TAG_MAPPING: Record<string, string[]> = {
  // Technical Skills
  'passing': ['passing', 'technical', 'ball control'],
  'shooting': ['shooting', 'finishing', 'technical'],
  'dribbling': ['dribbling', 'technical', 'ball control'],
  'crossing': ['crossing', 'technical', 'attacking'],
  'finishing': ['finishing', 'shooting', 'attacking'],
  'first touch': ['ball control', 'technical', 'receiving'],
  'ball control': ['ball control', 'technical'],
  
  // Tactical Elements
  'pressing': ['pressing', 'defensive', 'tactical'],
  'possession': ['possession', 'tactical', 'passing'],
  'transition': ['transition', 'tactical', 'attacking', 'defensive'],
  'counterattack': ['counter attack', 'transition', 'attacking'],
  'build up': ['build up play', 'tactical', 'passing'],
  'high press': ['pressing', 'tactical', 'defensive'],
  
  // Set Pieces
  'corner': ['set pieces', 'corners', 'tactical'],
  'free kick': ['set pieces', 'free kicks', 'tactical'],
  'penalty': ['penalties', 'set pieces', 'shooting'],
  'throw in': ['throw ins', 'set pieces', 'tactical'],
  
  // Physical/Fitness
  'fitness': ['fitness', 'conditioning', 'physical'],
  'speed': ['speed', 'fitness', 'physical'],
  'agility': ['agility', 'fitness', 'physical'],
  'strength': ['strength', 'fitness', 'physical'],
  'endurance': ['endurance', 'fitness', 'conditioning'],
  
  // Positional
  'defending': ['defensive', 'tactical'],
  'attacking': ['attacking', 'tactical'],
  'midfield': ['midfield play', 'tactical', 'passing'],
  'goalkeeper': ['goalkeeping', 'technical']
};

export class TrainingRecommendationService {
  async getRecommendations(
    teamId: string,
    options: {
      usePlayerObjectives?: boolean;
      useRecentNotes?: boolean;
      avoidRepeats?: boolean;
      difficulty?: string;
      eventWindow?: number;
      sessionWindow?: number;
      maxResults?: number;
    } = {}
  ): Promise<RecommendedDrill[]> {
    const {
      usePlayerObjectives = true,
      useRecentNotes = true,
      avoidRepeats = true,
      difficulty,
      eventWindow = 5,
      sessionWindow = 3,
      maxResults = 12
    } = options;

    try {
      // Fetch team context and drills in parallel
      const [teamContext, drills] = await Promise.all([
        this.fetchTeamContext(teamId, eventWindow, sessionWindow),
        this.fetchDrillLibrary(difficulty)
      ]);

      // Generate focus keywords from team context
      const focusKeywords = this.generateFocusKeywords(
        teamContext,
        usePlayerObjectives,
        useRecentNotes
      );

      // Score and rank drills
      const recommendations = this.scoreDrills(
        drills,
        focusKeywords,
        teamContext.recentDrillIds,
        avoidRepeats
      );

      return recommendations
        .sort((a, b) => b.score - a.score)
        .slice(0, maxResults);
    } catch (error) {
      console.error('Error generating recommendations:', error);
      return [];
    }
  }

  private async fetchTeamContext(
    teamId: string,
    eventWindow: number,
    sessionWindow: number
  ): Promise<TeamContext> {
    // Fetch players with objectives
    const { data: players = [] } = await supabase
      .from('players')
      .select('id, name, objectives, comments')
      .eq('team_id', teamId);

    // Fetch recent event notes
    const { data: recentEvents = [] } = await supabase
      .from('events')
      .select('coach_notes, staff_notes, training_notes')
      .eq('team_id', teamId)
      .order('date', { ascending: false })
      .limit(eventWindow);

    // Fetch recent training session drills
    const { data: recentSessions = [] } = await supabase
      .from('training_sessions')
      .select(`
        training_session_drills(drill_id)
      `)
      .eq('team_id', teamId)
      .order('created_at', { ascending: false })
      .limit(sessionWindow);

    // Combine all notes
    const recentNotes: string[] = [];
    recentEvents.forEach(event => {
      if (event.coach_notes) recentNotes.push(event.coach_notes);
      if (event.staff_notes) recentNotes.push(event.staff_notes);
      if (event.training_notes) recentNotes.push(event.training_notes);
    });

    // Extract recent drill IDs
    const recentDrillIds: string[] = [];
    recentSessions.forEach(session => {
      session.training_session_drills?.forEach((drill: any) => {
        if (drill.drill_id) recentDrillIds.push(drill.drill_id);
      });
    });

    return {
      players: players.map(p => ({
        id: p.id,
        name: p.name,
        objectives: typeof p.objectives === 'string' ? p.objectives : '',
        comments: typeof p.comments === 'string' ? p.comments : ''
      })),
      recentNotes,
      recentDrillIds
    };
  }

  private async fetchDrillLibrary(difficulty?: string): Promise<Drill[]> {
    let query = supabase
      .from('drills')
      .select(`
        *,
        drill_tag_assignments(
          drill_tags(*)
        )
      `)
      .or('is_public.eq.true,created_by.eq.' + (await supabase.auth.getUser()).data.user?.id);

    if (difficulty && difficulty !== 'all') {
      query = query.eq('difficulty_level', difficulty);
    }

    const { data, error } = await query.order('created_at', { ascending: false });
    
    if (error) throw error;

    return (data || []).map((drill: any) => ({
      ...drill,
      tags: drill.drill_tag_assignments?.map((assignment: any) => assignment.drill_tags) || []
    }));
  }

  private generateFocusKeywords(
    teamContext: TeamContext,
    usePlayerObjectives: boolean,
    useRecentNotes: boolean
  ): string[] {
    const keywords: string[] = [];

    if (usePlayerObjectives) {
      teamContext.players.forEach(player => {
        if (player.objectives) {
          keywords.push(...this.extractKeywords(player.objectives));
        }
        if (player.comments) {
          keywords.push(...this.extractKeywords(player.comments));
        }
      });
    }

    if (useRecentNotes) {
      teamContext.recentNotes.forEach(note => {
        keywords.push(...this.extractKeywords(note));
      });
    }

    return Array.from(new Set(keywords.map(k => k.toLowerCase())));
  }

  private extractKeywords(text: string): string[] {
    const words = text.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 2);

    const keywords: string[] = [];
    
    // Check for multi-word phrases first
    const multiWordPhrases = [
      'first touch', 'ball control', 'build up', 'high press',
      'free kick', 'throw in', 'corner kick', 'counter attack'
    ];

    multiWordPhrases.forEach(phrase => {
      if (text.toLowerCase().includes(phrase)) {
        keywords.push(phrase);
      }
    });

    // Check for single words
    Object.keys(KEYWORD_TAG_MAPPING).forEach(keyword => {
      if (words.includes(keyword) || text.toLowerCase().includes(keyword)) {
        keywords.push(keyword);
      }
    });

    return keywords;
  }

  private scoreDrills(
    drills: Drill[],
    focusKeywords: string[],
    recentDrillIds: string[],
    avoidRepeats: boolean
  ): RecommendedDrill[] {
    return drills.map(drill => {
      let score = 0;
      const matchedTags: string[] = [];
      const reasons: string[] = [];

      // Get drill tag names
      const drillTagNames = (drill.tags || []).map(tag => tag.name.toLowerCase());

      // Score based on keyword-tag matches
      focusKeywords.forEach(keyword => {
        const mappedTags = KEYWORD_TAG_MAPPING[keyword] || [keyword];
        
        mappedTags.forEach(tagName => {
          if (drillTagNames.includes(tagName.toLowerCase())) {
            score += 3; // Strong match
            if (!matchedTags.includes(tagName)) {
              matchedTags.push(tagName);
            }
          }
        });
      });

      // Add reasons based on matches
      if (matchedTags.length > 0) {
        reasons.push(`Matches focus areas: ${matchedTags.slice(0, 3).join(', ')}`);
      }

      // Penalty for recent use
      if (avoidRepeats && recentDrillIds.includes(drill.id)) {
        score -= 2;
        reasons.push('Recently used (lower priority)');
      }

      // Bonus for specific drill attributes
      if (drill.duration_minutes && drill.duration_minutes <= 15) {
        score += 0.5; // Slight bonus for short drills
      }

      // Fallback scoring for popular/well-described drills
      if (score === 0) {
        if (drill.description && drill.description.length > 50) {
          score += 1; // Well-documented drill
          reasons.push('Well-documented drill');
        }
        if (drill.is_public) {
          score += 0.5; // Public drill (likely popular)
          reasons.push('Popular public drill');
        }
      }

      // If no specific reasons, add generic one
      if (reasons.length === 0 && score > 0) {
        reasons.push('Good match for your team');
      }

      return {
        drill,
        score,
        matchedTags,
        reasons
      };
    }).filter(rec => rec.score > 0); // Only return drills with some relevance
  }
}

export const trainingRecommendationService = new TrainingRecommendationService();