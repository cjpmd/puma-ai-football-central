
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
  kit_sizes?: Record<string, string>;
}

interface PlayerKitSizesProps {
  player: Player;
  onUpdate: (kitSizes: Record<string, string>) => void;
}

export const PlayerKitSizes: React.FC<PlayerKitSizesProps> = ({
  player,
  onUpdate
}) => {
  const [kitSizes, setKitSizes] = useState<Record<string, string>>(player.kit_sizes || {});
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const kitCategories = [
    { key: 'shirt', label: 'Shirt', sizes: ['3XS', '2XS', 'XS', 'S', 'M', 'L', 'XL', '2XL', '3XL'] },
    { key: 'shorts', label: 'Shorts', sizes: ['3XS', '2XS', 'XS', 'S', 'M', 'L', 'XL', '2XL', '3XL'] },
    { key: 'socks', label: 'Socks', sizes: ['XS', 'S', 'M', 'L', 'XL'] },
    { key: 'boots', label: 'Boots', sizes: ['UK 3', 'UK 4', 'UK 5', 'UK 6', 'UK 7', 'UK 8', 'UK 9', 'UK 10', 'UK 11', 'UK 12'] },
    { key: 'tracksuit', label: 'Tracksuit', sizes: ['3XS', '2XS', 'XS', 'S', 'M', 'L', 'XL', '2XL', '3XL'] }
  ];

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
          {kitCategories.map((category) => (
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
                  {category.sizes.map((size) => (
                    <SelectItem key={size} value={size}>
                      {size}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ))}
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
