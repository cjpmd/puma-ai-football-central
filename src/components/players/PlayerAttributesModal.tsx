
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
  
  // Initialize attributes when modal opens - fetch team config first to avoid race condition
  useEffect(() => {
    const initializeAttributes = async () => {
      if (!isOpen || !player) return;

      // Step 1: Fetch team configuration first
      let teamConfig: Record<string, PlayerAttribute[]> | null = null;
      
      if (teamId) {
        const { data, error } = await supabase
          .from('teams')
          .select('player_attributes')
          .eq('id', teamId)
          .single();

        if (!error && data?.player_attributes) {
          teamConfig = data.player_attributes as Record<string, PlayerAttribute[]>;
          setTeamAttributes(teamConfig);
        }
      }

      // Step 2: Build attributes with team config available
      let baseAttributes: PlayerAttribute[] = [];
      
      if (player.type === 'goalkeeper') {
        baseAttributes = STANDARD_PLAYER_ATTRIBUTES
          .filter(attr => attr.group === 'goalkeeping')
          .map((attr) => ({
            id: attr.id,
            name: attr.name,
            group: attr.group,
            value: 5,
            enabled: true
          }));
      } else {
        // For outfield players, include all non-goalkeeping attributes
        baseAttributes = STANDARD_PLAYER_ATTRIBUTES
          .filter(attr => attr.group !== 'goalkeeping')
          .map((attr) => ({
            id: attr.id,
            name: attr.name,
            group: attr.group,
            value: 5,
            enabled: true
          }));
      }
      
      // Apply team configuration if available (only affects enabled/disabled state)
      if (teamConfig) {
        const teamConfigFlat = Object.values(teamConfig).flat();
        baseAttributes = baseAttributes.map(baseAttr => {
          const teamAttr = teamConfigFlat.find(ta => ta.id === baseAttr.id || ta.name === baseAttr.name);
          return teamAttr ? { ...baseAttr, enabled: teamAttr.enabled } : baseAttr;
        });
      }
      
      // Apply player's saved values if they exist
      if (player.attributes && player.attributes.length > 0) {
        const savedAttrs = player.attributes;
        baseAttributes = baseAttributes.map(baseAttr => {
          const savedAttr = savedAttrs.find(sa => sa.id === baseAttr.id || sa.name === baseAttr.name);
          return savedAttr ? { ...baseAttr, value: savedAttr.value, enabled: savedAttr.enabled } : baseAttr;
        });
        
        // Add any custom attributes from player that aren't in standard list
        const customAttrs = savedAttrs.filter(sa => 
          !baseAttributes.some(ba => ba.id === sa.id || ba.name === sa.name)
        );
        baseAttributes = [...baseAttributes, ...customAttrs];
      }
      
      // Filter out disabled attributes (hidden by team configuration)
      baseAttributes = baseAttributes.filter(attr => attr.enabled);
      
      setAttributes(baseAttributes);
      setActiveTab(player.type === 'goalkeeper' ? 'goalkeeping' : 'technical');
    };

    initializeAttributes();
  }, [isOpen, player, teamId]);

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
      <DialogContent className="sm:max-w-[600px] h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>
            Player Attributes - {player.name}
          </DialogTitle>
        </DialogHeader>
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full flex-1 flex flex-col min-h-0">
          <TabsList className="grid w-full grid-cols-4 shrink-0">
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
              <TabsContent key={group} value={group} className="h-full m-0 data-[state=active]:flex data-[state=active]:flex-col">
                <ScrollArea className="h-full pr-4">
                  <div className="space-y-6 pb-2">
                    {getAttributesByGroup(group).length === 0 ? (
                      <div className="text-center py-4 text-muted-foreground">
                        No {group} attributes defined.
                      </div>
                    ) : (
                      getAttributesByGroup(group).map(attribute => (
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
                      ))
                    )}
                  </div>
                </ScrollArea>
              </TabsContent>
            ))}
          </div>
        </Tabs>

        <DialogFooter className="mt-4 pt-4 border-t shrink-0">
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
