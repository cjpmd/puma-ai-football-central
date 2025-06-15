
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
}

export const TeamBasicSettings: React.FC<TeamBasicSettingsProps> = ({
  team,
  onUpdate,
}) => {
  const { toast } = useToast();
  const { clubs, refreshUserData } = useAuth();
  const [availableClubs, setAvailableClubs] = useState<Club[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  
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
    console.log('Team prop changed, updating form data:', team);
    console.log('Team gameDuration from prop:', team.gameDuration, 'type:', typeof team.gameDuration);
    
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

  // HELPER: Always coerce value to string if possible, or fallback
  const safeGameDuration = (value: string | number | undefined | null): string => {
    if (typeof value === 'string') {
      if (!value.trim()) return "";
      if (!/^\d+$/.test(value)) return "";
      return value;
    }
    if (typeof value === "number" && !isNaN(value)) {
      return value.toString();
    }
    return "";
  };

  // helper to normalize gameDuration to a valid number
  const parseGameDuration = (value: string | number): number => {
    const num = typeof value === "number" ? value : parseInt(value, 10);
    // clamp between 1 and 180, default to 90 if not valid
    if (isNaN(num) || num < 1 || num > 180) return 90;
    return num;
  };

  // Only update local form state on input change.
  const handleInputChange = (field: string, value: string | number) => {
    console.log(`Form input changed: ${field} = ${value}`);
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSaveBasicSettings = async () => {
    setIsSaving(true);
    console.log('Starting save with form data:', formData);
    
    try {
      const cleanGameDuration = parseGameDuration(formData.gameDuration);
      const clubIdForDb = formData.clubId === 'independent' ? null : formData.clubId;
      
      console.log('Cleaned game duration:', cleanGameDuration);
      console.log('Club ID for DB:', clubIdForDb);
      
      const updateData = {
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
      };
      
      console.log('Update data being sent to Supabase:', updateData);
      
      const { data: updatedTeamData, error: teamError } = await supabase
        .from('teams')
        .update(updateData)
        .eq('id', team.id)
        .select()
        .single();

      if (teamError) {
        console.error('Supabase update error:', teamError);
        throw teamError;
      }
      
      if (!updatedTeamData) {
        throw new Error("Update failed: No data returned from Supabase.");
      }

      console.log('Supabase update successful, returned data:', updatedTeamData);

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

      // Create updated team object with proper mapping from database fields
      const updatedTeam = {
        ...team,
        name: updatedTeamData.name,
        ageGroup: updatedTeamData.age_group,
        gameFormat: updatedTeamData.game_format as any,
        gameDuration: updatedTeamData.game_duration, // This is the key fix - map from database field
        seasonStart: updatedTeamData.season_start,
        seasonEnd: updatedTeamData.season_end,
        clubId: updatedTeamData.club_id || undefined,
        managerName: updatedTeamData.manager_name,
        managerEmail: updatedTeamData.manager_email,
        managerPhone: updatedTeamData.manager_phone,
      };

      console.log('Mapped updated team object:', updatedTeam);
      
      // Notify parent component of the update first
      onUpdate(updatedTeam);

      // Don't refresh user data immediately - let the parent handle the update
      // The refreshUserData() call was causing the UI to revert before the parent could update
      
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
    } finally {
      setIsSaving(false);
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
                  // On blur, enforce a valid number and update local state
                  const parsed = parseGameDuration(e.target.value);
                  setFormData(prev => ({ ...prev, gameDuration: String(parsed) }));
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
