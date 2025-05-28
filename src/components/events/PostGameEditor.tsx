
import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { DatabaseEvent } from '@/types/event';
import { ScoreInput } from './ScoreInput';
import { eventsService } from '@/services/eventsService';

interface PostGameEditorProps {
  event: DatabaseEvent;
  onEventUpdate: (updatedEvent: DatabaseEvent) => void;
}

export const PostGameEditor: React.FC<PostGameEditorProps> = ({
  event,
  onEventUpdate
}) => {
  const [coachNotes, setCoachNotes] = useState(event.coach_notes || '');
  const [staffNotes, setStaffNotes] = useState(event.staff_notes || '');
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const handleSaveNotes = async () => {
    try {
      setSaving(true);
      const updatedEvent = await eventsService.updateEvent({
        ...event,
        coach_notes: coachNotes,
        staff_notes: staffNotes
      });
      onEventUpdate(updatedEvent);
      toast({
        title: 'Success',
        description: 'Notes updated successfully',
      });
    } catch (error: any) {
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
    try {
      const updatedEvent = await eventsService.updateEvent({
        ...event,
        scores
      });
      onEventUpdate(updatedEvent);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update scores',
        variant: 'destructive',
      });
    }
  };

  const handlePOTMUpdate = async (eventId: string, potmData: any) => {
    try {
      const updatedEvent = await eventsService.updateEvent({
        ...event,
        ...potmData
      });
      onEventUpdate(updatedEvent);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update Player of the Match',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Post-Game Editor</CardTitle>
          <CardDescription>
            Record match results and add notes for {event.title}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="results" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="results">Results & POTM</TabsTrigger>
              <TabsTrigger value="notes">Notes</TabsTrigger>
            </TabsList>
            
            <TabsContent value="results" className="space-y-4">
              <ScoreInput 
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
        </CardContent>
      </Card>
    </div>
  );
};
