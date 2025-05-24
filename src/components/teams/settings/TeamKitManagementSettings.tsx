
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Package, Shirt, Settings, Plus, Trash2, Upload, Image } from 'lucide-react';
import { Team } from '@/types/index';
import { KitManagementModal } from '../KitManagementModal';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface TeamKitManagementSettingsProps {
  team: Team;
  onUpdate: (teamData: Partial<Team>) => void;
}

interface KitItem {
  id: string;
  name: string;
  category: string;
  available_sizes: string[];
}

interface ClothingSize {
  id: string;
  size_name: string;
  category: string;
  display_order: number;
}

export const TeamKitManagementSettings: React.FC<TeamKitManagementSettingsProps> = ({
  team,
  onUpdate
}) => {
  const [isKitModalOpen, setIsKitModalOpen] = useState(false);
  const [kitItems, setKitItems] = useState<KitItem[]>([]);
  const [clothingSizes, setClothingSizes] = useState<ClothingSize[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddItemDialogOpen, setIsAddItemDialogOpen] = useState(false);
  const [isSizeDialogOpen, setIsSizeDialogOpen] = useState(false);
  const [newItem, setNewItem] = useState({ name: '', category: 'clothing' });
  const [newSize, setNewSize] = useState({ size_name: '', category: 'clothing' });
  const { toast } = useToast();

  useEffect(() => {
    loadKitConfiguration();
  }, [team.id]);

  const loadKitConfiguration = async () => {
    try {
      setLoading(true);

      // Load kit items
      const { data: itemsData, error: itemsError } = await supabase
        .from('team_kit_items')
        .select('*')
        .eq('team_id', team.id)
        .order('name');

      if (itemsError) throw itemsError;

      // Load clothing sizes
      const { data: sizesData, error: sizesError } = await supabase
        .from('team_clothing_sizes')
        .select('*')
        .eq('team_id', team.id)
        .order('category, display_order');

      if (sizesError) throw sizesError;

      setKitItems(itemsData || []);
      setClothingSizes(sizesData || []);
    } catch (error: any) {
      console.error('Error loading kit configuration:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to load kit configuration',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddKitItem = async () => {
    if (!newItem.name.trim()) return;

    try {
      const { error } = await supabase
        .from('team_kit_items')
        .insert([{
          team_id: team.id,
          name: newItem.name,
          category: newItem.category,
          available_sizes: []
        }]);

      if (error) throw error;

      setNewItem({ name: '', category: 'clothing' });
      setIsAddItemDialogOpen(false);
      loadKitConfiguration();
      
      toast({
        title: 'Success',
        description: 'Kit item added successfully',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to add kit item',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteKitItem = async (itemId: string) => {
    try {
      const { error } = await supabase
        .from('team_kit_items')
        .delete()
        .eq('id', itemId);

      if (error) throw error;

      loadKitConfiguration();
      
      toast({
        title: 'Success',
        description: 'Kit item deleted successfully',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete kit item',
        variant: 'destructive',
      });
    }
  };

  const handleAddSize = async () => {
    if (!newSize.size_name.trim()) return;

    try {
      const maxOrder = Math.max(...clothingSizes.filter(s => s.category === newSize.category).map(s => s.display_order), -1);
      
      const { error } = await supabase
        .from('team_clothing_sizes')
        .insert([{
          team_id: team.id,
          size_name: newSize.size_name,
          category: newSize.category,
          display_order: maxOrder + 1
        }]);

      if (error) throw error;

      setNewSize({ size_name: '', category: 'clothing' });
      setIsSizeDialogOpen(false);
      loadKitConfiguration();
      
      toast({
        title: 'Success',
        description: 'Size added successfully',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to add size',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteSize = async (sizeId: string) => {
    try {
      const { error } = await supabase
        .from('team_clothing_sizes')
        .delete()
        .eq('id', sizeId);

      if (error) throw error;

      loadKitConfiguration();
      
      toast({
        title: 'Success',
        description: 'Size deleted successfully',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete size',
        variant: 'destructive',
      });
    }
  };

  const handleKitIconUpdate = (iconType: string, iconData: string) => {
    const updatedKitIcons = {
      ...team.kitIcons,
      [iconType]: iconData
    };
    onUpdate({ kitIcons: updatedKitIcons });
  };

  if (loading) {
    return <div className="text-center py-8">Loading kit configuration...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold">Kit Management</h3>
        <p className="text-sm text-muted-foreground">
          Manage kit items, sizes, icons, and track kit issued to players
        </p>
      </div>

      <Tabs defaultValue="issue" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="issue">Issue Kit</TabsTrigger>
          <TabsTrigger value="items">Kit Items</TabsTrigger>
          <TabsTrigger value="sizes">Sizes</TabsTrigger>
          <TabsTrigger value="icons">Kit Icons</TabsTrigger>
        </TabsList>

        <TabsContent value="issue" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Kit Issue Tracking
              </CardTitle>
              <CardDescription>
                Track which kit items have been issued to players and when
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                onClick={() => setIsKitModalOpen(true)}
                className="bg-puma-blue-500 hover:bg-puma-blue-600"
              >
                <Package className="h-4 w-4 mr-2" />
                Manage Kit Issues
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="items" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Kit Items Configuration</CardTitle>
                  <CardDescription>
                    Manage the types of kit items available for your team
                  </CardDescription>
                </div>
                <Button onClick={() => setIsAddItemDialogOpen(true)} size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Item
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {kitItems.map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <h4 className="font-medium">{item.name}</h4>
                      <p className="text-sm text-muted-foreground capitalize">{item.category}</p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteKitItem(item.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                {kitItems.length === 0 && (
                  <p className="text-center text-muted-foreground py-4">
                    No kit items configured yet. Add some items to get started.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sizes" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Size Configuration</CardTitle>
                  <CardDescription>
                    Configure available sizes for different kit categories
                  </CardDescription>
                </div>
                <Button onClick={() => setIsSizeDialogOpen(true)} size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Size
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium mb-3">Clothing Sizes</h4>
                  <div className="space-y-2">
                    {clothingSizes.filter(s => s.category === 'clothing').map((size) => (
                      <div key={size.id} className="flex items-center justify-between p-2 border rounded">
                        <span>{size.size_name}</span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteSize(size.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <h4 className="font-medium mb-3">Boot Sizes</h4>
                  <div className="space-y-2">
                    {clothingSizes.filter(s => s.category === 'boots').map((size) => (
                      <div key={size.id} className="flex items-center justify-between p-2 border rounded">
                        <span>{size.size_name}</span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteSize(size.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="icons" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Image className="h-5 w-5" />
                Kit Icons
              </CardTitle>
              <CardDescription>
                Upload custom kit icons for different kit types
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {['home', 'away', 'training', 'goalkeeper'].map((kitType) => (
                  <div key={kitType} className="space-y-3">
                    <Label className="capitalize">{kitType} Kit</Label>
                    <div className="flex items-center gap-3">
                      {team.kitIcons?.[kitType as keyof typeof team.kitIcons] && (
                        <img
                          src={team.kitIcons[kitType as keyof typeof team.kitIcons]}
                          alt={`${kitType} kit`}
                          className="w-12 h-12 object-cover rounded border"
                        />
                      )}
                      <Input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onload = (event) => {
                              handleKitIconUpdate(kitType, event.target?.result as string);
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add Kit Item Dialog */}
      <Dialog open={isAddItemDialogOpen} onOpenChange={setIsAddItemDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Kit Item</DialogTitle>
            <DialogDescription>
              Add a new kit item type that can be issued to players
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="item-name">Item Name</Label>
              <Input
                id="item-name"
                value={newItem.name}
                onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                placeholder="e.g., Training Shirt, Boots"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="item-category">Category</Label>
              <Select value={newItem.category} onValueChange={(value) => setNewItem({ ...newItem, category: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="clothing">Clothing</SelectItem>
                  <SelectItem value="boots">Boots</SelectItem>
                  <SelectItem value="equipment">Equipment</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsAddItemDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddKitItem}>Add Item</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Size Dialog */}
      <Dialog open={isSizeDialogOpen} onOpenChange={setIsSizeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Size</DialogTitle>
            <DialogDescription>
              Add a new size option for kit items
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="size-name">Size Name</Label>
              <Input
                id="size-name"
                value={newSize.size_name}
                onChange={(e) => setNewSize({ ...newSize, size_name: e.target.value })}
                placeholder="e.g., XL, UK 8"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="size-category">Category</Label>
              <Select value={newSize.category} onValueChange={(value) => setNewSize({ ...newSize, category: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="clothing">Clothing</SelectItem>
                  <SelectItem value="boots">Boots</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsSizeDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddSize}>Add Size</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <KitManagementModal
        team={team}
        isOpen={isKitModalOpen}
        onClose={() => setIsKitModalOpen(false)}
      />
    </div>
  );
};
