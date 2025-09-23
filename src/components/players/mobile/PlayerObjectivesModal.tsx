import { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Player, PlayerObjective } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuthorization } from '@/contexts/AuthorizationContext';
import { format } from 'date-fns';
import { Plus, Trash2, Check, ArrowUpRight, Circle, Target, Star, Lock, X } from 'lucide-react';

interface PlayerObjectivesModalProps {
  player: Player;
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
}

export const PlayerObjectivesModal: React.FC<PlayerObjectivesModalProps> = ({
  player,
  isOpen,
  onClose,
  onSave
}) => {
  const { toast } = useToast();
  const { isGlobalAdmin, isTeamManager, hasPermission } = useAuthorization();
  const [saving, setSaving] = useState(false);
  const [objectives, setObjectives] = useState<PlayerObjective[]>(player?.objectives || []);
  const [showAddForm, setShowAddForm] = useState(false);
  
  const canEdit = isGlobalAdmin || isTeamManager(player.team_id) || hasPermission({ resource: 'players', action: 'manage', resourceId: player.team_id });

  const [newObjective, setNewObjective] = useState<Partial<PlayerObjective>>({
    title: '',
    description: '',
    difficultyRating: 3,
    reviewDate: format(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'),
    status: 'ongoing',
    createdAt: new Date().toISOString(),
    createdBy: 'Current User'
  });

  const handleAddObjective = () => {
    const id = `obj-${Date.now()}`;
    setObjectives([
      ...objectives,
      {
        id,
        title: newObjective.title || '',
        description: newObjective.description || '',
        difficultyRating: newObjective.difficultyRating || 3,
        reviewDate: newObjective.reviewDate || '',
        status: newObjective.status as 'ongoing' | 'improving' | 'complete',
        createdAt: newObjective.createdAt || new Date().toISOString(),
        createdBy: newObjective.createdBy || 'Current User'
      }
    ]);
    
    setNewObjective({
      title: '',
      description: '',
      difficultyRating: 3,
      reviewDate: format(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'),
      status: 'ongoing',
      createdAt: new Date().toISOString(),
      createdBy: 'Current User'
    });
    setShowAddForm(false);
  };

  const handleRemoveObjective = (id: string) => {
    setObjectives(objectives.filter(obj => obj.id !== id));
  };

  const handleStatusChange = (id: string, status: 'ongoing' | 'improving' | 'complete') => {
    setObjectives(objectives.map(obj => 
      obj.id === id ? { ...obj, status } : obj
    ));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('players')
        .update({
          objectives: objectives as any
        })
        .eq('id', player.id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Player objectives updated successfully'
      });
      
      onSave();
      onClose();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update objectives',
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ongoing':
        return <Circle className="h-4 w-4 text-blue-500" />;
      case 'improving':
        return <ArrowUpRight className="h-4 w-4 text-yellow-500" />;
      case 'complete':
        return <Check className="h-4 w-4 text-green-500" />;
      default:
        return <Circle className="h-4 w-4" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ongoing':
        return <Badge variant="secondary">Ongoing</Badge>;
      case 'improving':
        return <Badge className="bg-yellow-500">Improving</Badge>;
      case 'complete':
        return <Badge className="bg-green-500">Complete</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const getDifficultyStars = (rating: number) => {
    return '★'.repeat(rating) + '☆'.repeat(5 - rating);
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="bottom" className="h-[90vh] flex flex-col">
        <SheetHeader className="border-b pb-4">
          <SheetTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Player Objectives - {player.name}
            {!canEdit && <Lock className="h-4 w-4 text-muted-foreground" />}
          </SheetTitle>
        </SheetHeader>
        
        <ScrollArea className="flex-1 p-6">
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="font-medium flex items-center gap-2">
                <Target className="h-4 w-4" />
                Objectives
              </h3>
              {!showAddForm && canEdit && (
                <Button 
                  onClick={() => setShowAddForm(true)}
                  size="sm"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add
                </Button>
              )}
            </div>

            {showAddForm && (
              <Card>
                <CardContent className="pt-6 space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="title">Objective Title</Label>
                    <Input
                      id="title"
                      value={newObjective.title}
                      onChange={(e) => setNewObjective({ ...newObjective, title: e.target.value })}
                      placeholder="e.g. Improve Passing Accuracy"
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={newObjective.description}
                      onChange={(e) => setNewObjective({ ...newObjective, description: e.target.value })}
                      placeholder="Describe the objective and how it will be achieved"
                      rows={3}
                      required
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="difficultyRating">Difficulty (1-5)</Label>
                      <Select 
                        value={newObjective.difficultyRating?.toString()}
                        onValueChange={(value) => setNewObjective({ ...newObjective, difficultyRating: parseInt(value) })}
                      >
                        <SelectTrigger id="difficultyRating">
                          <SelectValue placeholder="Select difficulty" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">1 - Very Easy</SelectItem>
                          <SelectItem value="2">2 - Easy</SelectItem>
                          <SelectItem value="3">3 - Moderate</SelectItem>
                          <SelectItem value="4">4 - Difficult</SelectItem>
                          <SelectItem value="5">5 - Very Difficult</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="reviewDate">Review Date</Label>
                      <Input
                        id="reviewDate"
                        type="date"
                        value={newObjective.reviewDate}
                        onChange={(e) => setNewObjective({ ...newObjective, reviewDate: e.target.value })}
                        required
                      />
                    </div>
                  </div>
                </CardContent>
                
                <CardFooter className="flex justify-end space-x-2">
                  <Button 
                    variant="outline" 
                    onClick={() => setShowAddForm(false)}
                  >
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleAddObjective}
                    disabled={!newObjective.title || !newObjective.description || !newObjective.reviewDate}
                  >
                    Add Objective
                  </Button>
                </CardFooter>
              </Card>
            )}

            {objectives.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center">
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <Target className="h-8 w-8" />
                    <p>No objectives have been set for this player yet</p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {objectives.map((objective) => (
                  <Card key={objective.id}>
                    <CardContent className="relative pt-6">
                       {canEdit && (
                         <div className="absolute top-3 right-3">
                           <Button
                             size="sm"
                             variant="ghost"
                             onClick={() => handleRemoveObjective(objective.id)}
                             className="h-8 w-8 p-0 text-red-500 hover:text-red-700"
                           >
                             <Trash2 className="h-4 w-4" />
                           </Button>
                         </div>
                       )}
                      
                      <div className="space-y-3 pr-8">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-semibold">{objective.title}</h4>
                          <div className="flex items-center gap-2">
                            {getStatusBadge(objective.status)}
                            {canEdit && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleRemoveObjective(objective.id)}
                                className="h-6 w-6 p-0 hover:bg-destructive hover:text-destructive-foreground"
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                        </div>
                        
                        <p className="text-sm text-muted-foreground">{objective.description}</p>
                        
                        <div className="flex justify-between text-sm">
                          <div className="flex items-center gap-1">
                            <Star className="h-3 w-3 text-yellow-500" />
                            <span className="text-muted-foreground">Difficulty:</span>
                            <span className="text-yellow-500">{getDifficultyStars(objective.difficultyRating)}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Review:</span>{' '}
                            {format(new Date(objective.reviewDate), 'dd MMM yyyy')}
                          </div>
                        </div>
                        
                        <div className="flex justify-between items-center text-sm">
                          <div>
                            <span className="text-muted-foreground">Created:</span>{' '}
                            {format(new Date(objective.createdAt), 'dd MMM yyyy')} by {objective.createdBy}
                          </div>
                          
                          <Select 
                            value={objective.status}
                            onValueChange={(value) => handleStatusChange(
                              objective.id, 
                              value as 'ongoing' | 'improving' | 'complete'
                            )}
                            disabled={!canEdit}
                          >
                            <SelectTrigger className="h-8 w-32">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="ongoing">
                                <div className="flex items-center gap-2">
                                  <Circle className="h-4 w-4 text-blue-500" />
                                  <span>Ongoing</span>
                                </div>
                              </SelectItem>
                              <SelectItem value="improving">
                                <div className="flex items-center gap-2">
                                  <ArrowUpRight className="h-4 w-4 text-yellow-500" />
                                  <span>Improving</span>
                                </div>
                              </SelectItem>
                              <SelectItem value="complete">
                                <div className="flex items-center gap-2">
                                  <Check className="h-4 w-4 text-green-500" />
                                  <span>Complete</span>
                                </div>
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </ScrollArea>

        <div className="border-t p-4 flex gap-3">
          <Button variant="outline" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving || !canEdit} className="flex-1">
            {saving ? 'Saving...' : canEdit ? 'Save Changes' : 'View Only'}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
};
