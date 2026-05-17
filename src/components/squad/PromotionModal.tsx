import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase as supabaseClient } from "@/integrations/supabase/client";

const supabase = supabaseClient as any;

interface Props { players: any[]; teams: any[]; onClose: () => void; onSaved: () => void; }

export default function PromotionModal({ players, teams, onClose, onSaved }: Props) {
  const [form, setForm] = useState({
    player_id: "", from_team_id: "", to_team_id: "",
    promotion_date: new Date().toISOString().split("T")[0], notes: "",
  });
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!form.player_id || !form.to_team_id) return;
    setSaving(true);
    await supabase.from("squad_promotion").insert({
      player_id: form.player_id,
      from_team_id: form.from_team_id || null,
      to_team_id: form.to_team_id,
      promotion_date: form.promotion_date,
      notes: form.notes || null,
    });
    setSaving(false);
    onSaved();
  }

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-card border rounded-xl w-full max-w-md p-6 space-y-4">
        <h2 className="text-lg font-semibold">Log Promotion</h2>
        <div className="space-y-3">
          <div className="space-y-1"><Label>Player</Label>
            <Select value={form.player_id} onValueChange={(v) => set("player_id", v)}>
              <SelectTrigger><SelectValue placeholder="Select player…" /></SelectTrigger>
              <SelectContent>{players.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1"><Label>From Team</Label>
            <Select value={form.from_team_id} onValueChange={(v) => set("from_team_id", v)}>
              <SelectTrigger><SelectValue placeholder="Select team…" /></SelectTrigger>
              <SelectContent>{teams.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1"><Label>To Team *</Label>
            <Select value={form.to_team_id} onValueChange={(v) => set("to_team_id", v)}>
              <SelectTrigger><SelectValue placeholder="Select team…" /></SelectTrigger>
              <SelectContent>{teams.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1"><Label>Date</Label><Input type="date" value={form.promotion_date} onChange={(e) => set("promotion_date", e.target.value)} /></div>
          <div className="space-y-1"><Label>Notes</Label><Textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} rows={2} /></div>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving || !form.player_id || !form.to_team_id}>{saving ? "Saving…" : "Save"}</Button>
        </div>
      </div>
    </div>
  );
}
