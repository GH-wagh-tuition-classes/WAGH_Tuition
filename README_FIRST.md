# WAGH Tuition Classes — All API Scripts

**Cumulative development baseline:** `v2.3.2p-SI1-FV1-RP1-PCR1`

This package contains the latest active API-related scripts assembled from the tested WAGH Tuition Classes development release.

## Folder 01 — Runtime Apps Script

Use these files in the **Runtime Google Apps Script project** connected to `WTC_CONTENT_ENGINE` and `WTC_FEATURE_ENGINE`.

Active files included:

- `Code.gs`
- `constants.gs`
- `dependency_manager.gs`
- `feature_engine.gs`
- `workbook_repository.gs`
- `runtime_api.gs`
- `api_router.gs`
- `mcq.gs`
- `migration_manager.gs`
- `health_check.gs`
- `version.gs`
- `profile_change_requests.gs`

This cumulative set includes Stage 1 performance changes, reliable/profile-specific MCQ progress, duplicate attempt protection, and Student Profile Change Approval System v1.0.

## Folder 02 — Authoring Apps Script

Use `WTC_AI_Content_Engine.gs` only in the separate **Authoring / AI Content Engine Apps Script project** connected to `WTC_AI_CONTENT_ENGINE`.

It includes:

- Stage 1 authoring performance optimisation
- Solution identity isolation
- Published-only feature visibility
- Dynamic content API actions

## Folder 03 — Frontend API Adapters

These are the matching API-facing browser files from the cumulative development frontend:

- `config.js`
- `api.js`
- `assessment-api.js`
- `auth.js`

They are reference/backup copies. Keep their paths under `assets/js/` in GitHub.

## Important safety rules

1. Runtime and Authoring Apps Script projects must remain separate.
2. Preserve the existing deployed `/exec` URLs when creating new deployment versions.
3. Do not run destructive legacy setup functions on an existing workbook.
4. In particular, do not run `setupWTCContentEngine()` or `setupWtcAiContentEngine()` on live data.
5. Do not mix this package with WTC Learn or ScoreBadhao.
6. The stable WAGH Tuition copy must not be changed automatically; promote only after deliberate testing.
7. Trashed/obsolete scripts from the original upload are intentionally excluded.

## Restoration note

This ZIP is a source-code backup. It does not include Google Apps Script deployment IDs, script properties, OAuth settings, triggers, or workbook data. Those remain in the respective Google Apps Script projects and Google Sheets.
