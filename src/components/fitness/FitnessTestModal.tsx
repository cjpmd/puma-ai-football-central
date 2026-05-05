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
import type { Benchmark } from '@/pages/FitnessTesting';
import { interpolatePercentile } from '@/pages/FitnessTesting';

interface Props {
  players: { id: string; name: string }[];
  benchmarks: Benchmark[];
  bioAgeMap: Map<string, number>;
  onClose: () => void;
  onSaved: () => void;
}

const PRESET_TESTS = [
  '10m Sprint', '20m Sprint', '30m Sprint', 'Yo-Yo Test',
  'CMJ Height', 'Broad Jump', 'Illinois Agility', 'Grip Strength',
];

export default function FitnessTestModal({ players, benchmarks, bioAgeMap, onClose, onSaved }: Props) {
  const [form, setForm] = useState({
    player_id: '',
    test_date: new Date().toISOString().split('T')[0],
    test_name: '',
    custom_name: '',
    value: '',
    unit: '',
    notes: '',
  });
  const [preview, setPreview] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  const effectiveTestName = form.test_name === '__custom__' ? form.custom_name : form.test_name;

  useEffect(() => {
    if (!effectiveTestName || !form.value || !form.player_id) { setPreview(null); return; }
    const bioAge = bioAgeMap.get(form.player_id);
    if (!bioAge) { setPreview(null); return; }
    const bms = benchmarks.filter(b => b.test_name === effectiveTestName);
    if (bms.length === 0) { setPreview(null); return; }
    const bm = bms.reduce((c, b) => Math.abs(b.bio_age - bioAge) < Math.abs(c.bio_age - bioAge) ? b : c);
    setPreview(Math.round(interpolatePercentile(Number(form.value), bm, effectiveTestName)));
  }, [effectiveTestName, form.value, form.player_id, benchmarks, bioAgeMap]);

  async function handleSave() {
    if (!form.player_id || !effectiveTestName || !form.value) return;
    setSaving(true);
    const bioAge = bioAgeMap.get(form.player_id) ?? null;
    await supabase.from('fitness_test_result').insert({
      player_id: form.player_id,
      test_date: form.test_date,
      test_name: effectiveTestName,
      value: Number(form.value),
      unit: form.unit || null,
      percentile: preview,
      bio_age: bioAge,
      notes: form.notes || null,
    });
    setSaving(false);
    onSaved();
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader><CardTitle>Add Fitness Test Result</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1">
            <Label>Player</Label>
            <Select value={form.player_id} onValueChange={v => setForm(f => ({ ...f, player_id: v }))}>
              <SelectTrigger><SelectValue placeholder="Select player" /></SelectTrigger>
              <SelectContent>{players.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label>Test Date</Label>
            <Input type="date" value={form.test_date} onChange={e => setForm(f => ({ ...f, test_date: e.target.value }))} />
          </div>

          <div className="space-y-1">
            <Label>Test</Label>
            <Select value={form.test_name} onValueChange={v => setForm(f => ({ ...f, test_name: v }))}>
              <SelectTrigger><SelectValue placeholder="Select test" /></SelectTrigger>
              <SelectContent>
                {PRESET_TESTS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                <SelectItem value="__custom__">Custom…</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {form.test_name === '__custom__' && (
            <div className="space-y-1">
              <Label>Test Name</Label>
              <Input
                value={form.custom_name}
                onChange={e => setForm(f => ({ ...f, custom_name: e.target.value }))}
                placeholder="e.g. Standing Broad Jump"
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Value</Label>
              <Input type="number" step="0.01" value={form.value} onChange={e => setForm(f => ({ ...f, value: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Unit</Label>
              <Input value={form.unit} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))} placeholder="s / cm / reps" />
            </div>
          </div>

          {preview !== null && (
            <p className="text-sm">
              Percentile:{' '}
              <span className={preview < 25 ? 'text-red-400 font-bold' : preview < 50 ? 'text-amber-400 font-bold' : 'text-emerald-400 font-bold'}>
                P{preview}
              </span>
              {!bioAgeMap.has(form.player_id) && (
                <span className="text-xs text-muted-foreground ml-2">(no bio age on record)</span>
              )}
            </p>
          )}

          <div className="space-y-1">
            <Label>Notes</Label>
            <Input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Optional" />
          </div>

          <div className="flex gap-2 justify-end pt-2">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving || !form.player_id || !effectiveTestName || !form.value}>
              {saving ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
