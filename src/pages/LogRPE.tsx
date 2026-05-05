import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase as supabaseClient } from '@/integrations/supabase/client';
const supabase = supabaseClient as any;
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function LogRPE() {
  const { token } = useParams<{ token: string }>();
  const [player, setPlayer] = useState<{ id: string; name: string } | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [form, setForm] = useState({
    session_date: new Date().toISOString().split('T')[0],
    rpe: '',
    duration: '',
  });
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!token) return;
    supabase
      .from('players')
      .select('id, name')
      .eq('log_token', token)
      .maybeSingle()
      .then(({ data }: any) => {
        if (data) setPlayer(data);
        else setNotFound(true);
      });
  }, [token]);

  async function calcAcwr(playerId: string, sessionDate: string, todayLoad: number): Promise<number | null> {
    const acuteCutoff = new Date(sessionDate);
    acuteCutoff.setDate(acuteCutoff.getDate() - 6);
    const chronicCutoff = new Date(sessionDate);
    chronicCutoff.setDate(chronicCutoff.getDate() - 27);

    const { data: rows } = await supabase
      .from('training_load')
      .select('session_date, load_au')
      .eq('player_id', playerId)
      .lt('session_date', sessionDate)
      .gte('session_date', chronicCutoff.toISOString().split('T')[0]);

    if (!rows) return null;
    const acuteRows = (rows as any[]).filter(
      (r: any) => r.session_date >= acuteCutoff.toISOString().split('T')[0]
    );
    const acuteSum = acuteRows.reduce((s: number, r: any) => s + r.load_au, 0) + todayLoad;
    const chronicSum = (rows as any[]).reduce((s: number, r: any) => s + r.load_au, 0) + todayLoad;
    if (chronicSum === 0) return null;
    return Math.round((acuteSum / 7 / (chronicSum / 28)) * 100) / 100;
  }

  async function handleSave() {
    if (!player || !form.rpe || !form.duration) return;
    setSaving(true);
    const load_au = Number(form.rpe) * Number(form.duration);
    const acwr_at_time = await calcAcwr(player.id, form.session_date, load_au);
    await supabase.from('training_load').insert({
      player_id: player.id,
      session_date: form.session_date,
      rpe: Number(form.rpe),
      duration_minutes: Number(form.duration),
      load_au,
      acwr_at_time,
    });
    setSaving(false);
    setSaved(true);
  }

  if (notFound) return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardContent className="p-6 text-center text-muted-foreground">Invalid or expired link.</CardContent>
      </Card>
    </div>
  );

  if (!player) return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <p className="text-muted-foreground">Loading...</p>
    </div>
  );

  if (saved) return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardContent className="p-6 text-center">
          <p className="font-semibold text-emerald-400">Saved!</p>
          <p className="text-sm text-muted-foreground mt-1">RPE logged for {player.name}.</p>
        </CardContent>
      </Card>
    </div>
  );

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-sm">
        <CardHeader><CardTitle>Log Training Load</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">Player: <strong>{player.name}</strong></p>

          <div className="space-y-1">
            <Label>Session Date</Label>
            <Input type="date" value={form.session_date} onChange={e => setForm(f => ({ ...f, session_date: e.target.value }))} />
          </div>

          <div className="space-y-1">
            <Label>RPE (1–10)</Label>
            <Input type="number" min="1" max="10" value={form.rpe} onChange={e => setForm(f => ({ ...f, rpe: e.target.value }))} placeholder="6" />
          </div>

          <div className="space-y-1">
            <Label>Duration (minutes)</Label>
            <Input type="number" min="1" value={form.duration} onChange={e => setForm(f => ({ ...f, duration: e.target.value }))} placeholder="90" />
          </div>

          {form.rpe && form.duration && (
            <p className="text-xs text-muted-foreground">Load AU: {Number(form.rpe) * Number(form.duration)}</p>
          )}

          <Button className="w-full" onClick={handleSave} disabled={saving || !form.rpe || !form.duration}>
            {saving ? 'Saving...' : 'Submit'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
