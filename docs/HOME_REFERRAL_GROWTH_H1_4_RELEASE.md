# WAGH Tuition Classes — H1.4 Referral & Growth Tracking

**Project:** WAGH Tuition Classes development  
**Architecture:** LOCKED v2.3.1 R2 — unchanged  
**Base:** `WTC-H1.3C-PROD-LOCK-20260727-R1`  
**Release type:** Cumulative, backward-compatible development patch  
**Time standard:** Tapi, Gujarat, India — `Asia/Kolkata` / IST

## 1. Purpose

H1.4 adds a privacy-safe student referral funnel without connecting referral activity to academic Progress, test evidence, Daily Challenge ranking, skills or gamification.

The tracked growth path is:

```text
Student referral link
→ unique link visit
→ student signup and/or demo/report enquiry
→ demo booked
→ student joined
→ manual Admin reward review
```

## 2. Included functionality

### Student Portal — Refer & Grow

- One unique referral code per active Student account.
- Shareable WTC homepage link.
- Copy, WhatsApp and native-share actions.
- Private aggregate counters for visits, signups, enquiries, joined students and reward reviews.
- Recent stage-only activity.
- No referred student name, mobile number or student ID is returned to the Student Portal.

Both active `GENERAL_STUDENT` and `WTC_STUDENT` accounts may share a link. Reward approval remains entirely manual.

### Public homepage attribution

- Reads `?ref=WTC-...` or `?referral=WTC-...`.
- Preserves the first valid referral for 30 days in browser storage.
- Shows a referral welcome banner.
- Records a pseudonymous unique visit.
- Carries the referral code into Signup, Free Demo and Diagnostic Report requests.
- Does not expose the referrer’s private account details publicly.

### Admin Dashboard — Referral Growth

- Referral funnel summary and visit-to-join conversion rate.
- Search and filter by stage, reward status and referral code.
- Admin-only referred student/lead details.
- Stage updates for Clicked, Signed Up, Enquiry, Demo Booked, Joined and Rejected.
- Dedicated reward approval/rejection action.
- Reward approval blocked until the referral is confirmed as Joined.
- Referral code enable/disable control.
- Audit entries in `ACCESS_LOGS` for Admin stage, reward and code-status changes.

### Anti-abuse safeguards

- First valid referral wins for 30 days in the same browser.
- Public visit identity is SHA-256 pseudonymized.
- Repeated visit recording is rate-limited/deduplicated.
- Self-referral by student identity or registered mobile is rejected.
- The same referred student/mobile cannot be claimed by two referral codes.
- A referral reward is never issued automatically.

## 3. Data additions

The safe installer creates only missing structure:

### `REFERRAL_CODES`

```text
referralCode
studentId
studentName
studentType
status
createdAt
updatedAt
shareCount
lastSharedAt
```

### `REFERRAL_TRACKER`

```text
referralId
referralCode
referrerStudentId
referrerName
referrerType
visitorHash
referredStudentId
referredName
referredMobile
stage
source
campaign
landingPage
leadId
clickAt
signupAt
enquiryAt
demoBookedAt
joinedAt
rewardStatus
rewardType
rewardNote
rewardApprovedBy
rewardApprovedAt
rejectionReason
createdAt
updatedAt
```

The migration is recorded as:

```text
MIGRATION_H1_4_REFERRAL_GROWTH
```

## 4. Academic-data separation

H1.4 does not write to:

- `PROGRESS_TRACKER`
- `TEST_RESULTS`
- `MCQ_ATTEMPTS`
- `MCQ_ATTEMPT_DETAILS`
- `STUDENT_SKILL_REPORT`
- `GAMIFICATION_DATA`
- `DAILY_CHALLENGE_LIVE`
- `DAILY_CHALLENGE_PARTICIPATION`

Referral activity does not change Progress, XP, level, assigned-test results, topic reports or Daily Challenge ranking.

## 5. Runtime installation

Back up the development Runtime Apps Script project and `WTC_CONTENT_ENGINE` first.

Add:

```text
apps-script/1_runtime_app_script/referral_growth.gs
```

Replace with the supplied cumulative versions:

```text
apps-script/1_runtime_app_script/api_router.gs
apps-script/1_runtime_app_script/version.gs
```

Keep every other tested Runtime module unchanged, especially:

```text
teacher_assignments.gs
datetime.gs
daily_challenge.gs
test_assignments.gs
teacher_dashboard.gs
admission_leads.gs
```

Run once:

```javascript
installReferralGrowthSystem()
```

Expected message:

```text
Referral and Growth Tracking H1.4 is ready.
```

Confirm that `REFERRAL_CODES` and `REFERRAL_TRACKER` exist and that `MIGRATION_LOG` contains the H1.4 migration row.

Deploy a new version of the existing Runtime Web App while preserving the same `/exec` URL and access settings.

Do not run:

```text
setupWTCContentEngine()
setupWtcAiContentEngine()
```

No Authoring Apps Script change or deployment is required.

## 6. GitHub development installation

Upload the exact frontend paths listed in:

```text
docs/HOME_REFERRAL_GROWTH_H1_4_FILE_MANIFEST.txt
```

Do not replace:

- `assets/fonts/`
- `assets/js/config.js`
- `assets/js/assessment-config.js`
- existing environment URLs
- unrelated Student, Teacher, Admin or Daily Challenge modules

No content re-import is required.

## 7. Rollback

If live development testing fails:

1. Restore the H1.3C production-lock frontend files.
2. Restore the prior Runtime `api_router.gs` and `version.gs`.
3. Remove or leave `referral_growth.gs` un-routed.
4. Deploy a new Runtime version using the restored code and the same `/exec` URL.
5. Keep `REFERRAL_CODES` and `REFERRAL_TRACKER` as inactive historical data; do not delete them during rollback.

## 8. Promotion rule

H1.4 remains a development release until the user completes the live checklist. Promote it to stable only through a new cumulative production lock based on the exact tested files.
