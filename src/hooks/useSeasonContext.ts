import { useState, useEffect, useMemo } from 'react';

export interface Season {
  label: string;
  start: string;  // ISO date YYYY-MM-DD
  end: string;    // ISO date YYYY-MM-DD
  type: 'season' | 'off_season';
}

export type SeasonState = 'ACTIVE_SEASON' | 'OFF_SEASON';

export interface SeasonContextResult {
  currentSeason: Season | null;
  allSeasons: Season[];
  seasonState: SeasonState;
  selectedSeason: Season | null;
  setSelectedSeason: (season: Season) => void;
  nextSeasonStart: string | null;
}

function formatSeasonLabel(startDateStr: string): string {
  const startYear = new Date(startDateStr).getFullYear();
  return `${startYear}/${String(startYear + 1).slice(-2)} Season`;
}

function shiftYears(dateStr: string, years: number): string {
  const d = new Date(dateStr);
  d.setFullYear(d.getFullYear() + years);
  return d.toISOString().split('T')[0];
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

function buildAllSeasons(baseStart: string, baseEnd: string, today: string): Season[] {
  const YEARS_BACK = 2;
  const result: Season[] = [];

  for (let i = YEARS_BACK; i >= 1; i--) {
    const start = shiftYears(baseStart, -i);
    const end = shiftYears(baseEnd, -i);
    result.push({ label: formatSeasonLabel(start), start, end, type: 'season' });

    // Off-season between this season and the next one
    const nextStart = shiftYears(baseStart, -(i - 1)); // baseStart when i===1
    const offStart = addDays(end, 1);
    const offEnd = addDays(nextStart, -1);
    if (offStart <= offEnd) {
      result.push({
        label: `Off Season ${new Date(offStart).getFullYear()}`,
        start: offStart,
        end: offEnd,
        type: 'off_season',
      });
    }
  }

  // Current defined season
  result.push({ label: formatSeasonLabel(baseStart), start: baseStart, end: baseEnd, type: 'season' });

  // If today is after the current season, add the current off-season period
  if (today > baseEnd) {
    const nextSeasonStart = shiftYears(baseStart, 1);
    const offStart = addDays(baseEnd, 1);
    const offEnd = addDays(nextSeasonStart, -1);
    if (offStart <= offEnd) {
      result.push({
        label: `Off Season ${new Date(offStart).getFullYear()}`,
        start: offStart,
        end: offEnd,
        type: 'off_season',
      });
    }
  }

  return result;
}

export function useSeasonContext(
  seasonStart: string | null | undefined,
  seasonEnd: string | null | undefined,
): SeasonContextResult {
  const today = new Date().toISOString().split('T')[0];
  const [selectedSeason, setSelectedSeason] = useState<Season | null>(null);

  const { allSeasons, currentSeason, seasonState, nextSeasonStart } = useMemo(() => {
    if (!seasonStart || !seasonEnd) {
      return { allSeasons: [], currentSeason: null, seasonState: 'OFF_SEASON' as SeasonState, nextSeasonStart: null };
    }

    const seasons = buildAllSeasons(seasonStart, seasonEnd, today);

    // Active period: whichever entry today falls within
    const activePeriod = seasons.find(s => today >= s.start && today <= s.end);
    // Current season: the season-type entry containing today, or last completed season
    const activeSeason = seasons.find(s => s.type === 'season' && today >= s.start && today <= s.end);
    const lastCompletedSeason = [...seasons].reverse().find(s => s.type === 'season' && s.end < today);
    const current = activePeriod || lastCompletedSeason || seasons[seasons.length - 1] || null;

    const state: SeasonState = activeSeason ? 'ACTIVE_SEASON' : 'OFF_SEASON';

    // Next upcoming season (for off-season banner)
    const nextSeason = seasons.find(s => s.type === 'season' && s.start > today);

    return {
      allSeasons: seasons,
      currentSeason: current,
      seasonState: state,
      nextSeasonStart: nextSeason?.start ?? null,
    };
  }, [seasonStart, seasonEnd, today]);

  // Default selectedSeason: current active season, or most recent completed season
  useEffect(() => {
    if (!selectedSeason && currentSeason) {
      // In off-season, default to last completed season not the off-season entry
      const activeSeason = allSeasons.find(s => s.type === 'season' && today >= s.start && today <= s.end);
      const lastCompleted = [...allSeasons].reverse().find(s => s.type === 'season' && s.end <= today);
      setSelectedSeason(activeSeason || lastCompleted || currentSeason);
    }
  }, [currentSeason]);

  return {
    currentSeason,
    allSeasons,
    seasonState,
    selectedSeason,
    setSelectedSeason,
    nextSeasonStart,
  };
}
