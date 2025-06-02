
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Team, GameFormat, SubscriptionType } from '@/types';
import { TeamLogoSettings } from './TeamLogoSettings';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

interface Club {
  id: string;
  name: string;
}

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
  const [clubs, setClubs] = useState<Club[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { refreshUserData } = useAuth();

  useEffect(() => {
    loadClubs();
  }, []);

  const loadClubs = async () => {
    try {
      const { data, error } = await supabase
        .from('clubs')
        .select('id, name')
        .order('name');

      if (error) throw error;
      setClubs(data || []);
    } catch (error: any) {
      console.error('Error loading clubs:', error);
      toast({
        title: 'Error',
        description: 'Failed to load clubs',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClubChange = async (clubId: string) => {
    try {
      const newClubId = clubId === 'independent' ? null : clubId;
      
      console.log('Changing club from', team.clubId, 'to', newClubId);
      
      // Update the team's club_id in database immediately
      const { error } = await supabase
        .from('teams')
        .update({ club_id: newClubId })
        .eq('id', team.id);

      if (error) throw error;

      // Remove existing club_teams link
      await supabase
        .from('club_teams')
        .delete()
        .eq('team_id', team.id);

      // If linking to a club, add to club_teams table
      if (newClubId) {
        const { error: linkError } = await supabase
          .from('club_teams')
          .insert({ club_id: newClubId, team_id: team.id });

        // Ignore error if already exists
        if (linkError && !linkError.message.includes('duplicate')) {
          throw linkError;
        }
      }

      // Update local state
      onUpdate({ clubId: newClubId });
      
      // Refresh user data to get updated teams/clubs
      await refreshUserData();
      
      toast({
        title: 'Club Link Updated',
        description: newClubId ? 'Team linked to club successfully' : 'Team unlinked from club',
      });
    } catch (error: any) {
      console.error('Error updating club link:', error);
      toast({
        title: 'Error',
        description: 'Failed to update club link',
        variant: 'destructive',
      });
    }
  };

  const getClubName = (clubId: string | null) => {
    if (!clubId) return 'Independent';
    const club = clubs.find(c => c.id === clubId);
    return club?.name || 'Unknown Club';
  };

  return (
    <div className="space-y-6">
      {/* Logo Settings */}
      <TeamLogoSettings team={team} onUpdate={onUpdate} />

      {/* Basic Information */}
      <Card>
        <CardHeader>
          <CardTitle>Basic Information</CardTitle>
          <CardDescription>
            Update your team's basic information and club association
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
                disabled={team.isReadOnly}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="ageGroup">Age Group</Label>
              <Input
                id="ageGroup"
                value={team.ageGroup}
                onChange={(e) => onUpdate({ ageGroup: e.target.value })}
                placeholder="e.g., U12, U15, Senior"
                disabled={team.isReadOnly}
              />
            </div>
          </div>

          {/* Club Association */}
          <div className="space-y-2">
            <Label htmlFor="club">Club Association</Label>
            {loading ? (
              <div className="text-sm text-muted-foreground">Loading clubs...</div>
            ) : (
              <Select 
                value={team.clubId || 'independent'} 
                onValueChange={handleClubChange}
                disabled={team.isReadOnly}
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
            )}
            <div className="text-sm text-muted-foreground">
              Current: <span className="font-medium">{getClubName(team.clubId)}</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Linking to a club allows for shared management and resources.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="seasonStart">Season Start</Label>
              <Input
                id="seasonStart"
                type="date"
                value={team.seasonStart}
                onChange={(e) => onUpdate({ seasonStart: e.target.value })}
                disabled={team.isReadOnly}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="seasonEnd">Season End</Label>
              <Input
                id="seasonEnd"
                type="date"
                value={team.seasonEnd}
                onChange={(e) => onUpdate({ seasonEnd: e.target.value })}
                disabled={team.isReadOnly}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="gameFormat">Game Format</Label>
              <Select 
                value={team.gameFormat} 
                onValueChange={(value: GameFormat) => onUpdate({ gameFormat: value })}
                disabled={team.isReadOnly}
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
                disabled={team.isReadOnly}
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
                  disabled={team.isReadOnly}
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
                  disabled={team.isReadOnly}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="managerPhone">Manager Phone</Label>
                <Input
                  id="managerPhone"
                  value={team.managerPhone || ''}
                  onChange={(e) => onUpdate({ managerPhone: e.target.value })}
                  placeholder="Phone number"
                  disabled={team.isReadOnly}
                />
              </div>
            </div>
          </div>

          {!team.isReadOnly && (
            <div className="flex justify-end pt-4">
              <Button onClick={onSave} disabled={isSaving}>
                {isSaving ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
