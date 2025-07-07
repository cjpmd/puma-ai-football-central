
import { useState, useEffect } from 'react';
import { MobileLayout } from '@/components/layout/MobileLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Search, Plus, Filter, MoreVertical } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface Player {
  id: string;
  name: string;
  squad_number: number;
  position: string;
  age: number;
  availability_status: string;
}

export default function PlayerManagementMobile() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { teams } = useAuth();

  useEffect(() => {
    loadPlayers();
  }, [teams]);

  const loadPlayers = async () => {
    try {
      if (!teams || teams.length === 0) return;
      
      const { data, error } = await supabase
        .from('players')
        .select('*')
        .eq('team_id', teams[0].id)
        .order('squad_number', { ascending: true });

      if (error) throw error;
      setPlayers(data || []);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to load players',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredPlayers = players.filter(player =>
    player.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    player.position.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getAvailabilityColor = (status: string) => {
    switch (status) {
      case 'available': return 'bg-green-500';
      case 'unavailable': return 'bg-red-500';
      case 'maybe': return 'bg-yellow-500';
      default: return 'bg-gray-500';
    }
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  return (
    <MobileLayout>
      <div className="space-y-4">
        {/* Header Actions */}
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search players..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 h-12"
            />
          </div>
          <Button size="sm" variant="outline" className="h-12 px-3">
            <Filter className="h-4 w-4" />
          </Button>
          <Button size="sm" className="h-12 px-3">
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        {/* Players List */}
        <div className="space-y-3">
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
              <p className="mt-2 text-sm text-muted-foreground">Loading players...</p>
            </div>
          ) : filteredPlayers.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No players found</p>
            </div>
          ) : (
            filteredPlayers.map((player) => (
              <Card key={player.id} className="touch-manipulation">
                <CardContent className="p-4">
                  <div className="flex items-center space-x-4">
                    <div className="relative">
                      <Avatar className="h-12 w-12">
                        <AvatarFallback className="text-lg font-medium">
                          {getInitials(player.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white ${getAvailabilityColor(player.availability_status)}`} />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h3 className="font-medium text-lg truncate">{player.name}</h3>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="flex items-center space-x-2 mt-1">
                        <Badge variant="outline" className="text-xs">
                          #{player.squad_number}
                        </Badge>
                        <Badge variant="secondary" className="text-xs">
                          {player.position}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          Age {player.age}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </MobileLayout>
  );
}
