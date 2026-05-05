import { useState } from 'react';
import { supabase as supabaseClient } from '@/integrations/supabase/client';
const supabase = supabaseClient as any;
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface Props {
  players: { id: string; name: string }[];
  onClose: () => void;
  onSaved: () => void;
}

export default function AttendanceModal({ players, onClose, onSaved }: Props) {
  const [form, setForm] = useState({
    player_id: '',
    academic_year: '2024/25',
    term: 'autumn',
    school_name: '',
    sessions_possible: '',
    sessions_attended: '',
  });
  const [saving, setSaving] = useState(false);

  const pct = form.sessions_possible && form.sessions_attended
    ? ((Number(form.sessions_attended) / Number(form.sessions_possible)) * 100).toFixed(1)
    : null;

  async function handleSave() {
    if (!form.player_id || !form.sessions_possible || !form.sessions_attended) return;
    setSaving(true);
    await supabase.from('school_attendance').upsert({
      player_id: form.player_id,
      academic_year: form.academic_year,
      term: form.term,
      school_name: form.school_name || null,
      sessions_possible: Number(form.sessions_possible),
      sessions_attended: Number(form.sessions_attended),
    }, { onConflict: 'player_id,academic_year,term' });
    setSaving(false);
    onSaved();
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader><CardTitle>Add Attendance Record</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1">
            <Label>Player</Label>
            <Select value={form.player_id} onValueChange={v => setForm(f => ({ ...f, player_id: v }))}>
              <SelectTrigger><SelectValue placeholder="Select player" /></SelectTrigger>
              <SelectContent>
                {players.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Academic Year</Label>
              <Select value={form.academic_year} onValueChange={v => setForm(f => ({ ...f, academic_year: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['2024/25','2023/24','2022/23'].map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Term</Label>
              <Select value={form.term} onValueChange={v => setForm(f => ({ ...f, term: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="autumn">Autumn</SelectItem>
                  <SelectItem value="spring">Spring</SelectItem>
                  <SelectItem value="summer">Summer</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1">
            <Label>School Name</Label>
            <Input
              value={form.school_name}
              onChange={e => setForm(f => ({ ...f, school_name: e.target.value }))}
              placeholder="Optional"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Sessions Possible</Label>
              <Input
                type="number" min="0"
                value={form.sessions_possible}
                onChange={e => setForm(f => ({ ...f, sessions_possible: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label>Sessions Attended</Label>
              <Input
                type="number" min="0"
                value={form.sessions_attended}
                onChange={e => setForm(f => ({ ...f, sessions_attended: e.target.value }))}
              />
            </div>
          </div>

          {pct !== null && (
            <p className={`text-sm font-medium ${
              Number(pct) < 80 ? 'text-red-400' : Number(pct) < 90 ? 'text-amber-400' : 'text-emerald-400'
            }`}>Attendance: {pct}%</p>
          )}

          <div className="flex gap-2 justify-end pt-2">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button
              onClick={handleSave}
              disabled={saving || !form.player_id || !form.sessions_possible || !form.sessions_attended}
            >
              {saving ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
