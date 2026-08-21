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
import type { PersistedClient, Persister } from '@tanstack/react-query-persist-client';
import { idbStorage, getItemMigrating } from '@/lib/idbStorage';
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
 * Persister backed by IndexedDB rather than localStorage, which WebKit evicts
 * under storage pressure — the cache this exists to provide was the first
 * thing to disappear on the devices that needed it most.
 */
const persister: Persister = {
  persistClient: async (client: PersistedClient) => {
    try {
      await idbStorage.setItem(STORAGE_KEY, JSON.stringify(client));
    } catch (error) {
      logger.error('Failed to persist query cache:', error);
    }
  },
  restoreClient: async () => {
    try {
      // Migrating read: an install upgrading from the localStorage persister
      // keeps its cache instead of starting cold.
      const raw = await getItemMigrating(STORAGE_KEY);
      return raw ? (JSON.parse(raw) as PersistedClient) : undefined;
    } catch (error) {
      logger.error('Failed to restore query cache:', error);
      return undefined;
    }
  },
  removeClient: () => idbStorage.removeItem(STORAGE_KEY),
};

/**
 * Options for PersistQueryClientProvider.
 *
 * The provider is what makes an async persister safe: it holds queries in a
 * restoring state until the cache is back, so a screen cannot fire a network
 * request for data that is about to be handed to it a millisecond later.
 */
export const persistOptions = {
  persister,
  maxAge: CACHE_TTL_MS,
  dehydrateOptions: {
    shouldDehydrateQuery: (query: { state: { status: string }; queryKey: QueryKey; meta?: Record<string, unknown> }) =>
      query.state.status === 'success' &&
      (isPersistedKey(query.queryKey) || query.meta?.persist === true),
  },
};

/**
 * Give every persisted family a gcTime covering the persistence window, so
 * restored entries are not collected on the way in. Call sites that set gcTime
 * explicitly still win, so they must not set a shorter one.
 *
 * Call once during app initialisation.
 */
export function applyPersistedQueryDefaults(queryClient: QueryClient) {
  for (const prefix of PERSISTED_QUERY_PREFIXES) {
    queryClient.setQueryDefaults(prefix, { gcTime: CACHE_TTL_MS });
  }
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
    await persister.removeClient();
  } catch (error) {
    logger.error('Failed to clear persisted query cache:', error);
  }
}
