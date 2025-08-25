import { supabase } from '@/integrations/supabase/client';
import type { 
  IndividualTrainingPlan, 
  GroupTrainingPlan,
  PlanCreationData
} from '@/types/individualTraining';

export class GroupTrainingService {
  // Create a group plan that can have multiple players
  static async createGroupPlan(planData: PlanCreationData & { player_ids: string[]; coach_id?: string }): Promise<IndividualTrainingPlan> {
    // Create the main plan record
    const { data: plan, error: planError } = await supabase
      .from('individual_training_plans')
      .insert({
        title: planData.title,
        objective_text: planData.objective_text,
        plan_type: planData.plan_type,
        start_date: planData.start_date,
        end_date: planData.end_date,
        weekly_sessions: planData.weekly_sessions,
        focus_areas: planData.focus_areas,
        visibility: planData.visibility,
        is_group_plan: true,
        coach_id: planData.coach_id,
        accountability: {
          location_preference: planData.location_preference,
          intensity_preference: planData.intensity_preference
        }
      })
      .select()
      .single();
    
    if (planError) throw planError;

    // Create plan-player assignments for each player
    const playerAssignments = planData.player_ids.map(playerId => ({
      plan_id: plan.id,
      player_id: playerId
    }));

    const { error: assignmentError } = await supabase
      .from('training_plan_players')
      .insert(playerAssignments);
    
    if (assignmentError) throw assignmentError;

    return plan as IndividualTrainingPlan;
  }

  // Get all plans (both individual and group) for the dashboard
  static async getUserPlans(userId: string): Promise<GroupTrainingPlan[]> {
    // Get all plans the user has access to
    const { data: plans, error: plansError } = await supabase
      .from('individual_training_plans')
      .select(`
        *,
        training_plan_players!inner(
          player_id,
          players(id, name, squad_number)
        )
      `)
      .order('created_at', { ascending: false });
    
    if (plansError) throw plansError;

    // Transform plans to include player information
    const transformedPlans: GroupTrainingPlan[] = plans.map(plan => {
      const players = plan.training_plan_players?.map((tpp: any) => ({
        id: tpp.players.id,
        name: tpp.players.name,
        squad_number: tpp.players.squad_number
      })) || [];

      return {
        ...plan,
        players,
        player_count: players.length,
        is_group_plan: plan.is_group_plan || players.length > 1,
        plan_type: plan.plan_type as 'self' | 'coach' | 'ai',
        status: plan.status as 'draft' | 'active' | 'completed' | 'archived',
        visibility: plan.visibility as 'private' | 'coach' | 'teamStaff',
        accountability: plan.accountability as Record<string, any>
      };
    });

    return transformedPlans;
  }

  // Get plans for a specific player
  static async getPlayerPlans(playerId: string): Promise<GroupTrainingPlan[]> {
    const { data: plans, error } = await supabase
      .from('individual_training_plans')
      .select(`
        *,
        training_plan_players!inner(
          player_id,
          players(id, name, squad_number)
        )
      `)
      .eq('training_plan_players.player_id', playerId)
      .order('created_at', { ascending: false });
    
    if (error) throw error;

    return plans.map(plan => {
      const players = plan.training_plan_players?.map((tpp: any) => ({
        id: tpp.players.id,
        name: tpp.players.name,
        squad_number: tpp.players.squad_number
      })) || [];

      return {
        ...plan,
        players,
        player_count: players.length,
        is_group_plan: plan.is_group_plan || players.length > 1,
        plan_type: plan.plan_type as 'self' | 'coach' | 'ai',
        status: plan.status as 'draft' | 'active' | 'completed' | 'archived',
        visibility: plan.visibility as 'private' | 'coach' | 'teamStaff',
        accountability: plan.accountability as Record<string, any>
      };
    });
  }

  // Add players to an existing plan
  static async addPlayersToplan(planId: string, playerIds: string[]): Promise<void> {
    const playerAssignments = playerIds.map(playerId => ({
      plan_id: planId,
      player_id: playerId
    }));

    const { error } = await supabase
      .from('training_plan_players')
      .insert(playerAssignments);
    
    if (error) throw error;

    // Update the plan to mark it as a group plan if it has multiple players
    const { data: currentAssignments } = await supabase
      .from('training_plan_players')
      .select('player_id')
      .eq('plan_id', planId);

    if (currentAssignments && currentAssignments.length > 1) {
      await supabase
        .from('individual_training_plans')
        .update({ is_group_plan: true })
        .eq('id', planId);
    }
  }

  // Remove players from a plan
  static async removePlayersFromPlan(planId: string, playerIds: string[]): Promise<void> {
    const { error } = await supabase
      .from('training_plan_players')
      .delete()
      .eq('plan_id', planId)
      .in('player_id', playerIds);
    
    if (error) throw error;

    // Check if plan should still be marked as group plan
    const { data: remainingAssignments } = await supabase
      .from('training_plan_players')
      .select('player_id')
      .eq('plan_id', planId);

    if (remainingAssignments && remainingAssignments.length <= 1) {
      await supabase
        .from('individual_training_plans')
        .update({ is_group_plan: false })
        .eq('id', planId);
    }
  }
}