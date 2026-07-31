# H1.4.4 — Full-Screen Free Tests & Inline Student Login

- Made Daily Chapter Challenge and Targeted Test full-screen in-page experiences on mobile, tablet and desktop.
- Added fixed full-screen toolbars, inner scrolling, safe-area spacing and hidden homepage floating controls while a test is open.
- Corrected Daily Challenge text and badge visibility inside the full-screen experience.
- Added a Student-only mobile/password login form inside the Daily Challenge screen.
- Forced the inline login request and returned session validation to the Student role.
- Kept successful inline login inside the current challenge screen and refreshed challenge status without redirecting to `student.html`.
- Preserved normal role-based homepage login, all challenge/diagnostic APIs, IST rules, referral attribution and academic-data separation.
- Frontend only: no Apps Script, workbook, API-route, migration or architecture changes.

---

# H1.4.3 — Homepage Interaction Consolidation

- Plain homepage loads reset to the header and hero instead of restoring a lower scroll position.
- Replaced the single hero login CTA with side-by-side Student Login and Student Signup buttons.
- Moved the existing Login/Signup forms into a hidden inline drawer directly below those buttons.
- Login and Signup open without forced page scrolling and can be hidden with a Close control.
- Replaced the standalone Daily Challenge and Free Diagnostic homepage sections with one Free Tests card.
- Added Daily Chapter Challenge and Targeted Test sub-cards that open accessible modal windows.
- Preserved `#login`, `#signup`, `#daily-challenge` and `#diagnostic` deep-link behaviour.
- Preserved Android/browser Back, Escape, backdrop close, focus containment and mobile scroll locking for test modals.
- Preserved all H1.4.1 referral, H1.3C challenge, diagnostic, authentication and IST functionality.
- Frontend only: no Apps Script, workbook, API-route, migration or architecture changes.

---

# H1.4.2 — Homepage QA & Conversion Polish

- Added working `#login` and `#signup` hash routing without changing the existing login-page configuration.
- Improved header responsiveness with a compact menu on crowded laptop widths and a wider desktop header container.
- Improved 1024px hero layout by stacking the hero before it becomes cramped.
- Hid the mobile conversion bar while a form field is focused and added safe-area spacing.
- Replaced technical Daily Challenge copy with student-focused wording.
- Added canonical URL, absolute Open Graph image, Open Graph URL and Twitter/X card metadata for referral sharing.
- Increased parent-section body-text contrast.
- Frontend only: no Apps Script, workbook, API-route, authentication or architecture changes.
- Built on the tested H1.4.1 referral hotfix and the H1.3C production-lock baseline.

---

# Production Lock — WTC-H1.3C-PROD-LOCK-20260727-R1

- Date: 27 Jul 2026 (IST)
- Status: User-tested H1.3C cumulative source locked for controlled stable promotion.
- Architecture: LOCKED v2.3.1 R2, unchanged.
- Functional code changes in this lock step: none.
- Documentation/checksum corrections: production lock, stable-promotion checklist, rollback guide, feature-status addendum and final validation report.

---

# Changelog — H1.3C Private Leaderboard, Controls & Analytics

- Added a privacy-preserving temporary leaderboard: Top 10 plus the current student.
- Shows the current student’s name only to themselves; every other participant is `Hidden Student`.
- Added a five-completion visibility threshold, deterministic tie-breaking and current-student rank.
- Added `DAILY_CHALLENGE_PARTICIPATION` for date-only pseudonymous streak tracking without score history.
- Added Admin Draft/Open/Closed/Suspended controls and live challenge analytics.
- Added suspiciously fast attempt review with Approve Rank / Exclude actions.
- Extended temporary `DAILY_CHALLENGE_LIVE` rows with review/ranking fields.
- Preserved automatic expiry after challenge close + 24 hours.
- Preserved H1.3B-R2.1 restored Student, Teacher and Admin routes.
- Kept Daily Challenge fully separate from Student Progress, standard tests, skills and gamification.
- Kept `Asia/Kolkata` as the authoritative project time zone.

---

# H1.3B-R2 — Multi-Subject Chapter Rotation & IST Standard

- Supersedes H1.3B-R1.
- Added one Board + Class + Medium rotation containing chapters from multiple subjects.
- Preserved one subject per daily challenge and same-subject fallback only.
- Added configurable opening time, closing time, duration and rotation start date.
- Removed UTC calendar-date assumptions and made `Asia/Kolkata` the server-authoritative project standard.
- Added shared browser and Runtime Apps Script date/time utilities.
- Added safe workbook time-zone verification without changing project architecture or academic data.
- Preserved temporary anonymous challenge scores and complete separation from academic progress.

# H1.3B — Daily 20-MCQ Whole-Subject Challenge

- Added one deterministic daily subject for each Class + Board + Medium group.
- Added a frozen, chapter-balanced 20-question challenge stored in existing Authoring test/map sheets.
- Added an Assigned-Test-style popup runner with a 20-minute server-authoritative timer.
- Added browser-refresh answer restoration without resetting the official attempt.
- Added one-attempt-per-day enforcement, server scoring and existing result/evidence sheet writes.
- Added answer-key and source-question-ID masking in the public challenge payload.
- Preserved H1.0 through H1.3A, Assigned Tests and all existing chapter features.

# H1.3A — Diagnostic Report & Conversion Engine

- Added personalized diagnostic reports, campaign attribution and conversion-focused Admin analytics.
- Expanded ADMISSION_LEADS through a safe additive migration to 37 columns.
- Preserved H1.0, H1.1 and H1.2 functionality.

# Changelog — Home Diagnostic Funnel H1.2

## Added
- Added a public chapter diagnostic in the exact dependent sequence: Class → Board → Medium → Subject → Chapter.
- Reused runtime `SUBJECT_MASTER` and `CHAPTER_MASTER` catalogue actions instead of hardcoding subject/chapter availability.
- Added a dedicated published-content diagnostic endpoint that samples MCQs without returning answer keys.
- Added a topic-balanced sample of up to 10 questions, short-lived server session, server-side scoring and weak-topic feedback.
- Added diagnostic result lead capture and WhatsApp fallback.
- Extended `ADMISSION_LEADS` safely with chapter and diagnostic result fields.
- Extended the existing Admin Admission Leads panel to display chapter, score and focus topics.

## Compatibility
- Existing H1.0 demo enquiry and H1.1 Admin follow-up workflows remain unchanged.
- No folder-structure, authentication-route or spreadsheet-reset operation was introduced.

# Changelog — Admission Leads Admin Panel H1.1

- Added a modular Admission Leads panel to the existing Admin Dashboard.
- Added secure parent-contact viewing with current admin-password verification.
- Added search, source/status filtering, Call, WhatsApp, notes, demo date and follow-up date.
- Added conversion summary counts and dashboard/sidebar new-lead badges.
- Added `adminGetAdmissionLeads` and `adminUpdateAdmissionLead` runtime actions.
- Upgraded `ADMISSION_LEADS` non-destructively with `demoDate` and `followUpDate`.
- Preserved all existing Admin, Student, Teacher and homepage functionality.

---

# Changelog — Home Page & Admission Funnel H1.0

## Home Page

- Rebuilt the landing page as a mobile-first student-conversion experience.
- Added class pathways, learning flow, parent information and contact sections.
- Added Free Demo / Admission Enquiry separate from student signup.
- Added accessible Login/Signup tabs, password toggles and busy states.
- Added sticky mobile Call, WhatsApp and Free Demo controls.

## Runtime

- Added modular `admission_leads.gs`.
- Added safe `installAdmissionLeadSystem()`.
- Added `ADMISSION_LEADS` and the public `saveAdmissionLead` action.
- Added validation, formula neutralization, locking and short-window duplicate protection.

## Unchanged

- Locked folder structure and existing portal responsibilities.
- Student, Teacher, Admin and Parent portal functionality.
- Authoring Apps Script and published-content engine.
- Stable WAGH Tuition environment.

---

# Changelog — Phase 2.5F v1.0

## Teacher Portal

- Added Assign Tests and Sent Tests navigation.
- Added searchable published-test library.
- Added Quick Assign to All.
- Added selected, attention and no-previous-attempt send modes.
- Added due date, maximum attempts and Teacher message options.
- Added sent-test overview, completion metrics and exact student report.
- Added pending cancellation, CSV export and printable report.
- Preserved all Phase 2.5A–2.5E analytics and browser-local Follow-up Centre.

## Student Portal

- Added an injected Assigned Tests dashboard widget and modal.
- Added pending, overdue and completed states.
- Added exact assigned-test launch with attempt-limit enforcement.
- Added a reusable assigned MCQ runner with question palette, timer, review,
  result display, explanations and automatic save.

## Runtime

- Added modular `test_assignments.gs`.
- Added safe migration `installTestAssignmentSystem()`.
- Added `TEST_ASSIGNMENTS`.
- Added optional `assignmentId` to `TEST_RESULTS` and `MCQ_ATTEMPTS`.
- Added eight API actions for Teacher assignment, Student delivery and result save.
- Added strict published-test and Teacher/Student scope checks.
- Added deterministic idempotency for assignment and result writes.
- Added server-side score recalculation from published MCQ rows.
- Added exact assignment analytics and non-destructive cancellation.

## Unchanged

- Authoring Apps Script code and deployment.
- Existing static MCQ pages and shared Static MCQ Engine.
- Existing dynamic MCQ renderer and current result actions.
- Student profile approval system.
- Admin dashboard and content publishing workflow.
- Stable WAGH Tuition environment.

## H1.3B-R1 — Chapter Daily Challenge — SUPERSEDED BY H1.3B-R2

- Supersedes the whole-subject H1.3B package.
- Added Admin-controlled chapter pools and automatic chapter rotation.
- Opened participation to active General and WTC Student accounts.
- Removed all challenge writes to academic progress, standard test results, attempt evidence, skill reports and gamification.
- Added temporary anonymous `DAILY_CHALLENGE_LIVE` storage with automatic expiry cleanup.
- Added Admin Chapter Challenge Manager and 20-question preview/freeze flow.
