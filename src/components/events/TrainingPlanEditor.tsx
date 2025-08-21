import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus, Clock, Users, Play, Search, Filter, Upload, Tag, Trash2, Edit, Target } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';
import { SquadPlayer } from '@/types/teamSelection';
import { useMobileDetection } from '@/hooks/useMobileDetection';
import { useTrainingSession } from '@/hooks/useTrainingSession';

interface Drill {
  id: string;
  name: string;
  description?: string;
  duration_minutes?: number;
  difficulty_level?: 'beginner' | 'intermediate' | 'advanced';
  is_public?: boolean;
  tags?: DrillTag[];
}

interface DrillTag {
  id: string;
  name: string;
  color: string;
}

interface TrainingSessionDrill {
  id: string;
  drill_id?: string;
  custom_drill_name?: string;
  custom_drill_description?: string;
  sequence_order: number;
  duration_minutes: number;
  notes?: string;
  drill?: Drill;
  subgroups?: DrillSubgroup[];
  selected_tags?: DrillTag[];
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

interface TrainingPlanEditorProps {
  teamId: string;
  eventId: string;
  squadPlayers: SquadPlayer[];
  teamNumber: number;
  performanceCategoryId?: string;
  onSave?: () => Promise<void>;
}

export const TrainingPlanEditor: React.FC<TrainingPlanEditorProps> = ({
  teamId,
  eventId,
  squadPlayers,
  teamNumber,
  performanceCategoryId,
  onSave
}) => {
  const isMobile = useMobileDetection();
  const { saveTrainingSession, saving } = useTrainingSession();
  const [sessionDrills, setSessionDrills] = useState<TrainingSessionDrill[]>([]);
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [showDrillLibrary, setShowDrillLibrary] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [expandedDrills, setExpandedDrills] = useState<Set<string>>(new Set());

  // Load drill tags
  const { data: drillTags = [] } = useQuery({
    queryKey: ['drill-tags'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('drill_tags')
        .select('*')
        .order('name');
      
      if (error) throw error;
      return data || [];
    },
  });

  // Load drill library
  const { data: drillLibrary = [] } = useQuery({
    queryKey: ['drill-library', searchTerm, selectedTags],
    queryFn: async () => {
      let query = supabase
        .from('drills')
        .select(`
          *,
          drill_tag_assignments!inner(
            drill_tags(*)
          )
        `)
        .or('is_public.eq.true,created_by.eq.' + (await supabase.auth.getUser()).data.user?.id);

      if (searchTerm) {
        query = query.ilike('name', `%${searchTerm}%`);
      }

      const { data, error } = await query.order('name');
      
      if (error) throw error;
      
      // Filter by tags if selected
      let filtered = data || [];
      if (selectedTags.length > 0) {
        filtered = filtered.filter(drill => 
          drill.drill_tag_assignments?.some((assignment: any) =>
            selectedTags.includes(assignment.drill_tags.id)
          )
        );
      }

      return filtered.map((drill: any) => ({
        ...drill,
        tags: drill.drill_tag_assignments?.map((assignment: any) => assignment.drill_tags) || []
      }));
    },
  });

  // Load existing training session
  useEffect(() => {
    const loadTrainingSession = async () => {
      try {
        const { data: session } = await supabase
          .from('training_sessions')
          .select(`
            *,
            training_session_drills(
              *,
              drills(*),
              drill_subgroups(
                *,
                drill_subgroup_players(player_id)
              )
            ),
            training_session_equipment(*)
          `)
          .eq('event_id', eventId)
          .eq('team_id', teamId)
          .single();

        if (session) {
          setSessionDrills(session.training_session_drills?.map((drill: any) => ({
            ...drill,
            subgroups: drill.drill_subgroups?.map((subgroup: any) => ({
              ...subgroup,
              players: subgroup.drill_subgroup_players?.map((p: any) => p.player_id) || []
            })) || []
          })) || []);

          setEquipment(session.training_session_equipment?.map((eq: any) => ({
            id: eq.id,
            name: eq.custom_equipment_name || eq.equipment?.name || 'Unknown',
            quantity_needed: eq.quantity_needed,
            notes: eq.notes
          })) || []);
        }
      } catch (error) {
        console.error('Error loading training session:', error);
      }
    };

    loadTrainingSession();
  }, [eventId, teamId]);

  const addDrillFromLibrary = (drill: Drill) => {
    const newDrill: TrainingSessionDrill = {
      id: `temp-${Date.now()}`,
      drill_id: drill.id,
      sequence_order: sessionDrills.length + 1,
      duration_minutes: drill.duration_minutes || 10,
      drill,
      subgroups: []
    };

    setSessionDrills([...sessionDrills, newDrill]);
    setShowDrillLibrary(false);
    toast.success(`Added "${drill.name}" to training plan`);
  };

  const addCustomDrill = () => {
    const newDrill: TrainingSessionDrill = {
      id: `temp-${Date.now()}`,
      custom_drill_name: 'New Custom Drill',
      custom_drill_description: '',
      sequence_order: sessionDrills.length + 1,
      duration_minutes: 10,
      subgroups: [],
      selected_tags: []
    };

    setSessionDrills([...sessionDrills, newDrill]);
    setExpandedDrills(prev => new Set([...prev, newDrill.id]));
  };

  const updateDrill = (drillId: string, updates: Partial<TrainingSessionDrill>) => {
    setSessionDrills(drills => 
      drills.map(drill => 
        drill.id === drillId ? { ...drill, ...updates } : drill
      )
    );
  };

  const removeDrill = (drillId: string) => {
    setSessionDrills(drills => drills.filter(drill => drill.id !== drillId));
  };

  const addSubgroup = (drillId: string) => {
    const subgroupName = `Group ${(sessionDrills.find(d => d.id === drillId)?.subgroups?.length || 0) + 1}`;
    
    setSessionDrills(drills =>
      drills.map(drill =>
        drill.id === drillId
          ? {
              ...drill,
              subgroups: [
                ...(drill.subgroups || []),
                {
                  id: `temp-subgroup-${Date.now()}`,
                  subgroup_name: subgroupName,
                  players: []
                }
              ]
            }
          : drill
      )
    );
  };

  const updateSubgroup = (drillId: string, subgroupId: string, updates: Partial<DrillSubgroup>) => {
    setSessionDrills(drills =>
      drills.map(drill =>
        drill.id === drillId
          ? {
              ...drill,
              subgroups: drill.subgroups?.map(subgroup =>
                subgroup.id === subgroupId ? { ...subgroup, ...updates } : subgroup
              )
            }
          : drill
      )
    );
  };

  const addEquipment = () => {
    const newEquipment: Equipment = {
      id: `temp-${Date.now()}`,
      name: '',
      quantity_needed: 1,
      notes: ''
    };

    setEquipment([...equipment, newEquipment]);
  };

  const updateEquipment = (equipmentId: string, updates: Partial<Equipment>) => {
    setEquipment(equipment =>
      equipment.map(eq =>
        eq.id === equipmentId ? { ...eq, ...updates } : eq
      )
    );
  };

  const removeEquipment = (equipmentId: string) => {
    setEquipment(equipment => equipment.filter(eq => eq.id !== equipmentId));
  };

  const getTotalDuration = () => {
    return sessionDrills.reduce((total, drill) => total + drill.duration_minutes, 0);
  };

  const toggleDrillExpanded = (drillId: string) => {
    setExpandedDrills(prev => {
      const newSet = new Set(prev);
      if (newSet.has(drillId)) {
        newSet.delete(drillId);
      } else {
        newSet.add(drillId);
      }
      return newSet;
    });
  };

  const getPrimaryTagColor = (drill: TrainingSessionDrill) => {
    const tags = drill.drill?.tags || drill.selected_tags || [];
    return tags.length > 0 ? tags[0].color : '#94a3b8'; // Default gray
  };

  const handleSave = async () => {
    console.log('🚀 Training Plan Save Button Clicked!', { eventId, teamId, drillsCount: sessionDrills.length, equipmentCount: equipment.length });
    const success = await saveTrainingSession(eventId, teamId, sessionDrills, equipment);
    console.log('💾 Save result:', success);
    if (success && onSave) {
      await onSave();
    }
  };

  return (
    <div className="space-y-6">
      {/* Training Plan Overview */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Training Plan</h3>
          <p className="text-sm text-muted-foreground">
            {sessionDrills.length} drills • {getTotalDuration()} minutes total
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={handleSave} 
            disabled={saving} 
            size="sm"
            className="flex items-center gap-1"
          >
            {saving ? 'Saving...' : 'Save Plan'}
          </Button>
          <Dialog open={showDrillLibrary} onOpenChange={setShowDrillLibrary}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Search className="w-4 h-4 mr-1" />
                Drill Library
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[80vh]">
              <DialogHeader>
                <DialogTitle>Drill Library</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                {/* Search and filters */}
                <div className="flex gap-2">
                  <div className="flex-1">
                    <Input
                      placeholder="Search drills..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full"
                    />
                  </div>
                  <Select value={selectedTags.length > 0 ? selectedTags.join(',') : 'all'} onValueChange={(value) => setSelectedTags(value === 'all' ? [] : value.split(','))}>
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="Filter by tags" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All tags</SelectItem>
                      {drillTags.map((tag) => (
                        <SelectItem key={tag.id} value={tag.id}>
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: tag.color }} />
                            {tag.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Drill library list */}
                <ScrollArea className="h-[400px]">
                  <div className="space-y-2">
                    {drillLibrary.map((drill) => (
                      <Card key={drill.id} className="cursor-pointer hover:bg-muted/50" onClick={() => addDrillFromLibrary(drill)}>
                        <CardContent className="p-4">
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <h4 className="font-medium">{drill.name}</h4>
                              {drill.description && (
                                <p className="text-sm text-muted-foreground mt-1">{drill.description}</p>
                              )}
                              <div className="flex items-center gap-2 mt-2">
                                {drill.duration_minutes && (
                                  <Badge variant="outline" className="text-xs">
                                    <Clock className="w-3 h-3 mr-1" />
                                    {drill.duration_minutes}min
                                  </Badge>
                                )}
                                {drill.difficulty_level && (
                                  <Badge variant="outline" className="text-xs">
                                    {drill.difficulty_level}
                                  </Badge>
                                )}
                                {drill.tags?.map((tag) => (
                                  <Badge key={tag.id} variant="secondary" className="text-xs">
                                    <div className="w-2 h-2 rounded-full mr-1" style={{ backgroundColor: tag.color }} />
                                    {tag.name}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                            <Button size="sm" variant="ghost">
                              <Plus className="w-4 h-4" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            </DialogContent>
          </Dialog>

          <Button onClick={addCustomDrill} variant="outline" size="sm">
            <Plus className="w-4 h-4 mr-1" />
            Custom Drill
          </Button>
        </div>
      </div>

      {/* Drill Sequence - Grid Layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {sessionDrills.map((drill, index) => {
          const isExpanded = expandedDrills.has(drill.id);
          const primaryColor = getPrimaryTagColor(drill);
          const tags = drill.drill?.tags || drill.selected_tags || [];
          
          return (
            <Card 
              key={drill.id}
              className="relative overflow-hidden transition-all duration-200 hover:shadow-lg"
              style={{
                borderLeftColor: primaryColor,
                borderLeftWidth: '4px',
                boxShadow: `0 4px 6px -1px ${primaryColor}20, 0 2px 4px -1px ${primaryColor}10`
              }}
            >
              {/* Compact Header */}
              <CardHeader className="pb-2 space-y-2">
                <div className="flex items-center justify-between">
                  <Badge variant="outline" className="text-xs">#{index + 1}</Badge>
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    <span className="text-xs font-medium">{drill.duration_minutes}m</span>
                  </div>
                </div>
                
                <div className="space-y-1">
                  <h4 className="font-medium text-sm leading-tight">
                    {drill.drill?.name || drill.custom_drill_name || 'Untitled Drill'}
                  </h4>
                  
                  {/* Tags */}
                  {tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {tags.slice(0, 2).map((tag) => (
                        <Badge 
                          key={tag.id} 
                          variant="secondary" 
                          className="text-xs px-1.5 py-0.5"
                          style={{ backgroundColor: `${tag.color}20`, color: tag.color }}
                        >
                          <div className="w-1.5 h-1.5 rounded-full mr-1" style={{ backgroundColor: tag.color }} />
                          {tag.name}
                        </Badge>
                      ))}
                      {tags.length > 2 && (
                        <Badge variant="outline" className="text-xs px-1.5 py-0.5">
                          +{tags.length - 2}
                        </Badge>
                      )}
                    </div>
                  )}
                  
                  {/* Description Preview */}
                  {(drill.drill?.description || drill.custom_drill_description) && (
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {drill.drill?.description || drill.custom_drill_description}
                    </p>
                  )}
                  
                  {/* Player Count */}
                  {drill.subgroups && drill.subgroups.length > 0 && (
                    <div className="flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      <span className="text-xs text-muted-foreground">
                        {drill.subgroups.length} groups
                      </span>
                    </div>
                  )}
                </div>
              </CardHeader>

              {/* Action Buttons */}
              <div className="px-4 pb-3 flex items-center justify-between">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => toggleDrillExpanded(drill.id)}
                  className="h-6 px-2 text-xs"
                >
                  <Edit className="w-3 h-3 mr-1" />
                  {isExpanded ? 'Collapse' : 'Edit'}
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => removeDrill(drill.id)}
                  className="h-6 px-2 text-xs hover:text-destructive"
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>

              {/* Expanded Details */}
              {isExpanded && (
                <CardContent className="pt-0 space-y-3 border-t">
                  {/* Name Input for Custom Drills */}
                  {!drill.drill && (
                    <div>
                      <Label className="text-xs font-medium">Name</Label>
                      <Input
                        value={drill.custom_drill_name || ''}
                        onChange={(e) => updateDrill(drill.id, { custom_drill_name: e.target.value })}
                        className="h-8 text-sm"
                        placeholder="Drill name"
                      />
                    </div>
                  )}
                  
                  {/* Duration */}
                  <div>
                    <Label className="text-xs font-medium">Duration (minutes)</Label>
                    <Input
                      type="number"
                      value={drill.duration_minutes}
                      onChange={(e) => updateDrill(drill.id, { duration_minutes: parseInt(e.target.value) || 0 })}
                      className="h-8 text-sm"
                      min="1"
                    />
                  </div>

                  {/* Tag Selection for Custom Drills */}
                  {!drill.drill && (
                    <div>
                      <Label className="text-xs font-medium">Tags</Label>
                      <Select 
                        value={drill.selected_tags?.map(t => t.id).join(',') || 'none'} 
                        onValueChange={(value) => {
                          if (value === 'none') {
                            updateDrill(drill.id, { selected_tags: [] });
                          } else {
                            const selectedTagIds = value.split(',');
                            const selectedTagObjects = drillTags.filter(tag => selectedTagIds.includes(tag.id));
                            updateDrill(drill.id, { selected_tags: selectedTagObjects });
                          }
                        }}
                      >
                        <SelectTrigger className="h-8 text-sm">
                          <SelectValue placeholder="Select tags" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">No tags</SelectItem>
                          {drillTags.map((tag) => (
                            <SelectItem key={tag.id} value={tag.id}>
                              <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: tag.color }} />
                                {tag.name}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {/* Description for Custom Drills */}
                  {!drill.drill && (
                    <div>
                      <Label className="text-xs font-medium">Description</Label>
                      <Textarea
                        placeholder="Drill description..."
                        value={drill.custom_drill_description || ''}
                        onChange={(e) => updateDrill(drill.id, { custom_drill_description: e.target.value })}
                        rows={2}
                        className="text-sm"
                      />
                    </div>
                  )}

                  {/* Notes */}
                  <div>
                    <Label className="text-xs font-medium">Notes</Label>
                    <Textarea
                      placeholder="Additional notes..."
                      value={drill.notes || ''}
                      onChange={(e) => updateDrill(drill.id, { notes: e.target.value })}
                      rows={2}
                      className="text-sm"
                    />
                  </div>

                  {/* Subgroups */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <Label className="text-xs font-medium">Player Groups</Label>
                      <Button variant="outline" size="sm" onClick={() => addSubgroup(drill.id)} className="h-6 px-2 text-xs">
                        <Plus className="w-3 h-3 mr-1" />
                        Add Group
                      </Button>
                    </div>
                    
                    {drill.subgroups && drill.subgroups.length > 0 ? (
                      <div className="space-y-2">
                        {drill.subgroups.map((subgroup) => (
                          <div key={subgroup.id} className="border rounded-lg p-2">
                            <div className="flex items-center gap-2 mb-2">
                              <Input
                                value={subgroup.subgroup_name}
                                onChange={(e) => updateSubgroup(drill.id, subgroup.id, { subgroup_name: e.target.value })}
                                className="flex-1 h-6 text-xs"
                                placeholder="Group name"
                              />
                              <Badge variant="outline" className="text-xs">
                                {subgroup.players?.length || 0} players
                              </Badge>
                            </div>
                            
                            {/* Player selection */}
                            <div className="flex flex-wrap gap-1">
                              {squadPlayers.map((player) => (
                                <Badge
                                  key={player.id}
                                  variant={subgroup.players?.includes(player.id) ? "default" : "outline"}
                                  className="cursor-pointer text-xs"
                                  onClick={() => {
                                    const isSelected = subgroup.players?.includes(player.id);
                                    const newPlayers = isSelected
                                      ? subgroup.players?.filter(id => id !== player.id) || []
                                      : [...(subgroup.players || []), player.id];
                                    updateSubgroup(drill.id, subgroup.id, { players: newPlayers });
                                  }}
                                >
                                  {player.name}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground">No groups created. All squad players will participate together.</p>
                    )}
                  </div>
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>

      {sessionDrills.length === 0 && (
        <Card className="text-center py-8">
          <CardContent>
            <Play className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-semibold mb-2">No Drills Added</h3>
            <p className="text-muted-foreground mb-4">
              Start building your training plan by adding drills from the library or creating custom drills.
            </p>
            <div className="flex justify-center gap-2">
              <Button onClick={() => setShowDrillLibrary(true)} variant="outline">
                Browse Library
              </Button>
              <Button onClick={addCustomDrill}>
                Add Custom Drill
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Equipment */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Equipment</CardTitle>
            <Button variant="outline" size="sm" onClick={addEquipment}>
              <Plus className="w-4 h-4 mr-1" />
              Add Equipment
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {equipment.length > 0 ? (
            <div className="space-y-3">
              {equipment.map((item) => (
                <div key={item.id} className="flex items-center gap-3 p-3 border rounded-lg">
                  <Input
                    placeholder="Equipment name"
                    value={item.name}
                    onChange={(e) => updateEquipment(item.id, { name: e.target.value })}
                    className="flex-1"
                  />
                  <div className="flex items-center gap-1">
                    <span className="text-sm">Qty:</span>
                    <Input
                      type="number"
                      value={item.quantity_needed}
                      onChange={(e) => updateEquipment(item.id, { quantity_needed: parseInt(e.target.value) || 1 })}
                      className="w-16"
                      min="1"
                    />
                  </div>
                  <Input
                    placeholder="Notes"
                    value={item.notes || ''}
                    onChange={(e) => updateEquipment(item.id, { notes: e.target.value })}
                    className="flex-1"
                  />
                  <Button variant="ghost" size="sm" onClick={() => removeEquipment(item.id)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-4">
              No equipment added. Click "Add Equipment" to specify what's needed for training.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};