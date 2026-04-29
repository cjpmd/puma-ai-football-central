import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { SafeDashboardLayout } from '@/components/layout/SafeDashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { supabase as supabaseClient } from '@/integrations/supabase/client';
const supabase = supabaseClient as any;
import { useAuth } from '@/contexts/AuthContext';
import { useAuthorization } from '@/contexts/AuthorizationContext';
import {
  Building2,
  Users,
  Calendar,
  Trophy,
  ExternalLink,
  CheckCircle2,
  XCircle,
  MinusCircle,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Academy {
  id: string;
  name: string;
  logo_url: string | null;
  fa_registration_number: string | null;
  eppp_category: number | null;
  founded_year: number | null;
  performance_app_url?: string | null;
}

interface YearGroup {
  id: string;
  name: string;
  age_year: number | null;
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
  team_id: string;
}

interface CalEvent {
  id: string;
  title: string | null;
  date: string;
  start_time: string | null;
  location: string | null;
  opponent: string | null;
  type: string;
  is_home: boolean | null;
  scores: { home: number; away: number } | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

type AvailStatus = 'available' | 'unavailable' | 'unknown';

function resolveAvailability(
  summary: Record<string, any> | null,
  fallback: string | null,
): AvailStatus {
  const raw = (summary?.availability_status ?? fallback ?? '').toString().toLowerCase();
  if (raw === 'green' || raw === 'available') return 'available';
  if (raw === 'red' || raw === 'unavailable') return 'unavailable';
  return 'unknown';
}

function AvailabilityBadge({ status }: { status: AvailStatus }) {
  if (status === 'available') {
    return (
      <Badge variant="outline" className="text-xs gap-1 border-green-500/50 text-green-600">
        <CheckCircle2 className="h-3 w-3" />
        Available
      </Badge>
    );
  }
  if (status === 'unavailable') {
    return (
      <Badge variant="outline" className="text-xs gap-1 border-red-500/50 text-red-600">
        <XCircle className="h-3 w-3" />
        Unavailable
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="text-xs gap-1 text-muted-foreground">
      <MinusCircle className="h-3 w-3" />
      Unknown
    </Badge>
  );
}

// ─── Query functions ──────────────────────────────────────────────────────────

async function fetchAcademy(academyId: string): Promise<Academy> {
  const { data, error } = await supabase
    .from('academies')
    .select('id, name, logo_url, fa_registration_number, eppp_category, founded_year, performance_app_url')
    .eq('id', academyId)
    .single();
  if (error) throw error;
  return data as Academy;
}

async function fetchYearGroupsForAcademy(academyId: string): Promise<YearGroup[]> {
  // academy_clubs → club_teams → teams.year_group_id → year_groups
  const { data: acClubs, error: e1 } = await supabase
    .from('academy_clubs')
    .select('club_id')
    .eq('academy_id', academyId);
  if (e1) throw e1;
  const clubIds = (acClubs ?? []).map((r) => r.club_id as string);
  if (clubIds.length === 0) return [];

  const { data: ct, error: e2 } = await supabase
    .from('club_teams')
    .select('team_id')
    .in('club_id', clubIds);
  if (e2) throw e2;
  const teamIds = (ct ?? []).map((r) => r.team_id as string);
  if (teamIds.length === 0) return [];

  const { data: teams, error: e3 } = await supabase
    .from('teams')
    .select('year_group_id')
    .in('id', teamIds)
    .not('year_group_id', 'is', null);
  if (e3) throw e3;
  const ygIds = [...new Set((teams ?? []).map((t) => t.year_group_id as string))];
  if (ygIds.length === 0) return [];

  const { data: ygs, error: e4 } = await supabase
    .from('year_groups')
    .select('id, name, age_year, playing_format')
    .in('id', ygIds)
    .order('name');
  if (e4) throw e4;
  return (ygs ?? []) as YearGroup[];
}

async function fetchAllTeamsForAcademy(academyId: string): Promise<AcademyTeam[]> {
  const { data: acClubs } = await supabase
    .from('academy_clubs')
    .select('club_id')
    .eq('academy_id', academyId);
  const clubIds = (acClubs ?? []).map((r) => r.club_id as string);
  if (clubIds.length === 0) return [];

  const { data: ct } = await supabase
    .from('club_teams')
    .select('team_id')
    .in('club_id', clubIds);
  const teamIds = (ct ?? []).map((r) => r.team_id as string);
  if (teamIds.length === 0) return [];

  const { data: teams } = await supabase
    .from('teams')
    .select('id, year_group_id')
    .in('id', teamIds);
  return (teams ?? []) as AcademyTeam[];
}

async function fetchPlayers(teamIds: string[]): Promise<AcademyPlayer[]> {
  if (teamIds.length === 0) return [];
  const { data, error } = await supabase
    .from('players')
    .select('id, name, position, squad_number, photo_url, availability, performance_summary, team_id')
    .in('team_id', teamIds)
    .order('name');
  if (error) throw error;
  return (data ?? []) as AcademyPlayer[];
}

async function fetchUpcomingEvents(teamIds: string[]): Promise<CalEvent[]> {
  if (teamIds.length === 0) return [];
  const today = new Date().toISOString().split('T')[0];
  const { data, error } = await supabase
    .from('calendar_events')
    .select('id, title, date, start_time, location, opponent, type, is_home, scores')
    .in('team_id', teamIds)
    .in('type', ['fixture', 'friendly', 'tournament', 'festival'])
    .gte('date', today)
    .order('date')
    .limit(25);
  if (error) throw error;
  return (data ?? []) as CalEvent[];
}

async function fetchPastEvents(teamIds: string[]): Promise<CalEvent[]> {
  if (teamIds.length === 0) return [];
  const today = new Date().toISOString().split('T')[0];
  const { data, error } = await supabase
    .from('calendar_events')
    .select('id, title, date, start_time, location, opponent, type, is_home, scores')
    .in('team_id', teamIds)
    .in('type', ['fixture', 'friendly', 'tournament', 'festival'])
    .lt('date', today)
    .order('date', { ascending: false })
    .limit(25);
  if (error) throw error;
  return (data ?? []) as CalEvent[];
}

// ─── Player card ──────────────────────────────────────────────────────────────

function PlayerCard({ player }: { player: AcademyPlayer }) {
  const avStatus = resolveAvailability(player.performance_summary, player.availability);
  const overallRating = player.performance_summary?.overall_rating as number | undefined;

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4 flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center overflow-hidden shrink-0 ring-1 ring-border">
          {player.photo_url ? (
            <img src={player.photo_url} alt={player.name} className="w-full h-full object-cover" />
          ) : (
            <span className="text-sm font-bold text-muted-foreground">
              {player.name.charAt(0).toUpperCase()}
            </span>
          )}
        </div>

        <div className="flex-1 min-w-0 space-y-1">
          <p className="font-medium text-sm truncate">
            {player.squad_number != null && (
              <span className="text-muted-foreground mr-1">#{player.squad_number}</span>
            )}
            {player.name}
          </p>
          {player.position && (
            <p className="text-xs text-muted-foreground">{player.position}</p>
          )}
          <AvailabilityBadge status={avStatus} />
        </div>

        {overallRating != null && (
          <div className="text-right shrink-0">
            <p className="text-lg font-bold text-puma-blue-500 leading-none">
              {Math.round(overallRating)}
            </p>
            <p className="text-xs text-muted-foreground">Rating</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Event row ────────────────────────────────────────────────────────────────

function EventRow({ event, showScore }: { event: CalEvent; showScore?: boolean }) {
  return (
    <Card>
      <CardContent className="p-4 flex items-center gap-4">
        <div className="w-14 text-center shrink-0">
          <p className="text-xs font-semibold">
            {new Date(event.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
          </p>
          {event.start_time && (
            <p className="text-xs text-muted-foreground">{event.start_time.slice(0, 5)}</p>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm truncate">
            {event.title ?? (event.opponent ? `vs ${event.opponent}` : 'Fixture')}
          </p>
          {event.location && (
            <p className="text-xs text-muted-foreground truncate">{event.location}</p>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {showScore && event.scores != null && (
            <span className="text-sm font-bold tabular-nums">
              {event.scores.home}–{event.scores.away}
            </span>
          )}
          <Badge variant="outline" className="capitalize text-xs">
            {event.type}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function AcademyDashboard() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { isGlobalAdmin } = useAuthorization();

  const [selectedYearGroupId, setSelectedYearGroupId] = useState<string>('');

  // Academy record
  const {
    data: academy,
    isLoading: loadingAcademy,
    isError: academyError,
  } = useQuery({
    queryKey: ['academy', id],
    queryFn: () => fetchAcademy(id!),
    enabled: !!id,
  });

  // Year groups reachable from this academy via club hierarchy
  const { data: yearGroups = [], isLoading: loadingYearGroups } = useQuery({
    queryKey: ['academy-year-groups', id],
    queryFn: () => fetchYearGroupsForAcademy(id!),
    enabled: !!id,
  });

  // Set first year group as default once data arrives
  useEffect(() => {
    if (yearGroups.length > 0 && !selectedYearGroupId) {
      setSelectedYearGroupId(yearGroups[0].id);
    }
  }, [yearGroups, selectedYearGroupId]);

  const effectiveYgId = selectedYearGroupId || yearGroups[0]?.id || '';

  // All teams in this academy — fetched once, filtered client-side by year group
  const { data: allTeams = [] } = useQuery({
    queryKey: ['academy-all-teams', id],
    queryFn: () => fetchAllTeamsForAcademy(id!),
    enabled: !!id,
  });

  const teamIds = allTeams
    .filter((t) => !effectiveYgId || t.year_group_id === effectiveYgId)
    .map((t) => t.id);

  // Players
  const { data: players = [], isLoading: loadingPlayers } = useQuery({
    queryKey: ['academy-players', teamIds.join(',')],
    queryFn: () => fetchPlayers(teamIds),
    enabled: teamIds.length > 0,
  });

  // Upcoming fixtures
  const { data: upcomingEvents = [], isLoading: loadingUpcoming } = useQuery({
    queryKey: ['academy-upcoming', teamIds.join(',')],
    queryFn: () => fetchUpcomingEvents(teamIds),
    enabled: teamIds.length > 0,
  });

  // Past results
  const { data: pastEvents = [], isLoading: loadingResults } = useQuery({
    queryKey: ['academy-results', teamIds.join(',')],
    queryFn: () => fetchPastEvents(teamIds),
    enabled: teamIds.length > 0,
  });

  // Current user's role in this academy
  const { data: userAcademyRole } = useQuery({
    queryKey: ['user-academy-role', id, user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await supabase
        .from('user_academies')
        .select('role')
        .eq('academy_id', id!)
        .eq('user_id', user.id)
        .maybeSingle();
      return data?.role ?? null;
    },
    enabled: !!id && !!user?.id,
  });

  const isStaffRole = userAcademyRole === 'academy_admin' || userAcademyRole === 'academy_welfare_officer';
  const showPerformanceLink = isGlobalAdmin || isStaffRole;
  const performanceUrl =
    (academy as any)?.performance_app_url ??
    import.meta.env.VITE_PERFORMANCE_APP_URL ??
    '';

  // ── Loading state ─────────────────────────────────────────────────────────
  if (loadingAcademy) {
    return (
      <SafeDashboardLayout>
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <Skeleton className="w-14 h-14 rounded-xl" />
            <div className="space-y-2">
              <Skeleton className="h-7 w-64" />
              <Skeleton className="h-4 w-40" />
            </div>
          </div>
          <Skeleton className="h-9 w-56" />
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-20" />
            ))}
          </div>
        </div>
      </SafeDashboardLayout>
    );
  }

  // ── Error / not found ─────────────────────────────────────────────────────
  if (academyError || !academy) {
    return (
      <SafeDashboardLayout>
        <div className="text-center py-20">
          <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-lg font-semibold mb-2">Academy not found</h2>
          <p className="text-muted-foreground text-sm">
            You may not have access to this academy, or it no longer exists.
          </p>
        </div>
      </SafeDashboardLayout>
    );
  }

  // ── Page ─────────────────────────────────────────────────────────────────
  return (
    <SafeDashboardLayout>
      <div className="space-y-6">

        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-puma-blue-500/10 flex items-center justify-center shrink-0 ring-1 ring-puma-blue-500/20">
              {academy.logo_url ? (
                <img
                  src={academy.logo_url}
                  alt={academy.name}
                  className="w-12 h-12 object-contain rounded-lg"
                />
              ) : (
                <Building2 className="h-7 w-7 text-puma-blue-500" />
              )}
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">{academy.name}</h1>
              <div className="flex flex-wrap items-center gap-2 mt-1">
                {academy.eppp_category != null && (
                  <Badge variant="secondary" className="text-xs">
                    EPPP Cat {academy.eppp_category}
                  </Badge>
                )}
                {academy.fa_registration_number && (
                  <Badge variant="outline" className="text-xs">
                    FA Reg: {academy.fa_registration_number}
                  </Badge>
                )}
                {academy.founded_year && (
                  <span className="text-xs text-muted-foreground">
                    Est. {academy.founded_year}
                  </span>
                )}
              </div>
            </div>
          </div>

          {showPerformanceLink && performanceUrl && (
            <Button variant="outline" size="sm" asChild className="shrink-0">
              <a href={performanceUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4 mr-2" />
                Open in Origin Sports Performance
              </a>
            </Button>
          )}
        </div>

        {/* Year Group selector */}
        {loadingYearGroups ? (
          <Skeleton className="h-9 w-56" />
        ) : yearGroups.length > 1 ? (
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-muted-foreground whitespace-nowrap">
              Year Group
            </span>
            <Select value={effectiveYgId} onValueChange={setSelectedYearGroupId}>
              <SelectTrigger className="w-60">
                <SelectValue placeholder="Select year group" />
              </SelectTrigger>
              <SelectContent>
                {yearGroups.map((yg) => (
                  <SelectItem key={yg.id} value={yg.id}>
                    {yg.name}
                    {yg.playing_format ? ` · ${yg.playing_format}` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : yearGroups.length === 1 ? (
          <div className="flex items-center gap-2">
            <Badge variant="secondary">{yearGroups[0].name}</Badge>
            {yearGroups[0].playing_format && (
              <span className="text-xs text-muted-foreground">{yearGroups[0].playing_format}</span>
            )}
          </div>
        ) : null}

        {/* Tabbed content */}
        <Tabs defaultValue="squad">
          <TabsList>
            <TabsTrigger value="squad" className="gap-1.5">
              <Users className="h-4 w-4" />
              Squad
              {players.length > 0 && (
                <Badge variant="secondary" className="ml-1 text-xs px-1.5">
                  {players.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="fixtures" className="gap-1.5">
              <Calendar className="h-4 w-4" />
              Fixtures
              {upcomingEvents.length > 0 && (
                <Badge variant="secondary" className="ml-1 text-xs px-1.5">
                  {upcomingEvents.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="results" className="gap-1.5">
              <Trophy className="h-4 w-4" />
              Results
              {pastEvents.length > 0 && (
                <Badge variant="secondary" className="ml-1 text-xs px-1.5">
                  {pastEvents.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          {/* Squad tab */}
          <TabsContent value="squad" className="mt-4">
            {loadingPlayers ? (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: 8 }).map((_, i) => (
                  <Skeleton key={i} className="h-20" />
                ))}
              </div>
            ) : players.length === 0 ? (
              <div className="py-12 text-center">
                <Users className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                <p className="text-muted-foreground text-sm">No players in this year group.</p>
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {players.map((p) => (
                  <PlayerCard key={p.id} player={p} />
                ))}
              </div>
            )}
          </TabsContent>

          {/* Fixtures tab */}
          <TabsContent value="fixtures" className="mt-4">
            {loadingUpcoming ? (
              <div className="space-y-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-16" />
                ))}
              </div>
            ) : upcomingEvents.length === 0 ? (
              <div className="py-12 text-center">
                <Calendar className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                <p className="text-muted-foreground text-sm">No upcoming fixtures.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {upcomingEvents.map((ev) => (
                  <EventRow key={ev.id} event={ev} />
                ))}
              </div>
            )}
          </TabsContent>

          {/* Results tab */}
          <TabsContent value="results" className="mt-4">
            {loadingResults ? (
              <div className="space-y-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-16" />
                ))}
              </div>
            ) : pastEvents.length === 0 ? (
              <div className="py-12 text-center">
                <Trophy className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                <p className="text-muted-foreground text-sm">No results yet.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {pastEvents.map((ev) => (
                  <EventRow key={ev.id} event={ev} showScore />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </SafeDashboardLayout>
  );
}
