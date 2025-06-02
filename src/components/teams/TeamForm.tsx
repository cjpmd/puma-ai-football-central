
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Team, Club, GameFormat, SubscriptionType } from '@/types/index';
import { LogoUpload } from '@/components/shared/LogoUpload';

interface TeamFormProps {
  team?: Team | null;
  clubs: Club[];
  onSubmit: (teamData: Partial<Team>) => void;
  onCancel: () => void;
}

export const TeamForm: React.FC<TeamFormProps> = ({ team, clubs, onSubmit, onCancel }) => {
  const [formData, setFormData] = useState({
    name: team?.name || '',
    ageGroup: team?.ageGroup || '',
    seasonStart: team?.seasonStart || '',
    seasonEnd: team?.seasonEnd || '',
    clubId: team?.clubId || '',
    gameFormat: (team?.gameFormat || '11-a-side') as GameFormat,
    subscriptionType: (team?.subscriptionType || 'free') as SubscriptionType,
    logoUrl: team?.logoUrl || null
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const submitData = {
      ...formData,
      clubId: formData.clubId === 'independent' ? null : formData.clubId
    };
    onSubmit(submitData);
  };

  const handleLogoChange = (logoUrl: string | null) => {
    setFormData(prev => ({ ...prev, logoUrl }));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{team ? 'Edit Team' : 'Create New Team'}</CardTitle>
        <CardDescription>
          {team ? 'Update your team details' : 'Add a new team to your organization'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Logo Upload */}
          {team && (
            <LogoUpload
              currentLogoUrl={formData.logoUrl}
              onLogoChange={handleLogoChange}
              entityType="team"
              entityId={team.id}
              entityName={formData.name || 'Team'}
            />
          )}

          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Team Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Enter team name"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="ageGroup">Age Group</Label>
              <Input
                id="ageGroup"
                value={formData.ageGroup}
                onChange={(e) => setFormData(prev => ({ ...prev, ageGroup: e.target.value }))}
                placeholder="e.g., U12, U15, Senior"
                required
              />
            </div>
          </div>

          {/* Season Dates */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="seasonStart">Season Start</Label>
              <Input
                id="seasonStart"
                type="date"
                value={formData.seasonStart}
                onChange={(e) => setFormData(prev => ({ ...prev, seasonStart: e.target.value }))}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="seasonEnd">Season End</Label>
              <Input
                id="seasonEnd"
                type="date"
                value={formData.seasonEnd}
                onChange={(e) => setFormData(prev => ({ ...prev, seasonEnd: e.target.value }))}
                required
              />
            </div>
          </div>

          {/* Club Selection */}
          <div className="space-y-2">
            <Label htmlFor="club">Club</Label>
            <Select 
              value={formData.clubId || 'independent'} 
              onValueChange={(value) => setFormData(prev => ({ ...prev, clubId: value === 'independent' ? null : value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a club (optional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="independent">Independent team (No club)</SelectItem>
                {clubs.map((club) => (
                  <SelectItem key={club.id} value={club.id}>
                    {club.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">
              Linking to a club allows for shared management and resources.
            </p>
          </div>

          {/* Game Format */}
          <div className="space-y-2">
            <Label htmlFor="gameFormat">Game Format</Label>
            <Select 
              value={formData.gameFormat} 
              onValueChange={(value: GameFormat) => setFormData(prev => ({ ...prev, gameFormat: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select game format" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="11-a-side">11v11</SelectItem>
                <SelectItem value="9-a-side">9v9</SelectItem>
                <SelectItem value="7-a-side">7v7</SelectItem>
                <SelectItem value="5-a-side">5v5</SelectItem>
                <SelectItem value="4-a-side">4v4</SelectItem>
                <SelectItem value="3-a-side">3v3</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Subscription Type */}
          <div className="space-y-2">
            <Label htmlFor="subscriptionType">Subscription Type</Label>
            <Select 
              value={formData.subscriptionType} 
              onValueChange={(value: SubscriptionType) => 
                setFormData(prev => ({ ...prev, subscriptionType: value }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select subscription type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="free">Free</SelectItem>
                <SelectItem value="premium">Premium</SelectItem>
                <SelectItem value="pro">Professional</SelectItem>
                <SelectItem value="analytics_plus">Analytics Plus</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button type="submit" className="bg-puma-blue-500 hover:bg-puma-blue-600">
              {team ? 'Update Team' : 'Create Team'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};
