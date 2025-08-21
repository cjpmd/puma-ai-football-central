import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { UserCheck, Clock, CheckCircle, XCircle, MessageSquare, Plus } from 'lucide-react';
import { IndividualTrainingService } from '@/services/individualTrainingService';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { IndividualPlanAssignment, IndividualTrainingPlan } from '@/types/individualTraining';

interface CoachAssignmentManagerProps {
  plan: IndividualTrainingPlan;
  onAssignmentUpdate?: () => void;
}

export const CoachAssignmentManager: React.FC<CoachAssignmentManagerProps> = ({
  plan,
  onAssignmentUpdate
}) => {
  const [assignments, setAssignments] = useState<IndividualPlanAssignment[]>([]);
  const [availableCoaches, setAvailableCoaches] = useState<any[]>([]);
  const [selectedCoach, setSelectedCoach] = useState<string>('');
  const [coachNotes, setCoachNotes] = useState('');
  const [playerFeedback, setPlayerFeedback] = useState('');
  const [loading, setLoading] = useState(true);
  const [isAssigning, setIsAssigning] = useState(false);
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState<IndividualPlanAssignment | null>(null);

  useEffect(() => {
    loadAssignments();
    loadAvailableCoaches();
  }, [plan.id]);

  const loadAssignments = async () => {
    try {
      const data = await IndividualTrainingService.getPlanAssignments(plan.id);
      setAssignments(data);
    } catch (error) {
      console.error('Error loading assignments:', error);
      toast.error('Failed to load plan assignments');
    } finally {
      setLoading(false);
    }
  };

  const loadAvailableCoaches = async () => {
    try {
      // Get team coaches
      const { data: teamStaff, error } = await supabase
        .from('team_staff')
        .select(`
          id,
          first_name,
          last_name,
          role,
          user_staff!inner(
            user_id,
            profiles(id, email, first_name, last_name)
          )
        `)
        .eq('team_id', plan.player_id) // This would need to be player's team_id
        .in('role', ['team_coach', 'team_manager', 'team_assistant_manager']);

      if (error) throw error;
      setAvailableCoaches(teamStaff || []);
    } catch (error) {
      console.error('Error loading coaches:', error);
    }
  };

  const handleAssignCoach = async () => {
    if (!selectedCoach) {
      toast.error('Please select a coach');
      return;
    }

    setIsAssigning(true);
    try {
      await IndividualTrainingService.createPlanAssignment(
        plan.id,
        selectedCoach,
        coachNotes
      );
      
      toast.success('Coach assigned successfully');
      loadAssignments();
      setShowAssignDialog(false);
      setSelectedCoach('');
      setCoachNotes('');
      onAssignmentUpdate?.();
    } catch (error) {
      console.error('Error assigning coach:', error);
      toast.error('Failed to assign coach');
    } finally {
      setIsAssigning(false);
    }
  };

  const handleStatusUpdate = async (assignmentId: string, status: 'accepted' | 'declined' | 'completed') => {
    try {
      await IndividualTrainingService.updateAssignmentStatus(assignmentId, status, playerFeedback);
      toast.success(`Assignment ${status} successfully`);
      loadAssignments();
      setSelectedAssignment(null);
      setPlayerFeedback('');
      onAssignmentUpdate?.();
    } catch (error) {
      console.error('Error updating assignment status:', error);
      toast.error('Failed to update assignment status');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'border-orange-200 bg-orange-50 text-orange-700';
      case 'accepted': return 'border-green-200 bg-green-50 text-green-700';
      case 'declined': return 'border-red-200 bg-red-50 text-red-700';
      case 'completed': return 'border-blue-200 bg-blue-50 text-blue-700';
      default: return 'border-gray-200 bg-gray-50 text-gray-700';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="h-4 w-4" />;
      case 'accepted': return <UserCheck className="h-4 w-4" />;
      case 'declined': return <XCircle className="h-4 w-4" />;
      case 'completed': return <CheckCircle className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <UserCheck className="h-5 w-5" />
            Coach Assignments
          </CardTitle>
          
          <Dialog open={showAssignDialog} onOpenChange={setShowAssignDialog}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Assign Coach
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Assign Coach to Training Plan</DialogTitle>
              </DialogHeader>
              
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Select Coach</label>
                  <Select value={selectedCoach} onValueChange={setSelectedCoach}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a coach" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableCoaches.map((coach) => (
                        <SelectItem key={coach.id} value={coach.user_staff?.[0]?.user_id || coach.id}>
                          {coach.first_name} {coach.last_name} ({coach.role})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <label className="text-sm font-medium">Assignment Notes</label>
                  <Textarea
                    value={coachNotes}
                    onChange={(e) => setCoachNotes(e.target.value)}
                    placeholder="Add any specific instructions or context..."
                    rows={3}
                  />
                </div>
                
                <div className="flex gap-2 pt-4">
                  <Button onClick={handleAssignCoach} disabled={isAssigning}>
                    {isAssigning ? 'Assigning...' : 'Assign Coach'}
                  </Button>
                  <Button variant="outline" onClick={() => setShowAssignDialog(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      
      <CardContent>
        {assignments.length === 0 ? (
          <Alert>
            <UserCheck className="h-4 w-4" />
            <AlertDescription>
              No coach assignments yet. Assign a coach to get personalized guidance for this training plan.
            </AlertDescription>
          </Alert>
        ) : (
          <div className="space-y-4">
            {assignments.map((assignment) => (
              <div key={assignment.id} className="border rounded-lg p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback>C</AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-medium">Coach Assignment</div>
                      <div className="text-sm text-muted-foreground">
                        Assigned {new Date(assignment.assigned_at).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  
                  <Badge className={`${getStatusColor(assignment.status)} flex items-center gap-1`}>
                    {getStatusIcon(assignment.status)}
                    {assignment.status}
                  </Badge>
                </div>
                
                {assignment.coach_notes && (
                  <div className="mt-3 p-3 bg-muted rounded-md">
                    <div className="text-sm font-medium mb-1">Coach Notes:</div>
                    <div className="text-sm">{assignment.coach_notes}</div>
                  </div>
                )}
                
                {assignment.player_feedback && (
                  <div className="mt-3 p-3 bg-blue-50 rounded-md">
                    <div className="text-sm font-medium mb-1">Player Feedback:</div>
                    <div className="text-sm">{assignment.player_feedback}</div>
                  </div>
                )}
                
                {assignment.status === 'pending' && (
                  <div className="mt-4 flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setSelectedAssignment(assignment);
                        setPlayerFeedback('');
                      }}
                    >
                      <MessageSquare className="h-4 w-4 mr-2" />
                      Respond
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
        
        {selectedAssignment && (
          <Dialog open={!!selectedAssignment} onOpenChange={() => setSelectedAssignment(null)}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Respond to Coach Assignment</DialogTitle>
              </DialogHeader>
              
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Your Response</label>
                  <Textarea
                    value={playerFeedback}
                    onChange={(e) => setPlayerFeedback(e.target.value)}
                    placeholder="Add your thoughts or questions about this assignment..."
                    rows={3}
                  />
                </div>
                
                <div className="flex gap-2 pt-4">
                  <Button
                    onClick={() => handleStatusUpdate(selectedAssignment.id, 'accepted')}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    Accept Assignment
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => handleStatusUpdate(selectedAssignment.id, 'declined')}
                  >
                    Decline Assignment
                  </Button>
                  <Button variant="outline" onClick={() => setSelectedAssignment(null)}>
                    Cancel
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </CardContent>
    </Card>
  );
};