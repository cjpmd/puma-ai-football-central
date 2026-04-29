import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { MobileLayout } from '@/components/layout/MobileLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useAuthorization } from '@/contexts/AuthorizationContext';
import { toast } from '@/hooks/use-toast';
import {
  Building2,
  ExternalLink,
  CheckCircle2,
  XCircle,
  MinusCircle,
  Calendar,
  Trophy,
} from 'lucide-react';

// ─── Constants ──────────────────────────────────────────────────────────────

const TABS = [
  { id: 'squad',    label: 'Squad'    },
  { id: 'fixtures', label: 'Fixtures' },
  { id: 'results',  label: 'Results'  },
];

// ─── Types ────────────────────────────────────────────────────────────────────

interface Academy {
  id: string;
  name: string;
  logo_url: string | null;
  eppp_category: number | null;
  performance_app_url?: string | null;
}

interface YearGroup {
  id: string;
  name: string;
  playing_format: string | null;
}

interface AcademyTeam {
  id: string;
  year_group_id: string | null;
}

interface AcademyPlayer {
  id: string;
  name: string;
  position: string | null;
  squad_number: number | null;
  photo_url: string | null;
  availability: string | null;
  performance_summary: Record<string, any> | null;
}

interface CalEvent {
  id: string;
  title: string | null;
  date: string;
  start_time: string | null;
  opponent: string | null;
  type: string;
  scores: { home: number; away: number } | null;
}

// ─── Availability badge ────────────────────────────────────────────────────────

function resolveAvailability(
  summary: Record<string, any> | null,
  fallback: string | null,
): 'available' | 'unavailable' | 'unknown' {
  const raw = (summary?.availability_status ?? fallback ?? '').toString().toLowerCase();
  if (raw === 'green' || raw === 'available') return 'available';
  if (raw === 'red'   || raw === 'unavailable') return 'unavailable';
  return 'unknown';
}

function AvailabilityBadge({ status }: { status: 'available' | 'unavailable' | 'unknown' }) {
  if (status === 'available') {
    return (
      <Badge variant="outline" className="text-xs gap-1 border-green-500/50 text-green-400">
        <CheckCircle2 className="h-3 w-3" />Available
      </Badge>
    );
  }
  if (status === 'unavailable') {
    return (
      <Badge variant="outline" className="text-xs gap-1 border-red-500/50 text-red-400">
        <XCircle className="h-3 w-3" />Unavailable
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="text-xs gap-1 text-white/40">
      <MinusCircle className="h-3 w-3" />Unknown
    </Badge>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

const AcademyDashboardMobile = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { isGlobalAdmin } = useAuthorization();

  const [activeTab, setActiveTab] = useState('squad');
  const [selectedYgId, setSelectedYgId] = useState('');

  const [academy,        setAcademy]        = useState<Academy | null>(null);
  const [yearGroups,     setYearGroups]     = useState<YearGroup[]>([]);
  const [allTeams,       setAllTeams]       = useState<AcademyTeam[]>([]);
  const [players,        setPlayers]        = useState<AcademyPlayer[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<CalEvent[]>([]);
  const [pastEvents,     setPastEvents]     = useState<CalEvent[]>([]);
  const [userRole,       setUserRole]       = useState<string | null>(null);
  const [loading,        setLoading]        = useState(true);
  const [loadingSquad,   setLoadingSquad]   = useState(false);

  // ── Load academy meta + year groups + all teams on mount ──────────────
  useEffect(() => {
    if (!id) return;
    loadAcademyMeta();
  }, [id]);

  const loadAcademyMeta = async () => {
    try {
      setLoading(true);

      // Academy record
      const { data: ac, error: acErr } = await supabase
        .from('academies')
        .select('id, name, logo_url, eppp_category, performance_app_url')
        .eq('id', id!)
        .single();
      if (acErr) throw acErr;
      setAcademy(ac as Academy);

      // Club IDs for this academy
      const { data: acClubs } = await supabase
        .from('academy_clubs')
        .select('club_id')
        .eq('academy_id', id!);
      const clubIds = (acClubs ?? []).map((r) => r.club_id as string);

      if (clubIds.length > 0) {
        // Team IDs via club_teams
        const { data: ct } = await supabase
          .from('club_teams')
          .select('team_id')
          .in('club_id', clubIds);
        const teamIds = (ct ?? []).map((r) => r.team_id as string);

        if (teamIds.length > 0) {
          // Year groups
          const { data: teamsData } = await supabase
            .from('teams')
            .select('id, year_group_id')
            .in('id', teamIds);
          setAllTeams((teamsData ?? []) as AcademyTeam[]);

          const ygIds = [
            ...new Set(
              (teamsData ?? [])
                .map((t) => t.year_group_id as string)
                .filter(Boolean),
            ),
          ];

          if (ygIds.length > 0) {
            const { data: ygs } = await supabase
              .from('year_groups')
              .select('id, name, playing_format')
              .in('id', ygIds)
              .order('name');
            const groups = (ygs ?? []) as YearGroup[];
            setYearGroups(groups);
            if (groups.length > 0) setSelectedYgId(groups[0].id);
          }
        }
      }

      // User's academy role
      if (user?.id) {
        const { data: ua } = await supabase
          .from('user_academies')
          .select('role')
          .eq('academy_id', id!)
          .eq('user_id', user.id)
          .maybeSingle();
        setUserRole(ua?.role ?? null);
      }
    } catch {
      toast({ title: 'Error loading academy', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  // ── Team IDs for the selected year group ──────────────────────
  const teamIds = allTeams
    .filter((t) => !selectedYgId || t.year_group_id === selectedYgId)
    .map((t) => t.id);

  // ── Load squad + events when teamIds changes ───────────────────
  const loadSquadAndEvents = useCallback(async () => {
    if (teamIds.length === 0) {
      setPlayers([]);
      setUpcomingEvents([]);
      setPastEvents([]);
      return;
    }
    setLoadingSquad(true);
    const today = new Date().toISOString().split('T')[0];
    try {
      const [{ data: ps }, { data: upcoming }, { data: past }] = await Promise.all([
        supabase
          .from('players')
          .select('id, name, position, squad_number, photo_url, availability, performance_summary')
          .in('team_id', teamIds)
          .order('name'),
        supabase
          .from('calendar_events')
          .select('id, title, date, start_time, opponent, type, scores')
          .in('team_id', teamIds)
          .in('type', ['fixture', 'friendly', 'tournament', 'festival'])
          .gte('date', today)
          .order('date')
          .limit(20),
        supabase
          .from('calendar_events')
          .select('id, title, date, start_time, opponent, type, scores')
          .in('team_id', teamIds)
          .in('type', ['fixture', 'friendly', 'tournament', 'festival'])
          .lt('date', today)
          .order('date', { ascending: false })
          .limit(20),
      ]);
      setPlayers((ps ?? []) as AcademyPlayer[]);
      setUpcomingEvents((upcoming ?? []) as CalEvent[]);
      setPastEvents((past ?? []) as CalEvent[]);
    } catch {
      toast({ title: 'Error loading squad data', variant: 'destructive' });
    } finally {
      setLoadingSquad(false);
    }
  }, [teamIds.join(',')]);

  useEffect(() => {
    if (!loading) loadSquadAndEvents();
  }, [loading, loadSquadAndEvents]);

  // ── Derived ────────────────────────────────────────────────────────────
  const isStaffRole = userRole === 'academy_admin' || userRole === 'academy_welfare_officer';
  const showPerformanceLink = isGlobalAdmin || isStaffRole;
  const performanceUrl =
    (academy as any)?.performance_app_url ??
    import.meta.env.VITE_PERFORMANCE_APP_URL ??
    '';

  // ── Loading state ─────────────────────────────────────────────────────
  if (loading) {
    return (
      <MobileLayout>
        <div className="flex items-center justify-center h-48">
          <div className="text-white/60 text-sm">Loading academy…</div>
        </div>
      </MobileLayout>
    );
  }

  if (!academy) {
    return (
      <MobileLayout>
        <div className="text-center py-12">
          <Building2 className="h-10 w-10 mx-auto text-white/30 mb-3" />
          <p className="text-white/60 text-sm">Academy not found.</p>
        </div>
      </MobileLayout>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <MobileLayout
      headerTitle={academy.name}
      showTabs
      tabs={TABS}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      stickyTabs
    >
      <div className="space-y-4">

        {/* Academy meta strip */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
              {academy.logo_url ? (
                <img src={academy.logo_url} alt={academy.name} className="w-8 h-8 object-contain rounded" />
              ) : (
                <Building2 className="h-5 w-5 text-white/60" />
              )}
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-sm text-white truncate">{academy.name}</p>
              {academy.eppp_category != null && (
                <p className="text-xs text-white/60">EPPP Cat {academy.eppp_category}</p>
              )}
            </div>
          </div>
          {showPerformanceLink && performanceUrl && (
            <Button variant="outline" size="sm" className="shrink-0 text-xs h-8 border-white/20 text-white/80" asChild>
              <a href={performanceUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-3 w-3 mr-1" />
                Performance
              </a>
            </Button>
          )}
        </div>

        {/* Year group selector */}
        {yearGroups.length > 1 && (
          <Select value={selectedYgId} onValueChange={setSelectedYgId}>
            <SelectTrigger className="border-white/20 bg-white/5 text-white">
              <SelectValue placeholder="Select year group" />
            </SelectTrigger>
            <SelectContent>
              {yearGroups.map((yg) => (
                <SelectItem key={yg.id} value={yg.id}>
                  {yg.name}{yg.playing_format ? ` · ${yg.playing_format}` : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        {yearGroups.length === 1 && (
          <Badge variant="outline" className="border-white/20 text-white/70">
            {yearGroups[0].name}
          </Badge>
        )}

        {/* Squad tab */}
        {activeTab === 'squad' && (
          <div className="space-y-2">
            {loadingSquad ? (
              <p className="text-white/40 text-sm text-center py-6">Loading squad…</p>
            ) : players.length === 0 ? (
              <p className="text-white/40 text-sm text-center py-6">No players in this year group.</p>
            ) : (
              players.map((player) => {
                const avStatus = resolveAvailability(player.performance_summary, player.availability);
                const overallRating = player.performance_summary?.overall_rating as number | undefined;
                return (
                  <Card key={player.id} className="bg-white/5 border-white/10">
                    <CardContent className="p-3 flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center overflow-hidden shrink-0">
                        {player.photo_url ? (
                          <img src={player.photo_url} alt={player.name} className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-sm font-bold text-white/60">
                            {player.name.charAt(0).toUpperCase()}
                          </span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0 space-y-0.5">
                        <p className="text-sm font-medium text-white truncate">
                          {player.squad_number != null && (
                            <span className="text-white/50 mr-1">#{player.squad_number}</span>
                          )}
                          {player.name}
                        </p>
                        {player.position && (
                          <p className="text-xs text-white/50">{player.position}</p>
                        )}
                        <AvailabilityBadge status={avStatus} />
                      </div>
                      {overallRating != null && (
                        <div className="text-right shrink-0">
                          <p className="text-base font-bold text-purple-300 leading-none">
                            {Math.round(overallRating)}
                          </p>
                          <p className="text-xs text-white/40">Rating</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        )}

        {/* Fixtures tab */}
        {activeTab === 'fixtures' && (
          <div className="space-y-2">
            {loadingSquad ? (
              <p className="text-white/40 text-sm text-center py-6">Loading fixtures…</p>
            ) : upcomingEvents.length === 0 ? (
              <div className="py-10 text-center">
                <Calendar className="h-8 w-8 mx-auto text-white/20 mb-2" />
                <p className="text-white/40 text-sm">No upcoming fixtures.</p>
              </div>
            ) : (
              upcomingEvents.map((ev) => (
                <Card key={ev.id} className="bg-white/5 border-white/10">
                  <CardContent className="p-3 flex items-center gap-3">
                    <div className="w-12 text-center shrink-0">
                      <p className="text-xs font-semibold text-white">
                        {new Date(ev.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                      </p>
                      {ev.start_time && (
                        <p className="text-xs text-white/50">{ev.start_time.slice(0, 5)}</p>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">
                        {ev.title ?? (ev.opponent ? `vs ${ev.opponent}` : 'Fixture')}
                      </p>
                    </div>
                    <Badge variant="outline" className="capitalize text-xs border-white/20 text-white/60 shrink-0">
                      {ev.type}
                    </Badge>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        )}

        {/* Results tab */}
        {activeTab === 'results' && (
          <div className="space-y-2">
            {loadingSquad ? (
              <p className="text-white/40 text-sm text-center py-6">Loading results…</p>
            ) : pastEvents.length === 0 ? (
              <div className="py-10 text-center">
                <Trophy className="h-8 w-8 mx-auto text-white/20 mb-2" />
                <p className="text-white/40 text-sm">No results yet.</p>
              </div>
            ) : (
              pastEvents.map((ev) => (
                <Card key={ev.id} className="bg-white/5 border-white/10">
                  <CardContent className="p-3 flex items-center gap-3">
                    <div className="w-12 text-center shrink-0">
                      <p className="text-xs font-semibold text-white">
                        {new Date(ev.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                      </p>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">
                        {ev.title ?? (ev.opponent ? `vs ${ev.opponent}` : 'Fixture')}
                      </p>
                    </div>
                    {ev.scores != null ? (
                      <span className="text-sm font-bold text-white tabular-nums shrink-0">
                        {ev.scores.home}–{ev.scores.away}
                      </span>
                    ) : (
                      <Badge variant="outline" className="capitalize text-xs border-white/20 text-white/60 shrink-0">
                        {ev.type}
                      </Badge>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        )}

      </div>
    </MobileLayout>
  );
};

export default AcademyDashboardMobile;
