import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { SafeDashboardLayout } from "@/components/layout/SafeDashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowUpRight, Users } from "lucide-react";
import { supabase as supabaseClient } from "@/integrations/supabase/client";
import DualRegModal from "@/components/squad/DualRegModal";
import PromotionModal from "@/components/squad/PromotionModal";

const supabase = supabaseClient as any;

const POSITION_LINES: [string, string[]][] = [
  ["GK",          ["GK"]],
  ["Defenders",   ["RB","CB","LB"]],
  ["Midfielders", ["CDM","CM","CAM","RM","LM"]],
  ["Forwards",    ["RW","LW","ST","CF"]],
];

export default function SquadGrid() {
  const qc = useQueryClient();
  const [dualModal, setDualModal]  = useState(false);
  const [promModal, setPromModal]  = useState(false);

  const { data: teams = [] } = useQuery({
    queryKey: ["teams_grid"],
    queryFn: async () => {
      const { data } = await supabase.from("teams").select("id, name, age_group").order("age_group");
      return data ?? [];
    },
  });

  const { data: players = [] } = useQuery({
    queryKey: ["players_grid"],
    queryFn: async () => {
      const { data } = await supabase.from("players").select("id, name, position, team_id").order("name");
      return data ?? [];
    },
  });

  const { data: dualRegs = [] } = useQuery({
    queryKey: ["dual_regs"],
    queryFn: async () => {
      const { data } = await supabase
        .from("dual_registration")
        .select("*, player:player_id(name), home_team:home_team_id(name), guest_team:guest_team_id(name)")
        .is("end_date", null);
      return data ?? [];
    },
  });

  const { data: promotions = [] } = useQuery({
    queryKey: ["promotions"],
    queryFn: async () => {
      const { data } = await supabase
        .from("squad_promotion")
        .select("*, player:player_id(name), from_team:from_team_id(name), to_team:to_team_id(name)")
        .order("promotion_date", { ascending: false })
        .limit(20);
      return data ?? [];
    },
  });

  const byTeam = new Map<string, any[]>();
  for (const p of players as any[]) {
    if (!p.team_id) continue;
    if (!byTeam.has(p.team_id)) byTeam.set(p.team_id, []);
    byTeam.get(p.team_id)!.push(p);
  }

  function invalidate() {
    qc.invalidateQueries({ queryKey: ["dual_regs"] });
    qc.invalidateQueries({ queryKey: ["promotions"] });
  }

  return (
    <SafeDashboardLayout>
      <div className="p-6 space-y-6 max-w-screen-2xl mx-auto">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Multi-Age-Group Squad Grid</h1>
            <p className="text-muted-foreground text-sm mt-1">Position gaps, dual registration, promotion history</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setDualModal(true)}>
              <Users className="h-4 w-4 mr-2" /> Dual Reg
            </Button>
            <Button variant="outline" size="sm" onClick={() => setPromModal(true)}>
              <ArrowUpRight className="h-4 w-4 mr-2" /> Promotion
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {(teams as any[]).map((team) => {
            const tp = byTeam.get(team.id) ?? [];
            const posSet = new Set(tp.map((p: any) => p.position));
            const teamDual = (dualRegs as any[]).filter(
              (d) => d.home_team_id === team.id || d.guest_team_id === team.id
            );
            return (
              <Card key={team.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{team.name}</CardTitle>
                    <div className="flex gap-2">
                      {team.age_group && <Badge variant="outline" className="text-xs">{team.age_group}</Badge>}
                      <Badge variant="secondary" className="text-xs">{tp.length} players</Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {POSITION_LINES.map(([line, positions]) => (
                    <div key={line} className="space-y-1">
                      <p className="text-xs text-muted-foreground font-medium">{line}</p>
                      <div className="flex flex-wrap gap-1">
                        {positions.map((pos) => {
                          const n = tp.filter((p: any) => p.position === pos).length;
                          return (
                            <div key={pos} className={`text-xs px-2 py-0.5 rounded border ${
                              n === 0 ? "border-red-500/30 bg-red-500/10 text-red-300" :
                              n === 1 ? "border-amber-500/30 bg-amber-500/10 text-amber-300" :
                              "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                            }`}>{pos} ({n})</div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                  {teamDual.length > 0 && (
                    <div className="border-t pt-2 space-y-1">
                      <p className="text-xs text-muted-foreground font-medium">Dual Reg</p>
                      {teamDual.map((d: any) => (
                        <div key={d.id} className="flex items-center gap-2 text-xs">
                          <Badge variant="outline" className="text-xs bg-blue-500/10 text-blue-300 border-blue-500/30">{d.player?.name}</Badge>
                          <span className="text-muted-foreground">{d.home_team?.name} &#8596; {d.guest_team?.name}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
          {(teams as any[]).length === 0 && (
            <p className="text-muted-foreground text-sm col-span-3">No teams found.</p>
          )}
        </div>

        {(promotions as any[]).length > 0 && (
          <Card>
            <CardHeader><CardTitle className="text-sm">Recent Promotions</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {(promotions as any[]).map((p) => (
                <div key={p.id} className="flex items-center justify-between text-sm py-1.5 border-b border-border/40 last:border-0">
                  <span className="font-medium">{p.player?.name}</span>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{p.from_team?.name ?? "—"}</span>
                    <ArrowUpRight className="h-3 w-3" />
                    <span>{p.to_team?.name}</span>
                    <span className="ml-2">{p.promotion_date}</span>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>

      {dualModal && (
        <DualRegModal
          players={players as any[]}
          teams={teams as any[]}
          onClose={() => setDualModal(false)}
          onSaved={() => { setDualModal(false); invalidate(); }}
        />
      )}
      {promModal && (
        <PromotionModal
          players={players as any[]}
          teams={teams as any[]}
          onClose={() => setPromModal(false)}
          onSaved={() => { setPromModal(false); invalidate(); }}
        />
      )}
    </SafeDashboardLayout>
  );
}
