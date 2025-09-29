import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { getPersonalizedGreeting } from '@/utils/nameUtils';
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
    <div className="space-y-6 p-6">
      {/* Push Notification Setup */}
      <PushNotificationSetup />
      
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">
          Welcome back, {getPersonalizedGreeting(profile, user?.email)}!
        </h1>
        <p className="text-muted-foreground mt-2">
          Here's what's happening with your teams today.
        </p>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Teams</p>
                <p className="text-3xl font-bold text-primary">{(allTeams?.length || teams?.length || 0)}</p>
              </div>
              <div className="w-12 h-12 bg-primary/20 rounded-xl flex items-center justify-center">
                <Trophy className="h-6 w-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-blue-500/5 to-blue-500/10 border-blue-500/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Players</p>
                <p className="text-3xl font-bold text-blue-600">{stats.playersCount}</p>
              </div>
              <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-500/5 to-green-500/10 border-green-500/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Upcoming Events</p>
                <p className="text-3xl font-bold text-green-600">{stats.eventsCount}</p>
              </div>
              <div className="w-12 h-12 bg-green-500/20 rounded-xl flex items-center justify-center">
                <Calendar className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-500/5 to-orange-500/10 border-orange-500/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Pending Requests</p>
                <p className="text-3xl font-bold text-orange-600">{stats.pendingAvailability.length}</p>
              </div>
              <div className="w-12 h-12 bg-orange-500/20 rounded-xl flex items-center justify-center">
                <AlertCircle className="h-6 w-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Your Teams Section */}
        <Card className="h-fit">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl flex items-center gap-2">
              <Trophy className="h-5 w-5 text-primary" />
              Your Teams
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {(allTeams?.length || teams?.length) ? (
              <div className="space-y-3">
                {(allTeams?.length ? allTeams : teams)?.map((team) => (
                  <Card 
                    key={team.id} 
                    className="cursor-pointer hover:shadow-md transition-all duration-200 hover:border-primary/50 bg-gradient-to-r from-background to-muted/20"
                    onClick={() => handleTeamNavigation(team.id)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        {team.logoUrl ? (
                          <img 
                            src={team.logoUrl} 
                            alt={team.name}
                            className="w-12 h-12 rounded-xl object-cover border"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center text-sm font-bold text-primary border">
                            {getInitials(team.name)}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold truncate">{team.name}</h3>
                          <p className="text-sm text-muted-foreground">
                            {team.ageGroup || 'Team'} • {team.gameFormat || 'Football'}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Trophy className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No teams found</p>
                {canManageTeam() && (
                  <Button onClick={handleCreateTeam} variant="outline" className="mt-3">
                    <Plus className="h-4 w-4 mr-2" />
                    Create Team
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Your Players Section */}
        <Card className="h-fit">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-600" />
              Your Players
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {connectedPlayers?.length > 0 ? (
              <div className="space-y-3">
                {connectedPlayers.map((player) => (
                  <Card key={player.id} className="hover:shadow-md transition-all duration-200 hover:border-blue-500/50 bg-gradient-to-r from-background to-blue-500/5">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        {player.photoUrl ? (
                          <img 
                            src={player.photoUrl} 
                            alt={player.name}
                            className="w-12 h-12 rounded-xl object-cover border"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center text-sm font-bold text-blue-600 border">
                            {getInitials(player.name)}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold truncate">{player.name}</h3>
                          <p className="text-sm text-muted-foreground">
                            Player
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No connected players</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Availability Requests */}
      {stats.pendingAvailability.length > 0 && (
        <Card className="bg-gradient-to-br from-orange-500/5 to-orange-500/10 border-orange-500/20">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-orange-600" />
              Availability Requests
              <Badge variant="secondary" className="bg-orange-100 text-orange-700">
                {stats.pendingAvailability.length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {stats.pendingAvailability.slice(0, 4).map((availability) => (
                <Card key={availability.id} className="bg-background/80 backdrop-blur-sm border hover:shadow-md transition-all duration-200">
                  <CardContent className="p-4">
                    <div className="space-y-3">
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          {availability.events.team_context?.logo_url ? (
                            <img 
                              src={availability.events.team_context.logo_url} 
                              alt={availability.events.team_context.name}
                              className="w-6 h-6 rounded-full border"
                            />
                          ) : (
                            <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold border">
                              {availability.events.team_context?.name?.slice(0, 2).toUpperCase()}
                            </div>
                          )}
                          <span className="text-sm font-medium text-muted-foreground">
                            {availability.events.team_context?.name}
                          </span>
                        </div>
                        <h4 className="font-semibold">
                          {availability.events.event_type === 'training' 
                            ? availability.events.title 
                            : `vs ${availability.events.opponent || 'TBD'}`}
                        </h4>
                        <p className="text-sm text-muted-foreground">
                          {new Date(availability.events.date).toLocaleDateString()}
                          {availability.events.start_time && `, ${availability.events.start_time}`}
                        </p>
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
                +{stats.pendingAvailability.length - 4} more requests available
              </p>
            )}
            <Link to="/calendar">
              <Button className="w-full bg-orange-600 hover:bg-orange-700 text-white">
                View All Availability Requests ({stats.pendingAvailability.length})
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-xl">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {canManageTeam() && (
              <>
                <Button
                  onClick={() => setShowEventForm(true)}
                  className="h-20 flex flex-col gap-2 bg-primary hover:bg-primary/90"
                >
                  <Plus className="h-6 w-6" />
                  <span className="text-sm font-medium">Create Event</span>
                </Button>
                
                
                <Link to="/analytics" className="block">
                  <Button variant="outline" className="w-full h-20 flex flex-col gap-2 hover:bg-green-500/10 hover:border-green-500/50">
                    <TrendingUp className="h-6 w-6 text-green-600" />
                    <span className="text-sm font-medium">View Analytics</span>
                  </Button>
                </Link>
              </>
            )}
            
            <Button
              variant="outline"
              onClick={() => setShowEditProfile(true)}
              className="h-20 flex flex-col gap-2 hover:bg-purple-500/10 hover:border-purple-500/50"
            >
              <User className="h-6 w-6 text-purple-600" />
              <span className="text-sm font-medium">Edit Profile</span>
            </Button>
            
            <Button
              variant="outline"
              onClick={() => setShowManageConnections(true)}
              className="h-20 flex flex-col gap-2 hover:bg-indigo-500/10 hover:border-indigo-500/50"
            >
              <Link2 className="h-6 w-6 text-indigo-600" />
              <span className="text-sm font-medium">Connections</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Upcoming Events & Recent Results */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upcoming Events */}
        <Card className="h-fit">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl flex items-center gap-2">
              <Calendar className="h-5 w-5 text-green-600" />
              Upcoming Events
            </CardTitle>
          </CardHeader>
          <CardContent>
            <UpcomingEvents />
          </CardContent>
        </Card>

        {/* Recent Results */}
        <Card className="h-fit">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl flex items-center gap-2">
              <Trophy className="h-5 w-5 text-primary" />
              Recent Results
            </CardTitle>
          </CardHeader>
          <CardContent>
            {stats.recentResults.length > 0 ? (
              <div className="space-y-3">
                {stats.recentResults.map((event) => {
                  const result = getResultFromScores(event.scores);
                  return (
                    <Card key={event.id} className="hover:shadow-md transition-all duration-200 hover:border-primary/50 bg-gradient-to-r from-background to-muted/20">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                              {event.team_context?.logo_url ? (
                                <img 
                                  src={event.team_context.logo_url} 
                                  alt={event.team_context.name}
                                  className="w-6 h-6 rounded-full border"
                                />
                              ) : (
                                <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold border">
                                  {event.team_context?.name?.slice(0, 2).toUpperCase()}
                                </div>
                              )}
                              <span className="text-sm font-medium text-muted-foreground truncate">
                                {event.team_context?.name}
                              </span>
                            </div>
                            <h4 className="font-semibold truncate">
                              vs {event.opponent || 'Unknown'}
                            </h4>
                            <p className="text-sm text-muted-foreground">
                              {new Date(event.date).toLocaleDateString()}
                            </p>
                            {event.scores && (
                              <p className="text-sm font-medium mt-1">
                                Score: {event.scores.home} - {event.scores.away}
                              </p>
                            )}
                          </div>
                          {result && (
                            <Badge 
                              variant="secondary" 
                              className={`ml-3 ${result.color} text-white font-medium`}
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
              <div className="text-center py-8 text-muted-foreground">
                <Trophy className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <h3 className="font-medium mb-2">No recent results</h3>
                <p className="text-sm">
                  Results will appear here after completing matches.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
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