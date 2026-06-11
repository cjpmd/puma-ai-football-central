import { createClient } from '@supabase/supabase-js';
import { cfg } from './env.ts';

const clientOpts = { auth: { persistSession: false, autoRefreshToken: false } };

/** Service-role client for setup/teardown (bypasses RLS). */
export const admin = createClient(cfg.supabaseUrl, cfg.serviceRoleKey, clientOpts);

export interface TestUser {
  id: string;
  email: string;
  /** A real access token for this user. */
  token: string;
}

/** Create a disposable, confirmed test user and sign in to mint a JWT. */
export async function createTestUser(label: string): Promise<TestUser> {
  const email = `edge-test-${label}-${crypto.randomUUID().slice(0, 8)}@${cfg.testEmailDomain}`;
  const password = `Tst!${crypto.randomUUID()}`;

  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (createErr || !created.user) {
    throw new Error(`Failed to create test user: ${createErr?.message}`);
  }

  const anon = createClient(cfg.supabaseUrl, cfg.anonKey, clientOpts);
  const { data: signin, error: signinErr } = await anon.auth.signInWithPassword({ email, password });
  if (signinErr || !signin.session) {
    throw new Error(`Failed to sign in test user: ${signinErr?.message}`);
  }

  return { id: created.user.id, email, token: signin.session.access_token };
}

export async function deleteTestUser(id: string): Promise<void> {
  const { error } = await admin.auth.admin.deleteUser(id);
  if (error) {
    console.warn(`Warning: could not delete test user ${id}: ${error.message}`);
  }
}
