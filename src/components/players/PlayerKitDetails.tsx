
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

interface PlayerKitDetailsProps {
  player: Player;
  onUpdate: (kitDetails: Record<string, string>) => void;
}

interface KitItem {
  id: string;
  name: string;
  category: string;
  available_sizes: string[];
}

export const PlayerKitDetails: React.FC<PlayerKitDetailsProps> = ({
  player,
  onUpdate
}) => {
  const [kitDetails, setKitDetails] = useState<Record<string, string>>(player.kit_sizes || {});
  const [kitItems, setKitItems] = useState<KitItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadKitItems();
  }, [player.team_id]);

  const loadKitItems = async () => {
    try {
      setLoading(true);

      const { data: kitItemsData, error } = await supabase
        .from('team_kit_items')
        .select('*')
        .eq('team_id', player.team_id)
        .order('name');

      if (error) throw error;

      // Transform kit items data
      const transformedKitItems: KitItem[] = (kitItemsData || []).map(item => ({
        id: item.id,
        name: item.name,
        category: item.category,
        available_sizes: Array.isArray(item.available_sizes) ? item.available_sizes.map(String) : []
      }));

      setKitItems(transformedKitItems);
    } catch (error: any) {
      console.error('Error loading kit items:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to load kit items',
        variant: 'destructive',
      });
      setKitItems([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDetailChange = (itemName: string, value: string) => {
    const newDetails = { ...kitDetails, [itemName]: value };
    setKitDetails(newDetails);
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      const { error } = await supabase
        .from('players')
        .update({ kit_sizes: kitDetails })
        .eq('id', player.id);

      if (error) throw error;

      onUpdate(kitDetails);
      toast({
        title: 'Success',
        description: 'Kit details updated successfully',
      });
    } catch (error: any) {
      console.error('Error updating kit details:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to update kit details',
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
            Kit Details
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">Loading kit details...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="h-5 w-5" />
          Kit Details
        </CardTitle>
        <CardDescription>
          Specify kit sizes and shirt name for each configured kit item
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Name on Shirt field */}
        <div className="space-y-2">
          <Label htmlFor="nameOnShirt">Name on Shirt</Label>
          <Input
            id="nameOnShirt"
            value={kitDetails.nameOnShirt || ''}
            onChange={(e) => handleDetailChange('nameOnShirt', e.target.value)}
            placeholder="Name to appear on shirt"
          />
        </div>

        {kitItems.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No kit items configured for this team yet. Configure kit items in team settings first.
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {kitItems.map((item) => (
                <div key={item.id} className="space-y-2">
                  <Label htmlFor={`size-${item.id}`}>{item.name}</Label>
                  <Select 
                    value={kitDetails[item.name] || ''} 
                    onValueChange={(value) => handleDetailChange(item.name, value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={`Select ${item.name.toLowerCase()} size`} />
                    </SelectTrigger>
                    <SelectContent>
                      {item.available_sizes.map((size) => (
                        <SelectItem key={size} value={size}>
                          {size}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {item.available_sizes.length === 0 && (
                    <p className="text-xs text-muted-foreground">
                      No sizes configured for this item
                    </p>
                  )}
                </div>
              ))}
            </div>

            <Button 
              onClick={handleSave} 
              disabled={saving}
              className="bg-puma-blue-500 hover:bg-puma-blue-600"
            >
              {saving ? 'Saving...' : 'Save Kit Details'}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
};
