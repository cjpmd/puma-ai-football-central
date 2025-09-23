import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { PushNotificationSetup } from '@/components/notifications/PushNotificationSetup';
import { QuickAvailabilityControls } from '@/components/events/QuickAvailabilityControls';
import { UpcomingEvents } from '@/components/dashboard/UpcomingEvents';
import { EditProfileModal } from '@/components/users/EditProfileModal';
import { ManageConnectionsModal } from '@/components/users/ManageConnectionsModal';
import { MobileEventForm } from '@/components/events/MobileEventForm';
import { 
  Calendar, 
  Users, 
  Trophy, 
  Plus, 
  TrendingUp, 
  User, 
  Link2, 
  AlertCircle,
  CheckCircle,
  UserPlus
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { formatPlayerName } from '@/utils/nameUtils';

interface LiveStats {
  playersCount: number;
  eventsCount: number;
  upcomingEvents: any[];
  recentResults: any[];
  pendingAvailability: any[];
}

export const EnhancedDashboardContent = () => {
  const { teams, allTeams, connectedPlayers, profile, user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [stats, setStats] = useState<LiveStats>({
    playersCount: 0,
    eventsCount: 0,
    upcomingEvents: [],
    recentResults: [],
    pendingAvailability: []
  });
  const [loading, setLoading] = useState(true);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [showManageConnections, setShowManageConnections] = useState(false);
  const [showEventForm, setShowEventForm] = useState(false);

  const handleAvailabilityStatusChange = (eventId: string, status: 'available' | 'unavailable') => {
    setStats(prevStats => ({
      ...prevStats,
      pendingAvailability: prevStats.pendingAvailability.filter(availability => 
        availability.event_id !== eventId
      )
    }));
    
    toast({
      title: "Availability updated",
      description: `Marked as ${status} for this event`,
    });
  };

  const handleEventCreated = () => {
    setShowEventForm(false);
    loadLiveData();
  };

  useEffect(() => {
    loadLiveData();
  }, [allTeams, connectedPlayers]);

  const loadLiveData = async () => {
    if (!user) return;

    try {
      const teamsToUse = allTeams?.length ? allTeams : (teams || []);
      console.log('Teams to use:', teamsToUse?.length, teamsToUse?.map(t => ({ id: t.id, name: t.name })));
      
      if (!teamsToUse.length) {
        console.log('No teams available for loading data');
        setLoading(false);
        return;
      }
      
      const teamIds = teamsToUse.map(team => team.id);
      console.log('Team IDs for queries:', teamIds);
      
      // Load players count from all connected teams
      const { count: playersCount } = await supabase
        .from('players')
        .select('*', { count: 'exact', head: true })
        .in('team_id', teamIds);

      // Load upcoming events count from all teams
      const { count: eventsCount } = await supabase
        .from('events')
        .select('*', { count: 'exact', head: true })
        .in('team_id', teamIds)
        .gte('date', new Date().toISOString().split('T')[0]);

      // Load upcoming events details with team information
      const { data: upcomingEventsData, error: upcomingError } = await supabase
        .from('events')
        .select(`
          *,
          teams!inner(
            id, name, logo_url, kit_designs, club_id,
            clubs!teams_club_id_fkey(name, logo_url)
          )
        `)
        .in('team_id', teamIds)
        .gte('date', new Date().toISOString().split('T')[0])
        .order('date', { ascending: true })
        .limit(5);

      if (upcomingError) {
        console.error('Error loading upcoming events:', upcomingError);
      }

      const upcomingEvents = upcomingEventsData?.map(event => ({
        ...event,
        team_context: {
          name: event.teams.name,
          logo_url: event.teams.logo_url,
          club_name: event.teams.clubs?.name,
          club_logo_url: event.teams.clubs?.logo_url
        }
      })) || [];

      // Load recent completed events with results
      const { data: recentResultsData, error: recentError } = await supabase
        .from('events')
        .select(`
          *,
          teams!inner(
            id, name, logo_url, kit_designs, club_id,
            clubs!teams_club_id_fkey(name, logo_url)
          )
        `)
        .in('team_id', teamIds)
        .lt('date', new Date().toISOString().split('T')[0])
        .not('scores', 'is', null)
        .order('date', { ascending: false })
        .limit(5);

      if (recentError) {
        console.error('Error loading recent results:', recentError);
      }

      const recentResults = recentResultsData?.map(event => ({
        ...event,
        team_context: {
          name: event.teams.name,
          logo_url: event.teams.logo_url,
          club_name: event.teams.clubs?.name,
          club_logo_url: event.teams.clubs?.logo_url
        }
      })) || [];

      // Load pending availability for current user
      const upcomingEventsForAvailability = upcomingEvents.filter(event => {
        const eventDate = new Date(event.date);
        const now = new Date();
        return eventDate > now;
      });

      const eventIds = upcomingEventsForAvailability.map(event => event.id);
      const { data: existingAvailability, error: availabilityError } = await supabase
        .from('event_availability')
        .select('event_id, status')
        .eq('user_id', user.id)
        .in('event_id', eventIds);

      if (availabilityError) {
        console.error('Error loading existing availability:', availabilityError);
      }

      const eventsNeedingAvailability = upcomingEventsForAvailability.filter(event => {
        const existingRecord = existingAvailability?.find(a => a.event_id === event.id);
        return !existingRecord || existingRecord.status === 'pending';
      });

      const pendingAvailabilityData = eventsNeedingAvailability.map(event => ({
        id: `${event.id}_${user.id}`,
        event_id: event.id,
        user_id: user.id,
        role: 'player',
        status: 'pending',
        events: {
          ...event,
          team_context: event.team_context
        }
      }));

      setStats({
        playersCount: playersCount || 0,
        eventsCount: eventsCount || 0,
        upcomingEvents: upcomingEvents || [],
        recentResults: recentResults || [],
        pendingAvailability: pendingAvailabilityData
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to load dashboard data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(word => word[0]).join('').toUpperCase().slice(0, 2);
  };

  const getResultFromScores = (scores: any) => {
    if (!scores) return null;
    
    if (scores.team_1 !== undefined && scores.opponent_1 !== undefined) {
      const ourScore = scores.team_1;
      const opponentScore = scores.opponent_1;
      
      if (ourScore > opponentScore) return { result: 'Win', color: 'bg-green-500' };
      if (ourScore < opponentScore) return { result: 'Loss', color: 'bg-red-500' };
      return { result: 'Draw', color: 'bg-gray-500' };
    }
    
    if (scores.home !== undefined && scores.away !== undefined) {
      const ourScore = scores.home;
      const opponentScore = scores.away;
      
      if (ourScore > opponentScore) return { result: 'Win', color: 'bg-green-500' };
      if (ourScore < opponentScore) return { result: 'Loss', color: 'bg-red-500' };
      return { result: 'Draw', color: 'bg-gray-500' };
    }
    
    return null;
  };

  const canManageTeam = () => {
    if (!profile?.roles) return false;
    const managementRoles = ['global_admin', 'club_admin', 'team_manager', 'team_coach', 'team_assistant_manager', 'coach', 'staff'];
    return profile.roles.some(role => managementRoles.includes(role));
  };

  const handleCreateTeam = () => {
    navigate('/new-team');
  };

  const handleTeamNavigation = (teamId: string) => {
    navigate(`/team/${teamId}`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Push Notification Setup */}
      <PushNotificationSetup />
      
      {/* Welcome Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">
                Welcome back, {profile?.name || user?.email || 'Team Manager'}!
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Teams and Players Section */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Connected Teams */}
                  {(allTeams?.length || teams?.length) && (
                    <div className="space-y-3">
                      <h3 className="text-lg font-semibold flex items-center gap-2">
                        <Trophy className="h-5 w-5" />
                        Your Teams
                      </h3>
                      <div className="space-y-2">
                        {(allTeams?.length ? allTeams : teams)?.map((team) => (
                          <Card 
                            key={team.id} 
                            className="cursor-pointer hover:shadow-md transition-shadow"
                            onClick={() => handleTeamNavigation(team.id)}
                          >
                            <CardContent className="p-4">
                              <div className="flex items-center gap-3">
                                {team.logoUrl ? (
                                  <img 
                                    src={team.logoUrl} 
                                    alt={team.name}
                                    className="w-10 h-10 rounded-full"
                                  />
                                ) : (
                                  <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-sm font-bold">
                                    {getInitials(team.name)}
                                  </div>
                                )}
                                <div>
                                  <span className="font-medium">{team.name}</span>
                                  <p className="text-sm text-muted-foreground">
                                    {team.ageGroup || 'Team'} • {team.gameFormat || 'Football'}
                                  </p>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Connected Players */}
                  {connectedPlayers?.length > 0 && (
                    <div className="space-y-3">
                      <h3 className="text-lg font-semibold flex items-center gap-2">
                        <Users className="h-5 w-5" />
                        Your Players
                      </h3>
                      <div className="space-y-2">
                        {connectedPlayers.map((player) => (
                          <Card key={player.id} className="hover:shadow-md transition-shadow">
                            <CardContent className="p-4">
                              <div className="flex items-center gap-3">
                                {player.photoUrl ? (
                                  <img 
                                    src={player.photoUrl} 
                                    alt={player.name}
                                    className="w-10 h-10 rounded-full object-cover"
                                  />
                                ) : (
                                  <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-sm font-bold">
                                    {getInitials(player.name)}
                                  </div>
                                )}
                                <div>
                                  <span className="font-medium">{player.name}</span>
                                  <p className="text-sm text-muted-foreground">
                                    Player
                                  </p>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Live Statistics */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Overview</h3>
          <div className="grid gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <Calendar className="h-6 w-6 text-green-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stats.eventsCount}</p>
                    <p className="text-sm text-muted-foreground">Upcoming Events</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Users className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stats.playersCount}</p>
                    <p className="text-sm text-muted-foreground">Total Players</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <Trophy className="h-6 w-6 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{(allTeams?.length || teams?.length || 0)}</p>
                    <p className="text-sm text-muted-foreground">Teams</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Availability Requests */}
      {stats.pendingAvailability.length > 0 ? (
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader>
            <CardTitle className="text-xl flex items-center gap-2">
              <AlertCircle className="h-6 w-6 text-orange-600" />
              Availability Requests
              <Badge variant="secondary" className="bg-orange-100 text-orange-700">
                {stats.pendingAvailability.length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {stats.pendingAvailability.slice(0, 4).map((availability) => (
                <Card key={availability.id} className="bg-white border border-orange-200">
                  <CardContent className="p-4">
                    <div className="space-y-3">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          {availability.events.team_context?.logo_url ? (
                            <img 
                              src={availability.events.team_context.logo_url} 
                              alt={availability.events.team_context.name}
                              className="w-4 h-4 rounded-full"
                            />
                          ) : (
                            <div className="w-4 h-4 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold">
                              {availability.events.team_context?.name?.slice(0, 2).toUpperCase()}
                            </div>
                          )}
                          <span className="text-sm text-muted-foreground">
                            {availability.events.team_context?.name}
                          </span>
                        </div>
                        <div className="font-medium">
                          {availability.events.event_type === 'training' 
                            ? availability.events.title 
                            : `vs ${availability.events.opponent || 'TBD'}`}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {new Date(availability.events.date).toLocaleDateString()}
                          {availability.events.start_time && `, ${availability.events.start_time}`}
                        </div>
                      </div>
                      <QuickAvailabilityControls 
                        eventId={availability.event_id}
                        currentStatus="pending"
                        size="sm"
                        onStatusChange={(status) => handleAvailabilityStatusChange(availability.event_id, status)}
                      />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
            {stats.pendingAvailability.length > 4 && (
              <p className="text-sm text-center text-muted-foreground">
                +{stats.pendingAvailability.length - 4} more requests
              </p>
            )}
            <Link to="/calendar">
              <Button className="w-full bg-orange-600 hover:bg-orange-700 text-white">
                Confirm All Availability ({stats.pendingAvailability.length})
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="p-6 text-center">
            <div className="flex items-center justify-center gap-3 mb-3">
              <div className="w-12 h-12 rounded-full bg-green-600 flex items-center justify-center">
                <CheckCircle className="h-6 w-6 text-white" />
              </div>
              <div>
                <span className="text-green-800 font-semibold text-lg">All Caught Up!</span>
                <p className="text-green-700">No availability requests pending</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {canManageTeam() && (
              <>
                <Button
                  onClick={() => setShowEventForm(true)}
                  className="h-16 flex flex-col gap-2"
                >
                  <Plus className="h-5 w-5" />
                  <span>Create Event</span>
                </Button>
                
                <Link to="/player-management">
                  <Button variant="outline" className="w-full h-16 flex flex-col gap-2">
                    <UserPlus className="h-5 w-5" />
                    <span>Manage Players</span>
                  </Button>
                </Link>
                
                <Link to="/analytics">
                  <Button variant="outline" className="w-full h-16 flex flex-col gap-2">
                    <TrendingUp className="h-5 w-5" />
                    <span>View Analytics</span>
                  </Button>
                </Link>
              </>
            )}
            
            <Button
              variant="outline"
              onClick={() => setShowEditProfile(true)}
              className="h-16 flex flex-col gap-2"
            >
              <User className="h-5 w-5" />
              <span>Edit Profile</span>
            </Button>
            
            <Button
              variant="outline"
              onClick={() => setShowManageConnections(true)}
              className="h-16 flex flex-col gap-2"
            >
              <Link2 className="h-5 w-5" />
              <span>Manage Connections</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Upcoming Events */}
        <div>
          <UpcomingEvents />
        </div>

        {/* Recent Results */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle className="text-xl flex items-center gap-2">
                <Trophy className="h-6 w-6" />
                Recent Results
              </CardTitle>
            </CardHeader>
            <CardContent>
              {stats.recentResults.length > 0 ? (
                <div className="space-y-3">
                  {stats.recentResults.map((event) => {
                    const result = getResultFromScores(event.scores);
                    return (
                      <Card key={event.id} className="hover:shadow-md transition-shadow">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                {event.team_context?.logo_url ? (
                                  <img 
                                    src={event.team_context.logo_url} 
                                    alt={event.team_context.name}
                                    className="w-4 h-4 rounded-full"
                                  />
                                ) : (
                                  <div className="w-4 h-4 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold">
                                    {event.team_context?.name?.slice(0, 2).toUpperCase()}
                                  </div>
                                )}
                                <span className="text-sm text-muted-foreground">
                                  {event.team_context?.name}
                                </span>
                              </div>
                              <div className="font-medium">
                                vs {event.opponent || 'Unknown'}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {new Date(event.date).toLocaleDateString()}
                              </div>
                              {event.scores && (
                                <div className="text-sm font-medium">
                                  Score: {event.scores.home} - {event.scores.away}
                                </div>
                              )}
                            </div>
                            {result && (
                              <Badge 
                                variant="secondary" 
                                className={`${result.color} text-white`}
                              >
                                {result.result}
                              </Badge>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Trophy className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">No recent results</h3>
                  <p className="text-muted-foreground">
                    Results will appear here after completing matches.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* No Teams Fallback */}
      {(!allTeams?.length && !teams?.length) && (
        <Card>
          <CardHeader>
            <CardTitle>No Teams Yet</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <Trophy className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">Get started with your first team</h3>
              <p className="text-muted-foreground mb-6">
                Create a team to start managing players, scheduling events, and tracking performance.
              </p>
              <Button onClick={handleCreateTeam} size="lg">
                <Plus className="h-5 w-5 mr-2" />
                Create Your First Team
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Modals */}
      <EditProfileModal
        isOpen={showEditProfile}
        onClose={() => setShowEditProfile(false)}
      />
      
      <ManageConnectionsModal
        isOpen={showManageConnections}
        onClose={() => setShowManageConnections(false)}
      />
      
      {showEventForm && (
        <MobileEventForm
          onClose={() => setShowEventForm(false)}
          onEventCreated={handleEventCreated}
        />
      )}
    </div>
  );
};