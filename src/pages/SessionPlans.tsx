import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { SafeDashboardLayout } from "@/components/layout/SafeDashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BookOpen, Grid3x3, Plus } from "lucide-react";
import { supabase as supabaseClient } from "@/integrations/supabase/client";
import SessionPlanModal from "@/components/session/SessionPlanModal";

const supabase = supabaseClient as any;

const AGE_GROUPS = ["U9","U10","U11","U12","U13","U14","U15","U16","U17","U18","U21"];

export default function SessionPlans() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [ageFilter, setAgeFilter] = useState("");
  const [modal, setModal] = useState<{ open: boolean; plan?: any }>({ open: false });

  const { data: plans = [], isLoading } = useQuery({
    queryKey: ["session_plans"],
    queryFn: async () => {
      const { data } = await supabase
        .from("session_plan")
        .select("*, outcomes:session_plan_outcome(outcome:outcome_id(id, code, description, category))")
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const { data: outcomes = [] } = useQuery({
    queryKey: ["curriculum_outcomes"],
    queryFn: async () => {
      const { data } = await supabase.from("curriculum_outcome").select("*").order("code");
      return data ?? [];
    },
  });

  const filtered = (plans as any[]).filter((p) => {
    const ms = !search || p.title.toLowerCase().includes(search.toLowerCase());
    const ma = !ageFilter || p.age_group === ageFilter;
    return ms && ma;
  });

  // coverage: outcomeCode -> ageGroup -> count
  const coverage = new Map<string, Map<string, number>>();
  for (const plan of plans as any[]) {
    const ag = plan.age_group ?? "Other";
    for (const o of plan.outcomes ?? []) {
      const code = o.outcome?.code;
      if (!code) continue;
      if (!coverage.has(code)) coverage.set(code, new Map());
      coverage.get(code)!.set(ag, (coverage.get(code)!.get(ag) ?? 0) + 1);
    }
  }

  return (
    <SafeDashboardLayout>
      <div className="p-6 space-y-6 max-w-screen-xl mx-auto">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Session Plan Library</h1>
            <p className="text-muted-foreground text-sm mt-1">Create and reuse plans tagged to curriculum outcomes</p>
          </div>
          <Button size="sm" onClick={() => setModal({ open: true })}>
            <Plus className="h-4 w-4 mr-2" /> New Plan
          </Button>
        </div>

        <Tabs defaultValue="library">
          <TabsList>
            <TabsTrigger value="library"><BookOpen className="h-4 w-4 mr-1" />Library</TabsTrigger>
            <TabsTrigger value="coverage"><Grid3x3 className="h-4 w-4 mr-1" />Coverage</TabsTrigger>
          </TabsList>

          <TabsContent value="library" className="mt-4 space-y-4">
            <div className="flex flex-wrap gap-2">
              <Input placeholder="Search…" value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-xs" />
              <Button size="sm" variant={ageFilter === "" ? "default" : "outline"} onClick={() => setAgeFilter("")}>All</Button>
              {AGE_GROUPS.map((ag) => (
                <Button key={ag} size="sm" variant={ageFilter === ag ? "default" : "outline"} onClick={() => setAgeFilter(ag)}>{ag}</Button>
              ))}
            </div>

            {isLoading && <p className="text-muted-foreground text-sm">Loading…</p>}
            {!isLoading && filtered.length === 0 && <p className="text-muted-foreground text-sm">No plans found.</p>}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {filtered.map((plan: any) => (
                <Card key={plan.id} className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => setModal({ open: true, plan })}>
                  <CardContent className="p-4 space-y-2">
                    <div className="flex items-start justify-between">
                      <p className="font-medium text-sm leading-tight">{plan.title}</p>
                      {plan.age_group && <Badge variant="outline" className="text-xs ml-2 shrink-0">{plan.age_group}</Badge>}
                    </div>
                    {plan.objectives && <p className="text-xs text-muted-foreground line-clamp-2">{plan.objectives}</p>}
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      {plan.duration_minutes && <span>{plan.duration_minutes} min</span>}
                      <span>{(plan.outcomes ?? []).length} outcomes</span>
                    </div>
                    {(plan.outcomes ?? []).length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {plan.outcomes.slice(0,3).map((o: any, i: number) => (
                          <Badge key={i} variant="secondary" className="text-xs">{o.outcome?.code}</Badge>
                        ))}
                        {plan.outcomes.length > 3 && <Badge variant="secondary" className="text-xs">+{plan.outcomes.length - 3}</Badge>}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="coverage" className="mt-4">
            {(outcomes as any[]).length === 0 ? (
              <p className="text-muted-foreground text-sm">No curriculum outcomes defined yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="text-xs border-collapse min-w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left px-3 py-2 font-medium text-muted-foreground w-56">Outcome</th>
                      {AGE_GROUPS.map((ag) => (
                        <th key={ag} className="px-2 py-2 font-medium text-muted-foreground text-center">{ag}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {(outcomes as any[]).map((outcome) => {
                      const row = coverage.get(outcome.code);
                      return (
                        <tr key={outcome.id} className="border-b border-border/40">
                          <td className="px-3 py-2">
                            <span className="font-mono font-medium">{outcome.code}</span>
                            <span className="text-muted-foreground ml-2 text-xs">{outcome.description}</span>
                          </td>
                          {AGE_GROUPS.map((ag) => {
                            const n = row?.get(ag) ?? 0;
                            return (
                              <td key={ag} className="px-2 py-2 text-center">
                                {n > 0 ? (
                                  <span className={`inline-flex items-center justify-center h-5 w-5 rounded-full text-xs font-medium ${
                                    n >= 3 ? "bg-emerald-500/20 text-emerald-300" :
                                    "bg-amber-500/20 text-amber-300"
                                  }`}>{n}</span>
                                ) : <span className="text-muted-foreground/30">—</span>}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {modal.open && (
        <SessionPlanModal
          plan={modal.plan}
          outcomes={outcomes as any[]}
          onClose={() => setModal({ open: false })}
          onSaved={() => {
            setModal({ open: false });
            qc.invalidateQueries({ queryKey: ["session_plans"] });
            qc.invalidateQueries({ queryKey: ["curriculum_outcomes"] });
          }}
        />
      )}
    </SafeDashboardLayout>
  );
}
