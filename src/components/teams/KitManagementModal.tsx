
import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Trash2, Plus, Package, Calendar, Users } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Team } from '@/types';

interface Player {
  id: string;
  name: string;
  squad_number: number;
}

interface KitItem {
  id: string;
  name: string;
  category: string;
  available_sizes: string[];
}

interface KitIssue {
  id: string;
  kit_item_name: string;
  kit_size?: string;
  quantity: number;
  date_issued: string;
  player_ids: string[];
  issued_by: string;
  created_at: string;
}

interface KitManagementModalProps {
  team: Team;
  isOpen: boolean;
  onClose: () => void;
}

export const KitManagementModal: React.FC<KitManagementModalProps> = ({
  team,
  isOpen,
  onClose
}) => {
  const [players, setPlayers] = useState<Player[]>([]);
  const [kitItems, setKitItems] = useState<KitItem[]>([]);
  const [kitIssues, setKitIssues] = useState<KitIssue[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isAddingKit, setIsAddingKit] = useState(false);
  const [newKit, setNewKit] = useState({
    itemId: '',
    size: '',
    quantity: 1,
    selectedPlayers: [] as string[]
  });
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    if (isOpen && team?.id) {
      loadData();
    }
  }, [isOpen, team?.id]);

  const loadData = async () => {
    if (!team?.id) return;
    
    try {
      setLoading(true);

      // Load players
      const { data: playersData, error: playersError } = await supabase
        .from('players')
        .select('id, name, squad_number')
        .eq('team_id', team.id)
        .eq('status', 'active')
        .order('squad_number');

      if (playersError) throw playersError;

      // Load configured kit items
      const { data: kitItemsData, error: kitItemsError } = await supabase
        .from('team_kit_items')
        .select('*')
        .eq('team_id', team.id)
        .order('name');

      if (kitItemsError) throw kitItemsError;

      // Transform kit items data
      const transformedKitItems: KitItem[] = (kitItemsData || []).map(item => ({
        id: item.id,
        name: item.name,
        category: item.category,
        available_sizes: Array.isArray(item.available_sizes) ? item.available_sizes.map(String) : []
      }));

      // Load kit issues
      const { data: kitData, error: kitError } = await supabase
        .from('team_kit_issues')
        .select('*')
        .eq('team_id', team.id)
        .order('date_issued', { ascending: false });

      if (kitError) {
        console.error('Kit data error:', kitError);
        setKitIssues([]);
      } else {
        // Transform the data to handle JSON types properly
        const transformedKitData: KitIssue[] = (kitData || []).map(issue => ({
          id: issue.id,
          kit_item_name: issue.kit_item_name,
          kit_size: issue.kit_size,
          quantity: issue.quantity,
          date_issued: issue.date_issued,
          player_ids: Array.isArray(issue.player_ids) ? issue.player_ids as string[] : [],
          issued_by: issue.issued_by || '',
          created_at: issue.created_at,
        }));
        setKitIssues(transformedKitData);
      }

      setPlayers(playersData || []);
      setKitItems(transformedKitItems);
    } catch (error: any) {
      console.error('Error loading kit data:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to load kit data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePlayerSelect = (playerId: string, checked: boolean) => {
    setNewKit(prev => ({
      ...prev,
      selectedPlayers: checked 
        ? [...prev.selectedPlayers, playerId]
        : prev.selectedPlayers.filter(id => id !== playerId)
    }));
  };

  const handleIssueKit = async () => {
    if (!team?.id || !newKit.itemId || newKit.selectedPlayers.length === 0) {
      toast({
        title: 'Error',
        description: 'Please select kit item and at least one player',
        variant: 'destructive',
      });
      return;
    }

    const selectedKitItem = kitItems.find(item => item.id === newKit.itemId);
    if (!selectedKitItem) {
      toast({
        title: 'Error',
        description: 'Selected kit item not found',
        variant: 'destructive',
      });
      return;
    }

    try {
      setSaving(true);

      const { error } = await supabase
        .from('team_kit_issues')
        .insert([
          {
            team_id: team.id,
            kit_item_id: newKit.itemId,
            kit_item_name: selectedKitItem.name,
            kit_size: newKit.size || null,
            quantity: newKit.quantity,
            player_ids: newKit.selectedPlayers,
            issued_by: user?.id,
            date_issued: new Date().toISOString().split('T')[0],
          }
        ]);

      if (error) throw error;

      // Reset form
      setNewKit({
        itemId: '',
        size: '',
        quantity: 1,
        selectedPlayers: []
      });
      setIsAddingKit(false);
      
      // Reload data
      await loadData();
      
      toast({
        title: 'Success',
        description: 'Kit issued successfully',
      });
    } catch (error: any) {
      console.error('Error issuing kit:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to issue kit',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const getPlayerName = (playerId: string) => {
    const player = players.find(p => p.id === playerId);
    return player ? `${player.name} (#${player.squad_number})` : 'Unknown Player';
  };

  const getSelectedKitItem = () => {
    return kitItems.find(item => item.id === newKit.itemId);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[900px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Kit Management - {team.name}</DialogTitle>
          <DialogDescription>
            Track and manage kit issued to players
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Issue Kit Section */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Issue Kit</CardTitle>
                <Button
                  onClick={() => setIsAddingKit(!isAddingKit)}
                  size="sm"
                  className="bg-puma-blue-500 hover:bg-puma-blue-600"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Issue Kit
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {isAddingKit && (
                <div className="space-y-4 p-4 border rounded-lg mb-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="kit-item">Kit Item *</Label>
                      <Select value={newKit.itemId} onValueChange={(value) => setNewKit({ ...newKit, itemId: value, size: '' })}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select kit item" />
                        </SelectTrigger>
                        <SelectContent>
                          {kitItems.map((item) => (
                            <SelectItem key={item.id} value={item.id}>
                              {item.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {kitItems.length === 0 && (
                        <p className="text-xs text-muted-foreground">
                          No kit items configured. Add kit items in settings first.
                        </p>
                      )}
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="kit-size">Size</Label>
                      <Select value={newKit.size} onValueChange={(value) => setNewKit({ ...newKit, size: value })}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select size (optional)" />
                        </SelectTrigger>
                        <SelectContent>
                          {getSelectedKitItem()?.available_sizes.map((size) => (
                            <SelectItem key={size} value={size}>
                              {size}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="quantity">Quantity</Label>
                      <Input
                        id="quantity"
                        type="number"
                        min="1"
                        value={newKit.quantity}
                        onChange={(e) => setNewKit({ ...newKit, quantity: parseInt(e.target.value) || 1 })}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Select Players *</Label>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-48 overflow-y-auto border rounded p-2">
                      {players.map((player) => (
                        <div key={player.id} className="flex items-center space-x-2">
                          <Checkbox
                            id={`player-${player.id}`}
                            checked={newKit.selectedPlayers.includes(player.id)}
                            onCheckedChange={(checked) => handlePlayerSelect(player.id, checked as boolean)}
                          />
                          <label htmlFor={`player-${player.id}`} className="text-sm cursor-pointer">
                            {player.name} (#{player.squad_number})
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button onClick={handleIssueKit} disabled={saving}>
                      {saving ? 'Issuing...' : 'Issue Kit'}
                    </Button>
                    <Button variant="outline" onClick={() => setIsAddingKit(false)}>
                      Cancel
                    </Button>
                  </div>
                </div>
              )}

              {/* Kit Issues History */}
              {loading ? (
                <div className="text-center py-8">Loading kit history...</div>
              ) : kitIssues.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No kit has been issued yet. Start by issuing some kit to players.
                </div>
              ) : (
                <div className="space-y-4">
                  <h4 className="font-semibold">Kit Issue History</h4>
                  {kitIssues.map((issue) => (
                    <Card key={issue.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1 space-y-2">
                            <div className="flex items-center gap-3">
                              <Package className="h-4 w-4 text-puma-blue-500" />
                              <h5 className="font-semibold">{issue.kit_item_name}</h5>
                              {issue.kit_size && (
                                <Badge variant="outline">Size: {issue.kit_size}</Badge>
                              )}
                              <Badge>Qty: {issue.quantity}</Badge>
                            </div>
                            
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Calendar className="h-3 w-3" />
                              <span>Issued on {new Date(issue.date_issued).toLocaleDateString()}</span>
                            </div>
                            
                            <div className="flex items-start gap-2 text-sm">
                              <Users className="h-3 w-3 mt-1 text-muted-foreground" />
                              <div className="flex flex-wrap gap-1">
                                {issue.player_ids.map((playerId) => (
                                  <Badge key={playerId} variant="secondary" className="text-xs">
                                    {getPlayerName(playerId)}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
};
