# Runtime API Routes

login, signupStudent, updateStudentProfile, getSubjects, getChapters, getChapterFeatures, getStudentProgress, logAccess, adminDashboard


## Student Profile Change Approval System v1.0

Student actions:

- `changeStudentPassword`
- `createProfileChangeRequest`
- `getMyProfileChangeRequests`
- `cancelProfileChangeRequest`

Admin actions:

- `getProfileChangeRequests`
- `approveProfileChangeRequest`
- `rejectProfileChangeRequest`

The legacy `updateStudentProfile` route remains present for compatibility but rejects direct student changes to name, mobile, board, class, medium, student type or access status.


## Home Page Admission Funnel H1.0

Public conversion action:

- `saveAdmissionLead`

The route validates a demo/admission enquiry and saves it to the additive `ADMISSION_LEADS` runtime sheet. It does not create a student account.


## Admission Leads Admin H1.1

- `adminGetAdmissionLeads` — Admin-password protected lead list and conversion summary.
- `adminUpdateAdmissionLead` — Admin-password protected status, notes, demo date and follow-up date update.


## Home Diagnostic Funnel H1.2

Runtime catalogue and lead actions:

- `getSubjects` — returns active subject combinations used by the dependent selector.
- `getChapters` — returns active chapters for the chosen class, board, medium and subject.
- `saveAdmissionLead` — stores the diagnostic context and server-produced result in `ADMISSION_LEADS`.

Authoring/published-content actions:

- `getPublicDiagnostic` — accepts `chapterId`, chooses up to 10 published MCQs and returns question text/options without answer keys. A short-lived diagnostic session is stored server-side.
- `scorePublicDiagnostic` — accepts the diagnostic session ID and selected answers, then returns score, unanswered count and weak-topic feedback from the server-side answer key.

Public diagnostic sessions expire after approximately 30 minutes and do not write to `TEST_RESULTS`, `PROGRESS_TRACKER` or MCQ progress.


## H1.3B-R2 Multi-Subject Chapter Challenge routes

| Action | Access | Purpose |
|---|---|---|
| `studentGetDailyChallengeStatus` | Active General/WTC Student | Read today’s configured chapter challenge state. |
| `studentOpenDailyChallenge` | Active General/WTC Student | Start/resume one official temporary attempt. |
| `saveDailyChallengeResult` | Active General/WTC Student | Server-score and store only a temporary anonymous summary. |
| `adminGetDailyChallengeManager` | Admin password verified | Load the subject/chapter catalogue, Published MCQ counts, IST server time and saved multi-subject rotations. |
| `adminSaveDailyChallengeConfig` | Admin password verified | Save/suspend an ordered multi-subject chapter rotation for a Board + Class + Medium group. |
| `adminPrepareDailyChallenge` | Admin password verified | Preview and freeze the exact 20-question, one-subject challenge for an IST date. |

These routes do not update academic progress or standard test-result sheets.


All Runtime API envelopes use `Asia/Kolkata` and include `serverDate`, `serverTime`, `timezone` and `timezoneLabel` when those fields are not already supplied by the action.

## H1.3C Private Leaderboard and Challenge-control routes

| Action | Access | Purpose |
|---|---|---|
| `studentGetDailyChallengeLeaderboard` | Active General/WTC Student | Return the privacy leaderboard and date-only challenge streak for the current student. Other participants are labelled `Hidden Student`. |
| `adminGetDailyChallengeAnalytics` | Admin password verified | Return per-date anonymous participation, completion, ranking, flag and average metrics. |
| `adminSetDailyChallengeState` | Admin password verified | Set a frozen challenge to `DRAFT`, `OPEN`, `CLOSED` or `SUSPENDED`. |
| `adminReviewDailyChallengeAttempt` | Admin password verified | Approve a suspicious temporary attempt for ranking or exclude it. |

The existing H1.3B-R2.1 Student and Admin challenge actions remain available. H1.3C returns no other student name, mobile number, raw student ID or participant hash to the student browser.

