import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { SafeDashboardLayout } from '@/components/layout/SafeDashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase as supabaseClient } from '@/integrations/supabase/client';
const supabase = supabaseClient as any;
import {
  ComposedChart, Bar, Line, ReferenceLine,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { User } from 'lucide-react';
import ClipsTab from '@/components/player/ClipsTab';

export default function PlayerProfile() {
  const { id } = useParams<{ id: string }>();

  const { data: player, isLoading } = useQuery({
    queryKey: ['player', id],
    queryFn: async () => {
      const { data } = await supabase.from('players').select('*').eq('id', id).single();
      return data;
    },
    enabled: !!id,
  });

  const eightWeeksAgo = new Date();
  eightWeeksAgo.setDate(eightWeeksAgo.getDate() - 56);

  const { data: loads = [] } = useQuery({
    queryKey: ['training-load', id],
    queryFn: async () => {
      const { data } = await supabase
        .from('training_load')
        .select('session_date, load_au, acwr_at_time')
        .eq('player_id', id)
        .gte('session_date', eightWeeksAgo.toISOString().split('T')[0])
        .order('session_date');
      return data ?? [];
    },
    enabled: !!id,
  });

  const { data: injuries = [] } = useQuery({
    queryKey: ['player-injuries', id],
    queryFn: async () => {
      const { data } = await supabase
        .from('injury_record')
        .select('*')
        .eq('player_id', id)
        .order('injury_date', { ascending: false });
      return data ?? [];
    },
    enabled: !!id,
  });

  if (isLoading) return (
    <SafeDashboardLayout>
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-40 w-full" />
      </div>
    </SafeDashboardLayout>
  );

  if (!player) return (
    <SafeDashboardLayout>
      <div className="text-center py-20">
        <User className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <p className="text-muted-foreground">Player not found.</p>
      </div>
    </SafeDashboardLayout>
  );

  const loadChartData = (loads as any[]).map(l => ({
    date: (l.session_date as string).slice(5),
    load: l.load_au,
    acwr: l.acwr_at_time ?? null,
  }));

  return (
    <SafeDashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center shrink-0 ring-1 ring-border overflow-hidden">
            {player.photo_url ? (
              <img src={player.photo_url} alt={player.name} className="w-full h-full object-cover" />
            ) : (
              <span className="text-lg font-bold text-muted-foreground">{player.name?.charAt(0).toUpperCase()}</span>
            )}
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{player.name}</h1>
            <div className="flex items-center gap-2 mt-1">
              {player.position && <Badge variant="secondary">{player.position}</Badge>}
              {player.squad_number && <span className="text-sm text-muted-foreground">#{player.squad_number}</span>}
            </div>
          </div>
        </div>

        <Tabs defaultValue="overview">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="medical">Medical &amp; Load</TabsTrigger>
            <TabsTrigger value="clips">Clips</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-4">
            <Card>
              <CardContent className="p-6 grid gap-4 sm:grid-cols-2">
                {player.date_of_birth && (
                  <div>
                    <p className="text-xs text-muted-foreground">Date of Birth</p>
                    <p className="font-medium">{new Date(player.date_of_birth).toLocaleDateString('en-GB')}</p>
                  </div>
                )}
                {player.nationality && (
                  <div>
                    <p className="text-xs text-muted-foreground">Nationality</p>
                    <p className="font-medium">{player.nationality}</p>
                  </div>
                )}
                {player.position && (
                  <div>
                    <p className="text-xs text-muted-foreground">Position</p>
                    <p className="font-medium">{player.position}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="medical" className="mt-4 space-y-4">
            <Card>
              <CardHeader><CardTitle className="text-base">Training Load — 8 Weeks</CardTitle></CardHeader>
              <CardContent>
                {loadChartData.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">No load data recorded.</p>
                ) : (
                  <ResponsiveContainer width="100%" height={240}>
                    <ComposedChart data={loadChartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                      <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                      <YAxis yAxisId="left" tick={{ fontSize: 11 }} />
                      <YAxis yAxisId="right" orientation="right" domain={[0, 2.5]} tickCount={6} tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Legend />
                      <Bar yAxisId="left" dataKey="load" name="Load (AU)" fill="#8b5cf6" radius={[3, 3, 0, 0]} />
                      <Line yAxisId="right" type="monotone" dataKey="acwr" name="ACWR" stroke="#f59e0b" strokeWidth={2} dot={false} connectNulls />
                      <ReferenceLine yAxisId="right" y={1.5} stroke="rgba(239,68,68,0.5)" strokeDasharray="4 2" />
                      <ReferenceLine yAxisId="right" y={1.3} stroke="rgba(245,158,11,0.4)" strokeDasharray="4 2" />
                    </ComposedChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base">Injury History</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {(injuries as any[]).length === 0 ? (
                  <p className="text-sm text-muted-foreground">No injury records.</p>
                ) : (
                  (injuries as any[]).map((inj: any) => (
                    <div key={inj.id} className="flex items-center justify-between text-sm border-t border-border/50 pt-2 first:border-0 first:pt-0">
                      <div>
                        <p className="font-medium">{inj.body_part} — {inj.injury_type}</p>
                        <p className="text-xs text-muted-foreground">{inj.injury_date}</p>
                      </div>
                      <div>
                        {inj.resolved_at ? (
                          <Badge className="bg-emerald-500/20 text-emerald-300 text-xs">Resolved</Badge>
                        ) : (
                          <Badge className="bg-red-500/20 text-red-300 text-xs">Active · Phase {inj.rtp_phase ?? 0}</Badge>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="clips" className="mt-4">
            <ClipsTab playerId={id!} />
          </TabsContent>
        </Tabs>
      </div>
    </SafeDashboardLayout>
  );
}
