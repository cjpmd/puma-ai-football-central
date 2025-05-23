
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Player, PlayerObjective } from '@/types';
import { PlusCircle, Trash, Check, ArrowUpRight, Circle } from 'lucide-react';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';

interface PlayerObjectivesModalProps {
  player: Player;
  isOpen: boolean;
  onClose: () => void;
  onSave: (objectives: PlayerObjective[]) => void;
}

export const PlayerObjectivesModal: React.FC<PlayerObjectivesModalProps> = ({
  player,
  isOpen,
  onClose,
  onSave
}) => {
  const [objectives, setObjectives] = useState<PlayerObjective[]>(player.objectives || []);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newObjective, setNewObjective] = useState<Partial<PlayerObjective>>({
    title: '',
    description: '',
    difficultyRating: 3,
    reviewDate: format(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'), // Default 30 days
    status: 'ongoing',
    createdAt: new Date().toISOString(),
    createdBy: 'Current User' // This would be replaced with actual user name
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
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Player Objectives - {player.name}
          </DialogTitle>
        </DialogHeader>
        
        <div className="py-4 space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium">Objectives</h3>
            {!showAddForm && (
              <Button 
                onClick={() => setShowAddForm(true)}
                className="bg-puma-blue-500 hover:bg-puma-blue-600"
              >
                <PlusCircle className="mr-2 h-4 w-4" />
                Add Objective
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
                  className="bg-puma-blue-500 hover:bg-puma-blue-600"
                >
                  Add Objective
                </Button>
              </CardFooter>
            </Card>
          )}

          {objectives.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No objectives have been set for this player yet.
            </div>
          ) : (
            <div className="space-y-4">
              {objectives.map((objective) => (
                <Card key={objective.id}>
                  <CardContent className="pt-6">
                    <div className="absolute top-3 right-3 flex space-x-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleRemoveObjective(objective.id)}
                        className="h-8 w-8 p-0 text-red-500 hover:text-red-700"
                      >
                        <Trash className="h-4 w-4" />
                      </Button>
                    </div>
                    
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="font-semibold text-lg">{objective.title}</h4>
                        {getStatusBadge(objective.status)}
                      </div>
                      
                      <p className="text-sm">{objective.description}</p>
                      
                      <div className="flex justify-between text-sm">
                        <div>
                          <span className="text-muted-foreground">Difficulty:</span>{' '}
                          <span className="text-yellow-500">{getDifficultyStars(objective.difficultyRating)}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Review:</span>{' '}
                          {format(new Date(objective.reviewDate), 'dd MMM yyyy')}
                        </div>
                      </div>
                      
                      <div className="flex justify-between text-sm">
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
                        >
                          <SelectTrigger className="h-8 w-36">
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

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={() => onSave(objectives)} className="bg-puma-blue-500 hover:bg-puma-blue-600">
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
