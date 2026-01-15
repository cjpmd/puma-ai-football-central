import { useTeamPrivacy } from '@/hooks/useTeamPrivacy';
import { useEffectiveRole } from '@/hooks/useEffectiveRole';

/**
 * Hook to determine if scores should be shown based on team privacy settings
 * and the user's effective role.
 */
export const useScoreVisibility = (teamId: string) => {
  const { settings, loading } = useTeamPrivacy(teamId);
  const { isRestrictedParent, isRestrictedPlayer, hasStaffAccess } = useEffectiveRole();

  const shouldShowScores = () => {
    // Staff always see scores regardless of settings
    if (hasStaffAccess) return true;
    
    // Check parent restrictions (only for parents without staff access)
    if (isRestrictedParent && !settings.showScoresToParents) return false;
    
    // Check player restrictions (only for players without staff access)
    if (isRestrictedPlayer && !settings.showScoresToPlayers) return false;
    
    return true;
  };

  return {
    shouldShowScores: shouldShowScores(),
    loading,
    hasStaffAccess
  };
};
