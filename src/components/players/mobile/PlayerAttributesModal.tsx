import { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Player } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Plus, Trash2 } from 'lucide-react';

interface PlayerAttributesModalProps {
  player: Player;
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
}

interface Attribute {
  id: string;
  name: string;
  value: number;
  category: string;
}

export const PlayerAttributesModal: React.FC<PlayerAttributesModalProps> = ({
  player,
  isOpen,
  onClose,
  onSave
}) => {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [attributes, setAttributes] = useState<Attribute[]>(
    (player.attributes as unknown as Attribute[]) || []
  );
  const [newAttribute, setNewAttribute] = useState({
    name: '',
    value: 0,
    category: 'Technical'
  });

  const categories = ['Technical', 'Physical', 'Mental', 'Tactical'];

  const handleAddAttribute = () => {
    if (!newAttribute.name.trim()) {
      toast({
        title: 'Error',
        description: 'Attribute name is required',
        variant: 'destructive'
      });
      return;
    }

    const attribute: Attribute = {
      id: Date.now().toString(),
      name: newAttribute.name.trim(),
      value: Math.max(0, Math.min(100, newAttribute.value)),
      category: newAttribute.category
    };

    setAttributes(prev => [...prev, attribute]);
    setNewAttribute({ name: '', value: 0, category: 'Technical' });
  };

  const handleRemoveAttribute = (id: string) => {
    setAttributes(prev => prev.filter(attr => attr.id !== id));
  };

  const handleUpdateAttribute = (id: string, field: 'name' | 'value' | 'category', value: any) => {
    setAttributes(prev => prev.map(attr => 
      attr.id === id 
        ? { ...attr, [field]: field === 'value' ? Math.max(0, Math.min(100, parseInt(value) || 0)) : value }
        : attr
    ));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('players')
        .update({
          attributes: attributes as any
        })
        .eq('id', player.id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Player attributes updated successfully'
      });
      
      onSave();
      onClose();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update attributes',
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  const groupedAttributes = categories.map(category => ({
    category,
    attributes: attributes.filter(attr => attr.category === category)
  }));

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="bottom" className="h-[90vh]">
        <SheetHeader className="border-b pb-4">
          <SheetTitle>Player Attributes</SheetTitle>
          <p className="text-sm text-muted-foreground">{player.name}</p>
        </SheetHeader>
        
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Add New Attribute */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Add New Attribute</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="attrName">Name</Label>
                  <Input
                    id="attrName"
                    value={newAttribute.name}
                    onChange={(e) => setNewAttribute(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g., Passing Accuracy"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="attrValue">Rating (0-100)</Label>
                  <Input
                    id="attrValue"
                    type="number"
                    min="0"
                    max="100"
                    value={newAttribute.value}
                    onChange={(e) => setNewAttribute(prev => ({ ...prev, value: parseInt(e.target.value) || 0 }))}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="attrCategory">Category</Label>
                <select
                  id="attrCategory"
                  value={newAttribute.category}
                  onChange={(e) => setNewAttribute(prev => ({ ...prev, category: e.target.value }))}
                  className="w-full p-2 border rounded-md"
                >
                  {categories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
              <Button onClick={handleAddAttribute} className="w-full">
                <Plus className="h-4 w-4 mr-2" />
                Add Attribute
              </Button>
            </CardContent>
          </Card>

          {/* Existing Attributes */}
          {groupedAttributes.map(({ category, attributes: categoryAttributes }) => (
            categoryAttributes.length > 0 && (
              <Card key={category}>
                <CardHeader>
                  <CardTitle className="text-sm">{category} Attributes</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {categoryAttributes.map(attr => (
                      <div key={attr.id} className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                        <div className="flex-1">
                          <Input
                            value={attr.name}
                            onChange={(e) => handleUpdateAttribute(attr.id, 'name', e.target.value)}
                            className="text-sm"
                          />
                        </div>
                        <div className="w-20">
                          <Input
                            type="number"
                            min="0"
                            max="100"
                            value={attr.value}
                            onChange={(e) => handleUpdateAttribute(attr.id, 'value', e.target.value)}
                            className="text-sm text-center"
                          />
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveAttribute(attr.id)}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )
          ))}

          {attributes.length === 0 && (
            <Card>
              <CardContent className="py-8 text-center">
                <p className="text-muted-foreground">No attributes added yet</p>
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
