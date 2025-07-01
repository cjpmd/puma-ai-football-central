import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ClubForm } from '@/components/clubs/ClubForm';
import { ClubDetailsModal } from '@/components/clubs/ClubDetailsModal';
import { ClubPlayerManagement } from '@/components/clubs/ClubPlayerManagement';
import { ClubCalendarEvents } from '@/components/clubs/ClubCalendarEvents';
import { ClubAnalytics } from '@/components/clubs/ClubAnalytics';
import { ClubStaffManagement } from '@/components/clubs/ClubStaffManagement';
import { ClubTeamLinking } from '@/components/clubs/ClubTeamLinking';
import { LinkedClubCard } from '@/components/clubs/LinkedClubCard';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Club } from '@/types/index';
import { PlusCircle, Settings, Users, Building, Eye } from 'lucide-react';

export const ClubManagement = () => {
  const { clubs, refreshUserData, teams } = useAuth();
  const [linkedClubs, setLinkedClubs] = useState<Club[]>([]);
  const [isClubDialogOpen, setIsClubDialogOpen] = useState(false);
  const [selectedClub, setSelectedClub] = useState<Club | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [detailsClub, setDetailsClub] = useState<Club | null>(null);
  const [selectedClubForView, setSelectedClubForView] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'overview' | 'players' | 'calendar' | 'analytics' | 'staff' | 'teams'>('overview');
  const { toast } = useToast();

  useEffect(() => {
    loadLinkedClubs();
  }, [teams]);

  // Auto-select club if only one available
  useEffect(() => {
    const allClubs = [...clubs, ...linkedClubs];
    if (allClubs.length === 1 && !selectedClubForView) {
      setSelectedClubForView(allClubs[0].id);
    }
  }, [clubs, linkedClubs, selectedClubForView]);

  const loadLinkedClubs = async () => {
    try {
      console.log('Loading linked clubs...');
      console.log('User teams:', teams);
      
      if (!teams || teams.length === 0) {
        console.log('No teams available, skipping linked clubs load');
        setLinkedClubs([]);
        return;
      }

      // Get team IDs that the user has access to
      const teamIds = teams.map(team => team.id);
      console.log('Team IDs:', teamIds);

      // Get clubs linked to these teams
      const { data: teamClubRelations, error: teamClubError } = await supabase
        .from('club_teams')
        .select(`
          club_id,
          clubs!club_teams_club_id_fkey (
            id,
            name,
            reference_number,
            subscription_type,
            serial_number,
            logo_url,
            created_at,
            updated_at
          )
        `)
        .in('team_id', teamIds);

      if (teamClubError) {
        console.error('Error loading team-club relationships:', teamClubError);
        return;
      }

      console.log('Team-club relations:', teamClubRelations);

      // Filter out clubs that the user already owns
      const ownedClubIds = clubs.map(club => club.id);
      console.log('Owned club IDs:', ownedClubIds);

      const linkedClubsData = teamClubRelations
        ?.filter(relation => relation.clubs && !ownedClubIds.includes(relation.clubs.id))
        .map(relation => {
          const club = relation.clubs!;
          return {
            id: club.id,
            name: club.name,
            referenceNumber: club.reference_number || undefined,
            subscription_type: club.subscription_type as Club['subscription_type'],
            serialNumber: club.serial_number,
            logoUrl: club.logo_url,
            createdAt: club.created_at,
            updatedAt: club.updated_at,
            userRole: 'team_member', // User has access through team membership
            isReadOnly: true,
            teams: []
          };
        })
        .filter((club, index, self) => 
          // Remove duplicates based on club ID
          index === self.findIndex(c => c.id === club.id)
        ) || [];

      console.log('Processed linked clubs:', linkedClubsData);
      setLinkedClubs(linkedClubsData as Club[]);
    } catch (error) {
      console.error('Error in loadLinkedClubs:', error);
    }
  };

  const handleCreateClub = async (clubData: Partial<Club>) => {
    try {
      console.log('Creating club with data:', clubData);
      
      const { data, error } = await supabase.from('clubs').insert([{
        name: clubData.name,
        reference_number: clubData.reference_number,
        subscription_type: clubData.subscription_type || 'free',
        logo_url: clubData.logo_url
      }]).select().single();

      if (error) throw error;

      console.log('Club created successfully:', data);
      await refreshUserData();
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

  const handleUpdateClub = async (clubData: Partial<Club>) => {
    if (!selectedClub?.id) return;

    try {
      console.log('Updating club with data:', clubData);
      
      const { error } = await supabase
        .from('clubs')
        .update({
          name: clubData.name,
          reference_number: clubData.reference_number,
          subscription_type: clubData.subscription_type,
          logo_url: clubData.logo_url
        })
        .eq('id', selectedClub.id);

      if (error) throw error;

      console.log('Club updated successfully');
      await refreshUserData();
      setIsClubDialogOpen(false);
      
      toast({
        title: 'Club updated',
        description: `${clubData.name} has been updated successfully.`,
      });
    } catch (error: any) {
      console.error('Error updating club:', error);
      toast({
        title: 'Error updating club',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const openDetailsModal = (club: Club, isReadOnly = false) => {
    setDetailsClub({ ...club, isReadOnly });
    setIsDetailsModalOpen(true);
  };

  const openEditClubDialog = (club: Club) => {
    setSelectedClub(club);
    setIsClubDialogOpen(true);
  };

  const ClubCard = ({ club, isLinked = false }: { club: Club; isLinked?: boolean }) => (
    <Card key={club.id} className={`hover:shadow-lg transition-shadow ${isLinked ? 'border-dashed opacity-75' : ''}`}>
      <CardHeader>
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-3 flex-1">
            <div className="w-8 h-8 flex items-center justify-center rounded bg-muted">
              {club.logo_url ? (
                <img 
                  src={club.logo_url} 
                  alt={`${club.name} logo`}
                  className="w-7 h-7 object-contain rounded"
                />
              ) : (
                <Building className="h-5 w-5 text-muted-foreground" />
              )}
            </div>
            <div className="flex-1">
              <CardTitle className="flex items-center gap-2">
                {club.name}
                {club.serial_number && (
                  <Badge variant="secondary" className="text-xs">
                    #{club.serial_number}
                  </Badge>
                )}
                {isLinked && (
                  <Badge variant="outline" className="text-xs">
                    Linked
                  </Badge>
                )}
              </CardTitle>
              {club.reference_number && (
                <CardDescription>
                  Ref: {club.reference_number}
                </CardDescription>
              )}
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex justify-between items-center text-sm">
            <span className="text-muted-foreground">Subscription:</span>
            <Badge variant="outline" className="capitalize">
              {club.subscription_type}
            </Badge>
          </div>
          <div className="flex justify-between items-center text-sm">
            <span className="text-muted-foreground">Teams:</span>
            <span className="font-medium flex items-center gap-1">
              <Users className="h-3 w-3" />
              {(club as any).teams?.length || 0}
            </span>
          </div>
          <div className="flex justify-between items-center text-sm">
            <span className="text-muted-foreground">Serial Number:</span>
            <span className="font-mono text-xs">
              {club.serial_number || 'Auto-generated'}
            </span>
          </div>
          {isLinked && club.userRole && (
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Your Role:</span>
              <Badge variant="outline" className="capitalize text-xs">
                {club.userRole.replace('_', ' ')}
              </Badge>
            </div>
          )}
        </div>
      </CardContent>
      <CardFooter className="flex justify-between gap-2">
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => {
            setSelectedClubForView(club.id);
            setActiveTab('overview');
          }}
          className="flex-1"
        >
          <Eye className="mr-2 h-4 w-4" />
          View Details
        </Button>
        {!isLinked && (
          <Button 
            size="sm" 
            onClick={() => openEditClubDialog(club)}
            className="flex-1"
          >
            <Settings className="mr-2 h-4 w-4" />
            Settings
          </Button>
        )}
      </CardFooter>
    </Card>
  );

  const allClubs = [...clubs, ...linkedClubs];
  const selectedClubData = allClubs.find(c => c.id === selectedClubForView);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Club Management</h1>
            <p className="text-muted-foreground">
              Comprehensive management of clubs, teams, officials, and facilities
            </p>
          </div>
          <Dialog open={isClubDialogOpen} onOpenChange={setIsClubDialogOpen}>
            <DialogTrigger asChild>
              <Button 
                onClick={() => setSelectedClub(null)} 
                className="bg-puma-blue-500 hover:bg-puma-blue-600"
              >
                <PlusCircle className="mr-2 h-4 w-4" />
                Add Club
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle>
                  {selectedClub ? 'Edit Club' : 'Create New Club'}
                </DialogTitle>
                <DialogDescription>
                  {selectedClub 
                    ? 'Update your club details and settings.' 
                    : 'Add a new club with automatic serial number generation.'}
                </DialogDescription>
              </DialogHeader>
              <ClubForm 
                club={selectedClub} 
                onSubmit={selectedClub ? handleUpdateClub : handleCreateClub} 
                onCancel={() => setIsClubDialogOpen(false)}
              />
            </DialogContent>
          </Dialog>
        </div>

        {allClubs.length === 0 ? (
          <Card className="border-dashed border-2 border-muted">
            <CardContent className="py-8 flex flex-col items-center justify-center text-center">
              <div className="rounded-full bg-muted p-3 mb-4">
                <Building className="h-6 w-6 text-muted-foreground" />
              </div>
              <h3 className="font-semibold text-lg mb-1">No Clubs Yet</h3>
              <p className="text-muted-foreground mb-4 max-w-md">
                You haven't created any clubs yet. Start by creating your first club to manage teams, 
                officials, facilities, and more with automatic serial number generation.
              </p>
              <Button 
                onClick={() => setIsClubDialogOpen(true)}
                className="bg-puma-blue-500 hover:bg-puma-blue-600"
              >
                <PlusCircle className="mr-2 h-4 w-4" />
                Create Club
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {/* Club Selection */}
            {allClubs.length > 1 && !selectedClubForView && (
              <div>
                <h2 className="text-xl font-semibold mb-4">Select a Club</h2>
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {/* Owned Clubs */}
                  {clubs.map((club) => (
                    <ClubCard key={club.id} club={club} />
                  ))}
                  {/* Linked Clubs */}
                  {linkedClubs.map((club) => (
                    <LinkedClubCard key={club.id} club={club} onUnlink={() => {}} />
                  ))}
                </div>
              </div>
            )}

            {/* Club Details View */}
            {selectedClubData && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <Button 
                      variant="outline" 
                      onClick={() => setSelectedClubForView('')}
                    >
                      ← Back to Clubs
                    </Button>
                    <h2 className="text-xl font-semibold">{selectedClubData.name}</h2>
                    {selectedClubData.isReadOnly && (
                      <Badge variant="outline">Read-only</Badge>
                    )}
                  </div>
                </div>

                <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
                  <TabsList className="grid w-full grid-cols-6">
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="teams">Teams</TabsTrigger>
                    <TabsTrigger value="players">Players</TabsTrigger>
                    <TabsTrigger value="calendar">Calendar</TabsTrigger>
                    <TabsTrigger value="analytics">Analytics</TabsTrigger>
                    <TabsTrigger value="staff">Staff</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="overview" className="space-y-6">
                    <ClubStaffManagement
                      clubId={selectedClubData.id}
                      clubName={selectedClubData.name}
                    />
                  </TabsContent>

                  <TabsContent value="teams" className="space-y-6">
                    <ClubTeamLinking
                      clubId={selectedClubData.id}
                      clubName={selectedClubData.name}
                      onTeamLinked={() => refreshUserData()}
                    />
                  </TabsContent>

                  <TabsContent value="players" className="space-y-6">
                    <ClubPlayerManagement
                      clubId={selectedClubData.id}
                      clubName={selectedClubData.name}
                    />
                  </TabsContent>

                  <TabsContent value="calendar" className="space-y-6">
                    <ClubCalendarEvents
                      clubId={selectedClubData.id}
                      clubName={selectedClubData.name}
                    />
                  </TabsContent>

                  <TabsContent value="analytics" className="space-y-6">
                    <ClubAnalytics
                      clubId={selectedClubData.id}
                      clubName={selectedClubData.name}
                    />
                  </TabsContent>

                  <TabsContent value="staff" className="space-y-6">
                    <ClubStaffManagement
                      clubId={selectedClubData.id}
                      clubName={selectedClubData.name}
                    />
                  </TabsContent>
                </Tabs>
              </div>
            )}

            {/* Show club cards if no club selected but clubs exist */}
            {!selectedClubForView && allClubs.length === 1 && (
              <div>
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {clubs.map((club) => (
                    <ClubCard key={club.id} club={club} />
                  ))}
                  {linkedClubs.map((club) => (
                    <LinkedClubCard key={club.id} club={club} onUnlink={() => {}} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Club Details Modal */}
        <ClubDetailsModal 
          club={detailsClub}
          isOpen={isDetailsModalOpen}
          onClose={() => setIsDetailsModalOpen(false)}
        />
      </div>
    </DashboardLayout>
  );
};

export default ClubManagement;
