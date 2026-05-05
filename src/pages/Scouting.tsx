import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import SafeDashboardLayout from "@/components/layout/SafeDashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle, ArrowRight, BarChart2, Eye, Globe, Plus } from "lucide-react";
import { supabase as supabaseClient } from "@/integrations/supabase/client";
import ProspectModal from "@/components/scouting/ProspectModal";
import ScoutReportModal from "@/components/scouting/ScoutReportModal";
import TrialModal from "@/components/scouting/TrialModal";
import ComparisonModal from "@/components/scouting/ComparisonModal";

const supabase = supabaseClient as any;

const PIPELINE_COLS = [
  { key: "identified", label: "Identified",    next: "watching"  },
  { key: "watching",   label: "Watching",       next: "on_trial"  },
  { key: "on_trial",   label: "On Trial",       next: "offer"     },
  { key: "offer",      label: "Offer / Signed", next: null        },
] as const;

function daysUntil(dateStr: string): number {
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86_400_000);
}

function maturationColor(badge?: string | null) {
  if (badge === "early") return "bg-blue-500/20 text-blue-300 border-blue-500/30";
  if (badge === "late")  return "bg-amber-500/20 text-amber-300 border-amber-500/30";
  return "bg-muted text-muted-foreground";
}

export default function Scouting() {
  const qc = useQueryClient();
  const [prospectModal, setProspectModal] = useState<{ open: boolean; prospect?: any }>({ open: false });
  const [reportModal,   setReportModal]   = useState<{ open: boolean; prospect?: any }>({ open: false });
  const [trialModal,    setTrialModal]    = useState<{ open: boolean; prospect?: any }>({ open: false });
  const [compareOpen,   setCompareOpen]   = useState(false);

  const { data: prospects = [], isLoading } = useQuery({
    queryKey: ["prospects"],
    queryFn: async () => {
      const { data, error } = await supabase.from("prospect").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: reportRows = [] } = useQuery({
    queryKey: ["scout_report_counts"],
    queryFn: async () => {
      const { data } = await supabase.from("scout_report").select("prospect_id");
      return data ?? [];
    },
  });

  const { data: settings } = useQuery({
    queryKey: ["scouting_settings"],
    queryFn: async () => {
      const { data } = await supabase.from("scouting_settings").select("*").limit(1).maybeSingle();
      return data;
    },
  });

  const { data: trialSessions = [] } = useQuery({
    queryKey: ["trial_sessions_summary"],
    queryFn: async () => {
      const { data } = await supabase.from("trial_session").select("prospect_id, session_date, rating");
      return data ?? [];
    },
  });

  const minReports: number = settings?.min_reports_for_trial ?? 3;

  const reportCountMap = new Map<string, number>();
  for (const r of reportRows) {
    reportCountMap.set(r.prospect_id, (reportCountMap.get(r.prospect_id) ?? 0) + 1);
  }

  const sessionCountMap = new Map<string, number>();
  for (const s of trialSessions) {
    sessionCountMap.set(s.prospect_id, (sessionCountMap.get(s.prospect_id) ?? 0) + 1);
  }

  async function moveProspect(prospect: any, toStatus: string) {
    if (toStatus === "on_trial" && (reportCountMap.get(prospect.id) ?? 0) < minReports) {
      alert(`Minimum ${minReports} scout reports required before moving to On Trial.`);
      return;
    }
    await supabase.from("prospect").update({ status: toStatus }).eq("id", prospect.id);
    qc.invalidateQueries({ queryKey: ["prospects"] });
  }

  const urgentDeadlines = (prospects as any[]).filter((p) => {
    const d = p.trial_decision_deadline;
    return d && daysUntil(d) <= 7 && daysUntil(d) >= 0;
  });
  const epppAlerts = (prospects as any[]).filter((p) => {
    const d = p.eppp_approach_date;
    return d && daysUntil(d) <= 30 && daysUntil(d) >= 0;
  });

  const watchlistProspects = (prospects as any[]).filter((p) => p.on_watchlist);
  const trialProspects     = (prospects as any[]).filter((p) => p.status === "on_trial");

  return (
    <SafeDashboardLayout>
      <div className="p-6 space-y-6 max-w-screen-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Scouting &amp; Recruitment</h1>
            <p className="text-muted-foreground text-sm mt-1">Prospect pipeline, scout reports, and trial management</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setCompareOpen(true)}>
              <BarChart2 className="h-4 w-4 mr-2" /> Compare
            </Button>
            <Button size="sm" onClick={() => setProspectModal({ open: true })}>
              <Plus className="h-4 w-4 mr-2" /> Add Prospect
            </Button>
          </div>
        </div>

        {/* Urgent alerts */}
        {(urgentDeadlines.length > 0 || epppAlerts.length > 0) && (
          <div className="space-y-2">
            {urgentDeadlines.map((p: any) => (
              <div key={p.id} className="flex items-center gap-3 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-300">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span><strong>{p.name}</strong> — trial decision deadline in <strong>{daysUntil(p.trial_decision_deadline)} day(s)</strong></span>
              </div>
            ))}
            {epppAlerts.map((p: any) => (
              <div key={p.id} className="flex items-center gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-2 text-sm text-amber-300">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span><strong>{p.name}</strong> — EPPP approach date in <strong>{daysUntil(p.eppp_approach_date)} day(s)</strong></span>
              </div>
            ))}
          </div>
        )}

        <Tabs defaultValue="pipeline">
          <TabsList>
            <TabsTrigger value="pipeline">Pipeline</TabsTrigger>
            <TabsTrigger value="watchlist">Watchlist ({watchlistProspects.length})</TabsTrigger>
            <TabsTrigger value="trials">Trials ({trialProspects.length})</TabsTrigger>
          </TabsList>

          {/* PIPELINE */}
          <TabsContent value="pipeline" className="mt-4">
            {isLoading ? (
              <div className="grid grid-cols-4 gap-4">
                {PIPELINE_COLS.map((col) => (
                  <div key={col.key} className="space-y-3">
                    <Skeleton className="h-6 w-24" />
                    <Skeleton className="h-32 w-full rounded-xl" />
                    <Skeleton className="h-32 w-full rounded-xl" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                {PIPELINE_COLS.map((col) => {
                  const colProspects = (prospects as any[]).filter((p) => p.status === col.key);
                  return (
                    <div key={col.key} className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-sm">{col.label}</h3>
                        <Badge variant="secondary">{colProspects.length}</Badge>
                      </div>
                      <div className="space-y-3 min-h-[120px]">
                        {colProspects.map((prospect: any) => (
                          <ProspectCard
                            key={prospect.id}
                            prospect={prospect}
                            col={col}
                            reportCount={reportCountMap.get(prospect.id) ?? 0}
                            minReports={minReports}
                            onEdit={() => setProspectModal({ open: true, prospect })}
                            onReport={() => setReportModal({ open: true, prospect })}
                            onMove={(toStatus) => moveProspect(prospect, toStatus)}
                          />
                        ))}
                        {colProspects.length === 0 && (
                          <p className="text-xs text-muted-foreground text-center py-6 border border-dashed rounded-xl">
                            No prospects
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* WATCHLIST */}
          <TabsContent value="watchlist" className="mt-4">
            <div className="space-y-3">
              {watchlistProspects.length === 0 ? (
                <p className="text-muted-foreground text-sm">No prospects on watchlist.</p>
              ) : (
                watchlistProspects.map((p: any) => (
                  <WatchlistRow
                    key={p.id}
                    prospect={p}
                    onEdit={() => setProspectModal({ open: true, prospect: p })}
                    onReport={() => setReportModal({ open: true, prospect: p })}
                  />
                ))
              )}
            </div>
          </TabsContent>

          {/* TRIALS */}
          <TabsContent value="trials" className="mt-4">
            <div className="space-y-3">
              {trialProspects.length === 0 ? (
                <p className="text-muted-foreground text-sm">No prospects currently on trial.</p>
              ) : (
                trialProspects.map((p: any) => (
                  <TrialRow
                    key={p.id}
                    prospect={p}
                    sessionCount={sessionCountMap.get(p.id) ?? 0}
                    onTrial={() => setTrialModal({ open: true, prospect: p })}
                  />
                ))
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {prospectModal.open && (
        <ProspectModal
          prospect={prospectModal.prospect}
          onClose={() => setProspectModal({ open: false })}
          onSaved={() => {
            setProspectModal({ open: false });
            qc.invalidateQueries({ queryKey: ["prospects"] });
          }}
        />
      )}
      {reportModal.open && reportModal.prospect && (
        <ScoutReportModal
          prospect={reportModal.prospect}
          onClose={() => setReportModal({ open: false })}
          onSaved={() => {
            setReportModal({ open: false });
            qc.invalidateQueries({ queryKey: ["scout_report_counts"] });
          }}
        />
      )}
      {trialModal.open && trialModal.prospect && (
        <TrialModal
          prospect={trialModal.prospect}
          onClose={() => setTrialModal({ open: false })}
          onSaved={() => {
            setTrialModal({ open: false });
            qc.invalidateQueries({ queryKey: ["trial_sessions_summary"] });
          }}
        />
      )}
      {compareOpen && (
        <ComparisonModal
          prospects={prospects as any[]}
          onClose={() => setCompareOpen(false)}
        />
      )}
    </SafeDashboardLayout>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function ProspectCard({
  prospect, col, reportCount, minReports, onEdit, onReport, onMove,
}: {
  prospect: any;
  col: typeof PIPELINE_COLS[number];
  reportCount: number;
  minReports: number;
  onEdit: () => void;
  onReport: () => void;
  onMove: (status: string) => void;
}) {
  const canMove = col.key !== "watching" || reportCount >= minReports;
  return (
    <Card className="hover:border-primary/50 transition-colors">
      <CardContent className="p-3 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <button className="text-left" onClick={onEdit}>
            <p className="font-medium text-sm leading-tight">{prospect.name}</p>
            {prospect.position && <p className="text-xs text-muted-foreground">{prospect.position}</p>}
          </button>
          {prospect.international_eligible && (
            <Globe className="h-3.5 w-3.5 text-blue-400 shrink-0 mt-0.5" />
          )}
        </div>

        <div className="flex flex-wrap gap-1">
          {prospect.rating != null && (
            <Badge variant="outline" className="text-xs px-1.5 py-0">
              &#9733; {Number(prospect.rating).toFixed(1)}
            </Badge>
          )}
          {prospect.maturation_badge && (
            <Badge variant="outline" className={`text-xs px-1.5 py-0 ${maturationColor(prospect.maturation_badge)}`}>
              {prospect.maturation_badge}
            </Badge>
          )}
        </div>

        {prospect.competing_interest && (
          <p className="text-xs text-amber-400 leading-tight">&#9888; {prospect.competing_interest}</p>
        )}
        {prospect.current_club && (
          <p className="text-xs text-muted-foreground truncate">{prospect.current_club}</p>
        )}

        {col.key === "watching" && (
          <div className={`text-xs rounded px-1.5 py-0.5 inline-block ${
            reportCount >= minReports ? "bg-emerald-500/20 text-emerald-300" : "bg-muted text-muted-foreground"
          }`}>
            {reportCount}/{minReports} reports
          </div>
        )}

        <div className="flex gap-1 pt-1">
          <Button size="sm" variant="ghost" className="h-6 text-xs px-2" onClick={onReport}>
            <Eye className="h-3 w-3 mr-1" /> Report
          </Button>
          {col.next && (
            <Button
              size="sm"
              variant="ghost"
              className={`h-6 text-xs px-2 ${!canMove ? "opacity-40" : ""}`}
              onClick={() => onMove(col.next!)}
              title={!canMove ? `Need ${minReports} reports first` : undefined}
            >
              <ArrowRight className="h-3 w-3 mr-1" /> Move
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function WatchlistRow({ prospect, onEdit, onReport }: {
  prospect: any;
  onEdit: () => void;
  onReport: () => void;
}) {
  const epppDays = prospect.eppp_approach_date ? daysUntil(prospect.eppp_approach_date) : null;
  return (
    <Card>
      <CardContent className="p-4 flex items-center gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <button onClick={onEdit} className="font-medium text-sm hover:underline">{prospect.name}</button>
            {prospect.international_eligible && (
              <Badge variant="outline" className="text-xs bg-blue-500/10 text-blue-300 border-blue-500/30">International</Badge>
            )}
            {prospect.maturation_badge && (
              <Badge variant="outline" className={`text-xs ${maturationColor(prospect.maturation_badge)}`}>
                {prospect.maturation_badge}
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            {[prospect.position, prospect.current_club].filter(Boolean).join(" · ")}
          </p>
        </div>
        {epppDays != null && (
          <div className={`text-xs font-medium rounded px-2 py-1 ${
            epppDays <= 7 ? "bg-red-500/20 text-red-300" :
            epppDays <= 30 ? "bg-amber-500/20 text-amber-300" :
            "bg-muted text-muted-foreground"
          }`}>
            EPPP: {epppDays}d
          </div>
        )}
        {prospect.rating != null && (
          <div className="text-sm font-bold">&#9733; {Number(prospect.rating).toFixed(1)}</div>
        )}
        <Button size="sm" variant="outline" onClick={onReport} className="shrink-0">
          <Eye className="h-3.5 w-3.5 mr-1.5" /> Report
        </Button>
      </CardContent>
    </Card>
  );
}

function TrialRow({ prospect, sessionCount, onTrial }: {
  prospect: any;
  sessionCount: number;
  onTrial: () => void;
}) {
  const deadlineDays = prospect.trial_decision_deadline ? daysUntil(prospect.trial_decision_deadline) : null;
  const progress = Math.min((sessionCount / 6) * 100, 100);
  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between">
          <div>
            <p className="font-medium text-sm">{prospect.name}</p>
            <p className="text-xs text-muted-foreground">
              {[prospect.position, prospect.current_club].filter(Boolean).join(" · ")}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {deadlineDays != null && (
              <Badge variant="outline" className={
                deadlineDays <= 7
                  ? "bg-red-500/20 text-red-300 border-red-500/30"
                  : "bg-muted text-muted-foreground"
              }>
                {deadlineDays <= 0 ? "Overdue" : `Decision: ${deadlineDays}d`}
              </Badge>
            )}
            <Button size="sm" variant="outline" onClick={onTrial}>
              <Plus className="h-3.5 w-3.5 mr-1.5" /> Session
            </Button>
          </div>
        </div>
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Sessions</span>
            <span>{sessionCount} completed</span>
          </div>
          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
