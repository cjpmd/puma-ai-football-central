import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { SafeDashboardLayout } from '@/components/layout/SafeDashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase as supabaseClient } from '@/integrations/supabase/client';
const supabase = supabaseClient as any;
import FitnessTestModal from '@/components/fitness/FitnessTestModal';

export interface Benchmark {
  id: string;
  test_name: string;
  bio_age: number;
  p10: number;
  p25: number;
  p50: number;
  p75: number;
  p90: number;
}

export function isLowerBetter(testName: string) {
  return /sprint|agility|speed|time/i.test(testName);
}

export function interpolatePercentile(value: number, bm: Benchmark, testName: string): number {
  const lib = isLowerBetter(testName);
  const pts: [number, number][] = lib
    ? [[bm.p10, 90], [bm.p25, 75], [bm.p50, 50], [bm.p75, 25], [bm.p90, 10]]
    : [[bm.p10, 10], [bm.p25, 25], [bm.p50, 50], [bm.p75, 75], [bm.p90, 90]];
  if (value <= pts[0][0]) return pts[0][1];
  if (value >= pts[pts.length - 1][0]) return pts[pts.length - 1][1];
  for (let i = 0; i < pts.length - 1; i++) {
    const [v0, p0] = pts[i];
    const [v1, p1] = pts[i + 1];
    if (value >= v0 && value <= v1) return p0 + ((value - v0) / (v1 - v0)) * (p1 - p0);
  }
  return 50;
}

function cellClass(p: number) {
  if (p < 25) return 'bg-red-500/20 text-red-300';
  if (p < 50) return 'text-amber-300';
  return 'text-emerald-300';
}

export default function FitnessTesting() {
  const qc = useQueryClient();
  const [showModal, setShowModal] = useState(false);

  const { data: players = [] } = useQuery({
    queryKey: ['players-fitness'],
    queryFn: async () => {
      const { data } = await supabase.from('players').select('id, name, position, squad_number');
      return data ?? [];
    },
  });

  const { data: maturation = [] } = useQuery({
    queryKey: ['maturation-records'],
    queryFn: async () => {
      const { data } = await supabase
        .from('maturation_record')
        .select('player_id, bio_age_estimate, recorded_date')
        .order('recorded_date', { ascending: false });
      return data ?? [];
    },
  });

  const { data: benchmarks = [] } = useQuery({
    queryKey: ['fitness-benchmarks'],
    queryFn: async () => {
      const { data } = await supabase.from('fitness_benchmark').select('*');
      return (data ?? []) as Benchmark[];
    },
  });

  const { data: results = [] } = useQuery({
    queryKey: ['fitness-results'],
    queryFn: async () => {
      const { data } = await supabase
        .from('fitness_test_result')
        .select('*')
        .order('test_date', { ascending: false });
      return data ?? [];
    },
  });

  const bioAgeMap = new Map<string, number>();
  for (const m of maturation as any[]) {
    if (!bioAgeMap.has(m.player_id)) bioAgeMap.set(m.player_id, m.bio_age_estimate);
  }

  const resultMap = new Map<string, Map<string, any>>();
  for (const r of results as any[]) {
    if (!resultMap.has(r.player_id)) resultMap.set(r.player_id, new Map());
    const pm = resultMap.get(r.player_id)!;
    if (!pm.has(r.test_name)) pm.set(r.test_name, r);
  }

  const testNames = [...new Set((results as any[]).map((r: any) => r.test_name))];

  function getBenchmark(testName: string, bioAge: number): Benchmark | null {
    const bms = (benchmarks as Benchmark[]).filter(b => b.test_name === testName);
    if (bms.length === 0) return null;
    return bms.reduce((closest, b) =>
      Math.abs(b.bio_age - bioAge) < Math.abs(closest.bio_age - bioAge) ? b : closest
    );
  }

  return (
    <SafeDashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold tracking-tight">Fitness Testing</h1>
          <Button onClick={() => setShowModal(true)}>Add Result</Button>
        </div>

        {testNames.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
              No results yet. Add the first fitness test result.
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader><CardTitle className="text-base">Squad Results</CardTitle></CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-muted-foreground">
                    <th className="pb-2 pr-4 font-medium">Player</th>
                    {testNames.map(t => (
                      <th key={t} className="pb-2 pr-4 font-medium whitespace-nowrap">{t}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(players as any[]).map(player => {
                    const bioAge = bioAgeMap.get(player.id);
                    const pm = resultMap.get(player.id);
                    return (
                      <tr key={player.id} className="border-t border-border/50">
                        <td className="py-2 pr-4 font-medium whitespace-nowrap">{player.name}</td>
                        {testNames.map(testName => {
                          const result = pm?.get(testName);
                          if (!result) return <td key={testName} className="py-2 pr-4 text-muted-foreground">—</td>;
                          const bm = bioAge ? getBenchmark(testName, bioAge) : null;
                          const pct = bm ? Math.round(interpolatePercentile(result.value, bm, testName)) : null;
                          return (
                            <td key={testName} className={`py-2 pr-4 ${pct !== null ? cellClass(pct) : ''}`}>
                              {result.value}
                              {pct !== null && <span className="text-xs ml-1 opacity-70">(P{pct})</span>}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </CardContent>
          </Card>
        )}
      </div>

      {showModal && (
        <FitnessTestModal
          players={players as any[]}
          benchmarks={benchmarks as Benchmark[]}
          bioAgeMap={bioAgeMap}
          onClose={() => setShowModal(false)}
          onSaved={() => {
            setShowModal(false);
            qc.invalidateQueries({ queryKey: ['fitness-results'] });
          }}
        />
      )}
    </SafeDashboardLayout>
  );
}
