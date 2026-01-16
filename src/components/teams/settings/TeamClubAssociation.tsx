import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Building2, Link2, Unlink, Search, CheckCircle, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Team } from '@/types/team';

interface TeamClubAssociationProps {
  team: Team;
  onUpdate: (data: Partial<Team>) => void;
}

interface ClubInfo {
  id: string;
  name: string;
  serial_number: string;
  logo_url: string | null;
}

export const TeamClubAssociation: React.FC<TeamClubAssociationProps> = ({ team, onUpdate }) => {
  const [serialNumber, setSerialNumber] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [isLinking, setIsLinking] = useState(false);
  const [isUnlinking, setIsUnlinking] = useState(false);
  const [linkedClub, setLinkedClub] = useState<ClubInfo | null>(null);
  const [searchResult, setSearchResult] = useState<ClubInfo | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (team.clubId) {
      loadLinkedClub();
    }
  }, [team.clubId]);

  const loadLinkedClub = async () => {
    if (!team.clubId) return;
    
    try {
      const { data, error } = await supabase
        .from('clubs')
        .select('id, name, serial_number, logo_url')
        .eq('id', team.clubId)
        .single();

      if (error) throw error;
      setLinkedClub(data);
    } catch (error) {
      console.error('Error loading linked club:', error);
    }
  };

  const handleSearchClub = async () => {
    if (!serialNumber.trim()) {
      setSearchError('Please enter a club serial number');
      return;
    }

    setIsSearching(true);
    setSearchError(null);
    setSearchResult(null);

    try {
      const { data, error } = await supabase
        .from('clubs')
        .select('id, name, serial_number, logo_url')
        .eq('serial_number', serialNumber.trim().toUpperCase())
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          setSearchError('No club found with this serial number');
        } else {
          throw error;
        }
        return;
      }

      setSearchResult(data);
    } catch (error: any) {
      console.error('Error searching club:', error);
      setSearchError(error.message || 'Failed to search for club');
    } finally {
      setIsSearching(false);
    }
  };

  const handleLinkToClub = async () => {
    if (!searchResult) return;

    setIsLinking(true);

    try {
      // First, update the team's club_id
      const { error: teamError } = await supabase
        .from('teams')
        .update({ club_id: searchResult.id })
        .eq('id', team.id);

      if (teamError) throw teamError;

      // Then, create the club_teams relationship
      const { error: linkError } = await supabase
        .from('club_teams')
        .insert({
          club_id: searchResult.id,
          team_id: team.id
        });

      if (linkError && !linkError.message.includes('duplicate')) {
        console.warn('Club-team link may already exist:', linkError);
      }

      setLinkedClub(searchResult);
      setSearchResult(null);
      setSerialNumber('');
      onUpdate({ clubId: searchResult.id });

      toast({
        title: 'Team linked to club',
        description: `Successfully linked to ${searchResult.name}`,
      });
    } catch (error: any) {
      console.error('Error linking team to club:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to link team to club',
        variant: 'destructive',
      });
    } finally {
      setIsLinking(false);
    }
  };

  const handleUnlinkFromClub = async () => {
    if (!linkedClub) return;

    setIsUnlinking(true);

    try {
      // Remove from club_teams
      const { error: unlinkError } = await supabase
        .from('club_teams')
        .delete()
        .eq('team_id', team.id)
        .eq('club_id', linkedClub.id);

      if (unlinkError) throw unlinkError;

      // Update team's club_id to null
      const { error: teamError } = await supabase
        .from('teams')
        .update({ club_id: null })
        .eq('id', team.id);

      if (teamError) throw teamError;

      const clubName = linkedClub.name;
      setLinkedClub(null);
      onUpdate({ clubId: undefined });

      toast({
        title: 'Team unlinked from club',
        description: `Successfully unlinked from ${clubName}`,
      });
    } catch (error: any) {
      console.error('Error unlinking team from club:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to unlink team from club',
        variant: 'destructive',
      });
    } finally {
      setIsUnlinking(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building2 className="h-5 w-5" />
          Club Association
        </CardTitle>
        <CardDescription>
          Link this team to a club using the club's serial number
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {linkedClub ? (
          <div className="space-y-4">
            <Alert className="bg-green-50 border-green-200">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="ml-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {linkedClub.logo_url ? (
                      <img 
                        src={linkedClub.logo_url} 
                        alt={linkedClub.name}
                        className="w-8 h-8 rounded object-cover"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded bg-muted flex items-center justify-center">
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                      </div>
                    )}
                    <div>
                      <p className="font-medium text-green-800">{linkedClub.name}</p>
                      <p className="text-xs text-green-600">
                        Serial: {linkedClub.serial_number}
                      </p>
                    </div>
                  </div>
                </div>
              </AlertDescription>
            </Alert>
            
            <Button 
              variant="outline" 
              className="w-full text-destructive hover:text-destructive"
              onClick={handleUnlinkFromClub}
              disabled={isUnlinking}
            >
              <Unlink className="mr-2 h-4 w-4" />
              {isUnlinking ? 'Unlinking...' : 'Unlink from Club'}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="serialNumber">Club Serial Number</Label>
              <div className="flex gap-2">
                <Input
                  id="serialNumber"
                  placeholder="e.g., CLB123456"
                  value={serialNumber}
                  onChange={(e) => setSerialNumber(e.target.value.toUpperCase())}
                  className="font-mono"
                />
                <Button 
                  onClick={handleSearchClub}
                  disabled={isSearching || !serialNumber.trim()}
                >
                  <Search className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Ask your club administrator for the serial number
              </p>
            </div>

            {searchError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{searchError}</AlertDescription>
              </Alert>
            )}

            {searchResult && (
              <div className="space-y-3">
                <Alert className="bg-blue-50 border-blue-200">
                  <Building2 className="h-4 w-4 text-blue-600" />
                  <AlertDescription className="ml-2">
                    <div className="flex items-center gap-3">
                      {searchResult.logo_url ? (
                        <img 
                          src={searchResult.logo_url} 
                          alt={searchResult.name}
                          className="w-10 h-10 rounded object-cover"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded bg-muted flex items-center justify-center">
                          <Building2 className="h-5 w-5 text-muted-foreground" />
                        </div>
                      )}
                      <div>
                        <p className="font-medium text-blue-800">{searchResult.name}</p>
                        <p className="text-xs text-blue-600">
                          Serial: {searchResult.serial_number}
                        </p>
                      </div>
                    </div>
                  </AlertDescription>
                </Alert>

                <Button 
                  className="w-full"
                  onClick={handleLinkToClub}
                  disabled={isLinking}
                >
                  <Link2 className="mr-2 h-4 w-4" />
                  {isLinking ? 'Linking...' : `Link to ${searchResult.name}`}
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
