# H1.3B Live Test Checklist

Use the **WAGH Tuition Classes development** environment.

## 1. Safe installer

- [ ] Back up Runtime and Authoring workbooks.
- [ ] Confirm Runtime `WTC_AI_CONTENT_ENGINE_ID` points to the development Authoring workbook.
- [ ] Run `installDailyChallengeSystem()`.
- [ ] Confirm the success message.
- [ ] Confirm existing Runtime and Authoring rows remain unchanged.
- [ ] Confirm Daily Challenge columns were appended to the existing sheets.

## 2. Content eligibility

Use a Student profile whose Class + Board + Medium contains a subject with at least 20 valid published MCQs across its chapters.

- [ ] Homepage card displays one subject for today.
- [ ] Student Portal widget displays the same subject.
- [ ] A profile with fewer than 20 eligible questions receives a clear unavailable message.

## 3. Frozen group test

Open the challenge using two different Students with the same Class + Board + Medium.

- [ ] Both Students receive the same `challengeId`.
- [ ] Both receive the same 20 questions in the same order.
- [ ] Only one `MCQ_TEST_ENGINE` row is created for that group/date/subject.
- [ ] Exactly 20 published map rows are created in `MCQ_TEST_QUESTION_MAP`.
- [ ] Reopening does not duplicate the test or map.

## 4. Popup runner

- [ ] Homepage Start button opens the challenge popup/new tab.
- [ ] Student Portal Start button opens the same runner.
- [ ] Runner shows 20 questions, palette, answered count and countdown.
- [ ] Options are readable on mobile.
- [ ] Exact correct answers are absent from the browser network response.
- [ ] Source `mcqId` values are absent from the public question response.

## 5. Refresh and timer

- [ ] Answer at least five questions.
- [ ] Refresh the challenge page.
- [ ] Selected answers are restored.
- [ ] The countdown continues from the server start time rather than restarting.
- [ ] Closing and reopening resumes the same attempt.

## 6. Official submission

- [ ] Submit with some unanswered questions and confirm the warning.
- [ ] Result is recalculated and returned by the server.
- [ ] Result shows score, percentage, correct, wrong, unanswered, strong topics and focus topics.
- [ ] Exact answer review remains locked until challenge close.
- [ ] One row is saved in `TEST_RESULTS`.
- [ ] The existing `MCQ_ATTEMPTS` row changes from `IN_PROGRESS` to `COMPLETED`.
- [ ] Exactly 20 evidence rows are saved in `MCQ_ATTEMPT_DETAILS`.

## 7. One-attempt enforcement

- [ ] Reopen after submission.
- [ ] Saved result is displayed.
- [ ] No new official attempt is created.
- [ ] Repeated save/retry does not create a duplicate result.
- [ ] Clearing local browser storage does not create another official attempt.

## 8. Regression

- [ ] Student login and signup still work.
- [ ] Chapter diagnostic H1.2/H1.3A still works.
- [ ] Admission leads and Admin follow-up still work.
- [ ] Teacher Assigned Tests still load and save.
- [ ] Generated `DAILY_CHALLENGE` tests do not appear in Teacher assignable tests.
- [ ] Static and dynamic chapter MCQs remain unchanged.

## Automated validation completed before packaging

- Changed JavaScript syntax: Passed
- Changed Apps Script syntax: Passed
- Runtime mock installer: Passed
- Deterministic same-group challenge: Passed
- Exact 20-question mapping: Passed
- Partial-map repair: Passed
- Public answer-key exclusion: Passed
- Public source-question-ID masking: Passed
- Server scoring: Passed
- Duplicate result reuse: Passed
- One result + 20 evidence rows: Passed
- H1.3B HTML duplicate-ID check: Passed
- H1.3B local asset references: Passed

Pre-existing font files intentionally excluded from previous cumulative packages remain governed by `KEEP_EXISTING_FONT_ASSETS.txt` and were not changed by H1.3B.
