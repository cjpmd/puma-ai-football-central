
import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { DatabaseEvent } from '@/types/event';
import { ScoreInput } from './ScoreInput';
import { eventsService } from '@/services/eventsService';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { playerStatsService } from '@/services/playerStatsService';

interface PostGameEditorProps {
  eventId: string;
  isOpen: boolean;
  onClose: () => void;
}

export const PostGameEditor: React.FC<PostGameEditorProps> = ({
  eventId,
  isOpen,
  onClose
}) => {
  const [event, setEvent] = useState<DatabaseEvent | null>(null);
  const [loading, setLoading] = useState(true);
  const [coachNotes, setCoachNotes] = useState('');
  const [staffNotes, setStaffNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (isOpen && eventId) {
      loadEvent();
    }
  }, [isOpen, eventId]);

  const loadEvent = async () => {
    try {
      setLoading(true);
      const eventData = await eventsService.getEventById(eventId);
      
      // Load unique teams based on performance categories from event selections
      const { data: eventSelections } = await supabase
        .from('event_selections')
        .select(`
          team_number,
          performance_category_id,
          performance_categories (
            id,
            name
          )
        `)
        .eq('event_id', eventId)
        .eq('team_id', eventData.team_id);

      // Create unique teams array based on performance categories only (not periods)
      const uniqueTeams = new Map();
      eventSelections?.forEach(selection => {
        if (selection.performance_category_id) {
          const teamKey = selection.performance_category_id;
          if (!uniqueTeams.has(teamKey)) {
            const performanceCategory = selection.performance_categories as any;
            uniqueTeams.set(teamKey, {
              teamNumber: selection.team_number,
              name: performanceCategory?.name || `Team ${selection.team_number}`,
              performanceCategoryId: selection.performance_category_id
            });
          }
        }
      });

      // Update event with unique teams
      const teamsArray = Array.from(uniqueTeams.values());
      const updatedEventData = {
        ...eventData,
        teams: teamsArray
      };

      setEvent(updatedEventData);
      setCoachNotes(eventData.coach_notes || '');
      setStaffNotes(eventData.staff_notes || '');
    } catch (error) {
      console.error('Error loading event:', error);
      toast({
        title: 'Error',
        description: 'Failed to load event data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEventUpdate = (updatedEvent: DatabaseEvent) => {
    setEvent(updatedEvent);
    // Invalidate queries to refresh the events list
    queryClient.invalidateQueries({ queryKey: ['events'] });
  };

  const handleSaveNotes = async () => {
    if (!event) return;

    try {
      setSaving(true);
      
      // Update the event in the database
      const { data: updatedEventData, error } = await supabase
        .from('events')
        .update({
          coach_notes: coachNotes,
          staff_notes: staffNotes,
          updated_at: new Date().toISOString()
        })
        .eq('id', event.id)
        .select()
        .single();

      if (error) throw error;

      const updatedEvent = {
        ...event,
        coach_notes: coachNotes,
        staff_notes: staffNotes
      };

      handleEventUpdate(updatedEvent);
      
      toast({
        title: 'Success',
        description: 'Notes updated successfully',
      });
    } catch (error: any) {
      console.error('Error updating notes:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to update notes',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleScoreUpdate = async (eventId: string, scores: any) => {
    if (!event) return;

    try {
      console.log('Saving scores to database:', scores);
      
      // Update the event in the database with the new scores
      const { data: updatedEventData, error } = await supabase
        .from('events')
        .update({
          scores,
          updated_at: new Date().toISOString()
        })
        .eq('id', eventId)
        .select()
        .single();

      if (error) throw error;

      // Update the local event state with the new scores
      const updatedEvent = {
        ...event,
        scores
      };
      
      console.log('Updated event with scores:', updatedEvent);
      handleEventUpdate(updatedEvent);
      
      // Update player stats with performance category support
      await playerStatsService.updateEventPlayerStats(eventId);
      
      // Force a reload to ensure we have the latest data
      await loadEvent();
      
    } catch (error: any) {
      console.error('Error saving scores:', error);
      throw error; // Re-throw to let ScoreInput handle the error toast
    }
  };

  const handlePOTMUpdate = async (eventId: string, potmData: any) => {
    if (!event) return;

    try {
      console.log('Saving POTM to database:', potmData);
      
      // Update the event in the database
      const { data: updatedEventData, error } = await supabase
        .from('events')
        .update({
          player_of_match_id: potmData.player_of_match_id,
          updated_at: new Date().toISOString()
        })
        .eq('id', eventId)
        .select()
        .single();

      if (error) throw error;

      const updatedEvent = {
        ...event,
        player_of_match_id: potmData.player_of_match_id
      };
      
      handleEventUpdate(updatedEvent);
      
      // Update player stats with performance category support
      await playerStatsService.updateEventPlayerStats(eventId);
      
      // Force a reload to ensure we have the latest data
      await loadEvent();
      
    } catch (error: any) {
      console.error('Error saving POTM:', error);
      throw error; // Re-throw to let ScoreInput handle the error toast
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[900px] h-[85vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>Post-Game Editor - {event?.title}</DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 overflow-hidden">
          <ScrollArea className="h-full">
            <div className="space-y-6 p-1 pb-6">
              {loading ? (
                <div className="text-center py-4">Loading event data...</div>
              ) : !event ? (
                <div className="text-center py-4">Event not found</div>
              ) : (
                <Tabs defaultValue="results" className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="results">Results & POTM</TabsTrigger>
                    <TabsTrigger value="notes">Notes</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="results" className="space-y-4">
                    <ScoreInput 
                      key={`${event.id}-${JSON.stringify(event.scores)}`}
                      event={event} 
                      onScoreUpdate={handleScoreUpdate}
                      onPOTMUpdate={handlePOTMUpdate}
                    />
                  </TabsContent>
                  
                  <TabsContent value="notes" className="space-y-4">
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="coachNotes">Coach Notes</Label>
                        <Textarea
                          id="coachNotes"
                          placeholder="Add your coaching observations and feedback..."
                          value={coachNotes}
                          onChange={(e) => setCoachNotes(e.target.value)}
                          className="min-h-[120px]"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="staffNotes">Staff Notes</Label>
                        <Textarea
                          id="staffNotes"
                          placeholder="Add staff observations and notes..."
                          value={staffNotes}
                          onChange={(e) => setStaffNotes(e.target.value)}
                          className="min-h-[120px]"
                        />
                      </div>

                      <Button 
                        onClick={handleSaveNotes} 
                        disabled={saving}
                        className="w-full"
                      >
                        {saving ? 'Saving...' : 'Save Notes'}
                      </Button>
                    </div>
                  </TabsContent>
                </Tabs>
              )}
            </div>
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
};
