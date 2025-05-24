
import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, Package } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface SimpleTeam {
  id: string;
  name: string;
}

interface PlayerKitOverviewModalProps {
  team: SimpleTeam;
  isOpen: boolean;
  onClose: () => void;
}

interface SimplePlayer {
  id: string;
  name: string;
  squad_number: number;
  kit_sizes: Record<string, string>;
}

interface KitItem {
  id: string;
  name: string;
  category: string;
}

export const PlayerKitOverviewModal: React.FC<PlayerKitOverviewModalProps> = ({
  team,
  isOpen,
  onClose
}) => {
  const [players, setPlayers] = useState<SimplePlayer[]>([]);
  const [kitItems, setKitItems] = useState<KitItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && team?.id) {
      loadData();
    }
  }, [isOpen, team?.id]);

  const loadData = async () => {
    if (!team?.id) return;
    
    try {
      setLoading(true);

      // Load players with their kit sizes
      const { data: playersData, error: playersError } = await supabase
        .from('players')
        .select('id, name, squad_number, kit_sizes')
        .eq('team_id', team.id)
        .eq('status', 'active')
        .order('squad_number');

      if (playersError) throw playersError;

      // Transform the data to ensure kit_sizes is properly typed
      const transformedPlayers: SimplePlayer[] = (playersData || []).map(player => ({
        id: player.id,
        name: player.name,
        squad_number: player.squad_number,
        kit_sizes: typeof player.kit_sizes === 'object' && player.kit_sizes !== null 
          ? player.kit_sizes as Record<string, string>
          : {}
      }));

      // Load kit items
      const { data: kitItemsData, error: kitItemsError } = await supabase
        .from('team_kit_items')
        .select('id, name, category')
        .eq('team_id', team.id)
        .order('name');

      if (kitItemsError) throw kitItemsError;

      setPlayers(transformedPlayers);
      setKitItems(kitItemsData || []);
    } catch (error: any) {
      console.error('Error loading kit overview data:', error);
      setPlayers([]);
      setKitItems([]);
    } finally {
      setLoading(false);
    }
  };

  const getPlayerSizeForItem = (player: SimplePlayer, itemName: string) => {
    if (!player.kit_sizes) return 'Not set';
    
    // Try to find a matching kit size based on item name
    const lowerItemName = itemName.toLowerCase();
    const kitSizes = player.kit_sizes;
    
    // Check for direct matches or partial matches
    for (const [key, size] of Object.entries(kitSizes)) {
      if (key.toLowerCase().includes(lowerItemName) || 
          lowerItemName.includes(key.toLowerCase())) {
        return size;
      }
    }
    
    // Check for category matches
    if (lowerItemName.includes('shirt') || lowerItemName.includes('top')) {
      return kitSizes.shirt || kitSizes.training_top || 'Not set';
    }
    if (lowerItemName.includes('shorts')) {
      return kitSizes.shorts || 'Not set';
    }
    if (lowerItemName.includes('boots')) {
      return kitSizes.boots || 'Not set';
    }
    if (lowerItemName.includes('socks')) {
      return kitSizes.socks || 'Not set';
    }
    if (lowerItemName.includes('tracksuit')) {
      return kitSizes.tracksuit || 'Not set';
    }
    if (lowerItemName.includes('goalkeeper')) {
      return kitSizes.goalkeeper_kit || 'Not set';
    }
    
    return 'Not set';
  };

  if (loading) {
    return (
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="sm:max-w-[900px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Player Kit Size Overview</DialogTitle>
          </DialogHeader>
          <div className="text-center py-8">Loading kit overview...</div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[1000px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Player Kit Size Overview - {team.name}
          </DialogTitle>
          <DialogDescription>
            View all players and their configured kit sizes by item
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {kitItems.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No kit items configured yet. Add kit items first to see player sizes.
            </div>
          ) : (
            kitItems.map((item) => (
              <Card key={item.id}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Package className="h-4 w-4" />
                    {item.name}
                    <Badge variant="outline" className="capitalize">{item.category}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {players.length === 0 ? (
                    <div className="text-center py-4 text-muted-foreground">
                      No active players in this team.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {players.map((player) => {
                        const size = getPlayerSizeForItem(player, item.name);
                        return (
                          <div key={player.id} className="flex items-center justify-between p-2 border rounded">
                            <span className="font-medium">
                              {player.name} (#{player.squad_number})
                            </span>
                            <Badge 
                              variant={size === 'Not set' ? 'destructive' : 'secondary'}
                              className="text-xs"
                            >
                              {size}
                            </Badge>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
