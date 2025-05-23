
import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Club, Team, ClubOfficial, Facility } from '@/types';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Users, MapPin, Calendar, Trophy, Settings, UserPlus } from 'lucide-react';
import { Json } from '@/integrations/supabase/types';

interface ClubDetailsModalProps {
  club: Club | null;
  isOpen: boolean;
  onClose: () => void;
}

export const ClubDetailsModal: React.FC<ClubDetailsModalProps> = ({
  club,
  isOpen,
  onClose
}) => {
  const [teams, setTeams] = useState<Team[]>([]);
  const [officials, setOfficials] = useState<ClubOfficial[]>([]);
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (club && isOpen) {
      fetchClubDetails();
    }
  }, [club, isOpen]);

  const fetchClubDetails = async () => {
    if (!club) return;
    
    setIsLoading(true);
    try {
      // Fetch teams
      const { data: teamsData, error: teamsError } = await supabase
        .from('teams')
        .select('*')
        .eq('club_id', club.id);

      if (teamsError) throw teamsError;

      // Fetch officials
      const { data: officialsData, error: officialsError } = await supabase
        .from('club_officials')
        .select(`
          *,
          profiles:user_id (name, email)
        `)
        .eq('club_id', club.id);

      if (officialsError) throw officialsError;

      // Fetch facilities
      const { data: facilitiesData, error: facilitiesError } = await supabase
        .from('facilities')
        .select('*')
        .eq('club_id', club.id);

      if (facilitiesError) throw facilitiesError;

      // Map the data to our types
      const formattedTeams: Team[] = (teamsData || []).map((team: any) => {
        const kitIconsData = team.kit_icons as Record<string, string> | null;
        const kitIcons = {
          home: kitIconsData?.home || '',
          away: kitIconsData?.away || '',
          training: kitIconsData?.training || '',
          goalkeeper: kitIconsData?.goalkeeper || '',
        };

        return {
          id: team.id,
          name: team.name,
          ageGroup: team.age_group,
          seasonStart: team.season_start,
          seasonEnd: team.season_end,
          clubId: team.club_id,
          subscriptionType: team.subscription_type,
          gameFormat: team.game_format,
          kitIcons,
          performanceCategories: team.performance_categories || [],
          managerName: team.manager_name,
          managerEmail: team.manager_email,
          managerPhone: team.manager_phone,
          createdAt: team.created_at,
          updatedAt: team.updated_at
        };
      });

      const formattedOfficials: ClubOfficial[] = (officialsData || []).map((official: any) => ({
        id: official.id,
        clubId: official.club_id,
        userId: official.user_id,
        role: official.role,
        assignedAt: official.assigned_at,
        assignedBy: official.assigned_by,
        createdAt: official.created_at,
        updatedAt: official.updated_at,
        profile: official.profiles ? {
          name: official.profiles.name,
          email: official.profiles.email
        } : undefined
      }));

      const formattedFacilities: Facility[] = (facilitiesData || []).map((facility: any) => ({
        id: facility.id,
        clubId: facility.club_id,
        name: facility.name,
        description: facility.description,
        bookableUnits: facility.bookable_units,
        createdAt: facility.created_at,
        updatedAt: facility.updated_at
      }));

      setTeams(formattedTeams);
      setOfficials(formattedOfficials);
      setFacilities(formattedFacilities);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to fetch club details',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!club) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {club.name}
            {club.serialNumber && (
              <Badge variant="outline">#{club.serialNumber}</Badge>
            )}
          </DialogTitle>
          <DialogDescription>
            Comprehensive club management and details
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="teams">Teams</TabsTrigger>
            <TabsTrigger value="officials">Officials</TabsTrigger>
            <TabsTrigger value="facilities">Facilities</TabsTrigger>
            <TabsTrigger value="staff">Staff</TabsTrigger>
            <TabsTrigger value="reports">Reports</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Teams</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{teams.length}</div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Officials</CardTitle>
                  <UserPlus className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{officials.length}</div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Facilities</CardTitle>
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{facilities.length}</div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Subscription</CardTitle>
                  <Trophy className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold capitalize">{club.subscriptionType}</div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Club Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between">
                  <span className="font-medium">Serial Number:</span>
                  <span>{club.serialNumber || 'Not assigned'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">Reference Number:</span>
                  <span>{club.referenceNumber || 'Not set'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">Subscription Type:</span>
                  <Badge variant="outline" className="capitalize">{club.subscriptionType}</Badge>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="teams" className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Teams ({teams.length})</h3>
              <Button variant="outline" size="sm">
                <UserPlus className="mr-2 h-4 w-4" />
                Add Team
              </Button>
            </div>
            
            <div className="grid gap-4">
              {teams.map((team) => (
                <Card key={team.id}>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-base">{team.name}</CardTitle>
                        <CardDescription>{team.ageGroup} • {team.gameFormat}</CardDescription>
                      </div>
                      <Badge variant="outline" className="capitalize">
                        {team.subscriptionType}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="font-medium">Manager:</span>
                        <div>{team.managerName || 'Not assigned'}</div>
                        {team.managerEmail && (
                          <div className="text-muted-foreground">{team.managerEmail}</div>
                        )}
                        {team.managerPhone && (
                          <div className="text-muted-foreground">{team.managerPhone}</div>
                        )}
                      </div>
                      <div>
                        <span className="font-medium">Season:</span>
                        <div>{team.seasonStart} - {team.seasonEnd}</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              
              {teams.length === 0 && (
                <Card className="border-dashed">
                  <CardContent className="py-8 text-center">
                    <Users className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                    <p className="text-muted-foreground">No teams linked to this club yet</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          <TabsContent value="officials" className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Club Officials ({officials.length})</h3>
              <Button variant="outline" size="sm">
                <UserPlus className="mr-2 h-4 w-4" />
                Add Official
              </Button>
            </div>
            
            <div className="grid gap-4">
              {officials.map((official) => (
                <Card key={official.id}>
                  <CardContent className="py-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-medium">{official.profile?.name || 'Unknown'}</div>
                        <div className="text-sm text-muted-foreground">{official.profile?.email}</div>
                      </div>
                      <Badge variant="outline" className="capitalize">
                        {official.role}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
              
              {officials.length === 0 && (
                <Card className="border-dashed">
                  <CardContent className="py-8 text-center">
                    <UserPlus className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                    <p className="text-muted-foreground">No officials assigned to this club yet</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          <TabsContent value="facilities" className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Facilities ({facilities.length})</h3>
              <Button variant="outline" size="sm">
                <MapPin className="mr-2 h-4 w-4" />
                Add Facility
              </Button>
            </div>
            
            <div className="grid gap-4">
              {facilities.map((facility) => (
                <Card key={facility.id}>
                  <CardHeader>
                    <CardTitle className="text-base">{facility.name}</CardTitle>
                    <CardDescription>{facility.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Bookable Units: {facility.bookableUnits}</span>
                      <Button variant="outline" size="sm">
                        <Calendar className="mr-2 h-4 w-4" />
                        View Bookings
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
              
              {facilities.length === 0 && (
                <Card className="border-dashed">
                  <CardContent className="py-8 text-center">
                    <MapPin className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                    <p className="text-muted-foreground">No facilities added to this club yet</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          <TabsContent value="staff" className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Staff Management</h3>
              <Button variant="outline" size="sm">
                <Settings className="mr-2 h-4 w-4" />
                Manage Certifications
              </Button>
            </div>
            
            <Card className="border-dashed">
              <CardContent className="py-8 text-center">
                <Settings className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                <p className="text-muted-foreground">Staff management features coming soon</p>
                <p className="text-xs text-muted-foreground mt-1">
                  This will include FA integration, coaching badges, and certifications
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="reports" className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Club Reports</h3>
              <Button variant="outline" size="sm">
                <Trophy className="mr-2 h-4 w-4" />
                Generate Report
              </Button>
            </div>
            
            <Card className="border-dashed">
              <CardContent className="py-8 text-center">
                <Trophy className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                <p className="text-muted-foreground">Reporting features coming soon</p>
                <p className="text-xs text-muted-foreground mt-1">
                  This will include event summaries, player statistics, and financial reports
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
