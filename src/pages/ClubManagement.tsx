import { logger } from '@/lib/logger';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { SafeDashboardLayout } from '@/components/layout/SafeDashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ClubForm } from '@/components/clubs/ClubForm';
import { ClubDetailsModal } from '@/components/clubs/ClubDetailsModal';
import { ClubPlayerManagement } from '@/components/clubs/ClubPlayerManagement';
import { ClubCalendarEvents } from '@/components/clubs/ClubCalendarEvents';
import { ClubAnalytics } from '@/components/clubs/ClubAnalytics';
import { ClubStaffManagement } from '@/components/clubs/ClubStaffManagement';
import { ClubTeamLinking } from '@/components/clubs/ClubTeamLinking';
import { LinkedClubCard } from '@/components/clubs/LinkedClubCard';
import { YearGroupManagement } from '@/components/clubs/YearGroupManagement';
import { ClubAcademySection } from '@/components/clubs/ClubAcademySection';
import { useAuth } from '@/contexts/AuthContext';
import { useAuthorization } from '@/contexts/AuthorizationContext';
import { useToast } from '@/hooks/use-toast';
import { supabase as supabaseClient } from '@/integrations/supabase/client';
const supabase = supabaseClient as any;
import { Club } from '@/types/index';
import { PlusCircle, Settings, Users, Building, Eye } from 'lucide-react';

export const ClubManagement = () => {
  const { clubs, refreshUserData, teams, user } = useAuth();
  const { isGlobalAdmin } = useAuthorization();
  const navigate = useNavigate();
  const [linkedClubs, setLinkedClubs] = useState<Club[]>([]);
  const [isClubDialogOpen, setIsClubDialogOpen] = useState(false);
  const [selectedClub, setSelectedClub] = useState<Club | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [detailsClub, setDetailsClub] = useState<Club | null>(null);
  const [selectedClubForView, setSelectedClubForView] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'overview' | 'year-groups' | 'teams' | 'players' | 'calendar' | 'analytics' | 'staff' | 'academy'>('overview');
  const { toast } = useToast();


  useEffect(() => {
    loadLinkedClubs();
  }, [teams]);

  useEffect(() => {
    const allClubs = [...clubs, ...linkedClubs];
    if (allClubs.length === 1 && !selectedClubForView) {
      setSelectedClubForView(allClubs[0].id);
    }
  }, [clubs, linkedClubs, selectedClubForView]);

  const loadLinkedClubs = async () => {
    try {
      if (!teams || teams.length === 0) { setLinkedClubs([]); return; }
      const teamIds = teams.map(t => t.id);
      const { data: relations, error } = await supabase
        .from('club_teams')
        .select(`club_id, clubs!club_teams_club_id_fkey(id,name,reference_number,subscription_type,serial_number,logo_url,created_at,updated_at)`)
        .in('team_id', teamIds);
      if (error) { logger.error('Error loading linked clubs:', error); return; }
      const ownedIds = clubs.map(c => c.id);
      const linked = (relations || [])
        .filter((r: any) => r.clubs && !ownedIds.includes(r.clubs.id))
        .map((r: any) => ({
          id: r.clubs.id, name: r.clubs.name,
          referenceNumber: r.clubs.reference_number || undefined,
          subscriptionType: r.clubs.subscription_type as Club['subscriptionType'],
          serialNumber: r.clubs.serial_number, logoUrl: r.clubs.logo_url,
          createdAt: r.clubs.created_at, updatedAt: r.clubs.updated_at,
          userRole: 'team_member', isReadOnly: true, teams: [],
        }))
        .filter((c: any, i: number, arr: any[]) => arr.findIndex((x: any) => x.id === c.id) === i);
      setLinkedClubs(linked as Club[]);
    } catch (e) { logger.error('loadLinkedClubs error:', e); }
  };

  const handleCreateClub = async (clubData: Partial<Club>) => {
    try {
      const { error } = await supabase.from('clubs').insert([{
        name: clubData.name,
        reference_number: clubData.referenceNumber,
        subscription_type: clubData.subscriptionType || 'free',
        logo_url: clubData.logoUrl,
      }]).select().single();
      if (error) throw error;
      await refreshUserData();
      setIsClubDialogOpen(false);
      toast({ title: 'Club created', description: `${clubData.name} has been created successfully.` });
    } catch (e: any) {
      toast({ title: 'Error creating club', description: e.message, variant: 'destructive' });
    }
  };

  const handleUpdateClub = async (clubData: Partial<Club>) => {
    if (!selectedClub?.id) return;
    try {
      const { error } = await supabase.from('clubs').update({
        name: clubData.name, reference_number: clubData.referenceNumber,
        subscription_type: clubData.subscriptionType, logo_url: clubData.logoUrl,
      }).eq('id', selectedClub.id);
      if (error) throw error;
      await refreshUserData();
      setIsClubDialogOpen(false);
      toast({ title: 'Club updated', description: `${clubData.name} has been updated successfully.` });
    } catch (e: any) {
      toast({ title: 'Error updating club', description: e.message, variant: 'destructive' });
    }
  };


  const openEditClubDialog = (club: Club) => { setSelectedClub(club); setIsClubDialogOpen(true); };

  const ClubCard = ({ club, isLinked = false }: { club: Club; isLinked?: boolean }) => {
    const [teamCount, setTeamCount] = useState(0);
    useEffect(() => {
      supabase.from('club_teams').select('*', { count: 'exact', head: true }).eq('club_id', club.id)
        .then(({ count }: any) => setTeamCount(count || 0));
    }, [club.id]);
    return (
      <Card className={`hover:shadow-lg transition-shadow ${isLinked ? 'border-dashed opacity-75' : ''}`}>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 flex items-center justify-center rounded bg-muted">
              {club.logoUrl
                ? <img src={club.logoUrl} alt={`${club.name} logo`} className="w-7 h-7 object-contain rounded" />
                : <Building className="h-5 w-5 text-muted-foreground" />}
            </div>
            <div className="flex-1">
              <CardTitle className="flex items-center gap-2">
                {club.name}
                {club.serialNumber && <Badge variant="secondary" className="text-xs">#{club.serialNumber}</Badge>}
                {isLinked && <Badge variant="outline" className="text-xs">Linked</Badge>}
              </CardTitle>
              {club.referenceNumber && <CardDescription>Ref: {club.referenceNumber}</CardDescription>}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Subscription:</span>
              <Badge variant="outline" className="capitalize">{club.subscriptionType}</Badge>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Teams:</span>
              <span className="font-medium flex items-center gap-1"><Users className="h-3 w-3" />{teamCount}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Serial:</span>
              <span className="font-mono text-xs">{club.serialNumber || 'Auto-generated'}</span>
            </div>
            {isLinked && club.userRole && (
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Your Role:</span>
                <Badge variant="outline" className="capitalize text-xs">{club.userRole.replace('_', ' ')}</Badge>
              </div>
            )}
          </div>
        </CardContent>
        <CardFooter className="flex gap-2">
          <Button variant="outline" size="sm" className="flex-1"
            onClick={() => { setSelectedClubForView(club.id); setActiveTab('overview'); }}>
            <Eye className="mr-2 h-4 w-4" />View Details
          </Button>
          {!isLinked && (
            <Button size="sm" className="flex-1" onClick={() => openEditClubDialog(club)}>
              <Settings className="mr-2 h-4 w-4" />Settings
            </Button>
          )}
        </CardFooter>
      </Card>
    );
  };

  const allClubs = [...clubs, ...linkedClubs];
  const selectedClubData = allClubs.find(c => c.id === selectedClubForView);

  return (
    <SafeDashboardLayout>
      <div className="space-y-6">
        {/* ── Header ── */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Club Management</h1>
            <p className="text-muted-foreground">Comprehensive management of clubs, teams, officials, and facilities</p>
          </div>
          <div className="flex gap-2">

            {/* Add Club button */}
            <Dialog open={isClubDialogOpen} onOpenChange={setIsClubDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => setSelectedClub(null)} className="bg-puma-blue-500 hover:bg-puma-blue-600">
                  <PlusCircle className="mr-2 h-4 w-4" />Add Club
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                  <DialogTitle>{selectedClub ? 'Edit Club' : 'Create New Club'}</DialogTitle>
                  <DialogDescription>
                    {selectedClub ? 'Update your club details and settings.' : 'Add a new club with automatic serial number generation.'}
                  </DialogDescription>
                </DialogHeader>
                <ClubForm club={selectedClub}
                  onSubmit={selectedClub ? handleUpdateClub : handleCreateClub}
                  onCancel={() => setIsClubDialogOpen(false)} />
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* ── Club list / detail view ── */}
        {allClubs.length === 0 ? (
          <Card className="border-dashed border-2 border-muted">
            <CardContent className="py-8 flex flex-col items-center justify-center text-center">
              <div className="rounded-full bg-muted p-3 mb-4"><Building className="h-6 w-6 text-muted-foreground" /></div>
              <h3 className="font-semibold text-lg mb-1">No Clubs Yet</h3>
              <p className="text-muted-foreground mb-4 max-w-md">
                You haven’t created any clubs yet. Start by creating your first club.
              </p>
              <Button onClick={() => setIsClubDialogOpen(true)} className="bg-puma-blue-500 hover:bg-puma-blue-600">
                <PlusCircle className="mr-2 h-4 w-4" />Create Club
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {allClubs.length > 1 && !selectedClubForView && (
              <div>
                <h2 className="text-xl font-semibold mb-4">Select a Club</h2>
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {clubs.map(c => <ClubCard key={c.id} club={c} />)}
                  {linkedClubs.map(c => <LinkedClubCard key={c.id} club={c} />)}
                </div>
              </div>
            )}

            {selectedClubData && (
              <div className="space-y-6">
                <div className="flex items-center gap-3">
                  <Button variant="outline" onClick={() => setSelectedClubForView('')}>← Back to Clubs</Button>
                  {selectedClubData.logoUrl
                    ? <img src={selectedClubData.logoUrl} alt={selectedClubData.name} className="w-10 h-10 rounded-full object-cover ring-2 ring-border" />
                    : <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center"><Building className="h-5 w-5 text-muted-foreground" /></div>
                  }
                  <h2 className="text-xl font-semibold">{selectedClubData.name}</h2>
                  {selectedClubData.isReadOnly && <Badge variant="outline">Read-only</Badge>}
                </div>

                <Tabs value={activeTab} onValueChange={v => setActiveTab(v as any)}>
                  <TabsList className="grid w-full grid-cols-8">
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="year-groups">Year Groups</TabsTrigger>
                    <TabsTrigger value="teams">Teams</TabsTrigger>
                    <TabsTrigger value="players">Players</TabsTrigger>
                    <TabsTrigger value="calendar">Calendar</TabsTrigger>
                    <TabsTrigger value="analytics">Analytics</TabsTrigger>
                    <TabsTrigger value="staff">Staff</TabsTrigger>
                    <TabsTrigger value="academy">Academy</TabsTrigger>
                  </TabsList>
                  <TabsContent value="overview" className="space-y-6">
                    <ClubStaffManagement clubId={selectedClubData.id} clubName={selectedClubData.name} />
                  </TabsContent>
                  <TabsContent value="year-groups" className="space-y-6">
                    <YearGroupManagement clubId={selectedClubData.id} />
                  </TabsContent>
                  <TabsContent value="teams" className="space-y-6">
                    <ClubTeamLinking clubId={selectedClubData.id} clubName={selectedClubData.name} onTeamLinked={() => refreshUserData()} />
                  </TabsContent>
                  <TabsContent value="players" className="space-y-6">
                    <ClubPlayerManagement clubId={selectedClubData.id} clubName={selectedClubData.name} />
                  </TabsContent>
                  <TabsContent value="calendar" className="space-y-6">
                    <ClubCalendarEvents clubId={selectedClubData.id} clubName={selectedClubData.name} />
                  </TabsContent>
                  <TabsContent value="analytics" className="space-y-6">
                    <ClubAnalytics clubId={selectedClubData.id} clubName={selectedClubData.name} />
                  </TabsContent>
                  <TabsContent value="staff" className="space-y-6">
                    <ClubStaffManagement clubId={selectedClubData.id} clubName={selectedClubData.name} />
                  </TabsContent>
                  <TabsContent value="academy" className="space-y-6">
                    <ClubAcademySection
                      clubId={selectedClubData.id}
                      clubName={selectedClubData.name}
                      userGroupTier={selectedClubData.userGroupTier}
                      isClubAdmin={!selectedClubData.isReadOnly && (isGlobalAdmin || selectedClubData.userRole === 'club_admin' || selectedClubData.userRole === 'club_chair')}
                    />
                  </TabsContent>
                </Tabs>
              </div>
            )}

            {!selectedClubForView && allClubs.length === 1 && (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {clubs.map(c => <ClubCard key={c.id} club={c} />)}
                {linkedClubs.map(c => <LinkedClubCard key={c.id} club={c} />)}
              </div>
            )}
          </div>
        )}

        <ClubDetailsModal club={detailsClub} isOpen={isDetailsModalOpen} onClose={() => setIsDetailsModalOpen(false)} />
      </div>
    </SafeDashboardLayout>
  );
};

export default ClubManagement;
