import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface TrainingSessionDrill {
  id: string;
  drill_id?: string;
  custom_drill_name?: string;
  custom_drill_description?: string;
  sequence_order: number;
  duration_minutes: number;
  notes?: string;
  subgroups?: DrillSubgroup[];
}

interface DrillSubgroup {
  id: string;
  subgroup_name: string;
  players: string[];
}

interface Equipment {
  id: string;
  name: string;
  quantity_needed: number;
  notes?: string;
}

export const useTrainingSession = () => {
  const [saving, setSaving] = useState(false);

  const saveTrainingSession = useCallback(async (
    eventId: string,
    teamId: string,
    drills: TrainingSessionDrill[],
    equipment: Equipment[]
  ) => {
    console.log('🔥 SAVE TRAINING SESSION CALLED:', { eventId, teamId, drillsCount: drills.length, equipmentCount: equipment.length });
    setSaving(true);
    
    try {
      // First, ensure a training session record exists
      console.log('🔍 Checking for existing training session...');
      const { data: existingSession, error: sessionCheckError } = await supabase
        .from('training_sessions')
        .select('id')
        .eq('event_id', eventId)
        .eq('team_id', teamId)
        .maybeSingle();

      console.log('📊 Session check result:', { existingSession, sessionCheckError });

      if (sessionCheckError) {
        console.error('❌ Session check error:', sessionCheckError);
        throw sessionCheckError;
      }

      let sessionId = existingSession?.id;

      if (!sessionId) {
        // Create new training session
        console.log('🆕 Creating new training session...');
        const { data: newSession, error: createError } = await supabase
          .from('training_sessions')
          .insert({
            event_id: eventId,
            team_id: teamId,
            total_duration_minutes: drills.reduce((total, drill) => total + drill.duration_minutes, 0)
          })
          .select('id')
          .single();

        console.log('✨ New session created:', { newSession, createError });
        if (createError) {
          console.error('❌ Create session error:', createError);
          throw createError;
        }
        sessionId = newSession.id;
      } else {
        // Update existing session duration
        const { error: updateError } = await supabase
          .from('training_sessions')
          .update({
            total_duration_minutes: drills.reduce((total, drill) => total + drill.duration_minutes, 0),
            updated_at: new Date().toISOString()
          })
          .eq('id', sessionId);

        if (updateError) throw updateError;
      }

      // Delete existing drill data for this session
      const { error: deleteError } = await supabase
        .from('training_session_drills')
        .delete()
        .eq('training_session_id', sessionId);

      if (deleteError) throw deleteError;

      // Save drills if there are any
      if (drills.length > 0) {
        const drillsToInsert = drills.map((drill, index) => ({
          training_session_id: sessionId,
          drill_id: drill.drill_id || null,
          custom_drill_name: drill.custom_drill_name || null,
          custom_drill_description: drill.custom_drill_description || null,
          sequence_order: index + 1,
          duration_minutes: drill.duration_minutes,
          notes: drill.notes || null
        }));

        const { data: savedDrills, error: drillsError } = await supabase
          .from('training_session_drills')
          .insert(drillsToInsert)
          .select('id');

        if (drillsError) throw drillsError;

        // Save subgroups for each drill
        for (let i = 0; i < drills.length; i++) {
          const drill = drills[i];
          const savedDrill = savedDrills[i];
          
          if (drill.subgroups && drill.subgroups.length > 0) {
            const subgroupsToInsert = drill.subgroups.map(subgroup => ({
              training_session_drill_id: savedDrill.id,
              subgroup_name: subgroup.subgroup_name
            }));

            const { data: savedSubgroups, error: subgroupsError } = await supabase
              .from('drill_subgroups')
              .insert(subgroupsToInsert)
              .select('id');

            if (subgroupsError) throw subgroupsError;

            // Save player assignments for each subgroup
            for (let j = 0; j < drill.subgroups.length; j++) {
              const subgroup = drill.subgroups[j];
              const savedSubgroup = savedSubgroups[j];
              
              if (subgroup.players && subgroup.players.length > 0) {
                const playersToInsert = subgroup.players.map(playerId => ({
                  drill_subgroup_id: savedSubgroup.id,
                  player_id: playerId
                }));

                const { error: playersError } = await supabase
                  .from('drill_subgroup_players')
                  .insert(playersToInsert);

                if (playersError) throw playersError;
              }
            }
          }
        }
      }

      // Delete existing equipment data
      const { error: deleteEquipmentError } = await supabase
        .from('training_session_equipment')
        .delete()
        .eq('training_session_id', sessionId);

      if (deleteEquipmentError) throw deleteEquipmentError;

      // Save equipment if there is any
      if (equipment.length > 0) {
        const equipmentToInsert = equipment
          .filter(eq => eq.name.trim()) // Only save equipment with names
          .map(eq => ({
            training_session_id: sessionId,
            custom_equipment_name: eq.name,
            quantity_needed: eq.quantity_needed,
            notes: eq.notes || null
          }));

        if (equipmentToInsert.length > 0) {
          const { error: equipmentError } = await supabase
            .from('training_session_equipment')
            .insert(equipmentToInsert);

          if (equipmentError) throw equipmentError;
        }
      }

      console.log('✅ Training plan saved successfully!');
      toast.success('Training plan saved successfully!');
      return true;
    } catch (error) {
      console.error('❌ Error saving training session:', error);
      toast.error('Failed to save training plan');
      return false;
    } finally {
      setSaving(false);
    }
  }, []);

  return {
    saveTrainingSession,
    saving
  };
};