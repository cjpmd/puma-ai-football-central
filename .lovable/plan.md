## What I found

### 1. iOS scroll is broken by the mobile lockdown CSS

In `src/index.css` (lines 117–125) the previous "stop the page bouncing" fix applies to **every touch device**, including the iOS WKWebView inside your Capacitor build:

```css
@media (hover: none) and (pointer: coarse) {
  html, body {
    overflow: hidden;
    position: fixed;
    width: 100%;
    height: 100%;
    overscroll-behavior: none;
    -webkit-user-select: none;
    user-select: none;
  }
}
```

`position: fixed` + `overflow: hidden` on `<body>` is the classic cause of "nothing scrolls in my Capacitor iOS app". The inner `MobileLayout` scroller (`flex-1 overflow-y-auto`) then has a fixed-height ancestor and momentum scrolling fails on WKWebView.

It worked in the browser because mouse scroll on the inner div doesn't need a scrollable body — touch on iOS does.

### 2. Offline / instant-load cache — wired correctly, but only on 4 screens

Verified the cache plumbing is live:
- `GameDayView` → `useOfflineAwareQuery` (placeholderData from localStorage, 0 ms render).
- `CalendarEventsMobile`, `TeamManagementMobile`, `MyTeamMobile` → manual `readCache` / `writeCache` with the amber "Updated X min ago · Offline mode" banner.

What is **not** cached today: Dashboard, Analytics, Player Management, Training, Staff, Welfare, etc. So pages like the Dashboard (your current screen) will always show a spinner first — that's likely why it feels like the cache "isn't working".

The cache only kicks in on the second visit to a screen (first visit has nothing to read). On iOS Capacitor, localStorage **is persisted** by WKWebView across launches, so once a screen has been visited it should hydrate instantly.

---

## Plan

### A. Fix iOS scrolling (Capacitor + mobile web)

Replace the global lockdown in `src/index.css` with a version that keeps the body scrollable and only suppresses overscroll/bounce on the **scroll container**, not on `html`/`body`:

```css
@media (hover: none) and (pointer: coarse) {
  html, body {
    /* Allow native WKWebView scrolling; just block rubber-band on the root */
    overscroll-behavior: none;
    -webkit-tap-highlight-color: transparent;
  }
}
```

Then in `src/components/layout/MobileLayout.tsx`, ensure the inner scroll container handles bounce locally:

```tsx
<div
  className="flex-1 overflow-y-auto pb-[...] ..."
  style={{ WebkitOverflowScrolling: 'touch', overscrollBehaviorY: 'contain' }}
>
```

This restores native momentum scrolling inside the iOS app while still preventing the whole page from bouncing past content.

Also re-enable text selection / tap targets that the global `user-select: none` was suppressing (it can interfere with long-press and some input focus on iOS).

### B. Verify the offline cache is doing its job

1. Add a tiny dev-only console log in `useOfflineAwareQuery` and the manual `readCache` call-sites so we can confirm in Safari's web-inspector (attach to the Capacitor app) whether a hit / miss occurred on mount. Logged behind `import.meta.env.DEV` so it's stripped from production.
2. Confirm the amber "Updated X min ago · Offline mode" banner shows on Calendar / Team Manager / My Team when offline — this is the user-visible proof.
3. Document (no code) that the **Dashboard** is not cached today; if you want it instant-on-open too, that's an additive change I can do in a follow-up.

### C. Test path

After the CSS change you'll need to rebuild the native shell:

```
git pull
npm run build
npx cap sync ios
npx cap run ios   # or run from Xcode
```

(Capacitor copies `dist/` into the iOS bundle on `cap sync`, so CSS-only fixes still need the rebuild.)

### Files touched

- `src/index.css` — replace the `(hover: none) and (pointer: coarse)` block.
- `src/components/layout/MobileLayout.tsx` — add `WebkitOverflowScrolling` + `overscrollBehaviorY` on the inner scroll wrapper.
- `src/hooks/useOfflineAwareQuery.ts` + the 3 manual cache sites — one-line dev-only `console.debug` for cache hit/miss.

No business-logic, no DB, no API changes.

### Out of scope (ask if you want these)

- Adding offline cache to Dashboard / Analytics / Player Management.
- Adding a global "you're offline" toast.
- Switching the manifest/PWA service worker.
