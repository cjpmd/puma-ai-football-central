/**
 * useOfflineAwareQuery — wraps useQuery with localStorage persistence.
 *
 * On mount: returns cached data as placeholderData immediately (0 ms).
 * On success: writes fresh data to localStorage.
 * Returns staleMins so the caller can display a "Last updated X min ago" badge.
 *
 * Used by the 3 match-day critical screens:
 *   - GameDayView (team sheet + subs + player cards)
 *   - MatchDayPackView
 *   - PostGameEditor
 */

import { useEffect } from 'react';
import { useQuery, type UseQueryOptions } from '@tanstack/react-query';
import { readCache, writeCache, staleMins as computeStaleMins } from '@/lib/offlineCache';

interface UseOfflineAwareQueryOptions<T> extends UseQueryOptions<T> {
  cacheKey: string;
}

export function useOfflineAwareQuery<T>({
  cacheKey,
  ...queryOptions
}: UseOfflineAwareQueryOptions<T>) {
  const cached = readCache<T>(cacheKey);

  const result = useQuery<T>({
    ...queryOptions,
    // Serve stale localStorage data immediately while fresh data loads
    placeholderData: cached?.data ?? undefined,
  } as UseQueryOptions<T>);

  // Write to localStorage whenever fresh data arrives
  useEffect(() => {
    if (result.data && !result.isPlaceholderData) {
      writeCache(cacheKey, result.data);
    }
  }, [result.data, result.isPlaceholderData, cacheKey]);

  const staleMinsValue = result.isPlaceholderData
    ? computeStaleMins(cached)
    : null;

  return { ...result, staleMins: staleMinsValue };
}
