import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { Package, Shirt, Settings, Plus, Trash2, Upload, Image, Users } from 'lucide-react';
import { Team } from '@/types/index';
import { KitManagementModal } from '../KitManagementModal';
import { TeamKitSettings } from './TeamKitSettings';
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
  size_category: string;
  available_sizes: string[];
}

interface ClothingSize {
  id: string;
  size_name: string;
  category: string;
  display_order: number;
}

// Database types from Supabase
interface DbKitItem {
  id: string;
  name: string;
  category: string;
  size_category: string;
  available_sizes: any; // JSON type from Supabase
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
  const [isEditItemDialogOpen, setIsEditItemDialogOpen] = useState(false);
  const [isSizeDialogOpen, setIsSizeDialogOpen] = useState(false);
  const [isEditSizeDialogOpen, setIsEditSizeDialogOpen] = useState(false);
  const [isKitOverviewOpen, setIsKitOverviewOpen] = useState(false);
  const [newItem, setNewItem] = useState({ 
    name: '', 
    category: 'clothing', 
    size_category: 'clothing',
    selectedSizes: [] as string[]
  });
  const [editingItem, setEditingItem] = useState<KitItem | null>(null);
  const [newSize, setNewSize] = useState({ size_name: '', category: 'clothing' });
  const [editingSize, setEditingSize] = useState<ClothingSize | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadKitConfiguration();
  }, [team.id]);

  const loadKitConfiguration = async () => {
    try {
      setLoading(true);

      // Load kit items with their configured sizes
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

      // Transform the data to match our interface
      const transformedItems: KitItem[] = (itemsData || []).map((item: DbKitItem) => ({
        id: item.id,
        name: item.name,
        category: item.category,
        size_category: item.size_category || 'clothing',
        available_sizes: Array.isArray(item.available_sizes) ? item.available_sizes.map(String) : []
      }));

      setKitItems(transformedItems);
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
          size_category: newItem.size_category,
          available_sizes: newItem.selectedSizes
        }]);

      if (error) throw error;

      setNewItem({ 
        name: '', 
        category: 'clothing', 
        size_category: 'clothing',
        selectedSizes: []
      });
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

  const handleEditKitItem = (item: KitItem) => {
    setEditingItem({
      ...item,
      available_sizes: item.available_sizes || []
    });
    setIsEditItemDialogOpen(true);
  };

  const handleUpdateKitItem = async () => {
    if (!editingItem || !editingItem.name.trim()) return;

    try {
      const { error } = await supabase
        .from('team_kit_items')
        .update({
          name: editingItem.name,
          category: editingItem.category,
          size_category: editingItem.size_category,
          available_sizes: editingItem.available_sizes
        })
        .eq('id', editingItem.id);

      if (error) throw error;

      setEditingItem(null);
      setIsEditItemDialogOpen(false);
      loadKitConfiguration();
      
      toast({
        title: 'Success',
        description: 'Kit item updated successfully',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update kit item',
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

  const handleEditSize = (size: ClothingSize) => {
    setEditingSize(size);
    setIsEditSizeDialogOpen(true);
  };

  const handleUpdateSize = async () => {
    if (!editingSize || !editingSize.size_name.trim()) return;

    try {
      const { error } = await supabase
        .from('team_clothing_sizes')
        .update({
          size_name: editingSize.size_name,
          category: editingSize.category
        })
        .eq('id', editingSize.id);

      if (error) throw error;

      setEditingSize(null);
      setIsEditSizeDialogOpen(false);
      loadKitConfiguration();
      
      toast({
        title: 'Success',
        description: 'Size updated successfully',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update size',
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

  const handleSizeSelectionChange = (sizeId: string, checked: boolean) => {
    if (editingItem) {
      const updatedSizes = checked 
        ? [...editingItem.available_sizes, sizeId]
        : editingItem.available_sizes.filter(id => id !== sizeId);
      
      setEditingItem({
        ...editingItem,
        available_sizes: updatedSizes
      });
    } else {
      const updatedSizes = checked 
        ? [...newItem.selectedSizes, sizeId]
        : newItem.selectedSizes.filter(id => id !== sizeId);
      
      setNewItem({
        ...newItem,
        selectedSizes: updatedSizes
      });
    }
  };

  const getSizesForCategory = (category: string) => {
    return clothingSizes.filter(size => size.category === category);
  };

  if (loading) {
    return <div className="text-center py-8">Loading kit configuration...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold">Kit Management</h3>
        <p className="text-sm text-muted-foreground">
          Manage kit items, sizes, designs, and track kit issued to players
        </p>
      </div>

      <Tabs defaultValue="issue" className="w-full">
        <TabsList className="grid w-full grid-cols-5 gap-0.5">
          <TabsTrigger value="issue" className="text-xs sm:text-sm px-1 sm:px-3">
            <Package className="h-4 w-4 sm:hidden" />
            <span className="hidden sm:inline">Issue Kit</span>
            <span className="sm:hidden">Issue</span>
          </TabsTrigger>
          <TabsTrigger value="design" className="text-xs sm:text-sm px-1 sm:px-3">
            <Shirt className="h-4 w-4 sm:hidden" />
            <span className="hidden sm:inline">Kit Design</span>
            <span className="sm:hidden">Design</span>
          </TabsTrigger>
          <TabsTrigger value="items" className="text-xs sm:text-sm px-1 sm:px-3">
            <Settings className="h-4 w-4 sm:hidden" />
            <span className="hidden sm:inline">Kit Items</span>
            <span className="sm:hidden">Items</span>
          </TabsTrigger>
          <TabsTrigger value="sizes" className="text-xs sm:text-sm px-1 sm:px-3">
            <span>Sizes</span>
          </TabsTrigger>
          <TabsTrigger value="overview" className="text-xs sm:text-sm px-1 sm:px-3">
            <Users className="h-4 w-4 sm:hidden" />
            <span className="hidden sm:inline">Kit Overview</span>
            <span className="sm:hidden">Overview</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="issue" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Kit Issue Management
              </CardTitle>
              <CardDescription>
                Track which kit items have been issued to players
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

        <TabsContent value="design" className="space-y-4">
          <TeamKitSettings team={team} onUpdate={onUpdate} />
        </TabsContent>

        <TabsContent value="items" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Kit Items Configuration</CardTitle>
                  <CardDescription>
                    Manage the types of kit items and their available sizes
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
                      <p className="text-xs text-muted-foreground">
                        {item.available_sizes.length} sizes configured
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditKitItem(item)}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteKitItem(item.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
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
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditSize(size)}
                          >
                            Edit
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteSize(size.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
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
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditSize(size)}
                          >
                            Edit
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteSize(size.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Kit Size Overview
              </CardTitle>
              <CardDescription>
                View all players and their configured kit sizes by item
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => setIsKitOverviewOpen(true)}>
                <Users className="h-4 w-4 mr-2" />
                View Player Kit Sizes
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add Kit Item Dialog with Size Selection */}
      <Dialog open={isAddItemDialogOpen} onOpenChange={setIsAddItemDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Add Kit Item</DialogTitle>
            <DialogDescription>
              Add a new kit item type and configure its available sizes
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
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
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="size-category">Size Category</Label>
              <Select value={newItem.size_category} onValueChange={(value) => setNewItem({ ...newItem, size_category: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="clothing">Clothing Sizes</SelectItem>
                  <SelectItem value="boots">Boot Sizes</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Available Sizes</Label>
              <div className="grid grid-cols-3 gap-2 max-h-32 overflow-y-auto border rounded p-2">
                {getSizesForCategory(newItem.size_category).map((size) => (
                  <div key={size.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`size-${size.id}`}
                      checked={newItem.selectedSizes.includes(size.size_name)}
                      onCheckedChange={(checked) => handleSizeSelectionChange(size.size_name, checked as boolean)}
                    />
                    <label htmlFor={`size-${size.id}`} className="text-sm cursor-pointer">
                      {size.size_name}
                    </label>
                  </div>
                ))}
              </div>
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

      {/* Edit Kit Item Dialog */}
      <Dialog open={isEditItemDialogOpen} onOpenChange={setIsEditItemDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Edit Kit Item</DialogTitle>
            <DialogDescription>
              Update the kit item details and available sizes
            </DialogDescription>
          </DialogHeader>
          {editingItem && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-item-name">Item Name</Label>
                  <Input
                    id="edit-item-name"
                    value={editingItem.name}
                    onChange={(e) => setEditingItem({ ...editingItem, name: e.target.value })}
                    placeholder="e.g., Training Shirt, Boots"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-item-category">Category</Label>
                  <Select 
                    value={editingItem.category} 
                    onValueChange={(value) => setEditingItem({ ...editingItem, category: value })}
                  >
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
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-size-category">Size Category</Label>
                <Select 
                  value={editingItem.size_category} 
                  onValueChange={(value) => setEditingItem({ ...editingItem, size_category: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="clothing">Clothing Sizes</SelectItem>
                    <SelectItem value="boots">Boot Sizes</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Available Sizes</Label>
                <div className="grid grid-cols-3 gap-2 max-h-32 overflow-y-auto border rounded p-2">
                  {getSizesForCategory(editingItem.size_category).map((size) => (
                    <div key={size.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`edit-size-${size.id}`}
                        checked={editingItem.available_sizes.includes(size.size_name)}
                        onCheckedChange={(checked) => handleSizeSelectionChange(size.size_name, checked as boolean)}
                      />
                      <label htmlFor={`edit-size-${size.id}`} className="text-sm cursor-pointer">
                        {size.size_name}
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsEditItemDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleUpdateKitItem}>Update Item</Button>
              </div>
            </div>
          )}
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

      {/* Edit Size Dialog */}
      <Dialog open={isEditSizeDialogOpen} onOpenChange={setIsEditSizeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Size</DialogTitle>
            <DialogDescription>
              Update the size details
            </DialogDescription>
          </DialogHeader>
          {editingSize && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit-size-name">Size Name</Label>
                <Input
                  id="edit-size-name"
                  value={editingSize.size_name}
                  onChange={(e) => setEditingSize({ ...editingSize, size_name: e.target.value })}
                  placeholder="e.g., XL, UK 8"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-size-category">Category</Label>
                <Select 
                  value={editingSize.category} 
                  onValueChange={(value) => setEditingSize({ ...editingSize, category: value })}
                >
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
                <Button variant="outline" onClick={() => setIsEditSizeDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleUpdateSize}>Update Size</Button>
              </div>
            </div>
          )}
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
