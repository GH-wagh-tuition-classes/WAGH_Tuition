# WAGH Tuition Classes — H1.3B-R2.1 Regression Hotfix

## Purpose

This hotfix corrects regressions visible after the H1.3B-R2 deployment without changing the locked architecture or challenge data model.

## Fixed

1. Restored cumulative Runtime routes for:
   - Student Assigned Tests
   - Teacher Dashboard and analytics
   - Teacher Sent Tests / Test Assignment APIs
   - Admin Teacher Assignment Manager
2. Converted raw ISO/UTC timestamps to Tapi, Gujarat local display time through `WTC_TIME` (`Asia/Kolkata`).
3. Fixed raw timestamps in:
   - Student recent test attempts
   - Teacher profile updated time
   - Admin Admission Leads timestamps
4. Changed Daily Challenge completed copy from progress-like wording (`5% completed`) to challenge-only wording (`Challenge score 1/20 (5%)`).
5. Shortened the Student Daily Challenge title for mobile screens.

## Important

- No Sheet migration is required.
- Do not run `setupWTCContentEngine()`.
- Keep the existing Phase 2.5G `teacher_assignments.gs` module in the Runtime Apps Script project.
- Challenge scores remain temporary in `DAILY_CHALLENGE_LIVE` and are not added to academic progress.

## Deployment

### Runtime Apps Script

Replace:

- `api_router.gs`
- `version.gs`

Save and deploy a new version of the existing Runtime Web App. Keep the same `/exec` URL.

### GitHub development repository

Replace:

- `student.html`
- `teacher.html`
- `admin.html`
- `assets/js/student.js`
- `assets/js/student-daily-challenge.js`
- `assets/js/teacher.js`
- `assets/js/admin-admission-leads.js`

Wait for GitHub Pages deployment, then test in Incognito.

## Live regression test

- Student → Assigned Tests loads without `Unknown action`.
- Teacher → Home, Assign Tests and Sent Tests load.
- Admin → Teacher Assignments loads.
- Student Progress shows `26 Jul 2026, 07:47 PM IST` style text, not a raw `...Z` value.
- Daily Challenge completed state says `Challenge score`, not `% completed`.
- Standard student progress percentages remain unchanged by challenge completion.
