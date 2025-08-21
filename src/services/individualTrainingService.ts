import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import type { 
  IndividualTrainingPlan, 
  IndividualTrainingSession, 
  IndividualSessionDrill, 
  IndividualSessionCompletion,
  PlanCreationData,
  DrillWithTags,
  IndividualPlanAssignment,
  AITrainingRecommendation,
  IndividualProgressMilestone,
  TeamIndividualTrainingOverview,
  IndividualTrainingAnalytics,
  TeamCoachingInsight,
  IndividualPerformanceCorrelation
} from '@/types/individualTraining';

export class IndividualTrainingService {
  
  // Plans
  static async getUserPlans(userId: string): Promise<IndividualTrainingPlan[]> {
    const { data, error } = await supabase
      .from('individual_training_plans')
      .select('*')
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
    return (data || []).map(item => ({
      ...item,
      plan_type: item.plan_type as 'self' | 'coach' | 'ai',
      status: item.status as 'draft' | 'active' | 'completed' | 'archived',
      visibility: item.visibility as 'private' | 'coach' | 'teamStaff',
      accountability: item.accountability as Record<string, any>
    })) as IndividualTrainingPlan[];
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
    
    // Auto-create a player objective for this training plan
    const plan = data as IndividualTrainingPlan;
    await this.createObjectiveForPlan(plan);
    
    return plan;
  }

  // Helper method to create an objective for a training plan
  private static async createObjectiveForPlan(plan: IndividualTrainingPlan): Promise<void> {
    try {
      // Get current player objectives
      const { data: playerData, error: playerError } = await supabase
        .from('players')
        .select('objectives')
        .eq('id', plan.player_id)
        .single();

      if (playerError) {
        console.warn('Could not fetch player objectives:', playerError);
        return;
      }

      const currentObjectives = playerData?.objectives || [];
      const objectiveId = `obj-${Date.now()}`;
      
      // Create summary from plan details
      const focusAreasArray = Array.isArray(plan.focus_areas) ? plan.focus_areas : [];
      const focusAreasText = focusAreasArray.length > 0 ? ` Focus areas: ${focusAreasArray.join(', ')}.` : '';
      const sessionsText = plan.weekly_sessions ? ` ${plan.weekly_sessions} sessions per week.` : '';
      const objectiveDescription = `${plan.objective_text || 'Training plan objective'}${focusAreasText}${sessionsText}`;

      const newObjective = {
        id: objectiveId,
        title: `Training Plan: ${plan.title}`,
        description: objectiveDescription,
        difficultyRating: 3, // Default difficulty
        reviewDate: plan.end_date || format(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'),
        status: 'ongoing' as const,
        createdAt: new Date().toISOString(),
        createdBy: 'Training Plan Auto-Generated'
      };

      // Update player with new objective
      const currentObjectivesArray = Array.isArray(currentObjectives) ? currentObjectives : [];
      const updatedObjectives = [...currentObjectivesArray, newObjective];
      
      const { error: updateError } = await supabase
        .from('players')
        .update({ objectives: updatedObjectives })
        .eq('id', plan.player_id);

      if (updateError) {
        console.warn('Could not create objective for training plan:', updateError);
      }
    } catch (err) {
      console.warn('Failed to create objective for training plan:', err);
    }
  }

  static async updatePlan(planId: string, updates: Partial<IndividualTrainingPlan>): Promise<IndividualTrainingPlan> {
    const { data, error } = await supabase
      .from('individual_training_plans')
      .update(updates)
      .eq('id', planId)
      .select()
      .single();
    
    if (error) throw error;
    return {
      ...data,
      plan_type: data.plan_type as 'self' | 'coach' | 'ai',
      status: data.status as 'draft' | 'active' | 'completed' | 'archived',
      visibility: data.visibility as 'private' | 'coach' | 'teamStaff',
      accountability: data.accountability as Record<string, any>
    } as IndividualTrainingPlan;
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
    return (data || []).map(item => ({
      ...item,
      location: item.location as 'home' | 'pitch' | 'gym'
    })) as IndividualTrainingSession[];
  }

  static async createSession(sessionData: Omit<IndividualTrainingSession, 'id' | 'created_at' | 'updated_at'>): Promise<IndividualTrainingSession> {
    const { data, error } = await supabase
      .from('individual_training_sessions')
      .insert(sessionData)
      .select()
      .single();
    
    if (error) throw error;
    return {
      ...data,
      location: data.location as 'home' | 'pitch' | 'gym'
    } as IndividualTrainingSession;
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

  // Phase 2: Coach Assignment & AI Integration Methods

  // Plan Assignments
  static async createPlanAssignment(planId: string, assignedBy: string, coachNotes?: string): Promise<IndividualPlanAssignment> {
    const { data, error } = await supabase
      .from('individual_plan_assignments')
      .insert({
        plan_id: planId,
        assigned_by: assignedBy,
        coach_notes: coachNotes
      })
      .select()
      .single();
    
    if (error) throw error;
    return data as IndividualPlanAssignment;
  }

  static async getPlanAssignments(planId: string): Promise<IndividualPlanAssignment[]> {
    const { data, error } = await supabase
      .from('individual_plan_assignments')
      .select('*')
      .eq('plan_id', planId)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return (data || []) as IndividualPlanAssignment[];
  }

  static async updateAssignmentStatus(assignmentId: string, status: 'pending' | 'accepted' | 'declined' | 'completed', feedback?: string): Promise<IndividualPlanAssignment> {
    const { data, error } = await supabase
      .from('individual_plan_assignments')
      .update({
        status,
        player_feedback: feedback
      })
      .eq('id', assignmentId)
      .select()
      .single();
    
    if (error) throw error;
    return data as IndividualPlanAssignment;
  }

  // AI Recommendations
  static async createAIRecommendation(playerId: string, recommendationData: {
    focus_areas: string[];
    difficulty_level: number;
    recommended_drills: string[];
    reasoning?: string;
    confidence_score?: number;
  }): Promise<AITrainingRecommendation> {
    const { data, error } = await supabase
      .from('ai_training_recommendations')
      .insert({
        player_id: playerId,
        recommendation_data: recommendationData,
        focus_areas: recommendationData.focus_areas,
        difficulty_level: recommendationData.difficulty_level,
        recommended_drills: recommendationData.recommended_drills,
        reasoning: recommendationData.reasoning,
        confidence_score: recommendationData.confidence_score
      })
      .select()
      .single();
    
    if (error) throw error;
    return data as AITrainingRecommendation;
  }

  static async getPlayerRecommendationsAI(playerId: string): Promise<AITrainingRecommendation[]> {
    const { data, error } = await supabase
      .from('ai_training_recommendations')
      .select('*')
      .eq('player_id', playerId)
      .eq('status', 'pending')
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return (data || []) as AITrainingRecommendation[];
  }

  static async updateRecommendationStatus(recommendationId: string, status: 'pending' | 'applied' | 'dismissed'): Promise<AITrainingRecommendation> {
    const { data, error } = await supabase
      .from('ai_training_recommendations')
      .update({ status })
      .eq('id', recommendationId)
      .select()
      .single();
    
    if (error) throw error;
    return data as AITrainingRecommendation;
  }

  // Progress Milestones
  static async createMilestone(planId: string, milestoneData: {
    milestone_name: string;
    target_value?: number;
    unit?: string;
    notes?: string;
  }): Promise<IndividualProgressMilestone> {
    const { data, error } = await supabase
      .from('individual_progress_milestones')
      .insert({
        plan_id: planId,
        ...milestoneData
      })
      .select()
      .single();
    
    if (error) throw error;
    return data as IndividualProgressMilestone;
  }

  static async getPlanMilestones(planId: string): Promise<IndividualProgressMilestone[]> {
    const { data, error } = await supabase
      .from('individual_progress_milestones')
      .select('*')
      .eq('plan_id', planId)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return (data || []) as IndividualProgressMilestone[];
  }

  static async updateMilestoneProgress(milestoneId: string, currentValue: number, notes?: string): Promise<IndividualProgressMilestone> {
    const updateData: any = { current_value: currentValue };
    
    // Check if milestone is achieved
    const { data: milestone } = await supabase
      .from('individual_progress_milestones')
      .select('target_value')
      .eq('id', milestoneId)
      .single();
    
    if (milestone?.target_value && currentValue >= milestone.target_value) {
      updateData.achieved_at = new Date().toISOString();
    }
    
    if (notes) updateData.notes = notes;

    const { data, error } = await supabase
      .from('individual_progress_milestones')
      .update(updateData)
      .eq('id', milestoneId)
      .select()
      .single();
    
    if (error) throw error;
    return data as IndividualProgressMilestone;
  }

  // Phase 3: Team Integration & Analytics Methods

  // Team Overview
  static async getTeamTrainingOverview(teamId: string): Promise<TeamIndividualTrainingOverview | null> {
    const { data, error } = await supabase
      .from('team_individual_training_overview')
      .select('*')
      .eq('team_id', teamId)
      .maybeSingle();
    
    if (error) throw error;
    return data as TeamIndividualTrainingOverview | null;
  }

  static async createOrUpdateTeamOverview(teamId: string, coachId: string, overviewData: {
    analytics_summary: Record<string, any>;
    team_goals: string[];
    focus_areas_summary: Record<string, any>;
  }): Promise<TeamIndividualTrainingOverview> {
    const { data, error } = await supabase
      .from('team_individual_training_overview')
      .upsert({
        team_id: teamId,
        coach_id: coachId,
        ...overviewData,
        last_updated: new Date().toISOString()
      })
      .select()
      .single();
    
    if (error) throw error;
    return data as TeamIndividualTrainingOverview;
  }

  // Training Analytics
  static async getPlayerAnalytics(playerId: string, startDate?: string, endDate?: string): Promise<IndividualTrainingAnalytics[]> {
    let query = supabase
      .from('individual_training_analytics')
      .select('*')
      .eq('player_id', playerId)
      .order('analytics_period_start', { ascending: false });

    if (startDate && endDate) {
      query = query
        .gte('analytics_period_start', startDate)
        .lte('analytics_period_end', endDate);
    }

    const { data, error } = await query;
    if (error) throw error;
    return (data || []) as IndividualTrainingAnalytics[];
  }

  static async getTeamAnalytics(teamId: string, startDate?: string, endDate?: string): Promise<IndividualTrainingAnalytics[]> {
    const { data: teamPlayers } = await supabase
      .from('players')
      .select('id')
      .eq('team_id', teamId);

    if (!teamPlayers || teamPlayers.length === 0) return [];

    const playerIds = teamPlayers.map(p => p.id);

    let query = supabase
      .from('individual_training_analytics')
      .select('*')
      .in('player_id', playerIds)
      .order('analytics_period_start', { ascending: false });

    if (startDate && endDate) {
      query = query
        .gte('analytics_period_start', startDate)
        .lte('analytics_period_end', endDate);
    }

    const { data, error } = await query;
    if (error) throw error;
    return (data || []) as IndividualTrainingAnalytics[];
  }

  static async createAnalyticsRecord(analyticsData: Omit<IndividualTrainingAnalytics, 'id' | 'created_at' | 'updated_at'>): Promise<IndividualTrainingAnalytics> {
    const { data, error } = await supabase
      .from('individual_training_analytics')
      .insert(analyticsData)
      .select()
      .single();
    
    if (error) throw error;
    return data as IndividualTrainingAnalytics;
  }

  // Coaching Insights
  static async getTeamCoachingInsights(teamId: string, coachId?: string): Promise<TeamCoachingInsight[]> {
    let query = supabase
      .from('team_coaching_insights')
      .select('*')
      .eq('team_id', teamId)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false });

    if (coachId) {
      query = query.eq('coach_id', coachId);
    }

    const { data, error } = await query;
    if (error) throw error;
    return (data || []) as TeamCoachingInsight[];
  }

  static async createCoachingInsight(insightData: Omit<TeamCoachingInsight, 'id' | 'created_at'>): Promise<TeamCoachingInsight> {
    const { data, error } = await supabase
      .from('team_coaching_insights')
      .insert(insightData)
      .select()
      .single();
    
    if (error) throw error;
    return data as TeamCoachingInsight;
  }

  static async markInsightAddressed(insightId: string): Promise<TeamCoachingInsight> {
    const { data, error } = await supabase
      .from('team_coaching_insights')
      .update({ 
        addressed_at: new Date().toISOString(),
        action_required: false
      })
      .eq('id', insightId)
      .select()
      .single();
    
    if (error) throw error;
    return data as TeamCoachingInsight;
  }

  // Performance Correlations
  static async getPlayerPerformanceCorrelations(playerId: string): Promise<IndividualPerformanceCorrelation[]> {
    const { data, error } = await supabase
      .from('individual_performance_correlations')
      .select('*')
      .eq('player_id', playerId)
      .order('training_period_start', { ascending: false });
    
    if (error) throw error;
    return (data || []) as IndividualPerformanceCorrelation[];
  }

  static async createPerformanceCorrelation(correlationData: Omit<IndividualPerformanceCorrelation, 'id' | 'created_at'>): Promise<IndividualPerformanceCorrelation> {
    const { data, error } = await supabase
      .from('individual_performance_correlations')
      .insert(correlationData)
      .select()
      .single();
    
    if (error) throw error;
    return data as IndividualPerformanceCorrelation;
  }

  // Team Dashboard Analytics
  static async generateTeamAnalyticsSummary(teamId: string): Promise<Record<string, any>> {
    const [teamAnalytics, teamInsights] = await Promise.all([
      this.getTeamAnalytics(teamId),
      this.getTeamCoachingInsights(teamId)
    ]);

    // Calculate team-wide metrics
    const totalPlayers = new Set(teamAnalytics.map(a => a.player_id)).size;
    const avgCompletionRate = teamAnalytics.reduce((sum, a) => sum + a.completion_rate, 0) / teamAnalytics.length || 0;
    const totalSessionsCompleted = teamAnalytics.reduce((sum, a) => sum + a.total_sessions_completed, 0);
    const avgSessionDuration = teamAnalytics.reduce((sum, a) => sum + a.average_session_duration, 0) / teamAnalytics.length || 0;

    // Group insights by priority
    const insightsByPriority = teamInsights.reduce((acc, insight) => {
      acc[insight.priority_level] = (acc[insight.priority_level] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalPlayers,
      avgCompletionRate: Math.round(avgCompletionRate * 100) / 100,
      totalSessionsCompleted,
      avgSessionDuration: Math.round(avgSessionDuration),
      insightsByPriority,
      actionItemsCount: teamInsights.filter(i => i.action_required).length,
      lastUpdated: new Date().toISOString()
    };
  }
}