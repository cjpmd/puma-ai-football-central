
import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Player, PlayerAttribute, Team } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { STANDARD_PLAYER_ATTRIBUTES } from '@/types/playerAttributes';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';

interface PlayerAttributesModalProps {
  player: Player | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (attributes: PlayerAttribute[]) => void;
  teamId?: string;
}

export const PlayerAttributesModal: React.FC<PlayerAttributesModalProps> = ({
  player,
  isOpen,
  onClose,
  onSave,
  teamId
}) => {
  const { toast } = useToast();
  const [attributes, setAttributes] = useState<PlayerAttribute[]>([]);
  const [activeTab, setActiveTab] = useState<string>(player?.type === 'goalkeeper' ? 'goalkeeping' : 'technical');
  const [teamAttributes, setTeamAttributes] = useState<Record<string, PlayerAttribute[]> | null>(null);
  
  // Fetch team attributes configuration
  useEffect(() => {
    const fetchTeamAttributes = async () => {
      if (!teamId) return;
      
      const { data, error } = await supabase
        .from('teams')
        .select('player_attributes')
        .eq('id', teamId)
        .single();
      
      if (!error && data?.player_attributes) {
        setTeamAttributes(data.player_attributes as Record<string, PlayerAttribute[]>);
      }
    };
    
    if (isOpen) {
      fetchTeamAttributes();
    }
  }, [isOpen, teamId]);
  
  // Initialize attributes when modal opens
  useEffect(() => {
    if (isOpen && player) {
      // Priority 1: Player's existing attributes
      if (player.attributes && player.attributes.length > 0) {
        setAttributes([...player.attributes]);
        setActiveTab(player.type === 'goalkeeper' ? 'goalkeeping' : 'technical');
        return;
      }
      
      // Priority 2: Team's configured attributes (if available)
      if (teamAttributes) {
        const teamConfiguredAttrs = Object.values(teamAttributes)
          .flat()
          .filter(attr => attr.enabled);
        
        // Filter by player type
        const filteredAttrs = player.type === 'goalkeeper' 
          ? teamConfiguredAttrs.filter(attr => attr.group === 'goalkeeping')
          : teamConfiguredAttrs.filter(attr => attr.group !== 'goalkeeping');
        
        setAttributes(filteredAttrs);
        setActiveTab(player.type === 'goalkeeper' ? 'goalkeeping' : 'technical');
        return;
      }
      
      // Priority 3: Use comprehensive standard attributes
      let defaultAttributes: PlayerAttribute[] = [];
      
      if (player.type === 'goalkeeper') {
        defaultAttributes = STANDARD_PLAYER_ATTRIBUTES
          .filter(attr => attr.group === 'goalkeeping')
          .map((attr, index) => ({
            id: `${attr.id || `gk-${index}`}`,
            name: attr.name,
            group: "goalkeeping" as const,
            value: 5,
            enabled: true
          }));
      } else {
        // For outfield players, add all non-goalkeeping attributes
        defaultAttributes = STANDARD_PLAYER_ATTRIBUTES
          .filter(attr => attr.group !== 'goalkeeping')
          .map((attr, index) => ({
            id: `${attr.id || `attr-${index}`}`,
            name: attr.name,
            group: attr.group,
            value: 5,
            enabled: true
          }));
      }
      
      setAttributes(defaultAttributes);
      setActiveTab(player.type === 'goalkeeper' ? 'goalkeeping' : 'technical');
    }
  }, [isOpen, player, teamAttributes]);

  // Don't render the modal if there's no player
  if (!player) {
    return null;
  }

  const getAttributesByGroup = (group: string) => {
    return attributes.filter(attr => attr.group === group);
  };

  const getGroupAverage = (group: string) => {
    const groupAttributes = getAttributesByGroup(group).filter(attr => attr.enabled);
    if (groupAttributes.length === 0) return 0;
    
    const sum = groupAttributes.reduce((total, attr) => total + attr.value, 0);
    return Math.round((sum / groupAttributes.length) * 10) / 10;
  };

  const handleAttributeValueChange = (id: string, value: number) => {
    setAttributes(prevAttrs => 
      prevAttrs.map(attr => 
        attr.id === id ? { ...attr, value } : attr
      )
    );
  };

  const handleAttributeEnabledToggle = (id: string, enabled: boolean) => {
    setAttributes(prevAttrs => 
      prevAttrs.map(attr => 
        attr.id === id ? { ...attr, enabled } : attr
      )
    );
  };

  const handleSave = () => {
    onSave(attributes);
  };

  const getAttributeColor = (value: number) => {
    if (value >= 8) return 'text-green-600';
    if (value >= 6) return 'text-blue-600';
    if (value >= 4) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>
            Player Attributes - {player.name}
          </DialogTitle>
        </DialogHeader>
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full flex-1 flex flex-col">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="technical" disabled={player.type === 'goalkeeper' && getAttributesByGroup('technical').every(a => !a.enabled)}>
              Technical
              <span className="ml-1 text-xs">({getGroupAverage('technical')})</span>
            </TabsTrigger>
            <TabsTrigger value="physical" disabled={player.type === 'goalkeeper' && getAttributesByGroup('physical').every(a => !a.enabled)}>
              Physical
              <span className="ml-1 text-xs">({getGroupAverage('physical')})</span>
            </TabsTrigger>
            <TabsTrigger value="mental" disabled={player.type === 'goalkeeper' && getAttributesByGroup('mental').every(a => !a.enabled)}>
              Mental
              <span className="ml-1 text-xs">({getGroupAverage('mental')})</span>
            </TabsTrigger>
            <TabsTrigger value="goalkeeping">
              Goalkeeping
              <span className="ml-1 text-xs">({getGroupAverage('goalkeeping')})</span>
            </TabsTrigger>
          </TabsList>

          <div className="flex-1 min-h-0 mt-4">
            {['technical', 'physical', 'mental', 'goalkeeping'].map(group => (
              <TabsContent key={group} value={group} className="h-full data-[state=active]:flex data-[state=active]:flex-col">
                <ScrollArea className="flex-1">
                  <Card>
                    <CardContent className="pt-6">
                      {getAttributesByGroup(group).length === 0 ? (
                        <div className="text-center py-4 text-muted-foreground">
                          No {group} attributes defined.
                        </div>
                      ) : (
                        <div className="space-y-6">
                          {getAttributesByGroup(group).map(attribute => (
                            <div key={attribute.id} className="space-y-2">
                              <div className="flex items-center justify-between">
                                <Label 
                                  htmlFor={attribute.id} 
                                  className={`font-medium ${attribute.enabled ? '' : 'text-muted-foreground'}`}
                                >
                                  {attribute.name}
                                </Label>
                                <div className="flex items-center gap-2">
                                  <span className={`font-bold ${getAttributeColor(attribute.value)}`}>
                                    {attribute.value}
                                  </span>
                                  <Switch
                                    checked={attribute.enabled}
                                    onCheckedChange={(checked) => handleAttributeEnabledToggle(attribute.id, checked)}
                                  />
                                </div>
                              </div>
                              <Slider
                                id={attribute.id}
                                min={1}
                                max={10}
                                step={1}
                                value={[attribute.value]}
                                onValueChange={([value]) => handleAttributeValueChange(attribute.id, value)}
                                disabled={!attribute.enabled}
                                className={attribute.enabled ? '' : 'opacity-50'}
                              />
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </ScrollArea>
              </TabsContent>
            ))}
          </div>
        </Tabs>

        <DialogFooter className="mt-4 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} className="bg-puma-blue-500 hover:bg-puma-blue-600">
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
