import { useState, useEffect } from 'react';
import { supabase as supabaseClient } from '@/integrations/supabase/client';
const supabase = supabaseClient as any;
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle } from 'lucide-react';

interface Props {
  players: { id: string; name: string }[];
  defaultPlayerId?: string;
  onClose: () => void;
  onSaved: () => void;
}

const BODY_PARTS = ['Ankle','Knee','Hamstring','Quadriceps','Groin','Hip','Calf','Shin','Foot','Shoulder','Elbow','Wrist','Head','Back','Other'];
const INJURY_TYPES = ['Muscle strain','Ligament sprain','Fracture','Contusion','Tendinopathy','Laceration','Concussion','Other'];

export default function InjuryLogModal({ players, defaultPlayerId, onClose, onSaved }: Props) {
  const [form, setForm] = useState({
    player_id: defaultPlayerId ?? '',
    injury_date: new Date().toISOString().split('T')[0],
    body_part: '',
    injury_type: '',
    severity: 'moderate',
    notes: '',
  });
  const [recurrence, setRecurrence] = useState<{ count: number; last_date: string } | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (form.body_part && form.player_id) {
      checkRecurrence(form.body_part, form.player_id);
    }
  }, [form.body_part, form.player_id]);

  async function checkRecurrence(bodyPart: string, pid: string) {
    const cutoff = new Date();
    cutoff.setFullYear(cutoff.getFullYear() - 1);
    const { data } = await supabase
      .from('injury_record')
      .select('injury_date')
      .eq('player_id', pid)
      .eq('body_part', bodyPart)
      .gte('injury_date', cutoff.toISOString().split('T')[0])
      .order('injury_date', { ascending: false });
    setRecurrence(data?.length ? { count: data.length, last_date: data[0].injury_date } : null);
  }

  async function handleSave() {
    if (!form.player_id || !form.body_part || !form.injury_type) return;
    setSaving(true);
    await supabase.from('injury_record').insert({
      player_id: form.player_id,
      injury_date: form.injury_date,
      body_part: form.body_part,
      injury_type: form.injury_type,
      severity: form.severity,
      notes: form.notes || null,
      rtp_phase: 0,
    });
    setSaving(false);
    onSaved();
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader><CardTitle>Log Injury</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {recurrence && (
            <div className="flex items-center gap-2 rounded-md bg-amber-500/10 border border-amber-500/30 p-3 text-sm text-amber-300">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              Recurrence: {recurrence.count} same-site injury in last 12 months (last: {recurrence.last_date})
            </div>
          )}

          <div className="space-y-1">
            <Label>Player</Label>
            <Select value={form.player_id} onValueChange={v => setForm(f => ({ ...f, player_id: v }))}>
              <SelectTrigger><SelectValue placeholder="Select player" /></SelectTrigger>
              <SelectContent>{players.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label>Injury Date</Label>
            <Input type="date" value={form.injury_date} onChange={e => setForm(f => ({ ...f, injury_date: e.target.value }))} />
          </div>

          <div className="space-y-1">
            <Label>Body Part</Label>
            <Select value={form.body_part} onValueChange={v => setForm(f => ({ ...f, body_part: v }))}>
              <SelectTrigger><SelectValue placeholder="Select body part" /></SelectTrigger>
              <SelectContent>{BODY_PARTS.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label>Injury Type</Label>
            <Select value={form.injury_type} onValueChange={v => setForm(f => ({ ...f, injury_type: v }))}>
              <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
              <SelectContent>{INJURY_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label>Severity</Label>
            <Select value={form.severity} onValueChange={v => setForm(f => ({ ...f, severity: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="minor">Minor</SelectItem>
                <SelectItem value="moderate">Moderate</SelectItem>
                <SelectItem value="severe">Severe</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label>Notes</Label>
            <Input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Optional" />
          </div>

          <div className="flex gap-2 justify-end pt-2">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving || !form.player_id || !form.body_part || !form.injury_type}>
              {saving ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
