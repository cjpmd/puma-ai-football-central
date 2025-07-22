import { supabase } from '@/integrations/supabase/client';

export interface UserRole {
  role: 'player' | 'parent' | 'staff';
  sourceId: string;
  sourceType: string;
}

export interface AvailabilityStatus {
  role: 'player' | 'parent' | 'staff';
  status: 'pending' | 'available' | 'unavailable';
  sourceId: string;
}

export const multiRoleAvailabilityService = {
  async getUserRolesForEvent(eventId: string, userId: string): Promise<UserRole[]> {
    const { data, error } = await supabase.rpc('get_user_event_roles', {
      p_event_id: eventId,
      p_user_id: userId
    });

    if (error) throw error;

    return data.map((row: any) => ({
      role: row.role,
      sourceId: row.source_id,
      sourceType: row.source_type
    }));
  },

  async getUserAvailabilityStatuses(eventId: string, userId: string): Promise<AvailabilityStatus[]> {
    const { data, error } = await supabase
      .from('event_availability')
      .select('role, status')
      .eq('event_id', eventId)
      .eq('user_id', userId);

    if (error) throw error;

    return data.map((row: any) => ({
      role: row.role,
      status: row.status,
      sourceId: userId
    }));
  },

  async updateRoleAvailability(
    eventId: string,
    userId: string,
    role: 'player' | 'parent' | 'staff',
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
    role: 'player' | 'parent' | 'staff' = 'staff'
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