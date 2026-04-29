import { logger } from '@/lib/logger';
import { useState, useEffect, useRef } from 'react';
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
import { Checkbox } from '@/components/ui/checkbox';
import { ClubForm } from '@/components/clubs/ClubForm';
import { ClubDetailsModal } from '@/components/clubs/ClubDetailsModal';
import { ClubPlayerManagement } from '@/components/clubs/ClubPlayerManagement';
import { ClubCalendarEvents } from '@/components/clubs/ClubCalendarEvents';
import { ClubAnalytics } from '@/components/clubs/ClubAnalytics';
import { ClubStaffManagement } from '@/components/clubs/ClubStaffManagement';
import { ClubTeamLinking } from '@/components/clubs/ClubTeamLinking';
import { LinkedClubCard } from '@/components/clubs/LinkedClubCard';
import { YearGroupManagement } from '@/components/clubs/YearGroupManagement';
import { useAuth } from '@/contexts/AuthContext';
import { useAuthorization } from '@/contexts/AuthorizationContext';
import { useToast } from '@/hooks/use-toast';
import { supabase as supabaseClient } from '@/integrations/supabase/client';
const supabase = supabaseClient as any;
import { Club } from '@/types/index';
import { PlusCircle, Settings, Users, Building, Eye, BookOpen, Upload, CheckCircle2, Search } from 'lucide-react';

export const ClubManagement = () => {
  const { clubs, refreshUserData, teams } = useAuth();
  const { isGlobalAdmin } = useAuthorization();
  const navigate = useNavigate();
  const [linkedClubs, setLinkedClubs] = useState<Club[]>([]);
  const [isClubDialogOpen, setIsClubDialogOpen] = useState(false);
  const [selectedClub, setSelectedClub] = useState<Club | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [detailsClub, setDetailsClub] = useState<Club | null>(null);
  const [selectedClubForView, setSelectedClubForView] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'overview' | 'year-groups' | 'teams' | 'players' | 'calendar' | 'analytics' | 'staff'>('overview');
  const { toast } = useToast();

  // ── Academy creation state (global_admin only) ──────────────────────────
  const [isAcademyDialogOpen, setIsAcademyDialogOpen] = useState(false);
  const [academyForm, setAcademyForm] = useState({
    name: '',
    faRegistrationNumber: '',
    epppCategory: '',
    foundedYear: '',
    linkedClubIds: [] as string[],
  });
  const [academyLogoFile, setAcademyLogoFile] = useState<File | null>(null);
  const [academyLogoPreview, setAcademyLogoPreview] = useState<string>('');
  const [headEmail, setHeadEmail] = useState('');
  const [headUser, setHeadUser] = useState<{ id: string; name: string | null } | null>(null);
  const [headSearching, setHeadSearching] = useState(false);
  const [headError, setHeadError] = useState('');
  const [creatingAcademy, setCreatingAcademy] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);
  // ────────────────────────────────────────────────────────────────────────

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

  // ── Academy helpers ──────────────────────────────────────────────────────
  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAcademyLogoFile(file);
    const reader = new FileReader();
    reader.onload = () => setAcademyLogoPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const searchHead = async () => {
    const email = headEmail.trim().toLowerCase();
    if (!email) return;
    setHeadSearching(true);
    setHeadUser(null);
    setHeadError('');
    const { data, error } = await supabase
      .from('profiles')
      .select('id, name, email')
      .ilike('email', email)
      .limit(1)
      .maybeSingle();
    setHeadSearching(false);
    if (error || !data) {
      setHeadError('No user found with that email address.');
    } else {
      setHeadUser({ id: data.id, name: data.name });
    }
  };

  const resetAcademyForm = () => {
    setAcademyForm({ name: '', faRegistrationNumber: '', epppCategory: '', foundedYear: '', linkedClubIds: [] });
    setAcademyLogoFile(null);
    setAcademyLogoPreview('');
    setHeadEmail('');
    setHeadUser(null);
    setHeadError('');
  };

  const handleCreateAcademy = async () => {
    if (!academyForm.name.trim()) return;
    setCreatingAcademy(true);
    try {
      // 1. Upload logo if a file was selected
      let logoUrl: string | null = null;
      if (academyLogoFile) {
        try {
          const ext = academyLogoFile.name.split('.').pop() || 'png';
          const path = `academy-logos/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
          const { data: upload, error: uploadErr } = await supabase.storage
            .from('logos')
            .upload(path, academyLogoFile, { contentType: academyLogoFile.type, upsert: false });
          if (!uploadErr && upload) {
            const { data: { publicUrl } } = supabase.storage.from('logos').getPublicUrl(path);
            logoUrl = publicUrl;
          } else {
            logger.warn('Logo upload failed (continuing without logo):', uploadErr);
          }
        } catch (uploadEx) {
          logger.warn('Logo upload exception:', uploadEx);
        }
      }

      // 2. Insert academy
      const { data, error } = await supabase
        .from('academies')
        .insert({
          name: academyForm.name.trim(),
          logo_url: logoUrl,
          fa_registration_number: academyForm.faRegistrationNumber.trim() || null,
          eppp_category: academyForm.epppCategory ? parseInt(academyForm.epppCategory, 10) : null,
          founded_year: academyForm.foundedYear ? parseInt(academyForm.foundedYear, 10) : null,
          head_of_academy_user_id: headUser?.id ?? null,
        })
        .select('id')
        .single();
      if (error) throw error;

      // 3. Link clubs
      if (academyForm.linkedClubIds.length > 0) {
        const { error: linkErr } = await supabase
          .from('academy_clubs')
          .insert(academyForm.linkedClubIds.map(clubId => ({ academy_id: data.id, club_id: clubId })));
        if (linkErr) throw linkErr;
      }

      // 4. Assign head of academy
      if (headUser) {
        // Insert user_academies row
        await supabase.from('user_academies').insert({
          user_id: headUser.id,
          academy_id: data.id,
          role: 'academy_admin',
        });

        // Update profiles.roles — append 'academy_admin' if not already present
        const { data: profile } = await supabase
          .from('profiles')
          .select('roles')
          .eq('id', headUser.id)
          .single();
        if (profile) {
          const current: string[] = Array.isArray(profile.roles) ? profile.roles : [];
          if (!current.includes('academy_admin')) {
            await supabase
              .from('profiles')
              .update({ roles: [...current, 'academy_admin'] })
              .eq('id', headUser.id);
          }
        }
      }

      toast({ title: 'Academy created', description: `${academyForm.name} has been created.` });
      setIsAcademyDialogOpen(false);
      resetAcademyForm();
      navigate(`/academy/${data.id}`);
    } catch (e: any) {
      logger.error('Error creating academy:', e);
      toast({ title: 'Error creating academy', description: e.message, variant: 'destructive' });
    } finally {
      setCreatingAcademy(false);
    }
  };

  const toggleClubLink = (clubId: string) => {
    setAcademyForm(prev => ({
      ...prev,
      linkedClubIds: prev.linkedClubIds.includes(clubId)
        ? prev.linkedClubIds.filter(id => id !== clubId)
        : [...prev.linkedClubIds, clubId],
    }));
  };
  // ────────────────────────────────────────────────────────────────────────

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

            {/* Create Academy button — global_admin only */}
            {isGlobalAdmin && (
              <Dialog open={isAcademyDialogOpen} onOpenChange={(open) => { setIsAcademyDialogOpen(open); if (!open) resetAcademyForm(); }}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="border-purple-500 text-purple-700 hover:bg-purple-50">
                    <BookOpen className="mr-2 h-4 w-4" />Create Academy
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[540px] max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Create New Academy</DialogTitle>
                    <DialogDescription>Set up an Origin Sports Academy, link clubs, and assign a head of academy.</DialogDescription>
                  </DialogHeader>

                  <div className="space-y-4 pt-2">
                    {/* Name */}
                    <div className="space-y-1.5">
                      <Label htmlFor="ac-name">Academy Name <span className="text-destructive">*</span></Label>
                      <Input id="ac-name" placeholder="e.g. Origin FC Academy"
                        value={academyForm.name}
                        onChange={e => setAcademyForm(p => ({ ...p, name: e.target.value }))} />
                    </div>

                    {/* Logo upload */}
                    <div className="space-y-1.5">
                      <Label>Academy Logo</Label>
                      <div className="flex items-center gap-3">
                        {academyLogoPreview
                          ? <img src={academyLogoPreview} alt="Logo preview" className="w-12 h-12 object-contain rounded border" />
                          : <div className="w-12 h-12 rounded border bg-muted flex items-center justify-center"><BookOpen className="h-5 w-5 text-muted-foreground" /></div>
                        }
                        <Button type="button" variant="outline" size="sm" onClick={() => logoInputRef.current?.click()}>
                          <Upload className="mr-2 h-4 w-4" />
                          {academyLogoFile ? 'Change Logo' : 'Upload Logo'}
                        </Button>
                        {academyLogoFile && <span className="text-xs text-muted-foreground truncate max-w-[120px]">{academyLogoFile.name}</span>}
                      </div>
                      <input ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogoChange} />
                    </div>

                    {/* FA reg + founded year */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label htmlFor="ac-fa">FA Registration No.</Label>
                        <Input id="ac-fa" placeholder="e.g. FA123456"
                          value={academyForm.faRegistrationNumber}
                          onChange={e => setAcademyForm(p => ({ ...p, faRegistrationNumber: e.target.value }))} />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="ac-year">Founded Year</Label>
                        <Input id="ac-year" type="number" placeholder="e.g. 2010"
                          min={1800} max={new Date().getFullYear()}
                          value={academyForm.foundedYear}
                          onChange={e => setAcademyForm(p => ({ ...p, foundedYear: e.target.value }))} />
                      </div>
                    </div>

                    {/* EPPP category */}
                    <div className="space-y-1.5">
                      <Label>EPPP Category</Label>
                      <Select value={academyForm.epppCategory}
                        onValueChange={v => setAcademyForm(p => ({ ...p, epppCategory: v }))}>
                        <SelectTrigger><SelectValue placeholder="Select category (optional)" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">Category 1 — Elite</SelectItem>
                          <SelectItem value="2">Category 2</SelectItem>
                          <SelectItem value="3">Category 3</SelectItem>
                          <SelectItem value="4">Category 4</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Head of academy */}
                    <div className="space-y-1.5">
                      <Label>Head of Academy</Label>
                      <div className="flex gap-2">
                        <Input
                          placeholder="Search by email address"
                          value={headEmail}
                          onChange={e => { setHeadEmail(e.target.value); setHeadUser(null); setHeadError(''); }}
                          onKeyDown={e => e.key === 'Enter' && searchHead()}
                        />
                        <Button type="button" variant="outline" size="sm"
                          onClick={searchHead}
                          disabled={headSearching || !headEmail.trim()}
                          className="shrink-0">
                          {headSearching ? '…' : <Search className="h-4 w-4" />}
                        </Button>
                      </div>
                      {headUser && (
                        <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 border border-green-200 rounded px-3 py-2">
                          <CheckCircle2 className="h-4 w-4 shrink-0" />
                          <span><strong>{headUser.name || headEmail}</strong> will be assigned as Academy Admin</span>
                        </div>
                      )}
                      {headError && <p className="text-xs text-destructive">{headError}</p>}
                    </div>

                    {/* Link clubs */}
                    {clubs.length > 0 && (
                      <div className="space-y-2">
                        <Label>Link Clubs</Label>
                        <div className="space-y-2 max-h-40 overflow-y-auto rounded border p-3">
                          {clubs.map(club => (
                            <div key={club.id} className="flex items-center gap-2">
                              <Checkbox id={`cl-${club.id}`}
                                checked={academyForm.linkedClubIds.includes(club.id)}
                                onCheckedChange={() => toggleClubLink(club.id)} />
                              <label htmlFor={`cl-${club.id}`} className="text-sm cursor-pointer">{club.name}</label>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="flex justify-end gap-2 pt-2">
                      <Button variant="outline" onClick={() => setIsAcademyDialogOpen(false)}>Cancel</Button>
                      <Button
                        onClick={handleCreateAcademy}
                        disabled={!academyForm.name.trim() || creatingAcademy}
                        className="bg-purple-600 hover:bg-purple-700 text-white">
                        {creatingAcademy ? 'Creating…' : 'Create Academy'}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            )}

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
                  <TabsList className="grid w-full grid-cols-7">
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="year-groups">Year Groups</TabsTrigger>
                    <TabsTrigger value="teams">Teams</TabsTrigger>
                    <TabsTrigger value="players">Players</TabsTrigger>
                    <TabsTrigger value="calendar">Calendar</TabsTrigger>
                    <TabsTrigger value="analytics">Analytics</TabsTrigger>
                    <TabsTrigger value="staff">Staff</TabsTrigger>
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
