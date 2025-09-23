import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { playStylesService, DEFAULT_PLAY_STYLES, type PlayStyle } from '@/types/playStyles';
import { Plus, Trash2, Edit2, Palette } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export const PlayStylesManager: React.FC = () => {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [playStyles, setPlayStyles] = useState<PlayStyle[]>(playStylesService.getAllPlayStyles());
  const [editingStyle, setEditingStyle] = useState<PlayStyle | null>(null);
  const [newStyle, setNewStyle] = useState<Partial<PlayStyle>>({
    value: '',
    label: '',
    icon: '',
    category: 'attacker'
  });

  const handleAddStyle = () => {
    if (!newStyle.value || !newStyle.label || !newStyle.icon) {
      toast({
        title: 'Error',
        description: 'Please fill in all fields',
        variant: 'destructive'
      });
      return;
    }

    const style: PlayStyle = {
      value: newStyle.value,
      label: newStyle.label,
      icon: newStyle.icon,
      category: newStyle.category as 'attacker' | 'midfielder' | 'defender' | 'goalkeeper'
    };

    playStylesService.addCustomPlayStyle(style);
    setPlayStyles(playStylesService.getAllPlayStyles());
    setNewStyle({ value: '', label: '', icon: '', category: 'attacker' });
    
    toast({
      title: 'Success',
      description: 'Play style added successfully'
    });
  };

  const handleUpdateStyle = () => {
    if (!editingStyle) return;

    playStylesService.updateCustomPlayStyle(editingStyle.value, editingStyle);
    setPlayStyles(playStylesService.getAllPlayStyles());
    setEditingStyle(null);
    
    toast({
      title: 'Success',
      description: 'Play style updated successfully'
    });
  };

  const handleDeleteStyle = (value: string) => {
    // Prevent deletion of default styles
    if (DEFAULT_PLAY_STYLES.find(style => style.value === value)) {
      toast({
        title: 'Error',
        description: 'Cannot delete default play styles',
        variant: 'destructive'
      });
      return;
    }

    playStylesService.removeCustomPlayStyle(value);
    setPlayStyles(playStylesService.getAllPlayStyles());
    
    toast({
      title: 'Success',
      description: 'Play style deleted successfully'
    });
  };

  const isDefaultStyle = (value: string) => {
    return DEFAULT_PLAY_STYLES.find(style => style.value === value) !== undefined;
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="flex items-center gap-2">
          <Palette className="h-4 w-4" />
          Manage Play Styles
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            Play Styles Manager
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Add New Style */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Add New Play Style
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="value">Value (unique identifier)</Label>
                  <Input
                    id="value"
                    value={newStyle.value}
                    onChange={(e) => setNewStyle({ ...newStyle, value: e.target.value.toLowerCase().replace(/\s+/g, '_') })}
                    placeholder="e.g., super_striker"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="label">Display Label</Label>
                  <Input
                    id="label"
                    value={newStyle.label}
                    onChange={(e) => setNewStyle({ ...newStyle, label: e.target.value })}
                    placeholder="e.g., Super Striker"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="icon">Icon (emoji)</Label>
                  <Input
                    id="icon"
                    value={newStyle.icon}
                    onChange={(e) => setNewStyle({ ...newStyle, icon: e.target.value })}
                    placeholder="e.g., ⚽"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <Select 
                    value={newStyle.category} 
                    onValueChange={(value) => setNewStyle({ ...newStyle, category: value as any })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="attacker">Attacker</SelectItem>
                      <SelectItem value="midfielder">Midfielder</SelectItem>
                      <SelectItem value="defender">Defender</SelectItem>
                      <SelectItem value="goalkeeper">Goalkeeper</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button onClick={handleAddStyle} className="w-full">
                <Plus className="h-4 w-4 mr-2" />
                Add Play Style
              </Button>
            </CardContent>
          </Card>

          {/* Existing Styles */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Existing Play Styles</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {playStyles.map((style) => (
                  <div key={style.value} className="border rounded-lg p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{style.icon}</span>
                        <span className="font-medium">{style.label}</span>
                      </div>
                      {!isDefaultStyle(style.value) && (
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setEditingStyle(style)}
                            className="h-6 w-6 p-0"
                          >
                            <Edit2 className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDeleteStyle(style.value)}
                            className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {style.category}
                      </Badge>
                      {isDefaultStyle(style.value) && (
                        <Badge variant="secondary" className="text-xs">
                          Default
                        </Badge>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {style.value}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Edit Style Dialog */}
        {editingStyle && (
          <Dialog open={true} onOpenChange={() => setEditingStyle(null)}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Edit Play Style</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-label">Display Label</Label>
                  <Input
                    id="edit-label"
                    value={editingStyle.label}
                    onChange={(e) => setEditingStyle({ ...editingStyle, label: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-icon">Icon (emoji)</Label>
                  <Input
                    id="edit-icon"
                    value={editingStyle.icon}
                    onChange={(e) => setEditingStyle({ ...editingStyle, icon: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-category">Category</Label>
                  <Select 
                    value={editingStyle.category} 
                    onValueChange={(value) => setEditingStyle({ ...editingStyle, category: value as any })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="attacker">Attacker</SelectItem>
                      <SelectItem value="midfielder">Midfielder</SelectItem>
                      <SelectItem value="defender">Defender</SelectItem>
                      <SelectItem value="goalkeeper">Goalkeeper</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex gap-2">
                  <Button onClick={() => setEditingStyle(null)} variant="outline" className="flex-1">
                    Cancel
                  </Button>
                  <Button onClick={handleUpdateStyle} className="flex-1">
                    Update
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </DialogContent>
    </Dialog>
  );
};
