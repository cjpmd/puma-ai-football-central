import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { SafeDashboardLayout } from '@/components/layout/SafeDashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase as supabaseClient } from '@/integrations/supabase/client';
const supabase = supabaseClient as any;
import { Activity, AlertTriangle, Heart, Users } from 'lucide-react';
import InjuryLogModal from '@/components/medical/InjuryLogModal';

export default function Medical() {
  const qc = useQueryClient();
  const [showLog, setShowLog] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const { data: players = [] } = useQuery({
    queryKey: ['players-medical'],
    queryFn: async () => {
      const { data } = await supabase.from('players').select('id, name, position, squad_number, team_id');
      return data ?? [];
    },
  });

  const { data: activeInjuries = [] } = useQuery({
    queryKey: ['active-injuries'],
    queryFn: async () => {
      const { data } = await supabase
        .from('injury_record')
        .select('*')
        .is('resolved_at', null)
        .order('injury_date', { ascending: false });
      return data ?? [];
    },
  });

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const { data: recentLoads = [] } = useQuery({
    queryKey: ['recent-loads-acwr'],
    queryFn: async () => {
      const { data } = await supabase
        .from('training_load')
        .select('player_id, acwr_at_time, session_date')
        .gte('session_date', sevenDaysAgo.toISOString().split('T')[0])
        .not('acwr_at_time', 'is', null)
        .order('session_date', { ascending: false });
      return data ?? [];
    },
  });

  const injuredIds = new Set((activeInjuries as any[]).map((i: any) => i.player_id));

  // Deduplicate to most recent ACWR per player
  const alertMap = new Map<string, number>();
  for (const row of recentLoads as any[]) {
    if (!alertMap.has(row.player_id)) {
      alertMap.set(row.player_id, row.acwr_at_time);
    }
  }

  const acwrAlerts = Array.from(alertMap.entries())
    .filter(([, acwr]) => acwr >= 1.3)
    .map(([player_id, acwr]) => ({ player_id, acwr }));

  const counts = {
    available: (players as any[]).filter((p: any) => !injuredIds.has(p.id) && !alertMap.has(p.id)).length,
    injured: (activeInjuries as any[]).length,
    high_load: acwrAlerts.filter(a => a.acwr > 1.5 && !injuredIds.has(a.player_id)).length,
    monitoring: acwrAlerts.filter(a => a.acwr >= 1.3 && a.acwr <= 1.5 && !injuredIds.has(a.player_id)).length,
  };

  const filteredPlayers = (players as any[]).filter((p: any) => {
    if (statusFilter === 'injured') return injuredIds.has(p.id);
    if (statusFilter === 'high_load') return acwrAlerts.some(a => a.player_id === p.id && a.acwr > 1.5 && !injuredIds.has(p.id));
    if (statusFilter === 'monitoring') return acwrAlerts.some(a => a.player_id === p.id && a.acwr >= 1.3 && a.acwr <= 1.5 && !injuredIds.has(p.id));
    if (statusFilter === 'available') return !injuredIds.has(p.id) && !alertMap.has(p.id);
    return true;
  });

  return (
    <SafeDashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold tracking-tight">Medical &amp; Load</h1>
          <Button onClick={() => setShowLog(true)}>Log Injury</Button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Available" value={counts.available} icon={<Users className="h-5 w-5 text-emerald-500" />} onClick={() => setStatusFilter('available')} active={statusFilter === 'available'} />
          <StatCard label="Injured" value={counts.injured} icon={<Heart className="h-5 w-5 text-red-500" />} onClick={() => setStatusFilter('injured')} active={statusFilter === 'injured'} />
          <StatCard label="High Load (ACWR &gt;1.5)" value={counts.high_load} icon={<AlertTriangle className="h-5 w-5 text-red-400" />} onClick={() => setStatusFilter('high_load')} active={statusFilter === 'high_load'} />
          <StatCard label="Monitoring (1.3–1.5)" value={counts.monitoring} icon={<Activity className="h-5 w-5 text-amber-400" />} onClick={() => setStatusFilter('monitoring')} active={statusFilter === 'monitoring'} />
        </div>

        <div className="space-y-2">
          {statusFilter !== 'all' && (
            <Button variant="ghost" size="sm" onClick={() => setStatusFilter('all')}>Clear filter</Button>
          )}
          {filteredPlayers.map((p: any) => {
            const injury = (activeInjuries as any[]).find(i => i.player_id === p.id);
            const acwr = alertMap.get(p.id);
            return (
              <PlayerRow
                key={p.id}
                player={p}
                injury={injury}
                acwr={acwr}
                onRefresh={() => qc.invalidateQueries({ queryKey: ['active-injuries'] })}
              />
            );
          })}
          {filteredPlayers.length === 0 && (
            <p className="text-sm text-muted-foreground py-8 text-center">No players match this filter.</p>
          )}
        </div>

        {acwrAlerts.length > 0 && (
          <Card>
            <CardHeader><CardTitle className="text-base">ACWR Alerts</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {acwrAlerts.map(({ player_id, acwr }) => {
                const player = (players as any[]).find(p => p.id === player_id);
                return (
                  <div key={player_id} className="flex items-center justify-between text-sm">
                    <span>{player?.name ?? player_id}</span>
                    <Badge className={acwr > 1.5 ? 'bg-red-500/20 text-red-300' : 'bg-amber-500/20 text-amber-300'}>
                      ACWR {acwr.toFixed(2)}
                    </Badge>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        )}
      </div>

      {showLog && (
        <InjuryLogModal
          players={players as any[]}
          onClose={() => setShowLog(false)}
          onSaved={() => {
            setShowLog(false);
            qc.invalidateQueries({ queryKey: ['active-injuries'] });
          }}
        />
      )}
    </SafeDashboardLayout>
  );
}

function StatCard({ label, value, icon, onClick, active }: {
  label: string;
  value: number;
  icon: React.ReactNode;
  onClick: () => void;
  active: boolean;
}) {
  return (
    <Card
      className={`cursor-pointer transition-colors ${active ? 'ring-2 ring-primary' : 'hover:bg-accent/50'}`}
      onClick={onClick}
    >
      <CardContent className="p-4 flex items-center gap-3">
        {icon}
        <div>
          <p className="text-2xl font-bold">{value}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function PlayerRow({ player, injury, acwr, onRefresh }: {
  player: any;
  injury?: any;
  acwr?: number;
  onRefresh: () => void;
}) {
  async function advanceRtp() {
    const next = Math.min((injury.rtp_phase ?? 0) + 1, 5);
    await supabase.from('injury_record').update({ rtp_phase: next }).eq('id', injury.id);
    onRefresh();
  }

  async function markReturned() {
    await supabase.from('injury_record').update({ resolved_at: new Date().toISOString() }).eq('id', injury.id);
    onRefresh();
  }

  return (
    <Card>
      <CardContent className="p-3 flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm">{player.name}</p>
          {player.position && <p className="text-xs text-muted-foreground">{player.position}</p>}
        </div>
        <div className="flex items-center gap-2 flex-wrap justify-end">
          {injury && (
            <>
              <Badge className="bg-red-500/20 text-red-300 text-xs">
                {injury.body_part} · Phase {injury.rtp_phase ?? 0}
              </Badge>
              <Button
                size="sm" variant="outline" className="h-7 text-xs"
                onClick={advanceRtp}
                disabled={(injury.rtp_phase ?? 0) >= 5}
              >
                &rarr; Phase {Math.min((injury.rtp_phase ?? 0) + 1, 5)}
              </Button>
              {(injury.rtp_phase ?? 0) >= 5 && (
                <Button size="sm" variant="outline" className="h-7 text-xs text-emerald-400" onClick={markReturned}>
                  Mark returned
                </Button>
              )}
            </>
          )}
          {!injury && acwr !== undefined && (
            <Badge className={acwr > 1.5 ? 'bg-red-500/20 text-red-300' : 'bg-amber-500/20 text-amber-300'}>
              ACWR {acwr.toFixed(2)}
            </Badge>
          )}
          {!injury && acwr === undefined && (
            <Badge className="bg-emerald-500/20 text-emerald-300">Available</Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
