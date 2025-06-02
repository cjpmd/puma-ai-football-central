
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Team, PlayerAttributeGroup, DEFAULT_PLAYER_ATTRIBUTES, PlayerAttribute } from '@/types/team';
import { Plus, X, Edit, Eye, EyeOff } from 'lucide-react';

interface TeamAttributeSettingsProps {
  team: Team;
  onUpdate: (teamData: Partial<Team>) => void;
}

export const TeamAttributeSettings: React.FC<TeamAttributeSettingsProps> = ({
  team,
  onUpdate
}) => {
  const getInitialAttributes = (): Record<PlayerAttributeGroup, PlayerAttribute[]> => {
    if (team.playerAttributes) {
      return team.playerAttributes;
    }
    
    // Group default attributes by their group
    const grouped: Record<PlayerAttributeGroup, PlayerAttribute[]> = {
      goalkeeping: [],
      mental: [],
      physical: [],
      technical: []
    };
    
    DEFAULT_PLAYER_ATTRIBUTES.forEach(attr => {
      grouped[attr.group].push(attr);
    });
    
    return grouped;
  };

  const [attributes, setAttributes] = useState<Record<PlayerAttributeGroup, PlayerAttribute[]>>(
    getInitialAttributes()
  );

  const [newAttribute, setNewAttribute] = useState({ group: 'technical' as PlayerAttributeGroup, name: '' });
  const [groupSettings, setGroupSettings] = useState({
    goalkeeping: true,
    mental: true,
    physical: true,
    technical: true
  });

  const addAttribute = () => {
    if (newAttribute.name.trim()) {
      const newAttr = {
        id: `${newAttribute.group}-${Date.now()}`,
        name: newAttribute.name.trim(),
        group: newAttribute.group,
        value: 5,
        enabled: true
      };
      
      setAttributes(prev => ({
        ...prev,
        [newAttribute.group]: [...prev[newAttribute.group], newAttr]
      }));
      
      setNewAttribute({ group: newAttribute.group, name: '' });
    }
  };

  const removeAttribute = (group: PlayerAttributeGroup, attributeId: string) => {
    setAttributes(prev => ({
      ...prev,
      [group]: prev[group].filter(attr => attr.id !== attributeId)
    }));
  };

  const toggleAttribute = (group: PlayerAttributeGroup, attributeId: string) => {
    setAttributes(prev => ({
      ...prev,
      [group]: prev[group].map(attr => 
        attr.id === attributeId ? { ...attr, enabled: !attr.enabled } : attr
      )
    }));
  };

  const toggleGroup = (group: PlayerAttributeGroup) => {
    const enabled = !groupSettings[group];
    setGroupSettings(prev => ({ ...prev, [group]: enabled }));
    
    setAttributes(prev => ({
      ...prev,
      [group]: prev[group].map(attr => ({ ...attr, enabled }))
    }));
  };

  const handleSave = () => {
    onUpdate({ playerAttributes: attributes });
  };

  const getGroupIcon = (group: PlayerAttributeGroup) => {
    switch (group) {
      case 'goalkeeping': return '🥅';
      case 'mental': return '🧠';
      case 'physical': return '💪';
      case 'technical': return '⚽';
      default: return '📊';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Player Attributes Configuration</h3>
          <p className="text-sm text-muted-foreground">
            Manage the attributes used to evaluate players in your team
          </p>
        </div>
        <Button onClick={handleSave} className="bg-puma-blue-500 hover:bg-puma-blue-600">
          Save Changes
        </Button>
      </div>

      {Object.entries(attributes).map(([group, attrs]) => {
        const groupKey = group as PlayerAttributeGroup;
        return (
          <Card key={group}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 capitalize">
                  <span className="text-2xl">{getGroupIcon(groupKey)}</span>
                  {group} Attributes
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={groupSettings[groupKey]}
                    onCheckedChange={() => toggleGroup(groupKey)}
                  />
                  <Label className="text-sm">
                    {groupSettings[groupKey] ? 'Enabled' : 'Disabled'}
                  </Label>
                </div>
              </div>
              <CardDescription>
                {group === 'goalkeeping' && 'Attributes specific to goalkeeper performance'}
                {group === 'mental' && 'Mental and decision-making attributes'}
                {group === 'physical' && 'Physical fitness and athletic attributes'}
                {group === 'technical' && 'Ball skills and technical abilities'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                {attrs.map((attribute) => (
                  <div key={attribute.id} className="flex items-center justify-between p-2 border rounded">
                    <div className="flex items-center gap-2 flex-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleAttribute(groupKey, attribute.id)}
                        className="p-1 h-auto"
                      >
                        {attribute.enabled ? 
                          <Eye className="h-3 w-3 text-green-600" /> : 
                          <EyeOff className="h-3 w-3 text-gray-400" />
                        }
                      </Button>
                      <span className={`text-sm ${!attribute.enabled ? 'text-gray-400 line-through' : ''}`}>
                        {attribute.name}
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeAttribute(groupKey, attribute.id)}
                      className="p-1 h-auto text-red-500 hover:text-red-700"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
              
              <div className="flex gap-2">
                <Input
                  value={newAttribute.group === groupKey ? newAttribute.name : ''}
                  onChange={(e) => setNewAttribute({ group: groupKey, name: e.target.value })}
                  placeholder={`Add new ${group} attribute`}
                  onKeyPress={(e) => e.key === 'Enter' && newAttribute.group === groupKey && addAttribute()}
                />
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm" 
                  onClick={() => {
                    setNewAttribute({ group: groupKey, name: newAttribute.name });
                    addAttribute();
                  }}
                  disabled={newAttribute.group !== groupKey || !newAttribute.name.trim()}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};
