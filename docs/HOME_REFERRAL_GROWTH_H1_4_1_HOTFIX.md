# WAGH Tuition Classes — H1.4.1 Referral Dashboard Loading Hotfix

Status: DEVELOPMENT HOTFIX
Base: H1.4 Referral and Growth Tracking
Architecture: LOCKED v2.3.1 R2 (unchanged)

## Issue

The Student Refer & Grow section could remain on `Loading…` with a blank referral link. The module checked `window.WTC_AUTH`, while the existing authentication helper was declared as a top-level lexical `const WTC_AUTH`. Therefore the module could not read the logged-in student and returned silently before calling the Runtime API.

The same compatibility mismatch could also leave the shared API client's device identifier blank, weakening referral visit deduplication.

## Fix

- Expose the existing authentication helper through `window.WTC_AUTH` without changing its public API.
- Make Student Referral user lookup support both lexical and window globals.
- Show a clear session error instead of remaining indefinitely on `Loading…`.
- Prevent Copy/WhatsApp/Share actions until a valid referral code is available.
- Auto-load when route restoration opens the Referral section.
- Restore the shared API device identifier for referral deduplication.
- Bump frontend cache parameters so Android Chrome fetches corrected scripts.

## Deployment

No Apps Script file, sheet migration, trigger, or Web App redeployment is required. Upload the frontend files from the patch package using their exact paths.

After GitHub Pages finishes publishing, close and reopen the portal or perform one hard refresh.

## Changed files

- `assets/js/auth.js`
- `assets/js/api.js`
- `assets/js/student-referral.js`
- `student.html`
- `index.html`
- `admin.html`
- `teacher.html`
- this document
- H1.4.1 test checklist
