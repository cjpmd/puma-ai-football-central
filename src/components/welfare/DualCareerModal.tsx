import { useState } from 'react';
import { supabase as supabaseClient } from '@/integrations/supabase/client';
const supabase = supabaseClient as any;
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PlusCircle, X } from 'lucide-react';

interface ExamPeriod {
  label: string;
  start: string;
  end: string;
}

interface Props {
  playerId: string;
  playerName: string;
  existingPlan: any | null;
  onClose: () => void;
  onSaved: () => void;
}

export default function DualCareerModal({ playerId, playerName, existingPlan, onClose, onSaved }: Props) {
  const [form, setForm] = useState({
    school_name: existingPlan?.school_name ?? '',
    year_group: existingPlan?.year_group ?? '',
    qualifications: existingPlan?.qualifications ?? '',
    career_aspirations: existingPlan?.career_aspirations ?? '',
    load_reduction_pct: existingPlan?.load_reduction_pct?.toString() ?? '0',
    exam_periods: (existingPlan?.exam_periods ?? []) as ExamPeriod[],
  });
  const [saving, setSaving] = useState(false);

  function addExamPeriod() {
    setForm(f => ({ ...f, exam_periods: [...f.exam_periods, { label: '', start: '', end: '' }] }));
  }

  function removeExamPeriod(i: number) {
    setForm(f => ({ ...f, exam_periods: f.exam_periods.filter((_, idx) => idx !== i) }));
  }

  function updateExamPeriod(i: number, field: keyof ExamPeriod, value: string) {
    setForm(f => {
      const eps = [...f.exam_periods];
      eps[i] = { ...eps[i], [field]: value };
      return { ...f, exam_periods: eps };
    });
  }

  async function handleSave() {
    setSaving(true);
    const payload = {
      player_id: playerId,
      school_name: form.school_name || null,
      year_group: form.year_group || null,
      qualifications: form.qualifications || null,
      career_aspirations: form.career_aspirations || null,
      load_reduction_pct: Number(form.load_reduction_pct),
      exam_periods: form.exam_periods.filter(ep => ep.start && ep.end),
    };
    if (existingPlan) {
      await supabase.from('education_plan').update(payload).eq('id', existingPlan.id);
    } else {
      await supabase.from('education_plan').insert(payload);
    }
    setSaving(false);
    onSaved();
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <CardHeader><CardTitle>Education Plan — {playerName}</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>School Name</Label>
              <Input
                value={form.school_name}
                onChange={e => setForm(f => ({ ...f, school_name: e.target.value }))}
                placeholder="Optional"
              />
            </div>
            <div className="space-y-1">
              <Label>Year Group</Label>
              <Input
                value={form.year_group}
                onChange={e => setForm(f => ({ ...f, year_group: e.target.value }))}
                placeholder="e.g. 11"
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label>Qualifications</Label>
            <Input
              value={form.qualifications}
              onChange={e => setForm(f => ({ ...f, qualifications: e.target.value }))}
              placeholder="e.g. GCSEs, A-Levels"
            />
          </div>

          <div className="space-y-1">
            <Label>Career Aspirations</Label>
            <Input
              value={form.career_aspirations}
              onChange={e => setForm(f => ({ ...f, career_aspirations: e.target.value }))}
              placeholder="Optional"
            />
          </div>

          <div className="space-y-1">
            <Label>Load Reduction During Exams (%)</Label>
            <Input
              type="number" min="0" max="100"
              value={form.load_reduction_pct}
              onChange={e => setForm(f => ({ ...f, load_reduction_pct: e.target.value }))}
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Exam Periods</Label>
              <Button type="button" size="sm" variant="ghost" onClick={addExamPeriod}>
                <PlusCircle className="h-4 w-4 mr-1" />Add
              </Button>
            </div>
            {form.exam_periods.map((ep, i) => (
              <div key={i} className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2 items-end">
                <div className="space-y-1">
                  <Label className="text-xs">Label</Label>
                  <Input
                    value={ep.label}
                    onChange={e => updateExamPeriod(i, 'label', e.target.value)}
                    placeholder="e.g. GCSEs"
                    className="h-8 text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Start</Label>
                  <Input
                    type="date" value={ep.start}
                    onChange={e => updateExamPeriod(i, 'start', e.target.value)}
                    className="h-8 text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">End</Label>
                  <Input
                    type="date" value={ep.end}
                    onChange={e => updateExamPeriod(i, 'end', e.target.value)}
                    className="h-8 text-sm"
                  />
                </div>
                <Button
                  type="button" variant="ghost" size="sm"
                  className="h-8 w-8 p-0" onClick={() => removeExamPeriod(i)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>

          <div className="flex gap-2 justify-end pt-2">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : existingPlan ? 'Update' : 'Save'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
