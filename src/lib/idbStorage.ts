/**
 * Minimal async key/value store on IndexedDB.
 *
 * Exists because localStorage is the wrong place for anything the app needs
 * back later on a phone: WebKit evicts it under storage pressure and clears it
 * for apps it considers unused, which shows up as being silently signed out or
 * as an offline cache that is simply gone. IndexedDB has a larger quota and is
 * evicted far less eagerly.
 *
 * Deliberately dependency-free — the Persister and Supabase storage contracts
 * are both three methods, and an idb wrapper is not worth a package here.
 *
 * Every operation falls back to localStorage when IndexedDB is unavailable
 * (private browsing, old WebViews, blocked site data): degraded, but the same
 * behaviour the app had before.
 */

const DB_NAME = 'origin-sports';
const DB_VERSION = 1;
const STORE = 'kv';

let dbPromise: Promise<IDBDatabase | null> | undefined;

function openDb(): Promise<IDBDatabase | null> {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise<IDBDatabase | null>((resolve) => {
    try {
      if (typeof indexedDB === 'undefined') return resolve(null);

      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        if (!request.result.objectStoreNames.contains(STORE)) {
          request.result.createObjectStore(STORE);
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve(null);
      // Safari can leave an open request hanging indefinitely rather than
      // firing either handler; don't let that stall app start-up.
      setTimeout(() => resolve(null), 3000);
    } catch {
      resolve(null);
    }
  });

  return dbPromise;
}

function run<T>(
  mode: IDBTransactionMode,
  operation: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T | null> {
  return openDb().then(
    (db) =>
      new Promise<T | null>((resolve) => {
        if (!db) return resolve(null);
        try {
          const tx = db.transaction(STORE, mode);
          const request = operation(tx.objectStore(STORE));
          request.onsuccess = () => resolve(request.result ?? null);
          request.onerror = () => resolve(null);
        } catch {
          resolve(null);
        }
      }),
  );
}

/** True when IndexedDB is usable, so callers know whether the fallback is live. */
export async function isIdbAvailable(): Promise<boolean> {
  return (await openDb()) !== null;
}

const localFallback = {
  get: (key: string) => {
    try { return localStorage.getItem(key); } catch { return null; }
  },
  set: (key: string, value: string) => {
    try { localStorage.setItem(key, value); } catch { /* quota or blocked */ }
  },
  remove: (key: string) => {
    try { localStorage.removeItem(key); } catch { /* blocked */ }
  },
};

export const idbStorage = {
  async getItem(key: string): Promise<string | null> {
    if (!(await isIdbAvailable())) return localFallback.get(key);
    const value = await run<string>('readonly', (store) => store.get(key));
    return value ?? null;
  },

  async setItem(key: string, value: string): Promise<void> {
    if (!(await isIdbAvailable())) return localFallback.set(key, value);
    await run('readwrite', (store) => store.put(value, key) as IDBRequest<unknown>);
  },

  async removeItem(key: string): Promise<void> {
    localFallback.remove(key); // clear any pre-migration copy too
    if (!(await isIdbAvailable())) return;
    await run('readwrite', (store) => store.delete(key) as IDBRequest<unknown>);
  },
};

/**
 * Read a key, moving it out of localStorage on the way if that is where it
 * still lives. Lets an existing install carry its session and cache across to
 * IndexedDB on first read instead of losing them — without this, shipping the
 * change would sign everyone out once.
 */
export async function getItemMigrating(key: string): Promise<string | null> {
  const existing = await idbStorage.getItem(key);
  if (existing !== null) return existing;

  const legacy = localFallback.get(key);
  if (legacy === null) return null;

  await idbStorage.setItem(key, legacy);
  localFallback.remove(key);
  return legacy;
}
