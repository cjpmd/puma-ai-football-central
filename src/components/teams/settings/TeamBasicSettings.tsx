
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TeamLogoSettings } from './TeamLogoSettings';
import { Team } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface TeamBasicSettingsProps {
  team: Team;
  onUpdate: (teamData: Partial<Team>) => void;
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
    gameFormat: team.gameFormat || '11-a-side',
    seasonStart: team.seasonStart || '',
    seasonEnd: team.seasonEnd || '',
    managerName: team.managerName || '',
    managerEmail: team.managerEmail || '',
    managerPhone: team.managerPhone || '',
  });

  const { toast } = useToast();

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Update team data immediately for live preview
    if (['name', 'ageGroup', 'gameFormat', 'seasonStart', 'seasonEnd'].includes(field)) {
      onUpdate({ [field]: value });
    }
  };

  const handleSaveBasicSettings = async () => {
    try {
      console.log('Saving basic team settings:', formData);
      
      // Update the team basic information
      const { error: teamError } = await supabase
        .from('teams')
        .update({
          name: formData.name,
          age_group: formData.ageGroup,
          game_format: formData.gameFormat,
          season_start: formData.seasonStart,
          season_end: formData.seasonEnd,
          manager_name: formData.managerName,
          manager_email: formData.managerEmail,
          manager_phone: formData.managerPhone,
          updated_at: new Date().toISOString()
        })
        .eq('id', team.id);

      if (teamError) {
        console.error('Team update error:', teamError);
        throw teamError;
      }

      // Update the team data in parent component
      onUpdate({
        name: formData.name,
        ageGroup: formData.ageGroup,
        gameFormat: formData.gameFormat as any,
        seasonStart: formData.seasonStart,
        seasonEnd: formData.seasonEnd,
      });

      toast({
        title: 'Settings saved',
        description: 'Team basic settings have been updated successfully.',
      });
    } catch (error: any) {
      console.error('Error saving basic settings:', error);
      toast({
        title: 'Error saving settings',
        description: error.message || 'Failed to save team settings',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Team Logo */}
      <TeamLogoSettings team={team} onUpdate={onUpdate} />

      {/* Basic Information */}
      <Card>
        <CardHeader>
          <CardTitle>Basic Information</CardTitle>
          <CardDescription>
            Configure your team's basic details and season information.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="team-name">Team Name</Label>
              <Input
                id="team-name"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="Enter team name"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="age-group">Age Group</Label>
              <Input
                id="age-group"
                value={formData.ageGroup}
                onChange={(e) => handleInputChange('ageGroup', e.target.value)}
                placeholder="e.g., U16, Senior"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="game-format">Game Format</Label>
            <Select value={formData.gameFormat} onValueChange={(value) => handleInputChange('gameFormat', value)}>
              <SelectTrigger>
                <SelectValue />
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="season-start">Season Start</Label>
              <Input
                id="season-start"
                type="date"
                value={formData.seasonStart}
                onChange={(e) => handleInputChange('seasonStart', e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="season-end">Season End</Label>
              <Input
                id="season-end"
                type="date"
                value={formData.seasonEnd}
                onChange={(e) => handleInputChange('seasonEnd', e.target.value)}
              />
            </div>
          </div>

          <div className="flex justify-end pt-4">
            <Button 
              onClick={handleSaveBasicSettings}
              disabled={isSaving}
              className="bg-puma-blue-500 hover:bg-puma-blue-600"
            >
              {isSaving ? 'Saving...' : 'Save Basic Settings'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Manager Information */}
      <Card>
        <CardHeader>
          <CardTitle>Manager Information</CardTitle>
          <CardDescription>
            Contact details for the team manager.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="manager-name">Manager Name</Label>
            <Input
              id="manager-name"
              value={formData.managerName}
              onChange={(e) => handleInputChange('managerName', e.target.value)}
              placeholder="Enter manager name"
            />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="manager-email">Manager Email</Label>
              <Input
                id="manager-email"
                type="email"
                value={formData.managerEmail}
                onChange={(e) => handleInputChange('managerEmail', e.target.value)}
                placeholder="manager@example.com"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="manager-phone">Manager Phone</Label>
              <Input
                id="manager-phone"
                value={formData.managerPhone}
                onChange={(e) => handleInputChange('managerPhone', e.target.value)}
                placeholder="Enter phone number"
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
