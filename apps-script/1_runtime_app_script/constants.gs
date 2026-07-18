/* ============================================================================
   WAGH Tuition Classes — Phase 2.4 Runtime Backend
   FILE: constants.gs
   PURPOSE: Central constants for runtime and authoring workbooks.
============================================================================ */

var WTC_BACKEND = Object.freeze({
  APP_NAME: 'WAGH Tuition Classes API',
  TIMEZONE: 'Asia/Kolkata',

  SCRIPT_PROPERTIES: Object.freeze({
    FEATURE_WORKBOOK_ID: 'WTC_FEATURE_ENGINE_ID',
    AI_WORKBOOK_ID: 'WTC_AI_CONTENT_ENGINE_ID' // Optional authoring health only.
  }),

  WORKBOOK_KEYS: Object.freeze({
    CONTENT: 'CONTENT',
    FEATURE: 'FEATURE',
    AI_AUTHORING: 'AI_AUTHORING'
  }),

  SYSTEM_SHEETS: Object.freeze({
    SYSTEM_INFO: 'SYSTEM_INFO',
    MIGRATION_LOG: 'MIGRATION_LOG'
  }),

  CACHE: Object.freeze({
    HEALTH_KEY: 'WTC_HEALTH_CHECK_RUNTIME_V1',
    HEALTH_SECONDS: 60
  })
});
