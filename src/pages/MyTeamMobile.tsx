import { MobileLayout } from '@/components/layout/MobileLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  TrendingUp, Users, Trophy, Target, Calendar, BarChart3,
  Shield, AlertTriangle, Layers, ChevronLeft, ChevronRight, Info,
  ChevronDown, Star, Activity,
} from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { format } from 'date-fns';
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useTeamContext } from '@/contexts/TeamContext';
import { useToast } from '@/hooks/use-toast';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { useSeasonContext, Season } from '@/hooks/useSeasonContext';

interface MatchResult {
  eventId: string;
  date: string;
  opponent: string | null;
  eventType: string;
  categoryName: string;
  ourScore: number;
  opponentScore: number;
}

interface CategoryStats {
  categoryId: string | null;
  categoryName: string;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  totalGames: number;
}

interface AttendanceByType {
  eventType: string;
  count: number;
  percent: number;
}

interface GameDayStat {
  eventType: string;
  count: number;
}

interface AnalyticsData {
  totalWins: number;
  totalDraws: number;
  totalLosses: number;
  totalGames: number;
  winRate: number;
  goalsScored: number;
  goalsConceded: number;
  goalDifference: number;
  avgGoalsPerGame: number;
  recentResults: any[];
  topPerformers: any[];
  totalGoals: number;
  totalAssists: number;
  totalSaves: number;
  yellowCards: number;
  redCards: number;
  topScorers: any[];
  topAssisters: any[];
  categoryStats: CategoryStats[];
  matchResults: MatchResult[];
  trainingCount: number;
  availableEventTypes: string[];
  totalAppearances: number;
  attendanceByType: AttendanceByType[];
  captainAppearances: number;
  gameDayStats: GameDayStat[];
}

const EMPTY_ANALYTICS: AnalyticsData = {
  totalWins: 0, totalDraws: 0, totalLosses: 0, totalGames: 0,
  winRate: 0, goalsScored: 0, goalsConceded: 0, goalDifference: 0,
  avgGoalsPerGame: 0, recentResults: [], topPerformers: [],
  totalGoals: 0, totalAssists: 0, totalSaves: 0,
  yellowCards: 0, redCards: 0, topScorers: [], topAssisters: [], categoryStats: [],
  matchResults: [], trainingCount: 0, availableEventTypes: [],
  totalAppearances: 0, attendanceByType: [], captainAppearances: 0, gameDayStats: [],
};

const EVENT_TYPE_LABELS: Record<string, string> = {
  fixture: 'Fixtures',
  friendly: 'Friendlies',
  tournament: 'Tournaments',
  festival: 'Festivals',
  match: 'Matches',
  cup: 'Cups',
  training: 'Training',
};

const humaniseType = (t: string) =>
  t.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

const GAME_DAY_META: Record<string, { label: string; icon: JSX.Element }> = {
  goal: { label: 'Goals', icon: <Target className="h-6 w-6 text-[#b89fff]" /> },
  assist: { label: 'Assists', icon: <Target className="h-6 w-6 text-teal-400" /> },
  save: { label: 'Saves', icon: <Shield className="h-6 w-6 text-[#b89fff]" /> },
  yellow_card: { label: 'Yellow Cards', icon: <AlertTriangle className="h-6 w-6 text-amber-400" /> },
  red_card: { label: 'Red Cards', icon: <AlertTriangle className="h-6 w-6 text-red-400" /> },
};

export default function MyTeamMobile() {
  const { currentTeam, isLoading: teamLoading } = useTeamContext();
  const { toast } = useToast();
  const [analytics, setAnalytics] = useState<AnalyticsData>(EMPTY_ANALYTICS);
  const [loading, setLoading] = useState(false);
  const [showSeasonList, setShowSeasonList] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedEventType, setSelectedEventType] = useState<string>('all');
  const [teamCategories, setTeamCategories] = useState<string[]>([]);
  const [attendanceOpen, setAttendanceOpen] = useState(false);
  const [gameDayOpen, setGameDayOpen] = useState(false);

  const {
    allSeasons,
    seasonState,
    selectedSeason,
    setSelectedSeason,
    nextSeasonStart,
  } = useSeasonContext(currentTeam?.seasonStart, currentTeam?.seasonEnd);

  // Season navigator helpers
  const selectedIndex = allSeasons.findIndex(s => s.label === selectedSeason?.label);
  const canGoPrev = selectedIndex > 0;
  const canGoNext = selectedIndex < allSeasons.length - 1;

  const loadAnalyticsData = useCallback(async () => {
    if (!currentTeam || !selectedSeason) return;
    setLoading(true);

    try {
      const { data: events } = await supabase
        .from('events')
        .select('*')
        .eq('team_id', currentTeam.id)
        .lt('date', new Date().toISOString().split('T')[0])
        .gte('date', selectedSeason.start)
        .lte('date', selectedSeason.end)
        .order('date', { ascending: false });

      if (!events) { setLoading(false); return; }

      const matchEvents = events.filter(e => e.scores !== null);
      const trainingCount = events.filter(e => e.event_type === 'training').length;
      const availableEventTypes = [...new Set(events.map(e => e.event_type as string))];
      const eventIds = matchEvents.map(e => e.id);
      const { data: eventSelections } = await supabase
        .from('event_selections')
        .select('event_id, team_number, performance_category_id, performance_categories(id, name)')
        .in('event_id', eventIds.length > 0 ? eventIds : ['00000000-0000-0000-0000-000000000000']);

      const eventCategoryMap = new Map<string, { categoryId: string | null; categoryName: string; teamNumber: number }[]>();
      eventSelections?.forEach(sel => {
        const existing = eventCategoryMap.get(sel.event_id) || [];
        const cat = sel.performance_categories as any;
        existing.push({
          categoryId: sel.performance_category_id,
          categoryName: cat?.name || 'Team ' + sel.team_number,
          teamNumber: sel.team_number || 1,
        });
        eventCategoryMap.set(sel.event_id, existing);
      });

      // Load this team's configured performance categories so we can map
      // team_N score keys (team_1, team_2…) to the correct category name
      // when an event_selections row is missing for that team number.
      const { data: teamCatsData } = await supabase
        .from('performance_categories')
        .select('id, name')
        .eq('team_id', currentTeam.id)
        .order('name');
      const orderedTeamCats = (teamCatsData ?? []) as { id: string; name: string }[];

      let wins = 0, draws = 0, losses = 0, goalsFor = 0, goalsAgainst = 0;
      const categoryStatsMap = new Map<string, CategoryStats>();
      const matchResults: MatchResult[] = [];

      matchEvents.forEach(event => {
        const scores = event.scores as any;
        if (!scores) return;
        const fromSelections = eventCategoryMap.get(event.id) || [];

        // Discover every team_N present in scores (team_1, team_2, …).
        const teamNumbersInScores = new Set<number>();
        Object.keys(scores).forEach(k => {
          const m = /^team_(\d+)$/.exec(k);
          if (m) teamNumbersInScores.add(parseInt(m[1], 10));
        });

        // Synthesize category entries for team numbers that have a score
        // but no matching event_selections row. Map by ordinal to the
        // team's configured performance categories.
        const haveTeamNumbers = new Set(fromSelections.map(c => c.teamNumber));
        const synthesized: { categoryId: string | null; categoryName: string; teamNumber: number }[] = [];
        teamNumbersInScores.forEach(n => {
          if (haveTeamNumbers.has(n)) return;
          const cat = orderedTeamCats[n - 1];
          synthesized.push({
            categoryId: cat?.id ?? null,
            categoryName: cat?.name ?? `Team ${n}`,
            teamNumber: n,
          });
        });

        const combined = [...fromSelections, ...synthesized];
        const categories = combined.length > 0
          ? combined
          : [{ categoryId: null, categoryName: 'Default', teamNumber: 1 }];
        const processedTeamNumbers = new Set<number>();
        categories.forEach(cat => {
          if (processedTeamNumbers.has(cat.teamNumber)) return;
          processedTeamNumbers.add(cat.teamNumber);
          let ourScore = 0, opponentScore = 0;
          const teamKey = `team_${cat.teamNumber}`;
          const opponentKey = `opponent_${cat.teamNumber}`;
          if (scores[teamKey] !== undefined && scores[opponentKey] !== undefined) {
            ourScore = parseInt(String(scores[teamKey]), 10) || 0;
            opponentScore = parseInt(String(scores[opponentKey]), 10) || 0;
          } else if (cat.teamNumber === 1 && scores.home !== undefined && scores.away !== undefined) {
            ourScore = parseInt(String(event.is_home ? scores.home : scores.away), 10) || 0;
            opponentScore = parseInt(String(event.is_home ? scores.away : scores.home), 10) || 0;
          }
          matchResults.push({
            eventId: event.id,
            date: event.date,
            opponent: event.opponent,
            eventType: event.event_type,
            categoryName: cat.categoryName,
            ourScore,
            opponentScore,
          });
          goalsFor += ourScore;
          goalsAgainst += opponentScore;
          if (ourScore > opponentScore) wins++;
          else if (ourScore < opponentScore) losses++;
          else draws++;
          const catKey = cat.categoryId || cat.categoryName;
          if (!categoryStatsMap.has(catKey)) {
            categoryStatsMap.set(catKey, { categoryId: cat.categoryId, categoryName: cat.categoryName, wins: 0, draws: 0, losses: 0, goalsFor: 0, goalsAgainst: 0, totalGames: 0 });
          }
          const catStats = categoryStatsMap.get(catKey)!;
          catStats.goalsFor += ourScore; catStats.goalsAgainst += opponentScore; catStats.totalGames++;
          if (ourScore > opponentScore) catStats.wins++;
          else if (ourScore < opponentScore) catStats.losses++;
          else catStats.draws++;
        });
      });

      const totalGames = wins + draws + losses;
      const winRate = totalGames > 0 ? Math.round((wins / totalGames) * 100) : 0;

      const safeEventIds = eventIds.length > 0 ? eventIds : ['00000000-0000-0000-0000-000000000000'];

      // Appearances and minutes — season-scoped by event_id
      const { data: playerStats } = await supabase
        .from('event_player_stats')
        .select('event_id, player_id, is_captain, position, players!inner(name), minutes_played')
        .in('event_id', safeEventIds)
        .eq('players.team_id', currentTeam.id)
        .gt('minutes_played', 0);

      // Confirmed availability ('available') — counts as attendance even if not selected
      const { data: confirmedAvail } = await supabase
        .from('event_availability')
        .select('event_id, player_id, players!inner(team_id)')
        .in('event_id', safeEventIds)
        .eq('role', 'player')
        .eq('status', 'available')
        .eq('players.team_id', currentTeam.id);

      // Goals, assists, saves, cards — from match_events, season-scoped
      const { data: matchEvData } = await supabase
        .from('match_events')
        .select('player_id, event_type, players!inner(name, team_id)')
        .in('event_id', safeEventIds)
        .eq('players.team_id', currentTeam.id);

      type PlayerStat = { name: string; goals: number; assists: number; saves: number; yellowCards: number; redCards: number; appearances: number; totalMinutes: number; minutesByPosition: Record<string, number> };
      const playerMap = new Map<string, PlayerStat>();
      const ensurePlayer = (pid: string, name: string) => {
        if (!playerMap.has(pid)) playerMap.set(pid, { name, goals: 0, assists: 0, saves: 0, yellowCards: 0, redCards: 0, appearances: 0, totalMinutes: 0, minutesByPosition: {} });
        return playerMap.get(pid)!;
      };

      // Game Day stats: dynamic group by event_type from match_events
      const gameDayMap = new Map<string, number>();
      matchEvData?.forEach(ev => {
        const p = ensurePlayer(ev.player_id, (ev.players as any).name);
        if (ev.event_type === 'goal') p.goals++;
        else if (ev.event_type === 'assist') p.assists++;
        else if (ev.event_type === 'save') p.saves++;
        else if (ev.event_type === 'yellow_card') p.yellowCards++;
        else if (ev.event_type === 'red_card') p.redCards++;
        gameDayMap.set(ev.event_type, (gameDayMap.get(ev.event_type) || 0) + 1);
      });

      // Per-player aggregation: minutes & captain count from event_player_stats
      const eventTypeById = new Map<string, string>();
      events.forEach(e => eventTypeById.set(e.id, e.event_type as string));

      // Track unique (event_id, player_id) attendance keys
      const attendedKeys = new Set<string>();
      const playerAppearedEvents = new Map<string, Set<string>>(); // pid -> Set<event_id>
      let captainAppearances = 0;

      playerStats?.forEach(stat => {
        const p = ensurePlayer(stat.player_id, (stat.players as any).name);
        const mins = stat.minutes_played || 0;
        p.totalMinutes += mins;
        if (stat.position) {
          p.minutesByPosition[stat.position] = (p.minutesByPosition[stat.position] || 0) + mins;
        }
        if (stat.is_captain) captainAppearances++;
        attendedKeys.add(`${stat.event_id}:${stat.player_id}`);
        if (!playerAppearedEvents.has(stat.player_id)) playerAppearedEvents.set(stat.player_id, new Set());
        playerAppearedEvents.get(stat.player_id)!.add(stat.event_id);
      });

      // Add confirmed-available rows (overrides selection-only attendance)
      confirmedAvail?.forEach(a => {
        if (!a.player_id) return;
        attendedKeys.add(`${a.event_id}:${a.player_id}`);
        if (!playerAppearedEvents.has(a.player_id)) playerAppearedEvents.set(a.player_id, new Set());
        playerAppearedEvents.get(a.player_id)!.add(a.event_id);
      });

      // Bucket attendance by event type
      const attendanceMap = new Map<string, number>();
      let totalAppearances = 0;
      attendedKeys.forEach(key => {
        const [eid] = key.split(':');
        const et = eventTypeById.get(eid) || 'unknown';
        attendanceMap.set(et, (attendanceMap.get(et) || 0) + 1);
        totalAppearances++;
      });

      // Sync per-player appearance count from unique events
      playerAppearedEvents.forEach((evSet, pid) => {
        const p = playerMap.get(pid);
        if (p) p.appearances = evSet.size;
      });

      const attendanceByType: AttendanceByType[] = Array.from(attendanceMap.entries())
        .map(([eventType, count]) => ({
          eventType,
          count,
          percent: totalAppearances > 0 ? Math.round((count / totalAppearances) * 100) : 0,
        }))
        .sort((a, b) => b.count - a.count);

      const gameDayStats: GameDayStat[] = Array.from(gameDayMap.entries())
        .map(([eventType, count]) => ({ eventType, count }))
        .sort((a, b) => b.count - a.count);

      const allPlayerStats = Array.from(playerMap.values());

      setAnalytics({
        totalWins: wins, totalDraws: draws, totalLosses: losses, totalGames,
        winRate,
        goalsScored: goalsFor, goalsConceded: goalsAgainst,
        goalDifference: goalsFor - goalsAgainst,
        avgGoalsPerGame: totalGames > 0 ? Math.round((goalsFor / totalGames) * 10) / 10 : 0,
        recentResults: matchEvents.slice(0, 5),
        topPerformers: allPlayerStats.filter(p => p.appearances > 0).sort((a, b) => b.appearances - a.appearances).slice(0, 3),
        totalGoals: allPlayerStats.reduce((s, p) => s + p.goals, 0),
        totalAssists: allPlayerStats.reduce((s, p) => s + p.assists, 0),
        totalSaves: allPlayerStats.reduce((s, p) => s + p.saves, 0),
        yellowCards: allPlayerStats.reduce((s, p) => s + p.yellowCards, 0),
        redCards: allPlayerStats.reduce((s, p) => s + p.redCards, 0),
        topScorers: allPlayerStats.filter(p => p.goals > 0).sort((a, b) => b.goals - a.goals).slice(0, 3),
        topAssisters: allPlayerStats.filter(p => p.assists > 0).sort((a, b) => b.assists - a.assists).slice(0, 3),
        categoryStats: Array.from(categoryStatsMap.values()).filter(c => c.totalGames > 0).sort((a, b) => b.totalGames - a.totalGames),
        matchResults,
        trainingCount,
        availableEventTypes,
        totalAppearances,
        attendanceByType,
        captainAppearances,
        gameDayStats,
      });
    } catch {
      toast({ title: 'Error', description: 'Failed to load analytics data', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [currentTeam?.id, selectedSeason?.start, selectedSeason?.end]);

  useEffect(() => {
    if (currentTeam && selectedSeason) {
      loadAnalyticsData();
    }
  }, [loadAnalyticsData]);

  // Load configured performance categories for the current team so the
  // filter chips appear regardless of how many matches have been played.
  useEffect(() => {
    if (!currentTeam?.id) {
      setTeamCategories([]);
      return;
    }
    setSelectedCategory('all');
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from('performance_categories')
        .select('name')
        .eq('team_id', currentTeam.id)
        .order('name');
      if (!cancelled) {
        setTeamCategories((data ?? []).map(r => r.name as string));
      }
    })();
    return () => { cancelled = true; };
  }, [currentTeam?.id]);

  const getResultBadge = (event: any, teamNumber = 1) => {
    const scores = event.scores as any;
    if (!scores) return null;
    let ourScore = 0, opponentScore = 0;
    const tk = `team_${teamNumber}`, ok = `opponent_${teamNumber}`;
    if (scores[tk] !== undefined && scores[ok] !== undefined) {
      ourScore = parseInt(String(scores[tk]), 10) || 0;
      opponentScore = parseInt(String(scores[ok]), 10) || 0;
    } else if (scores.home !== undefined && scores.away !== undefined) {
      ourScore = parseInt(String(event.is_home ? scores.home : scores.away), 10) || 0;
      opponentScore = parseInt(String(event.is_home ? scores.away : scores.home), 10) || 0;
    }
    if (ourScore > opponentScore) return { text: 'Win', color: 'bg-green-500', ourScore, opponentScore };
    if (ourScore < opponentScore) return { text: 'Loss', color: 'bg-destructive', ourScore, opponentScore };
    return { text: 'Draw', color: 'bg-muted-foreground', ourScore, opponentScore };
  };

  if (teamLoading) {
    return (
      <MobileLayout>
        <div className="flex items-center justify-center h-64">
          <LoadingSpinner size="lg" />
        </div>
      </MobileLayout>
    );
  }

  if (!currentTeam) {
    return (
      <MobileLayout>
        <div className="flex items-center justify-center h-64 text-white/60">
          No team selected
        </div>
      </MobileLayout>
    );
  }

  const categoryKeys = teamCategories;
  const isTrainingMode = selectedEventType === 'training';

  const displayStats = (() => {
    const needsFilter = selectedCategory !== 'all' || (selectedEventType !== 'all' && !isTrainingMode);
    if (!needsFilter) return analytics;

    const filtered = analytics.matchResults.filter(r =>
      (selectedCategory === 'all' || r.categoryName === selectedCategory) &&
      (selectedEventType === 'all' || r.eventType === selectedEventType)
    );

    let wins = 0, draws = 0, losses = 0, gf = 0, ga = 0;
    const catMap = new Map<string, CategoryStats>();
    filtered.forEach(r => {
      gf += r.ourScore; ga += r.opponentScore;
      if (r.ourScore > r.opponentScore) wins++;
      else if (r.ourScore < r.opponentScore) losses++;
      else draws++;
      if (!catMap.has(r.categoryName)) {
        catMap.set(r.categoryName, { categoryId: null, categoryName: r.categoryName, wins: 0, draws: 0, losses: 0, goalsFor: 0, goalsAgainst: 0, totalGames: 0 });
      }
      const cs = catMap.get(r.categoryName)!;
      cs.goalsFor += r.ourScore; cs.goalsAgainst += r.opponentScore; cs.totalGames++;
      if (r.ourScore > r.opponentScore) cs.wins++;
      else if (r.ourScore < r.opponentScore) cs.losses++;
      else cs.draws++;
    });
    const totalGames = wins + draws + losses;
    return {
      ...analytics,
      totalWins: wins, totalDraws: draws, totalLosses: losses, totalGames,
      winRate: totalGames > 0 ? Math.round((wins / totalGames) * 100) : 0,
      goalsScored: gf, goalsConceded: ga, goalDifference: gf - ga,
      categoryStats: Array.from(catMap.values()).filter(c => c.totalGames > 0).sort((a, b) => b.totalGames - a.totalGames),
    };
  })();

  return (
    <MobileLayout>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center gap-2">
          <BarChart3 className="h-6 w-6 text-primary" />
          <h1 className="text-xl font-bold">Team Analytics</h1>
        </div>

        {/* Off-season banner */}
        {seasonState === 'OFF_SEASON' && nextSeasonStart && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-white/10 text-sm text-white/50"
               style={{ background: 'rgba(255,255,255,0.04)' }}>
            <Info className="h-4 w-4 shrink-0" />
            <span>
              Off Season — next season starts {format(new Date(nextSeasonStart), 'd MMM yyyy')}
            </span>
          </div>
        )}

        {/* Season selector */}
        {allSeasons.length > 0 && (
          <div className="flex items-center justify-center gap-2">
            <button
              onClick={() => setSelectedSeason(allSeasons[selectedIndex - 1])}
              disabled={!canGoPrev}
              className="p-1.5 rounded-full transition-opacity disabled:opacity-25"
              style={{ color: '#b89fff' }}
              aria-label="Previous season"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>

            <button
              onClick={() => setShowSeasonList(true)}
              className="px-4 py-1.5 rounded-full text-sm font-semibold transition-colors"
              style={{
                background: 'rgba(184,159,255,0.15)',
                border: '1px solid rgba(184,159,255,0.35)',
                color: '#b89fff',
              }}
            >
              {selectedSeason?.label ?? '—'}
            </button>

            <button
              onClick={() => setSelectedSeason(allSeasons[selectedIndex + 1])}
              disabled={!canGoNext}
              className="p-1.5 rounded-full transition-opacity disabled:opacity-25"
              style={{ color: '#b89fff' }}
              aria-label="Next season"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        )}

        {/* Performance category filter */}
        {categoryKeys.length > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-1">
            {['all', ...categoryKeys].map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className="flex-shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition-colors"
                style={selectedCategory === cat ? {
                  background: 'rgba(184,159,255,0.15)',
                  border: '1px solid rgba(184,159,255,0.35)',
                  color: '#b89fff',
                } : {
                  background: 'rgba(255,255,255,0.06)',
                  border: '0.5px solid rgba(255,255,255,0.1)',
                  color: 'rgba(255,255,255,0.6)',
                }}
              >
                {cat === 'all' ? 'All' : cat}
              </button>
            ))}
          </div>
        )}

        {/* Event type filter */}
        {analytics.availableEventTypes.length > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-1">
            {['all', ...analytics.availableEventTypes].map(type => (
              <button
                key={type}
                onClick={() => setSelectedEventType(type)}
                className="flex-shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition-colors"
                style={selectedEventType === type ? {
                  background: 'rgba(184,159,255,0.15)',
                  border: '1px solid rgba(184,159,255,0.35)',
                  color: '#b89fff',
                } : {
                  background: 'rgba(255,255,255,0.06)',
                  border: '0.5px solid rgba(255,255,255,0.1)',
                  color: 'rgba(255,255,255,0.6)',
                }}
              >
                {type === 'all' ? 'All Events' : (EVENT_TYPE_LABELS[type] ?? type)}
              </button>
            ))}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center h-48">
            <LoadingSpinner size="lg" />
          </div>
        ) : isTrainingMode ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Calendar className="h-10 w-10 mx-auto mb-3 text-[#b89fff]" />
              <div className="text-4xl font-bold">{analytics.trainingCount}</div>
              <div className="text-sm text-white/50 mt-1">Training Sessions</div>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Key Metrics Grid */}
            <div className="grid grid-cols-2 gap-3">
              {[
                { icon: <Calendar className="h-6 w-6 text-[#b89fff]" />, value: displayStats.totalGames, label: 'Games' },
                { icon: <Trophy className="h-6 w-6 text-amber-400" />, value: displayStats.totalWins, label: 'Wins' },
                { icon: <Target className="h-6 w-6 text-teal-400" />, value: `${displayStats.winRate}%`, label: 'Win Rate' },
                { icon: <TrendingUp className="h-6 w-6 text-[#b89fff]" />, value: `${displayStats.goalDifference >= 0 ? '+' : ''}${displayStats.goalDifference}`, label: 'Goal Diff' },
              ].map(({ icon, value, label }) => (
                <div
                  key={label}
                  className="rounded-xl p-3 text-center"
                  style={{ background: 'rgba(255,255,255,0.06)', border: '0.5px solid rgba(255,255,255,0.12)' }}
                >
                  <div className="flex justify-center mb-1">{icon}</div>
                  <div className="text-2xl font-bold">{value}</div>
                  <div className="text-xs text-white/50">{label}</div>
                </div>
              ))}
            </div>

            {/* W-D-L Record */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-medium">Season Record</div>
                  <div className="flex gap-2 text-sm">
                    <span className="text-green-400 font-semibold">W{displayStats.totalWins}</span>
                    <span className="text-white/50 font-semibold">D{displayStats.totalDraws}</span>
                    <span className="text-red-400 font-semibold">L{displayStats.totalLosses}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Attendance (collapsible) */}
            <Card>
              <Collapsible open={attendanceOpen} onOpenChange={setAttendanceOpen}>
                <CollapsibleTrigger asChild>
                  <button className="w-full flex items-center justify-between p-4 text-left">
                    <div className="flex items-center">
                      <Users className="h-5 w-5 mr-2" />
                      <span className="text-lg font-semibold">Attendance</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-white/50">{analytics.totalAppearances} total</span>
                      <ChevronDown className={`h-4 w-4 transition-transform ${attendanceOpen ? 'rotate-180' : ''}`} />
                    </div>
                  </button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent className="pt-0 space-y-2">
                    {analytics.attendanceByType.length > 0 ? (
                      <>
                        {analytics.attendanceByType.map(row => (
                          <div
                            key={row.eventType}
                            className="flex items-center justify-between p-3 rounded-lg"
                            style={{ background: 'rgba(255,255,255,0.05)', border: '0.5px solid rgba(255,255,255,0.08)' }}
                          >
                            <span className="font-medium">{EVENT_TYPE_LABELS[row.eventType] ?? humaniseType(row.eventType)}</span>
                            <div className="flex items-center gap-3 text-sm">
                              <span className="text-white/70 font-semibold">{row.count}</span>
                              <Badge style={{ background: 'rgba(184,159,255,0.15)', color: '#b89fff', border: '1px solid rgba(184,159,255,0.35)' }}>
                                {row.percent}%
                              </Badge>
                            </div>
                          </div>
                        ))}
                        <div
                          className="flex items-center justify-between p-3 rounded-lg mt-2"
                          style={{ background: 'rgba(245,158,11,0.08)', border: '0.5px solid rgba(245,158,11,0.25)' }}
                        >
                          <div className="flex items-center gap-2">
                            <Star className="h-4 w-4 text-amber-400" />
                            <span className="font-medium">Captain appearances</span>
                          </div>
                          <span className="font-bold text-amber-400">{analytics.captainAppearances}</span>
                        </div>
                      </>
                    ) : (
                      <p className="text-white/50 text-center py-4 text-sm">No attendance recorded</p>
                    )}
                  </CardContent>
                </CollapsibleContent>
              </Collapsible>
            </Card>

            {/* Game Day Stats (collapsible, dynamic) */}
            <Card>
              <Collapsible open={gameDayOpen} onOpenChange={setGameDayOpen}>
                <CollapsibleTrigger asChild>
                  <button className="w-full flex items-center justify-between p-4 text-left">
                    <div className="flex items-center">
                      <Activity className="h-5 w-5 mr-2" />
                      <span className="text-lg font-semibold">Game Day Stats</span>
                    </div>
                    <ChevronDown className={`h-4 w-4 transition-transform ${gameDayOpen ? 'rotate-180' : ''}`} />
                  </button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent className="pt-0">
                    {analytics.gameDayStats.length > 0 ? (
                      <div className="grid grid-cols-2 gap-3">
                        {analytics.gameDayStats.map(s => {
                          const meta = GAME_DAY_META[s.eventType];
                          return (
                            <div
                              key={s.eventType}
                              className="text-center p-3 rounded-lg"
                              style={{ background: 'rgba(255,255,255,0.05)', border: '0.5px solid rgba(255,255,255,0.08)' }}
                            >
                              <div className="flex justify-center mb-1">
                                {meta?.icon ?? <Activity className="h-6 w-6 text-[#b89fff]" />}
                              </div>
                              <div className="text-xl font-bold">{s.count}</div>
                              <div className="text-xs text-white/50">{meta?.label ?? humaniseType(s.eventType)}</div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-white/50 text-center py-4 text-sm">No Game Day events recorded yet</p>
                    )}
                  </CardContent>
                </CollapsibleContent>
              </Collapsible>
            </Card>

            {/* Performance Category Breakdown */}
            {selectedCategory === 'all' && displayStats.categoryStats.length > 1 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center">
                    <Layers className="h-5 w-5 mr-2" />
                    By Performance Category
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {displayStats.categoryStats.map((cat, i) => (
                    <div key={i} className="p-3 rounded-lg" style={{ background: 'rgba(255,255,255,0.05)', border: '0.5px solid rgba(255,255,255,0.08)' }}>
                      <div className="font-medium mb-2">{cat.categoryName}</div>
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex gap-2">
                          <span className="text-green-400 font-semibold">W{cat.wins}</span>
                          <span className="text-white/50 font-semibold">D{cat.draws}</span>
                          <span className="text-red-400 font-semibold">L{cat.losses}</span>
                        </div>
                        <div className="flex gap-3 text-white/50">
                          <span>GF: {cat.goalsFor}</span>
                          <span>GA: {cat.goalsAgainst}</span>
                          <span className={cat.goalsFor - cat.goalsAgainst >= 0 ? 'text-green-400' : 'text-red-400'}>
                            {cat.goalsFor - cat.goalsAgainst >= 0 ? '+' : ''}{cat.goalsFor - cat.goalsAgainst}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Match Events */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center">
                  <Target className="h-5 w-5 mr-2" />
                  Match Events
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { icon: <Target className="h-6 w-6 text-[#b89fff]" />, value: analytics.totalGoals, label: 'Goals' },
                    { icon: <Target className="h-6 w-6 text-teal-400" />, value: analytics.totalAssists, label: 'Assists' },
                    { icon: <Shield className="h-6 w-6 text-[#b89fff]" />, value: analytics.totalSaves, label: 'Saves' },
                    { icon: <AlertTriangle className="h-6 w-6 text-amber-400" />, value: analytics.yellowCards, label: 'Yellow Cards' },
                  ].map(({ icon, value, label }) => (
                    <div
                      key={label}
                      className="text-center p-3 rounded-lg"
                      style={{ background: 'rgba(255,255,255,0.05)', border: '0.5px solid rgba(255,255,255,0.08)' }}
                    >
                      <div className="flex justify-center mb-1">{icon}</div>
                      <div className="text-xl font-bold">{value}</div>
                      <div className="text-xs text-white/50">{label}</div>
                    </div>
                  ))}
                </div>
                {analytics.redCards > 0 && (
                  <div
                    className="mt-3 text-center p-3 rounded-lg"
                    style={{ background: 'rgba(255,255,255,0.05)', border: '0.5px solid rgba(255,255,255,0.08)' }}
                  >
                    <AlertTriangle className="h-6 w-6 mx-auto mb-1 text-red-400" />
                    <div className="text-xl font-bold text-red-400">{analytics.redCards}</div>
                    <div className="text-xs text-white/50">Red Cards</div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Team Performance */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center">
                  <BarChart3 className="h-5 w-5 mr-2" />
                  Team Performance
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Goals Scored</span>
                    <Badge className="bg-green-500">{displayStats.goalsScored}</Badge>
                  </div>
                  <div className="w-full bg-white/10 rounded-full h-2">
                    <div
                      className="bg-green-500 h-2 rounded-full"
                      style={{ width: displayStats.goalsScored > 0 ? `${Math.min((displayStats.goalsScored / (displayStats.goalsScored + displayStats.goalsConceded)) * 100, 100)}%` : '0%' }}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Goals Conceded</span>
                    <Badge variant="destructive">{displayStats.goalsConceded}</Badge>
                  </div>
                  <div className="w-full bg-white/10 rounded-full h-2">
                    <div
                      className="bg-red-500 h-2 rounded-full"
                      style={{ width: displayStats.goalsConceded > 0 ? `${Math.min((displayStats.goalsConceded / (displayStats.goalsScored + displayStats.goalsConceded)) * 100, 100)}%` : '0%' }}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Recent Results */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center">
                  <Calendar className="h-5 w-5 mr-2" />
                  Recent Results
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {analytics.recentResults.length > 0 ? analytics.recentResults.map((event) => {
                  const result = getResultBadge(event, 1);
                  return (
                    <div key={event.id} className="flex items-center justify-between p-3 rounded-lg"
                         style={{ background: 'rgba(255,255,255,0.05)', border: '0.5px solid rgba(255,255,255,0.08)' }}>
                      <div>
                        <div className="font-medium">vs {event.opponent || 'Unknown'}</div>
                        <div className="text-sm text-white/50">
                          {new Date(event.date).toLocaleDateString()}
                        </div>
                      </div>
                      {result && (
                        <div className="text-right">
                          <div className="font-bold">{result.ourScore}-{result.opponentScore}</div>
                          <Badge className={`text-white text-xs ${result.color}`}>{result.text}</Badge>
                        </div>
                      )}
                    </div>
                  );
                }) : (
                  <p className="text-white/50 text-center py-4">No results in this period</p>
                )}
              </CardContent>
            </Card>

            {/* Top Scorers */}
            {analytics.topScorers.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center">
                    <Target className="h-5 w-5 mr-2" />
                    Top Scorers
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {analytics.topScorers.map((player, i) => (
                    <div key={i} className="flex items-center justify-between p-3 rounded-lg"
                         style={{ background: 'rgba(255,255,255,0.05)', border: '0.5px solid rgba(255,255,255,0.08)' }}>
                      <div>
                        <div className="font-medium">{player.name}</div>
                        <div className="text-sm text-white/50">{player.appearances || 0} games</div>
                      </div>
                      <Badge style={{ background: 'rgba(184,159,255,0.2)', color: '#b89fff', border: '1px solid rgba(184,159,255,0.4)' }}>
                        {player.goals || 0} goals
                      </Badge>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Top Assisters */}
            {analytics.topAssisters.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center">
                    <Target className="h-5 w-5 mr-2" />
                    Top Assisters
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {analytics.topAssisters.map((player, i) => (
                    <div key={i} className="flex items-center justify-between p-3 rounded-lg"
                         style={{ background: 'rgba(255,255,255,0.05)', border: '0.5px solid rgba(255,255,255,0.08)' }}>
                      <div>
                        <div className="font-medium">{player.name}</div>
                        <div className="text-sm text-white/50">{player.appearances || 0} games</div>
                      </div>
                      <Badge style={{ background: 'rgba(45,212,191,0.15)', color: '#2dd4bf', border: '1px solid rgba(45,212,191,0.35)' }}>
                        {player.assists || 0} assists
                      </Badge>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Most Appearances */}
            {analytics.topPerformers.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center">
                    <Users className="h-5 w-5 mr-2" />
                    Most Appearances
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {analytics.topPerformers.map((player, i) => (
                    <div key={i} className="flex items-center justify-between p-3 rounded-lg"
                         style={{ background: 'rgba(255,255,255,0.05)', border: '0.5px solid rgba(255,255,255,0.08)' }}>
                      <div>
                        <div className="font-medium">{player.name}</div>
                        <div className="text-sm text-white/50">{player.totalMinutes} minutes played</div>
                      </div>
                      <Badge variant="secondary">{player.appearances} games</Badge>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>

      {/* Season history bottom sheet */}
      <Dialog open={showSeasonList} onOpenChange={setShowSeasonList}>
        <DialogContent className="max-sm:bottom-0 max-sm:top-auto max-sm:translate-y-0 max-sm:left-0 max-sm:translate-x-0 max-sm:w-screen max-sm:max-w-none max-sm:rounded-t-2xl max-sm:rounded-b-none max-sm:pb-[max(env(safe-area-inset-bottom),1.5rem)]">
          <DialogHeader>
            <DialogTitle>Season History</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 mt-2">
            {[...allSeasons].reverse().map((season) => {
              const isSelected = season.label === selectedSeason?.label;
              return (
                <button
                  key={season.label}
                  onClick={() => { setSelectedSeason(season); setShowSeasonList(false); }}
                  className="w-full flex items-center justify-between px-4 py-3 rounded-xl text-left transition-colors"
                  style={{
                    background: isSelected ? 'rgba(184,159,255,0.15)' : 'rgba(255,255,255,0.05)',
                    border: isSelected ? '1px solid rgba(184,159,255,0.4)' : '0.5px solid rgba(255,255,255,0.08)',
                    color: isSelected ? '#b89fff' : 'inherit',
                  }}
                >
                  <span className="font-medium">{season.label}</span>
                  {isSelected && <span className="text-xs opacity-70">Selected</span>}
                  {season.type === 'off_season' && !isSelected && (
                    <span className="text-xs text-white/40">Off Season</span>
                  )}
                </button>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>
    </MobileLayout>
  );
}
