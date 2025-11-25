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
import { STANDARD_PLAYER_ATTRIBUTES } from '@/types/playerAttributes';
import { useAuthorization } from '@/contexts/AuthorizationContext';
import { Brain, Zap, Heart, Shield, Lock } from 'lucide-react';

interface PlayerAttributesModalProps {
  player: Player;
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
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
  const { isGlobalAdmin, isTeamManager, hasPermission } = useAuthorization();
  const [saving, setSaving] = useState(false);
  const [attributes, setAttributes] = useState<PlayerAttribute[]>([]);
  const [activeTab, setActiveTab] = useState<string>(player.type === 'goalkeeper' ? 'goalkeeping' : 'technical');
  const [teamAttributes, setTeamAttributes] = useState<Record<string, PlayerAttribute[]> | null>(null);
  
  const canEdit = isGlobalAdmin || isTeamManager(player.team_id) || hasPermission({ resource: 'players', action: 'manage', resourceId: player.team_id });
  
  // Initialize attributes when modal opens - fetch team config first to avoid race condition
  useEffect(() => {
    const initializeAttributes = async () => {
      if (!isOpen || !player) return;

      // Step 1: Fetch team configuration first
      let teamConfig: Record<string, PlayerAttribute[]> | null = null;
      const effectiveTeamId = teamId || player.team_id;
      
      if (effectiveTeamId) {
        const { data, error } = await supabase
          .from('teams')
          .select('player_attributes')
          .eq('id', effectiveTeamId)
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
  }, [isOpen, player, teamId, player.team_id]);

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
          <SheetTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            Player Attributes - {player.name}
            {!canEdit && <Lock className="h-4 w-4 text-muted-foreground" />}
          </SheetTitle>
        </SheetHeader>
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
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

          <div className="flex-1 min-h-0 overflow-hidden">
            {['technical', 'physical', 'mental', 'goalkeeping'].map(group => (
              <TabsContent key={group} value={group} className="h-full data-[state=active]:flex data-[state=active]:flex-col m-0 overflow-hidden">
                <ScrollArea className="flex-1 px-4">
                  <div className="space-y-4 py-4">
                    {getAttributesByGroup(group).length === 0 ? (
                      <Card>
                        <CardContent className="py-8 text-center">
                          <div className="flex flex-col items-center gap-2 text-muted-foreground">
                            {getGroupIcon(group)}
                            <p>No {group} attributes defined</p>
                          </div>
                        </CardContent>
                      </Card>
                    ) : (
                      <div className="space-y-4">
                        {getAttributesByGroup(group).map(attribute => (
                          <Card key={attribute.id}>
                            <CardContent className="pt-6">
                              <div className="space-y-3">
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
                                      disabled={!canEdit}
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
                                  disabled={!attribute.enabled || !canEdit}
                                  className={`${attribute.enabled && canEdit ? '' : 'opacity-50'}`}
                                />
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </TabsContent>
            ))}
          </div>
        </Tabs>

        <div className="border-t p-4 flex gap-3">
          <Button variant="outline" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving || !canEdit} className="flex-1">
            {saving ? 'Saving...' : canEdit ? 'Save Changes' : 'View Only'}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
};
