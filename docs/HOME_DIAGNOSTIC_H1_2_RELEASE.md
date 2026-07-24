# Home Diagnostic Funnel H1.2 — Release Guide

## Status

Development build complete. This patch is cumulative over the tested H1.1 Admission Leads Admin Panel and preserves the locked WAGH Tuition Classes architecture.

## What H1.2 adds

The public homepage now guides a visitor through the exact dependent sequence:

**Class → Board → Medium → Subject → Chapter → Start Diagnostic Test**

The next selector is enabled only when the previous choice is valid. Classes, boards, media, subjects and chapters come from the existing runtime catalogue; unavailable combinations are not hardcoded or displayed.

A chapter diagnostic uses up to 10 published MCQs. Question answers remain in a short-lived Authoring Apps Script session and scoring occurs server-side. After the result, the parent can request guidance/demo contact. The same `ADMISSION_LEADS` row records the chosen chapter, score and focus topics.

## Architecture impact

- No folder-structure change.
- No login or signup route change.
- No Student, Teacher or Parent portal change.
- No destructive spreadsheet migration.
- No diagnostic attempt is written to student progress because the visitor may not be logged in.
- Existing H1.0 demo enquiries and H1.1 Admin lead management continue unchanged.

## Deployment order

### A. Runtime Apps Script

Replace the cumulative files in the **Runtime Apps Script** project:

1. `admission_leads.gs`
2. `version.gs`

`Code.gs` in this package contains the cumulative 25-column registry for consistency. Replace it only when your deployed Runtime project still keeps the `ADMISSION_LEADS` header registry inside `Code.gs`; otherwise the tested `admission_leads.gs` installer is sufficient.

Run once:

```javascript
installAdmissionLeadDiagnosticSystem()
```

This safely appends only these missing columns:

```text
chapterId
chapterName
diagnosticScore
diagnosticTotal
diagnosticPercent
weakTopics
diagnosticTakenAt
```

Existing rows, H1.1 columns and follow-up data are preserved. Confirm that `ADMISSION_LEADS` now has 25 columns.

Then edit the **existing Runtime Web App deployment**, select **New version**, and preserve the same `/exec` URL. Keep **Execute as: Me** and **Who has access: Anyone**.

### B. Authoring / Published-content Apps Script

Add:

- `public_diagnostic.gs`

Patch the current `doPost()` route map with the exact two H1.2 routes:

```javascript
getPublicDiagnostic,
scorePublicDiagnostic,
```

Use `apps-script/2_authoring_apps_script/AUTHORING_ROUTE_PATCH_H1_2.txt` for the exact insertion location.

Do not replace a newer Authoring Engine with an older full copy merely to add these two routes. Patch the current deployed cumulative script. Then deploy a **new version of the existing Authoring Web App** and preserve the `/exec` URL already configured in `assets/js/assessment-config.js`.

### C. Development GitHub frontend

Replace:

- `index.html`
- `assets/js/assessment-api.js`
- `assets/js/admin-admission-leads.js`
- `assets/css/admin-admission-leads.css`

Add:

- `assets/js/home-diagnostic.js`
- `assets/css/home-diagnostic.css`

Upload to the **WAGH Tuition Classes development repository** first. Do not promote to the stable student-facing copy until the live checklist passes.

## Security and privacy behaviour

- The H1.2 endpoint sends only the selected public question sample.
- It does not include `correctOption` in the browser response.
- The answer key stays in Script Cache for approximately 30 minutes.
- The score and weak topics are calculated by Apps Script.
- Parent contact information is stored only after explicit consent.
- Existing Admin password protection is required to view or update lead details.

## Rollback

Restore the previous H1.1 frontend and Apps Script versions. The seven additive sheet columns may safely remain; H1.1 ignores them. No spreadsheet rollback or data deletion is required.

## Prohibited action

Do not run `setupWTCContentEngine()`. It is a legacy destructive setup function.
