
import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { PlusCircle, Settings, Users, Building, Edit, Trash2, Eye } from 'lucide-react';
import { ClubForm } from '@/components/clubs/ClubForm';
import { Club } from '@/types/club';

export const ClubManagement = () => {
  const { clubs, refreshUserData } = useAuth();
  const [isClubDialogOpen, setIsClubDialogOpen] = useState(false);
  const [selectedClub, setSelectedClub] = useState<Club | null>(null);
  const [selectedClubForView, setSelectedClubForView] = useState<string>('');
  const { toast } = useToast();

  // Auto-select club if only one available
  useEffect(() => {
    if (clubs.length === 1 && !selectedClubForView) {
      setSelectedClubForView(clubs[0].id);
    }
  }, [clubs, selectedClubForView]);

  const handleCreateClub = async (clubData: Partial<Club>) => {
    try {
      console.log('Creating club with data:', clubData);

      const { data, error } = await supabase.from('clubs').insert({
        name: clubData.name,
        reference_number: clubData.referenceNumber,
        subscription_type: clubData.subscriptionType || 'free',
        serial_number: clubData.serialNumber,
        logo_url: clubData.logoUrl
      }).select().single();

      if (error) throw error;

      console.log('Club created successfully:', data);

      // Get current user ID
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('User not authenticated');

      // Create a user_clubs record for the current user
      const { error: userClubError } = await supabase
        .from('user_clubs')
        .insert({
          user_id: userData.user.id,
          club_id: data.id,
          role: 'admin'
        });

      if (userClubError) {
        console.error('Error creating user_clubs record:', userClubError);
        throw userClubError;
      }

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
          reference_number: clubData.referenceNumber,
          subscription_type: clubData.subscriptionType,
          serial_number: clubData.serialNumber,
          logo_url: clubData.logoUrl
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

  const handleDeleteClub = async (clubId: string) => {
    try {
      console.log('Deleting club with ID:', clubId);

      // Delete user_clubs records
      const { error: userClubsError } = await supabase
        .from('user_clubs')
        .delete()
        .eq('club_id', clubId);

      if (userClubsError) {
        console.error('Error deleting user_clubs records:', userClubsError);
        throw userClubsError;
      }

      // Delete the club itself
      const { error: clubError } = await supabase
        .from('clubs')
        .delete()
        .eq('id', clubId);

      if (clubError) {
        console.error('Error deleting club:', clubError);
        throw clubError;
      }

      console.log('Club deleted successfully');
      await refreshUserData();
      setSelectedClubForView(''); // Clear selected club after deletion

      toast({
        title: 'Club deleted',
        description: 'The club has been deleted successfully.',
      });
    } catch (error: any) {
      console.error('Error deleting club:', error);
      toast({
        title: 'Error deleting club',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const openEditClubDialog = (club: Club) => {
    setSelectedClub({
      ...club,
      subscriptionType: club.subscriptionType || 'free'
    });
    setIsClubDialogOpen(true);
  };

  const ClubCard = ({ club }: { club: Club }) => (
    <Card key={club.id} className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-3 flex-1">
            <div className="w-8 h-8 flex items-center justify-center rounded bg-muted">
              {club.logoUrl ? (
                <img
                  src={club.logoUrl}
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
              </CardTitle>
              <CardDescription>
                {club.referenceNumber ? `Ref: ${club.referenceNumber}` : 'No reference number'}
              </CardDescription>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex justify-between items-center text-sm">
            <span className="text-muted-foreground">Serial Number:</span>
            <span className="font-medium">
              {club.serialNumber || 'Not set'}
            </span>
          </div>
          <div className="flex justify-between items-center text-sm">
            <span className="text-muted-foreground">Subscription:</span>
            <Badge variant="outline" className="capitalize">
              {club.subscriptionType || 'free'}
            </Badge>
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex justify-between gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setSelectedClubForView(club.id);
          }}
          className="flex-1"
        >
          <Eye className="mr-2 h-4 w-4" />
          View Details
        </Button>
        <Button
          size="sm"
          onClick={() => openEditClubDialog(club)}
          className="flex-1"
        >
          <Settings className="mr-2 h-4 w-4" />
          Settings
        </Button>
      </CardFooter>
    </Card>
  );

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Club Management</h1>
            <p className="text-muted-foreground">
              Manage your clubs, teams, and facilities
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
                    : 'Add a new club to manage teams and facilities.'}
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

        {clubs.length === 0 ? (
          <Card className="border-dashed border-2 border-muted">
            <CardContent className="py-8 flex flex-col items-center justify-center text-center">
              <div className="rounded-full bg-muted p-3 mb-4">
                <Building className="h-6 w-6 text-muted-foreground" />
              </div>
              <h3 className="font-semibold text-lg mb-1">No Clubs Yet</h3>
              <p className="text-muted-foreground mb-4 max-w-md">
                You haven't created any clubs yet. Start by creating your first club to manage teams,
                facilities, and more.
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
            {clubs.length > 1 && !selectedClubForView && (
              <div>
                <h2 className="text-xl font-semibold mb-4">Select a Club</h2>
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {clubs.map((club) => (
                    <ClubCard key={club.id} club={club} />
                  ))}
                </div>
              </div>
            )}

            {/* Club Details View */}
            {selectedClubForView && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <Button
                      variant="outline"
                      onClick={() => setSelectedClubForView('')}
                    >
                      ← Back to Clubs
                    </Button>
                    <h2 className="text-xl font-semibold">
                      {clubs.find(club => club.id === selectedClubForView)?.name}
                    </h2>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const clubToEdit = clubs.find(club => club.id === selectedClubForView);
                        if (clubToEdit) {
                          openEditClubDialog(clubToEdit);
                        }
                      }}
                    >
                      <Edit className="mr-2 h-4 w-4" />
                      Edit
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => {
                        if (window.confirm('Are you sure you want to delete this club?')) {
                          handleDeleteClub(selectedClubForView);
                        }
                      }}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </Button>
                  </div>
                </div>

                <div className="grid gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Club Overview</CardTitle>
                      <CardDescription>
                        Basic information about {clubs.find(club => club.id === selectedClubForView)?.name}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <p><strong>Reference Number:</strong> {clubs.find(club => club.id === selectedClubForView)?.referenceNumber || 'Not set'}</p>
                        <p><strong>Serial Number:</strong> {clubs.find(club => club.id === selectedClubForView)?.serialNumber || 'Not set'}</p>
                        <p><strong>Subscription:</strong> {clubs.find(club => club.id === selectedClubForView)?.subscriptionType || 'free'}</p>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}

            {/* Show club cards if no club selected but clubs exist */}
            {!selectedClubForView && clubs.length === 1 && (
              <div>
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {clubs.map((club) => (
                    <ClubCard key={club.id} club={club} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default ClubManagement;
