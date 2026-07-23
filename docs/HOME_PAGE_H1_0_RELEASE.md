# WAGH Tuition Classes — Home Page & Admission Funnel H1.0

**Release type:** Cumulative development patch  
**Scope:** Home page plus additive public admission-lead API  
**Architecture:** Existing locked architecture preserved; no folder moved or renamed  
**Stable environment:** Not promoted automatically

## What this release adds

- Modern mobile-first landing page using the existing WTC logo and `hero-study.jpg`.
- Clear CBSE/GSEB, Classes 5–10 and English/Gujarati learning paths.
- Parent-focused explanation of learning support.
- Free demo/admission enquiry form separate from student signup.
- Immediate Call and WhatsApp conversion controls.
- Accessible mobile menu, form labels, status messages and password visibility controls.
- Busy-state protection for Login, Signup and Demo Enquiry submissions.
- Additive `ADMISSION_LEADS` runtime sheet and `saveAdmissionLead` API action.
- Safe WhatsApp fallback when the new runtime action has not yet been deployed.

## Frontend files to add or replace

Replace:

- `/index.html`
- `/assets/css/main.css`
- `/assets/js/auth.js`
- `/assets/js/api.js`

Add:

- `/assets/js/main.js`

No other portal or feature file needs replacement for the homepage release.

## Runtime Apps Script files to add or replace

Add:

- `/apps-script/1_runtime_app_script/admission_leads.gs`

Replace with the cumulative versions included in this package:

- `/apps-script/1_runtime_app_script/Code.gs`
- `/apps-script/1_runtime_app_script/api_router.gs`
- `/apps-script/1_runtime_app_script/version.gs`

Do not replace or modify the Authoring / AI Content Engine deployment for this release.

## Safe backend installation

1. Back up the current Runtime Apps Script project and `WTC_CONTENT_ENGINE` workbook.
2. Add `admission_leads.gs` and replace the three named cumulative runtime files.
3. In Apps Script, run `installAdmissionLeadSystem()` once.
4. Confirm that it reports `ADMISSION_LEADS is ready`.
5. Create a new Runtime Web App deployment version while preserving the same `/exec` URL.
6. Do not run `setupWTCContentEngine()`; it is a destructive legacy setup function.

The lead API also creates the missing sheet/header on first valid submission, but the explicit safe installer is preferred before testing.

## ADMISSION_LEADS columns

`leadId, createdAt, studentName, parentMobile, className, board, medium, subject, preferredTime, source, status, notes, deviceId, pageUrl, consent, updatedAt`

Initial status is `NEW`.

## Immediate behaviour before backend deployment

The updated homepage remains usable before Apps Script deployment:

- Login and Signup continue using existing API actions.
- Demo form validates the data.
- If `saveAdmissionLead` is unavailable, the page prepares the enquiry for WhatsApp.
- The visitor can send the complete prefilled details using the displayed WhatsApp button.

## Files intentionally unchanged

- `/student.html`
- `/teacher.html`
- `/admin.html`
- `/parent.html`
- Student Portal JavaScript and CSS
- Static MCQ and Solution pages
- Feature Engine and Access Guard
- Authoring Apps Script
- Existing workbook data
- Stable WAGH Tuition environment

## Rollback

1. Restore the previous five frontend files and remove `/assets/js/main.js`.
2. Restore the previous runtime `Code.gs`, `api_router.gs` and `version.gs`.
3. The additive `ADMISSION_LEADS` sheet may remain; it does not affect existing runtime actions.
4. Restore the prior Runtime deployment version if necessary.

## Required live checks

- Homepage loads on desktop and mobile.
- Mobile menu opens, closes, and responds to Escape.
- Class-path buttons prefill the demo class and scroll to the form.
- Demo form rejects invalid mobile numbers.
- Demo form saves a row after runtime deployment.
- WhatsApp fallback works before/without the new runtime action.
- Student Login, Signup and role redirects still work.
- Existing logged-in user is redirected to the correct portal.
- Mobile Call, WhatsApp and Free Demo bar does not cover page content.
