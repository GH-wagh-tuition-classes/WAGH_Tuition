# WAGH Tuition Classes — Home Page H1.3B-R1

## Status

Development release for live testing.

This release **supersedes the earlier whole-subject H1.3B package**. Do not promote the older H1.3B package.

## Final behaviour

- Challenge scope: Admin-selected chapter pool, not the whole subject.
- Sequence: Board + Class + Medium group → configured Subject → rotating Chapter Challenge.
- Questions: exactly 20 unique Published MCQs.
- Rotation: one primary chapter per day; when it has fewer than 20 MCQs, the next selected chapter is added automatically.
- Access: active General Students and WTC Students.
- Attempt: one official attempt per student per day.
- Test window: assigned-test-style popup/new tab with timer, question palette and refresh resume.
- Scoring: server-side.
- Academic impact: none.
- Permanent score history: none.
- Temporary storage: anonymous challenge summary only in `DAILY_CHALLENGE_LIVE`.
- Cleanup: automatic after challenge close + 24 hours.

## Academic separation lock

H1.3B-R1 does not write to:

- `PROGRESS_TRACKER`
- `TEST_RESULTS`
- `MCQ_ATTEMPTS`
- `MCQ_ATTEMPT_DETAILS`
- `STUDENT_SKILL_REPORT`
- `GAMIFICATION_DATA`

The installer contains a read-only legacy audit. It never removes old H1.3B test rows.

## Runtime Apps Script deployment

Replace these cumulative files:

1. `daily_challenge.gs`
2. `api_router.gs`
3. `test_assignments.gs`
4. `version.gs`

Keep the existing H1.3A and other Runtime modules unchanged.

Run once:

```javascript
installChapterDailyChallengeSystem()
```

Expected result:

```text
Chapter Daily Challenge H1.3B-R1 is ready.
```

The installer safely:

- Creates `DAILY_CHALLENGE_LIVE`.
- Adds missing challenge configuration columns to `MCQ_TEST_ENGINE`.
- Verifies `MCQ_TEST_QUESTION_MAP`.
- Creates an anonymous participant salt in Runtime Script Properties.
- Creates a daily cleanup trigger when permission is available.
- Records the migration in `MIGRATION_LOG`.

It does not clear or rebuild any sheet.

Confirm that this Runtime Script Property still exists:

```text
WTC_AI_CONTENT_ENGINE_ID
```

Deploy a new version of the existing Runtime Web App and preserve its current `/exec` URL.

No Authoring Apps Script deployment is required.

## GitHub development deployment

Replace:

- `index.html`
- `student.html`
- `admin.html`
- `assets/js/admin.js`
- `assets/js/daily-challenge-engine.js`
- `assets/js/daily-challenge-launcher.js`
- `assets/js/home-daily-challenge.js`
- `assets/js/student-daily-challenge.js`
- `tests/online-test/daily-challenge.html`

Add:

- `assets/js/admin-daily-challenge.js`
- `assets/css/admin-daily-challenge.css`
- `assets/css/home-daily-challenge.css`
- `assets/css/student-daily-challenge.css`
- `assets/css/daily-challenge.css`

## First Admin setup

1. Open **Admin Dashboard → Chapter Challenge**.
2. Enter the Admin password and load the catalogue.
3. Select Board, Class, Medium and Subject.
4. Select chapters in the required rotation order.
5. Choose the rotation start date.
6. Keep **Active for General and WTC Students** enabled.
7. Save the chapter rotation.
8. Select today’s date and choose **Preview & Freeze Challenge**.
9. Confirm that exactly 20 questions appear.

A chapter with fewer than 20 Published MCQs is combined with the next selected chapter. If the complete selected pool still has fewer than 20 unique Published MCQs, the configuration is rejected.

## Temporary data policy

`DAILY_CHALLENGE_LIVE` stores only:

- Hashed participant identity
- Hashed attempt token
- Attempt state and timing
- Temporary score summary
- Temporary strong/focus topics
- Expiry timestamp

It does not store names, mobile numbers, raw student IDs or per-question answer evidence.

The backend never returns another participant’s identity. H1.3C can calculate a privacy-preserving live leaderboard from this temporary sheet.

## Rollback

Restore the previous frontend and Runtime files. Do not delete existing sheets or columns. `DAILY_CHALLENGE_LIVE` may remain unused safely.

Do not run `setupWTCContentEngine()`.
