import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { SafeDashboardLayout } from "@/components/layout/SafeDashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, Printer } from "lucide-react";
import { supabase as supabaseClient } from "@/integrations/supabase/client";

const supabase = supabaseClient as any;

const REPORTS = [
  { id: "eppp_annual",    label: "EPPP Annual Pack",             description: "Full academy compliance overview for EPPP submission" },
  { id: "individual_dev", label: "Individual Development Report", description: "Player development profile, shareable with parents" },
  { id: "attendance",     label: "Attendance Summary",            description: "School and training attendance by player" },
  { id: "injury",         label: "Injury Report",                 description: "Injury log with status and body part breakdown" },
  { id: "scouting",       label: "Scouting Activity Report",      description: "Prospect pipeline and scout report summary" },
];

export default function ReportBuilder() {
  const [selected, setSelected] = useState("");
  const [playerId, setPlayerId] = useState("");

  const { data: players = [] } = useQuery({
    queryKey: ["players_reports"],
    queryFn: async () => {
      const { data } = await supabase.from("players").select("id, name, position").order("name");
      return data ?? [];
    },
  });

  const needsPlayer = selected === "individual_dev";
  const enabled = !!selected && (!needsPlayer || !!playerId);

  const { data: reportData, isLoading } = useQuery({
    queryKey: ["report_data", selected, playerId],
    queryFn: async () => {
      const r: any = { type: selected };
      if (selected === "eppp_annual") {
        const [pl, inj, qual, sc] = await Promise.all([
          supabase.from("players").select("id, name, position").order("name"),
          supabase.from("injury_record").select("*").order("created_at", { ascending: false }),
          supabase.from("coaching_qualification").select("*, staff:staff_id(name)"),
          supabase.from("scout_report").select("recommendation"),
        ]);
        r.players = pl.data ?? []; r.injuries = inj.data ?? []; r.quals = qual.data ?? []; r.scouts = sc.data ?? [];
      }
      if (selected === "individual_dev" && playerId) {
        const [pl, inj, ft, lo] = await Promise.all([
          supabase.from("players").select("*").eq("id", playerId).single(),
          supabase.from("injury_record").select("*").eq("player_id", playerId).order("injury_date", { ascending: false }),
          supabase.from("fitness_test_result").select("*").eq("player_id", playerId).order("tested_at", { ascending: false }),
          supabase.from("training_load").select("recorded_at, load_au").eq("player_id", playerId).order("recorded_at", { ascending: false }).limit(28),
        ]);
        r.player = pl.data; r.injuries = inj.data ?? []; r.fitnessTests = ft.data ?? []; r.loads = lo.data ?? [];
      }
      if (selected === "attendance") {
        const { data } = await supabase.from("school_attendance").select("*, player:player_id(name)").order("created_at", { ascending: false });
        r.attendance = data ?? [];
      }
      if (selected === "injury") {
        const { data } = await supabase.from("injury_record").select("*, player:player_id(name)").order("injury_date", { ascending: false });
        r.injuries = data ?? [];
      }
      if (selected === "scouting") {
        const [pr, sr] = await Promise.all([
          supabase.from("prospect").select("*").order("created_at", { ascending: false }),
          supabase.from("scout_report").select("recommendation, created_at"),
        ]);
        r.prospects = pr.data ?? []; r.reports = sr.data ?? [];
      }
      return r;
    },
    enabled,
  });

  return (
    <SafeDashboardLayout>
      <div className="p-6 space-y-6 max-w-screen-xl mx-auto print:hidden">
        <div>
          <h1 className="text-2xl font-bold">Report Builder</h1>
          <p className="text-muted-foreground text-sm mt-1">Generate reports from live data and print as PDF</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {REPORTS.map((r) => (
            <Card
              key={r.id}
              className={`cursor-pointer transition-colors hover:border-primary/50 ${selected === r.id ? "border-primary bg-primary/5" : ""}`}
              onClick={() => { setSelected(r.id); setPlayerId(""); }}
            >
              <CardContent className="p-4 flex items-start gap-3">
                <FileText className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium text-sm">{r.label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{r.description}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {needsPlayer && (
          <Select value={playerId} onValueChange={setPlayerId}>
            <SelectTrigger className="w-64"><SelectValue placeholder="Select player…" /></SelectTrigger>
            <SelectContent>{(players as any[]).map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
          </Select>
        )}

        {enabled && (
          <div className="flex items-center gap-3">
            <Button onClick={() => window.print()} disabled={isLoading || !reportData}>
              <Printer className="h-4 w-4 mr-2" />
              {isLoading ? "Loading data…" : "Print / Save as PDF"}
            </Button>
            <span className="text-xs text-muted-foreground">Use your browser’s “Save as PDF” option</span>
          </div>
        )}
      </div>

      {reportData && <PrintReport data={reportData} />}
    </SafeDashboardLayout>
  );
}

function PrintReport({ data }: { data: any }) {
  const now = new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
  const base = "print:block hidden p-8 space-y-6 text-black bg-white";

  if (data.type === "eppp_annual") return (
    <div className={base}>
      <div className="border-b pb-4"><h1 className="text-2xl font-bold">EPPP Annual Compliance Pack</h1><p className="text-sm text-gray-500">Generated: {now}</p></div>
      <section><h2 className="text-lg font-semibold mb-2">Squad ({data.players.length} players)</h2>
        <table className="w-full text-sm border-collapse"><thead><tr className="border-b"><th className="text-left py-1">Name</th><th className="text-left py-1">Position</th></tr></thead>
          <tbody>{data.players.map((p: any) => <tr key={p.id} className="border-b border-gray-100"><td className="py-1">{p.name}</td><td className="py-1 text-gray-500">{p.position}</td></tr>)}</tbody>
        </table></section>
      <section><h2 className="text-lg font-semibold mb-2">Injuries</h2><p className="text-sm text-gray-600">{data.injuries.length} records on file.</p></section>
      <section><h2 className="text-lg font-semibold mb-2">Coaching Qualifications</h2>
        <table className="w-full text-sm border-collapse"><thead><tr className="border-b"><th className="text-left py-1">Staff</th><th className="text-left py-1">Licence</th><th className="text-left py-1">Expires</th></tr></thead>
          <tbody>{data.quals.map((q: any) => <tr key={q.id} className="border-b border-gray-100"><td className="py-1">{q.staff?.name}</td><td className="py-1">{q.licence_type}</td><td className="py-1 text-gray-500">{q.expiry_date ?? "—"}</td></tr>)}</tbody>
        </table></section>
      <section><h2 className="text-lg font-semibold mb-2">Scouting</h2>
        <p className="text-sm text-gray-600">{data.scouts.filter((s: any) => s.recommendation === "sign").length} sign · {data.scouts.filter((s: any) => s.recommendation === "continue_watching").length} watching · {data.scouts.filter((s: any) => s.recommendation === "reject").length} rejected</p>
      </section>
    </div>
  );

  if (data.type === "individual_dev" && data.player) return (
    <div className={base}>
      <div className="border-b pb-4"><h1 className="text-2xl font-bold">Individual Development Report</h1><h2 className="text-lg mt-1">{data.player.name}</h2><p className="text-sm text-gray-500">{data.player.position} · {now}</p></div>
      <section><h3 className="font-semibold mb-2">Fitness Tests ({data.fitnessTests.length})</h3>{data.fitnessTests.slice(0,5).map((t: any) => <p key={t.id} className="text-sm">{t.tested_at}: {t.test_type} — {t.value} {t.unit}</p>)}{data.fitnessTests.length === 0 && <p className="text-sm text-gray-500">None on record.</p>}</section>
      <section><h3 className="font-semibold mb-2">Injuries ({data.injuries.length})</h3>{data.injuries.slice(0,5).map((i: any) => <p key={i.id} className="text-sm">{i.injury_date}: {i.body_part} — {i.diagnosis}</p>)}{data.injuries.length === 0 && <p className="text-sm text-gray-500">None on record.</p>}</section>
      <section><h3 className="font-semibold mb-2">Training Load</h3><p className="text-sm text-gray-600">{data.loads.length} sessions in past 28 days.</p></section>
    </div>
  );

  if (data.type === "attendance") return (
    <div className={base}>
      <div className="border-b pb-4"><h1 className="text-2xl font-bold">Attendance Summary</h1><p className="text-sm text-gray-500">{now}</p></div>
      <table className="w-full text-sm border-collapse"><thead><tr className="border-b"><th className="text-left py-1">Player</th><th className="text-left py-1">Term</th><th className="text-left py-1">Days</th><th className="text-left py-1">Total</th><th className="text-left py-1">%</th></tr></thead>
        <tbody>{data.attendance.map((a: any) => <tr key={a.id} className="border-b border-gray-100"><td className="py-1">{a.player?.name}</td><td className="py-1 text-gray-500">{a.term}</td><td className="py-1">{a.days_attended}</td><td className="py-1">{a.total_days}</td><td className={`py-1 font-medium ${a.attendance_pct < 90 ? "text-red-600" : ""}`}>{a.attendance_pct}%</td></tr>)}
        {data.attendance.length === 0 && <tr><td colSpan={5} className="py-4 text-gray-500">No records.</td></tr>}</tbody>
      </table>
    </div>
  );

  if (data.type === "injury") return (
    <div className={base}>
      <div className="border-b pb-4"><h1 className="text-2xl font-bold">Injury Report</h1><p className="text-sm text-gray-500">{now}</p></div>
      <table className="w-full text-sm border-collapse"><thead><tr className="border-b"><th className="text-left py-1">Player</th><th className="text-left py-1">Date</th><th className="text-left py-1">Body Part</th><th className="text-left py-1">Diagnosis</th><th className="text-left py-1">Status</th></tr></thead>
        <tbody>{data.injuries.map((i: any) => <tr key={i.id} className="border-b border-gray-100"><td className="py-1">{i.player?.name}</td><td className="py-1 text-gray-500">{i.injury_date}</td><td className="py-1">{i.body_part}</td><td className="py-1">{i.diagnosis}</td><td className="py-1">{i.status}</td></tr>)}
        {data.injuries.length === 0 && <tr><td colSpan={5} className="py-4 text-gray-500">No records.</td></tr>}</tbody>
      </table>
    </div>
  );

  if (data.type === "scouting") {
    const byStatus: Record<string, number> = {};
    for (const p of data.prospects) byStatus[p.status] = (byStatus[p.status] ?? 0) + 1;
    return (
      <div className={base}>
        <div className="border-b pb-4"><h1 className="text-2xl font-bold">Scouting Activity Report</h1><p className="text-sm text-gray-500">{now}</p></div>
        <section><h2 className="text-lg font-semibold mb-2">Pipeline</h2>
          <div className="grid grid-cols-4 gap-4 text-center">
            {["identified","watching","on_trial","offer"].map((s) => (
              <div key={s} className="border rounded p-3"><p className="text-2xl font-bold">{byStatus[s] ?? 0}</p><p className="text-xs text-gray-500 capitalize">{s.replace("_"," ")}</p></div>
            ))}
          </div>
        </section>
        <section><h2 className="text-lg font-semibold mb-2">Prospects ({data.prospects.length})</h2>
          <table className="w-full text-sm border-collapse"><thead><tr className="border-b"><th className="text-left py-1">Name</th><th className="text-left py-1">Position</th><th className="text-left py-1">Status</th><th className="text-left py-1">Rating</th></tr></thead>
            <tbody>{data.prospects.map((p: any) => <tr key={p.id} className="border-b border-gray-100"><td className="py-1">{p.name}</td><td className="py-1 text-gray-500">{p.position}</td><td className="py-1 capitalize">{p.status?.replace("_"," ")}</td><td className="py-1">{p.rating ?? "—"}</td></tr>)}</tbody>
          </table>
        </section>
        <section><h2 className="text-lg font-semibold mb-2">Reports ({data.reports.length})</h2>
          <p className="text-sm text-gray-600">{data.reports.filter((r:any)=>r.recommendation==="sign").length} sign · {data.reports.filter((r:any)=>r.recommendation==="continue_watching").length} watching · {data.reports.filter((r:any)=>r.recommendation==="reject").length} reject</p>
        </section>
      </div>
    );
  }

  return null;
}
