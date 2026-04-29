I’ll fix the Edit Profile photo flow so selecting a new picture actually persists to Supabase and updates the Home page avatar.

Plan:

1. Make avatar saving explicit and reliable
   - In `EditProfileModal`, keep the current cropped image preview behavior, but ensure the selected/cropped blob is definitely uploaded when “Save Changes” is tapped.
   - Use the logged-in user id as the authoritative profile row id for the update, instead of relying on `profile?.id` only.
   - Add safer upload metadata and a deterministic file path so repeated changes replace/update cleanly.

2. Fix the likely profile update issue
   - Update the profile row with `avatar_url` and `updated_at` after upload.
   - Request the updated row back from Supabase with `.select(...).single()` so failures cannot be silently missed.
   - Show a clear error toast if upload succeeds but saving the URL to the profile fails.

3. Improve image cache refresh
   - Store a fresh public avatar URL with a cache-busting version after save, so the Edit Profile modal and Home page profile button do not keep showing the old initials/image.
   - Keep the Home page fallback initials in place only when there is no saved avatar URL.

4. Align other profile display code
   - Update `UnifiedProfile` to read `avatar_url` instead of the old/non-existent `photo_url`, so the saved profile image is consistent anywhere the user profile card is shown.

5. Add light diagnostics for this specific flow
   - Add targeted logging around avatar upload and profile update results so, if Supabase rejects the upload/update, the exact failing step is visible in console logs.
   - Avoid logging sensitive data.

Technical notes:
- The database already has `profiles.avatar_url` and an `avatars` storage bucket with policies allowing users to upload under their own user-id folder.
- I won’t change the storage schema unless testing after implementation shows the bucket/policies need a migration.
- I’ll preserve the current mobile camera/photo picker and image cropper behavior.