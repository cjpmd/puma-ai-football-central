/**
 * Offline cache for match-day critical screens.
 *
 * Stores the last successful data load in localStorage so the app remains
 * usable if pitch-side WiFi drops mid-match.  The hook returns cached data
 * instantly (0 ms) while React Query fetches fresh data in the background.
 *
 * Critical screens: GameDayView (team sheet + subs + player cards)
 */

export interface CachedEntry<T> {
  data: T;
  savedAt: number; // ms since epoch
}

const PREFIX = 'origin_offline_';

export function readCache<T>(key: string): CachedEntry<T> | null {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    if (!raw) return null;
    return JSON.parse(raw) as CachedEntry<T>;
  } catch {
    return null;
  }
}

export function writeCache<T>(key: string, data: T): void {
  try {
    const entry: CachedEntry<T> = { data, savedAt: Date.now() };
    localStorage.setItem(PREFIX + key, JSON.stringify(entry));
  } catch {
    // localStorage full or unavailable — degrade gracefully
  }
}

/** Returns how many minutes ago the cache entry was saved, or null if not cached. */
export function staleMins(entry: CachedEntry<unknown> | null): number | null {
  if (!entry) return null;
  return Math.floor((Date.now() - entry.savedAt) / 60_000);
}

/** Hook: "last updated X min ago" label — only rendered when serving stale data. */
export function staleLabel(mins: number | null): string | null {
  if (mins === null) return null;
  if (mins < 1) return 'Just updated';
  if (mins === 1) return 'Updated 1 min ago';
  return `Updated ${mins} min ago`;
}
