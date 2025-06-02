
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Team, GameFormat, SubscriptionType } from '@/types';
import { TeamLogoSettings } from './TeamLogoSettings';

interface TeamBasicSettingsProps {
  team: Team;
  onUpdate: (updates: Partial<Team>) => void;
  onSave: () => void;
  isSaving: boolean;
}

export const TeamBasicSettings: React.FC<TeamBasicSettingsProps> = ({
  team,
  onUpdate,
  onSave,
  isSaving
}) => {
  return (
    <div className="space-y-6">
      {/* Logo Settings */}
      <TeamLogoSettings team={team} onUpdate={onUpdate} />

      {/* Basic Information */}
      <Card>
        <CardHeader>
          <CardTitle>Basic Information</CardTitle>
          <CardDescription>
            Update your team's basic information
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Team Name</Label>
              <Input
                id="name"
                value={team.name}
                onChange={(e) => onUpdate({ name: e.target.value })}
                placeholder="Enter team name"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="ageGroup">Age Group</Label>
              <Input
                id="ageGroup"
                value={team.ageGroup}
                onChange={(e) => onUpdate({ ageGroup: e.target.value })}
                placeholder="e.g., U12, U15, Senior"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="seasonStart">Season Start</Label>
              <Input
                id="seasonStart"
                type="date"
                value={team.seasonStart}
                onChange={(e) => onUpdate({ seasonStart: e.target.value })}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="seasonEnd">Season End</Label>
              <Input
                id="seasonEnd"
                type="date"
                value={team.seasonEnd}
                onChange={(e) => onUpdate({ seasonEnd: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="gameFormat">Game Format</Label>
              <Select 
                value={team.gameFormat} 
                onValueChange={(value: GameFormat) => onUpdate({ gameFormat: value })}
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

            <div className="space-y-2">
              <Label htmlFor="subscriptionType">Subscription Type</Label>
              <Select 
                value={team.subscriptionType || 'free'} 
                onValueChange={(value: SubscriptionType) => onUpdate({ subscriptionType: value })}
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
          </div>

          <div className="space-y-4">
            <h4 className="font-semibold">Manager Information</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="managerName">Manager Name</Label>
                <Input
                  id="managerName"
                  value={team.managerName || ''}
                  onChange={(e) => onUpdate({ managerName: e.target.value })}
                  placeholder="Manager name"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="managerEmail">Manager Email</Label>
                <Input
                  id="managerEmail"
                  type="email"
                  value={team.managerEmail || ''}
                  onChange={(e) => onUpdate({ managerEmail: e.target.value })}
                  placeholder="manager@example.com"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="managerPhone">Manager Phone</Label>
                <Input
                  id="managerPhone"
                  value={team.managerPhone || ''}
                  onChange={(e) => onUpdate({ managerPhone: e.target.value })}
                  placeholder="Phone number"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-4">
            <Button onClick={onSave} disabled={isSaving}>
              {isSaving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
