import { useState } from 'react';
import { supabase as supabaseClient } from '@/integrations/supabase/client';
const supabase = supabaseClient as any;
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface Props {
  players: { id: string; name: string }[];
  defaultPlayerId?: string;
  onClose: () => void;
  onSaved: () => void;
}

const LOG_TYPES = ['general','behaviour','academic','mental_health','family','safeguarding'];
const STATUS_OPTIONS = ['open','in_progress','resolved','monitoring'];
const TAG_SUGGESTIONS = ['urgent','follow_up','parent_informed','external_referral','eppp'];

export default function PastoralLogModal({ players, defaultPlayerId, onClose, onSaved }: Props) {
  const [form, setForm] = useState({
    player_id: defaultPlayerId ?? '',
    type: 'general',
    content: '',
    status: 'open',
    tags: [] as string[],
  });
  const [saving, setSaving] = useState(false);

  function toggleTag(tag: string) {
    setForm(f => ({
      ...f,
      tags: f.tags.includes(tag) ? f.tags.filter(t => t !== tag) : [...f.tags, tag],
    }));
  }

  async function handleSave() {
    if (!form.player_id || !form.content) return;
    setSaving(true);
    await supabase.from('welfare_log').insert({
      player_id: form.player_id,
      type: form.type,
      content: form.content,
      status: form.status,
      tags: form.tags,
    });
    setSaving(false);
    onSaved();
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md max-h-[90vh] overflow-y-auto">
        <CardHeader><CardTitle>New Pastoral Log Entry</CardTitle></CardHeader>
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

          <div className="space-y-1">
            <Label>Type</Label>
            <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {LOG_TYPES.map(t => (
                  <SelectItem key={t} value={t} className="capitalize">{t.replace('_', ' ')}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {form.type === 'safeguarding' && (
              <p className="text-xs text-amber-400 mt-1">
                This entry will be marked restricted (welfare officers only).
              </p>
            )}
          </div>

          <div className="space-y-1">
            <Label>Status</Label>
            <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map(s => (
                  <SelectItem key={s} value={s} className="capitalize">{s.replace('_', ' ')}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label>Content</Label>
            <Textarea
              value={form.content}
              onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
              placeholder="Describe the concern or observation…"
              rows={4}
            />
          </div>

          <div className="space-y-2">
            <Label>Tags</Label>
            <div className="flex flex-wrap gap-2">
              {TAG_SUGGESTIONS.map(tag => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => toggleTag(tag)}
                  className={`px-2 py-1 rounded-full text-xs border transition-colors ${
                    form.tags.includes(tag)
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'border-border text-muted-foreground hover:border-primary'
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-2 justify-end pt-2">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving || !form.player_id || !form.content}>
              {saving ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
