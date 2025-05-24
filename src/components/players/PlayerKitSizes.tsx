
import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Package } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface Player {
  id: string;
  team_id: string;
  kit_sizes?: Record<string, string>;
}

interface PlayerKitSizesProps {
  player: Player;
  onUpdate: (kitSizes: Record<string, string>) => void;
}

interface ClothingSize {
  size_name: string;
  category: string;
}

export const PlayerKitSizes: React.FC<PlayerKitSizesProps> = ({
  player,
  onUpdate
}) => {
  const [kitSizes, setKitSizes] = useState<Record<string, string>>(player.kit_sizes || {});
  const [availableSizes, setAvailableSizes] = useState<ClothingSize[]>([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadAvailableSizes();
  }, [player.team_id]);

  const loadAvailableSizes = async () => {
    try {
      setLoading(true);

      const { data: sizesData, error } = await supabase
        .from('team_clothing_sizes')
        .select('size_name, category')
        .eq('team_id', player.team_id)
        .order('category, display_order');

      if (error) throw error;

      setAvailableSizes(sizesData || []);
    } catch (error: any) {
      console.error('Error loading available sizes:', error);
      // Fallback to default sizes if team hasn't configured custom ones
      setAvailableSizes([
        { size_name: '3XS', category: 'clothing' },
        { size_name: '2XS', category: 'clothing' },
        { size_name: 'XS', category: 'clothing' },
        { size_name: 'S', category: 'clothing' },
        { size_name: 'M', category: 'clothing' },
        { size_name: 'L', category: 'clothing' },
        { size_name: 'XL', category: 'clothing' },
        { size_name: '2XL', category: 'clothing' },
        { size_name: '3XL', category: 'clothing' },
        { size_name: 'UK 3', category: 'boots' },
        { size_name: 'UK 4', category: 'boots' },
        { size_name: 'UK 5', category: 'boots' },
        { size_name: 'UK 6', category: 'boots' },
        { size_name: 'UK 7', category: 'boots' },
        { size_name: 'UK 8', category: 'boots' },
        { size_name: 'UK 9', category: 'boots' },
        { size_name: 'UK 10', category: 'boots' },
        { size_name: 'UK 11', category: 'boots' },
        { size_name: 'UK 12', category: 'boots' },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const kitCategories = [
    { key: 'shirt', label: 'Shirt', category: 'clothing' },
    { key: 'shorts', label: 'Shorts', category: 'clothing' },
    { key: 'socks', label: 'Socks', category: 'clothing' },
    { key: 'boots', label: 'Boots', category: 'boots' },
    { key: 'tracksuit', label: 'Tracksuit', category: 'clothing' },
    { key: 'training_top', label: 'Training Top', category: 'clothing' },
    { key: 'goalkeeper_kit', label: 'Goalkeeper Kit', category: 'clothing' }
  ];

  const getSizesForCategory = (category: string) => {
    return availableSizes.filter(size => size.category === category).map(size => size.size_name);
  };

  const handleSizeChange = (category: string, size: string) => {
    const newSizes = { ...kitSizes, [category]: size };
    setKitSizes(newSizes);
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      const { error } = await supabase
        .from('players')
        .update({ kit_sizes: kitSizes })
        .eq('id', player.id);

      if (error) throw error;

      onUpdate(kitSizes);
      toast({
        title: 'Success',
        description: 'Kit sizes updated successfully',
      });
    } catch (error: any) {
      console.error('Error updating kit sizes:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to update kit sizes',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Kit Sizes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">Loading size options...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="h-5 w-5" />
          Kit Sizes
        </CardTitle>
        <CardDescription>
          Specify kit sizes for ordering from suppliers
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {kitCategories.map((category) => {
            const availableCategorySizes = getSizesForCategory(category.category);
            if (availableCategorySizes.length === 0) return null;

            return (
              <div key={category.key} className="space-y-2">
                <Label htmlFor={`size-${category.key}`}>{category.label}</Label>
                <Select 
                  value={kitSizes[category.key] || ''} 
                  onValueChange={(value) => handleSizeChange(category.key, value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={`Select ${category.label.toLowerCase()} size`} />
                  </SelectTrigger>
                  <SelectContent>
                    {availableCategorySizes.map((size) => (
                      <SelectItem key={size} value={size}>
                        {size}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            );
          })}
        </div>

        <Button 
          onClick={handleSave} 
          disabled={saving}
          className="bg-puma-blue-500 hover:bg-puma-blue-600"
        >
          {saving ? 'Saving...' : 'Save Kit Sizes'}
        </Button>
      </CardContent>
    </Card>
  );
};
