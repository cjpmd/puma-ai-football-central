import { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Player } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Plus, Trash2, CheckCircle, Circle } from 'lucide-react';

interface PlayerObjectivesModalProps {
  player: Player;
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
}

interface Objective {
  id: string;
  title: string;
  description: string;
  category: string;
  priority: 'Low' | 'Medium' | 'High';
  status: 'Not Started' | 'In Progress' | 'Completed';
  targetDate?: string;
  createdAt: string;
}

export const PlayerObjectivesModal: React.FC<PlayerObjectivesModalProps> = ({
  player,
  isOpen,
  onClose,
  onSave
}) => {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [objectives, setObjectives] = useState<Objective[]>(
    (player.objectives as unknown as Objective[]) || []
  );
  const [newObjective, setNewObjective] = useState({
    title: '',
    description: '',
    category: 'Technical',
    priority: 'Medium' as const,
    targetDate: ''
  });

  const categories = ['Technical', 'Physical', 'Mental', 'Tactical', 'Personal'];
  const priorities = ['Low', 'Medium', 'High'] as const;
  const statuses = ['Not Started', 'In Progress', 'Completed'] as const;

  const handleAddObjective = () => {
    if (!newObjective.title.trim()) {
      toast({
        title: 'Error',
        description: 'Objective title is required',
        variant: 'destructive'
      });
      return;
    }

    const objective: Objective = {
      id: Date.now().toString(),
      title: newObjective.title.trim(),
      description: newObjective.description.trim(),
      category: newObjective.category,
      priority: newObjective.priority,
      status: 'Not Started',
      targetDate: newObjective.targetDate || undefined,
      createdAt: new Date().toISOString()
    };

    setObjectives(prev => [...prev, objective]);
    setNewObjective({ title: '', description: '', category: 'Technical', priority: 'Medium', targetDate: '' });
  };

  const handleRemoveObjective = (id: string) => {
    setObjectives(prev => prev.filter(obj => obj.id !== id));
  };

  const handleUpdateObjective = (id: string, field: keyof Objective, value: any) => {
    setObjectives(prev => prev.map(obj => 
      obj.id === id ? { ...obj, [field]: value } : obj
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

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'High': return 'bg-red-100 text-red-800';
      case 'Medium': return 'bg-yellow-100 text-yellow-800';
      case 'Low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Completed': return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'In Progress': return <Circle className="h-4 w-4 text-yellow-600" />;
      default: return <Circle className="h-4 w-4 text-gray-400" />;
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="bottom" className="h-[90vh]">
        <SheetHeader className="border-b pb-4">
          <SheetTitle>Player Objectives</SheetTitle>
          <p className="text-sm text-muted-foreground">{player.name}</p>
        </SheetHeader>
        
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Add New Objective */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Add New Objective</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="objTitle">Title</Label>
                <Input
                  id="objTitle"
                  value={newObjective.title}
                  onChange={(e) => setNewObjective(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="e.g., Improve passing accuracy"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="objDescription">Description</Label>
                <Textarea
                  id="objDescription"
                  value={newObjective.description}
                  onChange={(e) => setNewObjective(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Detailed description of the objective"
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="objCategory">Category</Label>
                  <select
                    id="objCategory"
                    value={newObjective.category}
                    onChange={(e) => setNewObjective(prev => ({ ...prev, category: e.target.value }))}
                    className="w-full p-2 border rounded-md"
                  >
                    {categories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="objPriority">Priority</Label>
                  <select
                    id="objPriority"
                    value={newObjective.priority}
                    onChange={(e) => setNewObjective(prev => ({ ...prev, priority: e.target.value as any }))}
                    className="w-full p-2 border rounded-md"
                  >
                    {priorities.map(priority => (
                      <option key={priority} value={priority}>{priority}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="objTargetDate">Target Date (Optional)</Label>
                <Input
                  id="objTargetDate"
                  type="date"
                  value={newObjective.targetDate}
                  onChange={(e) => setNewObjective(prev => ({ ...prev, targetDate: e.target.value }))}
                />
              </div>
              <Button onClick={handleAddObjective} className="w-full">
                <Plus className="h-4 w-4 mr-2" />
                Add Objective
              </Button>
            </CardContent>
          </Card>

          {/* Existing Objectives */}
          {objectives.length > 0 ? (
            <div className="space-y-4">
              {objectives.map(obj => (
                <Card key={obj.id}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(obj.status)}
                        <CardTitle className="text-sm">{obj.title}</CardTitle>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveObjective(obj.id)}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {obj.description && (
                      <p className="text-sm text-muted-foreground">{obj.description}</p>
                    )}
                    
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{obj.category}</Badge>
                      <Badge className={getPriorityColor(obj.priority)}>{obj.priority}</Badge>
                    </div>

                    <div className="space-y-2">
                      <Label>Status</Label>
                      <select
                        value={obj.status}
                        onChange={(e) => handleUpdateObjective(obj.id, 'status', e.target.value)}
                        className="w-full p-2 border rounded-md text-sm"
                      >
                        {statuses.map(status => (
                          <option key={status} value={status}>{status}</option>
                        ))}
                      </select>
                    </div>

                    {obj.targetDate && (
                      <div className="text-xs text-muted-foreground">
                        Target: {new Date(obj.targetDate).toLocaleDateString()}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="py-8 text-center">
                <p className="text-muted-foreground">No objectives set yet</p>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="border-t p-6 flex gap-3">
          <Button variant="outline" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving} className="flex-1">
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
};
