import { supabase } from '@/integrations/supabase/client';

export interface UserRole {
  role: 'player' | 'staff';
  sourceId: string;
  sourceType: string;
  playerName?: string;
  staffName?: string;
}

export interface AvailabilityStatus {
  role: 'player' | 'staff';
  status: 'pending' | 'available' | 'unavailable';
  sourceId: string;
  playerName?: string;
  playerId?: string;
}

export const multiRoleAvailabilityService = {
  async getUserRolesForEvent(eventId: string, userId: string): Promise<UserRole[]> {
    const { data, error } = await supabase.rpc('get_user_event_roles', {
      p_event_id: eventId,
      p_user_id: userId
    });

    if (error) throw error;

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
    // Get the linked player for this user
    const { data: userPlayer } = await supabase
      .from('user_players')
      .select('player_id, players(name)')
      .eq('user_id', userId)
      .maybeSingle();

    const results: AvailabilityStatus[] = [];

    // For player role, fetch by player_id (shared across all linked users)
    if (userPlayer?.player_id) {
      const { data: playerAvailability } = await supabase
        .from('event_availability')
        .select('role, status')
        .eq('event_id', eventId)
        .eq('player_id', userPlayer.player_id)
        .eq('role', 'player')
        .maybeSingle();

      if (playerAvailability) {
        results.push({
          role: 'player',
          status: playerAvailability.status as 'pending' | 'available' | 'unavailable',
          sourceId: userPlayer.player_id,
          playerName: userPlayer.players?.name,
          playerId: userPlayer.player_id
        });
      }
    }

    // For staff role, fetch by user_id (not shared)
    const { data: staffAvailability } = await supabase
      .from('event_availability')
      .select('role, status')
      .eq('event_id', eventId)
      .eq('user_id', userId)
      .eq('role', 'staff')
      .maybeSingle();

    if (staffAvailability) {
      results.push({
        role: 'staff',
        status: staffAvailability.status as 'pending' | 'available' | 'unavailable',
        sourceId: userId
      });
    }

    return results;
  },

  async updateRoleAvailability(
    eventId: string,
    userId: string,
    role: 'player' | 'staff',
    status: 'available' | 'unavailable' | 'pending'
  ): Promise<void> {
    if (role === 'player') {
      // Get the linked player ID
      const { data: userPlayer } = await supabase
        .from('user_players')
        .select('player_id')
        .eq('user_id', userId)
        .maybeSingle();

      if (!userPlayer?.player_id) {
        throw new Error('No linked player found for user');
      }

      // Check if a record exists for this player
      const { data: existing } = await supabase
        .from('event_availability')
        .select('id')
        .eq('event_id', eventId)
        .eq('player_id', userPlayer.player_id)
        .eq('role', 'player')
        .maybeSingle();

      if (existing) {
        // Update existing record
        const { error } = await supabase
          .from('event_availability')
          .update({
            status,
            last_updated_by: userId,
            responded_at: status !== 'pending' ? new Date().toISOString() : null,
            updated_at: new Date().toISOString()
          })
          .eq('id', existing.id);

        if (error) throw error;
      } else {
        // Create new record
        const { error } = await supabase
          .from('event_availability')
          .insert({
            event_id: eventId,
            user_id: userId,
            player_id: userPlayer.player_id,
            role: 'player',
            status,
            last_updated_by: userId,
            responded_at: status !== 'pending' ? new Date().toISOString() : null
          });

        if (error) throw error;
      }
    } else {
      // Staff availability - user-based
      const { error } = await supabase
        .from('event_availability')
        .upsert({
          event_id: eventId,
          user_id: userId,
          role: 'staff',
          status,
          last_updated_by: userId,
          responded_at: status !== 'pending' ? new Date().toISOString() : null
        }, {
          onConflict: 'event_id,user_id,role'
        });

      if (error) throw error;
    }
  },

  async createPlayerAvailabilityRecord(
    eventId: string,
    userId: string,
    playerId: string
  ): Promise<void> {
    // Check if a record already exists for this player
    const { data: existing } = await supabase
      .from('event_availability')
      .select('id, status')
      .eq('event_id', eventId)
      .eq('player_id', playerId)
      .eq('role', 'player')
      .maybeSingle();

    if (existing) return; // Record already exists

    // Create new pending record
    const { error } = await supabase
      .from('event_availability')
      .insert({
        event_id: eventId,
        user_id: userId,
        player_id: playerId,
        role: 'player',
        status: 'pending',
        notification_sent_at: new Date().toISOString()
      });

    if (error) throw error;
  },

  async createStaffAvailabilityRecord(
    eventId: string,
    userId: string,
    role: 'player' | 'staff' = 'staff'
  ): Promise<void> {
    if (role === 'player') {
      // For player role, use player-based record
      const { data: userPlayer } = await supabase
        .from('user_players')
        .select('player_id')
        .eq('user_id', userId)
        .maybeSingle();

      if (userPlayer?.player_id) {
        await this.createPlayerAvailabilityRecord(eventId, userId, userPlayer.player_id);
      }
      return;
    }

    // Staff role - user-based
    const { data: existing } = await supabase
      .from('event_availability')
      .select('id, status')
      .eq('event_id', eventId)
      .eq('user_id', userId)
      .eq('role', 'staff')
      .maybeSingle();

    if (existing) return;

    const { error } = await supabase
      .from('event_availability')
      .insert({
        event_id: eventId,
        user_id: userId,
        role: 'staff',
        status: 'pending',
        notification_sent_at: new Date().toISOString()
      });

    if (error) throw error;
  },

  async createStaffAvailabilityForEvent(eventId: string, staffSelections: any[]): Promise<void> {
    const availabilityRecords = [];

    for (const staff of staffSelections) {
      const { data: userStaff } = await supabase
        .from('user_staff')
        .select('user_id')
        .eq('staff_id', staff.staffId)
        .maybeSingle();

      if (!userStaff) continue;

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
    const userRoles = await this.getUserRolesForEvent(eventId, userId);
    
    for (const role of userRoles) {
      if (role.role === 'player') {
        // Get player_id for this user
        const { data: userPlayer } = await supabase
          .from('user_players')
          .select('player_id')
          .eq('user_id', userId)
          .maybeSingle();

        if (userPlayer?.player_id) {
          await this.createPlayerAvailabilityRecord(eventId, userId, userPlayer.player_id);
        }
      } else {
        await this.createStaffAvailabilityRecord(eventId, userId, 'staff');
      }
    }
  },

  async isUserInvitedToEvent(eventId: string, userId: string): Promise<boolean> {
    try {
      const { data: invitations, error: invError } = await supabase
        .from('event_invitations')
        .select('user_id, player_id, staff_id, invitee_type')
        .eq('event_id', eventId);
      if (invError) throw invError;

      if (!invitations || invitations.length === 0) {
        return false;
      }

      const [{ data: userPlayers }, { data: userStaff }] = await Promise.all([
        supabase.from('user_players').select('player_id').eq('user_id', userId),
        supabase.from('user_staff').select('staff_id').eq('user_id', userId)
      ]);

      const linkedPlayerIds = (userPlayers || []).map((r: any) => r.player_id);
      const linkedStaffIds = (userStaff || []).map((r: any) => r.staff_id);

      const invited = invitations.some((inv: any) =>
        (inv.player_id && linkedPlayerIds.includes(inv.player_id)) ||
        (inv.staff_id && linkedStaffIds.includes(inv.staff_id)) ||
        (inv.user_id === userId && inv.invitee_type === 'staff')
      );

      return invited;
    } catch (error) {
      console.error('Error checking event invitation:', error);
      return false;
    }
  },

  async getInvitedRolesForUser(eventId: string, userId: string): Promise<Array<'player' | 'staff'>> {
    try {
      const { data: invitations, error: invError } = await supabase
        .from('event_invitations')
        .select('user_id, player_id, staff_id, invitee_type')
        .eq('event_id', eventId);
      if (invError) throw invError;

      if (!invitations || invitations.length === 0) {
        return [];
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
        (inv.staff_id && linkedStaffIds.includes(inv.staff_id)) ||
        (inv.user_id === userId && inv.invitee_type === 'staff')
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
