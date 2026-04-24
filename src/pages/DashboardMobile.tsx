import { logger } from '@/lib/logger';
import { MobileLayout } from '@/components/layout/MobileLayout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Calendar, Users, Plus, User, Link2, AlertCircle, Check, ChevronRight, ChevronDown, TrendingUp, Settings, Building2 } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useTeamContext } from '@/contexts/TeamContext';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { getPersonalizedGreeting } from '@/utils/nameUtils';
import { format, isToday, isTomorrow } from 'date-fns';
import { getLinkedPlayerIds, getPlayerAvailabilityForEvents, getBestAvailabilityStatus } from '@/services/sharedAvailabilityService';
import { useEffectiveRole } from '@/hooks/useEffectiveRole';

import { EditProfileModal } from '@/components/users/EditProfileModal';
import { ManageConnectionsModal } from '@/components/users/ManageConnectionsModal';
import { QuickAvailabilityControls } from '@/components/events/QuickAvailabilityControls';
import { MobileEventForm } from '@/components/events/MobileEventForm';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { FifaStylePlayerCard } from '@/components/players/FifaStylePlayerCard';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { EditPlayerModal } from '@/components/players/mobile/EditPlayerModal';
import { PlayerStatsModal } from '@/components/players/mobile/PlayerStatsModal';
import { PlayerAttributesModal } from '@/components/players/mobile/PlayerAttributesModal';
import { PlayerObjectivesModal } from '@/components/players/mobile/PlayerObjectivesModal';
import { PlayerCommentsModal } from '@/components/players/mobile/PlayerCommentsModal';
import { PlayerHistoryModal } from '@/components/players/mobile/PlayerHistoryModal';
import { PlayerParentsModal } from '@/components/players/mobile/PlayerParentsModal';

interface LiveStats {
  playersCount: number;
  eventsCount: number;
  upcomingEvents: any[];
  recentResults: any[];
  pendingAvailability: any[];
}

export default function DashboardMobile() {
  const navigate = useNavigate();
  const { teams, allTeams, connectedPlayers, profile, user, clubs } = useAuth();
  const { currentTeam, viewMode, availableTeams, setCurrentTeam, setViewMode } = useTeamContext();
  const { toast } = useToast();
  const { hasStaffAccess, isRestrictedParent, isRestrictedPlayer } = useEffectiveRole();
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
  const [teamPrivacySettings, setTeamPrivacySettings] = useState<Map<string, any>>(new Map());
  const [showTeamPicker, setShowTeamPicker] = useState(false);
  
  // Player action modal states for Dashboard FIFA card
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [statsModalOpen, setStatsModalOpen] = useState(false);
  const [attributesModalOpen, setAttributesModalOpen] = useState(false);
  const [objectivesModalOpen, setObjectivesModalOpen] = useState(false);
  const [commentsModalOpen, setCommentsModalOpen] = useState(false);
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [parentsModalOpen, setParentsModalOpen] = useState(false);

  // Helper to check if scores should be shown for an event's team
  const shouldShowScoresForEvent = (event: any) => {
    // Staff always see scores
    if (hasStaffAccess) return true;
    
    const settings = teamPrivacySettings.get(event.team_id);
    if (!settings) return true; // Default to showing if no settings loaded
    
    if (isRestrictedParent && !settings.show_scores_to_parents) return false;
    if (isRestrictedPlayer && !settings.show_scores_to_players) return false;
    
    return true;
  };

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
      logger.error('Error loading player data:', error);
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
      const { data, error } = await supabase
        .from('players')
        .update({ fun_stats: stats })
        .eq('id', player.id)
        .select('id')
        .single();
      
      if (error) throw error;
      if (!data) throw new Error('Permission denied: Unable to update this player.');
      
      // Update local state immediately so the card reflects the change
      setSelectedPlayerData(prev => prev ? {
        ...prev,
        player: { ...prev.player, funStats: stats }
      } : null);
      
      toast({ title: 'Stats Updated', description: `Fun stats updated for ${player.name}` });
    } catch (error: any) {
      toast({ title: 'Error', description: error.message || 'Failed to update stats', variant: 'destructive' });
    }
  };

  const handleSavePlayStyle = async (player: any, playStyles: string[]) => {
    try {
      const playStyleJson = JSON.stringify(playStyles);
      const { data, error } = await supabase
        .from('players')
        .update({ play_style: playStyleJson })
        .eq('id', player.id)
        .select('id, play_style')
        .single();
      
      if (error) throw error;
      if (!data) throw new Error('Permission denied: Unable to update this player.');
      
      // Update local state with the SAME format returned from DB (string)
      // This ensures consistency when parsing on re-open
      setSelectedPlayerData(prev => prev ? {
        ...prev,
        player: { ...prev.player, playStyle: data.play_style }
      } : null);
      
      toast({ title: 'Play Style Updated', description: `Play style updated for ${player.name}` });
    } catch (error: any) {
      toast({ title: 'Error', description: error.message || 'Failed to update play style', variant: 'destructive' });
    }
  };

  const handleSaveCardDesign = async (player: any, designId: string) => {
    try {
      const { data, error } = await supabase
        .from('players')
        .update({ card_design_id: designId })
        .eq('id', player.id)
        .select('id')
        .single();
      
      if (error) throw error;
      if (!data) throw new Error('Permission denied: Unable to update this player.');
      
      // Update local state immediately so the card reflects the change
      setSelectedPlayerData(prev => prev ? {
        ...prev,
        player: { ...prev.player, cardDesignId: designId }
      } : null);
      
      toast({ title: 'Card Design Updated', description: `Card design updated for ${player.name}` });
    } catch (error: any) {
      toast({ title: 'Error', description: error.message || 'Failed to update card design', variant: 'destructive' });
    }
  };

  const handleUpdatePhoto = async (player: any, file: File) => {
    try {
      toast({ title: 'Uploading Photo', description: `Processing and uploading photo for ${player.name}...` });
      
      // Import the utility dynamically to avoid circular deps
      const { prepareImageForUpload, isHeicFormat, isSupportedImageFormat, formatFileSize } = await import('@/utils/imageUtils');
      
      // Validate format
      if (isHeicFormat(file)) {
        throw new Error('HEIC/HEIF format is not supported. Please convert to JPEG or PNG.');
      }
      if (!isSupportedImageFormat(file)) {
        throw new Error(`Unsupported format: ${file.type || 'unknown'}. Use JPEG, PNG, or WebP.`);
      }
      
      // Process the image
      const processedBlob = await prepareImageForUpload(file, {
        maxDimension: 1024,
        quality: 0.85,
        outputFormat: 'image/jpeg',
      });
      
      logger.log(`[DashboardMobile] Photo processed: ${formatFileSize(file.size)} -> ${formatFileSize(processedBlob.size)}`);
      
      const fileName = `${player.id}/${Date.now()}.jpg`;
      
      const { error: uploadError } = await supabase.storage
        .from('player_photos')
        .upload(fileName, processedBlob, {
          contentType: 'image/jpeg',
          cacheControl: '3600',
          upsert: true,
        });
      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from('player_photos').getPublicUrl(fileName);
      
      const { data: updateData, error: updateError } = await supabase
        .from('players')
        .update({ photo_url: data.publicUrl })
        .eq('id', player.id)
        .select('id')
        .single();
      
      if (updateError) throw updateError;
      if (!updateData) throw new Error('Permission denied: Unable to update this player.');

      // IMMEDIATELY update the local state with the new photo URL
      // This ensures the card re-renders with the new photo without waiting for a full refetch
      setSelectedPlayerData(prev => prev ? {
        ...prev,
        player: {
          ...prev.player,
          photoUrl: data.publicUrl
        }
      } : null);

      toast({ title: 'Photo Updated', description: `Photo updated for ${player.name}` });
      // Refresh player data in background for full sync
      handlePlayerClick({ id: player.id });
    } catch (error: any) {
      logger.error('[DashboardMobile] Photo upload error:', error);
      toast({ 
        title: 'Upload Failed', 
        description: error.message || 'Failed to update photo. Please try again.', 
        variant: 'destructive' 
      });
    }
  };

  const handleDeletePhoto = async (player: any) => {
    if (!player.photoUrl) return;
    if (!confirm(`Delete photo for ${player.name}?`)) return;
    try {
      const { data, error } = await supabase
        .from('players')
        .update({ photo_url: null })
        .eq('id', player.id)
        .select('id')
        .single();
      
      if (error) throw error;
      if (!data) throw new Error('Permission denied: Unable to update this player.');
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

  // Player action handlers for FIFA card
  const handleEditPlayer = () => setEditModalOpen(true);
  const handleManageParents = () => setParentsModalOpen(true);
  const handleManageAttributes = () => setAttributesModalOpen(true);
  const handleManageObjectives = () => setObjectivesModalOpen(true);
  const handleManageComments = () => setCommentsModalOpen(true);
  const handleViewStats = () => setStatsModalOpen(true);
  const handleViewHistory = () => setHistoryModalOpen(true);

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
      const today = new Date().toISOString().split('T')[0];

      // ─── Batch 1: all independent queries fire in parallel ────────────────
      console.time('[perf] DashboardMobile batch-1');
      const [
        privacyResult,
        playersCountResult,
        eventsCountResult,
        upcomingEventsResult,
        recentResultsResult,
        staffCheckResult,
        linkedPlayerIds,
      ] = await Promise.all([
        supabase
          .from('team_privacy_settings')
          .select('team_id, show_scores_to_parents, show_scores_to_players')
          .in('team_id', teamIds),

        supabase
          .from('players')
          .select('id', { count: 'exact', head: true })
          .in('team_id', teamIds),

        supabase
          .from('events')
          .select('id', { count: 'exact', head: true })
          .in('team_id', teamIds)
          .gte('date', today),

        supabase
          .from('events')
          .select(`
            id, title, date, start_time, event_type, opponent, is_home, team_id, scores,
            teams!inner(
              id, name, logo_url, kit_designs, club_id,
              clubs!teams_club_id_fkey(name, logo_url)
            )
          `)
          .in('team_id', teamIds)
          .gte('date', today)
          .order('date', { ascending: true })
          .limit(5),

        supabase
          .from('events')
          .select(`
            id, title, date, start_time, event_type, opponent, team_id, scores,
            teams!inner(
              id, name, logo_url, kit_designs, club_id,
              clubs!teams_club_id_fkey(name, logo_url)
            )
          `)
          .in('team_id', teamIds)
          .lt('date', today)
          .not('scores', 'is', null)
          .order('date', { ascending: false })
          .limit(10),

        supabase
          .from('team_staff')
          .select('id')
          .eq('user_id', user.id)
          .limit(1),

        getLinkedPlayerIds(user.id),
      ]);
      console.timeEnd('[perf] DashboardMobile batch-1');

      const upcomingEventIds = upcomingEventsResult.data?.map(e => e.id) || [];
      const recentEventIds   = recentResultsResult.data?.map(e => e.id) || [];

      // ─── Batch 2: queries that depend on batch-1 IDs, also parallel ───────
      console.time('[perf] DashboardMobile batch-2');
      const [
        playerAvailabilityData,
        userAvailabilityResult,
        eventSelectionsResult,
      ] = await Promise.all([
        getPlayerAvailabilityForEvents(linkedPlayerIds, upcomingEventIds),

        upcomingEventIds.length > 0
          ? supabase
              .from('event_availability')
              .select('event_id, status, role')
              .eq('user_id', user.id)
              .in('event_id', upcomingEventIds)
          : Promise.resolve({ data: [] as Array<{ event_id: string; status: string; role: string }>, error: null }),

        recentEventIds.length > 0
          ? supabase
              .from('event_selections')
              .select('event_id, team_number, performance_category_id, performance_categories(name)')
              .in('event_id', recentEventIds)
          : Promise.resolve({ data: [] as any[], error: null }),
      ]);
      console.timeEnd('[perf] DashboardMobile batch-2');

      // ─── Privacy settings map ─────────────────────────────────────────────
      const settingsMap = new Map<string, any>();
      privacyResult.data?.forEach(setting => {
        settingsMap.set(setting.team_id, setting);
      });
      setTeamPrivacySettings(settingsMap);

      // ─── Upcoming events + availability map ───────────────────────────────
      const userAvailabilityData = userAvailabilityResult.data || [];

      const availabilityMap = new Map<string, string>();
      playerAvailabilityData.forEach(record => {
        availabilityMap.set(record.event_id, record.status);
      });
      userAvailabilityData.forEach(record => {
        if (!availabilityMap.has(record.event_id)) {
          availabilityMap.set(record.event_id, record.status);
        }
      });

      const upcomingEvents = upcomingEventsResult.data?.map(event => ({
        ...event,
        team_context: {
          name: event.teams.name,
          logo_url: event.teams.logo_url,
          club_name: event.teams.clubs?.name,
          club_logo_url: event.teams.clubs?.logo_url
        },
        user_availability: availabilityMap.get(event.id) || null
      })) || [];

      // ─── Recent results ───────────────────────────────────────────────────
      const eventSelectionsData = eventSelectionsResult.data || [];
      const categoryMap: Record<string, Record<number, string>> = {};
      eventSelectionsData.forEach(selection => {
        if (!categoryMap[selection.event_id]) {
          categoryMap[selection.event_id] = {};
        }
        const categoryName = (selection.performance_categories as any)?.name;
        if (categoryName && selection.team_number) {
          categoryMap[selection.event_id][selection.team_number] = categoryName;
        }
      });

      const recentResults: any[] = [];
      recentResultsResult.data?.forEach(event => {
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

      // ─── Pending availability (reuse batch-2 data, no extra round-trips) ──
      // Mirror the same logic as CalendarEventsMobile: query by user_id across
      // all roles, group by event, show as pending only when ALL roles pending.
      const now = new Date();
      const upcomingEventsForAvailability = upcomingEvents.filter(event =>
        new Date(event.date) > now
      );
      const futureEventIds = new Set(upcomingEventsForAvailability.map(e => e.id));

      // Group user's availability records by event_id (all roles, future events only)
      const availabilityByEvent = new Map<string, string[]>();
      userAvailabilityData
        .filter(a => futureEventIds.has(a.event_id))
        .forEach(a => {
          const list = availabilityByEvent.get(a.event_id) ?? [];
          list.push(a.status);
          availabilityByEvent.set(a.event_id, list);
        });

      // Also merge player_id-based records (parent/multi-player scenario)
      playerAvailabilityData
        .filter(a => futureEventIds.has(a.event_id))
        .forEach(a => {
          if (!availabilityByEvent.has(a.event_id)) {
            availabilityByEvent.set(a.event_id, [a.status]);
          }
        });

      // An event needs a response only if the user has been invited (has records)
      // AND every record for that event is still 'pending'
      const pendingAvailabilityData = upcomingEventsForAvailability
        .filter(event => {
          const statuses = availabilityByEvent.get(event.id);
          return statuses && statuses.length > 0 && statuses.every(s => s === 'pending');
        })
        .map(event => ({
          id: `${event.id}_${user.id}`,
          event_id: event.id,
          user_id: user.id,
          role: 'player',
          status: 'pending',
          events: { ...event, team_context: event.team_context }
        }));

      setStats({
        playersCount: playersCountResult.count || 0,
        eventsCount: eventsCountResult.count || 0,
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

  // Check if user is club-only (has club roles but no team roles)
  const isClubOnlyUser = () => {
    if (!clubs || clubs.length === 0) return false;
    // Check if user has any direct team roles (not club_member which is our marker)
    const hasTeamRole = teams?.some(t => t.userRole && t.userRole !== 'club_member' && t.userRole !== 'team_parent');
    const hasConnectedPlayers = connectedPlayers && connectedPlayers.length > 0;
    return !hasTeamRole && !hasConnectedPlayers;
  };

  const canManageTeam = () => {
    if (!profile?.roles) return false;
    // Club-only users (no team roles) should not create events
    if (isClubOnlyUser()) return false;
    const managementRoles = ['global_admin', 'club_admin', 'manager', 'team_manager', 'team_coach', 'team_assistant_manager', 'coach', 'staff'];
    return profile.roles.some(role => managementRoles.includes(role));
  };

  // Team Settings access - only for managers and admins (not coaches)
  const canAccessTeamSettings = () => {
    if (!profile?.roles) return false;
    const settingsRoles = ['global_admin', 'club_admin', 'team_manager', 'team_assistant_manager'];
    return profile.roles.some(role => settingsRoles.includes(role));
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
    <MobileLayout hideHeader>
      <div
        className="-mx-4 -mt-4 px-4"
        style={{ paddingTop: 'max(env(safe-area-inset-top), 1rem)' }}
      >
        <div className="space-y-4 pb-safe-bottom">

          {/* Condensed Header — date + greeting + avatar */}
          <div className="flex items-end justify-between pt-1 pb-1">
            <div className="min-w-0">
              <p className="text-xs text-white/60 font-medium">
                {format(new Date(), 'EEEE, d MMMM')}
              </p>
              <h1 className="text-3xl font-bold text-white leading-tight truncate">
                {getPersonalizedGreeting(profile, user?.email)}
              </h1>
            </div>
            <button
              onClick={() => setShowEditProfile(true)}
              className="flex-shrink-0 ml-3"
              aria-label="Edit profile"
            >
              <Avatar className="w-11 h-11 rounded-full ring-1 ring-white/20">
                {(profile as any)?.avatar_url ? (
                  <AvatarImage src={(profile as any).avatar_url} alt="Profile" className="rounded-full" />
                ) : null}
                <AvatarFallback className="rounded-full bg-white/15 text-base font-semibold text-white">
                  {getInitials((profile as any)?.first_name || user?.email?.charAt(0) || 'U')}
                </AvatarFallback>
              </Avatar>
            </button>
          </div>

          {/* Availability Status Banner - hide for club-only users */}
          {!isClubOnlyUser() && stats.pendingAvailability.length > 0 && (
            <div className="ios-card overflow-hidden">
              <Link to="/calendar" className="flex items-center justify-between px-4 py-2.5">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-orange-400/20 flex items-center justify-center">
                    <AlertCircle className="w-4 h-4 text-orange-300" />
                  </div>
                  <div>
                    <span className="text-sm font-medium text-white">Availability Requests</span>
                    <p className="text-xs text-white/60">{stats.pendingAvailability.length} pending response{stats.pendingAvailability.length > 1 ? 's' : ''}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className="bg-orange-400/20 text-orange-200 hover:bg-orange-400/20 text-xs border-0">{stats.pendingAvailability.length}</Badge>
                  <ChevronRight className="w-4 h-4 text-white/50" />
                </div>
              </Link>
            </div>
          )}
          {!isClubOnlyUser() && stats.pendingAvailability.length === 0 && (
            <div className="ios-card px-4 py-2.5">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-emerald-400/20 flex items-center justify-center">
                  <Check className="w-4 h-4 text-emerald-300" />
                </div>
                <span className="text-sm text-white">All caught up!</span>
              </div>
            </div>
          )}

          {/* Your Teams - compact selector */}
          {(allTeams?.length || teams?.length) ? (() => {
            const teamsList = (allTeams?.length ? allTeams : teams) || [];
            const selectedTeamObj = viewMode === 'single' ? currentTeam : null;
            return (
              <>
                <button
                  onClick={() => setShowTeamPicker(true)}
                  className="w-full ios-card px-4 py-3 flex items-center justify-between active:bg-white/15 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {selectedTeamObj ? (
                      selectedTeamObj.logoUrl ? (
                        <img
                          src={selectedTeamObj.logoUrl}
                          alt={selectedTeamObj.name}
                          className="w-9 h-9 rounded-full object-cover flex-shrink-0"
                        />
                      ) : (
                        <div className="w-9 h-9 rounded-full bg-white/15 flex items-center justify-center text-xs font-semibold text-white flex-shrink-0">
                          {getInitials(selectedTeamObj.name)}
                        </div>
                      )
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-white/15 flex items-center justify-center flex-shrink-0">
                        <Users className="w-4 h-4 text-white" />
                      </div>
                    )}
                    <div className="min-w-0 text-left">
                      <p className="text-[10px] font-medium text-white/50 uppercase tracking-wide">Active Team</p>
                      <p className="text-sm font-semibold text-white truncate">
                        {selectedTeamObj ? selectedTeamObj.name : 'All Teams'}
                      </p>
                    </div>
                  </div>
                  <ChevronDown className="w-5 h-5 text-white/50 flex-shrink-0" />
                </button>

                <Sheet open={showTeamPicker} onOpenChange={setShowTeamPicker}>
                  <SheetContent side="bottom" className="h-auto max-h-[80vh] rounded-t-3xl overflow-y-auto pb-safe">
                    <SheetHeader className="pb-3">
                      <SheetTitle className="text-lg">Select Team</SheetTitle>
                    </SheetHeader>
                    <div className="space-y-2">
                      <button
                        onClick={() => { setViewMode('all'); setShowTeamPicker(false); }}
                        className={`w-full flex items-center gap-3 p-3 rounded-xl transition-colors ${
                          viewMode === 'all' ? 'bg-primary/10 border-2 border-primary' : 'bg-muted border-2 border-transparent'
                        }`}
                      >
                        <div className="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center flex-shrink-0">
                          <Users className="w-5 h-5 text-primary" />
                        </div>
                        <div className="flex-1 text-left">
                          <p className="text-sm font-semibold text-white">All Teams</p>
                          <p className="text-xs text-white/60">Integrated view across teams</p>
                        </div>
                        {viewMode === 'all' && <Check className="w-5 h-5 text-primary flex-shrink-0" />}
                      </button>
                      {teamsList.map((team) => {
                        const isSelected = viewMode === 'single' && currentTeam?.id === team.id;
                        return (
                          <button
                            key={team.id}
                            onClick={() => { setCurrentTeam(team); setShowTeamPicker(false); }}
                            className={`w-full flex items-center gap-3 p-3 rounded-xl transition-colors ${
                              isSelected ? 'bg-primary/10 border-2 border-primary' : 'bg-muted border-2 border-transparent'
                            }`}
                          >
                            {team.logoUrl ? (
                              <img src={team.logoUrl} alt={team.name} className="w-10 h-10 rounded-full object-cover flex-shrink-0" />
                            ) : (
                              <div className="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center text-sm font-semibold text-primary flex-shrink-0">
                                {getInitials(team.name)}
                              </div>
                            )}
                            <div className="flex-1 text-left min-w-0">
                              <p className="text-sm font-semibold text-white truncate">{team.name}</p>
                              {team.ageGroup && <p className="text-xs text-white/60 truncate">{team.ageGroup}</p>}
                            </div>
                            {isSelected && <Check className="w-5 h-5 text-primary flex-shrink-0" />}
                          </button>
                        );
                      })}
                    </div>
                  </SheetContent>
                </Sheet>
              </>
            );
          })() : null}

          {/* Connected Players */}
          {connectedPlayers?.length > 0 && (
            <div className="ios-card overflow-hidden">
              <div className="px-4 py-2 border-b border-white/10">
                <h2 className="text-xs font-medium text-white/50 uppercase tracking-wide">Your Players</h2>
              </div>
              <div className="px-4 py-2.5">
                <div className="flex flex-wrap gap-1.5">
                  {connectedPlayers.map((player) => (
                    <button
                      key={player.id}
                      onClick={() => handlePlayerClick(player)}
                      className="flex items-center gap-1.5 bg-white/10 rounded-full px-2.5 py-1 hover:bg-white/15 active:bg-white/20 transition-colors"
                    >
                      {player.photoUrl ? (
                        <img 
                          src={player.photoUrl} 
                          alt={player.name}
                          className="w-5 h-5 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-[10px] font-semibold text-white">
                          {getInitials(player.name)}
                        </div>
                      )}
                      <span className="text-xs font-medium text-white">{player.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Quick Actions */}
          <div className="ios-card overflow-hidden">
            <div className="px-4 py-2 border-b border-white/10">
              <h2 className="text-xs font-medium text-white/50 uppercase tracking-wide">Quick Actions</h2>
            </div>
            
            {canManageTeam() && (
              <>
                <button
                  onClick={() => currentTeam && setShowMobileEventForm(true)}
                  disabled={!currentTeam}
                  className={`w-full flex items-center justify-between px-4 py-2.5 ${!currentTeam ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${currentTeam ? 'bg-emerald-400/20' : 'bg-white/10'}`}>
                      <Plus className={`w-4 h-4 ${currentTeam ? 'text-emerald-300' : 'text-white/40'}`} />
                    </div>
                    <div className="flex flex-col items-start">
                      <span className={`text-sm ${currentTeam ? 'text-white' : 'text-white/40'}`}>Create Event</span>
                      {!currentTeam && <span className="text-xs text-white/40">Select a team first</span>}
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-white/40" />
                </button>
                <div className="h-px bg-white/10 mx-4" />
              </>
            )}
            <Link to="/players" className="w-full flex items-center justify-between px-4 py-2.5">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-sky-400/20 flex items-center justify-center">
                  <Users className="w-4 h-4 text-sky-300" />
                </div>
                <span className="text-sm text-white">View Team</span>
              </div>
              <ChevronRight className="w-4 h-4 text-white/40" />
            </Link>
            <div className="h-px bg-white/10 mx-4" />
            
            {canAccessTeamSettings() && currentTeam && (
              <>
                <Link to={`/team-settings/${currentTeam.id}`} className="w-full flex items-center justify-between px-4 py-2.5">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-white/15 flex items-center justify-center">
                      <Settings className="w-4 h-4 text-white" />
                    </div>
                    <span className="text-sm text-white">Team Settings</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-white/40" />
                </Link>
                <div className="h-px bg-white/10 mx-4" />
              </>
            )}

            {/* Club Management - for users with clubs */}
            {clubs && clubs.length > 0 && (
              <>
                <Link to="/clubs" className="w-full flex items-center justify-between px-4 py-2.5">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-indigo-400/20 flex items-center justify-center">
                      <Building2 className="w-4 h-4 text-indigo-300" />
                    </div>
                    <span className="text-sm text-white">Club Management</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-white/40" />
                </Link>
                <div className="h-px bg-white/10 mx-4" />
              </>
            )}
            
            <button
              onClick={() => setShowEditProfile(true)}
              className="w-full flex items-center justify-between px-4 py-2.5"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-purple-400/20 flex items-center justify-center">
                  <User className="w-4 h-4 text-purple-200" />
                </div>
                <span className="text-sm text-white">Edit Profile</span>
              </div>
              <ChevronRight className="w-4 h-4 text-white/40" />
            </button>
            <div className="h-px bg-white/10 mx-4" />
            <button
              onClick={() => setShowManageConnections(true)}
              className="w-full flex items-center justify-between px-4 py-2.5"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-orange-400/20 flex items-center justify-center">
                  <Link2 className="w-4 h-4 text-orange-300" />
                </div>
                <span className="text-sm text-white">Manage Connections</span>
              </div>
              <ChevronRight className="w-4 h-4 text-white/40" />
            </button>
          </div>

          {/* Upcoming Events */}
          <div className="ios-card overflow-hidden">
            <div className="px-4 py-2 border-b border-white/10">
              <h2 className="text-xs font-medium text-white/50 uppercase tracking-wide">Upcoming Events</h2>
            </div>
            
            {stats.upcomingEvents.length > 0 ? (
              <>
                {stats.upcomingEvents.map((event, index) => (
                  <div key={event.id}>
                    {index > 0 && <div className="h-px bg-white/10 mx-4" />}
                    <div 
                      className="flex gap-3 px-4 py-3 cursor-pointer hover:bg-white/5 active:bg-white/10 transition-colors"
                      onClick={() => navigate(`/calendar?eventId=${event.id}`)}
                    >
                      {/* Date column */}
                      <div className="flex flex-col items-center justify-center min-w-[40px]">
                        <span className="text-[10px] text-white/50 uppercase font-medium">
                          {format(new Date(event.date), 'MMM')}
                        </span>
                        <span className="text-xl font-bold text-white">
                          {format(new Date(event.date), 'd')}
                        </span>
                      </div>
                      
                      {/* Colored accent - based on availability status */}
                      <div className={`w-1 self-stretch rounded-full ${
                        event.user_availability === 'available'
                          ? 'bg-emerald-400'
                          : event.user_availability === 'unavailable'
                            ? 'bg-red-400'
                            : event.user_availability === 'pending'
                              ? 'bg-amber-400'
                              : event.event_type === 'training'
                                ? 'bg-purple-400'
                                : 'bg-white/30'
                      }`} />
                      
                      {/* Event details */}
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-white truncate">
                          {event.event_type === 'training' ? event.title : `vs ${event.opponent || 'TBD'}`}
                        </p>
                        <p className="text-sm text-white/70">
                          {getConversationalTime(event)}
                        </p>
                        <p className="text-sm text-white/50">
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
                <div className="h-px bg-white/10" />
                <Link to="/calendar" className="flex items-center justify-center px-4 py-3 text-primary-foreground font-medium" style={{ color: '#b89fff' }}>
                  View All Events
                </Link>
              </>
            ) : (
              <div className="px-4 py-6 text-center text-white/60">
                No upcoming events
              </div>
            )}
          </div>

          {/* Recent Results */}
          <div className="ios-card overflow-hidden">
            <div className="px-4 py-2 border-b border-white/10">
              <h2 className="text-xs font-medium text-white/50 uppercase tracking-wide">Recent Results</h2>
            </div>
            
            {stats.recentResults.length > 0 ? (
              <>
                {stats.recentResults.map((event, index) => {
                  const showScores = shouldShowScoresForEvent(event);
                  const result = showScores ? getResultFromScores(event.our_score, event.opponent_score) : null;
                  return (
                    <div key={event.id}>
                      {index > 0 && <div className="h-px bg-white/10 mx-4" />}
                      <div className="flex gap-3 px-4 py-3">
                        {/* Date column */}
                        <div className="flex flex-col items-center justify-center min-w-[40px]">
                          <span className="text-[10px] text-white/50 uppercase font-medium">
                            {format(new Date(event.date), 'MMM')}
                          </span>
                          <span className="text-xl font-bold text-white">
                            {format(new Date(event.date), 'd')}
                          </span>
                        </div>
                        
                        {/* Colored accent based on result - gray if scores hidden */}
                        <div className={`w-1 self-stretch rounded-full ${
                          !showScores ? 'bg-white/30' :
                          result?.result === 'W' ? 'bg-emerald-400' : 
                          result?.result === 'L' ? 'bg-red-400' : 'bg-white/40'
                        }`} />
                        
                        {/* Result details */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <p className="font-semibold text-white truncate">
                              vs {event.opponent}
                            </p>
                            {showScores ? (
                              <div className="flex items-center gap-2 shrink-0">
                                <span className="text-lg font-bold text-white">
                                  {event.our_score}-{event.opponent_score}
                                </span>
                                {result && (
                                  <Badge className={`${result.color} text-white text-xs px-1.5 border-0`}>
                                    {result.result}
                                  </Badge>
                                )}
                              </div>
                            ) : (
                              <span className="text-sm text-white/50 italic">
                                Score hidden
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-white/50">
                            {event.team_context?.name}
                          </p>
                          {event.category_name && (
                            <Badge variant="outline" className="text-xs mt-1 border-white/20 text-white/80 bg-white/5">
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
              <div className="px-4 py-6 text-center text-white/60">
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
              onEdit={handleEditPlayer}
              onManageParents={handleManageParents}
              onManageAttributes={handleManageAttributes}
              onManageObjectives={handleManageObjectives}
              onManageComments={handleManageComments}
              onViewStats={handleViewStats}
              onViewHistory={handleViewHistory}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Player Action Modals from Dashboard */}
      {selectedPlayerData && (
        <>
          <EditPlayerModal
            player={selectedPlayerData.player}
            isOpen={editModalOpen}
            onClose={() => setEditModalOpen(false)}
            onSave={() => {
              handlePlayerClick({ id: selectedPlayerData.player.id });
              setEditModalOpen(false);
            }}
          />
          <PlayerStatsModal
            player={selectedPlayerData.player}
            isOpen={statsModalOpen}
            onClose={() => setStatsModalOpen(false)}
          />
          <PlayerAttributesModal
            player={selectedPlayerData.player}
            isOpen={attributesModalOpen}
            onClose={() => setAttributesModalOpen(false)}
            onSave={() => {
              handlePlayerClick({ id: selectedPlayerData.player.id });
              setAttributesModalOpen(false);
            }}
          />
          <PlayerObjectivesModal
            player={selectedPlayerData.player}
            isOpen={objectivesModalOpen}
            onClose={() => setObjectivesModalOpen(false)}
            onSave={() => {
              handlePlayerClick({ id: selectedPlayerData.player.id });
              setObjectivesModalOpen(false);
            }}
          />
          <PlayerCommentsModal
            player={selectedPlayerData.player}
            isOpen={commentsModalOpen}
            onClose={() => setCommentsModalOpen(false)}
            onSave={() => {
              handlePlayerClick({ id: selectedPlayerData.player.id });
              setCommentsModalOpen(false);
            }}
          />
          <PlayerHistoryModal
            player={selectedPlayerData.player}
            isOpen={historyModalOpen}
            onClose={() => setHistoryModalOpen(false)}
          />
          <PlayerParentsModal
            player={selectedPlayerData.player}
            isOpen={parentsModalOpen}
            onClose={() => setParentsModalOpen(false)}
            onSave={() => {
              handlePlayerClick({ id: selectedPlayerData.player.id });
              setParentsModalOpen(false);
            }}
          />
        </>
      )}
    </MobileLayout>
  );
}
