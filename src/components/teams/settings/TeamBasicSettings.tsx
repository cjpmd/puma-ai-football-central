import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LocationInput } from '@/components/ui/location-input';
import { Team } from '@/types/team';
import { YearGroup } from '@/types/index';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Info } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

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
  // Check if team belongs to a club and load year group info
  useEffect(() => {
    const checkClubMembership = async () => {
      if (team.clubId) {
        setIsClubTeam(true);
        
        // Load year group if team has one
        if ((team as any).yearGroupId) {
          try {
            const { data, error } = await supabase
              .from('year_groups')
              .select('*')
              .eq('id', (team as any).yearGroupId)
              .single();

            if (!error && data) {
              // Transform database response to match YearGroup interface
              const transformedYearGroup = {
                id: data.id,
                name: data.name,
                ageYear: data.age_year,
                playingFormat: data.playing_format,
                softPlayerLimit: data.soft_player_limit,
                description: data.description,
                clubId: data.club_id,
                createdAt: data.created_at,
                updatedAt: data.updated_at
              };
              setYearGroup(transformedYearGroup);
            }
          } catch (error) {
            console.error('Error loading year group:', error);
          }
        }
      } else {
        setIsClubTeam(false);
        setYearGroup(null);
      }
    };

    checkClubMembership();
  }, [team.clubId, (team as any).yearGroupId]);
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

  const [yearGroup, setYearGroup] = useState<YearGroup | null>(null);
  const [isClubTeam, setIsClubTeam] = useState(false);

  const handleInputChange = (field: string, value: any) => {
    try {
      console.log('TeamBasicSettings: Changing field', field, 'to', value);
      const updatedData = { ...formData, [field]: value };
      setFormData(updatedData);
      // Don't call onUpdate here - only when saving
    } catch (error) {
      console.error('Error in handleInputChange:', error);
      toast.error('Failed to update field');
    }
  };

  const handleHomeLocationSelect = (location: { lat: number; lng: number; address: string }) => {
    console.log('Location selected:', location);
    const updatedData = {
      ...formData,
      homeLocation: location.address,
      homeLatitude: location.lat,
      homeLongitude: location.lng
    };
    setFormData(updatedData);
    // Don't call onUpdate here - only when saving
  };

  const handleSave = async () => {
    try {
      console.log('Saving team data:', formData);
      
      // Call parent's onUpdate with form data first
      onUpdate(formData);
      
      const { error } = await supabase
        .from('teams')
        .update({
          name: formData.name,
          age_group: formData.ageGroup,
          game_format: formData.gameFormat,
          game_duration: formData.gameDuration,
          season_start: formData.seasonStart,
          season_end: formData.seasonEnd,
          manager_name: formData.managerName,
          manager_email: formData.managerEmail,
          manager_phone: formData.managerPhone,
          home_location: formData.homeLocation,
          home_latitude: formData.homeLatitude,
          home_longitude: formData.homeLongitude,
          updated_at: new Date().toISOString()
        })
        .eq('id', team.id);

      if (error) {
        console.error('Error saving team:', error);
        toast.error('Failed to save team settings');
        return;
      }

      console.log('Team saved successfully');
      toast.success('Team settings saved successfully');
      // Don't call onSave() which would close the modal
    } catch (error) {
      console.error('Error saving team:', error);
      toast.error('Failed to save team settings');
    }
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
                disabled={isClubTeam && !!yearGroup}
                className={isClubTeam && yearGroup ? 'bg-muted' : ''}
              />
              {isClubTeam && yearGroup && (
                <p className="text-xs text-muted-foreground mt-1">
                  Age group is managed by the year group: <strong>{yearGroup.name}</strong>
                </p>
              )}
              {isClubTeam && !yearGroup && (
                <Alert className="mt-2">
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    This team is part of a club but not assigned to a year group. 
                    Contact your club administrator to assign this team to a year group for standardized age group management.
                  </AlertDescription>
                </Alert>
              )}
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
            <form onSubmit={(e) => e.preventDefault()}>
              <LocationInput
                value={formData.homeLocation}
                onChange={(value) => handleInputChange('homeLocation', value)}
                onLocationSelect={handleHomeLocationSelect}
                placeholder="Enter home ground address or nearby street"
                className="mt-1"
              />
            </form>
            <p className="text-xs text-muted-foreground mt-1">
              This will be used as the default location for home games. If you can't find your exact location, try typing a nearby street or postcode.
            </p>
            {formData.homeLatitude && formData.homeLongitude && (
              <p className="text-xs text-green-600 mt-1">
                ✓ Location coordinates saved: {Number(formData.homeLatitude).toFixed(6)}, {Number(formData.homeLongitude).toFixed(6)}
              </p>
            )}
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
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>
    </div>
  );
};
