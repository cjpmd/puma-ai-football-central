import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { X, Printer, Download, Clock, Users, Target, Clipboard } from 'lucide-react';
import { DatabaseEvent } from '@/types/event';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { toast } from '@/hooks/use-toast';
import { formatPlayerName } from '@/utils/nameUtils';
import '../../styles/training-pack.css';

interface TrainingPackViewProps {
  event: DatabaseEvent;
  onClose: () => void;
}

interface TrainingSession {
  id: string;
  event_id: string;
  team_id: string;
  total_duration_minutes: number;
  session_objectives?: string;
  session_intensity?: 'low' | 'medium' | 'high';
  coach_reflection?: string;
  session_rating?: number;
}

interface TrainingSessionDrill {
  id: string;
  training_session_id: string;
  drill_id?: string;
  custom_drill_name?: string;
  custom_drill_description?: string;
  sequence_order: number;
  duration_minutes: number;
  notes?: string;
  observed_notes?: string;
  actual_duration_minutes?: number;
  drill?: {
    name: string;
    description?: string;
    difficulty_level?: string;
  };
  drill_subgroups?: Array<{
    id: string;
    subgroup_name: string;
    drill_subgroup_players?: Array<{
      player_id: string;
    }>;
  }>;
}

interface Equipment {
  id: string;
  custom_equipment_name: string;
  quantity_needed: number;
  notes?: string;
}

export const TrainingPackView: React.FC<TrainingPackViewProps> = ({
  event,
  onClose
}) => {
  const [sessionObjectives, setSessionObjectives] = useState('');
  const [coachReflection, setCoachReflection] = useState('');
  const [sessionRating, setSessionRating] = useState<number>(0);

  // Load training session data
  const { data: trainingSession } = useQuery({
    queryKey: ['training-session', event.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('training_sessions')
        .select('*')
        .eq('event_id', event.id)
        .eq('team_id', event.team_id)
        .maybeSingle();
      
      if (error) throw error;
      return data as TrainingSession | null;
    }
  });

  // Load training session drills with all relations
  const { data: trainingDrills = [] } = useQuery({
    queryKey: ['training-session-drills', trainingSession?.id],
    queryFn: async () => {
      if (!trainingSession?.id) return [];
      
      const { data, error } = await supabase
        .from('training_session_drills')
        .select(`
          *,
          drill:drills(*),
          drill_subgroups(
            id,
            subgroup_name,
            drill_subgroup_players(player_id)
          )
        `)
        .eq('training_session_id', trainingSession.id)
        .order('sequence_order');
      
      if (error) throw error;
      return data as TrainingSessionDrill[];
    },
    enabled: !!trainingSession?.id
  });

  // Load equipment
  const { data: equipment = [] } = useQuery({
    queryKey: ['training-equipment', trainingSession?.id],
    queryFn: async () => {
      if (!trainingSession?.id) return [];
      
      const { data, error } = await supabase
        .from('training_session_equipment')
        .select('*')
        .eq('training_session_id', trainingSession.id);
      
      if (error) throw error;
      return data as Equipment[];
    },
    enabled: !!trainingSession?.id
  });

  // Load squad players
  const { data: squadPlayers = [] } = useQuery({
    queryKey: ['squad-players', event.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('team_squads')
        .select(`
          player_id,
          players(*)
        `)
        .eq('event_id', event.id);
      
      if (error) throw error;
      return data?.map(s => s.players).filter(Boolean) || [];
    }
  });

  // Load team data
  const { data: teamData } = useQuery({
    queryKey: ['team-data', event.team_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('teams')
        .select('*')
        .eq('id', event.team_id)
        .single();
      
      if (error) throw error;
      return data;
    }
  });

  // Load assigned staff
  const { data: assignedStaff = [] } = useQuery({
    queryKey: ['event-staff', event.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('event_selections')
        .select('staff_selection')
        .eq('event_id', event.id)
        .limit(1)
        .maybeSingle();
      
      if (error) throw error;
      
      const staffSelection = Array.isArray(data?.staff_selection) ? data.staff_selection : [];
      if (staffSelection.length === 0) return [];
      
      const staffIds = staffSelection.map((s: any) => s.staffId).filter(Boolean);
      if (staffIds.length === 0) return [];
      
      const { data: staffData, error: staffError } = await supabase
        .from('team_staff')
        .select('*')
        .in('id', staffIds);
      
      if (staffError) throw staffError;
      return staffData || [];
    }
  });

  // Initialize state from loaded data
  useEffect(() => {
    if (trainingSession) {
      setSessionObjectives(trainingSession.session_objectives || '');
      setCoachReflection(trainingSession.coach_reflection || '');
      setSessionRating(trainingSession.session_rating || 0);
    }
  }, [trainingSession]);

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast({
        title: "Error",
        description: "Unable to open print window. Please check your popup blocker.",
        variant: "destructive"
      });
      return;
    }

    const content = document.querySelector('.training-pack');
    if (!content) {
      toast({
        title: "Error", 
        description: "Content not found for printing",
        variant: "destructive"
      });
      return;
    }

    const styles = Array.from(document.styleSheets)
      .map(styleSheet => {
        try {
          return Array.from(styleSheet.cssRules)
            .map(rule => rule.cssText)
            .join('\n');
        } catch (e) {
          return '';
        }
      })
      .join('\n');

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Training Pack - ${event.title}</title>
          <style>
            ${styles}
          </style>
        </head>
        <body>
          ${content.outerHTML}
        </body>
      </html>
    `);

    printWindow.document.close();
    
    printWindow.onload = () => {
      setTimeout(() => {
        printWindow.print();
        printWindow.onafterprint = () => {
          printWindow.close();
        };
      }, 500);
    };
  };

  const handleDownloadPDF = async () => {
    handlePrint();
    toast({
      title: "PDF Download",
      description: "In the print dialog, choose 'Save as PDF' as your destination.",
      variant: "default"
    });
  };

  const saveSessionData = async () => {
    if (!trainingSession) return;

    const { error } = await supabase
      .from('training_sessions')
      .update({
        session_objectives: sessionObjectives,
        coach_reflection: coachReflection,
        session_rating: sessionRating > 0 ? sessionRating : null
      })
      .eq('id', trainingSession.id);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to save session data",
        variant: "destructive"
      });
    } else {
      toast({
        title: "Saved",
        description: "Session data saved successfully"
      });
    }
  };

  const getIntensityColor = (intensity?: string) => {
    switch (intensity) {
      case 'high': return 'bg-red-50 text-red-700 border-red-200';
      case 'medium': return 'bg-orange-50 text-orange-700 border-orange-200';
      case 'low': return 'bg-green-50 text-green-700 border-green-200';
      default: return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  const getDrillCategoryColor = (difficulty?: string) => {
    switch (difficulty?.toLowerCase()) {
      case 'beginner': return 'bg-green-50 text-green-700 border-green-300';
      case 'intermediate': return 'bg-blue-50 text-blue-700 border-blue-300';
      case 'advanced': return 'bg-purple-50 text-purple-700 border-purple-300';
      default: return 'bg-gray-50 text-gray-700 border-gray-300';
    }
  };

  const calculateDrillStartTime = (index: number) => {
    let totalMinutes = 0;
    for (let i = 0; i < index; i++) {
      totalMinutes += trainingDrills[i]?.duration_minutes || 0;
    }
    return totalMinutes;
  };

  const getPlayerById = (playerId: string) => {
    return squadPlayers.find((p: any) => p.id === playerId);
  };

  if (!trainingSession) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>No Training Plan</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-4">This training session doesn't have a plan yet. Please create a training plan first.</p>
            <Button onClick={onClose}>Close</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 overflow-y-auto">
      <div className="min-h-screen py-8">
        {/* Control Bar */}
        <div className="no-print sticky top-0 bg-white border-b shadow-sm p-4 mb-6 z-10">
          <div className="container mx-auto flex justify-between items-center">
            <h2 className="text-xl font-bold">Training Pack - {event.title}</h2>
            <div className="flex gap-2">
              <Button onClick={saveSessionData} variant="outline">
                Save Changes
              </Button>
              <Button onClick={handlePrint} variant="outline">
                <Printer className="h-4 w-4 mr-2" />
                Print
              </Button>
              <Button onClick={handleDownloadPDF} variant="outline">
                <Download className="h-4 w-4 mr-2" />
                PDF
              </Button>
              <Button onClick={onClose} variant="ghost" size="icon">
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Training Pack Content */}
        <div className="training-pack">
          
          {/* Page 1: Overview */}
          <div className="page">
            {/* Header */}
            <div className="mb-6 pb-4 border-b-2 border-gray-300">
              <div className="flex justify-between items-start">
                <div>
                  <h1 className="text-3xl font-bold mb-2">{event.title}</h1>
                  <div className="flex gap-4 text-sm text-gray-600">
                    <span>{new Date(event.date).toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
                    {event.start_time && <span>• {event.start_time}</span>}
                    {event.location && <span>• {event.location}</span>}
                  </div>
                </div>
                {teamData?.logo_url && (
                  <img src={teamData.logo_url} alt={teamData.name} className="h-16 w-16 object-contain" />
                )}
              </div>
            </div>

            {/* Session Overview */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Duration
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">{trainingSession.total_duration_minutes} mins</p>
                  <p className="text-xs text-gray-600">{trainingDrills.length} drills planned</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Target className="h-4 w-4" />
                    Intensity
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Badge className={getIntensityColor(trainingSession.session_intensity)}>
                    {trainingSession.session_intensity?.toUpperCase() || 'NOT SET'}
                  </Badge>
                </CardContent>
              </Card>
            </div>

            {/* Session Objectives */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clipboard className="h-5 w-5" />
                  Session Objectives
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={sessionObjectives}
                  onChange={(e) => setSessionObjectives(e.target.value)}
                  placeholder="Enter session objectives and focus areas..."
                  className="min-h-[100px]"
                />
              </CardContent>
            </Card>

            {/* Squad Overview */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Squad ({squadPlayers.length} players)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-4 gap-2">
                  {squadPlayers.map((player: any) => (
                    <div key={player.id} className="text-xs border rounded p-2">
                      <span className="font-bold">#{player.squad_number}</span> {formatPlayerName(player.name)}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Staff Assignments */}
            {assignedStaff.length > 0 && (
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle>Staff Assignments</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-2">
                    {assignedStaff.map((staff: any) => (
                      <div key={staff.id} className="text-sm border rounded p-2">
                        <p className="font-bold">{staff.name}</p>
                        <p className="text-xs text-gray-600">{staff.role}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Equipment Checklist */}
            <Card className="equipment-checklist">
              <CardHeader>
                <CardTitle>Equipment Checklist</CardTitle>
              </CardHeader>
              <CardContent>
                {equipment.length > 0 ? (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2 w-8">☐</th>
                        <th className="text-left py-2">Item</th>
                        <th className="text-center py-2 w-20">Qty</th>
                        <th className="text-left py-2">Notes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {equipment.map((item) => (
                        <tr key={item.id} className="border-b">
                          <td className="py-2">
                            <div className="w-4 h-4 border-2 border-gray-400 checkbox-print"></div>
                          </td>
                          <td className="py-2 font-medium">{item.custom_equipment_name}</td>
                          <td className="py-2 text-center">{item.quantity_needed}</td>
                          <td className="py-2 text-xs text-gray-600">{item.notes || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p className="text-sm text-gray-500">No equipment specified</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Pages 2-N: Drill-by-Drill Breakdown */}
          {trainingDrills.map((drill, index) => {
            const startTime = calculateDrillStartTime(index);
            const endTime = startTime + drill.duration_minutes;
            const drillName = drill.custom_drill_name || drill.drill?.name || 'Unnamed Drill';
            const drillDescription = drill.custom_drill_description || drill.drill?.description || '';

            return (
              <div key={drill.id} className="page">
                <div className="drill-card border-2 border-gray-300 rounded-lg p-4">
                  {/* Drill Header */}
                  <div className="flex justify-between items-start mb-4 pb-3 border-b">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <Badge className="bg-gray-200 text-gray-800">Drill {index + 1}</Badge>
                        {drill.drill?.difficulty_level && (
                          <Badge className={getDrillCategoryColor(drill.drill.difficulty_level)}>
                            {drill.drill.difficulty_level}
                          </Badge>
                        )}
                      </div>
                      <h2 className="text-2xl font-bold">{drillName}</h2>
                    </div>
                    <div className="text-right text-sm">
                      <div className="font-bold text-lg">{startTime}-{endTime} min</div>
                      <div className="text-gray-600">{drill.duration_minutes} minutes</div>
                    </div>
                  </div>

                  {/* Drill Description */}
                  {drillDescription && (
                    <div className="mb-4 p-3 bg-gray-50 rounded">
                      <h3 className="font-bold mb-2">Description & Coaching Points</h3>
                      <p className="text-sm whitespace-pre-wrap">{drillDescription}</p>
                    </div>
                  )}

                  {/* Session Notes */}
                  {drill.notes && (
                    <div className="mb-4 p-3 bg-blue-50 rounded">
                      <h3 className="font-bold mb-2">Session Notes</h3>
                      <p className="text-sm whitespace-pre-wrap">{drill.notes}</p>
                    </div>
                  )}

                  {/* Player Groups */}
                  {drill.drill_subgroups && drill.drill_subgroups.length > 0 && (
                    <div className="mb-4">
                      <h3 className="font-bold mb-2">Player Groups</h3>
                      <div className="grid grid-cols-2 gap-3">
                        {drill.drill_subgroups.map((subgroup) => (
                          <div key={subgroup.id} className="border rounded p-3 bg-white">
                            <h4 className="font-bold text-sm mb-2">{subgroup.subgroup_name}</h4>
                            <div className="space-y-1">
                              {subgroup.drill_subgroup_players?.map((sp: any) => {
                                const player = getPlayerById(sp.player_id);
                                return player ? (
                                  <div key={sp.player_id} className="text-xs">
                                    #{player.squad_number} {formatPlayerName(player.name)}
                                  </div>
                                ) : null;
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Coach Observations (Post-Session) */}
                  <div className="coach-notes mt-4 pt-4 border-t">
                    <h3 className="font-bold mb-2">Coach Observations (Post-Session)</h3>
                    <div className="grid grid-cols-2 gap-3 mb-3">
                      <div>
                        <label className="text-xs font-medium block mb-1">Actual Duration</label>
                        <div className="border rounded p-2 bg-white text-sm">
                          {drill.actual_duration_minutes || drill.duration_minutes} mins
                        </div>
                      </div>
                      <div>
                        <label className="text-xs font-medium block mb-1">Completed</label>
                        <div className="border rounded p-2 flex items-center gap-2">
                          <div className="w-4 h-4 border-2 border-gray-400 checkbox-print"></div>
                          <span className="text-xs">Yes</span>
                        </div>
                      </div>
                    </div>
                    <Textarea
                      placeholder="Observations, adjustments made, player performance notes..."
                      className="min-h-[100px]"
                      defaultValue={drill.observed_notes || ''}
                    />
                  </div>
                </div>

                {index < trainingDrills.length - 1 && <div className="page-break"></div>}
              </div>
            );
          })}

          {/* Final Page: Session Review */}
          <div className="page">
            <h1 className="text-2xl font-bold mb-6 pb-3 border-b-2 border-gray-300">Session Review</h1>

            {/* Session Summary */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Session Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2">Drill</th>
                      <th className="text-center py-2 w-20">Planned</th>
                      <th className="text-center py-2 w-20">Actual</th>
                      <th className="text-center py-2 w-16">Done</th>
                    </tr>
                  </thead>
                  <tbody>
                    {trainingDrills.map((drill, index) => (
                      <tr key={drill.id} className="border-b">
                        <td className="py-2">{drill.custom_drill_name || drill.drill?.name || `Drill ${index + 1}`}</td>
                        <td className="text-center py-2">{drill.duration_minutes}m</td>
                        <td className="text-center py-2">{drill.actual_duration_minutes || '-'}</td>
                        <td className="text-center py-2">
                          <div className="w-4 h-4 border-2 border-gray-400 checkbox-print inline-block"></div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>

            {/* Performance Observations */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Performance Observations</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <label className="text-sm font-medium block mb-1">Individual Player Highlights</label>
                  <Textarea placeholder="Which players stood out? Specific performances..." className="min-h-[80px]" />
                </div>
                <div>
                  <label className="text-sm font-medium block mb-1">Areas for Improvement</label>
                  <Textarea placeholder="What needs more work? Skills to focus on..." className="min-h-[80px]" />
                </div>
                <div>
                  <label className="text-sm font-medium block mb-1">Injury Notes / Concerns</label>
                  <Textarea placeholder="Any injuries, niggles, or physical concerns..." className="min-h-[60px]" />
                </div>
              </CardContent>
            </Card>

            {/* Coach Reflection */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Coach Reflection</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <label className="text-sm font-medium block mb-1">What Worked Well</label>
                  <Textarea 
                    placeholder="Successful drills, good engagement, positive outcomes..."
                    className="min-h-[80px]"
                    value={coachReflection}
                    onChange={(e) => setCoachReflection(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium block mb-1">What to Change Next Time</label>
                  <Textarea placeholder="Adjustments, timing changes, different approach..." className="min-h-[80px]" />
                </div>
                <div>
                  <label className="text-sm font-medium block mb-1">Session Rating</label>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setSessionRating(star)}
                        className={`text-2xl ${sessionRating >= star ? 'text-yellow-500' : 'text-gray-300'}`}
                      >
                        ★
                      </button>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Next Session Planning */}
            <Card>
              <CardHeader>
                <CardTitle>Next Session Planning</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <label className="text-sm font-medium block mb-1">Follow-up Drills Needed</label>
                  <Textarea placeholder="Which drills should be repeated or progressed..." className="min-h-[60px]" />
                </div>
                <div>
                  <label className="text-sm font-medium block mb-1">Skills to Reinforce</label>
                  <Textarea placeholder="Specific technical or tactical points to work on..." className="min-h-[60px]" />
                </div>
              </CardContent>
            </Card>
          </div>

        </div>
      </div>
    </div>
  );
};
