# WAGH Tuition Classes — H1.3C Release

## Private Leaderboard, Challenge Controls and Analytics

Status: Development build ready for live deployment and testing  
Base: Tested H1.3B-R2.1  
Architecture: Locked v2.3.1 R2  
Time standard: Tapi, Gujarat, India — `Asia/Kolkata` (IST)

## What H1.3C adds

- Privacy-preserving leaderboard: Top 10 plus the current student when outside the Top 10.
- The current student sees their own name followed by `— You`.
- Every other participant is returned only as `Hidden Student`.
- Leaderboard becomes visible after five ranked completions.
- Daily participation streak without permanent score history.
- Admin challenge states: `DRAFT`, `OPEN`, `CLOSED`, `SUSPENDED`.
- Admin live analytics: started, in progress, completed, ranked, flagged and average percentage.
- Suspiciously fast attempts under 60 seconds are held for review.
- Admin can approve a flagged attempt for ranking or exclude it.
- Temporary score rows continue to expire after challenge close plus 24 hours.
- Challenge scores remain fully separate from Student Progress, standard tests, skills and gamification.

## Privacy and storage rules

`DAILY_CHALLENGE_LIVE` contains temporary pseudonymous attempt and score summaries. It does not contain student names, mobile numbers or raw student IDs.

`DAILY_CHALLENGE_PARTICIPATION` contains only pseudonymous participant hash, challenge date, challenge ID, student type and timestamps. It stores no score, percentage, correct/wrong counts or completion time.

H1.3C does not write to:

- `PROGRESS_TRACKER`
- `TEST_RESULTS`
- `MCQ_ATTEMPTS`
- `MCQ_ATTEMPT_DETAILS`
- `STUDENT_SKILL_REPORT`
- `GAMIFICATION_DATA`

## Runtime Apps Script installation

Replace these cumulative files:

- `apps-script/1_runtime_app_script/daily_challenge.gs`
- `apps-script/1_runtime_app_script/api_router.gs`
- `apps-script/1_runtime_app_script/version.gs`

Keep all other tested Runtime files, especially:

- `datetime.gs`
- `test_assignments.gs`
- `teacher_assignments.gs`
- `teacher_dashboard.gs`
- `admission_leads.gs`

Run once:

```javascript
installDailyChallengeLeaderboardSystem()
```

Expected message:

```text
Private Chapter Challenge Leaderboard H1.3C is ready.
```

The installer is additive and idempotent. It:

1. Extends `DAILY_CHALLENGE_LIVE` with five missing columns when needed:
   - `studentType`
   - `suspiciousFlag`
   - `suspiciousReason`
   - `reviewStatus`
   - `rankedEligible`
2. Creates `DAILY_CHALLENGE_PARTICIPATION` with eight columns.
3. Adds challenge-control metadata to `MCQ_TEST_ENGINE` when missing:
   - `challengeState`
   - `frozenAt`
   - `stateUpdatedAt`
   - `stateUpdatedBy`
   - `stateNote`
4. Preserves existing challenge configurations, attempts and rows.
5. Creates or reuses the temporary-data cleanup trigger.
6. Runs the IST time-zone audit.

Then deploy a **new version of the existing Runtime Web App deployment** and keep the same `/exec` URL.

No Authoring Apps Script code replacement is required for H1.3C. The Runtime installer needs edit access to the existing Authoring workbook so it can append missing `MCQ_TEST_ENGINE` metadata columns safely.

## GitHub development files

Replace the files listed in `HOME_CHALLENGE_H1_3C_FILE_MANIFEST.txt` using their exact paths.

Important cache-version updates are already included in:

- `admin.html`
- `index.html`
- `student.html`
- `tests/online-test/daily-challenge.html`

Deploy first to **WAGH Tuition Classes development**. Do not promote to the stable WAGH Tuition copy until the live checklist passes.

## Challenge-state behaviour

- `DRAFT`: follows the configured IST schedule and becomes effectively open during the scheduled window.
- `OPEN`: manually opens the frozen challenge until its configured closing time.
- `CLOSED`: blocks new starts and resumes.
- `SUSPENDED`: immediately holds the challenge without deleting it.

Use `SUSPENDED`, not `DRAFT`, when Admin wants to stop an active challenge temporarily.

## Leaderboard rules

Ranking order:

1. Higher score
2. Fewer wrong answers
3. Shorter completion time
4. Earlier valid submission

Only eligible completed attempts are ranked. Suspicious attempts remain excluded until Admin approval.

The server never sends another student’s name, mobile number, raw ID or participant hash to the student browser.

## Rollback

A rollback can restore the previous H1.3B-R2.1 frontend and Runtime files. The additive columns and `DAILY_CHALLENGE_PARTICIPATION` sheet may remain safely; they do not affect H1.3B-R2.1 or academic progress.

Do not run `setupWTCContentEngine()`.
