import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { Club } from '@/types/club';

interface ClubContextType {
  currentClub: Club | null;
  setCurrentClub: (club: Club | null) => void;
  availableClubs: Club[];
  isMultiClubUser: boolean;
  filteredTeams: any[];
  isLoading: boolean;
}

const ClubContext = createContext<ClubContextType | undefined>(undefined);

const STORAGE_KEY = 'selectedClubId';

export function ClubProvider({ children }: { children: ReactNode }) {
  const { clubs, teams } = useAuth();
  const [currentClub, setCurrentClubState] = useState<Club | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const isMultiClubUser = clubs.length > 1;

  // Initialize club selection
  useEffect(() => {
    if (clubs.length === 0) {
      setCurrentClubState(null);
      setIsLoading(false);
      return;
    }

    // If single club, auto-select it
    if (clubs.length === 1) {
      setCurrentClubState(clubs[0]);
      setIsLoading(false);
      return;
    }

    // Multi-club: try to restore from localStorage
    const savedClubId = localStorage.getItem(STORAGE_KEY);
    if (savedClubId) {
      const savedClub = clubs.find(c => c.id === savedClubId);
      if (savedClub) {
        setCurrentClubState(savedClub);
        setIsLoading(false);
        return;
      }
    }

    // Default to first club if no saved selection
    setCurrentClubState(clubs[0]);
    setIsLoading(false);
  }, [clubs]);

  // Filter teams based on current club
  const filteredTeams = React.useMemo(() => {
    if (!currentClub || !teams) return teams || [];
    
    // Filter teams that belong to the current club
    return teams.filter(team => {
      // Check if team is in club_teams
      return team.clubId === currentClub.id;
    });
  }, [currentClub, teams]);

  // Enhanced setter that persists to localStorage
  const setCurrentClub = (club: Club | null) => {
    setCurrentClubState(club);
    if (club) {
      localStorage.setItem(STORAGE_KEY, club.id);
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  };

  const value: ClubContextType = {
    currentClub,
    setCurrentClub,
    availableClubs: clubs,
    isMultiClubUser,
    filteredTeams,
    isLoading,
  };

  return <ClubContext.Provider value={value}>{children}</ClubContext.Provider>;
}

export function useClubContext() {
  const context = useContext(ClubContext);
  if (context === undefined) {
    throw new Error('useClubContext must be used within a ClubProvider');
  }
  return context;
}
