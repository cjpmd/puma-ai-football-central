import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';

interface TimerSnapshot {
  startedAt: string | null;
  pausedElapsedSeconds: number;
  isRunning: boolean;
}

interface UseSharedMatchTimerReturn {
  elapsedSeconds: number;
  currentMinute: number;
  currentSecond: number;
  isRunning: boolean;
  start: () => Promise<void>;
  pause: () => Promise<void>;
  reset: () => Promise<void>;
  displayTime: string;
}

/**
 * Shared, persistent match timer.
 *
 * The authoritative timer state lives on the `events` row:
 *   - match_timer_started_at         (timestamptz | null)
 *   - match_timer_paused_elapsed_seconds (int)
 *   - match_timer_is_running         (bool)
 *
 * Elapsed = paused_elapsed + (is_running ? now() - started_at : 0)
 *
 * Because elapsed is derived from wall-clock time, the clock keeps
 * "ticking" while the tab is suspended / phone locked, and every
 * connected viewer sees the same value (Realtime invalidates the
 * `events` query in useGameDayRealtime).
 */
export function useSharedMatchTimer(
  eventId: string | undefined,
  snapshot: TimerSnapshot | null
): UseSharedMatchTimerReturn {
  const [now, setNow] = useState<number>(() => Date.now());
  const localOverrideRef = useRef<TimerSnapshot | null>(null);

  // Use local override (set immediately on user action) until the next
  // server snapshot supersedes it.
  const effective: TimerSnapshot = localOverrideRef.current ?? snapshot ?? {
    startedAt: null,
    pausedElapsedSeconds: 0,
    isRunning: false,
  };

  // Clear the local override once the server snapshot catches up.
  useEffect(() => {
    if (!snapshot || !localOverrideRef.current) return;
    const o = localOverrideRef.current;
    if (
      o.isRunning === snapshot.isRunning &&
      o.pausedElapsedSeconds === snapshot.pausedElapsedSeconds &&
      o.startedAt === snapshot.startedAt
    ) {
      localOverrideRef.current = null;
    }
  }, [snapshot]);

  // Tick once a second when running so the displayed time updates.
  useEffect(() => {
    if (!effective.isRunning) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [effective.isRunning]);

  // Also re-sync when the tab becomes visible again (after backgrounding).
  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === 'visible') setNow(Date.now());
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, []);

  const elapsedSeconds = (() => {
    let total = effective.pausedElapsedSeconds || 0;
    if (effective.isRunning && effective.startedAt) {
      const startedMs = new Date(effective.startedAt).getTime();
      total += Math.max(0, Math.floor((now - startedMs) / 1000));
    }
    return total;
  })();

  const updateEvent = useCallback(
    async (patch: Partial<{
      match_timer_started_at: string | null;
      match_timer_paused_elapsed_seconds: number;
      match_timer_is_running: boolean;
    }>) => {
      if (!eventId) return;
      const { error } = await supabase
        .from('events')
        .update(patch)
        .eq('id', eventId);
      if (error) logger.error('[useSharedMatchTimer] update failed', error);
    },
    [eventId]
  );

  const start = useCallback(async () => {
    const startedAtIso = new Date().toISOString();
    localOverrideRef.current = {
      startedAt: startedAtIso,
      pausedElapsedSeconds: effective.pausedElapsedSeconds,
      isRunning: true,
    };
    setNow(Date.now());
    await updateEvent({
      match_timer_started_at: startedAtIso,
      match_timer_is_running: true,
      match_timer_paused_elapsed_seconds: effective.pausedElapsedSeconds,
    });
  }, [effective.pausedElapsedSeconds, updateEvent]);

  const pause = useCallback(async () => {
    const newElapsed = elapsedSeconds;
    localOverrideRef.current = {
      startedAt: null,
      pausedElapsedSeconds: newElapsed,
      isRunning: false,
    };
    setNow(Date.now());
    await updateEvent({
      match_timer_started_at: null,
      match_timer_is_running: false,
      match_timer_paused_elapsed_seconds: newElapsed,
    });
  }, [elapsedSeconds, updateEvent]);

  const reset = useCallback(async () => {
    localOverrideRef.current = {
      startedAt: null,
      pausedElapsedSeconds: 0,
      isRunning: false,
    };
    setNow(Date.now());
    await updateEvent({
      match_timer_started_at: null,
      match_timer_is_running: false,
      match_timer_paused_elapsed_seconds: 0,
    });
  }, [updateEvent]);

  const currentMinute = Math.floor(elapsedSeconds / 60);
  const currentSecond = elapsedSeconds % 60;
  const displayTime = `${currentMinute}:${currentSecond.toString().padStart(2, '0')}`;

  return {
    elapsedSeconds,
    currentMinute,
    currentSecond,
    isRunning: effective.isRunning,
    start,
    pause,
    reset,
    displayTime,
  };
}
