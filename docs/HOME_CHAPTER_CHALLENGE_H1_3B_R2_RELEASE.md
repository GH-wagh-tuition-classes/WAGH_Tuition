# Home Chapter Challenge H1.3B-R2 — Deployment Guide

**Project:** WAGH Tuition Classes  
**Architecture:** LOCKED v2.3.1 R2  
**Release:** H1.3B-R2  
**Canonical time zone:** `Asia/Kolkata` — India Standard Time (IST, UTC+05:30), used for Tapi, Gujarat, India

## What this release changes

H1.3B-R2 supersedes H1.3B-R1. It keeps the Chapter Daily Challenge separate from academic progress while adding:

- One configuration for each **Board + Class + Medium** group.
- An ordered rotation containing chapters from multiple subjects.
- One subject per daily challenge.
- Same-subject chapter fallback only when the primary chapter has fewer than 20 eligible questions.
- Exactly 20 unique Published MCQs in every frozen challenge.
- Admin opening time, closing time, duration and rotation start date controls.
- Server-authoritative IST date selection and challenge windows.
- A project-wide browser and Apps Script date/time standard for Tapi, Gujarat, India.

The module remains open to active General and WTC Student accounts.

## Academic separation remains locked

The Daily Challenge does **not** write to:

- `PROGRESS_TRACKER`
- `TEST_RESULTS`
- `MCQ_ATTEMPTS`
- `MCQ_ATTEMPT_DETAILS`
- `STUDENT_SKILL_REPORT`
- `GAMIFICATION_DATA`

Only temporary anonymous challenge data is written to `DAILY_CHALLENGE_LIVE`. It is removed after the closing time plus the configured cleanup period, currently 24 hours.

## Internal and display formats

| Purpose | Format |
|---|---|
| Internal date key | `yyyy-MM-dd` |
| Internal timestamp | `yyyy-MM-dd HH:mm:ss` |
| User display | `dd MMM yyyy, hh:mm AM/PM IST` |
| Canonical IANA zone | `Asia/Kolkata` |

HTML date fields still use `yyyy-MM-dd`, because that is required by browsers. A separate readable IST date is shown beside those fields.

# Installation order

## A. Runtime Apps Script

Add this new file:

- `datetime.gs`

Replace these cumulative files:

- `daily_challenge.gs`
- `api_router.gs`
- `health_check.gs`
- `version.gs`
- `test_assignments.gs`
- `teacher_dashboard.gs`
- `admission_leads.gs`

Keep every other active Runtime file unchanged.

### Required Script Property

Confirm that this existing property is present:

```text
WTC_AI_CONTENT_ENGINE_ID
```

The Runtime Apps Script owner must have edit access to the Authoring workbook.

### Run the safe installer once

```javascript
installMultiSubjectChapterDailyChallengeSystem()
```

Expected message:

```text
Multi-Subject Chapter Daily Challenge H1.3B-R2 is ready.
```

The installer is additive and idempotent. It:

- Verifies `DAILY_CHALLENGE_LIVE`.
- Adds missing R2 metadata columns to Authoring test configuration sheets.
- Migrates existing H1.3B-R1 single-subject configurations to ordered rotation items.
- Preserves existing challenge rows and all academic data.
- Verifies reachable workbook time zones.
- Creates or reuses the temporary-data cleanup trigger.

Do **not** run `setupWTCContentEngine()`.

### Runtime Apps Script project time zone

Open **Project Settings → Time zone** and set:

```text
(GMT+05:30) Asia/Kolkata
```

Then create a new version of the existing Runtime Web App deployment. Preserve the same `/exec` URL, with:

- Execute as: **Me**
- Who has access: **Anyone**

## B. Authoring Apps Script

Replace:

- `public_diagnostic.gs`

No Daily Challenge Authoring route is added in R2; the replacement only keeps authoring-side timestamps on the same IST standard.

Set **Project Settings → Time zone** to `Asia/Kolkata`, then deploy a new version of the existing Authoring Web App while preserving its `/exec` URL.

## C. Google spreadsheet settings

For each reachable project workbook, open **File → Settings** and confirm:

```text
Time zone: India — GMT+05:30
```

Verify at minimum:

- Runtime/content workbook
- Feature workbook
- AI Authoring workbook

The installer attempts to set these workbook time zones safely, but the manual check remains recommended.

## D. GitHub development repository

Replace or add the exact files listed in:

`docs/HOME_CHAPTER_CHALLENGE_H1_3B_R2_FILE_MANIFEST.txt`

Upload to **WAGH Tuition Classes development** first. Do not promote to the stable WAGH Tuition copy until the live checklist passes.

# Admin configuration

Open:

**Admin Dashboard → Chapter Challenge**

1. Enter the Admin password and load the catalogue.
2. Select Board, Class and Medium.
3. Select a Subject.
4. Select one or more chapters and tap **Add Selected Chapters**.
5. Change Subject and add chapters from other subjects to the same rotation.
6. Move items up or down to define the daily order.
7. Disable any item that should remain saved but temporarily skipped.
8. Choose the rotation start date, opening time, closing time and test duration.
9. Save the configuration.
10. Preview and freeze a selected challenge date.

The system chooses the day’s primary rotation item. When it has fewer than 20 eligible MCQs, it may add only other selected chapters from that same subject. It never mixes two subjects in one challenge.

# Freeze and compatibility rules

- Once a challenge is frozen, its subject, chapters and 20 mapped questions remain unchanged.
- Admin configuration edits apply to future unfrozen dates.
- Existing frozen H1.3B-R1 development rows are not altered automatically.
- To test R2 on a date that already has a frozen development challenge, use a future preview date. Delete test rows manually only when no real student has started that development challenge.
- Existing R1 configuration rows are migrated without deletion.
- Existing General/WTC authentication and H1.0–H1.3A functionality remain unchanged.

# Rollback

1. Restore the previous GitHub development commit or backup ZIP.
2. Restore the previous Runtime Apps Script deployment version.
3. Restore the previous Authoring deployment only when its timestamp patch was deployed.
4. Do not delete R2-added columns or `DAILY_CHALLENGE_LIVE`; leaving additive schema in place is safer and backward-compatible.
