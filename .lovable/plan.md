I found a likely direct cause of the current blank screen: `src/integrations/supabase/client.ts` only reads `VITE_SUPABASE_ANON_KEY`, but this connected Supabase project currently provides `VITE_SUPABASE_PUBLISHABLE_KEY`. That makes the Supabase client throw during module load before React can render anything.

Plan to fix:

1. Fix Supabase client startup
   - Update `src/integrations/supabase/client.ts` to use `VITE_SUPABASE_PUBLISHABLE_KEY` first, with `VITE_SUPABASE_ANON_KEY` as a backwards-compatible fallback.
   - Update the missing-env error message so it names the actual accepted variables.

2. Prevent future total blank screens
   - Wrap the full app provider tree in the existing `ErrorBoundary`, not only individual routes, so provider/module crashes show a visible recovery UI instead of a blank page.
   - Keep route-level boundaries as they are.

3. Make auth and splash states visible/recoverable
   - Replace `return null` in `src/pages/Auth.tsx` with a branded loading/redirect state.
   - Harden `SplashScreen` so `onComplete` cannot be destabilized by rerenders and always clears after a timeout.

4. Further guard PWA/service-worker preview behavior
   - Keep service worker registration disabled in Lovable preview/iframe contexts.
   - Add safe guards to `PWAUpdatePrompt` so it does not touch service-worker APIs in preview/iframe contexts where storage access is blocked.

5. Validate after implementation
   - Run a production build/type check to catch startup-breaking errors.
   - Re-check runtime logs/preview behavior for the root route `/` so the screen renders either the auth page, loading state, or an explicit error panel instead of blank.

Technical details:

```text
Current failure path:
main.tsx -> App.tsx -> AuthContext imports supabase client
supabase client reads VITE_SUPABASE_ANON_KEY only
.env provides VITE_SUPABASE_PUBLISHABLE_KEY instead
client.ts throws at import time
React root never renders -> blank screen
```

No database changes are needed.