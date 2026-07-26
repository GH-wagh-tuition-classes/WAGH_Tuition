# H1.3C Live Test Checklist

Test only in **WAGH Tuition Classes development**.

## A. Installation

- [ ] Run `installDailyChallengeLeaderboardSystem()` successfully.
- [ ] Confirm the message: `Private Chapter Challenge Leaderboard H1.3C is ready.`
- [ ] Confirm `DAILY_CHALLENGE_PARTICIPATION` exists with eight columns.
- [ ] Confirm `DAILY_CHALLENGE_LIVE` contains the five H1.3C review/ranking columns.
- [ ] Confirm the cleanup trigger exists.
- [ ] Confirm Runtime Apps Script and workbooks use `Asia/Kolkata` / IST.
- [ ] Deploy a new Runtime Web App version without changing the `/exec` URL.

## B. Regression safety

- [ ] Student login and dashboard load.
- [ ] Student Assigned Tests load without `Unknown action`.
- [ ] Teacher Dashboard, Assign Tests and Sent Tests load.
- [ ] Admin Teacher Assignments load.
- [ ] Admission Leads and Diagnostic Report modules load.
- [ ] Existing chapter rotation and H1.3B-R2.1 challenge runner still work.

## C. Privacy leaderboard

Use at least five different active General/WTC student accounts in the same Board + Class + Medium group.

- [ ] Complete the same frozen challenge with five eligible attempts.
- [ ] Before five completions, leaderboard says it is waiting for more participants.
- [ ] After five completions, leaderboard becomes visible.
- [ ] Current student sees only their own real name with `— You`.
- [ ] Every other row displays `Hidden Student`.
- [ ] Top 10 is shown.
- [ ] A current student outside Top 10 still sees their own rank row.
- [ ] Browser/API payload contains no other student name, mobile, raw student ID or participant hash.

## D. Ranking

- [ ] Higher score ranks first.
- [ ] Equal scores use fewer wrong answers.
- [ ] Remaining ties use shorter completion time.
- [ ] Remaining ties use earlier valid submission.
- [ ] Student rank matches Admin anonymous analytics.

## E. Suspicious-attempt review

- [ ] An attempt completed in under 60 seconds is marked pending review.
- [ ] It is excluded from ranked count and leaderboard.
- [ ] Admin sees it under flagged attempts as `Hidden Student`.
- [ ] `Approve Rank` makes it eligible.
- [ ] `Exclude` keeps it out of ranking.
- [ ] No personal identity is exposed in the Admin leaderboard or flag row.

## F. Admin controls

- [ ] Admin analytics show Started, In Progress, Completed, Ranked, Flagged and Average.
- [ ] `OPEN` permits starts during the valid challenge date/window.
- [ ] `CLOSED` blocks new starts/resumes.
- [ ] `SUSPENDED` immediately holds the challenge.
- [ ] Returning to `OPEN` restores access before closing time.
- [ ] State note and update timestamp display in IST.
- [ ] `DRAFT` follows the configured automatic IST schedule.

## G. Streaks

- [ ] Completing today records one participation date.
- [ ] Retrying/reloading does not duplicate the date.
- [ ] Consecutive-day completion increases current streak.
- [ ] A missed day resets current streak while preserving best streak.
- [ ] Participation sheet stores no score or personal identity.

## H. Temporary-data cleanup

- [ ] `DAILY_CHALLENGE_LIVE` score rows remain available during the live leaderboard period.
- [ ] Expired rows are removed after challenge close plus 24 hours.
- [ ] Leaderboard disappears after temporary score cleanup.
- [ ] Date-only participation remains for streak calculation.

## I. Academic separation

Record Student Progress and standard test totals before completing a challenge.

- [ ] Complete a Daily Chapter Challenge.
- [ ] `PROGRESS_TRACKER` unchanged.
- [ ] `TEST_RESULTS` unchanged.
- [ ] `MCQ_ATTEMPTS` unchanged.
- [ ] `MCQ_ATTEMPT_DETAILS` unchanged.
- [ ] `STUDENT_SKILL_REPORT` unchanged.
- [ ] `GAMIFICATION_DATA` unchanged.
- [ ] Student Progress page score/accuracy/history does not include the Daily Challenge.

## J. IST boundary

- [ ] Homepage, Student Portal, challenge runner and Admin show IST.
- [ ] Challenge date is determined by server `Asia/Kolkata`, not browser UTC.
- [ ] Opening/closing state is correct around midnight IST.
- [ ] No raw ISO timestamp ending in `Z` is shown to users.

Promote only after every applicable item passes.
