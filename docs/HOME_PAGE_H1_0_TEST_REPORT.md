# Home Page & Admission Funnel H1.0 — Test Report

**Environment:** Local development copy from `WAGH_Tuition-main (25).zip`  
**Test date:** 23 July 2026  
**Result:** PASS for static, responsive and mocked integration checks

## Static checks

- `index.html` parsed successfully.
- 49 unique element IDs; no duplicate IDs.
- 17 form labels point to valid controls.
- Exactly three forms detected: Admission, Login and Student Signup.
- JavaScript syntax passed for `main.js`, `auth.js` and `api.js`.
- Apps Script syntax passed for `Code.gs`, `api_router.gs`, `version.gs` and `admission_leads.gs`.

## Desktop browser checks — 1440 × 900

- 11 homepage sections rendered.
- All three forms rendered.
- Hero image loaded successfully.
- Desktop navigation displayed correctly.
- Mobile-menu button remained hidden.
- No horizontal page overflow.

## Mobile browser checks — 390 × 844

- Mobile-menu button displayed.
- Desktop navigation stayed collapsed by default.
- Bottom Call / WhatsApp / Free Demo bar displayed.
- No horizontal page overflow.
- Menu open state and `aria-expanded` state worked.
- Class 10 pathway correctly prefilled the admission form.
- Login/Signup tab state worked correctly.
- Demo enquiry success UI, lead ID and prefilled WhatsApp link worked with a mocked successful API response.
- No browser runtime exceptions were detected in the tested flow.

## Admission backend module checks

A local Apps Script-compatible logic harness verified:

- Invalid data is rejected.
- A valid enquiry creates one `NEW` lead record.
- Spreadsheet-formula prefixes are neutralized.
- Short-window duplicate submissions do not create a second row.

## Live checks still required after deployment

The following were not executed against the live Runtime Apps Script or live workbook because this package does not deploy itself:

- Run `installAdmissionLeadSystem()` in the development Runtime Apps Script project.
- Deploy a new Runtime Web App version using the existing `/exec` URL.
- Submit one controlled demo enquiry from the live development homepage.
- Confirm the row appears in `ADMISSION_LEADS`.
- Verify existing Student, Teacher, Admin and Parent login redirects using controlled accounts.

The stable WAGH Tuition environment was not modified or tested.
