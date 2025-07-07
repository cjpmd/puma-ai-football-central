
import { useState, useEffect } from 'react';
import { MobileLayout } from '@/components/layout/MobileLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Search, Plus, Settings, Building2, Users, Trophy } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface Club {
  id: string;
  name: string;
  logo_url?: string;
  subscription_type: string;
  team_count: number;
  serial_number?: string;
  reference_number?: string;
}

export default function ClubManagementMobile() {
  const [clubs, setClubs] = useState<Club[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    loadClubs();
  }, [user]);

  const loadClubs = async () => {
    try {
      if (!user) return;
      
      const { data, error } = await supabase
        .from('clubs')
        .select(`
          id,
          name,
          logo_url,
          subscription_type,
          serial_number,
          reference_number,
          club_teams(count)
        `)
        .order('name');

      if (error) throw error;
      
      const transformedClubs: Club[] = (data || []).map((club: any) => ({
        id: club.id,
        name: club.name,
        logo_url: club.logo_url,
        subscription_type: club.subscription_type || 'free',
        team_count: club.club_teams?.[0]?.count || 0,
        serial_number: club.serial_number,
        reference_number: club.reference_number
      }));
      
      setClubs(transformedClubs);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to load clubs',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredClubs = clubs.filter(club =>
    club.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    club.subscription_type.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getSubscriptionColor = (type: string) => {
    switch (type) {
      case 'premium':
        return 'bg-yellow-500';
      case 'pro':
        return 'bg-blue-500';
      case 'basic':
        return 'bg-green-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  return (
    <MobileLayout>
      <div className="space-y-4">
        {/* Search and Actions */}
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search clubs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 h-12"
            />
          </div>
          <Button size="sm" className="h-12 px-3">
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        {/* Clubs List */}
        <div className="space-y-3">
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
              <p className="mt-2 text-sm text-muted-foreground">Loading clubs...</p>
            </div>
          ) : filteredClubs.length === 0 ? (
            <div className="text-center py-8">
              <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No clubs found</p>
            </div>
          ) : (
            filteredClubs.map((club) => (
              <Card key={club.id} className="touch-manipulation">
                <CardContent className="p-4">
                  <div className="flex items-center space-x-4">
                    <Avatar className="h-12 w-12">
                      {club.logo_url ? (
                        <AvatarImage src={club.logo_url} alt={club.name} />
                      ) : (
                        <AvatarFallback className="text-lg font-medium">
                          {getInitials(club.name)}
                        </AvatarFallback>
                      )}
                    </Avatar>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h3 className="font-medium text-lg truncate">{club.name}</h3>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <Settings className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="flex items-center space-x-2 mt-1">
                        <Badge className={`text-white text-xs ${getSubscriptionColor(club.subscription_type)}`}>
                          {club.subscription_type}
                        </Badge>
                        <div className="flex items-center text-sm text-muted-foreground">
                          <Trophy className="h-3 w-3 mr-1" />
                          <span>{club.team_count} teams</span>
                        </div>
                      </div>
                      {club.serial_number && (
                        <div className="text-sm text-muted-foreground mt-1">
                          #{club.serial_number}
                        </div>
                      )}
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
