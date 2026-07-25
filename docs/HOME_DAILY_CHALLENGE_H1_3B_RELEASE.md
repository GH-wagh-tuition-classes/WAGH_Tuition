# WAGH Tuition Classes — Home Page H1.3B Release

## Module

**Daily 20-MCQ Whole-Subject Challenge**

Architecture remains **LOCKED v2.3.1 R2**. This is an additive, backward-compatible feature patch built on the tested H1.3A package.

## Student experience

For each active **Class + Board + Medium** group, the system:

1. Finds subjects with at least 20 unique published MCQs.
2. Selects one subject deterministically for the current date.
3. Freezes one shared 20-question test for that group and date.
4. Opens the test in an Assigned-Test-style popup/new tab.
5. Allows one official attempt lasting up to 20 minutes.
6. Restores locally saved answers after browser refresh while the server timer continues.
7. Recalculates the score on the Runtime server.
8. Saves verified result and per-question evidence to existing assessment sheets.
9. Shows score, strong topics and focus topics without revealing exact answers before closing time.

## Question pattern

The automatic selector uses published MCQ metadata to target:

- 6 Easy questions
- 10 Medium questions
- 4 Hard questions
- Distribution across available chapters of the selected subject

When a difficulty bucket contains too few questions, the remaining positions are filled from other eligible published questions while maintaining chapter balance. This is a metadata-driven board-pattern approximation; the source MCQs and their difficulty/topic labels remain the Authoring source of truth.

## Data architecture

No new workbook is created.

### Existing Authoring sheets reused

- `MCQ_ENGINE`
- `MCQ_TEST_ENGINE`
- `MCQ_TEST_QUESTION_MAP`

The frozen daily test is stored as `testType = DAILY_CHALLENGE`. Generated challenge tests are excluded from the Teacher assignment catalogue.

### Existing Runtime sheets reused

- `TEST_RESULTS`
- `MCQ_ATTEMPTS`
- `MCQ_ATTEMPT_DETAILS`
- `MIGRATION_LOG`

No leaderboard is included in H1.3B. Privacy leaderboard, streaks and Admin challenge analytics remain H1.3C.

## Runtime Apps Script installation

In the **development Runtime Apps Script** project:

### Add

- `daily_challenge.gs`

### Replace with the cumulative versions

- `api_router.gs`
- `constants.gs`
- `test_assignments.gs`
- `version.gs`

Confirm that Runtime Script Properties already contains:

```text
WTC_AI_CONTENT_ENGINE_ID = development WTC_AI_CONTENT_ENGINE spreadsheet ID
```

The Runtime Apps Script owner must have edit access to that development Authoring workbook because the frozen daily test definition is recorded in `MCQ_TEST_ENGINE` and `MCQ_TEST_QUESTION_MAP`.

Run once:

```javascript
installDailyChallengeSystem()
```

This installer is safe to rerun. It only adds missing columns and records an idempotent migration. It does not clear or overwrite existing rows.

Expected success message:

```text
Daily 20-MCQ Challenge H1.3B is ready.
```

Then deploy a **new version of the existing Runtime Web App deployment**:

- Execute as: **Me**
- Access: **Anyone**
- Preserve the existing `/exec` URL

No Authoring Apps Script code deployment is required for H1.3B.

## GitHub development installation

### Replace

- `index.html`
- `student.html`

### Add

- `assets/js/daily-challenge-launcher.js`
- `assets/js/home-daily-challenge.js`
- `assets/js/student-daily-challenge.js`
- `assets/js/daily-challenge-engine.js`
- `assets/css/home-daily-challenge.css`
- `assets/css/student-daily-challenge.css`
- `assets/css/daily-challenge.css`
- `tests/online-test/daily-challenge.html`

Upload to **WAGH Tuition Classes development** first. Do not promote to the stable WAGH Tuition copy until the live checklist passes.

## Important operating rules

- Exactly one official attempt is created per Student per date.
- Clearing browser storage does not create a new official attempt.
- The server attempt expiry remains authoritative after refresh.
- Public question payloads use temporary challenge question tokens rather than source `mcqId` values.
- Public question payloads do not include `correctOption` or `explanation`.
- A subject is unavailable when it has fewer than 20 unique valid published MCQs.
- Existing Assigned Tests, static MCQs, chapter diagnostics and admission workflows remain separate.

## Rollback

1. Restore the pre-H1.3B frontend files.
2. Restore the previous Runtime Apps Script deployment version.
3. Leave additive columns and generated daily-test rows in place; they do not affect older code.
4. Generated rows may remain as historical evidence. Do not delete source MCQs.

## Prohibited action

Do not run:

```javascript
setupWTCContentEngine()
```

That legacy function clears populated sheets.
