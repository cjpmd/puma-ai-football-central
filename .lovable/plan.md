## Create `drill-video-url` edge function for Wasabi (eu-west-1)

Wasabi credentials are saved. Create a single edge function that returns a pre-signed Wasabi GET URL so the drill detail modal can stream video.

### New file: `supabase/functions/drill-video-url/index.ts`

- Region: `eu-west-1`, host: `s3.eu-west-1.wasabisys.com`, bucket: `originsportstrainingcontent`
- POST `{ file_path: string }` → `{ url: string, expires_in: 3600 }`
- Auth: require `Authorization: Bearer <jwt>`, verify with `supabase.auth.getClaims(token)`
- Generates AWS SigV4 pre-signed GET URL using `crypto.subtle` (HMAC-SHA256) — no external SDK
- Path segments RFC-3986 encoded, slashes preserved (handles `Drill Videos/...` keys)
- Standard CORS headers on all responses, OPTIONS preflight handled

### No other changes

- Frontend already calls `supabase.functions.invoke('drill-video-url', { body: { file_path } })`
- No DB, RLS, or client changes

### After deploy

If browser playback fails with a CORS error, the bucket needs a CORS rule allowing `GET` from the app origin. I'll guide you through it then.

Switch to build mode to apply.
