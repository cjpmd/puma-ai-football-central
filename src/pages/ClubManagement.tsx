
import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { Building, PlusCircle, Settings, UserPlus } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ClubForm } from '@/components/clubs/ClubForm';
import { Club } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

const ClubManagement = () => {
  const { clubs, refreshUserData } = useAuth();
  const [isClubDialogOpen, setIsClubDialogOpen] = useState(false);
  const [selectedClub, setSelectedClub] = useState<Club | null>(null);
  const { toast } = useToast();

  const handleCreateClub = async (clubData: Partial<Club>) => {
    try {
      // Insert club into the database
      const { data: clubResult, error: clubError } = await supabase
        .from('clubs')
        .insert([
          {
            name: clubData.name,
            reference_number: clubData.referenceNumber,
            subscription_type: clubData.subscriptionType || 'free'
          }
        ])
        .select('id')
        .single();

      if (clubError) {
        throw clubError;
      }

      // Add the current user as club admin
      const { error: userClubError } = await supabase
        .from('user_clubs')
        .insert([
          {
            user_id: (await supabase.auth.getUser()).data.user?.id,
            club_id: clubResult.id,
            role: 'club_admin'
          }
        ]);

      if (userClubError) {
        throw userClubError;
      }

      await refreshUserData();
      setIsClubDialogOpen(false);
      toast({
        title: 'Club Created',
        description: `${clubData.name} has been successfully created.`,
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create club',
        variant: 'destructive',
      });
    }
  };

  const handleUpdateClub = async (clubData: Partial<Club>) => {
    if (!selectedClub?.id) return;
    
    try {
      const { error } = await supabase
        .from('clubs')
        .update({
          name: clubData.name,
          reference_number: clubData.referenceNumber,
          subscription_type: clubData.subscriptionType
        })
        .eq('id', selectedClub.id);

      if (error) {
        throw error;
      }

      await refreshUserData();
      setIsClubDialogOpen(false);
      setSelectedClub(null);
      toast({
        title: 'Club Updated',
        description: `${clubData.name} has been successfully updated.`,
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update club',
        variant: 'destructive',
      });
    }
  };

  const openEditClubDialog = (club: Club) => {
    setSelectedClub(club);
    setIsClubDialogOpen(true);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Club Management</h1>
            <p className="text-muted-foreground">
              Manage your clubs and their settings
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
                    : 'Add a new club to your account.'}
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
                You haven't created any clubs yet. Start by creating your first club to manage teams, staff, and more.
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
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {clubs.map((club) => (
              <Card key={club.id}>
                <CardHeader>
                  <CardTitle>{club.name}</CardTitle>
                  {club.referenceNumber && (
                    <CardDescription>
                      Ref: {club.referenceNumber}
                    </CardDescription>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-muted-foreground">Subscription:</span>
                      <span className="font-medium capitalize">
                        {club.subscriptionType}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-muted-foreground">Teams:</span>
                      <span className="font-medium">
                        {club.teams?.length || 0}
                      </span>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="flex justify-between">
                  <Button variant="outline" size="sm">
                    <UserPlus className="mr-2 h-4 w-4" />
                    Staff
                  </Button>
                  <Button size="sm" onClick={() => openEditClubDialog(club)}>
                    <Settings className="mr-2 h-4 w-4" />
                    Settings
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default ClubManagement;
