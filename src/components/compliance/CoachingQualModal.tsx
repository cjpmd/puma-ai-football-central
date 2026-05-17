import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase as supabaseClient } from "@/integrations/supabase/client";

const supabase = supabaseClient as any;

const LICENCE_TYPES = [
  "UEFA A", "UEFA B", "UEFA C", "UEFA Pro",
  "FA Level 1", "FA Level 2", "FA Level 3", "FA Level 4",
  "Goalkeeper Level 1", "Goalkeeper Level 2",
  "First Aid", "Safeguarding Children", "Other",
];
const CPD_TYPES = ["Workshop", "Online Course", "Conference", "Mentoring", "Observation", "Self-Study", "Other"];

interface Props {
  staffId?: string;
  staff: any[];
  onClose: () => void;
  onSaved: () => void;
}

export default function CoachingQualModal({ staffId, staff, onClose, onSaved }: Props) {
  const [tab, setTab] = useState("qualification");
  const [qForm, setQForm] = useState({
    staff_id: staffId ?? "", licence_type: "", issuing_body: "",
    awarded_date: "", expiry_date: "", cpd_hours_required: "", notes: "",
  });
  const [cForm, setCForm] = useState({
    staff_id: staffId ?? "",
    activity_date: new Date().toISOString().split("T")[0],
    activity_type: "Workshop", description: "", hours: "",
  });
  const [saving, setSaving] = useState(false);

  async function saveQual() {
    if (!qForm.staff_id || !qForm.licence_type) return;
    setSaving(true);
    await supabase.from("coaching_qualification").insert({
      staff_id: qForm.staff_id,
      licence_type: qForm.licence_type,
      issuing_body: qForm.issuing_body || null,
      awarded_date: qForm.awarded_date || null,
      expiry_date: qForm.expiry_date || null,
      cpd_hours_required: qForm.cpd_hours_required ? parseInt(qForm.cpd_hours_required) : 0,
      notes: qForm.notes || null,
    });
    setSaving(false);
    onSaved();
  }

  async function saveCPD() {
    if (!cForm.staff_id || !cForm.hours) return;
    setSaving(true);
    await supabase.from("cpd_record").insert({
      staff_id: cForm.staff_id,
      activity_date: cForm.activity_date,
      activity_type: cForm.activity_type,
      description: cForm.description || null,
      hours: parseFloat(cForm.hours),
    });
    setSaving(false);
    onSaved();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-card border rounded-xl w-full max-w-md p-6 space-y-4">
        <h2 className="text-lg font-semibold">Coaching Record</h2>
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="w-full">
            <TabsTrigger value="qualification" className="flex-1">Qualification</TabsTrigger>
            <TabsTrigger value="cpd" className="flex-1">CPD Hours</TabsTrigger>
          </TabsList>

          <TabsContent value="qualification" className="mt-4 space-y-3">
            {!staffId && (
              <div className="space-y-1">
                <Label>Staff Member</Label>
                <Select value={qForm.staff_id} onValueChange={(v) => setQForm((f) => ({ ...f, staff_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                  <SelectContent>{staff.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-1">
              <Label>Licence Type</Label>
              <Select value={qForm.licence_type} onValueChange={(v) => setQForm((f) => ({ ...f, licence_type: v }))}>
                <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                <SelectContent>{LICENCE_TYPES.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Issuing Body</Label>
              <Input value={qForm.issuing_body} onChange={(e) => setQForm((f) => ({ ...f, issuing_body: e.target.value }))} placeholder="FA, UEFA…" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>Awarded</Label><Input type="date" value={qForm.awarded_date} onChange={(e) => setQForm((f) => ({ ...f, awarded_date: e.target.value }))} /></div>
              <div className="space-y-1"><Label>Expires</Label><Input type="date" value={qForm.expiry_date} onChange={(e) => setQForm((f) => ({ ...f, expiry_date: e.target.value }))} /></div>
            </div>
            <div className="space-y-1">
              <Label>CPD Hrs Required / Year</Label>
              <Input type="number" min={0} value={qForm.cpd_hours_required} onChange={(e) => setQForm((f) => ({ ...f, cpd_hours_required: e.target.value }))} placeholder="0" />
            </div>
            <div className="space-y-1"><Label>Notes</Label><Textarea value={qForm.notes} onChange={(e) => setQForm((f) => ({ ...f, notes: e.target.value }))} rows={2} /></div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={onClose}>Cancel</Button>
              <Button onClick={saveQual} disabled={saving || !qForm.staff_id || !qForm.licence_type}>{saving ? "Saving…" : "Save"}</Button>
            </div>
          </TabsContent>

          <TabsContent value="cpd" className="mt-4 space-y-3">
            {!staffId && (
              <div className="space-y-1">
                <Label>Staff Member</Label>
                <Select value={cForm.staff_id} onValueChange={(v) => setCForm((f) => ({ ...f, staff_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                  <SelectContent>{staff.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>Date</Label><Input type="date" value={cForm.activity_date} onChange={(e) => setCForm((f) => ({ ...f, activity_date: e.target.value }))} /></div>
              <div className="space-y-1"><Label>Hours</Label><Input type="number" min={0} step={0.5} value={cForm.hours} onChange={(e) => setCForm((f) => ({ ...f, hours: e.target.value }))} placeholder="2.5" /></div>
            </div>
            <div className="space-y-1">
              <Label>Activity Type</Label>
              <Select value={cForm.activity_type} onValueChange={(v) => setCForm((f) => ({ ...f, activity_type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{CPD_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1"><Label>Description</Label><Textarea value={cForm.description} onChange={(e) => setCForm((f) => ({ ...f, description: e.target.value }))} rows={2} /></div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={onClose}>Cancel</Button>
              <Button onClick={saveCPD} disabled={saving || !cForm.staff_id || !cForm.hours}>{saving ? "Saving…" : "Log CPD"}</Button>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
