import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';
import { idbStorage, getItemMigrating } from '@/lib/idbStorage';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
// Lovable Cloud / connected Supabase projects expose the publishable key as
// VITE_SUPABASE_PUBLISHABLE_KEY. Fall back to the legacy VITE_SUPABASE_ANON_KEY
// name so older deployments keep working.
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  import.meta.env.VITE_SUPABASE_ANON_KEY) as string | undefined;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase env: expected VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY (or VITE_SUPABASE_ANON_KEY).'
  );
}

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";

/**
 * Auth session storage.
 *
 * The session lived in localStorage, which WebKit evicts under storage
 * pressure and clears for apps it treats as unused — the user opens the app
 * days later and is silently signed out with no action of their own. IndexedDB
 * is not immune to eviction but is far less eager, and supabase-js accepts an
 * async adapter, so nothing else has to change.
 *
 * The migrating read moves an existing session across on first access, so
 * shipping this does not sign the current install out once.
 */
const authStorage = {
  getItem: (key: string) => getItemMigrating(key),
  setItem: (key: string, value: string) => idbStorage.setItem(key, value),
  removeItem: (key: string) => idbStorage.removeItem(key),
};

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: authStorage,
    persistSession: true,
    autoRefreshToken: true,
  },
});
