import { logger } from '@/lib/logger';
import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { DrillLibraryManager } from '@/components/training/DrillLibraryManager';
import { DrillCreator } from '@/components/training/DrillCreator';
import { CoachTrainingDashboard } from '@/components/training/CoachTrainingDashboard';
import { MobileLayout } from '@/components/layout/MobileLayout';
import { useAuth } from '@/contexts/AuthContext';
import { useTeamContext } from '@/contexts/TeamContext';
import { playersService } from '@/services/playersService';
import { supabase } from '@/integrations/supabase/client';
import { format, startOfWeek, endOfWeek, addDays, isSameDay, isToday, isAfter, parseISO, getWeek, isBefore } from 'date-fns';
import { formatTime } from '@/utils/eventUtils';
import { Plus, BookOpen, Users, Calendar, Clock, MapPin, Play, Activity } from 'lucide-react';

interface TrainingEvent {
  id: string;
  title: string;
  date: string;
  start_time: string | null;
  end_time: string | null;
  location: string | null;
  description: string | null;
  game_duration: number | null;
  team_id: string;
}

export default function TrainingMobile() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('library');
  const [showCreateDrill, setShowCreateDrill] = useState(false);
  const { user, connectedPlayers, teams, allTeams } = useAuth();
  const { currentTeam, viewMode } = useTeamContext();

  const [coachPlayers, setCoachPlayers] = useState<Array<{ id: string; name: string; team_id: string }>>([]);
  const [trainingEvents, setTrainingEvents] = useState<TrainingEvent[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(true);

  // Load team players for coach/staff roles
  useEffect(() => {
    const loadTeamPlayers = async () => {
      if (!teams || teams.length === 0) {
        setCoachPlayers([]);
        return;
      }
      try {
        const teamIds = Array.from(new Set(teams.map(t => t.id)));
        const results = await Promise.all(teamIds.map(id => playersService.getActivePlayersByTeamId(id)));
        const flat = results.flat();
        const mapped = flat.map(p => ({ id: (p as any).id, name: (p as any).name, team_id: (p as any).teamId || (p as any).team_id }));
        const map = new Map<string, { id: string; name: string; team_id: string }>();
        mapped.forEach(p => map.set(p.id, p));
        setCoachPlayers(Array.from(map.values()));
      } catch (e) {
        logger.error('Failed to load team players for coach:', e);
        setCoachPlayers([]);
      }
    };
    loadTeamPlayers();
  }, [teams, user?.id]);

  // Load training events for this team / current week + next 7 days
  useEffect(() => {
    const loadTrainingEvents = async () => {
      try {
        setLoadingEvents(true);
        const teamsToQuery = viewMode === 'all'
          ? (teams?.length ? teams : allTeams || [])
          : (currentTeam ? [currentTeam] : []);

        if (teamsToQuery.length === 0) {
          setTrainingEvents([]);
          return;
        }

        const teamIds = teamsToQuery.map(t => t.id);
        const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
        const rangeEnd = addDays(weekStart, 21); // 3 weeks

        const { data, error } = await supabase
          .from('events')
          .select('id, title, date, start_time, end_time, location, description, game_duration, team_id')
          .eq('event_type', 'training')
          .in('team_id', teamIds)
          .gte('date', format(weekStart, 'yyyy-MM-dd'))
          .lte('date', format(rangeEnd, 'yyyy-MM-dd'))
          .order('date', { ascending: true });

        if (error) throw error;
        setTrainingEvents((data || []) as TrainingEvent[]);
      } catch (e) {
        logger.error('Failed to load training events:', e);
        setTrainingEvents([]);
      } finally {
        setLoadingEvents(false);
      }
    };
    loadTrainingEvents();
  }, [teams, allTeams, currentTeam, viewMode]);

  // Connected players (parent links)
  const parentLinkedPlayers = connectedPlayers?.map(cp => ({
    id: cp.id,
    name: cp.name,
    team_id: cp.team?.id || ''
  })) || [];

  const combinedPlayers = (() => {
    const map = new Map<string, { id: string; name: string; team_id: string }>();
    [...coachPlayers, ...parentLinkedPlayers].forEach(p => map.set(p.id, p));
    return Array.from(map.values());
  })();

  // ===== Derived training data =====
  const now = new Date();
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const weekDays = useMemo(() => Array.from({ length: 7 }).map((_, i) => addDays(weekStart, i)), [weekStart]);

  const thisWeekEvents = trainingEvents.filter(e => {
    const d = parseISO(e.date);
    return !isBefore(d, weekStart) && !isAfter(d, endOfWeek(now, { weekStartsOn: 1 }));
  });

  // Compute duration per day (for bars)
  const dayDurations = weekDays.map(day => {
    const total = thisWeekEvents
      .filter(e => isSameDay(parseISO(e.date), day))
      .reduce((sum, e) => sum + (e.game_duration || 60), 0);
    return total;
  });
  const maxDuration = Math.max(...dayDurations, 1);

  // Weekly load label
  const sessionsThisWeek = thisWeekEvents.length;
  const loadLabel = sessionsThisWeek <= 1 ? 'Light' : sessionsThisWeek <= 3 ? 'Optimal' : 'High';
  const loadColor =
    loadLabel === 'Optimal' ? 'text-green-600 bg-green-500/10' :
    loadLabel === 'Light' ? 'text-amber-600 bg-amber-500/10' :
    'text-red-600 bg-red-500/10';

  // Today's session: first training today, else next future training
  const todaysSession =
    trainingEvents.find(e => isSameDay(parseISO(e.date), now)) ||
    trainingEvents.find(e => isAfter(parseISO(e.date), now));

  // Upcoming: next 3 future trainings excluding "today's session" duplicate
  const upcomingSessions = trainingEvents
    .filter(e => {
      const d = parseISO(e.date);
      return (isAfter(d, now) || isSameDay(d, now)) && (!todaysSession || e.id !== todaysSession.id);
    })
    .slice(0, 3);

  const weekNumber = getWeek(now, { weekStartsOn: 1 });

  const handleEventClick = (eventId: string) => {
    navigate(`/calendar?eventId=${eventId}`);
  };

  return (
    <MobileLayout
      headerTitle="Training"
      showTabs={false}
    >
      <div className="p-4 space-y-4">
        {/* Header row with Create Drill */}
        <div className="flex justify-between items-center">
          <div>
            <p className="text-sm text-white/65">
              Sessions, drills & individual plans
            </p>
          </div>
          <button
            onClick={() => setShowCreateDrill(true)}
            className="flex items-center gap-1 ios-card-strong h-9 px-3 text-sm font-medium text-white active:scale-[0.98] transition-transform"
          >
            <Plus className="w-4 h-4" />
            Create Drill
          </button>
        </div>

        {/* Weekly Load Card */}
        <div className="ios-card p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-white/55 uppercase tracking-wider font-medium">
                Week {weekNumber}
              </p>
              <p className="text-sm font-semibold text-white mt-0.5">
                {sessionsThisWeek} session{sessionsThisWeek !== 1 ? 's' : ''} planned
              </p>
            </div>
            <div className="flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full bg-white/12 text-white border border-white/15">
              <Activity className="w-3 h-3" />
              {loadLabel}
            </div>
          </div>

          {/* 7-day mini bar chart */}
          <div className="flex items-end justify-between gap-1.5 h-16 pt-2">
            {weekDays.map((day, i) => {
              const duration = dayDurations[i];
              const heightPct = duration > 0 ? Math.max(15, (duration / maxDuration) * 100) : 6;
              const isCurrentDay = isToday(day);
              const hasSession = duration > 0;
              return (
                <div key={i} className="flex flex-col items-center gap-1 flex-1">
                  <div className="flex-1 w-full flex items-end">
                    <div
                      className={`w-full rounded-t-sm transition-all ${
                        hasSession
                          ? isCurrentDay
                            ? 'bg-white/[0.06] backdrop-blur-xl'
                            : 'bg-white/55'
                          : 'bg-white/10'
                      }`}
                      style={{ height: `${heightPct}%` }}
                    />
                  </div>
                  <span className={`text-[10px] ${isCurrentDay ? 'text-white font-semibold' : 'text-white/55'}`}>
                    {format(day, 'EEEEE')}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Today's / Next Session highlight */}
        {todaysSession && (
          <div
            className="ios-card-strong p-4 space-y-2 cursor-pointer hover:bg-white/15 transition-colors"
            onClick={() => handleEventClick(todaysSession.id)}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-white/[0.06] backdrop-blur-xl text-primary">
                {isSameDay(parseISO(todaysSession.date), now) ? 'Today' : format(parseISO(todaysSession.date), 'EEE d MMM')}
              </span>
              <button
                onClick={(e) => { e.stopPropagation(); handleEventClick(todaysSession.id); }}
                className="flex items-center gap-1 ios-card h-8 px-3 text-xs font-medium text-white active:scale-[0.98] transition-transform"
              >
                <Play className="w-3 h-3" />
                Open
              </button>
            </div>
            <h3 className="font-semibold text-base text-white">{todaysSession.title}</h3>
            <div className="flex items-center gap-3 text-xs text-white/65 flex-wrap">
              {todaysSession.start_time && (
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {formatTime(todaysSession.start_time)}
                </span>
              )}
              {todaysSession.game_duration && (
                <span>{todaysSession.game_duration} min</span>
              )}
              {todaysSession.location && (
                <span className="flex items-center gap-1 truncate">
                  <MapPin className="w-3 h-3" />
                  <span className="truncate">{todaysSession.location}</span>
                </span>
              )}
            </div>
            {todaysSession.description && (
              <p className="text-xs text-white/60 line-clamp-2">{todaysSession.description}</p>
            )}
          </div>
        )}

        {/* Upcoming list */}
        {upcomingSessions.length > 0 && (
          <div className="space-y-2">
            <h2 className="text-xs font-medium text-white/50 uppercase tracking-wider px-1">
              Upcoming
            </h2>
            <div className="space-y-2">
              {upcomingSessions.map(event => {
                const eventDate = parseISO(event.date);
                return (
                  <div
                    key={event.id}
                    className="ios-card p-3 cursor-pointer hover:bg-white/10 transition-colors"
                    onClick={() => handleEventClick(event.id)}
                  >
                    <div className="flex gap-3">
                      <div className="flex flex-col items-center justify-center min-w-[40px]">
                        <span className="text-[10px] uppercase font-medium text-white/55">
                          {format(eventDate, 'MMM')}
                        </span>
                        <span className="text-xl font-bold text-white leading-tight">
                          {format(eventDate, 'd')}
                        </span>
                      </div>
                      <div className="w-1 self-stretch rounded-full bg-white/40" />
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-sm text-white truncate">{event.title}</h3>
                        <div className="flex items-center gap-2 text-xs text-white/60 mt-0.5">
                          {event.start_time && (
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {formatTime(event.start_time)}
                            </span>
                          )}
                          {event.location && (
                            <span className="flex items-center gap-1 truncate">
                              <MapPin className="w-3 h-3" />
                              <span className="truncate">{event.location}</span>
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Empty state when no sessions at all */}
        {!loadingEvents && !todaysSession && upcomingSessions.length === 0 && (
          <div className="ios-card p-6 text-center">
            <Calendar className="w-8 h-8 mx-auto text-white/50 mb-2" />
            <p className="text-sm text-white/65">No upcoming training sessions.</p>
            <a
              href="/calendar"
              className="inline-flex items-center mt-3 ios-card h-9 px-4 text-xs font-medium text-white"
            >
              Schedule on Calendar
            </a>
          </div>
        )}

        {/* Existing tabs - kept for power users */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full pt-2">
          <TabsList className="grid w-full grid-cols-3 ios-card border-0 p-1">
            <TabsTrigger value="library" className="text-xs text-white/70 data-[state=active]:bg-white/[0.06] backdrop-blur-xl data-[state=active]:text-primary">
              <BookOpen className="w-4 h-4 mr-1" />
              Library
            </TabsTrigger>
            <TabsTrigger value="plans" className="text-xs text-white/70 data-[state=active]:bg-white/[0.06] backdrop-blur-xl data-[state=active]:text-primary">
              <Users className="w-4 h-4 mr-1" />
              Plans
            </TabsTrigger>
            <TabsTrigger value="sessions" className="text-xs text-white/70 data-[state=active]:bg-white/[0.06] backdrop-blur-xl data-[state=active]:text-primary">
              <Calendar className="w-4 h-4 mr-1" />
              Sessions
            </TabsTrigger>
          </TabsList>

          <TabsContent value="library" className="space-y-4">
            <div className="ios-card p-4">
              <h3 className="text-base font-semibold text-white">Drill Library</h3>
              <p className="text-xs text-white/60 mb-3">Manage your training drills</p>
              <DrillLibraryManager />
            </div>
          </TabsContent>

          <TabsContent value="plans" className="space-y-4">
            <CoachTrainingDashboard
              userId={user?.id || ''}
              userPlayers={combinedPlayers}
            />
          </TabsContent>

          <TabsContent value="sessions" className="space-y-4">
            <div className="ios-card p-4">
              <h3 className="text-base font-semibold text-white">Team Sessions</h3>
              <p className="text-xs text-white/60 mb-3">Manage training sessions</p>
              <div className="text-center py-6">
                <Calendar className="w-10 h-10 mx-auto text-white/50 mb-3" />
                <h3 className="font-semibold mb-2 text-sm text-white">Team Training Sessions</h3>
                <p className="text-white/60 mb-4 text-xs">
                  Sessions are managed in events on the Calendar page.
                </p>
                <a
                  href="/calendar"
                  className="inline-flex items-center ios-card h-9 px-4 text-xs font-medium text-white"
                >
                  Go to Calendar
                </a>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {showCreateDrill && (
          <DrillCreator
            open={showCreateDrill}
            onOpenChange={setShowCreateDrill}
          />
        )}
      </div>
    </MobileLayout>
  );
}
