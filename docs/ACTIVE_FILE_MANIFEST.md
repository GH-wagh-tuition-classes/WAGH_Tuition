# Active API File Manifest

## Runtime Apps Script

| File | Status |
|---|---|
| Code.gs | H1.2 cumulative header registry; runtime deployment replacement is optional if current route wiring is already H1.1 |
| constants.gs | Active unchanged module |
| dependency_manager.gs | Active unchanged module |
| feature_engine.gs | Active unchanged module |
| workbook_repository.gs | Stage 1 cumulative |
| runtime_api.gs | RP1 cumulative |
| api_router.gs | H1.1 cumulative; no new H1.2 runtime route required |
| mcq.gs | RP1 cumulative |
| migration_manager.gs | Active unchanged module |
| health_check.gs | Active unchanged module |
| version.gs | H1.2 cumulative |
| profile_change_requests.gs | PCR1 new module |
| admission_leads.gs | H1.2 public capture + secure Admin follow-up + diagnostic result fields |

## Authoring Apps Script

| File | Status |
|---|---|
| WTC_AI_Content_Engine.gs | Latest cumulative route map with H1.2 public diagnostic actions |
| public_diagnostic.gs | H1.2 short-lived public question sampler and server-side scorer |
| AUTHORING_ROUTE_PATCH_H1_2.txt | Exact non-destructive route-map patch reference |

## Excluded intentionally

- Files whose names began with `.trashed-`
- Superseded copies with `(1).txt` naming
- Previous patch-only versions
- Frontend feature/UI files not required as API adapters

## Frontend H1.2 additions and cumulative patches

- `index.html` — diagnostic funnel section and entry points
- `assets/js/home-diagnostic.js` — dependent selector, runner, scoring flow and result lead capture
- `assets/css/home-diagnostic.css` — mobile-first diagnostic UI
- `assets/js/assessment-api.js` — public diagnostic read/score client actions
- `assets/js/admin-admission-leads.js` — chapter/result/focus display
- `assets/css/admin-admission-leads.css` — diagnostic result card styling

H1.1 files remain cumulative and backward-compatible.

## Home Conversion H1.3A
- `assets/js/home-campaign.js` — first-touch campaign attribution
- `assets/js/home-diagnostic.js` — personalized report and conversion actions
- `assets/js/admin-admission-leads.js` — conversion follow-up dashboard
- `apps-script/1_runtime_app_script/admission_leads.gs` — 37-column lead/report schema
- `apps-script/2_authoring_apps_script/public_diagnostic.gs` — server-side topic performance report

## Home Daily Challenge H1.3B — SUPERSEDED

The whole-subject H1.3B implementation must not be promoted.


### Runtime
- `apps-script/1_runtime_app_script/daily_challenge.gs` — daily subject rotation, frozen 20-question test, official attempt and server scoring
- `apps-script/1_runtime_app_script/api_router.gs` — three Daily Challenge actions
- `apps-script/1_runtime_app_script/test_assignments.gs` — excludes generated Daily Challenges from Teacher assignment catalogue
- `apps-script/1_runtime_app_script/version.gs` — H1.3B registry

### Frontend
- `index.html` — homepage Daily Challenge conversion section
- `student.html` — Student Daily Challenge widget assets
- `assets/js/daily-challenge-launcher.js` — shared popup launcher and protected status request
- `assets/js/home-daily-challenge.js` — homepage state card
- `assets/js/student-daily-challenge.js` — Student Portal widget
- `assets/js/daily-challenge-engine.js` — official runner, refresh restore and server submission
- `assets/css/home-daily-challenge.css` — homepage section
- `assets/css/student-daily-challenge.css` — Student widget
- `assets/css/daily-challenge.css` — runner overrides
- `tests/online-test/daily-challenge.html` — popup/new-tab runner shell

## Home Chapter Challenge H1.3B-R1 — SUPERSEDED BY H1.3B-R2

### Runtime
- `apps-script/1_runtime_app_script/daily_challenge.gs` — Admin chapter pool, automatic rotation, frozen 20-question challenge, temporary anonymous result storage and cleanup.
- `apps-script/1_runtime_app_script/api_router.gs` — Student and Admin Chapter Challenge actions.
- `apps-script/1_runtime_app_script/test_assignments.gs` — excludes generated challenges from Teacher assignment catalogue.
- `apps-script/1_runtime_app_script/version.gs` — H1.3B-R1 registry.

### Admin
- `admin.html` — Chapter Challenge Manager panel.
- `assets/js/admin-daily-challenge.js` — catalogue, chapter pool, save and preview/freeze flow.
- `assets/css/admin-daily-challenge.css` — responsive manager styling.

### Student/Home
- `index.html`, `student.html` — chapter challenge entry points.
- `assets/js/daily-challenge-launcher.js` — shared launcher.
- `assets/js/home-daily-challenge.js` — homepage card.
- `assets/js/student-daily-challenge.js` — Student Portal card.
- `assets/js/daily-challenge-engine.js` — popup runner and temporary result flow.
- `tests/online-test/daily-challenge.html` — runner shell.


## Home Chapter Challenge H1.3B-R2 — ACTIVE

### Time standard
- `assets/js/time.js` — canonical browser date/time utility for `Asia/Kolkata`.
- `apps-script/1_runtime_app_script/datetime.gs` — canonical Runtime Apps Script date/time utility and safe workbook timezone audit.

### Runtime
- `apps-script/1_runtime_app_script/daily_challenge.gs` — multi-subject ordered rotation per Board + Class + Medium group, one subject per day, same-subject fallback, frozen 20-question challenge and temporary anonymous result storage.
- `apps-script/1_runtime_app_script/api_router.gs` — Student/Admin challenge routes plus IST API envelope metadata.
- `apps-script/1_runtime_app_script/health_check.gs` — project date/time compliance report.
- `apps-script/1_runtime_app_script/version.gs` — H1.3B-R2 and IST standard registry.
- `apps-script/1_runtime_app_script/test_assignments.gs` — IST-safe due-date parsing and generated-challenge exclusion.
- `apps-script/1_runtime_app_script/teacher_dashboard.gs` — IST-safe timestamps and date parsing.
- `apps-script/1_runtime_app_script/admission_leads.gs` — IST-safe admission/report timestamps.

### Admin
- `admin.html` — multi-subject chapter rotation builder with IST schedule controls.
- `assets/js/admin-daily-challenge.js` — add chapters from multiple subjects, reorder, enable/disable, save and preview.
- `assets/css/admin-daily-challenge.css` — responsive R2 manager styling.

### Student/Home
- `index.html`, `student.html` — R2 entry points and canonical time utility.
- `assets/js/home-daily-challenge.js`, `assets/js/student-daily-challenge.js` — server-window states and IST schedule display.
- `assets/js/daily-challenge-engine.js` — official popup runner with server expiry and refresh restore.
- `tests/online-test/daily-challenge.html` — popup runner shell.

### Rules
- General and WTC Students are eligible.
- One official attempt per challenge.
- No challenge writes to academic progress/result/skill/gamification sheets.
- Only `DAILY_CHALLENGE_LIVE` stores temporary anonymous summaries.

## Home Chapter Challenge H1.3C — ACTIVE

Base: tested H1.3B-R2.1. H1.3C preserves the multi-subject chapter rotation, IST standard and restored Phase 2.5 routes.

### Runtime
- `apps-script/1_runtime_app_script/daily_challenge.gs` — private temporary leaderboard, date-only participation streaks, challenge-state controls, suspicious-attempt review and Admin live analytics.
- `apps-script/1_runtime_app_script/api_router.gs` — preserves all H1.3B-R2.1 routes and adds four H1.3C actions.
- `apps-script/1_runtime_app_script/version.gs` — H1.3C registry.

### Runtime data
- `DAILY_CHALLENGE_LIVE` — temporary pseudonymous scores and ranking/review metadata; automatic expiry remains active.
- `DAILY_CHALLENGE_PARTICIPATION` — date-only pseudonymous completion record for streaks; no score or personal identity.
- `MCQ_TEST_ENGINE` — additive `challengeState`, freeze and state-audit metadata.

### Admin
- `admin.html` — private leaderboard analytics, state controls and flagged-attempt review.
- `assets/js/admin-daily-challenge.js` — H1.3C Admin workflows.
- `assets/css/admin-daily-challenge.css` — responsive analytics/control styling.

### Student/Home
- `tests/online-test/daily-challenge.html` — private leaderboard and streak panel.
- `assets/js/daily-challenge-engine.js` — leaderboard/streak loading and pending-review result state.
- `assets/css/daily-challenge.css` — responsive private leaderboard styling.
- `assets/js/home-daily-challenge.js`, `assets/js/student-daily-challenge.js` — participation/rank summaries.
- `index.html`, `student.html` — H1.3C cache/version entry points.

### Locked rules
- Other students’ names are never returned to the student browser.
- Daily Challenge scores remain temporary and do not enter academic progress.
- Only participation dates may persist for challenge streaks.
- All challenge dates/times use `Asia/Kolkata` (IST).

