/**
 * Offline query persistence for Origin Sports.
 *
 * Serialises part of the React Query cache to storage so a coach opening the
 * app with no signal (on a pitch, in a clubhouse) still sees the last-known
 * roster, fixtures and team setup instead of a spinner.
 *
 * Two rules keep this honest, and both live in this file so the policy is
 * reviewable in one place:
 *
 *  1. Only the query families listed in PERSISTED_QUERY_PREFIXES are written to
 *     storage.  Everything else stays in memory for the session and is gone on
 *     restart.  A one-off query can still opt in with `meta: { persist: true }`.
 *
 *  2. Those same families get a gcTime matching the persistence window.  React
 *     Query garbage-collects a restored entry whose age already exceeds its
 *     gcTime, so a cache persisted for 24h but collected after 30m is not
 *     persisted at all — it just looks like it is.  Scoping the long gcTime to
 *     the persisted families (rather than raising the global default) keeps
 *     everything else evictable, which matters on a low-end device holding a
 *     season of events.
 */

import { QueryClient, QueryKey } from '@tanstack/react-query';
import { persistQueryClient } from '@tanstack/react-query-persist-client';
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister';
import { logger } from '@/lib/logger';

const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const STORAGE_KEY = 'origin-sports-query-cache';

/**
 * Query families that must survive an app restart, keyed by prefix — a prefix
 * matches any query key that starts with it, so ['team-players'] covers
 * ['team-players', <teamId>].
 *
 * Everything here is team-scoped reference data, never user-scoped: persisted
 * entries outlive the session that fetched them, so anything tied to *who* is
 * signed in belongs in memory only.  Sign-out clears the store regardless
 * (see clearPersistedQueryCache) but that is the backstop, not the policy.
 */
export const PERSISTED_QUERY_PREFIXES: readonly QueryKey[] = [
  // Squad / roster — the same data under three historical key names
  ['team_players'],
  ['team-players'],
  ['active-players'],
  ['squad-players'],
  // Fixtures
  ['upcoming_events'],
  ['today_match'],
  // Team setup and settings
  ['team'],
  ['team-data'],
  ['team-settings'],
  ['performance-categories'],
];

const matchesPrefix = (queryKey: QueryKey, prefix: QueryKey): boolean =>
  Array.isArray(queryKey) &&
  Array.isArray(prefix) &&
  prefix.every((segment, i) => queryKey[i] === segment);

const isPersistedKey = (queryKey: QueryKey): boolean =>
  PERSISTED_QUERY_PREFIXES.some((prefix) => matchesPrefix(queryKey, prefix));

/** Set once by attachQueryPersistence so sign-out can wipe the store. */
let activePersister: { removeClient: () => Promise<void> | void } | undefined;

/**
 * Attach storage persistence to the given QueryClient.
 * Call once during app initialisation, before rendering.
 */
export function attachQueryPersistence(queryClient: QueryClient) {
  // localStorage can be unavailable in some Capacitor contexts, and throws
  // rather than returning null when private browsing blocks writes.
  let storage: Storage | undefined;
  try {
    localStorage.setItem('__puma_test__', '1');
    localStorage.removeItem('__puma_test__');
    storage = localStorage;
  } catch {
    // Storage unavailable — run without persistence rather than failing to boot
    return;
  }

  // Give every persisted family a gcTime that covers the persistence window,
  // so restored entries are not collected on the way in. Call sites that set
  // gcTime explicitly still win, so they must not set a shorter one.
  for (const prefix of PERSISTED_QUERY_PREFIXES) {
    queryClient.setQueryDefaults(prefix, { gcTime: CACHE_TTL_MS });
  }

  const persister = createSyncStoragePersister({ storage, key: STORAGE_KEY });
  activePersister = persister;

  persistQueryClient({
    queryClient,
    persister,
    maxAge: CACHE_TTL_MS,
    dehydrateOptions: {
      shouldDehydrateQuery: (query) =>
        query.state.status === 'success' &&
        (isPersistedKey(query.queryKey) || query.meta?.persist === true),
    },
  });
}

/**
 * Drop everything persisted to storage.
 *
 * Called on sign-out: persisted entries outlive the session that wrote them, so
 * without this the next person to sign in on the same device restores the
 * previous one's rosters and fixtures before their own data arrives.
 */
export async function clearPersistedQueryCache(): Promise<void> {
  try {
    await activePersister?.removeClient();
    // Belt and braces: removeClient only clears the key the current persister
    // owns, and an older build may have left a differently-keyed entry behind.
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    logger.error('Failed to clear persisted query cache:', error);
  }
}
