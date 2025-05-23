
import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Player, PlayerAttribute } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { DEFAULT_PLAYER_ATTRIBUTES } from '@/types/team';
import { ScrollArea } from '@/components/ui/scroll-area';

interface PlayerAttributesModalProps {
  player: Player;
  isOpen: boolean;
  onClose: () => void;
  onSave: (attributes: PlayerAttribute[]) => void;
}

export const PlayerAttributesModal: React.FC<PlayerAttributesModalProps> = ({
  player,
  isOpen,
  onClose,
  onSave
}) => {
  const { toast } = useToast();
  const [attributes, setAttributes] = useState<PlayerAttribute[]>([]);
  const [activeTab, setActiveTab] = useState<string>(player.type === 'goalkeeper' ? 'goalkeeping' : 'technical');
  
  // Initialize attributes when modal opens
  useEffect(() => {
    if (isOpen) {
      // If player has attributes, use those
      if (player.attributes && player.attributes.length > 0) {
        setAttributes([...player.attributes]);
      } else {
        // Otherwise, create default attributes based on player type
        let defaultAttributes: PlayerAttribute[] = [];
        
        // Always add goalkeeping attributes for goalkeepers
        if (player.type === 'goalkeeper') {
          defaultAttributes = [
            ...DEFAULT_PLAYER_ATTRIBUTES.goalkeeping.map((name, index) => ({
              id: `gk-${index}`,
              name,
              group: "goalkeeping" as const,
              value: 5,
              enabled: true
            }))
          ];
        } else {
          // For outfield players, add technical, physical, and mental attributes
          defaultAttributes = [
            ...DEFAULT_PLAYER_ATTRIBUTES.technical.map((name, index) => ({
              id: `tech-${index}`,
              name,
              group: "technical" as const,
              value: 5,
              enabled: true
            })),
            ...DEFAULT_PLAYER_ATTRIBUTES.physical.map((name, index) => ({
              id: `phys-${index}`,
              name,
              group: "physical" as const,
              value: 5,
              enabled: true
            })),
            ...DEFAULT_PLAYER_ATTRIBUTES.mental.map((name, index) => ({
              id: `ment-${index}`,
              name,
              group: "mental" as const,
              value: 5,
              enabled: true
            }))
          ];
          
          // Optionally add goalkeeping attributes for outfield players (disabled by default)
          defaultAttributes = [
            ...defaultAttributes,
            ...DEFAULT_PLAYER_ATTRIBUTES.goalkeeping.map((name, index) => ({
              id: `gk-${index}`,
              name,
              group: "goalkeeping" as const,
              value: 5,
              enabled: false
            }))
          ];
        }
        
        setAttributes(defaultAttributes);
      }
    }
  }, [isOpen, player.attributes, player.type]);

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
