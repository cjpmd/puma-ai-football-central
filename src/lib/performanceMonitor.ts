/**
 * PerformanceMonitor — dev-only route-timing and cache diagnostics.
 * Stripped from production builds via import.meta.env.DEV guard.
 */

import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';

let cacheHits = 0;
let cacheMisses = 0;

/** Call from any useQuery to record a cache hit/miss. */
export function recordCacheResult(hit: boolean) {
  if (!import.meta.env.DEV) return;
  if (hit) cacheHits++; else cacheMisses++;
}

/** Hook: logs route-change → render timing and cache hit ratio. */
export function usePerformanceMonitor() {
  if (!import.meta.env.DEV) return;

  const location = useLocation();
  const queryClient = useQueryClient();
  const navTimeRef = useRef<number>(performance.now());

  useEffect(() => {
    navTimeRef.current = performance.now();
  }, [location.pathname]);

  useEffect(() => {
    const elapsed = Math.round(performance.now() - navTimeRef.current);
    const total = cacheHits + cacheMisses;
    const hitRatio = total > 0 ? Math.round((cacheHits / total) * 100) : '—';
    const queryCount = queryClient.getQueryCache().getAll().length;

    console.debug(
      `[Perf] ${location.pathname} rendered in ${elapsed} ms | ` +
      `cache hit ratio: ${hitRatio}% (${cacheHits}/${total}) | ` +
      `queries in cache: ${queryCount}`
    );
  });
}

/** Log initial bundle load time — call once from main.tsx. */
export function logBundleLoadTime() {
  if (!import.meta.env.DEV) return;
  window.addEventListener('load', () => {
    const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
    if (nav) {
      console.debug(
        `[Perf] Bundle load: domInteractive=${Math.round(nav.domInteractive)} ms, ` +
        `loadEvent=${Math.round(nav.loadEventEnd)} ms`
      );
    }
  });
}
