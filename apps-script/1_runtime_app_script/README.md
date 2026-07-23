# Runtime Apps Script — Active Cumulative Set

This folder is the active Runtime Apps Script source for the WAGH Tuition Classes development environment.

For Home Page & Admission Funnel H1.0:

- add `admission_leads.gs`
- replace `Code.gs`
- replace `api_router.gs`
- replace `version.gs`
- run only the safe `installAdmissionLeadSystem()` installer
- create a new Web App deployment version while preserving the same `/exec` URL

Never run `setupWTCContentEngine()` on an existing live workbook. It is a destructive legacy setup function.
