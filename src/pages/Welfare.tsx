import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { SafeDashboardLayout } from '@/components/layout/SafeDashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { supabase as supabaseClient } from '@/integrations/supabase/client';
const supabase = supabaseClient as any;
import { AlertTriangle, BookOpen, CheckSquare, Heart, MessageSquare, School } from 'lucide-react';
import PastoralLogModal from '@/components/welfare/PastoralLogModal';
import AttendanceModal from '@/components/welfare/AttendanceModal';
import SafeguardingChecklistModal from '@/components/welfare/SafeguardingChecklistModal';
import DualCareerModal from '@/components/welfare/DualCareerModal';
import MessageThreadModal from '@/components/welfare/MessageThreadModal';

export default function Welfare() {
  const qc = useQueryClient();
  const [pastoralModal, setPastoralModal] = useState(false);
  const [attendanceModal, setAttendanceModal] = useState(false);
  const [checklistModal, setChecklistModal] = useState(false);
  const [dualCareerModal, setDualCareerModal] = useState<string | null>(null);
  const [messageThread, setMessageThread] = useState<string | null>(null);
  const [yearFilter, setYearFilter] = useState('2024/25');
  const [termFilter, setTermFilter] = useState('autumn');

  const { data: players = [] } = useQuery({
    queryKey: ['players-welfare'],
    queryFn: async () => {
      const { data } = await supabase.from('players').select('id, name, position');
      return data ?? [];
    },
  });

  const { data: attendance = [] } = useQuery({
    queryKey: ['school-attendance', yearFilter],
    queryFn: async () => {
      const { data } = await supabase
        .from('school_attendance')
        .select('*, players(name)')
        .eq('academic_year', yearFilter)
        .order('attendance_pct', { ascending: true });
      return data ?? [];
    },
  });

  const { data: pastoralLogs = [] } = useQuery({
    queryKey: ['welfare-logs'],
    queryFn: async () => {
      const { data } = await supabase
        .from('welfare_log')
        .select('*, players(name)')
        .order('created_at', { ascending: false })
        .limit(50);
      return data ?? [];
    },
  });

  const { data: checklist = [] } = useQuery({
    queryKey: ['safeguarding-checklist'],
    queryFn: async () => {
      const { data } = await supabase
        .from('safeguarding_checklist')
        .select('*')
        .order('category');
      return data ?? [];
    },
  });

  const { data: eduPlans = [] } = useQuery({
    queryKey: ['education-plans'],
    queryFn: async () => {
      const { data } = await supabase
        .from('education_plan')
        .select('*, players(name)');
      return data ?? [];
    },
  });

  const { data: messages = [] } = useQuery({
    queryKey: ['parent-messages'],
    queryFn: async () => {
      const { data } = await supabase
        .from('parent_message')
        .select('*, players(name)')
        .order('created_at', { ascending: false });
      return data ?? [];
    },
  });

  const today = new Date().toISOString().split('T')[0];

  const below80 = (attendance as any[]).filter((a: any) => a.attendance_pct !== null && a.attendance_pct < 80).length;
  const openConcerns = (pastoralLogs as any[]).filter((l: any) => l.status === 'open').length;
  const overdueChecklist = (checklist as any[]).filter(
    (c: any) => c.status !== 'compliant' && c.expiry_date && c.expiry_date < today
  ).length;
  const examPeriodPlayers = (eduPlans as any[]).filter((p: any) => {
    if (!Array.isArray(p.exam_periods)) return false;
    return p.exam_periods.some((ep: any) => ep.start <= today && ep.end >= today);
  }).length;

  const alerts: { type: 'warning' | 'info'; message: string }[] = [];
  if (below80 > 0) alerts.push({ type: 'warning', message: `${below80} player${below80 > 1 ? 's' : ''} below 80% attendance` });
  if (openConcerns > 0) alerts.push({ type: 'warning', message: `${openConcerns} open pastoral concern${openConcerns > 1 ? 's' : ''}` });
  if (overdueChecklist > 0) alerts.push({ type: 'warning', message: `${overdueChecklist} overdue safeguarding item${overdueChecklist > 1 ? 's' : ''}` });
  if (examPeriodPlayers > 0) alerts.push({ type: 'info', message: `${examPeriodPlayers} player${examPeriodPlayers > 1 ? 's' : ''} in active exam period` });

  const threadsByPlayer = new Map<string, any[]>();
  for (const msg of messages as any[]) {
    if (!threadsByPlayer.has(msg.player_id)) threadsByPlayer.set(msg.player_id, []);
    threadsByPlayer.get(msg.player_id)!.push(msg);
  }

  const checklistByCategory = new Map<string, any[]>();
  for (const item of checklist as any[]) {
    if (!checklistByCategory.has(item.category)) checklistByCategory.set(item.category, []);
    checklistByCategory.get(item.category)!.push(item);
  }

  function statusColor(s: string) {
    if (s === 'compliant') return 'bg-emerald-500/20 text-emerald-300';
    if (s === 'in_progress') return 'bg-amber-500/20 text-amber-300';
    if (s === 'overdue' || s === 'expired') return 'bg-red-500/20 text-red-300';
    return 'bg-muted text-muted-foreground';
  }

  function attendanceCellClass(pct: number) {
    if (pct < 80) return 'bg-red-500/20 text-red-300';
    if (pct < 90) return 'text-amber-300';
    return 'text-emerald-300';
  }

  return (
    <SafeDashboardLayout>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold tracking-tight">Education &amp; Welfare</h1>

        <Tabs defaultValue="overview">
          <TabsList className="flex-wrap h-auto gap-1">
            <TabsTrigger value="overview"><Heart className="h-4 w-4 mr-1.5" />Overview</TabsTrigger>
            <TabsTrigger value="attendance"><School className="h-4 w-4 mr-1.5" />Attendance</TabsTrigger>
            <TabsTrigger value="pastoral"><BookOpen className="h-4 w-4 mr-1.5" />Pastoral</TabsTrigger>
            <TabsTrigger value="safeguarding"><CheckSquare className="h-4 w-4 mr-1.5" />Safeguarding</TabsTrigger>
            <TabsTrigger value="dualcareer"><AlertTriangle className="h-4 w-4 mr-1.5" />Dual Career</TabsTrigger>
            <TabsTrigger value="comms"><MessageSquare className="h-4 w-4 mr-1.5" />Communications</TabsTrigger>
          </TabsList>

          {/* ── Overview ── */}
          <TabsContent value="overview" className="mt-4 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard label="Below 80% Attendance" value={below80} variant={below80 > 0 ? 'danger' : 'ok'} />
              <StatCard label="Open Concerns" value={openConcerns} variant={openConcerns > 0 ? 'warning' : 'ok'} />
              <StatCard label="Overdue Safeguarding" value={overdueChecklist} variant={overdueChecklist > 0 ? 'danger' : 'ok'} />
              <StatCard label="In Exam Period" value={examPeriodPlayers} variant="info" />
            </div>
            {alerts.length > 0 ? (
              <Card>
                <CardHeader><CardTitle className="text-base">Alert Feed</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                  {alerts.map((a, i) => (
                    <div
                      key={i}
                      className={`flex items-center gap-2 rounded-md p-3 text-sm ${
                        a.type === 'warning'
                          ? 'bg-amber-500/10 text-amber-300 border border-amber-500/20'
                          : 'bg-blue-500/10 text-blue-300 border border-blue-500/20'
                      }`}
                    >
                      <AlertTriangle className="h-4 w-4 shrink-0" />
                      {a.message}
                    </div>
                  ))}
                </CardContent>
              </Card>
            ) : (
              <Card><CardContent className="p-8 text-center text-muted-foreground">No active welfare alerts.</CardContent></Card>
            )}
          </TabsContent>

          {/* ── Attendance ── */}
          <TabsContent value="attendance" className="mt-4 space-y-4">
            <div className="flex items-center gap-3 flex-wrap">
              <Select value={yearFilter} onValueChange={setYearFilter}>
                <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['2024/25','2023/24','2022/23'].map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={termFilter} onValueChange={setTermFilter}>
                <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="autumn">Autumn</SelectItem>
                  <SelectItem value="spring">Spring</SelectItem>
                  <SelectItem value="summer">Summer</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={() => setAttendanceModal(true)}>Add Attendance</Button>
            </div>
            <Card>
              <CardContent className="overflow-x-auto p-0">
                <table className="w-full text-sm">
                  <thead className="border-b border-border">
                    <tr className="text-left text-muted-foreground">
                      <th className="p-3 font-medium">Player</th>
                      <th className="p-3 font-medium">School</th>
                      <th className="p-3 font-medium">Possible</th>
                      <th className="p-3 font-medium">Attended</th>
                      <th className="p-3 font-medium">%</th>
                      <th className="p-3 font-medium">Flag</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(attendance as any[])
                      .filter((a: any) => a.term === termFilter)
                      .map((a: any) => (
                        <tr key={a.id} className="border-t border-border/50">
                          <td className="p-3 font-medium">{(a as any).players?.name ?? '—'}</td>
                          <td className="p-3 text-muted-foreground">{a.school_name ?? '—'}</td>
                          <td className="p-3">{a.sessions_possible}</td>
                          <td className="p-3">{a.sessions_attended}</td>
                          <td className={`p-3 font-semibold ${
                            a.attendance_pct !== null ? attendanceCellClass(a.attendance_pct) : ''
                          }`}>
                            {a.attendance_pct !== null ? `${Number(a.attendance_pct).toFixed(1)}%` : '—'}
                          </td>
                          <td className="p-3">
                            {a.flagged && <Badge className="bg-red-500/20 text-red-300 text-xs">Flagged</Badge>}
                          </td>
                        </tr>
                      ))
                    }
                    {(attendance as any[]).filter((a: any) => a.term === termFilter).length === 0 && (
                      <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">No records for this period.</td></tr>
                    )}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Pastoral ── */}
          <TabsContent value="pastoral" className="mt-4 space-y-4">
            <div className="flex justify-end">
              <Button onClick={() => setPastoralModal(true)}>New Entry</Button>
            </div>
            <div className="space-y-3">
              {(pastoralLogs as any[]).map((log: any) => (
                <Card key={log.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-sm">{log.players?.name ?? '—'}</span>
                          <Badge variant="outline" className="text-xs capitalize">{log.type?.replace('_',' ')}</Badge>
                          <Badge className={`text-xs ${
                            log.status === 'open' ? 'bg-amber-500/20 text-amber-300' : 'bg-emerald-500/20 text-emerald-300'
                          }`}>{log.status}</Badge>
                          {log.is_restricted && (
                            <Badge className="text-xs bg-red-500/20 text-red-300">Restricted</Badge>
                          )}
                        </div>
                        {log.content && (
                          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{log.content}</p>
                        )}
                        {Array.isArray(log.tags) && log.tags.length > 0 && (
                          <div className="flex gap-1 mt-1 flex-wrap">
                            {log.tags.map((tag: string) => (
                              <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>
                            ))}
                          </div>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {new Date(log.created_at).toLocaleDateString('en-GB')}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {pastoralLogs.length === 0 && (
                <Card><CardContent className="p-8 text-center text-muted-foreground">No pastoral log entries.</CardContent></Card>
              )}
            </div>
          </TabsContent>

          {/* ── Safeguarding ── */}
          <TabsContent value="safeguarding" className="mt-4 space-y-4">
            <div className="flex justify-end">
              <Button onClick={() => setChecklistModal(true)}>Add Item</Button>
            </div>
            {Array.from(checklistByCategory.entries()).map(([category, items]) => (
              <Card key={category}>
                <CardHeader><CardTitle className="text-base">{category}</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  {items.map((item: any) => (
                    <div key={item.id} className="flex items-center justify-between text-sm">
                      <div>
                        <p className="font-medium">{item.item_name}</p>
                        {item.responsible_person && (
                          <p className="text-xs text-muted-foreground">{item.responsible_person}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {item.expiry_date && (
                          <span className="text-xs text-muted-foreground">{item.expiry_date}</span>
                        )}
                        <Badge className={`text-xs ${statusColor(item.status)}`}>
                          {item.status?.replace('_',' ')}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            ))}
            {checklistByCategory.size === 0 && (
              <Card><CardContent className="p-8 text-center text-muted-foreground">No safeguarding checklist items.</CardContent></Card>
            )}
          </TabsContent>

          {/* ── Dual Career ── */}
          <TabsContent value="dualcareer" className="mt-4 space-y-3">
            {(players as any[]).map(player => {
              const plan = (eduPlans as any[]).find(p => p.player_id === player.id);
              const inExam = Array.isArray(plan?.exam_periods) &&
                plan.exam_periods.some((ep: any) => ep.start <= today && ep.end >= today);
              return (
                <Card key={player.id}>
                  <CardContent className="p-4 flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm">{player.name}</span>
                        {inExam && <Badge className="bg-amber-500/20 text-amber-300 text-xs">Exam Period</Badge>}
                      </div>
                      {plan ? (
                        <div className="text-xs text-muted-foreground mt-1 space-y-0.5">
                          {plan.school_name && (
                            <p>{plan.school_name}{plan.year_group ? ` · Year ${plan.year_group}` : ''}</p>
                          )}
                          {plan.load_reduction_pct > 0 && (
                            <p>Load reduction: {plan.load_reduction_pct}%</p>
                          )}
                          {plan.career_aspirations && (
                            <p className="line-clamp-1">Aspirations: {plan.career_aspirations}</p>
                          )}
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground mt-1">No education plan on file</p>
                      )}
                    </div>
                    <Button size="sm" variant="outline" onClick={() => setDualCareerModal(player.id)}>
                      {plan ? 'Edit Plan' : 'Add Plan'}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </TabsContent>

          {/* ── Communications ── */}
          <TabsContent value="comms" className="mt-4 space-y-3">
            {(players as any[]).map(player => {
              const threads = threadsByPlayer.get(player.id) ?? [];
              if (threads.length === 0) return null;
              const latest = threads[0];
              const unread = threads.filter((m: any) => m.sender_type === 'parent' && !m.read_at).length;
              return (
                <Card
                  key={player.id}
                  className="cursor-pointer hover:bg-accent/50 transition-colors"
                  onClick={() => setMessageThread(player.id)}
                >
                  <CardContent className="p-4 flex items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{player.name}</span>
                        {unread > 0 && (
                          <Badge className="bg-blue-500/20 text-blue-300 text-xs">{unread} new</Badge>
                        )}
                      </div>
                      {latest.content && (
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{latest.content}</p>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(latest.created_at).toLocaleDateString('en-GB')}
                    </span>
                  </CardContent>
                </Card>
              );
            })}
            {threadsByPlayer.size === 0 && (
              <Card><CardContent className="p-8 text-center text-muted-foreground">No parent communications.</CardContent></Card>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {pastoralModal && (
        <PastoralLogModal
          players={players as any[]}
          onClose={() => setPastoralModal(false)}
          onSaved={() => { setPastoralModal(false); qc.invalidateQueries({ queryKey: ['welfare-logs'] }); }}
        />
      )}
      {attendanceModal && (
        <AttendanceModal
          players={players as any[]}
          onClose={() => setAttendanceModal(false)}
          onSaved={() => { setAttendanceModal(false); qc.invalidateQueries({ queryKey: ['school-attendance'] }); }}
        />
      )}
      {checklistModal && (
        <SafeguardingChecklistModal
          onClose={() => setChecklistModal(false)}
          onSaved={() => { setChecklistModal(false); qc.invalidateQueries({ queryKey: ['safeguarding-checklist'] }); }}
        />
      )}
      {dualCareerModal && (
        <DualCareerModal
          playerId={dualCareerModal}
          playerName={(players as any[]).find(p => p.id === dualCareerModal)?.name ?? ''}
          existingPlan={(eduPlans as any[]).find(p => p.player_id === dualCareerModal) ?? null}
          onClose={() => setDualCareerModal(null)}
          onSaved={() => { setDualCareerModal(null); qc.invalidateQueries({ queryKey: ['education-plans'] }); }}
        />
      )}
      {messageThread && (
        <MessageThreadModal
          playerId={messageThread}
          playerName={(players as any[]).find(p => p.id === messageThread)?.name ?? ''}
          messages={(messages as any[]).filter(m => m.player_id === messageThread)}
          onClose={() => setMessageThread(null)}
          onSaved={() => { setMessageThread(null); qc.invalidateQueries({ queryKey: ['parent-messages'] }); }}
        />
      )}
    </SafeDashboardLayout>
  );
}

function StatCard({ label, value, variant }: {
  label: string;
  value: number;
  variant: 'ok' | 'warning' | 'danger' | 'info';
}) {
  const color =
    variant === 'danger'  ? 'text-red-400'   :
    variant === 'warning' ? 'text-amber-400' :
    variant === 'info'    ? 'text-blue-400'  : 'text-emerald-400';
  return (
    <Card>
      <CardContent className="p-4">
        <p className={`text-2xl font-bold ${color}`}>{value}</p>
        <p className="text-xs text-muted-foreground mt-1">{label}</p>
      </CardContent>
    </Card>
  );
}
