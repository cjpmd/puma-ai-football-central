import { useSmartView, ViewRole } from '@/contexts/SmartViewContext';

/**
 * Hook to determine effective role for privacy checks.
 * Staff members who are also parents should retain staff-level access
 * even when viewing as a parent.
 */
export const useEffectiveRole = () => {
  const { availableViews, currentView } = useSmartView();
  
  // User has staff-level access if they have any staff role available
  const staffRoles: ViewRole[] = ['coach', 'team_manager', 'club_admin', 'global_admin'];
  const hasStaffAccess = availableViews.some(v => staffRoles.includes(v));
  
  return {
    currentView,
    // Only apply parent restrictions if user doesn't have staff access
    isRestrictedParent: currentView === 'parent' && !hasStaffAccess,
    // Only apply player restrictions if user doesn't have staff access
    isRestrictedPlayer: currentView === 'player' && !hasStaffAccess,
    hasStaffAccess,
    availableViews
  };
};
