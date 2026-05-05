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
  onClose: () => void;
  onSaved: () => void;
}

const CATEGORIES = ['DBS Checks','Training & Qualifications','Policy Review','Procedures','Reporting','Other'];
const STATUS_OPTIONS = ['not_started','in_progress','compliant','overdue','expired'];

export default function SafeguardingChecklistModal({ onClose, onSaved }: Props) {
  const [form, setForm] = useState({
    category: '',
    item_name: '',
    responsible_person: '',
    status: 'not_started',
    expiry_date: '',
    notes: '',
  });
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!form.category || !form.item_name) return;
    setSaving(true);
    await supabase.from('safeguarding_checklist').insert({
      category: form.category,
      item_name: form.item_name,
      responsible_person: form.responsible_person || null,
      status: form.status,
      expiry_date: form.expiry_date || null,
      notes: form.notes || null,
    });
    setSaving(false);
    onSaved();
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader><CardTitle>Add Safeguarding Item</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1">
            <Label>Category</Label>
            <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
              <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
              <SelectContent>
                {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label>Item Name</Label>
            <Input
              value={form.item_name}
              onChange={e => setForm(f => ({ ...f, item_name: e.target.value }))}
              placeholder="e.g. Staff DBS renewal — J. Smith"
            />
          </div>

          <div className="space-y-1">
            <Label>Responsible Person</Label>
            <Input
              value={form.responsible_person}
              onChange={e => setForm(f => ({ ...f, responsible_person: e.target.value }))}
              placeholder="Optional"
            />
          </div>

          <div className="space-y-1">
            <Label>Status</Label>
            <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map(s => (
                  <SelectItem key={s} value={s} className="capitalize">{s.replace('_',' ')}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label>Expiry Date</Label>
            <Input
              type="date"
              value={form.expiry_date}
              onChange={e => setForm(f => ({ ...f, expiry_date: e.target.value }))}
            />
          </div>

          <div className="space-y-1">
            <Label>Notes</Label>
            <Input
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              placeholder="Optional"
            />
          </div>

          <div className="flex gap-2 justify-end pt-2">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving || !form.category || !form.item_name}>
              {saving ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
