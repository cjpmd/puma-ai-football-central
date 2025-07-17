import { supabase } from '@/integrations/supabase/client';
import { DatabaseEvent } from '@/types/event';

export interface TeamTimeInfo {
  teamNumber: number;
  startTime: string | null;
  meetingTime: string | null;
}

export interface UserTeamContext {
  userTeamConnections: string[]; // team IDs user is connected to
  isMultipleTeams: boolean;
  displayTime: {
    start_time: string | null;
    meeting_time: string | null;
    display_text: string;
  };
}

/**
 * Get team-specific timing information for an event
 */
export const getEventTeamTimes = async (eventId: string): Promise<TeamTimeInfo[]> => {
  try {
    const { data, error } = await supabase
      .from('event_teams')
      .select('team_number, start_time, meeting_time')
      .eq('event_id', eventId)
      .order('team_number');

    if (error) throw error;

    return data?.map(team => ({
      teamNumber: team.team_number,
      startTime: team.start_time,
      meetingTime: team.meeting_time
    })) || [];
  } catch (error) {
    console.error('Error loading event team times:', error);
    return [];
  }
};

/**
 * Determine which teams a user is connected to through players or staff
 */
export const getUserTeamConnections = async (userId: string, eventId: string): Promise<string[]> => {
  try {
    const connections = new Set<string>();

    // Check user teams (direct connection)
    const { data: userTeams } = await supabase
      .from('user_teams')
      .select('team_id')
      .eq('user_id', userId);

    userTeams?.forEach(ut => connections.add(ut.team_id));

    // Check player connections
    const { data: playerConnections } = await supabase
      .from('user_players')
      .select('players!inner(team_id)')
      .eq('user_id', userId);

    playerConnections?.forEach(pc => {
      const player = pc.players as any;
      if (player?.team_id) connections.add(player.team_id);
    });

    // Check staff connections
    const { data: staffConnections } = await supabase
      .from('user_staff')
      .select('team_staff!inner(team_id)')
      .eq('user_id', userId);

    staffConnections?.forEach(sc => {
      const staff = sc.team_staff as any;
      if (staff?.team_id) connections.add(staff.team_id);
    });

    return Array.from(connections);
  } catch (error) {
    console.error('Error getting user team connections:', error);
    return [];
  }
};

/**
 * Get the appropriate timing display for a user based on their team connections
 */
export const getUserContextForEvent = async (
  event: DatabaseEvent,
  userId: string
): Promise<UserTeamContext> => {
  try {
    // Get user's team connections
    const userTeamConnections = await getUserTeamConnections(userId, event.id);
    
    // Get event team times
    const eventTeamTimes = await getEventTeamTimes(event.id);
    
    // Filter team times for teams the user is connected to
    const relevantTeamTimes = eventTeamTimes.filter(tt => 
      userTeamConnections.includes(event.team_id)
    );

    // Determine display logic
    if (relevantTeamTimes.length === 0) {
      // User not connected to any teams in this event - show event defaults
      return {
        userTeamConnections,
        isMultipleTeams: false,
        displayTime: {
          start_time: event.start_time,
          meeting_time: event.meeting_time || null,
          display_text: event.start_time || 'TBD'
        }
      };
    } else if (relevantTeamTimes.length === 1) {
      // User connected to one team - show that team's specific times
      const teamTime = relevantTeamTimes[0];
      return {
        userTeamConnections,
        isMultipleTeams: false,
        displayTime: {
          start_time: teamTime.startTime || event.start_time,
          meeting_time: teamTime.meetingTime || event.meeting_time || null,
          display_text: teamTime.startTime || event.start_time || 'TBD'
        }
      };
    } else {
      // User connected to multiple teams with potentially different times
      const uniqueStartTimes = [...new Set(relevantTeamTimes.map(tt => tt.startTime).filter(Boolean))];
      
      if (uniqueStartTimes.length === 1) {
        // All teams have the same start time
        return {
          userTeamConnections,
          isMultipleTeams: true,
          displayTime: {
            start_time: uniqueStartTimes[0],
            meeting_time: relevantTeamTimes[0].meetingTime || event.meeting_time || null,
            display_text: uniqueStartTimes[0] || 'TBD'
          }
        };
      } else {
        // Multiple different start times
        return {
          userTeamConnections,
          isMultipleTeams: true,
          displayTime: {
            start_time: null,
            meeting_time: null,
            display_text: 'Multiple Times'
          }
        };
      }
    }
  } catch (error) {
    console.error('Error getting user context for event:', error);
    return {
      userTeamConnections: [],
      isMultipleTeams: false,
      displayTime: {
        start_time: event.start_time,
        meeting_time: event.meeting_time || null,
        display_text: event.start_time || 'TBD'
      }
    };
  }
};

/**
 * Format time display for calendar components
 */
export const formatEventTimeDisplay = (context: UserTeamContext): string => {
  const { displayTime, isMultipleTeams } = context;
  
  if (displayTime.display_text === 'Multiple Times') {
    return '🕐 Multiple Times - See Details';
  }
  
  if (displayTime.meeting_time && displayTime.start_time) {
    return `🕐 Meet: ${displayTime.meeting_time} | Start: ${displayTime.start_time}`;
  }
  
  if (displayTime.start_time) {
    return `🕐 ${displayTime.start_time}`;
  }
  
  return 'Time TBD';
};