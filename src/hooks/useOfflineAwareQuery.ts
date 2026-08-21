/**
 * useOfflineAwareQuery — useQuery seeded from the on-device snapshot.
 *
 * On mount the last successful payload is read synchronously from storage and
 * handed to React Query as `initialData`, so the screen paints real content on
 * the first frame instead of a spinner. A fresh fetch runs in the background
 * and overwrites both the cache and the display when it lands.
 *
 * The seed is `initialData`, not `placeholderData`, and that distinction is the
 * point: placeholder data is inert — React Query reports `dataUpdatedAt` of 0,
 * treats the query as having nothing, and refetches on every mount regardless
 * of how fresh the snapshot is. Seeding with `initialData` plus the timestamp
 * it was written at gives the query a real age, so staleTime applies normally:
 * a snapshot from ten seconds ago is used as-is, one from an hour ago triggers
 * a refetch.
 *
 * Returns `staleMins` — how old the displayed data is while it is still coming
 * from the snapshot, or null once a live response has replaced it. Callers use
 * it to show the "Updated X min ago · Offline mode" banner.
 */

import { useEffect, useMemo } from 'react';
import { useQuery, type UseQueryOptions } from '@tanstack/react-query';
import { readCache, writeCache, staleMins as computeStaleMins } from '@/lib/offlineCache';

interface UseOfflineAwareQueryOptions<T> extends UseQueryOptions<T> {
  cacheKey: string;
}

export function useOfflineAwareQuery<T>({
  cacheKey,
  ...queryOptions
}: UseOfflineAwareQueryOptions<T>) {
  // Read once per cacheKey rather than on every render — the payload can be a
  // whole dashboard, and JSON.parse of it is not free.
  const cached = useMemo(() => readCache<T>(cacheKey), [cacheKey]);

  if (import.meta.env.DEV) {
    console.debug(
      `[offline-cache] ${cacheKey}`,
      cached ? `HIT (age ${computeStaleMins(cached)} min)` : 'MISS',
    );
  }

  const result = useQuery<T>({
    ...queryOptions,
    initialData: cached?.data,
    initialDataUpdatedAt: cached?.savedAt,
  } as UseQueryOptions<T>);

  const { data, dataUpdatedAt, isSuccess } = result;
  const cachedAt = cached?.savedAt ?? 0;

  // Persist only genuinely newer data: when the query is still serving the
  // seed, dataUpdatedAt equals the timestamp it was seeded with, and writing
  // that back would refresh the age of data nothing has revalidated.
  useEffect(() => {
    if (isSuccess && data !== undefined && dataUpdatedAt > cachedAt) {
      writeCache(cacheKey, data);
    }
  }, [isSuccess, data, dataUpdatedAt, cachedAt, cacheKey]);

  const servingFromCache = cached != null && dataUpdatedAt <= cachedAt;

  return {
    ...result,
    /** Age in minutes of the displayed snapshot, or null once revalidated. */
    staleMins: servingFromCache ? computeStaleMins(cached) : null,
  };
}
