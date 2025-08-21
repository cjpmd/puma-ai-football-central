import { supabase } from '@/integrations/supabase/client';
import type { 
  IndividualTrainingPlan, 
  IndividualTrainingSession, 
  IndividualSessionDrill, 
  IndividualSessionCompletion,
  PlanCreationData,
  DrillWithTags 
} from '@/types/individualTraining';

export class IndividualTrainingService {
  
  // Plans
  static async getUserPlans(userId: string): Promise<IndividualTrainingPlan[]> {
    const { data, error } = await supabase
      .from('individual_training_plans')
      .select('*')
      .or(`coach_id.eq.${userId},player_id.in.(select player_id from user_players where user_id = '${userId}')`)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return (data || []) as IndividualTrainingPlan[];
  }

  static async getPlayerPlans(playerId: string): Promise<IndividualTrainingPlan[]> {
    const { data, error } = await supabase
      .from('individual_training_plans')
      .select('*')
      .eq('player_id', playerId)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
  }

  static async createPlan(planData: PlanCreationData & { player_id: string; coach_id?: string }): Promise<IndividualTrainingPlan> {
    const { data, error } = await supabase
      .from('individual_training_plans')
      .insert({
        player_id: planData.player_id,
        coach_id: planData.coach_id,
        title: planData.title,
        objective_text: planData.objective_text,
        plan_type: planData.plan_type,
        start_date: planData.start_date,
        end_date: planData.end_date,
        weekly_sessions: planData.weekly_sessions,
        focus_areas: planData.focus_areas,
        visibility: planData.visibility,
        accountability: {
          location_preference: planData.location_preference,
          intensity_preference: planData.intensity_preference
        }
      })
      .select()
      .single();
    
    if (error) throw error;
    return data as IndividualTrainingPlan;
  }

  static async updatePlan(planId: string, updates: Partial<IndividualTrainingPlan>): Promise<IndividualTrainingPlan> {
    const { data, error } = await supabase
      .from('individual_training_plans')
      .update(updates)
      .eq('id', planId)
      .select()
      .single();
    
    if (error) throw error;
    return data as IndividualTrainingSession;
  }

  static async deletePlan(planId: string): Promise<void> {
    const { error } = await supabase
      .from('individual_training_plans')
      .delete()
      .eq('id', planId);
    
    if (error) throw error;
  }

  // Sessions
  static async getPlanSessions(planId: string): Promise<IndividualTrainingSession[]> {
    const { data, error } = await supabase
      .from('individual_training_sessions')
      .select('*')
      .eq('plan_id', planId)
      .order('session_order');
    
    if (error) throw error;
    return data || [];
  }

  static async createSession(sessionData: Omit<IndividualTrainingSession, 'id' | 'created_at' | 'updated_at'>): Promise<IndividualTrainingSession> {
    const { data, error } = await supabase
      .from('individual_training_sessions')
      .insert(sessionData)
      .select()
      .single();
    
    if (error) throw error;
    return (data || []) as IndividualTrainingSession[];
  }

  static async updateSession(sessionId: string, updates: Partial<IndividualTrainingSession>): Promise<IndividualTrainingSession> {
    const { data, error } = await supabase
      .from('individual_training_sessions')
      .update(updates)
      .eq('id', sessionId)
      .select()
      .single();
    
    if (error) throw error;
    return data as IndividualTrainingSession;
  }

  static async deleteSession(sessionId: string): Promise<void> {
    const { error } = await supabase
      .from('individual_training_sessions')
      .delete()
      .eq('id', sessionId);
    
    if (error) throw error;
  }

  // Session Drills
  static async getSessionDrills(sessionId: string): Promise<IndividualSessionDrill[]> {
    const { data, error } = await supabase
      .from('individual_session_drills')
      .select(`
        *,
        drill:drills(
          id,
          name,
          description,
          duration_minutes,
          difficulty_level,
          drill_tags:drill_tag_assignments(
            tag:drill_tags(*)
          )
        )
      `)
      .eq('session_id', sessionId)
      .order('sequence_order');
    
    if (error) throw error;
    
    return (data || []).map(item => ({
      ...item,
      target_metrics: item.target_metrics as Record<string, any>,
      drill: item.drill ? {
        ...item.drill,
        drill_tags: item.drill.drill_tags?.map((dt: any) => dt.tag).filter(Boolean) || []
      } : undefined
    })) as IndividualSessionDrill[];
  }

  static async addDrillToSession(sessionId: string, drillData: {
    drill_id?: string;
    custom_drill_name?: string;
    custom_drill_description?: string;
    target_repetitions?: number;
    target_duration_minutes?: number;
    target_metrics?: Record<string, any>;
    progression_level: number;
    sequence_order: number;
    notes?: string;
  }): Promise<IndividualSessionDrill> {
    const { data, error } = await supabase
      .from('individual_session_drills')
      .insert({
        session_id: sessionId,
        ...drillData,
        target_metrics: drillData.target_metrics || {}
      })
      .select()
      .single();
    
    if (error) throw error;
    return { ...data, target_metrics: data.target_metrics as Record<string, any> } as IndividualSessionDrill;
  }

  static async removeDrillFromSession(drillId: string): Promise<void> {
    const { error } = await supabase
      .from('individual_session_drills')
      .delete()
      .eq('id', drillId);
    
    if (error) throw error;
  }

  // Session Completions
  static async getSessionCompletion(sessionId: string, playerId: string): Promise<IndividualSessionCompletion | null> {
    const { data, error } = await supabase
      .from('individual_session_completions')
      .select('*')
      .eq('session_id', sessionId)
      .eq('player_id', playerId)
      .maybeSingle();
    
    if (error) throw error;
    return data ? { ...data, drill_results: data.drill_results as Record<string, any> } as IndividualSessionCompletion : null;
  }

  static async completeSession(completionData: Omit<IndividualSessionCompletion, 'id' | 'created_at' | 'updated_at'>): Promise<IndividualSessionCompletion> {
    const { data, error } = await supabase
      .from('individual_session_completions')
      .insert(completionData)
      .select()
      .single();
    
    if (error) throw error;
    return { ...data, drill_results: data.drill_results as Record<string, any> } as IndividualSessionCompletion;
  }

  static async updateSessionCompletion(completionId: string, updates: Partial<IndividualSessionCompletion>): Promise<IndividualSessionCompletion> {
    const { data, error } = await supabase
      .from('individual_session_completions')
      .update(updates)
      .eq('id', completionId)
      .select()
      .single();
    
    if (error) throw error;
    return { ...data, drill_results: data.drill_results as Record<string, any> } as IndividualSessionCompletion;
  }

  // Drill Library for Players
  static async getAvailableDrills(searchTerm?: string, tags?: string[], difficulty?: string): Promise<DrillWithTags[]> {
    let query = supabase
      .from('drills')
      .select(`
        id,
        name,
        description,
        duration_minutes,
        difficulty_level,
        is_public,
        created_by,
        drill_tags:drill_tag_assignments(
          tag:drill_tags(*)
        )
      `)
      .eq('is_public', true)
      .order('name');

    if (searchTerm) {
      query = query.ilike('name', `%${searchTerm}%`);
    }

    if (difficulty && difficulty !== 'all') {
      query = query.eq('difficulty_level', difficulty);
    }

    const { data, error } = await query;
    if (error) throw error;

    let filteredData = data || [];

    // Filter by tags if any are selected
    if (tags && tags.length > 0) {
      filteredData = filteredData.filter(drill => {
        const drillTagIds = drill.drill_tags?.map((dt: any) => dt.tag?.id).filter(Boolean) || [];
        return tags.every(tagId => drillTagIds.includes(tagId));
      });
    }

    // Transform the data to flatten drill_tags
    return filteredData.map(drill => ({
      ...drill,
      drill_tags: drill.drill_tags?.map((dt: any) => dt.tag).filter(Boolean) || []
    }));
  }

  // AI Recommendations
  static async getPlayerRecommendations(playerId: string, focusAreas?: string[]): Promise<DrillWithTags[]> {
    // For now, return popular public drills
    // TODO: Integrate with AI recommendation service
    const { data, error } = await supabase
      .from('drills')
      .select(`
        id,
        name,
        description,
        duration_minutes,
        difficulty_level,
        is_public,
        created_by,
        drill_tags:drill_tag_assignments(
          tag:drill_tags(*)
        )
      `)
      .eq('is_public', true)
      .limit(6)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    
    return (data || []).map(drill => ({
      ...drill,
      drill_tags: drill.drill_tags?.map((dt: any) => dt.tag).filter(Boolean) || []
    }));
  }
}