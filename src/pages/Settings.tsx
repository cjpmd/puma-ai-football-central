import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { SafeDashboardLayout } from '@/components/layout/SafeDashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { supabase as supabaseClient } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Plus, Trash2, Upload, RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react';

const supabase = supabaseClient as any;

function AcademyProfileTab() {
  const qc = useQueryClient();
  const { data: settings } = useQuery({
    queryKey: ['academy-settings'],
    queryFn: async () => {
      const { data } = await supabase.from('academy_settings').select('*').maybeSingle();
      return data;
    },
  });

  const [form, setForm] = useState({ academy_name: '', contact_email: '', contact_phone: '', address: '' });
  useEffect(() => {
    if (settings) setForm({
      academy_name: settings.academy_name ?? '',
      contact_email: settings.contact_email ?? '',
      contact_phone: settings.contact_phone ?? '',
      address: settings.address ?? '',
    });
  }, [settings]);

  const save = useMutation({
    mutationFn: async () => {
      if (settings) {
        await supabase.from('academy_settings').update({ ...form, updated_at: new Date().toISOString() }).eq('id', settings.id);
      } else {
        await supabase.from('academy_settings').insert(form);
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['academy-settings'] }),
  });

  return (
    <div className="space-y-4 max-w-lg">
      <div><Label>Academy Name</Label><Input value={form.academy_name} onChange={e => setForm(p => ({ ...p, academy_name: e.target.value }))} /></div>
      <div><Label>Contact Email</Label><Input type="email" value={form.contact_email} onChange={e => setForm(p => ({ ...p, contact_email: e.target.value }))} /></div>
      <div><Label>Contact Phone</Label><Input value={form.contact_phone} onChange={e => setForm(p => ({ ...p, contact_phone: e.target.value }))} /></div>
      <div><Label>Address</Label><Input value={form.address} onChange={e => setForm(p => ({ ...p, address: e.target.value }))} /></div>
      <Button onClick={() => save.mutate()} disabled={save.isPending}>{save.isPending ? 'Saving...' : 'Save Profile'}</Button>
    </div>
  );
}

function AttributeFrameworkTab() {
  const qc = useQueryClient();
  const [newAttr, setNewAttr] = useState({ name: '', category: '', description: '' });

  const { data: attrs = [] } = useQuery({
    queryKey: ['attribute-definitions'],
    queryFn: async () => {
      const { data } = await supabase.from('attribute_definition').select('*').order('category').order('name');
      return data ?? [];
    },
  });

  const addAttr = useMutation({
    mutationFn: async () => { await supabase.from('attribute_definition').insert(newAttr); },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['attribute-definitions'] }); setNewAttr({ name: '', category: '', description: '' }); },
  });

  const deleteAttr = useMutation({
    mutationFn: async (id: string) => { await supabase.from('attribute_definition').delete().eq('id', id); },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['attribute-definitions'] }),
  });

  const categories = [...new Set(attrs.map((a: any) => a.category))].filter(Boolean);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader><CardTitle className="text-base">Add Attribute</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div><Label>Name *</Label><Input value={newAttr.name} onChange={e => setNewAttr(p => ({ ...p, name: e.target.value }))} /></div>
            <div><Label>Category</Label><Input value={newAttr.category} onChange={e => setNewAttr(p => ({ ...p, category: e.target.value }))} placeholder="e.g. Technical" /></div>
          </div>
          <div><Label>Description</Label><Input value={newAttr.description} onChange={e => setNewAttr(p => ({ ...p, description: e.target.value }))} /></div>
          <Button onClick={() => addAttr.mutate()} disabled={!newAttr.name || addAttr.isPending}><Plus className="w-4 h-4 mr-1" />Add Attribute</Button>
        </CardContent>
      </Card>
      {categories.map(cat => (
        <div key={cat as string}>
          <p className="font-medium text-sm mb-2">{cat as string}</p>
          <div className="space-y-1">
            {attrs.filter((a: any) => a.category === cat).map((attr: any) => (
              <div key={attr.id} className="flex items-center justify-between border rounded p-2">
                <div>
                  <span className="font-medium text-sm">{attr.name}</span>
                  {attr.description && <span className="text-xs text-muted-foreground ml-2">{attr.description}</span>}
                </div>
                <Button size="icon" variant="ghost" className="h-6 w-6 text-red-500" onClick={() => deleteAttr.mutate(attr.id)}><Trash2 className="w-3 h-3" /></Button>
              </div>
            ))}
          </div>
        </div>
      ))}
      {attrs.length === 0 && <p className="text-muted-foreground text-center py-4">No attributes defined</p>}
    </div>
  );
}

function CurriculumOutcomesTab() {
  const qc = useQueryClient();
  const [newOutcome, setNewOutcome] = useState({ title: '', phase: '', age_group: '' });

  const { data: outcomes = [] } = useQuery({
    queryKey: ['curriculum-outcomes-settings'],
    queryFn: async () => {
      const { data } = await supabase.from('curriculum_outcome').select('*').order('phase').order('title');
      return data ?? [];
    },
  });

  const addOutcome = useMutation({
    mutationFn: async () => { await supabase.from('curriculum_outcome').insert(newOutcome); },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['curriculum-outcomes-settings'] }); setNewOutcome({ title: '', phase: '', age_group: '' }); },
  });

  const deleteOutcome = useMutation({
    mutationFn: async (id: string) => { await supabase.from('curriculum_outcome').delete().eq('id', id); },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['curriculum-outcomes-settings'] }),
  });

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader><CardTitle className="text-base">Add Outcome</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div><Label>Title *</Label><Input value={newOutcome.title} onChange={e => setNewOutcome(p => ({ ...p, title: e.target.value }))} /></div>
          <div className="grid grid-cols-2 gap-2">
            <div><Label>Phase</Label><Input value={newOutcome.phase} onChange={e => setNewOutcome(p => ({ ...p, phase: e.target.value }))} /></div>
            <div><Label>Age Group</Label><Input value={newOutcome.age_group} onChange={e => setNewOutcome(p => ({ ...p, age_group: e.target.value }))} /></div>
          </div>
          <Button onClick={() => addOutcome.mutate()} disabled={!newOutcome.title || addOutcome.isPending}><Plus className="w-4 h-4 mr-1" />Add Outcome</Button>
        </CardContent>
      </Card>
      <div className="space-y-1">
        {outcomes.map((o: any) => (
          <div key={o.id} className="flex items-center justify-between border rounded p-2">
            <div>
              <span className="font-medium text-sm">{o.title}</span>
              {o.phase && <Badge variant="outline" className="ml-2 text-xs">{o.phase}</Badge>}
              {o.age_group && <Badge variant="secondary" className="ml-1 text-xs">{o.age_group}</Badge>}
            </div>
            <Button size="icon" variant="ghost" className="h-6 w-6 text-red-500" onClick={() => deleteOutcome.mutate(o.id)}><Trash2 className="w-3 h-3" /></Button>
          </div>
        ))}
        {outcomes.length === 0 && <p className="text-muted-foreground text-center py-4">No outcomes defined</p>}
      </div>
    </div>
  );
}

function EpppConfigTab() {
  const qc = useQueryClient();
  const [newItem, setNewItem] = useState({ title: '', category: '', description: '', is_mandatory: true });

  const { data: items = [] } = useQuery({
    queryKey: ['eppp-items-settings'],
    queryFn: async () => {
      const { data } = await supabase.from('eppp_item').select('*').order('category').order('title');
      return data ?? [];
    },
  });

  const addItem = useMutation({
    mutationFn: async () => { await supabase.from('eppp_item').insert(newItem); },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['eppp-items-settings'] }); setNewItem({ title: '', category: '', description: '', is_mandatory: true }); },
  });

  const deleteItem = useMutation({
    mutationFn: async (id: string) => { await supabase.from('eppp_item').delete().eq('id', id); },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['eppp-items-settings'] }),
  });

  const categories = [...new Set(items.map((i: any) => i.category))].filter(Boolean);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader><CardTitle className="text-base">Add EPPP Item</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div><Label>Title *</Label><Input value={newItem.title} onChange={e => setNewItem(p => ({ ...p, title: e.target.value }))} /></div>
            <div><Label>Category *</Label><Input value={newItem.category} onChange={e => setNewItem(p => ({ ...p, category: e.target.value }))} placeholder="e.g. Coaching" /></div>
          </div>
          <div><Label>Description</Label><Input value={newItem.description} onChange={e => setNewItem(p => ({ ...p, description: e.target.value }))} /></div>
          <div className="flex items-center gap-2">
            <Switch checked={newItem.is_mandatory} onCheckedChange={v => setNewItem(p => ({ ...p, is_mandatory: v }))} />
            <Label>Mandatory</Label>
          </div>
          <Button onClick={() => addItem.mutate()} disabled={!newItem.title || !newItem.category || addItem.isPending}><Plus className="w-4 h-4 mr-1" />Add Item</Button>
        </CardContent>
      </Card>
      {categories.map(cat => (
        <div key={cat as string}>
          <p className="font-medium text-sm mb-2">{cat as string}</p>
          <div className="space-y-1">
            {items.filter((i: any) => i.category === cat).map((item: any) => (
              <div key={item.id} className="flex items-center justify-between border rounded p-2">
                <div>
                  <span className="font-medium text-sm">{item.title}</span>
                  {item.is_mandatory && <Badge className="ml-2 bg-red-100 text-red-700 text-xs">Mandatory</Badge>}
                  {item.description && <p className="text-xs text-muted-foreground">{item.description}</p>}
                </div>
                <Button size="icon" variant="ghost" className="h-6 w-6 text-red-500" onClick={() => deleteItem.mutate(item.id)}><Trash2 className="w-3 h-3" /></Button>
              </div>
            ))}
          </div>
        </div>
      ))}
      {items.length === 0 && <p className="text-muted-foreground text-center py-4">No EPPP items configured</p>}
    </div>
  );
}

function IntegrationsTab() {
  const [gpsFile, setGpsFile] = useState<File | null>(null);
  const [gpsSource, setGpsSource] = useState('catapult');
  const [gpsSessionDate, setGpsSessionDate] = useState('');
  const [gpsResult, setGpsResult] = useState<any>(null);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [syncLoading, setSyncLoading] = useState(false);
  const [syncResult, setSyncResult] = useState<any>(null);

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

  async function importGPS() {
    if (!gpsFile) return;
    setGpsLoading(true);
    setGpsResult(null);
    try {
      const fd = new FormData();
      fd.append('file', gpsFile);
      fd.append('source', gpsSource);
      if (gpsSessionDate) fd.append('session_date', gpsSessionDate);
      const { data: { session } } = await (supabaseClient as any).auth.getSession();
      const resp = await fetch(`${supabaseUrl}/functions/v1/import-gps`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${session?.access_token}` },
        body: fd,
      });
      setGpsResult(await resp.json());
    } catch (e) {
      setGpsResult({ error: String(e) });
    }
    setGpsLoading(false);
  }

  async function triggerSync() {
    setSyncLoading(true);
    setSyncResult(null);
    try {
      const { data: { session } } = await (supabaseClient as any).auth.getSession();
      const resp = await fetch(`${supabaseUrl}/functions/v1/sync-performance-summary`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${session?.access_token}`, 'Content-Type': 'application/json' },
        body: '{}',
      });
      setSyncResult(await resp.json());
    } catch (e) {
      setSyncResult({ error: String(e) });
    }
    setSyncLoading(false);
  }

  return (
    <div className="space-y-6 max-w-lg">
      <Card>
        <CardHeader><CardTitle className="text-base">GPS Import</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label>GPS Provider</Label>
            <select className="w-full border rounded p-2 text-sm" value={gpsSource} onChange={e => setGpsSource(e.target.value)}>
              <option value="catapult">Catapult</option>
              <option value="statsports">STATSports</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div><Label>Session Date (optional — overrides CSV date column)</Label><Input type="date" value={gpsSessionDate} onChange={e => setGpsSessionDate(e.target.value)} /></div>
          <div><Label>CSV File</Label><Input type="file" accept=".csv" onChange={e => setGpsFile(e.target.files?.[0] ?? null)} /></div>
          <Button onClick={importGPS} disabled={!gpsFile || gpsLoading}>
            <Upload className="w-4 h-4 mr-2" />{gpsLoading ? 'Importing...' : 'Import GPS Data'}
          </Button>
          {gpsResult && (
            <div className={`rounded p-3 text-sm ${gpsResult.error ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
              {gpsResult.error ? (
                <><AlertCircle className="w-4 h-4 inline mr-1" />{gpsResult.error}</>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 inline mr-1" />
                  Inserted: {gpsResult.inserted}, Skipped: {gpsResult.skipped}
                  {gpsResult.errors?.length > 0 && <div className="mt-1 text-xs">{gpsResult.errors.slice(0, 3).join('; ')}</div>}
                </>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Performance Summary Sync</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">Recalculates availability status, ACWR rating, and maturation badge for all active players.</p>
          <Button onClick={triggerSync} disabled={syncLoading} variant="outline">
            <RefreshCw className={`w-4 h-4 mr-2 ${syncLoading ? 'animate-spin' : ''}`} />{syncLoading ? 'Syncing...' : 'Run Sync Now'}
          </Button>
          {syncResult && (
            <div className={`rounded p-3 text-sm ${syncResult.error ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
              {syncResult.error ? (
                <><AlertCircle className="w-4 h-4 inline mr-1" />{syncResult.error}</>
              ) : (
                <><CheckCircle2 className="w-4 h-4 inline mr-1" />Updated {syncResult.updated} of {syncResult.total} players</>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function NotificationsTab() {
  const qc = useQueryClient();
  const { user } = useAuth() as any;

  const { data: prefs } = useQuery({
    queryKey: ['notification-preferences', user?.id],
    queryFn: async () => {
      const { data } = await supabase.from('notification_preference').select('*').eq('user_id', user.id).maybeSingle();
      return data;
    },
    enabled: !!user?.id,
  });

  const [form, setForm] = useState({ injury_alerts: true, deadline_alerts: true, eppp_alerts: true, weekly_summary: false });
  useEffect(() => {
    if (prefs) setForm({
      injury_alerts: prefs.injury_alerts,
      deadline_alerts: prefs.deadline_alerts,
      eppp_alerts: prefs.eppp_alerts,
      weekly_summary: prefs.weekly_summary,
    });
  }, [prefs]);

  const save = useMutation({
    mutationFn: async () => {
      await supabase.from('notification_preference').upsert({ user_id: user.id, ...form, updated_at: new Date().toISOString() });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notification-preferences', user?.id] }),
  });

  const prefsList = [
    { key: 'injury_alerts', label: 'Injury Alerts', description: 'Notifications when a player sustains an injury' },
    { key: 'deadline_alerts', label: 'Deadline Alerts', description: 'Registration and compliance deadlines' },
    { key: 'eppp_alerts', label: 'EPPP Alerts', description: 'EPPP compliance items requiring action' },
    { key: 'weekly_summary', label: 'Weekly Summary', description: 'Weekly digest of academy activity' },
  ];

  return (
    <div className="space-y-4 max-w-lg">
      {prefsList.map(({ key, label, description }) => (
        <div key={key} className="flex items-center justify-between border rounded p-4">
          <div>
            <p className="font-medium">{label}</p>
            <p className="text-sm text-muted-foreground">{description}</p>
          </div>
          <Switch
            checked={form[key as keyof typeof form] as boolean}
            onCheckedChange={v => setForm(p => ({ ...p, [key]: v }))}
          />
        </div>
      ))}
      <Button onClick={() => save.mutate()} disabled={save.isPending}>{save.isPending ? 'Saving...' : 'Save Preferences'}</Button>
    </div>
  );
}

export default function Settings() {
  return (
    <SafeDashboardLayout>
      <div className="p-6 space-y-4">
        <h1 className="text-2xl font-bold">Settings</h1>
        <Tabs defaultValue="academy">
          <TabsList className="flex-wrap h-auto gap-1">
            <TabsTrigger value="academy">Academy Profile</TabsTrigger>
            <TabsTrigger value="attributes">Attribute Framework</TabsTrigger>
            <TabsTrigger value="outcomes">Curriculum Outcomes</TabsTrigger>
            <TabsTrigger value="eppp">EPPP Config</TabsTrigger>
            <TabsTrigger value="integrations">Integrations</TabsTrigger>
            <TabsTrigger value="notifications">Notifications</TabsTrigger>
          </TabsList>
          <TabsContent value="academy" className="mt-4"><AcademyProfileTab /></TabsContent>
          <TabsContent value="attributes" className="mt-4"><AttributeFrameworkTab /></TabsContent>
          <TabsContent value="outcomes" className="mt-4"><CurriculumOutcomesTab /></TabsContent>
          <TabsContent value="eppp" className="mt-4"><EpppConfigTab /></TabsContent>
          <TabsContent value="integrations" className="mt-4"><IntegrationsTab /></TabsContent>
          <TabsContent value="notifications" className="mt-4"><NotificationsTab /></TabsContent>
        </Tabs>
      </div>
    </SafeDashboardLayout>
  );
}
