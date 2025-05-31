
import { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { supabase } from '@/integrations/supabase/client';

interface Permission {
  resource: string;
  action: string;
  scope?: 'global' | 'club' | 'team';
  resourceId?: string;
}

interface AuthorizationContextType {
  hasPermission: (permission: Permission) => boolean;
  canManageUsers: boolean;
  canInviteUsers: boolean;
  canManageTeams: boolean;
  canManageClubs: boolean;
  canViewAnalytics: boolean;
  isGlobalAdmin: boolean;
  isClubAdmin: (clubId?: string) => boolean;
  isTeamManager: (teamId?: string) => boolean;
  userPermissions: string[];
  loading: boolean;
}

const AuthorizationContext = createContext<AuthorizationContextType | undefined>(undefined);

export const AuthorizationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, profile, teams, clubs } = useAuth();
  const [userPermissions, setUserPermissions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user && profile) {
      loadUserPermissions();
    } else {
      setUserPermissions([]);
      setLoading(false);
    }
  }, [user, profile, teams, clubs]);

  const loadUserPermissions = async () => {
    try {
      setLoading(true);
      
      // Start with base permissions from user roles
      const basePermissions = new Set<string>();
      
      if (profile?.roles) {
        profile.roles.forEach(role => {
          switch (role) {
            case 'global_admin':
              basePermissions.add('*:*'); // Global admin can do everything
              break;
            case 'club_admin':
              basePermissions.add('users:invite');
              basePermissions.add('users:manage');
              basePermissions.add('clubs:manage');
              basePermissions.add('teams:manage');
              basePermissions.add('analytics:view');
              break;
            case 'team_manager':
              basePermissions.add('users:invite');
              basePermissions.add('teams:manage');
              basePermissions.add('players:manage');
              basePermissions.add('staff:manage');
              basePermissions.add('analytics:view');
              break;
            case 'coach':
              basePermissions.add('players:view');
              basePermissions.add('events:manage');
              basePermissions.add('analytics:view');
              break;
            case 'staff':
              basePermissions.add('players:view');
              basePermissions.add('events:view');
              break;
            case 'parent':
              basePermissions.add('players:view:own');
              basePermissions.add('events:view:own');
              break;
            case 'player':
              basePermissions.add('profile:view:own');
              basePermissions.add('events:view:own');
              break;
          }
        });
      }

      // Add team-specific permissions
      teams.forEach(team => {
        // Team managers have full control over their teams
        basePermissions.add(`teams:manage:${team.id}`);
        basePermissions.add(`players:manage:${team.id}`);
        basePermissions.add(`staff:manage:${team.id}`);
        basePermissions.add(`events:manage:${team.id}`);
      });

      // Add club-specific permissions
      clubs.forEach(club => {
        basePermissions.add(`clubs:manage:${club.id}`);
        basePermissions.add(`teams:view:${club.id}`);
      });

      setUserPermissions(Array.from(basePermissions));
    } catch (error) {
      console.error('Error loading user permissions:', error);
      setUserPermissions([]);
    } finally {
      setLoading(false);
    }
  };

  const hasPermission = (permission: Permission): boolean => {
    if (loading) return false;
    if (!user) return false;

    // Global admin check
    if (userPermissions.includes('*:*')) return true;

    const { resource, action, scope, resourceId } = permission;
    
    // Check exact permission
    const exactPermission = resourceId 
      ? `${resource}:${action}:${resourceId}`
      : `${resource}:${action}`;
    
    if (userPermissions.includes(exactPermission)) return true;

    // Check general permission (without resource ID)
    if (userPermissions.includes(`${resource}:${action}`)) return true;

    // Check wildcard permissions
    if (userPermissions.includes(`${resource}:*`)) return true;
    if (userPermissions.includes(`*:${action}`)) return true;

    return false;
  };

  const canManageUsers = hasPermission({ resource: 'users', action: 'manage' });
  const canInviteUsers = hasPermission({ resource: 'users', action: 'invite' });
  const canManageTeams = hasPermission({ resource: 'teams', action: 'manage' });
  const canManageClubs = hasPermission({ resource: 'clubs', action: 'manage' });
  const canViewAnalytics = hasPermission({ resource: 'analytics', action: 'view' });

  const isGlobalAdmin = profile?.roles?.includes('global_admin') || false;
  
  const isClubAdmin = (clubId?: string): boolean => {
    if (isGlobalAdmin) return true;
    if (!profile?.roles?.includes('club_admin')) return false;
    if (!clubId) return true; // General club admin check
    return clubs.some(club => club.id === clubId);
  };

  const isTeamManager = (teamId?: string): boolean => {
    if (isGlobalAdmin) return true;
    if (!teamId) {
      return profile?.roles?.includes('team_manager') || teams.length > 0;
    }
    return teams.some(team => team.id === teamId);
  };

  const value: AuthorizationContextType = {
    hasPermission,
    canManageUsers,
    canInviteUsers,
    canManageTeams,
    canManageClubs,
    canViewAnalytics,
    isGlobalAdmin,
    isClubAdmin,
    isTeamManager,
    userPermissions,
    loading,
  };

  return (
    <AuthorizationContext.Provider value={value}>
      {children}
    </AuthorizationContext.Provider>
  );
};

export const useAuthorization = () => {
  const context = useContext(AuthorizationContext);
  if (!context) {
    throw new Error('useAuthorization must be used within an AuthorizationProvider');
  }
  return context;
};
