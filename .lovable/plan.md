## Findings

### Why scroll is broken in the preview (and likely on iOS too)

`src/components/layout/MobileLayout.tsx` wraps everything in:

```tsx
<div className="min-h-screen flex flex-col">
  <MobileHeader />
  <div className="flex-1 overflow-y-auto ...">{children}</div>
  <RoleAwareBottomNav />
</div>
```

`min-h-screen` lets the outer flex container grow with its children, so the `flex-1 overflow-y-auto` inner div never gets a definite height. The browser then never activates the inner scroller, and on the Dashboard the bottom nav covers the spillover. The standard mobile shell pattern is to lock the outer container to the viewport so the inner div is the real scroll surface.

### Local-storage / instant-load review

I checked every page. The "instant load" cache (`readCache` / `writeCache` / `useOfflineAwareQuery`) is wired correctly on:
- Game Day (`useOfflineAwareQuery`)
- Calendar Mobile, Team Manager Mobile, My Team Mobile (manual cache + amber "Updated X min ago" banner)

It is **not** wired on `DashboardMobile`, which is why your current screen always spins on first load and feels like the cache isn't doing anything.

### Duplicate React key warning (console)

Console shows `Encountered two children with the same key` originating from `DashboardMobile`. Two list items are being rendered with the same UUID. This is a real bug — it can cause flicker and wrong-card state on re-render. I'll find the offending `.map()` and make the key unique.

---

## Plan

### A. Fix scrolling for every mobile screen (one file)

Edit `src/components/layout/MobileLayout.tsx`:

```diff
- <div className="min-h-screen flex flex-col" style={{...}}>
+ <div className="h-[100dvh] flex flex-col overflow-hidden" style={{...}}>
```

This:
- Pins the shell to the visible viewport (`dvh` handles iOS dynamic toolbars correctly).
- Makes `flex-1 overflow-y-auto` a real bounded scroll container so mouse wheel **and** native touch momentum work.
- Plays nicely with the safe-area padding we already have on the bottom nav.

The inner scroll div already has `WebkitOverflowScrolling: 'touch'` and `overscrollBehaviorY: 'contain'` from the previous turn, so no change there.

### B. Add instant-load cache to Dashboard

Edit `src/pages/DashboardMobile.tsx`:
- Import `readCache` / `writeCache` / `staleLabel` from `@/lib/offlineCache` (same module the other 3 screens use).
- Cache key per user: `offline_dashboard_${user.id}`.
- On mount: hydrate state from cache and immediately set `loading = false` if a hit is present.
- After the existing fetch resolves: `writeCache(cacheKey, payload)`.
- Show the same small amber "Updated X min ago · Offline mode" pill at the top while stale (matches Calendar/Team Manager).

No DB or query changes — just localStorage hydration around the existing loader.

### C. Fix duplicate-key warning in `DashboardMobile`

Locate the `.map()` rendering the offending UUIDs (likely the events list, child-player chips, or the team-cards section) and change the key to a composite like `` `${item.id}-${context}` `` so two sources of the same record don't collide. Pure render fix, no business logic change.

### Files touched

- `src/components/layout/MobileLayout.tsx` — one-line height change.
- `src/pages/DashboardMobile.tsx` — add cache hydration + fix duplicate key.

### Out of scope

- Caching Analytics / Player Management / Training (can follow if you want).
- Any data-shape or RLS changes.
