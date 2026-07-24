# WAGH Tuition Classes — Admission Leads Admin Panel H1.1

**Release type:** Cumulative development patch  
**Architecture:** Locked structure preserved  
**Data safety:** Additive columns only; no sheet rows are cleared  
**Stable environment:** Promote only after development testing

## What H1.1 adds

- Admission Leads navigation item and dashboard count in `admin.html`.
- Password-protected viewing of parent contact details.
- Search by student, mobile, class, subject, source and notes.
- Status filtering: `NEW`, `CONTACTED`, `DEMO_BOOKED`, `JOINED`, `NOT_INTERESTED`.
- Direct Call and WhatsApp actions.
- Follow-up notes, demo date and follow-up date.
- Conversion summary cards and source filtering.
- Secure Apps Script read/update actions with admin-password verification.
- Access logging whenever an administrator updates a lead.

## Frontend files

Replace:

- `/admin.html`
- `/assets/js/admin.js`
- `/assets/js/api.js`

Add:

- `/assets/js/admin-admission-leads.js`
- `/assets/css/admin-admission-leads.css`

## Runtime Apps Script files

Replace with the cumulative versions included here:

- `/apps-script/1_runtime_app_script/admission_leads.gs`
- `/apps-script/1_runtime_app_script/api_router.gs`
- `/apps-script/1_runtime_app_script/version.gs`

## Safe installation

1. Back up the Runtime Apps Script project and `WTC_CONTENT_ENGINE` workbook.
2. Replace the three runtime files listed above.
3. Run `installAdmissionLeadAdminSystem()` once.
4. Confirm `ADMISSION_LEADS v1.1 is ready.`
5. Confirm two new columns were appended: `demoDate`, `followUpDate`.
6. Create a new version of the existing Runtime Web App deployment, preserving its `/exec` URL.
7. Upload the frontend files to the development GitHub repository.

Do not run `setupWTCContentEngine()`.

## Security behaviour

- The admin password is required before lead details are returned.
- The password is sent only with the current API request and is not stored in localStorage/sessionStorage.
- Public visitors can only create leads; they cannot list or update them.
- Notes are length-limited and neutralized against spreadsheet formulas.

## Rollback

Restore the previous frontend and three runtime files, then redeploy the prior Runtime version. The additive `demoDate` and `followUpDate` columns may remain safely.
