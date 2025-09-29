import { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { useAuthorization } from './AuthorizationContext';

export type ViewRole = 'parent' | 'coach' | 'team_manager' | 'club_admin' | 'global_admin';

interface SmartViewContextType {
  currentView: ViewRole;
  setCurrentView: (view: ViewRole) => void;
  availableViews: ViewRole[];
  isMultiRoleUser: boolean;
  primaryRole: ViewRole;
  getViewLabel: (view: ViewRole) => string;
}

const SmartViewContext = createContext<SmartViewContextType | undefined>(undefined);

export const SmartViewProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { profile, connectedPlayers, teams, clubs } = useAuth();
  const { isGlobalAdmin, isClubAdmin, isTeamManager } = useAuthorization();
  
  const [currentView, setCurrentView] = useState<ViewRole>('parent');
  const [availableViews, setAvailableViews] = useState<ViewRole[]>([]);
  const [primaryRole, setPrimaryRole] = useState<ViewRole>('parent');

  // Determine available views based on user's roles and relationships
  useEffect(() => {
    if (!profile) return;

    const views: ViewRole[] = [];
    console.log('SmartView determining views for user:', profile.id);
    console.log('Connected players:', connectedPlayers?.length);
    console.log('Teams:', teams?.length);
    console.log('Clubs:', clubs?.length);
    console.log('Is global admin:', isGlobalAdmin);
    
    // Check for parent role (has connected players)
    if (connectedPlayers && connectedPlayers.length > 0) {
      views.push('parent');
      console.log('Added parent view');
    }
    
    // Check for coach role (based on user teams relationship)
    if (teams && teams.length > 0) {
      views.push('coach');
      console.log('Added coach view');
    }
    
    // Check for team manager role
    if (isTeamManager()) {
      views.push('team_manager');
      console.log('Added team_manager view');
    }
    
    // Check for club admin role
    if (isClubAdmin()) {
      views.push('club_admin');
      console.log('Added club_admin view');
    }
    
    // Check for global admin role
    if (isGlobalAdmin) {
      views.push('global_admin');
      console.log('Added global_admin view');
    }

    // Determine primary role based on activity and hierarchy
    let primary: ViewRole = 'parent';
    
    if (views.includes('global_admin')) {
      primary = 'global_admin';
    } else if (views.includes('club_admin')) {
      primary = 'club_admin';
    } else if (views.includes('team_manager')) {
      primary = 'team_manager';
    } else if (views.includes('coach') && teams.length > 0) {
      primary = 'coach';
    } else if (views.includes('parent') && connectedPlayers.length > 0) {
      primary = 'parent';
    }

    console.log('Available views:', views);
    console.log('Primary role:', primary);
    
    setAvailableViews(views);
    setPrimaryRole(primary);
    
    // Set current view to primary role if not already set to a valid view
    if (!views.includes(currentView)) {
      setCurrentView(primary);
      console.log('Set current view to:', primary);
    }
  }, [profile, connectedPlayers, teams, clubs, isGlobalAdmin, isClubAdmin, isTeamManager, currentView]);

  const isMultiRoleUser = availableViews.length > 1;

  const getViewLabel = (view: ViewRole): string => {
    const labels: Record<ViewRole, string> = {
      parent: 'Parent',
      coach: 'Coach',
      team_manager: 'Team Manager',
      club_admin: 'Club Admin',
      global_admin: 'System Admin'
    };
    return labels[view];
  };

  const value: SmartViewContextType = {
    currentView,
    setCurrentView,
    availableViews,
    isMultiRoleUser,
    primaryRole,
    getViewLabel,
  };

  return (
    <SmartViewContext.Provider value={value}>
      {children}
    </SmartViewContext.Provider>
  );
};

export const useSmartView = () => {
  const context = useContext(SmartViewContext);
  if (!context) {
    throw new Error('useSmartView must be used within a SmartViewProvider');
  }
  return context;
};