import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useClubContext } from './ClubContext';
import { Team } from '@/types';

type ViewMode = 'all' | 'single';

interface TeamContextType {
  currentTeam: Team | null;
  setCurrentTeam: (team: Team | null) => void;
  availableTeams: Team[];
  isMultiTeamUser: boolean;
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  isLoading: boolean;
}

const TeamContext = createContext<TeamContextType | undefined>(undefined);

const STORAGE_KEY = 'selectedTeamId';
const VIEW_MODE_STORAGE_KEY = 'teamViewMode';

export function TeamProvider({ children }: { children: ReactNode }) {
  const { filteredTeams, isLoading: clubLoading } = useClubContext();
  const [currentTeam, setCurrentTeamState] = useState<Team | null>(null);
  const [viewMode, setViewModeState] = useState<ViewMode>('all');
  const [isLoading, setIsLoading] = useState(true);

  const isMultiTeamUser = filteredTeams.length > 1;

  // Initialize team selection and view mode
  useEffect(() => {
    if (clubLoading) return;

    if (filteredTeams.length === 0) {
      setCurrentTeamState(null);
      setIsLoading(false);
      return;
    }

    // Restore view mode from localStorage
    const savedViewMode = localStorage.getItem(VIEW_MODE_STORAGE_KEY) as ViewMode | null;
    if (savedViewMode) {
      setViewModeState(savedViewMode);
    }

    // If single team, auto-select it and set to single mode
    if (filteredTeams.length === 1) {
      setCurrentTeamState(filteredTeams[0]);
      setViewModeState('single');
      setIsLoading(false);
      return;
    }

    // Multi-team: try to restore from localStorage
    const savedTeamId = localStorage.getItem(STORAGE_KEY);
    if (savedTeamId) {
      const savedTeam = filteredTeams.find(t => t.id === savedTeamId);
      if (savedTeam) {
        setCurrentTeamState(savedTeam);
        setIsLoading(false);
        return;
      }
    }

    // Default to first team and 'all' mode for multi-team users
    setCurrentTeamState(filteredTeams[0]);
    setViewModeState('all');
    setIsLoading(false);
  }, [filteredTeams, clubLoading]);

  // Enhanced setter that persists to localStorage
  const setCurrentTeam = (team: Team | null) => {
    setCurrentTeamState(team);
    if (team) {
      localStorage.setItem(STORAGE_KEY, team.id);
      // When selecting a specific team, switch to single mode
      setViewMode('single');
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  };

  // Enhanced view mode setter that persists to localStorage
  const setViewMode = (mode: ViewMode) => {
    setViewModeState(mode);
    localStorage.setItem(VIEW_MODE_STORAGE_KEY, mode);
    
    // If switching to 'all' mode, don't change currentTeam
    // If switching to 'single' mode and no team selected, select first
    if (mode === 'single' && !currentTeam && filteredTeams.length > 0) {
      setCurrentTeam(filteredTeams[0]);
    }
  };

  const value: TeamContextType = {
    currentTeam,
    setCurrentTeam,
    availableTeams: filteredTeams,
    isMultiTeamUser,
    viewMode,
    setViewMode,
    isLoading: isLoading || clubLoading,
  };

  return <TeamContext.Provider value={value}>{children}</TeamContext.Provider>;
}

export function useTeamContext() {
  const context = useContext(TeamContext);
  if (context === undefined) {
    throw new Error('useTeamContext must be used within a TeamProvider');
  }
  return context;
}
