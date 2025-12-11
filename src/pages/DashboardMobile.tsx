import { MobileLayout } from '@/components/layout/MobileLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, Users, Trophy, Plus, TrendingUp, User, Link2, AlertCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useTeamContext } from '@/contexts/TeamContext';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { getPersonalizedGreeting } from '@/utils/nameUtils';

import { EditProfileModal } from '@/components/users/EditProfileModal';
import { ManageConnectionsModal } from '@/components/users/ManageConnectionsModal';
import { QuickAvailabilityControls } from '@/components/events/QuickAvailabilityControls';
import { MobileEventForm } from '@/components/events/MobileEventForm';

interface LiveStats {
  playersCount: number;
  eventsCount: number;
  upcomingEvents: any[];
  recentResults: any[];
  pendingAvailability: any[];
}

export default function DashboardMobile() {
  const { teams, allTeams, connectedPlayers, profile, user } = useAuth();
  const { currentTeam, viewMode, availableTeams } = useTeamContext();
  const { toast } = useToast();
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
  const [showMobileEventForm, setShowMobileEventForm] = useState(false);

  const handleAvailabilityStatusChange = (eventId: string, status: 'available' | 'unavailable') => {
    // Update the local state to reflect the change
    setStats(prevStats => ({
      ...prevStats,
      pendingAvailability: prevStats.pendingAvailability.filter(availability => 
        availability.event_id !== eventId
      )
    }));
    
    // Show success message
    toast({
      title: "Availability updated",
      description: `Marked as ${status} for this event`,
    });
  };

  const handleEventCreated = () => {
    setShowMobileEventForm(false);
    // Reload the stats to reflect the new event
    loadLiveData();
  };

  useEffect(() => {
    loadLiveData();
  }, [allTeams, connectedPlayers, currentTeam, viewMode, availableTeams]);

  const loadLiveData = async () => {
    if (!user) return;

    try {
      // Determine which teams to query based on view mode
      // Use teams directly from AuthContext for accurate data across club switches
      const teamsToUse = viewMode === 'all' 
        ? (teams?.length ? teams : allTeams || [])
        : (currentTeam ? [currentTeam] : []);
      
      console.log('Teams to use:', teamsToUse?.length, teamsToUse?.map(t => ({ id: t.id, name: t.name })), 'View mode:', viewMode);
      
      if (!teamsToUse.length) {
        console.log('No teams available for loading data');
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
      console.log('Upcoming events data:', upcomingEventsData?.length, upcomingEventsData);

      // Add team context to events
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
      console.log('Recent results data:', recentResultsData?.length, recentResultsData);

      const recentResults = recentResultsData?.map(event => ({
        ...event,
        team_context: {
          name: event.teams.name,
          logo_url: event.teams.logo_url,
          club_name: event.teams.clubs?.name,
          club_logo_url: event.teams.clubs?.logo_url
        }
      })) || [];

      // Load pending availability for current user with team context
      // First, get all upcoming events that might need availability confirmation
      const upcomingEventsForAvailability = upcomingEvents.filter(event => {
        const eventDate = new Date(event.date);
        const now = new Date();
        // Only include events that are in the future
        return eventDate > now;
      });

      console.log('Upcoming events for availability check:', upcomingEventsForAvailability.length);

      // Check existing availability records for these events
      const eventIds = upcomingEventsForAvailability.map(event => event.id);
      const { data: existingAvailability, error: availabilityError } = await supabase
        .from('event_availability')
        .select('event_id, status')
        .eq('user_id', user.id)
        .in('event_id', eventIds);

      if (availabilityError) {
        console.error('Error loading existing availability:', availabilityError);
      }

      console.log('Existing availability records:', existingAvailability?.length || 0, existingAvailability);

      // Filter events that need availability confirmation
      const eventsNeedingAvailability = upcomingEventsForAvailability.filter(event => {
        const existingRecord = existingAvailability?.find(a => a.event_id === event.id);
        // Show events that have no record or have 'pending' status
        return !existingRecord || existingRecord.status === 'pending';
      });

      console.log('Events needing availability confirmation:', eventsNeedingAvailability.length);

      // Format these events for the availability display
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

      console.log('Pending availability data:', pendingAvailabilityData?.length, pendingAvailabilityData);

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

  const getEventTypeColor = (eventType: string) => {
    switch (eventType) {
      case 'training': return 'bg-purple-50';
      case 'match':
      case 'fixture': return 'bg-red-50';
      default: return 'bg-blue-50';
    }
  };

  const getResultFromScores = (scores: any) => {
    if (!scores) return null;
    
    // Handle team scores (team_1, team_2, etc.)
    if (scores.team_1 !== undefined && scores.opponent_1 !== undefined) {
      const ourScore = scores.team_1;
      const opponentScore = scores.opponent_1;
      
      if (ourScore > opponentScore) return { result: 'Win', color: 'bg-green-500' };
      if (ourScore < opponentScore) return { result: 'Loss', color: 'bg-red-500' };
      return { result: 'Draw', color: 'bg-gray-500' };
    }
    
    // Handle home/away scores
    if (scores.home !== undefined && scores.away !== undefined) {
      // Assume we're home team for now - this should be determined by event.is_home
      const ourScore = scores.home;
      const opponentScore = scores.away;
      
      if (ourScore > opponentScore) return { result: 'Win', color: 'bg-green-500' };
      if (ourScore < opponentScore) return { result: 'Loss', color: 'bg-red-500' };
      return { result: 'Draw', color: 'bg-gray-500' };
    }
    
    return null;
  };

  // Check if user can manage teams (not just parent or player)
  const canManageTeam = () => {
    if (!profile?.roles) return false;
    const managementRoles = ['global_admin', 'club_admin', 'manager', 'team_manager', 'team_coach', 'team_assistant_manager', 'coach', 'staff'];
    return profile.roles.some(role => managementRoles.includes(role));
  };

  if (loading) {
    return (
      <MobileLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        </div>
      </MobileLayout>
    );
  }

  // Helper function to get initials
  const getInitials = (name: string) => {
    return name.split(' ').map(word => word[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <MobileLayout>
      <div className="space-y-6 pb-safe-bottom">
        {/* Welcome Message */}
        <div className="text-center">
          <h2 className="text-xl font-semibold text-foreground mb-2">
            Welcome, {getPersonalizedGreeting(profile, user?.email)}!
          </h2>
          
          {/* Teams and Players Section */}
          <div className="space-y-4">
            {/* Connected Teams */}
            {(allTeams?.length || teams?.length) && (
              <div className="bg-card rounded-lg p-4 border">
                <h3 className="text-sm font-medium text-muted-foreground mb-3">Your Teams</h3>
                <div className="space-y-2">
                  {(allTeams?.length ? allTeams : teams)?.map((team) => (
                    <div key={team.id} className="flex items-center gap-3 bg-muted/50 rounded-lg px-4 py-3">
                      {team.logoUrl ? (
                        <img 
                          src={team.logoUrl} 
                          alt={team.name}
                          className="w-8 h-8 rounded-full flex-shrink-0"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold flex-shrink-0">
                          {getInitials(team.name)}
                        </div>
                      )}
                      <span className="text-sm font-medium">{team.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Connected Players */}
            {connectedPlayers?.length > 0 && (
              <div className="bg-card rounded-lg p-4 border">
                <h3 className="text-sm font-medium text-muted-foreground mb-3">Your Players</h3>
                <div className="flex flex-wrap gap-2 justify-center">
                  {connectedPlayers.map((player) => (
                    <div key={player.id} className="flex items-center gap-2 bg-muted/50 rounded-lg px-3 py-2">
                      {player.photoUrl ? (
                        <img 
                          src={player.photoUrl} 
                          alt={player.name}
                          className="w-6 h-6 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold">
                          {getInitials(player.name)}
                        </div>
                      )}
                      <span className="text-sm font-medium">{player.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
        
        {/* Availability Status - Always Show */}
        {stats.pendingAvailability.length > 0 ? (
          <Card className="border-orange-200 bg-orange-50 animate-fade-in">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center">
                <AlertCircle className="h-5 w-5 mr-2 text-orange-600" />
                Availability Requests
                <Badge variant="secondary" className="ml-2 bg-orange-100 text-orange-700">
                  {stats.pendingAvailability.length}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {stats.pendingAvailability.slice(0, 2).map((availability) => (
                <div key={availability.id} className="space-y-3 p-3 rounded-lg bg-white border border-orange-200 hover-scale">
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
                      <span className="text-xs text-muted-foreground">
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
              ))}
              {stats.pendingAvailability.length > 2 && (
                <p className="text-sm text-center text-muted-foreground">
                  +{stats.pendingAvailability.length - 2} more requests
                </p>
              )}
              <Link to="/calendar">
                <Button className="w-full h-10 bg-orange-600 hover:bg-orange-700 text-white">
                  Confirm Availability ({stats.pendingAvailability.length})
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-green-200 bg-green-50">
            <CardContent className="p-4 text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-full bg-green-600 flex items-center justify-center">
                  <Calendar className="h-4 w-4 text-white" />
                </div>
                <span className="text-green-800 font-medium">All Caught Up!</span>
              </div>
              <p className="text-sm text-green-700">No availability requests pending</p>
            </CardContent>
          </Card>
        )}
        
        {/* Live Stats */}
        <div className="grid grid-cols-1 gap-4">
          <Card className="touch-manipulation">
            <CardContent className="p-4 text-center">
              <Calendar className="h-8 w-8 mx-auto mb-2 text-green-600" />
              <div className="text-2xl font-bold">{stats.eventsCount}</div>
              <div className="text-sm text-muted-foreground">Upcoming Events</div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              {canManageTeam() && (
                <>
                  <Button 
                    className="h-20 flex-col gap-2 bg-green-600 hover:bg-green-700 text-white" 
                    onClick={() => setShowMobileEventForm(true)}
                  >
                    <Plus className="h-6 w-6" />
                    <span className="text-sm">Create Event</span>
                  </Button>
                  <Link to="/players" className="contents">
                    <Button className="h-20 flex-col gap-2 bg-blue-600 hover:bg-blue-700 text-white">
                      <Users className="h-6 w-6" />
                      <span className="text-sm">Manage Players</span>
                    </Button>
                  </Link>
                </>
              )}
              <Button 
                className="h-20 flex-col gap-2 bg-purple-600 hover:bg-purple-700 text-white" 
                onClick={() => setShowEditProfile(true)}
              >
                <User className="h-6 w-6" />
                <span className="text-sm">Edit Profile</span>
              </Button>
              <Button 
                className="h-20 flex-col gap-2 bg-orange-600 hover:bg-orange-700 text-white" 
                onClick={() => setShowManageConnections(true)}
              >
                <Link2 className="h-6 w-6" />
                <span className="text-sm">Connections</span>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Upcoming Events */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center">
              <Calendar className="h-5 w-5 mr-2" />
              Upcoming Events
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {stats.upcomingEvents.length > 0 ? (
              stats.upcomingEvents.map((event) => (
                <div key={event.id} className={`flex items-center justify-between p-3 rounded-lg ${getEventTypeColor(event.event_type)}`}>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      {event.team_context?.logo_url ? (
                        <img 
                          src={event.team_context.logo_url} 
                          alt={event.team_context.name}
                          className="w-5 h-5 rounded-full"
                        />
                      ) : (
                        <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold">
                          {event.team_context?.name?.slice(0, 2).toUpperCase()}
                        </div>
                      )}
                      <span className="text-sm font-medium text-muted-foreground">
                        {event.team_context?.name || event.team_name}
                      </span>
                    </div>
                    <div className="font-medium">
                      {event.event_type === 'training' ? event.title : `vs ${event.opponent || 'TBD'}`}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {new Date(event.date).toLocaleDateString()} {event.start_time && `, ${event.start_time}`}
                    </div>
                  </div>
                  <Badge variant="outline">
                    {event.event_type.charAt(0).toUpperCase() + event.event_type.slice(1)}
                  </Badge>
                </div>
              ))
            ) : (
              <p className="text-muted-foreground text-center py-4">No upcoming events</p>
            )}
            <Link to="/calendar">
              <Button variant="ghost" className="w-full h-10">
                View All Events
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Recent Performance */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center">
              <TrendingUp className="h-5 w-5 mr-2" />
              Recent Results
            </CardTitle>
          </CardHeader>
          <CardContent>
            {stats.recentResults.length > 0 ? (
              <div className="space-y-3">
                {stats.recentResults.map((event) => {
                  const result = getResultFromScores(event.scores);
                  return (
                    <div key={event.id} className="flex items-center justify-between">
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
                          <span className="text-xs text-muted-foreground">
                            {event.team_context?.name}
                          </span>
                        </div>
                        <span className="text-sm font-medium">vs {event.opponent}</span>
                        <div className="text-xs text-muted-foreground">
                          {new Date(event.date).toLocaleDateString()}
                        </div>
                      </div>
                      {result && (
                        <Badge className={`text-white ${result.color}`}>
                          {result.result}
                        </Badge>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-4">No recent results</p>
            )}
          </CardContent>
        </Card>

        {/* Modals */}
        <EditProfileModal 
          isOpen={showEditProfile} 
          onClose={() => setShowEditProfile(false)} 
        />
        <ManageConnectionsModal 
          isOpen={showManageConnections} 
          onClose={() => setShowManageConnections(false)} 
        />
        
        {/* Mobile Event Form Modal */}
        {showMobileEventForm && (
          <MobileEventForm
            onClose={() => setShowMobileEventForm(false)}
            onEventCreated={handleEventCreated}
          />
        )}
      </div>
    </MobileLayout>
  );
}
