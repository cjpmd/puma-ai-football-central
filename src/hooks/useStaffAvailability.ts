import { useState, useEffect } from 'react';
import { multiRoleAvailabilityService, type AvailabilityStatus, type UserRole } from '@/services/multiRoleAvailabilityService';

export const useStaffAvailability = (eventId?: string, userId?: string) => {
  const [userRoles, setUserRoles] = useState<UserRole[]>([]);
  const [availabilityStatuses, setAvailabilityStatuses] = useState<AvailabilityStatus[]>([]);
  const [loading, setLoading] = useState(false);

  const loadData = async () => {
    if (!eventId || !userId) return;
    
    setLoading(true);
    try {
      const [roles, statuses] = await Promise.all([
        multiRoleAvailabilityService.getUserRolesForEvent(eventId, userId),
        multiRoleAvailabilityService.getUserAvailabilityStatuses(eventId, userId)
      ]);
      
      setUserRoles(roles);
      setAvailabilityStatuses(statuses);
    } catch (error) {
      console.error('Error loading user roles and availability:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [eventId, userId]);

  const updateAvailability = async (role: 'player' | 'staff', status: 'available' | 'unavailable') => {
    if (!eventId || !userId) return;
    
    try {
      await multiRoleAvailabilityService.updateRoleAvailability(eventId, userId, role, status);
      await loadData(); // Refresh data
    } catch (error) {
      console.error('Error updating availability:', error);
      throw error;
    }
  };

  const getRoleStatus = (role: 'player' | 'staff'): 'pending' | 'available' | 'unavailable' | null => {
    const status = availabilityStatuses.find(s => s.role === role);
    return status?.status || null;
  };

  const hasMultipleRoles = userRoles.length > 1;

  return {
    userRoles,
    availabilityStatuses,
    loading,
    hasMultipleRoles,
    updateAvailability,
    getRoleStatus,
    refreshData: loadData
  };
};