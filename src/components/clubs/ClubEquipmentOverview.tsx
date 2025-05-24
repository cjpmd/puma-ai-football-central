
import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Package, Users } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface TeamEquipment {
  id: string;
  name: string;
  description?: string;
  quantity: number;
  condition: 'excellent' | 'good' | 'fair' | 'poor';
  teamName: string;
  teamId: string;
}

interface ClubEquipmentOverviewProps {
  clubId: string;
  clubName: string;
}

export const ClubEquipmentOverview: React.FC<ClubEquipmentOverviewProps> = ({
  clubId,
  clubName
}) => {
  const [equipment, setEquipment] = useState<TeamEquipment[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    if (clubId) {
      loadClubEquipment();
    }
  }, [clubId]);

  const loadClubEquipment = async () => {
    try {
      setLoading(true);
      console.log('Loading equipment for club:', clubId);

      // First get teams linked to this club
      const { data: clubTeams, error: clubTeamsError } = await supabase
        .from('club_teams')
        .select('team_id')
        .eq('club_id', clubId);

      if (clubTeamsError) {
        console.error('Error fetching club teams:', clubTeamsError);
        throw clubTeamsError;
      }

      if (!clubTeams || clubTeams.length === 0) {
        setEquipment([]);
        return;
      }

      const teamIds = clubTeams.map(ct => ct.team_id);

      // Get equipment for these teams
      const { data: equipmentData, error: equipmentError } = await supabase
        .from('team_equipment')
        .select(`
          id,
          name,
          description,
          quantity,
          condition,
          team_id
        `)
        .in('team_id', teamIds);

      if (equipmentError) {
        console.error('Error fetching team equipment:', equipmentError);
        throw equipmentError;
      }

      // Get team names
      const { data: teamsData, error: teamsError } = await supabase
        .from('teams')
        .select('id, name')
        .in('id', teamIds);

      if (teamsError) {
        console.error('Error fetching teams data:', teamsError);
        throw teamsError;
      }

      if (equipmentData && teamsData) {
        const equipmentItems: TeamEquipment[] = equipmentData.map(item => {
          const team = teamsData.find(t => t.id === item.team_id);
          return {
            id: item.id,
            name: item.name,
            description: item.description,
            quantity: item.quantity,
            condition: item.condition as 'excellent' | 'good' | 'fair' | 'poor',
            teamName: team?.name || 'Unknown Team',
            teamId: item.team_id,
          };
        });

        setEquipment(equipmentItems);
      } else {
        setEquipment([]);
      }
    } catch (error: any) {
      console.error('Error loading club equipment:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to load club equipment',
        variant: 'destructive',
      });
      setEquipment([]);
    } finally {
      setLoading(false);
    }
  };

  const getConditionColor = (condition: string) => {
    switch (condition) {
      case 'excellent': return 'bg-green-500';
      case 'good': return 'bg-blue-500';
      case 'fair': return 'bg-yellow-500';
      case 'poor': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getConditionLabel = (condition: string): string => {
    return condition.charAt(0).toUpperCase() + condition.slice(1);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p>Loading club equipment...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Club Equipment Overview</h3>
          <p className="text-sm text-muted-foreground">
            All equipment across teams linked to {clubName}
          </p>
        </div>
        <div className="text-sm text-muted-foreground">
          {equipment.length} equipment item{equipment.length !== 1 ? 's' : ''}
        </div>
      </div>

      {equipment.length === 0 ? (
        <Card className="border-dashed border-2">
          <CardContent className="py-8 text-center">
            <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-semibold mb-2">No Equipment Found</h3>
            <p className="text-muted-foreground mb-4">
              No equipment found in teams linked to this club. Teams can add equipment in their settings.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {equipment.map((item) => (
            <Card key={item.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{item.name}</CardTitle>
                  <Badge className={`text-white ${getConditionColor(item.condition)}`}>
                    {getConditionLabel(item.condition)}
                  </Badge>
                </div>
                <CardDescription>
                  <div className="flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    <span>{item.teamName}</span>
                  </div>
                </CardDescription>
              </CardHeader>
              <CardContent>
                {item.description && (
                  <p className="text-sm text-muted-foreground mb-2">
                    {item.description}
                  </p>
                )}
                <div className="text-sm">
                  <span className="font-medium">Quantity: </span>
                  <span>{item.quantity}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
