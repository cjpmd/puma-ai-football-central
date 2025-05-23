
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Team } from '@/types';
import { Plus, Edit, Trash2, Package } from 'lucide-react';

interface EquipmentItem {
  id: string;
  name: string;
  description?: string;
  quantity: number;
  condition: 'excellent' | 'good' | 'fair' | 'poor';
  createdAt: string;
  updatedAt: string;
}

interface TeamEquipmentSettingsProps {
  team: Team;
  onUpdate: (teamData: Partial<Team>) => void;
}

export const TeamEquipmentSettings: React.FC<TeamEquipmentSettingsProps> = ({ team }) => {
  const [equipment, setEquipment] = useState<EquipmentItem[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<EquipmentItem | null>(null);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    quantity: 1,
    condition: 'excellent' as const
  });

  useEffect(() => {
    loadEquipment();
  }, [team.id]);

  const loadEquipment = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('team_equipment')
        .select('*')
        .eq('team_id', team.id)
        .order('name');

      if (error) throw error;

      const equipmentData: EquipmentItem[] = (data || []).map(item => ({
        id: item.id,
        name: item.name,
        description: item.description || '',
        quantity: item.quantity,
        condition: item.condition as EquipmentItem['condition'],
        createdAt: item.created_at,
        updatedAt: item.updated_at
      }));

      setEquipment(equipmentData);
    } catch (error: any) {
      console.error('Error loading equipment:', error);
      toast.error('Failed to load equipment');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (editingItem) {
        const { error } = await supabase
          .from('team_equipment')
          .update({
            name: formData.name,
            description: formData.description,
            quantity: formData.quantity,
            condition: formData.condition
          })
          .eq('id', editingItem.id);

        if (error) throw error;
        toast.success('Equipment updated successfully');
      } else {
        const { error } = await supabase
          .from('team_equipment')
          .insert({
            team_id: team.id,
            name: formData.name,
            description: formData.description,
            quantity: formData.quantity,
            condition: formData.condition
          });

        if (error) throw error;
        toast.success('Equipment added successfully');
      }

      setIsFormOpen(false);
      setEditingItem(null);
      setFormData({ name: '', description: '', quantity: 1, condition: 'excellent' });
      loadEquipment();
    } catch (error: any) {
      console.error('Error saving equipment:', error);
      toast.error('Failed to save equipment');
    }
  };

  const handleEdit = (item: EquipmentItem) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      description: item.description || '',
      quantity: item.quantity,
      condition: item.condition
    });
    setIsFormOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this equipment item?')) return;

    try {
      const { error } = await supabase
        .from('team_equipment')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success('Equipment deleted successfully');
      loadEquipment();
    } catch (error: any) {
      console.error('Error deleting equipment:', error);
      toast.error('Failed to delete equipment');
    }
  };

  const getConditionColor = (condition: EquipmentItem['condition']) => {
    switch (condition) {
      case 'excellent': return 'bg-green-500';
      case 'good': return 'bg-blue-500';
      case 'fair': return 'bg-yellow-500';
      case 'poor': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Equipment Management</h3>
          <p className="text-sm text-muted-foreground">
            Manage your team's equipment inventory
          </p>
        </div>
        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => {
              setEditingItem(null);
              setFormData({ name: '', description: '', quantity: 1, condition: 'excellent' });
            }}>
              <Plus className="h-4 w-4 mr-2" />
              Add Equipment
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingItem ? 'Edit Equipment' : 'Add Equipment'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="name">Equipment Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                />
              </div>
              <div>
                <Label htmlFor="quantity">Quantity</Label>
                <Input
                  id="quantity"
                  type="number"
                  min="1"
                  value={formData.quantity}
                  onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="condition">Condition</Label>
                <select
                  id="condition"
                  value={formData.condition}
                  onChange={(e) => setFormData({ ...formData, condition: e.target.value as EquipmentItem['condition'] })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="excellent">Excellent</option>
                  <option value="good">Good</option>
                  <option value="fair">Fair</option>
                  <option value="poor">Poor</option>
                </select>
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">
                  {editingItem ? 'Update' : 'Add'} Equipment
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="text-center py-8">Loading equipment...</div>
      ) : equipment.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-semibold mb-2">No Equipment Added</h3>
            <p className="text-muted-foreground mb-4">
              Start managing your team's equipment inventory.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {equipment.map((item) => (
            <Card key={item.id}>
              <CardContent className="p-4">
                <div className="flex justify-between items-start mb-3">
                  <h4 className="font-semibold">{item.name}</h4>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" onClick={() => handleEdit(item)}>
                      <Edit className="h-3 w-3" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(item.id)}>
                      <Trash2 className="h-3 w-3 text-red-500" />
                    </Button>
                  </div>
                </div>
                {item.description && (
                  <p className="text-sm text-muted-foreground mb-3">{item.description}</p>
                )}
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Qty: {item.quantity}</span>
                  <Badge className={`text-white ${getConditionColor(item.condition)}`}>
                    {item.condition}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
