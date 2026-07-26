# Home Chapter Challenge H1.3B-R2 — Live Test Checklist

Use only the **WAGH Tuition Classes development** environment until every required item passes.

## 1. Installer and time standard

- [ ] Run `installMultiSubjectChapterDailyChallengeSystem()` successfully.
- [ ] Installer reports `Asia/Kolkata`.
- [ ] Runtime Apps Script Project Settings show `Asia/Kolkata`.
- [ ] Authoring Apps Script Project Settings show `Asia/Kolkata`.
- [ ] Runtime/content, Feature and AI Authoring spreadsheets show India GMT+05:30.
- [ ] `DAILY_CHALLENGE_LIVE` exists.
- [ ] Cleanup trigger for `cleanupDailyChallengeLiveData` exists.
- [ ] `healthCheck` returns `timezone: Asia/Kolkata` and `dateTimeStandard.compliant: true`.

## 2. Multi-subject Admin rotation

- [ ] Load the Chapter Challenge Manager with the Admin password.
- [ ] Select Board + Class + Medium.
- [ ] Add at least two chapters from Subject A.
- [ ] Change the subject selector and add at least one chapter from Subject B.
- [ ] Reorder the mixed-subject rotation.
- [ ] Disable and re-enable one item.
- [ ] Save and reload; the same order and enabled states remain.
- [ ] Existing H1.3B-R1 configuration is migrated rather than duplicated.

## 3. Same-subject question rule

- [ ] Preview a primary chapter with at least 20 Published MCQs; only that chapter is used.
- [ ] Preview a primary chapter with fewer than 20 MCQs; fallback uses only selected chapters from the same subject.
- [ ] Confirm no Mathematics question appears in a Science challenge, or vice versa.
- [ ] Confirm exactly 20 unique questions are frozen.
- [ ] A subject pool with fewer than 20 total Published MCQs is skipped with an Admin warning.

## 4. IST boundary and date format

- [ ] Admin server clock displays IST.
- [ ] Rotation and preview date fields store `yyyy-MM-dd`.
- [ ] Readable labels display Indian dates such as `26 Jul 2026 (IST)`.
- [ ] Opening and closing times display as IST.
- [ ] Before the configured opening time, the challenge state is `UPCOMING`.
- [ ] During the configured window, the state is `AVAILABLE`.
- [ ] After closing, the state is `CLOSED`.
- [ ] Test near the UTC/IST date boundary: after 12:00 AM IST the system selects the new India date, not the previous UTC date.
- [ ] Browser refresh does not change the challenge date or reset the official timer.

## 5. General and WTC Student access

- [ ] Active General Student can open and submit the challenge.
- [ ] Active WTC Student can open and submit the challenge.
- [ ] Unauthenticated visitor is directed to login/signup before official participation.
- [ ] Student profile must match Board + Class + Medium.
- [ ] One official attempt per student per challenge date is enforced.

## 6. Academic separation

After one completed challenge, confirm that no challenge row was added or updated in:

- [ ] `PROGRESS_TRACKER`
- [ ] `TEST_RESULTS`
- [ ] `MCQ_ATTEMPTS`
- [ ] `MCQ_ATTEMPT_DETAILS`
- [ ] `STUDENT_SKILL_REPORT`
- [ ] `GAMIFICATION_DATA`

Confirm:

- [ ] One temporary anonymous row exists in `DAILY_CHALLENGE_LIVE`.
- [ ] It contains no student name, mobile number or raw student ID.
- [ ] Cleanup removes expired rows after closing plus 24 hours.

## 7. Regression

- [ ] Homepage loads.
- [ ] Login and signup work.
- [ ] Diagnostic H1.2/H1.3A works.
- [ ] Demo enquiry and `ADMISSION_LEADS` work.
- [ ] Admin Admission Leads panel works.
- [ ] Student Portal loads.
- [ ] Teacher Assigned Tests still work.
- [ ] Static and dynamic MCQ progress remain unchanged.
- [ ] Mobile layout passes on the homepage, Admin panel, Student widget and popup runner.

## Promotion gate

Promote H1.3B-R2 to the stable WAGH Tuition copy only after all required checks pass and a rollback backup is retained.

## Automated package validation completed

The generated source package passed these non-live checks:

- Frontend JavaScript syntax
- Runtime and Authoring Apps Script syntax
- IST midnight-boundary conversion (`18:30 UTC` → next India date)
- Internal date addition and day-difference helpers
- Multi-subject rotation selection
- Same-subject fallback only
- No cross-subject question pool in a daily challenge
- No Daily Challenge writes to academic progress/result sheets
- Duplicate HTML ID scan
- Local asset-reference scan, excluding the intentionally retained external font assets listed in `KEEP_EXISTING_FONT_ASSETS.txt`
- Application shell inclusion of the canonical `time.js` utility
- No `toISOString().slice(...)` or `getTimezoneOffset()` calendar-date logic

Google Apps Script deployment, workbook permissions, real account access and the UTC/IST live date boundary still require the checklist above in the development environment.
