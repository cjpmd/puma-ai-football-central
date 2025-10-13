import { supabase } from '@/integrations/supabase/client';

export interface UserRole {
  role: 'player' | 'staff';
  sourceId: string;
  sourceType: string;
  playerName?: string; // For parent-linked players
  staffName?: string; // For staff members
}

export interface AvailabilityStatus {
  role: 'player' | 'staff';
  status: 'pending' | 'available' | 'unavailable';
  sourceId: string;
  playerName?: string; // For parent-linked players
}

export const multiRoleAvailabilityService = {
  async getUserRolesForEvent(eventId: string, userId: string): Promise<UserRole[]> {
    const { data, error } = await supabase.rpc('get_user_event_roles', {
      p_event_id: eventId,
      p_user_id: userId
    });

    if (error) throw error;

    // Get player names for parent-linked players and staff names
    const rolesWithNames = await Promise.all(data.map(async (row: any) => {
      let playerName = undefined;
      let staffName = undefined;
      
      if (row.role === 'player' && row.source_type === 'player_link') {
        const { data: player } = await supabase
          .from('players')
          .select('name')
          .eq('id', row.source_id)
          .single();
        playerName = player?.name;
      }

      if (row.role === 'staff' && row.source_type === 'staff_link') {
        const { data: staff } = await supabase
          .from('team_staff')
          .select('name')
          .eq('id', row.source_id)
          .single();
        staffName = staff?.name;
      }

      return {
        role: row.role,
        sourceId: row.source_id,
        sourceType: row.source_type,
        playerName,
        staffName
      };
    }));

    return rolesWithNames;
  },

  async getUserAvailabilityStatuses(eventId: string, userId: string): Promise<AvailabilityStatus[]> {
    const { data, error } = await supabase
      .from('event_availability')
      .select('role, status')
      .eq('event_id', eventId)
      .eq('user_id', userId);

    if (error) throw error;

    // Get player names for player role records (these might be parent-linked players)
    const statusesWithNames = await Promise.all(data.map(async (row: any) => {
      let playerName = undefined;
      
      if (row.role === 'player') {
        // Try to find the player this availability record is for
        const { data: userPlayer } = await supabase
          .from('user_players')
          .select('player_id, players(name)')
          .eq('user_id', userId)
          .single();
        
        if (userPlayer?.players) {
          playerName = userPlayer.players.name;
        }
      }

      return {
        role: row.role,
        status: row.status,
        sourceId: userId,
        playerName
      };
    }));

    return statusesWithNames;
  },

  async updateRoleAvailability(
    eventId: string,
    userId: string,
    role: 'player' | 'staff',
    status: 'available' | 'unavailable' | 'pending'
  ): Promise<void> {
    const { error } = await supabase
      .from('event_availability')
      .upsert({
        event_id: eventId,
        user_id: userId,
        role,
        status,
        responded_at: status !== 'pending' ? new Date().toISOString() : null
      }, {
        onConflict: 'event_id,user_id,role'
      });

    if (error) throw error;
  },

  async createStaffAvailabilityRecord(
    eventId: string,
    userId: string,
    role: 'player' | 'staff' = 'staff'
  ): Promise<void> {
    const { error } = await supabase
      .from('event_availability')
      .upsert({
        event_id: eventId,
        user_id: userId,
        role,
        status: 'pending',
        notification_sent_at: new Date().toISOString()
      }, {
        onConflict: 'event_id,user_id,role'
      });

    if (error) throw error;
  },

  async createStaffAvailabilityForEvent(eventId: string, staffSelections: any[]): Promise<void> {
    const availabilityRecords = [];

    for (const staff of staffSelections) {
      // Get user linked to this staff member
      const { data: userStaff, error: userError } = await supabase
        .from('user_staff')
        .select('user_id')
        .eq('staff_id', staff.staffId)
        .maybeSingle();

      if (userError || !userStaff) continue;

      availabilityRecords.push({
        event_id: eventId,
        user_id: userStaff.user_id,
        role: 'staff',
        status: 'pending',
        notification_sent_at: new Date().toISOString()
      });
    }

    if (availabilityRecords.length > 0) {
      const { error } = await supabase
        .from('event_availability')
        .upsert(availabilityRecords, {
          onConflict: 'event_id,user_id,role'
        });

      if (error) throw error;
    }
  },

  async ensureAllRoleAvailabilityRecords(eventId: string, userId: string): Promise<void> {
    // Get all roles this user has for this event
    const userRoles = await this.getUserRolesForEvent(eventId, userId);
    
    // Create availability records for each role the user has
    const records = userRoles.map(role => ({
      event_id: eventId,
      user_id: userId,
      role: role.role,
      status: 'pending' as const,
      notification_sent_at: new Date().toISOString()
    }));

    if (records.length > 0) {
      const { error } = await supabase
        .from('event_availability')
        .upsert(records, {
          onConflict: 'event_id,user_id,role'
        });

      if (error) throw error;
    }
  },

  // Check if user was invited to an event (in ANY role: direct user, linked player, or linked staff)
  async isUserInvitedToEvent(eventId: string, userId: string): Promise<boolean> {
    try {
      // Fetch any invitations for the event
      const { data: invitations, error: invError } = await supabase
        .from('event_invitations')
        .select('id, user_id, player_id, staff_id')
        .eq('event_id', eventId);
      if (invError) throw invError;

      // If no invitations exist for this event, treat as "everyone" event
      if (!invitations || invitations.length === 0) {
        return true;
      }

      // Collect linked player and staff IDs for this user
      const [{ data: userPlayers }, { data: userStaff }] = await Promise.all([
        supabase.from('user_players').select('player_id').eq('user_id', userId),
        supabase.from('user_staff').select('staff_id').eq('user_id', userId)
      ]);

      const linkedPlayerIds = (userPlayers || []).map((r: any) => r.player_id);
      const linkedStaffIds = (userStaff || []).map((r: any) => r.staff_id);

      // Determine if invited in any way
      const invited = invitations.some((inv: any) =>
        inv.user_id === userId ||
        (inv.player_id && linkedPlayerIds.includes(inv.player_id)) ||
        (inv.staff_id && linkedStaffIds.includes(inv.staff_id))
      );

      return invited;
    } catch (error) {
      console.error('Error checking event invitation:', error);
      return false;
    }
  },

  // Get which roles the user is invited for this event (player/staff)
  async getInvitedRolesForUser(eventId: string, userId: string): Promise<Array<'player' | 'staff'>> {
    try {
      const { data: invitations, error: invError } = await supabase
        .from('event_invitations')
        .select('user_id, player_id, staff_id')
        .eq('event_id', eventId);
      if (invError) throw invError;

      // Everyone event => include roles the user actually has
      if (!invitations || invitations.length === 0) {
        const [{ data: userPlayers }, { data: userStaff }] = await Promise.all([
          supabase.from('user_players').select('player_id').eq('user_id', userId),
          supabase.from('user_staff').select('staff_id').eq('user_id', userId)
        ]);
        const roles: Array<'player' | 'staff'> = [];
        if ((userPlayers || []).length > 0) roles.push('player');
        if ((userStaff || []).length > 0 || invitations?.some((i: any) => i.user_id === userId)) roles.push('staff');
        return Array.from(new Set(roles));
      }

      const [{ data: userPlayers }, { data: userStaff }] = await Promise.all([
        supabase.from('user_players').select('player_id').eq('user_id', userId),
        supabase.from('user_staff').select('staff_id').eq('user_id', userId)
      ]);
      const linkedPlayerIds = (userPlayers || []).map((r: any) => r.player_id);
      const linkedStaffIds = (userStaff || []).map((r: any) => r.staff_id);

      const invitedPlayer = invitations.some((inv: any) =>
        (inv.player_id && linkedPlayerIds.includes(inv.player_id))
      );
      const invitedStaff = invitations.some((inv: any) =>
        inv.user_id === userId || (inv.staff_id && linkedStaffIds.includes(inv.staff_id))
      );

      const roles: Array<'player' | 'staff'> = [];
      if (invitedPlayer) roles.push('player');
      if (invitedStaff) roles.push('staff');
      return roles;
    } catch (error) {
      console.error('Error getting invited roles for user:', error);
      return [];
    }
  }
};