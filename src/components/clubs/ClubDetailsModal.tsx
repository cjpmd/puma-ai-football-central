
import { useEffect, useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Club } from '@/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Building, CalendarDays, Users, Box, UserRound } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';
import { FacilitiesManagement } from './FacilitiesManagement';

interface ClubDetailsModalProps {
  club: Club | null;
  isOpen: boolean;
  onClose: () => void;
}

export const ClubDetailsModal = ({ club, isOpen, onClose }: ClubDetailsModalProps) => {
  const [loading, setLoading] = useState(false);
  const [linkedTeams, setLinkedTeams] = useState<any[]>([]);
  const [clubStaff, setClubStaff] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState('overview');
  const { toast } = useToast();

  useEffect(() => {
    if (club?.id && isOpen) {
      loadLinkedTeams();
      loadClubStaff();
    }
  }, [club?.id, isOpen]);

  const loadLinkedTeams = async () => {
    if (!club?.id) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('teams')
        .select(`
          id,
          name,
          age_group,
          game_format,
          subscription_type,
          season_start,
          season_end,
          manager_name,
          manager_email,
          manager_phone
        `)
        .eq('club_id', club.id)
        .order('name');

      if (error) throw error;
      setLinkedTeams(data || []);
    } catch (error) {
      console.error('Error loading linked teams:', error);
      toast({
        title: 'Error',
        description: 'Failed to load linked teams',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const loadClubStaff = async () => {
    if (!club?.id) return;
    
    try {
      const { data, error } = await supabase
        .from('club_officials')
        .select(`
          id,
          role,
          assigned_at,
          user_id,
          profiles:user_id (name, email, phone, coaching_badges)
        `)
        .eq('club_id', club.id)
        .order('role');

      if (error) throw error;
      setClubStaff(data || []);
    } catch (error) {
      console.error('Error loading club staff:', error);
      toast({
        title: 'Error',
        description: 'Failed to load club officials',
        variant: 'destructive',
      });
    }
  };

  if (!club) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[900px] h-[90vh] max-h-[800px] flex flex-col overflow-hidden">
        <div className="flex justify-between items-start border-b pb-4">
          <div>
            <h2 className="text-2xl font-bold flex items-center">
              <Building className="mr-2 h-5 w-5" />
              {club.name}
            </h2>
            <div className="flex items-center mt-1 space-x-2 text-sm text-muted-foreground">
              {club.serialNumber && (
                <div className="flex items-center">
                  <span className="font-mono">Serial #{club.serialNumber}</span>
                </div>
              )}
              {club.referenceNumber && (
                <div className="flex items-center">
                  <span className="px-2 border-l">Ref: {club.referenceNumber}</span>
                </div>
              )}
              <Badge variant="outline" className="capitalize ml-2">
                {club.subscriptionType?.replace('_', ' ')}
              </Badge>
            </div>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden mt-4">
          <TabsList className="grid w-full grid-cols-4 mb-4">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <Building className="h-4 w-4" />
              <span>Overview</span>
            </TabsTrigger>
            <TabsTrigger value="teams" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              <span>Teams</span>
            </TabsTrigger>
            <TabsTrigger value="facilities" className="flex items-center gap-2">
              <Box className="h-4 w-4" />
              <span>Facilities</span>
            </TabsTrigger>
            <TabsTrigger value="staff" className="flex items-center gap-2">
              <UserRound className="h-4 w-4" />
              <span>Staff</span>
            </TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-hidden">
            <TabsContent value="overview" className="h-full m-0 data-[state=active]:flex data-[state=active]:flex-col">
              <ScrollArea className="flex-1">
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-medium mb-2">Club Information</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-muted rounded-md p-3 flex flex-col">
                        <span className="text-sm text-muted-foreground">Name</span>
                        <span className="font-medium">{club.name}</span>
                      </div>
                      <div className="bg-muted rounded-md p-3 flex flex-col">
                        <span className="text-sm text-muted-foreground">Serial Number</span>
                        <span className="font-medium font-mono">{club.serialNumber || 'Not assigned'}</span>
                      </div>
                      <div className="bg-muted rounded-md p-3 flex flex-col">
                        <span className="text-sm text-muted-foreground">Reference Number</span>
                        <span className="font-medium">{club.referenceNumber || 'Not assigned'}</span>
                      </div>
                      <div className="bg-muted rounded-md p-3 flex flex-col">
                        <span className="text-sm text-muted-foreground">Subscription Type</span>
                        <span className="font-medium capitalize">{club.subscriptionType?.replace('_', ' ')}</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-medium mb-2">Summary</h3>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="bg-muted rounded-md p-3 flex items-center">
                        <Users className="h-8 w-8 mr-3 text-primary" />
                        <div>
                          <span className="text-sm text-muted-foreground">Linked Teams</span>
                          <p className="text-xl font-medium">{linkedTeams.length}</p>
                        </div>
                      </div>
                      <div className="bg-muted rounded-md p-3 flex items-center">
                        <Box className="h-8 w-8 mr-3 text-primary" />
                        <div>
                          <span className="text-sm text-muted-foreground">Facilities</span>
                          <p className="text-xl font-medium">Coming soon</p>
                        </div>
                      </div>
                      <div className="bg-muted rounded-md p-3 flex items-center">
                        <CalendarDays className="h-8 w-8 mr-3 text-primary" />
                        <div>
                          <span className="text-sm text-muted-foreground">Upcoming Events</span>
                          <p className="text-xl font-medium">Coming soon</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="teams" className="h-full m-0 data-[state=active]:flex data-[state=active]:flex-col">
              <ScrollArea className="flex-1">
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Linked Teams</h3>
                  
                  {loading ? (
                    <div className="text-center py-4">Loading teams...</div>
                  ) : linkedTeams.length === 0 ? (
                    <div className="bg-muted rounded-md p-6 text-center">
                      <h4 className="font-medium">No Teams Linked</h4>
                      <p className="text-sm text-muted-foreground mt-1">
                        This club doesn't have any linked teams yet.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {linkedTeams.map((team) => (
                        <div key={team.id} className="bg-muted rounded-md p-4">
                          <div className="flex justify-between items-start">
                            <div>
                              <h4 className="font-medium">{team.name}</h4>
                              <p className="text-sm text-muted-foreground">
                                {team.age_group} • {team.game_format}
                              </p>
                            </div>
                            <Badge variant="outline" className="capitalize">
                              {team.subscription_type?.replace('_', ' ')}
                            </Badge>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-x-6 gap-y-2 mt-3 text-sm">
                            <div>
                              <span className="text-muted-foreground">Season:</span>{' '}
                              <span>
                                {new Date(team.season_start).toLocaleDateString()} - {new Date(team.season_end).toLocaleDateString()}
                              </span>
                            </div>
                            {team.manager_name && (
                              <div>
                                <span className="text-muted-foreground">Manager:</span>{' '}
                                <span>{team.manager_name}</span>
                              </div>
                            )}
                            {team.manager_email && (
                              <div>
                                <span className="text-muted-foreground">Email:</span>{' '}
                                <span>{team.manager_email}</span>
                              </div>
                            )}
                            {team.manager_phone && (
                              <div>
                                <span className="text-muted-foreground">Phone:</span>{' '}
                                <span>{team.manager_phone}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="facilities" className="h-full m-0 data-[state=active]:flex data-[state=active]:flex-col">
              <ScrollArea className="flex-1">
                <FacilitiesManagement clubId={club.id} />
              </ScrollArea>
            </TabsContent>

            <TabsContent value="staff" className="h-full m-0 data-[state=active]:flex data-[state=active]:flex-col">
              <ScrollArea className="flex-1">
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Club Officials</h3>
                  
                  {clubStaff.length === 0 ? (
                    <div className="bg-muted rounded-md p-6 text-center">
                      <h4 className="font-medium">No Officials Added</h4>
                      <p className="text-sm text-muted-foreground mt-1">
                        This club doesn't have any officials assigned yet.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {clubStaff.map((staff) => (
                        <div key={staff.id} className="bg-muted rounded-md p-4">
                          <div className="flex justify-between items-start">
                            <div>
                              <h4 className="font-medium">{staff.profiles?.name || 'Unknown'}</h4>
                              <p className="text-sm text-muted-foreground">
                                {staff.profiles?.email || 'No email'} • {staff.profiles?.phone || 'No phone'}
                              </p>
                            </div>
                            <Badge className="capitalize">{staff.role.replace('_', ' ')}</Badge>
                          </div>
                          
                          {staff.profiles?.coaching_badges && staff.profiles.coaching_badges.length > 0 && (
                            <div className="mt-3">
                              <p className="text-sm font-medium mb-1">Coaching Badges:</p>
                              <div className="flex flex-wrap gap-2">
                                {staff.profiles.coaching_badges.map((badge: any, idx: number) => (
                                  <Badge key={idx} variant="outline">
                                    {badge.name} ({badge.level})
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}
                          
                          <div className="text-xs text-muted-foreground mt-2">
                            Assigned on: {new Date(staff.assigned_at).toLocaleDateString()}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>
          </div>
        </Tabs>

        <div className="flex justify-end gap-2 pt-4 border-t flex-shrink-0 mt-auto">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
