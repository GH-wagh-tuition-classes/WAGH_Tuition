# Active API File Manifest

## Runtime Apps Script

| File | Status |
|---|---|
| Code.gs | H1.2 cumulative header registry; runtime deployment replacement is optional if current route wiring is already H1.1 |
| constants.gs | Active unchanged module |
| dependency_manager.gs | Active unchanged module |
| feature_engine.gs | Active unchanged module |
| workbook_repository.gs | Stage 1 cumulative |
| runtime_api.gs | RP1 cumulative |
| api_router.gs | H1.1 cumulative; no new H1.2 runtime route required |
| mcq.gs | RP1 cumulative |
| migration_manager.gs | Active unchanged module |
| health_check.gs | Active unchanged module |
| version.gs | H1.2 cumulative |
| profile_change_requests.gs | PCR1 new module |
| admission_leads.gs | H1.2 public capture + secure Admin follow-up + diagnostic result fields |

## Authoring Apps Script

| File | Status |
|---|---|
| WTC_AI_Content_Engine.gs | Latest cumulative route map with H1.2 public diagnostic actions |
| public_diagnostic.gs | H1.2 short-lived public question sampler and server-side scorer |
| AUTHORING_ROUTE_PATCH_H1_2.txt | Exact non-destructive route-map patch reference |

## Excluded intentionally

- Files whose names began with `.trashed-`
- Superseded copies with `(1).txt` naming
- Previous patch-only versions
- Frontend feature/UI files not required as API adapters

## Frontend H1.2 additions and cumulative patches

- `index.html` — diagnostic funnel section and entry points
- `assets/js/home-diagnostic.js` — dependent selector, runner, scoring flow and result lead capture
- `assets/css/home-diagnostic.css` — mobile-first diagnostic UI
- `assets/js/assessment-api.js` — public diagnostic read/score client actions
- `assets/js/admin-admission-leads.js` — chapter/result/focus display
- `assets/css/admin-admission-leads.css` — diagnostic result card styling

H1.1 files remain cumulative and backward-compatible.
