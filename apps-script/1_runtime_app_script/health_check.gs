/* ============================================================================
   FILE: health_check.gs
   PURPOSE: Read-only health report.

   Runtime health requires:
   - WTC_CONTENT_ENGINE
   - WTC_FEATURE_ENGINE

   Authoring health optionally reports WTC_AI_CONTENT_ENGINE but does not affect
   student runtime status.
============================================================================ */

function healthCheck(d) {
  var forceRefresh = !!(d && (d.forceRefresh === true || String(d.forceRefresh).toLowerCase() === 'true'));
  var cache = CacheService.getScriptCache();

  if (!forceRefresh) {
    var cached = cache.get(WTC_BACKEND.CACHE.HEALTH_KEY);
    if (cached) {
      try { return JSON.parse(cached); } catch (ignore) {}
    }
  }

  var content = WTC_WorkbookRepository.tryWorkbook(WTC_BACKEND.WORKBOOK_KEYS.CONTENT);
  var feature = WTC_WorkbookRepository.tryWorkbook(WTC_BACKEND.WORKBOOK_KEYS.FEATURE);
  var ai = WTC_WorkbookRepository.tryWorkbook(WTC_BACKEND.WORKBOOK_KEYS.AI_AUTHORING);
  var dependencies = getDependencyStatus();

  var migration;
  try { migration = getMigrationStatus(); }
  catch (error) { migration = { success: false, error: error.message }; }

  var runtimeHealthy = !!content.connected && !!feature.connected &&
    !!(dependencies.modules.RUNTIME_API && dependencies.modules.RUNTIME_API.ready);

  var response = {
    ok: runtimeHealthy,
    success: runtimeHealthy,
    app: WTC_BACKEND.APP_NAME,
    status: runtimeHealthy ? 'healthy' : 'degraded',
    versions: wtcVersionPayload_(),
    runtime: {
      contentEngine: content,
      featureEngine: feature,
      healthy: runtimeHealthy
    },
    authoring: {
      aiContentEngine: ai,
      note: 'Authoring service is optional and not part of student runtime delivery.'
    },
    dependencies: dependencies,
    migration: migration,
    serverTime: wtcBackendNow_(),
    timezone: WTC_BACKEND.TIMEZONE
  };

  cache.put(WTC_BACKEND.CACHE.HEALTH_KEY, JSON.stringify(response), WTC_BACKEND.CACHE.HEALTH_SECONDS);
  return response;
}
