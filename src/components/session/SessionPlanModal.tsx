import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { supabase as supabaseClient } from "@/integrations/supabase/client";

const supabase = supabaseClient as any;
const AGE_GROUPS = ["U9","U10","U11","U12","U13","U14","U15","U16","U17","U18","U21"];

interface Props {
  plan?: any;
  outcomes: any[];
  onClose: () => void;
  onSaved: () => void;
}

export default function SessionPlanModal({ plan, outcomes, onClose, onSaved }: Props) {
  const initOutcomes = (plan?.outcomes ?? []).map((o: any) => o.outcome?.id).filter(Boolean);
  const [form, setForm] = useState({
    title:            plan?.title ?? "",
    age_group:        plan?.age_group ?? "",
    duration_minutes: plan?.duration_minutes?.toString() ?? "",
    objectives:       plan?.objectives ?? "",
    warm_up:          plan?.warm_up ?? "",
    main_activity:    plan?.main_activity ?? "",
    cool_down:        plan?.cool_down ?? "",
    equipment:        plan?.equipment ?? "",
  });
  const [selOutcomes, setSelOutcomes] = useState<string[]>(initOutcomes);
  const [newCode, setNewCode] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [saving, setSaving] = useState(false);

  const toggle = (id: string) =>
    setSelOutcomes((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);

  async function handleSave() {
    if (!form.title.trim()) return;
    setSaving(true);
    const payload: any = {
      title: form.title.trim(),
      age_group: form.age_group || null,
      duration_minutes: form.duration_minutes ? parseInt(form.duration_minutes) : null,
      objectives: form.objectives || null,
      warm_up: form.warm_up || null,
      main_activity: form.main_activity || null,
      cool_down: form.cool_down || null,
      equipment: form.equipment || null,
    };
    let planId = plan?.id;
    if (planId) {
      await supabase.from("session_plan").update(payload).eq("id", planId);
      await supabase.from("session_plan_outcome").delete().eq("session_plan_id", planId);
    } else {
      const { data } = await supabase.from("session_plan").insert(payload).select("id").single();
      planId = data?.id;
    }
    if (planId && selOutcomes.length > 0) {
      await supabase.from("session_plan_outcome").insert(
        selOutcomes.map((oid) => ({ session_plan_id: planId, outcome_id: oid }))
      );
    }
    if (planId && newCode.trim() && newDesc.trim()) {
      const { data: no } = await supabase.from("curriculum_outcome").insert({ code: newCode.trim(), description: newDesc.trim() }).select("id").single();
      if (no?.id) await supabase.from("session_plan_outcome").insert({ session_plan_id: planId, outcome_id: no.id });
    }
    setSaving(false);
    onSaved();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-card border rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 space-y-4">
        <h2 className="text-lg font-semibold">{plan ? "Edit Session Plan" : "New Session Plan"}</h2>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2 space-y-1"><Label>Title *</Label><Input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder="Session title" /></div>
          <div className="space-y-1">
            <Label>Age Group</Label>
            <Select value={form.age_group} onValueChange={(v) => setForm((f) => ({ ...f, age_group: v }))}>
              <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
              <SelectContent>{AGE_GROUPS.map((ag) => <SelectItem key={ag} value={ag}>{ag}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1"><Label>Duration (min)</Label><Input type="number" min={0} value={form.duration_minutes} onChange={(e) => setForm((f) => ({ ...f, duration_minutes: e.target.value }))} placeholder="90" /></div>
          <div className="col-span-2 space-y-1"><Label>Objectives</Label><Textarea value={form.objectives} onChange={(e) => setForm((f) => ({ ...f, objectives: e.target.value }))} rows={2} /></div>
          <div className="col-span-2 space-y-1"><Label>Warm Up</Label><Textarea value={form.warm_up} onChange={(e) => setForm((f) => ({ ...f, warm_up: e.target.value }))} rows={2} /></div>
          <div className="col-span-2 space-y-1"><Label>Main Activity</Label><Textarea value={form.main_activity} onChange={(e) => setForm((f) => ({ ...f, main_activity: e.target.value }))} rows={3} /></div>
          <div className="col-span-2 space-y-1"><Label>Cool Down</Label><Textarea value={form.cool_down} onChange={(e) => setForm((f) => ({ ...f, cool_down: e.target.value }))} rows={2} /></div>
          <div className="col-span-2 space-y-1"><Label>Equipment</Label><Input value={form.equipment} onChange={(e) => setForm((f) => ({ ...f, equipment: e.target.value }))} placeholder="Cones, bibs, balls…" /></div>
        </div>
        <div className="space-y-2 border-t pt-4">
          <Label>Curriculum Outcomes</Label>
          {outcomes.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {outcomes.map((o) => (
                <button key={o.id} onClick={() => toggle(o.id)}
                  className={`text-xs px-2 py-1 rounded border transition-colors ${
                    selOutcomes.includes(o.id)
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-muted text-muted-foreground border-border"
                  }`}>{o.code}</button>
              ))}
            </div>
          )}
          <p className="text-xs text-muted-foreground">Or add a new outcome:</p>
          <div className="flex gap-2">
            <Input value={newCode} onChange={(e) => setNewCode(e.target.value)} placeholder="Code (e.g. T1.2)" className="w-32" />
            <Input value={newDesc} onChange={(e) => setNewDesc(e.target.value)} placeholder="Description" className="flex-1" />
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving || !form.title.trim()}>{saving ? "Saving…" : "Save"}</Button>
        </div>
      </div>
    </div>
  );
}
