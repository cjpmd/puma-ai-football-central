/**
 * Offline query persistence for Origin Sports.
 *
 * Uses TanStack Query's sync-storage persister to serialise the
 * query cache to localStorage.  When a coach opens the app with
 * no signal (e.g. on a pitch with poor coverage), they still see
 * the last-known player list, squad, and match details.
 *
 * Cache entries expire after 24 hours so stale data never
 * silently substitutes for fresh data beyond one session.
 *
 * Usage: imported and wired up in App.tsx via persistQueryClient()
 */

import { QueryClient } from '@tanstack/react-query';
import { persistQueryClient } from '@tanstack/react-query-persist-client';
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister';

const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Attach localStorage persistence to the given QueryClient.
 * Call once during app initialisation (before rendering).
 */
export function attachQueryPersistence(queryClient: QueryClient) {
  // Guard: localStorage may be unavailable in some Capacitor contexts
  // or when private browsing blocks storage writes.
  let storage: Storage | undefined;
  try {
    localStorage.setItem('__puma_test__', '1');
    localStorage.removeItem('__puma_test__');
    storage = localStorage;
  } catch {
    // Storage unavailable — skip persistence silently
    return;
  }

  const persister = createSyncStoragePersister({
    storage,
    key: 'origin-sports-query-cache',
  });

  persistQueryClient({
    queryClient,
    persister,
    maxAge: CACHE_TTL_MS,
    // Only persist queries that opt in via `meta.persist: true`
    // This prevents large or sensitive data from being cached.
    dehydrateOptions: {
      shouldDehydrateQuery: (query) =>
        query.state.status === 'success' &&
        (query.meta?.persist as boolean | undefined) === true,
    },
  });
}
