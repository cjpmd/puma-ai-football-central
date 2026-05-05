import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase as supabaseClient } from "@/integrations/supabase/client";

const supabase = supabaseClient as any;

const DEFAULT_ATTRIBUTES: Record<string, string[]> = {
  Technical: ["Ball Control", "Passing", "Shooting", "Dribbling", "Crossing", "First Touch"],
  Physical:  ["Pace", "Strength", "Stamina", "Agility", "Balance", "Jumping"],
  Mental:    ["Decision Making", "Positioning", "Work Rate", "Leadership", "Concentration", "Composure"],
  Tactical:  ["Pressing", "Defensive Shape", "Off-Ball Movement", "Transition"],
};

interface Props {
  prospect: any;
  onClose: () => void;
  onSaved: () => void;
}

export default function ScoutReportModal({ prospect, onClose, onSaved }: Props) {
  const [attributes,     setAttributes]    = useState<Record<string, number>>({});
  const [narrative,      setNarrative]     = useState("");
  const [recommendation, setRecommendation] = useState("");
  const [saving,         setSaving]        = useState(false);

  const { data: attrDefs = [] } = useQuery({
    queryKey: ["attribute_definitions_scouting"],
    queryFn: async () => {
      const { data } = await supabase
        .from("attribute_definition")
        .select("category, name")
        .order("display_order");
      return data ?? [];
    },
  });

  const { data: previousReports = [] } = useQuery({
    queryKey: ["scout_reports_prev", prospect.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("scout_report")
        .select("attributes")
        .eq("prospect_id", prospect.id)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  // Build category map from DB rows or fall back to defaults
  const attrMap: Record<string, string[]> = {};
  if (attrDefs.length > 0) {
    for (const d of attrDefs) {
      if (!attrMap[d.category]) attrMap[d.category] = [];
      attrMap[d.category].push(d.name);
    }
  } else {
    Object.assign(attrMap, DEFAULT_ATTRIBUTES);
  }

  // Compute per-attribute averages from previous reports
  const prevAvg: Record<string, number> = {};
  if (previousReports.length > 0) {
    const counts: Record<string, number> = {};
    for (const r of previousReports) {
      for (const [k, v] of Object.entries(r.attributes as Record<string, number>)) {
        prevAvg[k] = (prevAvg[k] ?? 0) + (v as number);
        counts[k]  = (counts[k]  ?? 0) + 1;
      }
    }
    for (const k of Object.keys(prevAvg)) prevAvg[k] /= counts[k];
  }

  function setAttr(name: string, val: number) {
    setAttributes((a) => ({ ...a, [name]: val }));
  }

  async function handleSave() {
    if (!recommendation) return;
    setSaving(true);
    await supabase.from("scout_report").insert({
      prospect_id:    prospect.id,
      attributes,
      narrative:      narrative || null,
      recommendation,
    });
    setSaving(false);
    onSaved();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-card border rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 space-y-5">
        <div>
          <h2 className="text-lg font-semibold">Scout Report</h2>
          <p className="text-sm text-muted-foreground">{prospect.name}</p>
        </div>

        {Object.entries(attrMap).map(([category, attrs]) => (
          <div key={category} className="space-y-3">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{category}</h3>
            <div className="grid grid-cols-1 gap-2">
              {attrs.map((attr) => {
                const val = attributes[attr] ?? 5;
                const avg = prevAvg[attr];
                return (
                  <div key={attr} className="flex items-center gap-3">
                    <span className="text-sm w-44 shrink-0">{attr}</span>
                    <input
                      type="range" min={1} max={10} step={1}
                      value={val}
                      onChange={(e) => setAttr(attr, parseInt(e.target.value))}
                      className="flex-1 accent-primary"
                    />
                    <span className="text-sm font-mono w-6 text-right">{val}</span>
                    {avg != null && (
                      <span className="text-xs text-muted-foreground w-16 text-right">avg {avg.toFixed(1)}</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        <div className="space-y-1">
          <Label>Narrative</Label>
          <Textarea
            value={narrative}
            onChange={(e) => setNarrative(e.target.value)}
            rows={4}
            placeholder="Observations, context, development potential…"
          />
        </div>

        <div className="space-y-1">
          <Label>Recommendation *</Label>
          <Select value={recommendation} onValueChange={setRecommendation}>
            <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="sign">Sign</SelectItem>
              <SelectItem value="continue_watching">Continue Watching</SelectItem>
              <SelectItem value="reject">Reject</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving || !recommendation}>
            {saving ? "Saving…" : "Submit Report"}
          </Button>
        </div>
      </div>
    </div>
  );
}
