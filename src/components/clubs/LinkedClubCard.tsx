
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Building, Users } from 'lucide-react';
import { Club } from '@/types/index';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface ClubOfficial {
  id: string;
  role: string;
  user_id: string;
  profile?: {
    name: string;
    email: string;
  };
}

interface LinkedClubCardProps {
  club: Club;
}

export const LinkedClubCard: React.FC<LinkedClubCardProps> = ({ club }) => {
  const [officials, setOfficials] = useState<ClubOfficial[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadClubOfficials();
  }, [club.id]);

  const loadClubOfficials = async () => {
    try {
      const { data, error } = await supabase
        .from('club_officials')
        .select(`
          id,
          role,
          user_id,
          profiles!club_officials_user_id_fkey (
            name,
            email
          )
        `)
        .eq('club_id', club.id);

      if (error) throw error;

      const officials = data?.map(official => ({
        id: official.id,
        role: official.role,
        user_id: official.user_id,
        profile: official.profiles ? {
          name: official.profiles.name || 'Unknown',
          email: official.profiles.email || ''
        } : undefined
      })) || [];

      setOfficials(officials);
    } catch (error) {
      console.error('Error loading club officials:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="border-dashed opacity-75">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 flex items-center justify-center rounded bg-muted">
            {club.logoUrl ? (
              <img 
                src={club.logoUrl} 
                alt={`${club.name} logo`}
                className="w-8 h-8 object-contain rounded"
              />
            ) : (
              <Building className="h-6 w-6 text-muted-foreground" />
            )}
          </div>
          <div className="flex-1">
            <CardTitle className="flex items-center gap-2">
              {club.name}
              <Badge variant="outline" className="text-xs">
                Linked Club
              </Badge>
            </CardTitle>
            {club.referenceNumber && (
              <p className="text-sm text-muted-foreground">
                Ref: {club.referenceNumber}
              </p>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex justify-between items-center text-sm">
            <span className="text-muted-foreground">Your Role:</span>
            <Badge variant="outline" className="capitalize text-xs">
              {club.userRole?.replace('_', ' ') || 'Member'}
            </Badge>
          </div>
          
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Club Officials</span>
            </div>
            
            {loading ? (
              <div className="text-sm text-muted-foreground">Loading officials...</div>
            ) : officials.length > 0 ? (
              <div className="space-y-2">
                {officials.map((official) => (
                  <div key={official.id} className="flex items-center gap-3">
                    <Avatar className="h-6 w-6">
                      <AvatarFallback className="text-xs">
                        {official.profile?.name?.charAt(0)?.toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {official.profile?.name || 'Unknown'}
                      </p>
                      <p className="text-xs text-muted-foreground capitalize">
                        {official.role.replace('_', ' ')}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">No officials found</div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
