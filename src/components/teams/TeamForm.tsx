
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Club, GameFormat, SubscriptionType, Team } from '@/types';

interface TeamFormProps {
  team: Team | null;
  clubs: Club[];
  onSubmit: (data: Partial<Team>) => void;
  onCancel: () => void;
}

export const TeamForm: React.FC<TeamFormProps> = ({
  team,
  clubs,
  onSubmit,
  onCancel
}) => {
  const [formData, setFormData] = useState<Partial<Team>>({
    name: team?.name || '',
    ageGroup: team?.ageGroup || '',
    seasonStart: team?.seasonStart || new Date().toISOString().split('T')[0],
    seasonEnd: team?.seasonEnd || new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0],
    clubId: team?.clubId || undefined,
    subscriptionType: team?.subscriptionType || 'free',
    gameFormat: team?.gameFormat || '7-a-side',
    performanceCategories: team?.performanceCategories || [],
    kitIcons: team?.kitIcons || {
      home: '',
      away: '',
      training: '',
      goalkeeper: ''
    }
  });

  const handleChange = (field: keyof Partial<Team>, value: any) => {
    setFormData({
      ...formData,
      [field]: value
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const handleClubChange = (value: string) => {
    // Convert "independent" back to undefined for the database
    const clubId = value === 'independent' ? undefined : value;
    handleChange('clubId', clubId);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 py-4">
      <div className="grid grid-cols-1 gap-4">
        <div className="space-y-2">
          <Label htmlFor="name">Team Name</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => handleChange('name', e.target.value)}
            placeholder="e.g. Ajax U12 Lions"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="ageGroup">Age Group</Label>
          <Input
            id="ageGroup"
            value={formData.ageGroup}
            onChange={(e) => handleChange('ageGroup', e.target.value)}
            placeholder="e.g. Under 12"
            required
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="seasonStart">Season Start</Label>
            <Input
              id="seasonStart"
              type="date"
              value={formData.seasonStart?.toString().split('T')[0]}
              onChange={(e) => handleChange('seasonStart', e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="seasonEnd">Season End</Label>
            <Input
              id="seasonEnd"
              type="date"
              value={formData.seasonEnd?.toString().split('T')[0]}
              onChange={(e) => handleChange('seasonEnd', e.target.value)}
              required
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="club">Club</Label>
          <Select 
            value={formData.clubId || 'independent'}
            onValueChange={handleClubChange}
          >
            <SelectTrigger id="club">
              <SelectValue placeholder="Select a club (optional)" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="independent">Independent (No Club)</SelectItem>
              {clubs.map((club) => (
                <SelectItem key={club.id} value={club.id}>
                  {club.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="gameFormat">Game Format</Label>
          <Select 
            value={formData.gameFormat}
            onValueChange={(value) => handleChange('gameFormat', value as GameFormat)}
            required
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
          <Label htmlFor="subscriptionType">Subscription Type</Label>
          <Select 
            value={formData.subscriptionType}
            onValueChange={(value) => handleChange('subscriptionType', value as SubscriptionType)}
            required
          >
            <SelectTrigger id="subscriptionType">
              <SelectValue placeholder="Select subscription type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="free">Free</SelectItem>
              <SelectItem value="analytics_plus">Analytics Plus</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex justify-end space-x-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" className="bg-puma-blue-500 hover:bg-puma-blue-600">
          {team ? 'Update Team' : 'Create Team'}
        </Button>
      </div>
    </form>
  );
};
