import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { SafeDashboardLayout } from "@/components/layout/SafeDashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckCircle, XCircle, Download, Plus, Shield } from "lucide-react";
import { supabase as supabaseClient } from "@/integrations/supabase/client";
import CoachingQualModal from "@/components/compliance/CoachingQualModal";

const supabase = supabaseClient as any;

const EPPP_SECTIONS = [
  {
    section: "Safeguarding",
    items: [
      { key: "welfare_officer",         label: "Welfare log entries exist",                         module: "/welfare" },
      { key: "safeguarding_checklists", label: "Safeguarding checklists completed",                 module: "/welfare" },
      { key: "pastoral_logs",           label: "Pastoral logs updated in past 30 days",             module: "/welfare" },
    ],
  },
  {
    section: "Player Development",
    items: [
      { key: "fitness_benchmarks", label: "Fitness benchmarks defined",                       module: "/fitness-testing" },
      { key: "fitness_tests",      label: "Fitness tests on record (past 90 days)",           module: "/fitness-testing" },
      { key: "injury_records",     label: "Injury records maintained",                        module: "/medical" },
    ],
  },
  {
    section: "Medical",
    items: [
      { key: "load_monitoring",  label: "Training load monitored (past 28 days)", module: "/medical" },
    ],
  },
  {
    section: "Coaching & Compliance",
    items: [
      { key: "coaching_quals",   label: "Coaching qualifications on record",  module: "/compliance" },
      { key: "cpd_hours",        label: "CPD hours logged this year",          module: "/compliance" },
      { key: "session_plans",    label: "Session plans in library",            module: "/session-plans" },
      { key: "scouting_reports", label: "Scouting reports on file",            module: "/scouting" },
    ],
  },
];

function useEPPPData() {
  const now = new Date();
  const d30 = new Date(now.getTime() - 30 * 86400000).toISOString();
  const d90 = new Date(now.getTime() - 90 * 86400000).toISOString();
  const d28 = new Date(now.getTime() - 28 * 86400000).toISOString();
  const yearStart = `${now.getFullYear()}-01-01`;

  const { data: welfareLog = [] } = useQuery({
    queryKey: ["eppp_welfare_log"],
    queryFn: async () => {
      const { data } = await supabase.from("welfare_log").select("id, log_type, created_at").limit(200);
      return data ?? [];
    },
  });
  const { data: safeguarding = [] } = useQuery({
    queryKey: ["eppp_safeguarding"],
    queryFn: async () => {
      const { data } = await supabase.from("safeguarding_checklist").select("id").limit(1);
      return data ?? [];
    },
  });
  const { data: benchmarks = [] } = useQuery({
    queryKey: ["eppp_benchmarks"],
    queryFn: async () => {
      const { data } = await supabase.from("fitness_benchmark").select("id").limit(1);
      return data ?? [];
    },
  });
  const { data: fitnessTests = [] } = useQuery({
    queryKey: ["eppp_fitness_tests"],
    queryFn: async () => {
      const { data } = await supabase.from("fitness_test_result").select("id").gte("tested_at", d90).limit(1);
      return data ?? [];
    },
  });
  const { data: injuries = [] } = useQuery({
    queryKey: ["eppp_injuries"],
    queryFn: async () => {
      const { data } = await supabase.from("injury_record").select("id").limit(1);
      return data ?? [];
    },
  });
  const { data: loads = [] } = useQuery({
    queryKey: ["eppp_loads"],
    queryFn: async () => {
      const { data } = await supabase.from("training_load").select("id").gte("recorded_at", d28).limit(1);
      return data ?? [];
    },
  });
  const { data: quals = [] } = useQuery({
    queryKey: ["eppp_quals"],
    queryFn: async () => {
      const { data } = await supabase.from("coaching_qualification").select("id").limit(1);
      return data ?? [];
    },
  });
  const { data: cpd = [] } = useQuery({
    queryKey: ["eppp_cpd"],
    queryFn: async () => {
      const { data } = await supabase.from("cpd_record").select("id").gte("activity_date", yearStart).limit(1);
      return data ?? [];
    },
  });
  const { data: plans = [] } = useQuery({
    queryKey: ["eppp_plans"],
    queryFn: async () => {
      const { data } = await supabase.from("session_plan").select("id").limit(1);
      return data ?? [];
    },
  });
  const { data: scouts = [] } = useQuery({
    queryKey: ["eppp_scouts"],
    queryFn: async () => {
      const { data } = await supabase.from("scout_report").select("id").limit(1);
      return data ?? [];
    },
  });

  const hasWelfare    = (welfareLog as any[]).length > 0;
  const hasPastoral   = (welfareLog as any[]).some(
    (w) => w.log_type === "pastoral" && new Date(w.created_at) >= new Date(d30)
  );

  return {
    welfare_officer:         hasWelfare,
    safeguarding_checklists: (safeguarding as any[]).length > 0,
    pastoral_logs:           hasPastoral,
    fitness_benchmarks:      (benchmarks as any[]).length > 0,
    fitness_tests:           (fitnessTests as any[]).length > 0,
    injury_records:          (injuries as any[]).length > 0,
    load_monitoring:         (loads as any[]).length > 0,
    coaching_quals:          (quals as any[]).length > 0,
    cpd_hours:               (cpd as any[]).length > 0,
    session_plans:           (plans as any[]).length > 0,
    scouting_reports:        (scouts as any[]).length > 0,
  };
}

export default function Compliance() {
  const qc = useQueryClient();
  const [auditFilter, setAuditFilter] = useState("");
  const [qualModal, setQualModal] = useState<{ open: boolean; staffId?: string }>({ open: false });

  const eppp = useEPPPData();
  const allItems = EPPP_SECTIONS.flatMap((s) => s.items);
  const passCount = allItems.filter((item) => eppp[item.key as keyof typeof eppp]).length;
  const pct = Math.round((passCount / allItems.length) * 100);

  const { data: auditLogs = [], isLoading: auditLoading } = useQuery({
    queryKey: ["audit_log"],
    queryFn: async () => {
      const { data } = await supabase.from("audit_log").select("*").order("created_at", { ascending: false }).limit(500);
      return data ?? [];
    },
  });

  const { data: staff = [] } = useQuery({
    queryKey: ["staff_compliance"],
    queryFn: async () => {
      const { data } = await supabase.from("staff").select("id, name, role");
      return data ?? [];
    },
  });

  const { data: qualsList = [] } = useQuery({
    queryKey: ["coaching_quals_list"],
    queryFn: async () => {
      const { data } = await supabase.from("coaching_qualification").select("*, staff:staff_id(name)");
      return data ?? [];
    },
  });

  const { data: cpdAll = [] } = useQuery({
    queryKey: ["cpd_all"],
    queryFn: async () => {
      const { data } = await supabase.from("cpd_record").select("*");
      return data ?? [];
    },
  });

  const yearStart = `${new Date().getFullYear()}-01-01`;
  const cpdByStaff = new Map<string, number>();
  for (const c of cpdAll as any[]) {
    if (c.activity_date >= yearStart)
      cpdByStaff.set(c.staff_id, (cpdByStaff.get(c.staff_id) ?? 0) + Number(c.hours));
  }

  const filteredAudit = (auditLogs as any[]).filter((log) => {
    if (!auditFilter) return true;
    const f = auditFilter.toLowerCase();
    return (log.action ?? "").toLowerCase().includes(f) || (log.table_name ?? "").toLowerCase().includes(f);
  });

  function exportCSV() {
    const rows = filteredAudit.map((l: any) =>
      [l.created_at, l.action, l.table_name, l.record_id, l.is_safeguarding ? "Yes" : "No"].join(",")
    );
    const csv = ["Timestamp,Action,Table,Record ID,Safeguarding", ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = Object.assign(document.createElement("a"), { href: URL.createObjectURL(blob), download: "audit_log.csv" });
    a.click();
  }

  return (
    <SafeDashboardLayout>
      <div className="p-6 space-y-6 max-w-screen-xl mx-auto">
        <div>
          <h1 className="text-2xl font-bold">Compliance</h1>
          <p className="text-muted-foreground text-sm mt-1">EPPP readiness, audit trail, coaching qualifications</p>
        </div>

        <Tabs defaultValue="eppp">
          <TabsList>
            <TabsTrigger value="eppp">EPPP Tracker</TabsTrigger>
            <TabsTrigger value="audit">Audit Trail</TabsTrigger>
            <TabsTrigger value="coaching">Coaching Qualifications</TabsTrigger>
          </TabsList>

          {/* EPPP */}
          <TabsContent value="eppp" className="mt-4 space-y-4">
            <Card>
              <CardContent className="p-6 flex items-center gap-6">
                <div className="relative h-20 w-20 shrink-0">
                  <svg viewBox="0 0 36 36" className="h-20 w-20 -rotate-90">
                    <circle cx="18" cy="18" r="15.9" fill="none" stroke="hsl(var(--muted))" strokeWidth="3" />
                    <circle
                      cx="18" cy="18" r="15.9" fill="none" strokeWidth="3" strokeLinecap="round"
                      stroke={pct >= 80 ? "#10b981" : pct >= 50 ? "#f59e0b" : "#ef4444"}
                      strokeDasharray={`${pct} ${100 - pct}`}
                    />
                  </svg>
                  <span className="absolute inset-0 flex items-center justify-center text-lg font-bold">{pct}%</span>
                </div>
                <div>
                  <p className="text-lg font-semibold">EPPP Readiness</p>
                  <p className="text-sm text-muted-foreground">{passCount} of {allItems.length} criteria met</p>
                  <Badge className={`mt-2 border-0 ${
                    pct >= 80 ? "bg-emerald-500/20 text-emerald-300" :
                    pct >= 50 ? "bg-amber-500/20 text-amber-300" :
                    "bg-red-500/20 text-red-300"
                  }`}>
                    {pct >= 80 ? "Ready" : pct >= 50 ? "In Progress" : "Needs Attention"}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {EPPP_SECTIONS.map((section) => (
              <Card key={section.section}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {section.section}
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0 space-y-1">
                  {section.items.map((item) => {
                    const pass = eppp[item.key as keyof typeof eppp];
                    return (
                      <div key={item.key} className="flex items-center justify-between py-2 border-b border-border/40 last:border-0">
                        <div className="flex items-center gap-3">
                          {pass
                            ? <CheckCircle className="h-4 w-4 text-emerald-400 shrink-0" />
                            : <XCircle className="h-4 w-4 text-red-400 shrink-0" />
                          }
                          <span className="text-sm">{item.label}</span>
                        </div>
                        <a href={item.module} className="text-xs text-primary hover:underline shrink-0">Go &#8594;</a>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          {/* AUDIT */}
          <TabsContent value="audit" className="mt-4 space-y-4">
            <div className="flex items-center gap-3">
              <Input
                placeholder="Filter by action or table…"
                value={auditFilter}
                onChange={(e) => setAuditFilter(e.target.value)}
                className="max-w-sm"
              />
              <Button variant="outline" size="sm" onClick={exportCSV}>
                <Download className="h-4 w-4 mr-2" /> Export CSV
              </Button>
            </div>
            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left px-4 py-3 text-muted-foreground font-medium">Timestamp</th>
                        <th className="text-left px-4 py-3 text-muted-foreground font-medium">Action</th>
                        <th className="text-left px-4 py-3 text-muted-foreground font-medium">Table</th>
                        <th className="text-left px-4 py-3 text-muted-foreground font-medium">Flag</th>
                      </tr>
                    </thead>
                    <tbody>
                      {auditLoading && (
                        <tr><td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">Loading…</td></tr>
                      )}
                      {!auditLoading && filteredAudit.length === 0 && (
                        <tr><td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">No entries found.</td></tr>
                      )}
                      {filteredAudit.map((log: any) => (
                        <tr key={log.id} className={`border-b border-border/40 ${log.is_safeguarding ? "bg-red-500/5" : ""}` }>
                          <td className="px-4 py-2.5 text-muted-foreground whitespace-nowrap">{new Date(log.created_at).toLocaleString()}</td>
                          <td className="px-4 py-2.5">{log.action}</td>
                          <td className="px-4 py-2.5 text-muted-foreground">{log.table_name}</td>
                          <td className="px-4 py-2.5">
                            {log.is_safeguarding && (
                              <Badge variant="outline" className="text-xs bg-red-500/10 text-red-300 border-red-500/30">
                                <Shield className="h-3 w-3 mr-1" /> Safeguarding
                              </Badge>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* COACHING */}
          <TabsContent value="coaching" className="mt-4 space-y-4">
            <div className="flex justify-end">
              <Button size="sm" onClick={() => setQualModal({ open: true })}>
                <Plus className="h-4 w-4 mr-2" /> Log Qualification / CPD
              </Button>
            </div>
            <div className="space-y-3">
              {(staff as any[]).length === 0 && (
                <p className="text-muted-foreground text-sm">No staff records found.</p>
              )}
              {(staff as any[]).map((member) => {
                const mQuals = (qualsList as any[]).filter((q) => q.staff_id === member.id);
                const mCPD   = cpdByStaff.get(member.id) ?? 0;
                const hasExpiring = mQuals.some((q) => {
                  if (!q.expiry_date) return false;
                  return Math.ceil((new Date(q.expiry_date).getTime() - Date.now()) / 86400000) <= 90;
                });
                return (
                  <Card key={member.id} className={hasExpiring ? "border-amber-500/40" : ""}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-medium text-sm">{member.name}</p>
                          <p className="text-xs text-muted-foreground">{member.role}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">CPD: {mCPD}h</Badge>
                          <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setQualModal({ open: true, staffId: member.id })}>+ Add</Button>
                        </div>
                      </div>
                      {mQuals.length > 0 && (
                        <div className="mt-3 space-y-1">
                          {mQuals.map((q: any) => {
                            const days = q.expiry_date
                              ? Math.ceil((new Date(q.expiry_date).getTime() - Date.now()) / 86400000)
                              : null;
                            return (
                              <div key={q.id} className="flex items-center justify-between text-xs py-1 border-t border-border/40">
                                <span className="font-medium">{q.licence_type}</span>
                                <div className="flex items-center gap-2">
                                  {q.issuing_body && <span className="text-muted-foreground">{q.issuing_body}</span>}
                                  {days != null && (
                                    <Badge variant="outline" className={`text-xs ${
                                      days <= 30  ? "bg-red-500/10 text-red-300 border-red-500/30" :
                                      days <= 90  ? "bg-amber-500/10 text-amber-300 border-amber-500/30" :
                                      "bg-muted text-muted-foreground"
                                    }`}>
                                      {days <= 0 ? "Expired" : `Exp ${days}d`}
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                      {mQuals.length === 0 && <p className="text-xs text-muted-foreground mt-2">No qualifications on record.</p>}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {qualModal.open && (
        <CoachingQualModal
          staffId={qualModal.staffId}
          staff={staff as any[]}
          onClose={() => setQualModal({ open: false })}
          onSaved={() => {
            setQualModal({ open: false });
            qc.invalidateQueries({ queryKey: ["coaching_quals_list"] });
            qc.invalidateQueries({ queryKey: ["cpd_all"] });
            qc.invalidateQueries({ queryKey: ["eppp_quals"] });
            qc.invalidateQueries({ queryKey: ["eppp_cpd"] });
          }}
        />
      )}
    </SafeDashboardLayout>
  );
}
