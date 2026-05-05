import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase as supabaseClient } from "@/integrations/supabase/client";

const supabase = supabaseClient as any;

const POSITIONS = ["GK","RB","CB","LB","CDM","CM","CAM","RM","LM","RW","LW","ST","CF"];

interface Props {
  prospect?: any;
  onClose: () => void;
  onSaved: () => void;
}

export default function ProspectModal({ prospect, onClose, onSaved }: Props) {
  const [form, setForm] = useState({
    name:                    prospect?.name ?? "",
    date_of_birth:           prospect?.date_of_birth ?? "",
    nationality:             prospect?.nationality ?? "",
    position:                prospect?.position ?? "",
    rating:                  prospect?.rating?.toString() ?? "",
    current_club:            prospect?.current_club ?? "",
    current_team:            prospect?.current_team ?? "",
    maturation_badge:        prospect?.maturation_badge ?? "",
    competing_interest:      prospect?.competing_interest ?? "",
    international_eligible:  prospect?.international_eligible ?? false,
    on_watchlist:            prospect?.on_watchlist ?? false,
    eppp_approach_date:      prospect?.eppp_approach_date ?? "",
    trial_decision_deadline: prospect?.trial_decision_deadline ?? "",
    notes:                   prospect?.notes ?? "",
  });
  const [saving, setSaving] = useState(false);

  const set = (k: string, v: any) => setForm((f) => ({ ...f, [k]: v }));

  async function handleSave() {
    if (!form.name.trim()) return;
    setSaving(true);
    const payload: any = {
      name:                    form.name.trim(),
      nationality:             form.nationality || null,
      position:                form.position || null,
      rating:                  form.rating ? parseFloat(form.rating) : null,
      current_club:            form.current_club || null,
      current_team:            form.current_team || null,
      maturation_badge:        form.maturation_badge || null,
      competing_interest:      form.competing_interest || null,
      international_eligible:  form.international_eligible,
      on_watchlist:            form.on_watchlist,
      eppp_approach_date:      form.eppp_approach_date || null,
      trial_decision_deadline: form.trial_decision_deadline || null,
      notes:                   form.notes || null,
    };
    if (form.date_of_birth) payload.date_of_birth = form.date_of_birth;

    if (prospect?.id) {
      await supabase.from("prospect").update(payload).eq("id", prospect.id);
    } else {
      await supabase.from("prospect").insert(payload);
    }
    setSaving(false);
    onSaved();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-card border rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6 space-y-4">
        <h2 className="text-lg font-semibold">{prospect ? "Edit Prospect" : "Add Prospect"}</h2>

        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2 space-y-1">
            <Label>Name *</Label>
            <Input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Full name" />
          </div>
          <div className="space-y-1">
            <Label>Date of Birth</Label>
            <Input type="date" value={form.date_of_birth} onChange={(e) => set("date_of_birth", e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>Nationality</Label>
            <Input value={form.nationality} onChange={(e) => set("nationality", e.target.value)} placeholder="Country" />
          </div>
          <div className="space-y-1">
            <Label>Position</Label>
            <Select value={form.position} onValueChange={(v) => set("position", v)}>
              <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
              <SelectContent>
                {POSITIONS.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Rating (0–10)</Label>
            <Input
              type="number" min={0} max={10} step={0.1}
              value={form.rating}
              onChange={(e) => set("rating", e.target.value)}
              placeholder="e.g. 7.5"
            />
          </div>
          <div className="space-y-1">
            <Label>Current Club</Label>
            <Input value={form.current_club} onChange={(e) => set("current_club", e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>Current Team</Label>
            <Input value={form.current_team} onChange={(e) => set("current_team", e.target.value)} placeholder="e.g. U16" />
          </div>
          <div className="space-y-1">
            <Label>Maturation</Label>
            <Select value={form.maturation_badge} onValueChange={(v) => set("maturation_badge", v)}>
              <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="early">Early</SelectItem>
                <SelectItem value="average">Average</SelectItem>
                <SelectItem value="late">Late</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="col-span-2 space-y-1">
            <Label>Competing Interest</Label>
            <Input
              value={form.competing_interest}
              onChange={(e) => set("competing_interest", e.target.value)}
              placeholder="Other clubs interested…"
            />
          </div>
          <div className="space-y-1">
            <Label>EPPP Approach Date</Label>
            <Input type="date" value={form.eppp_approach_date} onChange={(e) => set("eppp_approach_date", e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>Trial Decision Deadline</Label>
            <Input type="date" value={form.trial_decision_deadline} onChange={(e) => set("trial_decision_deadline", e.target.value)} />
          </div>
          <div className="col-span-2 flex gap-6">
            <label className="flex items-center gap-2 cursor-pointer text-sm">
              <input
                type="checkbox"
                checked={form.international_eligible}
                onChange={(e) => set("international_eligible", e.target.checked)}
                className="rounded"
              />
              International Eligible
            </label>
            <label className="flex items-center gap-2 cursor-pointer text-sm">
              <input
                type="checkbox"
                checked={form.on_watchlist}
                onChange={(e) => set("on_watchlist", e.target.checked)}
                className="rounded"
              />
              On Watchlist
            </label>
          </div>
          <div className="col-span-2 space-y-1">
            <Label>Notes</Label>
            <Textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} rows={3} />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving || !form.name.trim()}>
            {saving ? "Saving…" : "Save"}
          </Button>
        </div>
      </div>
    </div>
  );
}
