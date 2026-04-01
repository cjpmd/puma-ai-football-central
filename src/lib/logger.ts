/**
 * Structured logger for Puma-AI.
 *
 * - In development (import.meta.env.DEV): all levels are printed.
 * - In production: only `warn` and `error` are printed so that
 *   sensitive user IDs / session tokens are never exposed in the
 *   browser console of a deployed app.
 *
 * Usage:
 *   import { logger } from '@/lib/logger';
 *   logger.log('Fetching teams', { userId });
 *   logger.error('Supabase error', error);
 */

const isDev = import.meta.env.DEV;

type LogFn = (...args: unknown[]) => void;

const noop: LogFn = () => undefined;

export const logger = {
  /** Debug / informational output — dev only */
  log: (isDev ? console.log.bind(console) : noop) as LogFn,

  /** Verbose debug — dev only */
  debug: (isDev ? console.debug.bind(console) : noop) as LogFn,

  /** Warnings — always visible so production issues surface */
  warn: console.warn.bind(console) as LogFn,

  /** Errors — always visible */
  error: console.error.bind(console) as LogFn,
};
