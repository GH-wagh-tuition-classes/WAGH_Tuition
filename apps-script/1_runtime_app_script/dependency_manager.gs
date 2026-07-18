/* ============================================================================
   FILE: dependency_manager.gs
   PURPOSE: Declare and evaluate backend module dependencies.
============================================================================ */

var WTC_DEPENDENCIES = Object.freeze({
  RUNTIME_API: ['CONTENT_ENGINE', 'FEATURE_ENGINE'],
  FEATURE_ENGINE: ['FEATURE_WORKBOOK'],
  MCQ_ENGINE: ['RUNTIME_API', 'CONTENT_ENGINE'],
  STUDENT_PORTAL: ['RUNTIME_API', 'FEATURE_ENGINE']
});

function getDependencyStatus() {
  var content = WTC_WorkbookRepository.tryWorkbook(WTC_BACKEND.WORKBOOK_KEYS.CONTENT);
  var feature = WTC_WorkbookRepository.tryWorkbook(WTC_BACKEND.WORKBOOK_KEYS.FEATURE);

  var availability = {
    CONTENT_ENGINE: !!content.connected,
    FEATURE_WORKBOOK: !!feature.connected,
    FEATURE_ENGINE: typeof getFeatureRegistry === 'function' && !!feature.connected,
    RUNTIME_API: typeof WTC_RuntimeAPI !== 'undefined' && !!content.connected && !!feature.connected,
    MCQ_ENGINE: typeof saveStaticMCQResult === 'function',
    STUDENT_PORTAL: true
  };

  var modules = {};
  Object.keys(WTC_DEPENDENCIES).forEach(function(moduleName) {
    var requires = WTC_DEPENDENCIES[moduleName];
    var missing = requires.filter(function(name) { return !availability[name]; });
    modules[moduleName] = {
      ready: missing.length === 0,
      requires: requires,
      missing: missing
    };
  });

  return { success: true, availability: availability, modules: modules };
}
