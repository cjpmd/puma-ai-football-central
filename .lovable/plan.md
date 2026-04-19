

## Plan: Rebrand from Puma-AI to Origin Sports

I'll do a global rename across all user-facing text, metadata, and configuration. The visual logo (paw print PNG and logo-spinner SVG) will remain unchanged — only the name changes. If you want the logo art swapped too, upload new logo files and I'll replace them.

### Scope of Changes

**1. App metadata & PWA**
- `index.html` — title, description, author, og tags, apple-mobile-web-app-title
- `vite.config.ts` — PWA manifest `name`, `short_name`, `description`
- `capacitor.config.ts` — appName (and verify appId comment)
- `README.md` — project name references

**2. UI components with hardcoded "Puma-AI" / "Puma AI" / "Team Manager" text**
- `src/components/layout/Logo.tsx` — "Team Manager" → "Origin Sports"
- `src/components/pwa/SplashScreen.tsx` — "puma ai" branding text → "origin sports"
- `src/components/pwa/PWAInstallPrompt.tsx` — "Install Puma-AI" → "Install Origin Sports"
- `src/components/ui/sidebar.tsx` — "Coach's Playbook" header → "Origin Sports"
- `src/components/landing/Hero.tsx`, `Features.tsx`, `Pricing.tsx`, `Testimonials.tsx`, `Footer.tsx` — any brand mentions
- Any other component with "Puma" / "Puma-AI" / "Puma AI" string

**3. Service worker & notifications**
- `src/sw.ts` — default notification title "Puma-AI" → "Origin Sports"
- `public/sw-push.js` — same
- Notification service files (`enhancedNotificationService.ts`, `pushNotificationService.ts`, `webPushService.ts`, `unifiedNotificationService.ts`) — any "Puma-AI" sender/title strings

**4. Edge functions (email & notifications)**
- `supabase/functions/send-invitation-email/index.ts` — sender name, email subject, body branding
- `supabase/functions/send-availability-notification/index.ts` — sender/subject branding
- `supabase/functions/send-push-notification/index.ts` — default title
- `supabase/functions/enhanced-notification-scheduler/index.ts` — any branded copy
- `supabase/functions/notification-rsvp-handler/index.ts` — any branded copy

**5. Auth pages & modals**
- `src/pages/Auth.tsx`, `AuthMobile.tsx`, `ResetPassword.tsx`, `ResetPasswordMobile.tsx` — page headings/copy
- `src/components/auth/*` — any welcome/branding copy in signup/wizard modals

**6. Documentation**
- `STAFF_MANAGEMENT_COMPLETE.md` and `.lovable/plan.md` — name references

### Discovery Method

I'll run a project-wide search for the patterns: `Puma-AI`, `Puma AI`, `puma-ai`, `puma_ai`, `puma ai`, `PumaAI`, and `Coach's Playbook` / `Team Manager` (where it refers to the app name, not a role). Every match in user-facing strings, metadata, and configuration will be updated to the appropriate casing of "Origin Sports".

### What Stays the Same

- Logo image files (`/lovable-uploads/0b482bd3-...png`, `/pwa-icons/*`) — visual logo unchanged
- The `LogoSpinner` SVG paths
- Database table/column names, internal type names, file paths, function names
- The "Team Manager" *role label* (it's a user role, not the app name) — only the brand-name use of "Team Manager" in `Logo.tsx` will change
- URL slugs (lovable preview/published URLs are managed separately)

### Things to Confirm (before I start, if you want)

- **Casing**: I'll use **"Origin Sports"** (title case) everywhere user-facing, and `origin-sports` for short-name/slugs in the PWA manifest. Confirm or tell me if you want different casing.
- **Email sender name**: I'll set the from-name in transactional emails to "Origin Sports". The actual sending email address depends on your configured email domain — that won't change here.
- **Logo art**: Stays as the current paw-print mark. Upload new logo files later if you want a visual rebrand too.

### Files Touched (estimate)

~25–35 files: 1 config (vite), 1 capacitor config, 1 index.html, 1 README, ~10–15 components, ~5 edge functions, ~3 service workers/notification services, 2 markdown docs.

