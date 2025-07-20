import { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Player } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuthorization } from '@/contexts/AuthorizationContext';
import { PlayerKitDetails } from '@/components/players/PlayerKitDetails';
import { PlayerKitTracking } from '@/components/players/PlayerKitTracking';

interface EditPlayerModalProps {
  player: Player;
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
}

export const EditPlayerModal: React.FC<EditPlayerModalProps> = ({
  player,
  isOpen,
  onClose,
  onSave
}) => {
  const { toast } = useToast();
  const { isTeamManager, isGlobalAdmin } = useAuthorization();
  
  const canEditSquadNumber = isTeamManager(player.teamId) || isGlobalAdmin;
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: player.name || '',
    squadNumber: player.squadNumber || 0,
    dateOfBirth: player.dateOfBirth || '',
    type: player.type || 'outfield',
    availability: player.availability || 'green'
  });

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast({
        title: 'Error',
        description: 'Player name is required',
        variant: 'destructive'
      });
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('players')
        .update({
          name: formData.name.trim(),
          squad_number: formData.squadNumber,
          date_of_birth: formData.dateOfBirth,
          type: formData.type,
          availability: formData.availability
        })
        .eq('id', player.id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Player updated successfully'
      });
      
      onSave();
      onClose();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update player',
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="bottom" className="h-[90vh]">
        <SheetHeader className="border-b pb-4">
          <SheetTitle>Edit Player</SheetTitle>
        </SheetHeader>
        
        <div className="flex-1 overflow-y-auto p-6">
          <Tabs defaultValue="basic" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="basic">Basic Info</TabsTrigger>
              <TabsTrigger value="kit">Kit Details</TabsTrigger>
              <TabsTrigger value="issued">Kit Issued</TabsTrigger>
            </TabsList>
            
            <TabsContent value="basic" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Player Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Enter player name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="squadNumber">Squad Number</Label>
                <Input
                  id="squadNumber"
                  type="number"
                  value={formData.squadNumber}
                  onChange={(e) => setFormData(prev => ({ ...prev, squadNumber: parseInt(e.target.value) || 0 }))}
                  placeholder="Enter squad number"
                  disabled={!canEditSquadNumber}
                />
                {!canEditSquadNumber && (
                  <p className="text-xs text-muted-foreground">
                    Only managers and admins can edit squad numbers
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="dateOfBirth">Date of Birth</Label>
                <Input
                  id="dateOfBirth"
                  type="date"
                  value={formData.dateOfBirth}
                  onChange={(e) => setFormData(prev => ({ ...prev, dateOfBirth: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="type">Player Type</Label>
                <Select value={formData.type} onValueChange={(value) => setFormData(prev => ({ ...prev, type: value as 'goalkeeper' | 'outfield' }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="outfield">Outfield</SelectItem>
                    <SelectItem value="goalkeeper">Goalkeeper</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="availability">Availability</Label>
                <Select value={formData.availability} onValueChange={(value) => setFormData(prev => ({ ...prev, availability: value as 'green' | 'amber' | 'red' }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="green">Available</SelectItem>
                    <SelectItem value="amber">Limited</SelectItem>
                    <SelectItem value="red">Unavailable</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </TabsContent>
            
            <TabsContent value="kit" className="space-y-4">
              <PlayerKitDetails 
                player={{
                  id: player.id,
                  team_id: player.teamId,
                  kit_sizes: player.kit_sizes
                }}
                onUpdate={() => {}}
              />
            </TabsContent>
            
            <TabsContent value="issued" className="space-y-4">
              <PlayerKitTracking 
                player={{
                  id: player.id,
                  name: player.name,
                  team_id: player.teamId
                }}
              />
            </TabsContent>
          </Tabs>
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