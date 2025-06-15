import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TeamLogoSettings } from './TeamLogoSettings';
import { Team, Club } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

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
  const { toast } = useToast();
  const { clubs, refreshUserData } = useAuth();
  const [availableClubs, setAvailableClubs] = useState<Club[]>([]);
  
  // Change: gameDuration now string for input handling
  const [formData, setFormData] = useState({
    name: team.name || '',
    ageGroup: team.ageGroup || '',
    gameFormat: team.gameFormat || '11-a-side',
    gameDuration: team.gameDuration !== undefined && team.gameDuration !== null ? String(team.gameDuration) : '90',
    seasonStart: team.seasonStart || '',
    seasonEnd: team.seasonEnd || '',
    clubId: team.clubId || '',
    managerName: team.managerName || '',
    managerEmail: team.managerEmail || '',
    managerPhone: team.managerPhone || '',
  });

  useEffect(() => {
    loadAvailableClubs();
  }, []);

  useEffect(() => {
    setFormData({
      name: team.name || '',
      ageGroup: team.ageGroup || '',
      gameFormat: team.gameFormat || '11-a-side',
      gameDuration: team.gameDuration !== undefined && team.gameDuration !== null ? String(team.gameDuration) : '90',
      seasonStart: team.seasonStart || '',
      seasonEnd: team.seasonEnd || '',
      clubId: team.clubId || '',
      managerName: team.managerName || '',
      managerEmail: team.managerEmail || '',
      managerPhone: team.managerPhone || '',
    });
  }, [team]);

  const loadAvailableClubs = async () => {
    try {
      const { data, error } = await supabase.from('clubs').select('*');
      if (error) throw error;
      
      const convertedClubs: Club[] = (data || []).map(club => ({
        id: club.id,
        name: club.name,
        referenceNumber: club.reference_number,
        serialNumber: club.serial_number,
        subscriptionType: club.subscription_type as any || 'free',
        logoUrl: club.logo_url,
        createdAt: club.created_at,
        updatedAt: club.updated_at
      }));
      
      setAvailableClubs(convertedClubs);
    } catch (error) {
      console.error('Error loading clubs:', error);
    }
  };

  // helper to normalize gameDuration to a valid number
  const parseGameDuration = (value: string | number): number => {
    const num = typeof value === "number" ? value : parseInt(value, 10);
    if (isNaN(num) || num < 1 || num > 180) return 90;
    return num;
  };

  // Accept string for gameDuration so input can be empty
  const handleInputChange = (field: string, value: string | number) => {
    // keep gameDuration as string in form state (for <Input/>)
    if (field === 'gameDuration') {
      setFormData(prev => ({ ...prev, gameDuration: String(value) }));
      // Don't call onUpdate until a valid number
      const parsed = parseGameDuration(value);
      if (!isNaN(parsed)) {
        onUpdate({ gameDuration: parsed });
      }
      return;
    }
    setFormData(prev => ({ ...prev, [field]: value }));
    if (['name', 'ageGroup', 'gameFormat', 'seasonStart', 'seasonEnd', 'clubId'].includes(field)) {
      onUpdate({ [field]: value === 'independent' ? null : value });
    }
  };

  const handleSaveBasicSettings = async () => {
    try {
      // Only save a valid integer
      const cleanGameDuration = parseGameDuration(formData.gameDuration);

      console.log('Saving basic team settings:', formData);
      
      // Convert 'independent' back to null for database storage
      const clubIdForDb = formData.clubId === 'independent' ? null : formData.clubId;
      
      // Update the team basic information
      const { error: teamError } = await supabase
        .from('teams')
        .update({
          name: formData.name,
          age_group: formData.ageGroup,
          game_format: formData.gameFormat,
          game_duration: cleanGameDuration,
          season_start: formData.seasonStart,
          season_end: formData.seasonEnd,
          club_id: clubIdForDb,
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

      // Handle club linking separately
      if (clubIdForDb !== team.clubId) {
        // Remove existing club link
        await supabase
          .from('club_teams')
          .delete()
          .eq('team_id', team.id);

        // Add new club link if specified
        if (clubIdForDb) {
          const { error: linkError } = await supabase
            .from('club_teams')
            .insert({ club_id: clubIdForDb, team_id: team.id });

          if (linkError && !linkError.message.includes('duplicate')) {
            console.error('Error linking team to club:', linkError);
          }
        }
      }

      // Update the team data in parent component
      onUpdate({
        name: formData.name,
        ageGroup: formData.ageGroup,
        gameFormat: formData.gameFormat as any,
        gameDuration: cleanGameDuration,
        seasonStart: formData.seasonStart,
        seasonEnd: formData.seasonEnd,
        clubId: clubIdForDb === 'independent' ? undefined : clubIdForDb,
        managerName: formData.managerName,
        managerEmail: formData.managerEmail,
        managerPhone: formData.managerPhone,
      });

      // Refresh user data to get updated team information
      await refreshUserData();

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

  const handleLogoUpdate = (logoData: Partial<Team>) => {
    console.log('Logo update received:', logoData);
    onUpdate(logoData);
  };

  return (
    <div className="space-y-6">
      {/* Team Logo */}
      <TeamLogoSettings team={team} onUpdate={handleLogoUpdate} />

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

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
            <div className="space-y-2">
              <Label htmlFor="game-duration">Game Duration (minutes)</Label>
              <Input
                id="game-duration"
                type="number"
                min="1"
                max="180"
                value={formData.gameDuration}
                onChange={e => handleInputChange('gameDuration', e.target.value)}
                onBlur={e => {
                  // on blur, enforce valid number in field, fallback to 90
                  const parsed = parseGameDuration(e.target.value);
                  setFormData(prev => ({ ...prev, gameDuration: String(parsed) }));
                  onUpdate({ gameDuration: parsed });
                }}
                placeholder="90"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="club-selection">Club Affiliation</Label>
              <Select value={formData.clubId || 'independent'} onValueChange={(value) => handleInputChange('clubId', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a club or leave independent" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="independent">Independent (No Club)</SelectItem>
                  {availableClubs.map((club) => (
                    <SelectItem key={club.id} value={club.id}>
                      {club.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
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
