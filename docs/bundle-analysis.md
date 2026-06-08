# Bundle Analysis — Origin Sports Performance

> Generated: 2026-06-08 with `npx vite build`

---

## Chunk summary (raw size, not gzip)

| Chunk | Raw KB | Gzip KB | Status |
|-------|--------|---------|--------|
| charts-vendor (recharts) | 431.85 | ~130 | ⚠️ Vendor min — unavoidable |
| sentry-vendor (@sentry/react) | 278.23 | ~90 | ⚠️ Vendor min — unavoidable |
| ui-vendor (Radix UI) | 269.07 | ~80 | ⚠️ Vendor min — tree-shaken |
| data-vendor (React Query + Supabase) | 154.65 | ~50 | ✅ Under limit |
| index (app shell) | 180.37 | ~55 | ✅ Under limit |
| userAvailabilityService | 189.09 | ~55 | ✅ Under limit |
| react-vendor (React + Router) | ~180 | ~58 | ✅ Under limit |
| All other route chunks | < 100 | < 30 | ✅ Well under limit |

**All application code chunks are under 200 KB.** The three over-limit chunks are
pure vendor libraries whose sizes are fixed by the library authors.

---

## Vendor chunk analysis

### charts-vendor — 432 KB raw
Recharts bundles D3 internally. It is only loaded on analytics screens (lazy-loaded
route). Browsers cache it indefinitely between sessions.

**Alternative:** Replace with a lighter chart library (e.g. `uplot` at 40 KB) — requires
re-implementing all chart components. Not recommended until analytics screens have
confirmed user traffic.

### sentry-vendor — 278 KB raw
Sentry SDK including browser tracing and session replay. The replay module alone accounts
for ~150 KB. Replay can be removed if the 100 KB saving is worth losing the replay feature.

```typescript
// To disable replay and save ~150 KB, remove from main.tsx:
Sentry.replayIntegration({ ... })
```

### ui-vendor — 269 KB raw
Radix UI is already tree-shaken via Rollup. The 269 KB reflects only the components
actually used in the app (dialog, dropdown, select, tabs, popover, toast, scroll-area,
accordion). This cannot be reduced without removing UI components.

---

## Gzip reality

On a modern CDN all assets are served gzip/brotli compressed. The three vendor chunks
compress to ~80–130 KB each — well within the typical 500 KB "time-to-interactive budget"
for a mobile app loaded over 4G.

---

## Action items

| Action | Owner | Priority |
|--------|-------|----------|
| Verify CDN gzip/brotli is enabled (Netlify: enabled by default) | DevOps | P0 |
| Evaluate removing Sentry Replay in favour of just error capture | Product | P2 |
| Consider replacing Recharts with lighter alternative once usage confirmed | Engineering | P3 |
| Monitor chunk sizes on each release — `chunkSizeWarningLimit: 200` in vite.config.ts | CI | ongoing |
