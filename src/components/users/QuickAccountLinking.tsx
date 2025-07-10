
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Search, Link2 } from 'lucide-react';

interface Player {
  id: string;
  name: string;
  team_id: string;
}

export const QuickAccountLinking: React.FC = () => {
  const { user, teams } = useAuth();
  const [players, setPlayers] = useState<Player[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPlayer, setSelectedPlayer] = useState<string>('');
  const [linkType, setLinkType] = useState<'self' | 'parent' | 'guardian'>('self');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadPlayers();
  }, [teams]);

  const loadPlayers = async () => {
    if (!teams || teams.length === 0) return;

    try {
      const teamIds = teams.map(t => t.id);
      const { data: playersData, error } = await supabase
        .from('players')
        .select('id, name, team_id')
        .in('team_id', teamIds)
        .eq('status', 'active');

      if (error) throw error;

      console.log('Available players for linking:', playersData);
      setPlayers(playersData || []);
      
      // Auto-select Andrew McDonald if found
      const andrewMcdonald = playersData?.find(p => 
        p.name.toLowerCase().includes('andrew') && 
        p.name.toLowerCase().includes('mcdonald')
      );
      
      if (andrewMcdonald) {
        console.log('Found Andrew McDonald:', andrewMcdonald);
        setSelectedPlayer(andrewMcdonald.id);
        setSearchTerm(andrewMcdonald.name);
      }
    } catch (error) {
      console.error('Error loading players:', error);
      toast.error('Failed to load players');
    }
  };

  const handleLinkAccount = async () => {
    if (!selectedPlayer || !user?.id) {
      toast.error('Please select a player to link');
      return;
    }

    setIsLoading(true);
    try {
      console.log('Linking account:', {
        userId: user.id,
        playerId: selectedPlayer,
        relationship: linkType
      });

      // Link user to player
      const { error: linkError } = await supabase
        .from('user_players')
        .insert({
          user_id: user.id,
          player_id: selectedPlayer,
          relationship: linkType
        });

      if (linkError) {
        if (linkError.code === '23505') {
          toast.error('This account is already linked to this player');
          return;
        }
        throw linkError;
      }

      // Update user roles
      const { data: profile } = await supabase
        .from('profiles')
        .select('roles')
        .eq('id', user.id)
        .single();

      const currentRoles = profile?.roles || [];
      const newRole = linkType === 'self' ? 'player' : 'parent';
      
      if (!currentRoles.includes(newRole)) {
        await supabase
          .from('profiles')
          .update({ roles: [...currentRoles, newRole] })
          .eq('id', user.id);
      }

      toast.success(`Account successfully linked to ${players.find(p => p.id === selectedPlayer)?.name}!`);
      
      // Refresh the page to show the new availability colors
      window.location.reload();
      
    } catch (error: any) {
      console.error('Error linking account:', error);
      toast.error(error.message || 'Failed to link account');
    } finally {
      setIsLoading(false);
    }
  };

  const filteredPlayers = players.filter(player =>
    player.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Link2 className="h-5 w-5" />
          Link Your Account
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Search for Player</Label>
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by player name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Select Player</Label>
          <Select value={selectedPlayer} onValueChange={setSelectedPlayer}>
            <SelectTrigger>
              <SelectValue placeholder="Choose player" />
            </SelectTrigger>
            <SelectContent>
              {filteredPlayers.map(player => (
                <SelectItem key={player.id} value={player.id}>
                  {player.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Relationship</Label>
          <Select value={linkType} onValueChange={(value: any) => setLinkType(value)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="self">This is my account (I am the player)</SelectItem>
              <SelectItem value="parent">I am the parent</SelectItem>
              <SelectItem value="guardian">I am the guardian</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Button 
          onClick={handleLinkAccount}
          disabled={!selectedPlayer || isLoading}
          className="w-full"
        >
          {isLoading ? 'Linking...' : 'Link Account'}
        </Button>

        <div className="text-sm text-muted-foreground">
          <p>Current user: {user?.email}</p>
          <p>This will link your account to the selected player for availability notifications.</p>
        </div>
      </CardContent>
    </Card>
  );
};
