import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Building2, BookOpen, Search, Upload, CheckCircle2, ExternalLink, Lock } from 'lucide-react';
import { supabase as supabaseClient } from '@/integrations/supabase/client';
const supabase = supabaseClient as any;
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/lib/logger';
import type { UserGroupTier } from '@/types/index';

interface AcademySummary {
  id: string;
  name: string;
  logo_url: string | null;
  eppp_category: number | null;
}

interface Props {
  clubId: string;
  clubName: string;
  userGroupTier: UserGroupTier | undefined;
  isClubAdmin: boolean;
}

export function ClubAcademySection({ clubId, clubName, userGroupTier, isClubAdmin }: Props) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const [academy, setAcademy] = useState<AcademySummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);

  const [name, setName] = useState('');
  const [faReg, setFaReg] = useState('');
  const [epppCategory, setEpppCategory] = useState('');
  const [foundedYear, setFoundedYear] = useState('');
  const [headEmail, setHeadEmail] = useState('');
  const [headUser, setHeadUser] = useState<{ id: string; name: string | null } | null>(null);
  const [headSearching, setHeadSearching] = useState(false);
  const [headError, setHeadError] = useState('');
  const logoInputRef = useRef<HTMLInputElement>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState('');

  useEffect(() => {
    loadAcademy();
  }, [clubId]);

  const loadAcademy = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('academies')
        .select('id, name, logo_url, eppp_category')
        .eq('club_id', clubId)
        .maybeSingle();
      if (error) throw error;
      setAcademy(data as AcademySummary | null);
    } catch (e: any) {
      logger.error('Error loading academy for club:', e);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setName('');
    setFaReg('');
    setEpppCategory('');
    setFoundedYear('');
    setHeadEmail('');
    setHeadUser(null);
    setHeadError('');
    setLogoFile(null);
    setLogoPreview('');
  };

  const searchHead = async () => {
    const email = headEmail.trim().toLowerCase();
    if (!email) return;
    setHeadSearching(true);
    setHeadUser(null);
    setHeadError('');
    const { data, error } = await supabase
      .from('profiles')
      .select('id, name')
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

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoFile(file);
    const reader = new FileReader();
    reader.onload = () => setLogoPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleCreate = async () => {
    if (!name.trim()) return;
    setCreating(true);
    try {
      let logoUrl: string | null = null;
      if (logoFile) {
        try {
          const ext = logoFile.name.split('.').pop() || 'png';
          const path = `academy-logos/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
          const { data: upload, error: uploadErr } = await supabase.storage
            .from('logos')
            .upload(path, logoFile, { contentType: logoFile.type, upsert: false });
          if (!uploadErr && upload) {
            const { data: { publicUrl } } = supabase.storage.from('logos').getPublicUrl(path);
            logoUrl = publicUrl;
          }
        } catch (ex) {
          logger.warn('Logo upload failed (continuing without logo):', ex);
        }
      }

      const { data, error } = await supabase
        .from('academies')
        .insert({
          name: name.trim(),
          club_id: clubId,
          logo_url: logoUrl,
          fa_registration_number: faReg.trim() || null,
          eppp_category: epppCategory ? parseInt(epppCategory, 10) : null,
          founded_year: foundedYear ? parseInt(foundedYear, 10) : null,
          head_of_academy_user_id: headUser?.id ?? null,
        })
        .select('id')
        .single();
      if (error) throw error;

      if (user?.id) {
        await supabase.from('user_academies').upsert(
          { user_id: user.id, academy_id: data.id, role: 'academy_admin' },
          { onConflict: 'user_id,academy_id,role' },
        );
      }

      if (headUser && headUser.id !== user?.id) {
        await supabase.from('user_academies').upsert(
          { user_id: headUser.id, academy_id: data.id, role: 'head_of_academy' },
          { onConflict: 'user_id,academy_id,role' },
        );
      }

      toast({ title: 'Academy enabled', description: `${name} has been created for ${clubName}.` });
      setIsDialogOpen(false);
      resetForm();
      navigate(`/academy/${data.id}`);
    } catch (e: any) {
      logger.error('Error creating academy:', e);
      toast({ title: 'Error enabling academy', description: e.message, variant: 'destructive' });
    } finally {
      setCreating(false);
    }
  };

  if (userGroupTier !== 'amateur_professional') {
    return (
      <Card className="border-dashed">
        <CardContent className="py-12 flex flex-col items-center text-center gap-3">
          <Lock className="h-8 w-8 text-muted-foreground" />
          <div>
            <p className="font-medium">Academy not available</p>
            <p className="text-sm text-muted-foreground mt-1">
              Academy functionality is available for Amateur &amp; Professional clubs only.
              {isClubAdmin
                ? ' Edit this club and set Club Level to "Amateur / Professional" to enable it.'
                : " Ask a club admin to update this club's level."}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return <div className="py-8 text-center text-sm text-muted-foreground">Loading academy…</div>;
  }

  if (academy) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center shrink-0">
              {academy.logo_url
                ? <img src={academy.logo_url} alt={academy.name} className="w-9 h-9 object-contain rounded" />
                : <Building2 className="h-5 w-5 text-purple-600" />}
            </div>
            <div>
              <CardTitle className="text-base">{academy.name}</CardTitle>
              {academy.eppp_category != null && (
                <CardDescription>EPPP Category {academy.eppp_category}</CardDescription>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Button
            onClick={() => navigate(`/academy/${academy.id}`)}
            className="bg-purple-600 hover:bg-purple-700 text-white"
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            Open Academy Dashboard
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="border-dashed">
        <CardContent className="py-12 flex flex-col items-center text-center gap-4">
          <Building2 className="h-10 w-10 text-muted-foreground" />
          <div>
            <p className="font-medium">No Academy yet</p>
            <p className="text-sm text-muted-foreground mt-1">
              Enable an academy for {clubName} to unlock performance tracking,
              scouting, and year group management.
            </p>
          </div>
          {isClubAdmin && (
            <Button
              onClick={() => setIsDialogOpen(true)}
              className="bg-purple-600 hover:bg-purple-700 text-white"
            >
              <BookOpen className="h-4 w-4 mr-2" />
              Enable Academy
            </Button>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={isDialogOpen}
        onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}
      >
        <DialogContent className="sm:max-w-[540px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Enable Academy for {clubName}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label htmlFor="ac-name">
                Academy Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="ac-name"
                placeholder="e.g. Origin FC Academy"
                value={name}
                onChange={e => setName(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Academy Logo</Label>
              <div className="flex items-center gap-3">
                {logoPreview
                  ? <img src={logoPreview} alt="Preview" className="w-12 h-12 object-contain rounded border" />
                  : <div className="w-12 h-12 rounded border bg-muted flex items-center justify-center">
                      <BookOpen className="h-5 w-5 text-muted-foreground" />
                    </div>}
                <Button type="button" variant="outline" size="sm" onClick={() => logoInputRef.current?.click()}>
                  <Upload className="mr-2 h-4 w-4" />
                  {logoFile ? 'Change Logo' : 'Upload Logo'}
                </Button>
              </div>
              <input ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogoChange} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="ac-fa">FA Registration No.</Label>
                <Input id="ac-fa" placeholder="e.g. FA123456" value={faReg} onChange={e => setFaReg(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ac-year">Founded Year</Label>
                <Input
                  id="ac-year" type="number" placeholder="e.g. 2010"
                  min={1800} max={new Date().getFullYear()}
                  value={foundedYear} onChange={e => setFoundedYear(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>EPPP Category</Label>
              <Select value={epppCategory} onValueChange={setEpppCategory}>
                <SelectTrigger><SelectValue placeholder="Select category (optional)" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Category 1 — Elite</SelectItem>
                  <SelectItem value="2">Category 2</SelectItem>
                  <SelectItem value="3">Category 3</SelectItem>
                  <SelectItem value="4">Category 4</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Head of Academy</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="Search by email address"
                  value={headEmail}
                  onChange={e => { setHeadEmail(e.target.value); setHeadUser(null); setHeadError(''); }}
                  onKeyDown={e => e.key === 'Enter' && searchHead()}
                />
                <Button
                  type="button" variant="outline" size="sm"
                  onClick={searchHead}
                  disabled={headSearching || !headEmail.trim()}
                  className="shrink-0"
                >
                  {headSearching ? '…' : <Search className="h-4 w-4" />}
                </Button>
              </div>
              {headUser && (
                <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 border border-green-200 rounded px-3 py-2">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  <span><strong>{headUser.name || headEmail}</strong> will be assigned as Head of Academy</span>
                </div>
              )}
              {headError && <p className="text-xs text-destructive">{headError}</p>}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
              <Button
                onClick={handleCreate}
                disabled={!name.trim() || creating}
                className="bg-purple-600 hover:bg-purple-700 text-white"
              >
                {creating ? 'Creating…' : 'Enable Academy'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
