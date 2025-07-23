import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface StaffAssignmentHelperProps {
  eventId: string;
  staffId: string;
  onSuccess?: () => void;
}

export const StaffAssignmentHelper: React.FC<StaffAssignmentHelperProps> = ({
  eventId,
  staffId,
  onSuccess
}) => {
  const assignStaffToEvent = async () => {
    try {
      // First, get the event details to get team_id
      const { data: event, error: eventError } = await supabase
        .from('events')
        .select('team_id')
        .eq('id', eventId)
        .single();

      if (eventError) throw eventError;

      // Check if event_selections exists
      const { data: existingSelection, error: checkError } = await supabase
        .from('event_selections')
        .select('*')
        .eq('event_id', eventId)
        .eq('team_id', event.team_id)
        .eq('team_number', 1)
        .eq('period_number', 1)
        .maybeSingle();

      if (checkError) throw checkError;

      const staffSelection = [{ staffId, role: 'coach' }];

      if (existingSelection) {
        // Update existing selection
        const { error: updateError } = await supabase
          .from('event_selections')
          .update({
            staff_selection: staffSelection
          })
          .eq('id', existingSelection.id);

        if (updateError) throw updateError;
      } else {
        // Create new selection
        const { error: insertError } = await supabase
          .from('event_selections')
          .insert({
            event_id: eventId,
            team_id: event.team_id,
            formation: '4-4-2',
            player_positions: [],
            substitutes: [],
            staff_selection: staffSelection,
            team_number: 1,
            period_number: 1,
            duration_minutes: 90
          });

        if (insertError) throw insertError;
      }

      toast({
        title: "Success",
        description: "Staff assigned to event successfully!"
      });
      
      onSuccess?.();
    } catch (error) {
      console.error('Error assigning staff:', error);
      toast({
        title: "Error",
        description: "Failed to assign staff to event",
        variant: "destructive"
      });
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Debug: Staff Assignment</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground mb-4">
          This will assign Chris McDonald as coach to this event so you can see separate availability controls.
        </p>
        <Button onClick={assignStaffToEvent} className="w-full">
          Assign Chris as Staff to This Event
        </Button>
      </CardContent>
    </Card>
  );
};