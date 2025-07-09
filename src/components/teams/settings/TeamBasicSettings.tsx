
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LocationInput } from '@/components/ui/location-input';
import { Team } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface TeamBasicSettingsProps {
  team: Team;
  onUpdate: (data: Partial<Team>) => void;
  onSave: () => void;
  isSaving: boolean;
}

export const TeamBasicSettings: React.FC<TeamBasicSettingsProps> = ({
  team,
  onUpdate,
  onSave,
  isSaving
}) => {
  const [formData, setFormData] = useState({
    name: team.name || '',
    ageGroup: team.ageGroup || '',
    gameFormat: team.gameFormat || '7-a-side',
    gameDuration: team.gameDuration || 90,
    seasonStart: team.seasonStart || '',
    seasonEnd: team.seasonEnd || '',
    managerName: team.managerName || '',
    managerEmail: team.managerEmail || '',
    managerPhone: team.managerPhone || '',
    homeLocation: team.homeLocation || '',
    homeLatitude: team.homeLatitude || null,
    homeLongitude: team.homeLongitude || null
  });

  const handleInputChange = (field: string, value: any) => {
    const updatedData = { ...formData, [field]: value };
    setFormData(updatedData);
    onUpdate(updatedData);
  };

  const handleHomeLocationSelect = (location: { lat: number; lng: number; address: string }) => {
    const updatedData = {
      ...formData,
      homeLocation: location.address,
      homeLatitude: location.lat,
      homeLongitude: location.lng
    };
    setFormData(updatedData);
    onUpdate(updatedData);
  };

  const gameFormats = ['3-a-side', '4-a-side', '5-a-side', '7-a-side', '9-a-side', '11-a-side'];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Basic Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name">Team Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="Enter team name"
              />
            </div>

            <div>
              <Label htmlFor="ageGroup">Age Group</Label>
              <Input
                id="ageGroup"
                value={formData.ageGroup}
                onChange={(e) => handleInputChange('ageGroup', e.target.value)}
                placeholder="e.g., U12, U16, Senior"
              />
            </div>

            <div>
              <Label htmlFor="gameFormat">Game Format</Label>
              <Select
                value={formData.gameFormat}
                onValueChange={(value) => handleInputChange('gameFormat', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {gameFormats.map((format) => (
                    <SelectItem key={format} value={format}>
                      {format}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="gameDuration">Game Duration (minutes)</Label>
              <Input
                id="gameDuration"
                type="number"
                min="1"
                max="180"
                value={formData.gameDuration}
                onChange={(e) => handleInputChange('gameDuration', parseInt(e.target.value) || 90)}
                placeholder="90"
              />
            </div>

            <div>
              <Label htmlFor="seasonStart">Season Start</Label>
              <Input
                id="seasonStart"
                type="date"
                value={formData.seasonStart}
                onChange={(e) => handleInputChange('seasonStart', e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="seasonEnd">Season End</Label>
              <Input
                id="seasonEnd"
                type="date"
                value={formData.seasonEnd}
                onChange={(e) => handleInputChange('seasonEnd', e.target.value)}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="homeLocation">Home Location</Label>
            <LocationInput
              value={formData.homeLocation}
              onChange={(value) => handleInputChange('homeLocation', value)}
              onLocationSelect={handleHomeLocationSelect}
              placeholder="Enter home ground address"
              className="mt-1"
            />
            <p className="text-xs text-muted-foreground mt-1">
              This will be used as the default location for home games
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Manager Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="managerName">Manager Name</Label>
              <Input
                id="managerName"
                value={formData.managerName}
                onChange={(e) => handleInputChange('managerName', e.target.value)}
                placeholder="Enter manager name"
              />
            </div>

            <div>
              <Label htmlFor="managerEmail">Manager Email</Label>
              <Input
                id="managerEmail"
                type="email"
                value={formData.managerEmail}
                onChange={(e) => handleInputChange('managerEmail', e.target.value)}
                placeholder="manager@example.com"
              />
            </div>

            <div>
              <Label htmlFor="managerPhone">Manager Phone</Label>
              <Input
                id="managerPhone"
                type="tel"
                value={formData.managerPhone}
                onChange={(e) => handleInputChange('managerPhone', e.target.value)}
                placeholder="+44 123 456 7890"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={onSave} disabled={isSaving}>
          {isSaving ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>
    </div>
  );
};
