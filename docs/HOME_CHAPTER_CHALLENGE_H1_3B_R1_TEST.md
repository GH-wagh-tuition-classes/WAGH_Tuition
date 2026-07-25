# H1.3B-R1 Live Test Checklist

## A. Installation

- [ ] Run `installChapterDailyChallengeSystem()` successfully.
- [ ] Confirm `DAILY_CHALLENGE_LIVE` exists.
- [ ] Confirm the cleanup trigger exists under Apps Script Triggers.
- [ ] Confirm the existing Runtime `/exec` URL is unchanged.

## B. Admin configuration

- [ ] Open Admin → Chapter Challenge.
- [ ] Wrong Admin password is rejected.
- [ ] Correct Admin password loads subjects and chapters.
- [ ] Published MCQ counts appear against chapters.
- [ ] Select chapters and save the rotation.
- [ ] A pool with fewer than 20 total MCQs is rejected.
- [ ] Preview and freeze today’s challenge.
- [ ] Exactly 20 unique questions appear.
- [ ] If the primary chapter has fewer than 20 questions, the next selected chapter fills the challenge.

## C. General Student

- [ ] Login using an active General Student account.
- [ ] Homepage card displays today’s chapter.
- [ ] Challenge opens in popup/new tab.
- [ ] Refresh resumes the same attempt and selected answers.
- [ ] Submission produces score and topic feedback.
- [ ] Second official attempt is blocked.

## D. WTC Student

- [ ] Login using an active WTC Student account.
- [ ] The same academic group receives the same frozen 20 questions.
- [ ] Submission works.
- [ ] Second official attempt is blocked.

## E. Separation audit

Record row counts before and after a completed challenge:

- [ ] `PROGRESS_TRACKER` unchanged.
- [ ] `TEST_RESULTS` unchanged.
- [ ] `MCQ_ATTEMPTS` unchanged.
- [ ] `MCQ_ATTEMPT_DETAILS` unchanged.
- [ ] `STUDENT_SKILL_REPORT` unchanged.
- [ ] `GAMIFICATION_DATA` unchanged.
- [ ] Only `DAILY_CHALLENGE_LIVE` receives one anonymous temporary row.

## F. Privacy and cleanup

- [ ] `DAILY_CHALLENGE_LIVE` contains no name, mobile or raw student ID columns.
- [ ] Public challenge response contains no correct options.
- [ ] Temporary row has `expiresOn`.
- [ ] Run `cleanupDailyChallengeLiveData()` after using an expired test row and confirm it is deleted.

## G. Regression

- [ ] Student login/signup still works.
- [ ] Assigned Tests still work.
- [ ] Static and dynamic MCQ progress still works independently.
- [ ] Diagnostic test H1.2/H1.3A still works.
- [ ] Admission Leads Admin panel still works.
- [ ] Teacher Assigned Tests do not list generated Daily Challenges.

## Automated predeployment validation

Passed in the generated package:

- Apps Script and browser JavaScript syntax
- Exactly 20 unique question selection
- 15-correct / 3-wrong / 2-unanswered server scoring fixture
- Primary chapter plus next-chapter fallback rotation
- Public payload answer-key protection
- Duplicate HTML ID check
- Required H1.3B-R1 asset check
- Runtime API route wiring
- Academic separation static audit
