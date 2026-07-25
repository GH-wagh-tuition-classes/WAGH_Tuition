# Home Page H1.3A — Diagnostic Report & Conversion Engine

Status: DEVELOPMENT BUILD — ready for live testing
Architecture: WAGH Tuition Classes LOCKED v2.3.1 R2

## What this patch adds

- Personalized diagnostic report with performance level, strong topics, focus topics, time used and recommended next steps.
- Report-to-demo and report-to-signup conversion actions.
- First-touch campaign attribution from `utm_*`, `source` and `campaign` parameters.
- Campaign, source and landing-page details saved with demo and diagnostic leads.
- Admin follow-up dashboard with due-today, overdue, report-requested and conversion summary.
- One-click WhatsApp personalized report.
- Safe additive ADMISSION_LEADS migration from 25 to 37 columns.

## Runtime Apps Script installation

Replace the cumulative files:

- `apps-script/1_runtime_app_script/admission_leads.gs`
- `apps-script/1_runtime_app_script/Code.gs`
- `apps-script/1_runtime_app_script/version.gs`

Run once:

```javascript
installAdmissionLeadConversionSystem()
```

Confirm `ADMISSION_LEADS` has 37 columns. Existing rows are preserved. Then deploy a new version of the existing Runtime Web App and keep the same `/exec` URL.

## Authoring Apps Script installation

Replace:

- `apps-script/2_authoring_apps_script/public_diagnostic.gs`

H1.2 routes `getPublicDiagnostic` and `scorePublicDiagnostic` must remain in the existing route map. No new route name is required. Deploy a new version of the existing Authoring Web App and keep the same `/exec` URL.

## GitHub development files

Replace:

- `index.html`
- `admin.html`
- `assets/js/main.js`
- `assets/js/home-diagnostic.js`
- `assets/css/home-diagnostic.css`
- `assets/js/admin-admission-leads.js`
- `assets/css/admin-admission-leads.css`

Add:

- `assets/js/home-campaign.js`

## Campaign-link examples

```text
index.html?utm_source=instagram&utm_medium=reel&utm_campaign=class10_science
index.html?source=whatsapp&campaign=gseb_math_demo
```

## Rollback

Restore the H1.2 frontend and Apps Script files. The 12 additive sheet columns may safely remain; they do not affect H1.2 rows or routes.

## Safety

Do not run `setupWTCContentEngine()`. It is a destructive legacy setup function.
