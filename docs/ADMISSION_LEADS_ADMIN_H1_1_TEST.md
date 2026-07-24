# Admission Leads Admin Panel H1.1 — Test Checklist

## Automated validation completed

- Browser JavaScript syntax checks pass for `admin.js`, `admin-admission-leads.js` and `api.js`.
- Apps Script syntax checks pass for `admission_leads.gs`, `api_router.gs` and `version.gs`.
- Required panel IDs are unique.
- Existing Admin panels and script references remain present.
- New API action names match between browser client and Apps Script router.
- Mock backend tests pass for correct-password read, wrong-password rejection, status update, notes and date persistence, and summary recalculation.
- Mock frontend tests pass for secure loading, card rendering, summary counts, text search and status filtering.

A live Apps Script/GitHub deployment test is still required because the local runtime cannot reproduce Google authorization and Web App deployment behavior.

## Required live tests

1. Run `installAdmissionLeadAdminSystem()` and confirm the two new columns.
2. Deploy a new Runtime Web App version using the existing `/exec` URL.
3. Open Admin → Admission Leads.
4. Confirm an incorrect password is rejected.
5. Confirm the correct password loads existing leads.
6. Test search, status filter and source filter.
7. Open Call and WhatsApp buttons.
8. Change one test lead to `CONTACTED`, add notes and a follow-up date, then save.
9. Confirm the same row updates in `ADMISSION_LEADS` without creating a duplicate row.
10. Change a test lead to `DEMO_BOOKED` and save a demo date.
11. Refresh and confirm the saved fields remain.
12. Confirm Dashboard and sidebar `New enquiries` counts update.
13. Re-test Student login, Signup and all existing Admin panels.
