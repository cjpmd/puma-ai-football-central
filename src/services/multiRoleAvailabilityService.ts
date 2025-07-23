import { supabase } from '@/integrations/supabase/client';

export interface UserRole {
  role: 'player' | 'staff';
  sourceId: string;
  sourceType: string;
  playerName?: string; // For parent-linked players
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

    // Get player names for parent-linked players
    const rolesWithNames = await Promise.all(data.map(async (row: any) => {
      let playerName = undefined;
      
      if (row.role === 'player' && row.source_type === 'player_link') {
        const { data: player } = await supabase
          .from('players')
          .select('name')
          .eq('id', row.source_id)
          .single();
        playerName = player?.name;
      }

      return {
        role: row.role,
        sourceId: row.source_id,
        sourceType: row.source_type,
        playerName
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
  }
};