import { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Player, PlayerAttribute } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { DEFAULT_PLAYER_ATTRIBUTES } from '@/types/team';
import { Brain, Zap, Heart, Shield } from 'lucide-react';

interface PlayerAttributesModalProps {
  player: Player;
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
}

export const PlayerAttributesModal: React.FC<PlayerAttributesModalProps> = ({
  player,
  isOpen,
  onClose,
  onSave
}) => {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [attributes, setAttributes] = useState<PlayerAttribute[]>([]);
  const [activeTab, setActiveTab] = useState<string>(player.type === 'goalkeeper' ? 'goalkeeping' : 'technical');
  
  // Initialize attributes when modal opens
  useEffect(() => {
    if (isOpen && player) {
      if (player.attributes && player.attributes.length > 0) {
        setAttributes([...player.attributes]);
      } else {
        // Create default attributes based on player type
        let defaultAttributes: PlayerAttribute[] = [];
        
        if (player.type === 'goalkeeper') {
          defaultAttributes = [
            ...DEFAULT_PLAYER_ATTRIBUTES.filter(attr => attr.group === 'goalkeeping').map((attr, index) => ({
              id: `gk-${index}`,
              name: attr.name,
              group: "goalkeeping" as const,
              value: 5,
              enabled: true
            }))
          ];
        } else {
          defaultAttributes = [
            ...DEFAULT_PLAYER_ATTRIBUTES.filter(attr => attr.group === 'technical').map((attr, index) => ({
              id: `tech-${index}`,
              name: attr.name,
              group: "technical" as const,
              value: 5,
              enabled: true
            })),
            ...DEFAULT_PLAYER_ATTRIBUTES.filter(attr => attr.group === 'physical').map((attr, index) => ({
              id: `phys-${index}`,
              name: attr.name,
              group: "physical" as const,
              value: 5,
              enabled: true
            })),
            ...DEFAULT_PLAYER_ATTRIBUTES.filter(attr => attr.group === 'mental').map((attr, index) => ({
              id: `ment-${index}`,
              name: attr.name,
              group: "mental" as const,
              value: 5,
              enabled: true
            }))
          ];
          
          // Add goalkeeping attributes (disabled by default)
          defaultAttributes = [
            ...defaultAttributes,
            ...DEFAULT_PLAYER_ATTRIBUTES.filter(attr => attr.group === 'goalkeeping').map((attr, index) => ({
              id: `gk-${index}`,
              name: attr.name,
              group: "goalkeeping" as const,
              value: 5,
              enabled: false
            }))
          ];
        }
        
        setAttributes(defaultAttributes);
      }
      
      setActiveTab(player.type === 'goalkeeper' ? 'goalkeeping' : 'technical');
    }
  }, [isOpen, player]);

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

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('players')
        .update({
          attributes: attributes as any
        })
        .eq('id', player.id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Player attributes updated successfully'
      });
      
      onSave();
      onClose();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update attributes',
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  const getAttributeColor = (value: number) => {
    if (value >= 8) return 'text-green-600';
    if (value >= 6) return 'text-blue-600';
    if (value >= 4) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getGroupIcon = (group: string) => {
    switch (group) {
      case 'technical': return <Brain className="h-4 w-4" />;
      case 'physical': return <Zap className="h-4 w-4" />;
      case 'mental': return <Heart className="h-4 w-4" />;
      case 'goalkeeping': return <Shield className="h-4 w-4" />;
      default: return null;
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="bottom" className="h-[90vh] flex flex-col">
        <SheetHeader className="border-b pb-4">
          <SheetTitle>Player Attributes - {player.name}</SheetTitle>
        </SheetHeader>
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
          <TabsList className="grid w-full grid-cols-4 mx-4 mt-4">
            <TabsTrigger value="technical" className="flex items-center gap-1">
              <Brain className="h-3 w-3" />
              <span className="text-xs">Tech</span>
              <span className="text-xs">({getGroupAverage('technical')})</span>
            </TabsTrigger>
            <TabsTrigger value="physical" className="flex items-center gap-1">
              <Zap className="h-3 w-3" />
              <span className="text-xs">Phys</span>
              <span className="text-xs">({getGroupAverage('physical')})</span>
            </TabsTrigger>
            <TabsTrigger value="mental" className="flex items-center gap-1">
              <Heart className="h-3 w-3" />
              <span className="text-xs">Ment</span>
              <span className="text-xs">({getGroupAverage('mental')})</span>
            </TabsTrigger>
            <TabsTrigger value="goalkeeping" className="flex items-center gap-1">
              <Shield className="h-3 w-3" />
              <span className="text-xs">GK</span>
              <span className="text-xs">({getGroupAverage('goalkeeping')})</span>
            </TabsTrigger>
          </TabsList>

          <div className="flex-1 min-h-0">
            {['technical', 'physical', 'mental', 'goalkeeping'].map(group => (
              <TabsContent key={group} value={group} className="h-full data-[state=active]:flex data-[state=active]:flex-col m-0">
                <ScrollArea className="flex-1 px-4">
                  <Card className="mt-4">
                    <CardContent className="pt-6">
                      {getAttributesByGroup(group).length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                          <div className="flex flex-col items-center gap-2">
                            {getGroupIcon(group)}
                            <p>No {group} attributes defined</p>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-6">
                          {getAttributesByGroup(group).map(attribute => (
                            <div key={attribute.id} className="space-y-3">
                              <div className="flex items-center justify-between">
                                <Label 
                                  htmlFor={attribute.id} 
                                  className={`font-medium text-sm ${attribute.enabled ? '' : 'text-muted-foreground'}`}
                                >
                                  {attribute.name}
                                </Label>
                                <div className="flex items-center gap-2">
                                  <span className={`font-bold text-lg ${getAttributeColor(attribute.value)}`}>
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
                                className={`${attribute.enabled ? '' : 'opacity-50'}`}
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

        <div className="border-t p-4 flex gap-3">
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
