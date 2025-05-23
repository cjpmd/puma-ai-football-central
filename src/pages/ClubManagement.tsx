import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { Building, PlusCircle, Settings, UserPlus, Eye, MapPin, Users } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ClubForm } from '@/components/clubs/ClubForm';
import { ClubDetailsModal } from '@/components/clubs/ClubDetailsModal';
import { Club } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';

export const ClubManagement = () => {
  const { clubs, refreshUserData } = useAuth();
  const [isClubDialogOpen, setIsClubDialogOpen] = useState(false);
  const [selectedClub, setSelectedClub] = useState<Club | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [detailsClub, setDetailsClub] = useState<Club | null>(null);
  const { toast } = useToast();

  const handleCreateClub = async (clubData: Partial<Club>) => {
    try {
      // Insert club into the database - serial number will be auto-generated
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

      // Add the current user as club admin via user_clubs table
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
        title: 'Club Created Successfully',
        description: `${clubData.name} has been created with a unique serial number and you've been assigned as admin.`,
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

  const openDetailsModal = (club: Club) => {
    setDetailsClub(club);
    setIsDetailsModalOpen(true);
  };

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

        {clubs.length === 0 ? (
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
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {clubs.map((club) => (
              <Card key={club.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <CardTitle className="flex items-center gap-2">
                        {club.name}
                        {club.serialNumber && (
                          <Badge variant="secondary" className="text-xs">
                            #{club.serialNumber}
                          </Badge>
                        )}
                      </CardTitle>
                      {club.referenceNumber && (
                        <CardDescription>
                          Ref: {club.referenceNumber}
                        </CardDescription>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-muted-foreground">Subscription:</span>
                      <Badge variant="outline" className="capitalize">
                        {club.subscriptionType}
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-muted-foreground">Teams:</span>
                      <span className="font-medium flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {club.teams?.length || 0}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-muted-foreground">Serial Number:</span>
                      <span className="font-mono text-xs">
                        {club.serialNumber || 'Auto-generated'}
                      </span>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="flex justify-between gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => openDetailsModal(club)}
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
            ))}
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
