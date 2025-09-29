import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ClubForm } from '@/components/clubs/ClubForm';
import { ClubStaffManagement } from '@/components/clubs/ClubStaffManagement';
import { YearGroupManagement } from '@/components/clubs/YearGroupManagement';
import { ClubTeamLinking } from '@/components/clubs/ClubTeamLinking';
import { ClubPlayerManagement } from '@/components/clubs/ClubPlayerManagement';
import { ClubCalendarEvents } from '@/components/clubs/ClubCalendarEvents';
import { ClubAnalytics } from '@/components/clubs/ClubAnalytics';
import { useAuth } from '@/contexts/AuthContext';
import { useAuthorization } from '@/contexts/AuthorizationContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Club, SubscriptionType } from '@/types/index';
import { PlusCircle, Building2, Users, Crown, Eye, Settings } from 'lucide-react';

interface ClubWithStats extends Club {
  teamCount?: number;
  playerCount?: number;
  officialCount?: number;
  officials?: Array<{
    id: string;
    user_id: string;
    role: string;
    profiles: {
      name: string;
      email: string;
    };
  }>;
}

const EnhancedClubManagement = () => {
  const { clubs, refreshUserData, user } = useAuth();
  const { isGlobalAdmin, isClubAdmin } = useAuthorization();
  const [allClubs, setAllClubs] = useState<ClubWithStats[]>([]);
  const [selectedClubData, setSelectedClubData] = useState<ClubWithStats | null>(null);
  const [isClubDialogOpen, setIsClubDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const { toast } = useToast();

  const isAdminUser = isGlobalAdmin || isClubAdmin();

  useEffect(() => {
    loadClubs();
  }, [clubs, isAdminUser]);

  const loadClubs = async () => {
    try {
      setLoading(true);
      
      if (isAdminUser) {
        // Load all clubs with stats for admin users
        const { data, error } = await supabase
          .from('clubs')
          .select(`
            *,
            club_teams (count),
            club_officials (
              id,
              user_id, 
              role,
              profiles (name, email)
            )
          `);

        if (error) throw error;

        const clubsWithStats: ClubWithStats[] = (data || []).map(club => ({
          id: club.id,
          name: club.name,
          referenceNumber: club.reference_number,
          serialNumber: club.serial_number,
          subscriptionType: (club.subscription_type as SubscriptionType) || 'free',
          logoUrl: club.logo_url,
          createdAt: club.created_at,
          updatedAt: club.updated_at,
          teamCount: club.club_teams?.[0]?.count || 0,
          officialCount: club.club_officials?.length || 0,
          officials: club.club_officials || []
        }));

        setAllClubs(clubsWithStats);
      } else {
        // Load user's clubs only for regular users
        const userClubs: ClubWithStats[] = clubs.map(club => ({
          ...club,
          teamCount: 0,
          officialCount: 0,
          officials: []
        }));

        setAllClubs(userClubs);
      }
    } catch (error) {
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

  const handleCreateClub = async (clubData: Partial<Club>) => {
    try {
      const { data, error } = await supabase.from('clubs').insert([{
        name: clubData.name,
        reference_number: clubData.referenceNumber,
        subscription_type: clubData.subscriptionType || 'free',
        logo_url: clubData.logoUrl,
      }]).select().single();

      if (error) throw error;

      // Add user as club admin
      if (data) {
        await supabase.from('user_clubs').insert({
          user_id: user.id,
          club_id: data.id,
          role: 'club_admin'
        });
      }

      await refreshUserData();
      loadClubs();
      setIsClubDialogOpen(false);
      
      toast({
        title: 'Club created',
        description: `${clubData.name} has been created successfully.`,
      });
    } catch (error: any) {
      console.error('Error creating club:', error);
      toast({
        title: 'Error creating club',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleClubClick = (club: ClubWithStats) => {
    if (isAdminUser) {
      setSelectedClubData(club);
      setActiveTab('overview');
    }
  };

  const canManageClub = (club: ClubWithStats) => {
    return isGlobalAdmin || isClubAdmin(club.id);
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  const ClubCard = ({ club }: { club: ClubWithStats }) => (
    <Card 
      key={club.id} 
      className={`hover:shadow-lg transition-all cursor-pointer ${
        isAdminUser ? 'hover:border-primary/50' : ''
      }`}
      onClick={() => handleClubClick(club)}
    >
      <CardHeader>
        <div className="flex items-center gap-3">
          {isAdminUser && (
            <Crown className="h-4 w-4 text-yellow-600" />
          )}
          <Avatar className="h-12 w-12">
            {club.logoUrl ? (
              <AvatarImage src={club.logoUrl} alt={club.name} />
            ) : (
              <AvatarFallback>
                <Building2 className="h-6 w-6" />
              </AvatarFallback>
            )}
          </Avatar>
          <div className="flex-1">
            <CardTitle className="flex items-center gap-2">
              {club.name}
              {isAdminUser && (
                <Badge variant="outline">Admin Access</Badge>
              )}
            </CardTitle>
            <CardDescription>
              {club.subscriptionType.charAt(0).toUpperCase() + club.subscriptionType.slice(1)} Plan
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {/* Club Officials */}
          <div>
            <h4 className="text-sm font-medium mb-2 flex items-center gap-1">
              <Users className="h-4 w-4" />
              Club Officials ({club.officialCount || 0})
            </h4>
            <div className="space-y-1">
              {club.officials?.slice(0, 3).map((official) => (
                <div key={official.id} className="flex items-center gap-2 text-sm">
                  <Avatar className="h-6 w-6">
                    <AvatarFallback className="text-xs">
                      {getInitials(official.profiles?.name || 'Unknown')}
                    </AvatarFallback>
                  </Avatar>
                  <span className="flex-1">{official.profiles?.name || 'Unknown'}</span>
                  <Badge variant="secondary" className="text-xs">
                    {official.role}
                  </Badge>
                </div>
              ))}
              {(club.officials?.length || 0) > 3 && (
                <div className="text-xs text-muted-foreground">
                  +{(club.officials?.length || 0) - 3} more officials
                </div>
              )}
              {(!club.officials || club.officials.length === 0) && (
                <div className="text-sm text-muted-foreground">No officials assigned</div>
              )}
            </div>
          </div>

          {/* Stats */}
          {club.teamCount !== undefined && (
            <div className="flex justify-between items-center text-sm border-t pt-3">
              <span className="text-muted-foreground">Teams:</span>
              <Badge variant="outline">{club.teamCount}</Badge>
            </div>
          )}

          {club.serialNumber && (
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Serial:</span>
              <span className="font-mono text-xs">{club.serialNumber}</span>
            </div>
          )}
        </div>
      </CardContent>

      {isAdminUser && (
        <div className="px-6 pb-4">
          <Button 
            variant="outline" 
            size="sm" 
            className="w-full"
            onClick={(e) => {
              e.stopPropagation();
              handleClubClick(club);
            }}
          >
            <Settings className="mr-2 h-4 w-4" />
            Manage Club
          </Button>
        </div>
      )}
    </Card>
  );

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
            <p>Loading clubs...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (selectedClubData && isAdminUser) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button 
                variant="outline" 
                onClick={() => setSelectedClubData(null)}
              >
                ← Back to Clubs
              </Button>
              <div className="flex items-center gap-3">
                <Avatar className="h-12 w-12">
                  {selectedClubData.logoUrl ? (
                    <AvatarImage src={selectedClubData.logoUrl} alt={selectedClubData.name} />
                  ) : (
                    <AvatarFallback>
                      <Building2 className="h-6 w-6" />
                    </AvatarFallback>
                  )}
                </Avatar>
                <div>
                  <h1 className="text-2xl font-bold">{selectedClubData.name}</h1>
                  <p className="text-muted-foreground">Club Management</p>
                </div>
              </div>
            </div>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-6">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="teams">Teams</TabsTrigger>
              <TabsTrigger value="players">Players</TabsTrigger>
              <TabsTrigger value="staff">Staff</TabsTrigger>
              <TabsTrigger value="calendar">Calendar</TabsTrigger>
              <TabsTrigger value="analytics">Analytics</TabsTrigger>
            </TabsList>
            
            <TabsContent value="overview">
              <ClubStaffManagement clubId={selectedClubData.id} />
            </TabsContent>
            
            <TabsContent value="teams">
              <ClubTeamLinking clubId={selectedClubData.id} />
            </TabsContent>
            
            <TabsContent value="players">
              <ClubPlayerManagement clubId={selectedClubData.id} />
            </TabsContent>
            
            <TabsContent value="staff">
              <ClubStaffManagement clubId={selectedClubData.id} />
            </TabsContent>
            
            <TabsContent value="calendar">
              <ClubCalendarEvents clubId={selectedClubData.id} />
            </TabsContent>
            
            <TabsContent value="analytics">
              <ClubAnalytics clubId={selectedClubData.id} />
            </TabsContent>
          </Tabs>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              {isAdminUser && <Crown className="h-6 w-6 text-yellow-600" />}
              Club Management
              {isAdminUser && <Badge variant="outline">Admin View</Badge>}
            </h1>
            <p className="text-muted-foreground">
              {isAdminUser 
                ? `View and manage all clubs (${allClubs.length} clubs)`
                : 'View club information and officials'}
            </p>
          </div>
          {isAdminUser && (
            <Dialog open={isClubDialogOpen} onOpenChange={setIsClubDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Add Club
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                  <DialogTitle>Create New Club</DialogTitle>
                  <DialogDescription>
                    Add a new club to the platform.
                  </DialogDescription>
                </DialogHeader>
                <ClubForm 
                  club={null}
                  onSubmit={handleCreateClub}
                  onCancel={() => setIsClubDialogOpen(false)}
                />
              </DialogContent>
            </Dialog>
          )}
        </div>

        {allClubs.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center">
              <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-semibold mb-2">No Clubs Found</h3>
              <p className="text-muted-foreground mb-4">
                {isAdminUser 
                  ? "No clubs have been created yet. Get started by adding the first club!"
                  : "You're not associated with any clubs yet."
                }
              </p>
              {isAdminUser && (
                <Button onClick={() => setIsClubDialogOpen(true)}>
                  <PlusCircle className="h-4 w-4 mr-2" />
                  Create First Club
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <>
            {!isAdminUser && (
              <Card className="bg-blue-50 border-blue-200">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <Eye className="h-5 w-5 text-blue-600" />
                    <div>
                      <h3 className="font-medium text-blue-900">View Only Access</h3>
                      <p className="text-sm text-blue-700">
                        You can view club information and officials. Contact a club administrator for management access.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
            
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {allClubs.map((club) => (
                <ClubCard key={club.id} club={club} />
              ))}
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
};

export default EnhancedClubManagement;