import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase as supabaseClient } from "@/integrations/supabase/client";

const supabase = supabaseClient as any;

interface Props {
  prospect: any;
  onClose: () => void;
  onSaved: () => void;
}

export default function TrialModal({ prospect, onClose, onSaved }: Props) {
  const [form, setForm] = useState({
    session_date: new Date().toISOString().split("T")[0],
    session_type: "training",
    rating:       "",
    coach_notes:  "",
  });
  const [saving, setSaving] = useState(false);

  const { data: sessions = [] } = useQuery({
    queryKey: ["trial_sessions_detail", prospect.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("trial_session")
        .select("*")
        .eq("prospect_id", prospect.id)
        .order("session_date", { ascending: false });
      return data ?? [];
    },
  });

  const ratedSessions = (sessions as any[]).filter((s) => s.rating != null);
  const avgRating = ratedSessions.length > 0
    ? (ratedSessions.reduce((sum: number, s: any) => sum + s.rating, 0) / ratedSessions.length).toFixed(1)
    : null;

  async function handleSave() {
    setSaving(true);
    await supabase.from("trial_session").insert({
      prospect_id:  prospect.id,
      session_date: form.session_date,
      session_type: form.session_type,
      rating:       form.rating ? parseInt(form.rating) : null,
      coach_notes:  form.coach_notes || null,
    });
    setSaving(false);
    onSaved();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-card border rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6 space-y-5">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg font-semibold">Trial Sessions</h2>
            <p className="text-sm text-muted-foreground">{prospect.name}</p>
          </div>
          {avgRating && (
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Avg Rating</p>
              <p className="text-xl font-bold">&#9733; {avgRating}</p>
            </div>
          )}
        </div>

        {sessions.length > 0 && (
          <div className="space-y-2 max-h-48 overflow-y-auto">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase">Previous Sessions</h3>
            {(sessions as any[]).map((s) => (
              <div key={s.id} className="flex items-center justify-between text-sm py-1.5 border-b border-border/50">
                <div>
                  <span className="font-medium">{s.session_date}</span>
                  <span className="text-muted-foreground ml-2 capitalize">{s.session_type}</span>
                </div>
                {s.rating && <span className="font-mono">&#9733; {s.rating}</span>}
              </div>
            ))}
          </div>
        )}

        <div className="space-y-3 border-t pt-4">
          <h3 className="text-sm font-semibold">Log New Session</h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Date</Label>
              <Input
                type="date"
                value={form.session_date}
                onChange={(e) => setForm((f) => ({ ...f, session_date: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label>Type</Label>
              <Select
                value={form.session_type}
                onValueChange={(v) => setForm((f) => ({ ...f, session_type: v }))}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="training">Training</SelectItem>
                  <SelectItem value="match">Match</SelectItem>
                  <SelectItem value="evaluation">Evaluation</SelectItem>
                  <SelectItem value="friendly">Friendly</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Rating (1–10)</Label>
              <Input
                type="number" min={1} max={10}
                value={form.rating}
                onChange={(e) => setForm((f) => ({ ...f, rating: e.target.value }))}
                placeholder="Optional"
              />
            </div>
          </div>
          <div className="space-y-1">
            <Label>Coach Notes</Label>
            <Textarea
              value={form.coach_notes}
              onChange={(e) => setForm((f) => ({ ...f, coach_notes: e.target.value }))}
              rows={3}
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving…" : "Log Session"}
          </Button>
        </div>
      </div>
    </div>
  );
}
