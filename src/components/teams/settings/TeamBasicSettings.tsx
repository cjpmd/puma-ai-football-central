
import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Club, GameFormat, Team } from '@/types';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Building, Unlink } from 'lucide-react';

interface TeamBasicSettingsProps {
  team: Team;
  onUpdate: (teamData: Partial<Team>) => void;
}

export const TeamBasicSettings = ({ team, onUpdate }: TeamBasicSettingsProps) => {
  const [name, setName] = useState(team.name || '');
  const [ageGroup, setAgeGroup] = useState(team.ageGroup || '');
  const [seasonStart, setSeasonStart] = useState(team.seasonStart?.split('T')[0] || '');
  const [seasonEnd, setSeasonEnd] = useState(team.seasonEnd?.split('T')[0] || '');
  const [gameFormat, setGameFormat] = useState<GameFormat>(team.gameFormat || '7-a-side');
  const [clubId, setClubId] = useState<string | undefined>(team.clubId);
  const [clubs, setClubs] = useState<Club[]>([]);
  const [linkingClub, setLinkingClub] = useState(false);
  const [linkedClub, setLinkedClub] = useState<Club | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadClubs();
    
    // If team has a clubId, load the club details
    if (team.clubId) {
      loadClubDetails(team.clubId);
    }
  }, [team.clubId]);

  const loadClubs = async () => {
    try {
      const { data, error } = await supabase
        .from('clubs')
        .select('*')
        .order('name');

      if (error) throw error;
      
      // Transform database fields to match interface
      const transformedClubs: Club[] = (data || []).map(club => ({
        id: club.id,
        name: club.name,
        referenceNumber: club.reference_number || '',
        serialNumber: club.serial_number || '',
        teams: [], // Will be populated when needed
        subscriptionType: club.subscription_type as any || 'free',
        createdAt: club.created_at,
        updatedAt: club.updated_at
      }));
      
      setClubs(transformedClubs);
    } catch (error) {
      console.error('Error loading clubs:', error);
      toast({
        title: 'Error',
        description: 'Failed to load clubs list',
        variant: 'destructive',
      });
    }
  };

  const loadClubDetails = async (id: string) => {
    try {
      const { data, error } = await supabase
        .from('clubs')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      
      // Transform database fields to match interface
      const transformedClub: Club = {
        id: data.id,
        name: data.name,
        referenceNumber: data.reference_number || '',
        serialNumber: data.serial_number || '',
        teams: [], // Will be populated when needed
        subscriptionType: data.subscription_type as any || 'free',
        createdAt: data.created_at,
        updatedAt: data.updated_at
      };
      
      setLinkedClub(transformedClub);
    } catch (error) {
      console.error('Error loading club details:', error);
      setLinkedClub(null);
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const updatedTeam: Partial<Team> = {
        name,
        ageGroup,
        seasonStart,
        seasonEnd,
        gameFormat,
        clubId
      };

      await onUpdate(updatedTeam);
      toast({
        title: 'Settings Updated',
        description: 'Team basic settings have been saved successfully.',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update team settings',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleLinkClub = async (id?: string) => {
    setLinkingClub(true);
    try {
      const updatedTeam: Partial<Team> = {
        clubId: id === 'independent' ? undefined : id
      };

      await onUpdate(updatedTeam);
      
      if (id && id !== 'independent') {
        await loadClubDetails(id);
        toast({
          title: 'Club Linked',
          description: 'Team has been successfully linked to the club.',
        });
      } else {
        setLinkedClub(null);
        toast({
          title: 'Club Unlinked',
          description: 'Team is now independent (no club association).',
        });
      }
      
      setClubId(id === 'independent' ? undefined : id);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to link team to club',
        variant: 'destructive',
      });
    } finally {
      setLinkingClub(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Team Identity</h3>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Team Name</Label>
            <Input 
              id="name" 
              value={name} 
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter team name"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="ageGroup">Age Group</Label>
            <Input 
              id="ageGroup" 
              value={ageGroup} 
              onChange={(e) => setAgeGroup(e.target.value)}
              placeholder="e.g. Under 12"
            />
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-medium">Season Dates</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="seasonStart">Season Start</Label>
            <Input 
              id="seasonStart" 
              type="date" 
              value={seasonStart} 
              onChange={(e) => setSeasonStart(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="seasonEnd">Season End</Label>
            <Input 
              id="seasonEnd" 
              type="date" 
              value={seasonEnd} 
              onChange={(e) => setSeasonEnd(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-medium">Game Format</h3>
        
        <div className="space-y-2">
          <Label htmlFor="gameFormat">Format</Label>
          <Select 
            value={gameFormat} 
            onValueChange={(value) => setGameFormat(value as GameFormat)}
          >
            <SelectTrigger>
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
      </div>
      
      <div className="space-y-4 pt-4 border-t">
        <h3 className="text-lg font-medium">Club Affiliation</h3>
        
        {linkedClub ? (
          <div className="bg-muted rounded-md p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Building className="h-6 w-6 mr-2 text-primary" />
                <div>
                  <h4 className="font-medium">{linkedClub.name}</h4>
                  <div className="flex items-center text-sm text-muted-foreground">
                    <span>Serial: {linkedClub.serialNumber}</span>
                    {linkedClub.referenceNumber && (
                      <span className="ml-2 border-l pl-2">Ref: {linkedClub.referenceNumber}</span>
                    )}
                  </div>
                </div>
              </div>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => handleLinkClub('independent')}
                disabled={linkingClub}
              >
                <Unlink className="h-4 w-4 mr-2" />
                Unlink Club
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="club">Link to Club</Label>
              <div className="flex gap-2">
                <Select 
                  value={clubId || "independent"}
                  onValueChange={handleLinkClub}
                  disabled={linkingClub}
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Select a club to link" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="independent">Independent (No Club)</SelectItem>
                    {clubs.map((club) => (
                      <SelectItem key={club.id} value={club.id}>
                        {club.name} {club.serialNumber && `(${club.serialNumber})`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="bg-muted/50 rounded-md p-4 text-sm text-muted-foreground">
              <p>Link to a club to access shared facilities, staff management, and other club benefits.</p>
              <p className="mt-2">
                Clubs have their own unique serial numbers. Ask your club administrator for this number if needed.
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="flex justify-end pt-4 border-t">
        <Button 
          onClick={handleSubmit} 
          disabled={loading}
          className="bg-puma-blue-500 hover:bg-puma-blue-600"
        >
          Save Changes
        </Button>
      </div>
    </div>
  );
};
