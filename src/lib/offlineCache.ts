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

/**
 * Drop every offline snapshot this device holds.
 *
 * Called on sign-out. These snapshots are written per user and per scope, but
 * they outlive the session that wrote them, so without this the next person to
 * sign in on a shared device (a coach handing a phone to an assistant) can be
 * shown the previous account's fixtures and results while their own load runs.
 */
export function clearOfflineCache(): void {
  try {
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(PREFIX)) keys.push(key);
    }
    keys.forEach((key) => localStorage.removeItem(key));
  } catch {
    // Storage unavailable — nothing cached, nothing to clear
  }
}
