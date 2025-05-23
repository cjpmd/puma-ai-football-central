
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Team, GameFormat } from '@/types/team';
import { Plus, X } from 'lucide-react';

interface TeamBasicSettingsProps {
  team: Team;
  onUpdate: (teamData: Partial<Team>) => void;
}

export const TeamBasicSettings: React.FC<TeamBasicSettingsProps> = ({
  team,
  onUpdate
}) => {
  const [formData, setFormData] = useState({
    name: team.name,
    ageGroup: team.ageGroup,
    seasonStart: team.seasonStart,
    seasonEnd: team.seasonEnd,
    gameFormat: team.gameFormat,
    performanceCategories: [...team.performanceCategories],
    clubReferenceNumber: team.clubReferenceNumber || ''
  });
  
  const [newCategory, setNewCategory] = useState('');

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const addPerformanceCategory = () => {
    if (newCategory.trim() && !formData.performanceCategories.includes(newCategory.trim())) {
      const updated = [...formData.performanceCategories, newCategory.trim()];
      setFormData(prev => ({ ...prev, performanceCategories: updated }));
      setNewCategory('');
    }
  };

  const removePerformanceCategory = (category: string) => {
    const updated = formData.performanceCategories.filter(c => c !== category);
    setFormData(prev => ({ ...prev, performanceCategories: updated }));
  };

  const handleSave = () => {
    onUpdate(formData);
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="teamName">Team Name</Label>
          <Input
            id="teamName"
            value={formData.name}
            onChange={(e) => handleInputChange('name', e.target.value)}
            placeholder="Enter team name"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="ageGroup">Age Group</Label>
          <Input
            id="ageGroup"
            value={formData.ageGroup}
            onChange={(e) => handleInputChange('ageGroup', e.target.value)}
            placeholder="e.g. U18, 2006 Born"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Season Dates</Label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="seasonStart">Season Start</Label>
            <Input
              id="seasonStart"
              type="date"
              value={formData.seasonStart?.toString().split('T')[0]}
              onChange={(e) => handleInputChange('seasonStart', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="seasonEnd">Season End</Label>
            <Input
              id="seasonEnd"
              type="date"
              value={formData.seasonEnd?.toString().split('T')[0]}
              onChange={(e) => handleInputChange('seasonEnd', e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="gameFormat">Game Format</Label>
        <Select 
          value={formData.gameFormat}
          onValueChange={(value) => handleInputChange('gameFormat', value as GameFormat)}
        >
          <SelectTrigger id="gameFormat">
            <SelectValue placeholder="Select game format" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="3-a-side">3-a-side</SelectItem>
            <SelectItem value="4-a-side">4-a-side</SelectItem>
            <SelectItem value="5-a-side">5-a-side</SelectItem>
            <SelectItem value="7-a-side">7-a-side</SelectItem>
            <SelectItem value="9-a-side">9-a-side</SelectItem>
            <SelectItem value="11-a-side">11-a-side</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Performance Categories</Label>
        <div className="flex flex-wrap gap-2 mb-2">
          {formData.performanceCategories.map((category) => (
            <Badge key={category} variant="secondary" className="flex items-center gap-1">
              {category}
              <X 
                className="h-3 w-3 cursor-pointer hover:text-red-500" 
                onClick={() => removePerformanceCategory(category)}
              />
            </Badge>
          ))}
        </div>
        <div className="flex gap-2">
          <Input
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
            placeholder="Add performance category"
            onKeyPress={(e) => e.key === 'Enter' && addPerformanceCategory()}
          />
          <Button type="button" variant="outline" size="sm" onClick={addPerformanceCategory}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="clubRef">Club Reference Number</Label>
        <Input
          id="clubRef"
          value={formData.clubReferenceNumber}
          onChange={(e) => handleInputChange('clubReferenceNumber', e.target.value)}
          placeholder="Enter club reference number to connect"
        />
        <p className="text-sm text-muted-foreground">
          Enter the unique reference number provided by your club to associate this team.
        </p>
      </div>

      <div className="flex justify-end">
        <Button onClick={handleSave} className="bg-puma-blue-500 hover:bg-puma-blue-600">
          Save Changes
        </Button>
      </div>
    </div>
  );
};
