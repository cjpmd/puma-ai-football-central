
import { useState, useEffect, useRef } from 'react';
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

interface FormData {
  name: string;
  ageGroup: string;
  gameFormat: string;
  gameDuration: string;
  seasonStart: string;
  seasonEnd: string;
  clubId: string;
  managerName: string;
  managerEmail: string;
  managerPhone: string;
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
  const [isFormInitialized, setIsFormInitialized] = useState(false);
  const formInitRef = useRef(false);
  
  const [formData, setFormData] = useState<FormData>({
    name: '',
    ageGroup: '',
    gameFormat: '11-a-side',
    gameDuration: '90',
    seasonStart: '',
    seasonEnd: '',
    clubId: '',
    managerName: '',
    managerEmail: '',
    managerPhone: '',
  });

  // Initialize form data only once
  useEffect(() => {
    if (!formInitRef.current && team.id) {
      console.log('Initializing form data from team:', team.name);
      setFormData({
        name: team.name || '',
        ageGroup: team.ageGroup || '',
        gameFormat: team.gameFormat || '11-a-side',
        gameDuration: String(team.gameDuration || 90),
        seasonStart: team.seasonStart || '',
        seasonEnd: team.seasonEnd || '',
        clubId: team.clubId || '',
        managerName: team.managerName || '',
        managerEmail: team.managerEmail || '',
        managerPhone: team.managerPhone || '',
      });
      setIsFormInitialized(true);
      formInitRef.current = true;
    }
  }, [team.id]);

  useEffect(() => {
    loadAvailableClubs();
  }, []);

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

  const handleInputChange = (field: string, value: string) => {
    console.log('Input change:', field, value);
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // For non-duration fields, provide immediate feedback
    if (field !== 'gameDuration') {
      const updateValue = field === 'clubId' && value === 'independent' ? null : value;
      onUpdate({ [field]: updateValue });
    }
  };

  const handleGameDurationChange = (value: string) => {
    console.log('Game duration change:', value);
    setFormData(prev => ({ ...prev, gameDuration: value }));
  };

  const handleGameDurationBlur = () => {
    console.log('Game duration blur, value:', formData.gameDuration);
    const numValue = parseInt(formData.gameDuration);
    
    if (!isNaN(numValue) && numValue > 0) {
      const clampedValue = Math.max(1, Math.min(180, numValue));
      console.log('Clamped game duration:', clampedValue);
      
      // Update form data with clamped value
      setFormData(prev => ({ ...prev, gameDuration: String(clampedValue) }));
      
      // Update parent with the numeric value
      onUpdate({ gameDuration: clampedValue });
    }
  };

  const handleSaveBasicSettings = async () => {
    try {
      console.log('Saving basic team settings:', formData);
      
      // Validate game duration
      const gameDurationNum = parseInt(formData.gameDuration);
      if (isNaN(gameDurationNum) || gameDurationNum <= 0) {
        toast({
          title: 'Invalid game duration',
          description: 'Please enter a valid game duration (1-180 minutes)',
          variant: 'destructive',
        });
        return;
      }
      
      const clampedDuration = Math.max(1, Math.min(180, gameDurationNum));
      const clubIdForDb = formData.clubId === 'independent' ? null : formData.clubId;
      
      console.log('Saving to database with game duration:', clampedDuration);
      
      // Update the team in database
      const { error: teamError } = await supabase
        .from('teams')
        .update({
          name: formData.name,
          age_group: formData.ageGroup,
          game_format: formData.gameFormat,
          game_duration: clampedDuration,
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

      console.log('Team updated successfully in database');

      // Handle club linking
      if (clubIdForDb !== team.clubId) {
        await supabase
          .from('club_teams')
          .delete()
          .eq('team_id', team.id);

        if (clubIdForDb) {
          const { error: linkError } = await supabase
            .from('club_teams')
            .insert({ club_id: clubIdForDb, team_id: team.id });

          if (linkError && !linkError.message.includes('duplicate')) {
            console.error('Error linking team to club:', linkError);
          }
        }
      }

      // Update parent component with the saved data
      const updatedTeamData = {
        name: formData.name,
        ageGroup: formData.ageGroup,
        gameFormat: formData.gameFormat as any,
        gameDuration: clampedDuration,
        seasonStart: formData.seasonStart,
        seasonEnd: formData.seasonEnd,
        clubId: clubIdForDb || undefined,
        managerName: formData.managerName,
        managerEmail: formData.managerEmail,
        managerPhone: formData.managerPhone,
      };
      
      console.log('Updating parent component with:', updatedTeamData);
      onUpdate(updatedTeamData);

      // Update form data to reflect any clamped values
      setFormData(prev => ({ ...prev, gameDuration: String(clampedDuration) }));

      // Refresh user data
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

  // Don't render form until it's initialized
  if (!isFormInitialized) {
    return <div>Loading...</div>;
  }

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

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                onChange={(e) => handleGameDurationChange(e.target.value)}
                onBlur={handleGameDurationBlur}
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
