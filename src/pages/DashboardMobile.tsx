import { MobileLayout } from '@/components/layout/MobileLayout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Calendar, Users, Plus, User, Link2, AlertCircle, Check, ChevronRight, TrendingUp } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useTeamContext } from '@/contexts/TeamContext';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { getPersonalizedGreeting } from '@/utils/nameUtils';
import { format, isToday, isTomorrow } from 'date-fns';

import { EditProfileModal } from '@/components/users/EditProfileModal';
import { ManageConnectionsModal } from '@/components/users/ManageConnectionsModal';
import { QuickAvailabilityControls } from '@/components/events/QuickAvailabilityControls';
import { MobileEventForm } from '@/components/events/MobileEventForm';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { FifaStylePlayerCard } from '@/components/players/FifaStylePlayerCard';
import { Dialog, DialogContent } from '@/components/ui/dialog';

interface LiveStats {
  playersCount: number;
  eventsCount: number;
  upcomingEvents: any[];
  recentResults: any[];
  pendingAvailability: any[];
}

export default function DashboardMobile() {
  const navigate = useNavigate();
  const { teams, allTeams, connectedPlayers, profile, user } = useAuth();
  const { currentTeam, viewMode, availableTeams, setCurrentTeam, setViewMode } = useTeamContext();
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
  const [selectedPlayerData, setSelectedPlayerData] = useState<any>(null);
  const [showPlayerCard, setShowPlayerCard] = useState(false);

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
    setShowMobileEventForm(false);
    loadLiveData();
  };

  const handlePlayerClick = async (connectedPlayer: any) => {
    try {
      // Fetch full player data from the database including all card-related fields
      const { data: playerData, error } = await supabase
        .from('players')
        .select('*')
        .eq('id', connectedPlayer.id)
        .maybeSingle();
      
      if (error) throw error;
      if (!playerData) return;
      
      // Find the team for this player
      const playerTeam = (allTeams || teams)?.find(t => t.id === playerData.team_id);
      
      // Convert to Player type format matching what FifaStylePlayerCard expects
      const fullPlayer = {
        id: playerData.id,
        name: playerData.name,
        squadNumber: playerData.squad_number,
        photoUrl: playerData.photo_url,
        dateOfBirth: playerData.date_of_birth,
        type: playerData.type === 'goalkeeper' ? 'goalkeeper' : 'outfield',
        positions: (playerData as any).positions || [],
        availability: playerData.availability,
        status: playerData.status,
        // Card design and customization fields
        cardDesignId: (playerData as any).card_design_id || 'goldBallon',
        funStats: (playerData as any).fun_stats || {},
        playStyle: (playerData as any).play_style,
        kitSizes: (playerData as any).kit_sizes || {},
        kit_sizes: (playerData as any).kit_sizes || {},
        // Match stats for positions and captain badges
        matchStats: (playerData as any).match_stats || {},
        // Other fields
        attributes: (playerData as any).attributes || [],
        objectives: (playerData as any).objectives || [],
        comments: (playerData as any).comments || [],
        team_id: playerData.team_id,
        totalGames: (playerData as any).total_games || 0,
        totalMinutes: (playerData as any).total_minutes || 0,
        subscription: (playerData as any).subscription || 'free',
        isCaptain: (playerData as any).is_captain || false,
        playerOfMatchCount: (playerData as any).player_of_match_count || 0,
      };
      
      setSelectedPlayerData({ player: fullPlayer, team: playerTeam });
      setShowPlayerCard(true);
    } catch (error) {
      console.error('Error loading player data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load player details',
        variant: 'destructive',
      });
    }
  };

  // Handlers for saving FIFA card data from dashboard
  const handleSaveFunStats = async (player: any, stats: Record<string, number>) => {
    try {
      const { error } = await supabase
        .from('players')
        .update({ fun_stats: stats })
        .eq('id', player.id);
      if (error) throw error;
      toast({ title: 'Stats Updated', description: `Fun stats updated for ${player.name}` });
    } catch (error: any) {
      toast({ title: 'Error', description: error.message || 'Failed to update stats', variant: 'destructive' });
    }
  };

  const handleSavePlayStyle = async (player: any, playStyles: string[]) => {
    try {
      const { error } = await supabase
        .from('players')
        .update({ play_style: JSON.stringify(playStyles) })
        .eq('id', player.id);
      if (error) throw error;
      toast({ title: 'Play Style Updated', description: `Play style updated for ${player.name}` });
    } catch (error: any) {
      toast({ title: 'Error', description: error.message || 'Failed to update play style', variant: 'destructive' });
    }
  };

  const handleSaveCardDesign = async (player: any, designId: string) => {
    try {
      const { error } = await supabase
        .from('players')
        .update({ card_design_id: designId })
        .eq('id', player.id);
      if (error) throw error;
      toast({ title: 'Card Design Updated', description: `Card design updated for ${player.name}` });
    } catch (error: any) {
      toast({ title: 'Error', description: error.message || 'Failed to update card design', variant: 'destructive' });
    }
  };

  const handleUpdatePhoto = async (player: any, file: File) => {
    try {
      toast({ title: 'Uploading Photo', description: `Uploading photo for ${player.name}...` });
      const fileExt = file.name.split('.').pop();
      const fileName = `${player.id}-${Math.random()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('player_photos')
        .upload(fileName, file);
      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from('player_photos').getPublicUrl(fileName);
      
      const { error: updateError } = await supabase
        .from('players')
        .update({ photo_url: data.publicUrl })
        .eq('id', player.id);
      if (updateError) throw updateError;

      toast({ title: 'Photo Updated', description: `Photo updated for ${player.name}` });
      // Refresh player data
      handlePlayerClick({ id: player.id });
    } catch (error: any) {
      toast({ title: 'Error', description: error.message || 'Failed to update photo', variant: 'destructive' });
    }
  };

  const handleDeletePhoto = async (player: any) => {
    if (!player.photoUrl) return;
    if (!confirm(`Delete photo for ${player.name}?`)) return;
    try {
      const { error } = await supabase
        .from('players')
        .update({ photo_url: null })
        .eq('id', player.id);
      if (error) throw error;
      toast({ title: 'Photo Deleted', description: `Photo deleted for ${player.name}` });
      handlePlayerClick({ id: player.id });
    } catch (error: any) {
      toast({ title: 'Error', description: error.message || 'Failed to delete photo', variant: 'destructive' });
    }
  };

  const handlePlayerCardClose = () => {
    setShowPlayerCard(false);
    setSelectedPlayerData(null);
    loadLiveData();
  };

  useEffect(() => {
    loadLiveData();
  }, [allTeams, connectedPlayers, currentTeam, viewMode, availableTeams]);

  const loadLiveData = async () => {
    if (!user) return;

    try {
      const teamsToUse = viewMode === 'all' 
        ? (teams?.length ? teams : allTeams || [])
        : (currentTeam ? [currentTeam] : []);
      
      if (!teamsToUse.length) {
        return;
      }
      
      const teamIds = teamsToUse.map(team => team.id);
      
      const { count: playersCount } = await supabase
        .from('players')
        .select('*', { count: 'exact', head: true })
        .in('team_id', teamIds);

      const { count: eventsCount } = await supabase
        .from('events')
        .select('*', { count: 'exact', head: true })
        .in('team_id', teamIds)
        .gte('date', new Date().toISOString().split('T')[0]);

      const { data: upcomingEventsData } = await supabase
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

      // Fetch user availability for all upcoming events
      const upcomingEventIds = upcomingEventsData?.map(e => e.id) || [];
      const { data: userAvailabilityData } = await supabase
        .from('event_availability')
        .select('event_id, status, role')
        .eq('user_id', user.id)
        .in('event_id', upcomingEventIds);

      // Create availability map - prioritize: available > unavailable > pending
      const availabilityMap = new Map<string, string>();
      userAvailabilityData?.forEach(record => {
        const existing = availabilityMap.get(record.event_id);
        if (!existing || 
            (record.status === 'available') || 
            (record.status === 'unavailable' && existing === 'pending')) {
          availabilityMap.set(record.event_id, record.status);
        }
      });

      const upcomingEvents = upcomingEventsData?.map(event => ({
        ...event,
        team_context: {
          name: event.teams.name,
          logo_url: event.teams.logo_url,
          club_name: event.teams.clubs?.name,
          club_logo_url: event.teams.clubs?.logo_url
        },
        user_availability: availabilityMap.get(event.id) || null
      })) || [];

      const { data: recentResultsData } = await supabase
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
        .limit(10);

      const eventIdsForCategories = recentResultsData?.map(e => e.id) || [];
      const { data: eventSelectionsData } = await supabase
        .from('event_selections')
        .select(`
          event_id,
          team_number,
          performance_category_id,
          performance_categories(name)
        `)
        .in('event_id', eventIdsForCategories);

      const categoryMap: Record<string, Record<number, string>> = {};
      eventSelectionsData?.forEach(selection => {
        if (!categoryMap[selection.event_id]) {
          categoryMap[selection.event_id] = {};
        }
        const categoryName = (selection.performance_categories as any)?.name;
        if (categoryName && selection.team_number) {
          categoryMap[selection.event_id][selection.team_number] = categoryName;
        }
      });

      const recentResults: any[] = [];
      recentResultsData?.forEach(event => {
        const scores = event.scores as any;
        const eventCategories = categoryMap[event.id] || {};
        const teamContext = {
          name: event.teams.name,
          logo_url: event.teams.logo_url,
          club_name: event.teams.clubs?.name,
          club_logo_url: event.teams.clubs?.logo_url
        };

        let teamNumber = 1;
        let hasMultiTeam = false;
        while (scores && scores[`team_${teamNumber}`] !== undefined) {
          hasMultiTeam = true;
          const ourScore = scores[`team_${teamNumber}`];
          const opponentScore = scores[`opponent_${teamNumber}`];
          const categoryName = eventCategories[teamNumber];
          
          recentResults.push({
            id: `${event.id}_team_${teamNumber}`,
            ...event,
            team_number: teamNumber,
            category_name: categoryName,
            our_score: ourScore,
            opponent_score: opponentScore,
            team_context: teamContext,
            display_name: categoryName 
              ? `${teamContext.name} - ${categoryName}`
              : teamContext.name
          });
          teamNumber++;
        }
        
        if (!hasMultiTeam && scores) {
          recentResults.push({
            id: event.id,
            ...event,
            team_number: 1,
            our_score: scores.home,
            opponent_score: scores.away,
            team_context: teamContext,
            display_name: teamContext.name
          });
        }
      });

      recentResults.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      const limitedRecentResults = recentResults.slice(0, 6);

      const upcomingEventsForAvailability = upcomingEvents.filter(event => {
        const eventDate = new Date(event.date);
        const now = new Date();
        return eventDate > now;
      });

      const eventIds = upcomingEventsForAvailability.map(event => event.id);
      const { data: existingAvailability } = await supabase
        .from('event_availability')
        .select('event_id, status')
        .eq('user_id', user.id)
        .in('event_id', eventIds);

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
        recentResults: limitedRecentResults || [],
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

  const getResultFromScores = (ourScore: number | undefined, opponentScore: number | undefined) => {
    if (ourScore === undefined || opponentScore === undefined) return null;
    
    if (ourScore > opponentScore) return { result: 'W', color: 'bg-green-500' };
    if (ourScore < opponentScore) return { result: 'L', color: 'bg-red-500' };
    return { result: 'D', color: 'bg-gray-500' };
  };

  const canManageTeam = () => {
    if (!profile?.roles) return false;
    const managementRoles = ['global_admin', 'club_admin', 'manager', 'team_manager', 'team_coach', 'team_assistant_manager', 'coach', 'staff'];
    return profile.roles.some(role => managementRoles.includes(role));
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(word => word[0]).join('').toUpperCase().slice(0, 2);
  };

  const getConversationalTime = (event: any) => {
    const eventDate = new Date(event.date);
    const time = event.start_time ? event.start_time.slice(0, 5) : '';
    
    if (isToday(eventDate)) return time ? `Today at ${time}` : 'Today';
    if (isTomorrow(eventDate)) return time ? `Tomorrow at ${time}` : 'Tomorrow';
    return time ? `${format(eventDate, 'EEE d MMM')} at ${time}` : format(eventDate, 'EEE d MMM');
  };

  if (loading) {
    return (
      <MobileLayout>
        <div className="flex items-center justify-center h-64">
          <LoadingSpinner size="lg" />
        </div>
      </MobileLayout>
    );
  }

  return (
    <MobileLayout>
      <div className="min-h-screen bg-gray-50 -mx-4 -mt-4 px-4 pt-4">
        <div className="space-y-4 pb-safe-bottom">
          
          {/* Profile Header */}
          <div className="flex flex-col items-center pt-2 pb-3">
            <Avatar className="w-16 h-16 rounded-2xl mb-2 shadow-sm">
              {(profile as any)?.avatar_url ? (
                <AvatarImage src={(profile as any).avatar_url} alt="Profile" className="rounded-2xl" />
              ) : null}
              <AvatarFallback className="rounded-2xl bg-gray-200 text-xl font-semibold text-gray-600">
                {getInitials((profile as any)?.first_name || user?.email?.charAt(0) || 'U')}
              </AvatarFallback>
            </Avatar>
            <h1 className="text-lg font-semibold text-gray-900">
              {getPersonalizedGreeting(profile, user?.email)}
            </h1>
          </div>

          {/* Availability Status Banner */}
          {stats.pendingAvailability.length > 0 ? (
            <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
              <Link to="/calendar" className="flex items-center justify-between px-4 py-2.5">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-orange-50 flex items-center justify-center">
                    <AlertCircle className="w-4 h-4 text-orange-600" />
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-900">Availability Requests</span>
                    <p className="text-xs text-gray-500">{stats.pendingAvailability.length} pending response{stats.pendingAvailability.length > 1 ? 's' : ''}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className="bg-orange-100 text-orange-700 hover:bg-orange-100 text-xs">{stats.pendingAvailability.length}</Badge>
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                </div>
              </Link>
            </div>
          ) : (
            <div className="bg-white rounded-2xl shadow-sm px-4 py-2.5">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-green-50 flex items-center justify-center">
                  <Check className="w-4 h-4 text-green-600" />
                </div>
                <span className="text-sm text-gray-900">All caught up!</span>
              </div>
            </div>
          )}

          {/* Your Teams */}
          {(allTeams?.length || teams?.length) ? (
            <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
              <div className="px-4 py-2 border-b border-gray-100">
                <h2 className="text-xs font-medium text-gray-500 uppercase tracking-wide">Your Teams</h2>
              </div>
              
              {/* All Teams option */}
              <button
                onClick={() => setViewMode('all')}
                className="w-full flex items-center justify-between px-4 py-2.5"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center">
                    <Users className="w-4 h-4 text-blue-600" />
                  </div>
                  <span className="text-sm text-gray-900">All Teams</span>
                </div>
                {viewMode === 'all' ? (
                  <Check className="w-4 h-4 text-blue-600" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                )}
              </button>
              
              {/* Individual teams */}
              {(allTeams?.length ? allTeams : teams)?.map((team, index) => {
                const isSelected = viewMode === 'single' && currentTeam?.id === team.id;
                return (
                  <div key={team.id}>
                    <div className="h-px bg-gray-100 mx-4" />
                    <button
                      onClick={() => setCurrentTeam(team)}
                      className="w-full flex items-center justify-between px-4 py-2.5"
                    >
                      <div className="flex items-center gap-3">
                        {team.logoUrl ? (
                          <img 
                            src={team.logoUrl} 
                            alt={team.name}
                            className="w-8 h-8 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-xs font-semibold text-blue-600">
                            {getInitials(team.name)}
                          </div>
                        )}
                        <span className="text-sm text-gray-900 text-left">{team.name}</span>
                      </div>
                      {isSelected ? (
                        <Check className="w-4 h-4 text-blue-600" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-gray-400" />
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          ) : null}

          {/* Connected Players */}
          {connectedPlayers?.length > 0 && (
            <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
              <div className="px-4 py-2 border-b border-gray-100">
                <h2 className="text-xs font-medium text-gray-500 uppercase tracking-wide">Your Players</h2>
              </div>
              <div className="px-4 py-2.5">
                <div className="flex flex-wrap gap-1.5">
                  {connectedPlayers.map((player) => (
                    <button
                      key={player.id}
                      onClick={() => handlePlayerClick(player)}
                      className="flex items-center gap-1.5 bg-gray-50 rounded-full px-2.5 py-1 hover:bg-gray-100 active:bg-gray-200 transition-colors"
                    >
                      {player.photoUrl ? (
                        <img 
                          src={player.photoUrl} 
                          alt={player.name}
                          className="w-5 h-5 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center text-[10px] font-semibold text-blue-600">
                          {getInitials(player.name)}
                        </div>
                      )}
                      <span className="text-xs font-medium text-gray-700">{player.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Quick Actions */}
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className="px-4 py-2 border-b border-gray-100">
              <h2 className="text-xs font-medium text-gray-500 uppercase tracking-wide">Quick Actions</h2>
            </div>
            
            {canManageTeam() && (
              <>
                <button
                  onClick={() => setShowMobileEventForm(true)}
                  className="w-full flex items-center justify-between px-4 py-2.5"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-green-50 flex items-center justify-center">
                      <Plus className="w-4 h-4 text-green-600" />
                    </div>
                    <span className="text-sm text-gray-900">Create Event</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                </button>
                <div className="h-px bg-gray-100 mx-4" />
                <Link to="/players" className="w-full flex items-center justify-between px-4 py-2.5">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center">
                      <Users className="w-4 h-4 text-blue-600" />
                    </div>
                    <span className="text-sm text-gray-900">View Team</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                </Link>
                <div className="h-px bg-gray-100 mx-4" />
              </>
            )}
            
            <button
              onClick={() => setShowEditProfile(true)}
              className="w-full flex items-center justify-between px-4 py-2.5"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-purple-50 flex items-center justify-center">
                  <User className="w-4 h-4 text-purple-600" />
                </div>
                <span className="text-sm text-gray-900">Edit Profile</span>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-400" />
            </button>
            <div className="h-px bg-gray-100 mx-4" />
            <button
              onClick={() => setShowManageConnections(true)}
              className="w-full flex items-center justify-between px-4 py-2.5"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-orange-50 flex items-center justify-center">
                  <Link2 className="w-4 h-4 text-orange-600" />
                </div>
                <span className="text-sm text-gray-900">Manage Connections</span>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-400" />
            </button>
          </div>

          {/* Upcoming Events */}
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className="px-4 py-2 border-b border-gray-100">
              <h2 className="text-xs font-medium text-gray-500 uppercase tracking-wide">Upcoming Events</h2>
            </div>
            
            {stats.upcomingEvents.length > 0 ? (
              <>
                {stats.upcomingEvents.map((event, index) => (
                  <div key={event.id}>
                    {index > 0 && <div className="h-px bg-gray-100 mx-4" />}
                    <div 
                      className="flex gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50 active:bg-gray-100 transition-colors"
                      onClick={() => navigate(`/calendar?eventId=${event.id}`)}
                    >
                      {/* Date column */}
                      <div className="flex flex-col items-center justify-center min-w-[40px]">
                        <span className="text-[10px] text-gray-500 uppercase font-medium">
                          {format(new Date(event.date), 'MMM')}
                        </span>
                        <span className="text-xl font-bold text-gray-900">
                          {format(new Date(event.date), 'd')}
                        </span>
                      </div>
                      
                      {/* Colored accent - based on availability status */}
                      <div className={`w-1 self-stretch rounded-full ${
                        event.user_availability === 'available'
                          ? 'bg-green-400'
                          : event.user_availability === 'unavailable'
                            ? 'bg-red-400'
                            : event.user_availability === 'pending'
                              ? 'bg-amber-400'
                              : event.event_type === 'training'
                                ? 'bg-purple-400'
                                : 'bg-gray-300'
                      }`} />
                      
                      {/* Event details */}
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900 truncate">
                          {event.event_type === 'training' ? event.title : `vs ${event.opponent || 'TBD'}`}
                        </p>
                        <p className="text-sm text-gray-600">
                          {getConversationalTime(event)}
                        </p>
                        <p className="text-sm text-gray-500">
                          {event.team_context?.name}
                        </p>
                        
                        {/* Inline availability controls */}
                        <div className="mt-2">
                          <QuickAvailabilityControls 
                            eventId={event.id}
                            currentStatus="pending"
                            size="sm"
                            onStatusChange={(status) => handleAvailabilityStatusChange(event.id, status)}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                <div className="h-px bg-gray-100" />
                <Link to="/calendar" className="flex items-center justify-center px-4 py-3 text-blue-600 font-medium">
                  View All Events
                </Link>
              </>
            ) : (
              <div className="px-4 py-6 text-center text-gray-500">
                No upcoming events
              </div>
            )}
          </div>

          {/* Recent Results */}
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className="px-4 py-2 border-b border-gray-100">
              <h2 className="text-xs font-medium text-gray-500 uppercase tracking-wide">Recent Results</h2>
            </div>
            
            {stats.recentResults.length > 0 ? (
              <>
                {stats.recentResults.map((event, index) => {
                  const result = getResultFromScores(event.our_score, event.opponent_score);
                  return (
                    <div key={event.id}>
                      {index > 0 && <div className="h-px bg-gray-100 mx-4" />}
                      <div className="flex gap-3 px-4 py-3">
                        {/* Date column */}
                        <div className="flex flex-col items-center justify-center min-w-[40px]">
                          <span className="text-[10px] text-gray-500 uppercase font-medium">
                            {format(new Date(event.date), 'MMM')}
                          </span>
                          <span className="text-xl font-bold text-gray-900">
                            {format(new Date(event.date), 'd')}
                          </span>
                        </div>
                        
                        {/* Colored accent based on result */}
                        <div className={`w-1 self-stretch rounded-full ${
                          result?.result === 'W' ? 'bg-green-400' : 
                          result?.result === 'L' ? 'bg-red-400' : 'bg-gray-400'
                        }`} />
                        
                        {/* Result details */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <p className="font-semibold text-gray-900 truncate">
                              vs {event.opponent}
                            </p>
                            <div className="flex items-center gap-2 shrink-0">
                              <span className="text-lg font-bold text-gray-900">
                                {event.our_score}-{event.opponent_score}
                              </span>
                              {result && (
                                <Badge className={`${result.color} text-white text-xs px-1.5`}>
                                  {result.result}
                                </Badge>
                              )}
                            </div>
                          </div>
                          <p className="text-sm text-gray-500">
                            {event.team_context?.name}
                          </p>
                          {event.category_name && (
                            <Badge variant="outline" className="text-xs mt-1">
                              {event.category_name}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </>
            ) : (
              <div className="px-4 py-6 text-center text-gray-500">
                No recent results
              </div>
            )}
          </div>

        </div>
      </div>

      {/* Modals */}
      <EditProfileModal 
        isOpen={showEditProfile} 
        onClose={() => setShowEditProfile(false)} 
      />
      <ManageConnectionsModal 
        isOpen={showManageConnections} 
        onClose={() => setShowManageConnections(false)} 
      />
      
      {showMobileEventForm && (
        <MobileEventForm
          onClose={() => setShowMobileEventForm(false)}
          onEventCreated={handleEventCreated}
        />
      )}

      {/* Player FIFA Card Modal */}
      <Dialog open={showPlayerCard} onOpenChange={setShowPlayerCard}>
        <DialogContent className="max-w-md p-0 bg-transparent border-none shadow-none">
          {selectedPlayerData && (
            <FifaStylePlayerCard
              player={selectedPlayerData.player}
              team={selectedPlayerData.team}
              onClose={handlePlayerCardClose}
              onSaveFunStats={handleSaveFunStats}
              onSavePlayStyle={handleSavePlayStyle}
              onSaveCardDesign={handleSaveCardDesign}
              onUpdatePhoto={handleUpdatePhoto}
              onDeletePhoto={handleDeletePhoto}
            />
          )}
        </DialogContent>
      </Dialog>
    </MobileLayout>
  );
}
