import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase as supabaseClient } from "@/integrations/supabase/client";

const supabase = supabaseClient as any;

const COMPARISON_ATTRS: Record<string, string[]> = {
  Technical: ["Ball Control", "Passing", "Shooting", "Dribbling", "First Touch"],
  Physical:  ["Pace", "Strength", "Stamina", "Agility"],
  Mental:    ["Decision Making", "Positioning", "Work Rate", "Composure"],
};

function avgAttributes(reports: any[]): Record<string, number> {
  if (!reports.length) return {};
  const sums: Record<string, number>  = {};
  const counts: Record<string, number> = {};
  for (const r of reports) {
    for (const [k, v] of Object.entries(r.attributes as Record<string, number>)) {
      sums[k]   = (sums[k]   ?? 0) + (v as number);
      counts[k] = (counts[k] ?? 0) + 1;
    }
  }
  const result: Record<string, number> = {};
  for (const k of Object.keys(sums)) result[k] = sums[k] / counts[k];
  return result;
}

interface Props {
  prospects: any[];
  onClose: () => void;
}

export default function ComparisonModal({ prospects, onClose }: Props) {
  const [leftId,        setLeftId]        = useState<string>(prospects[0]?.id ?? "");
  const [rightId,       setRightId]       = useState<string>(prospects[1]?.id ?? "");
  const [rightIsPlayer, setRightIsPlayer] = useState(false);

  const { data: players = [] } = useQuery({
    queryKey: ["players_for_comparison"],
    queryFn: async () => {
      const { data } = await supabase.from("players").select("id, name, position").order("name");
      return data ?? [];
    },
    enabled: rightIsPlayer,
  });

  const { data: leftReports = [] } = useQuery({
    queryKey: ["scout_reports_cmp_left", leftId],
    queryFn: async () => {
      const { data } = await supabase.from("scout_report").select("attributes").eq("prospect_id", leftId);
      return data ?? [];
    },
    enabled: !!leftId,
  });

  const { data: rightReports = [] } = useQuery({
    queryKey: ["scout_reports_cmp_right", rightId],
    queryFn: async () => {
      const { data } = await supabase.from("scout_report").select("attributes").eq("prospect_id", rightId);
      return data ?? [];
    },
    enabled: !!rightId && !rightIsPlayer,
  });

  const { data: playerAttrs = [] } = useQuery({
    queryKey: ["player_attributes_cmp", rightId],
    queryFn: async () => {
      const { data } = await supabase
        .from("player_attribute")
        .select("attribute_name, value")
        .eq("player_id", rightId);
      return data ?? [];
    },
    enabled: !!rightId && rightIsPlayer,
  });

  const leftAttrs  = avgAttributes(leftReports as any[]);
  const rightAttrs: Record<string, number> = rightIsPlayer
    ? Object.fromEntries((playerAttrs as any[]).map((a) => [a.attribute_name, a.value]))
    : avgAttributes(rightReports as any[]);

  const leftProspect  = prospects.find((p) => p.id === leftId);
  const rightProspect = !rightIsPlayer ? prospects.find((p) => p.id === rightId) : null;
  const rightPlayer   = rightIsPlayer  ? (players as any[]).find((p) => p.id === rightId) : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-card border rounded-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto p-6 space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Comparison</h2>
          <Button variant="ghost" size="sm" onClick={onClose}>&#10005;</Button>
        </div>

        {/* Selectors */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-muted-foreground uppercase">Left &#8212; Prospect</label>
            <Select value={leftId} onValueChange={setLeftId}>
              <SelectTrigger><SelectValue placeholder="Select prospect…" /></SelectTrigger>
              <SelectContent>
                {prospects.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <label className="text-xs font-semibold text-muted-foreground uppercase">Right &#8212;</label>
              <div className="flex gap-1 text-xs">
                <button
                  className={`px-2 py-0.5 rounded ${
                    !rightIsPlayer ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                  }`}
                  onClick={() => setRightIsPlayer(false)}
                >Prospect</button>
                <button
                  className={`px-2 py-0.5 rounded ${
                    rightIsPlayer ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                  }`}
                  onClick={() => { setRightIsPlayer(true); setRightId(""); }}
                >Squad Player</button>
              </div>
            </div>
            <Select value={rightId} onValueChange={setRightId}>
              <SelectTrigger>
                <SelectValue placeholder={rightIsPlayer ? "Select player…" : "Select prospect…"} />
              </SelectTrigger>
              <SelectContent>
                {(rightIsPlayer ? (players as any[]) : prospects).map((p: any) => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Maturation note */}
        {rightIsPlayer && leftProspect?.maturation_badge && leftProspect.maturation_badge !== "average" && (
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-2 text-xs text-amber-300">
            Note: <strong>{leftProspect.name}</strong> has a <strong>{leftProspect.maturation_badge}</strong> maturation profile &#8212;
            consider adjusting attribute expectations accordingly when comparing to current squad players.
          </div>
        )}

        {/* Name headers */}
        {(leftProspect || rightProspect || rightPlayer) && (
          <div className="grid grid-cols-2 gap-4 text-center">
            <div>
              <p className="font-semibold">{leftProspect?.name ?? "—"}</p>
              {leftProspect?.maturation_badge && (
                <Badge variant="outline" className="text-xs mt-1">{leftProspect.maturation_badge}</Badge>
              )}
            </div>
            <div>
              <p className="font-semibold">{rightProspect?.name ?? rightPlayer?.name ?? "—"}</p>
              {rightIsPlayer && <Badge variant="outline" className="text-xs mt-1">Squad Player</Badge>}
            </div>
          </div>
        )}

        {/* Attribute bars */}
        {Object.entries(COMPARISON_ATTRS).map(([category, attrs]) => (
          <div key={category} className="space-y-2">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{category}</h3>
            {attrs.map((attr) => {
              const lv = leftAttrs[attr];
              const rv = rightAttrs[attr];
              const lWins = lv != null && rv != null && lv > rv;
              const rWins = lv != null && rv != null && rv > lv;
              return (
                <div key={attr} className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 text-sm">
                  <div className="flex items-center gap-2 justify-end">
                    <span className={`font-mono text-sm ${lWins ? "text-emerald-400 font-bold" : ""}`}>
                      {lv != null ? lv.toFixed(1) : "—"}
                    </span>
                    <div className="h-2 rounded-full bg-muted overflow-hidden w-24">
                      {lv != null && (
                        <div
                          className={`h-full rounded-full ${lWins ? "bg-emerald-500" : "bg-primary/60"}`}
                          style={{ width: `${(lv / 10) * 100}%` }}
                        />
                      )}
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground w-36 text-center">{attr}</span>
                  <div className="flex items-center gap-2">
                    <div className="h-2 rounded-full bg-muted overflow-hidden w-24">
                      {rv != null && (
                        <div
                          className={`h-full rounded-full ${rWins ? "bg-emerald-500" : "bg-primary/60"}`}
                          style={{ width: `${(rv / 10) * 100}%` }}
                        />
                      )}
                    </div>
                    <span className={`font-mono text-sm ${rWins ? "text-emerald-400 font-bold" : ""}`}>
                      {rv != null ? rv.toFixed(1) : "—"}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        ))}

        {Object.keys(leftAttrs).length === 0 && Object.keys(rightAttrs).length === 0 && (
          <p className="text-center text-muted-foreground text-sm py-4">
            No scout report data available for comparison.
          </p>
        )}
      </div>
    </div>
  );
}
