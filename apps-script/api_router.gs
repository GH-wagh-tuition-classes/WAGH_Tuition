/* ============================================================================
   FILE: api_router.gs
   PURPOSE: Central API router. Existing action names stay compatible.
============================================================================ */

function wtcApiActionMap_() {
  return {
    login: login,
    signupStudent: signupStudent,
    updateStudentProfile: typeof protectedStudentProfileUpdate === 'function' ? protectedStudentProfileUpdate : updateStudentProfile,
    changeStudentPassword: typeof changeStudentPassword === 'function' ? changeStudentPassword : wtcMissingAction_,
    createProfileChangeRequest: typeof createProfileChangeRequest === 'function' ? createProfileChangeRequest : wtcMissingAction_,
    getMyProfileChangeRequests: typeof getMyProfileChangeRequests === 'function' ? getMyProfileChangeRequests : wtcMissingAction_,
    cancelProfileChangeRequest: typeof cancelProfileChangeRequest === 'function' ? cancelProfileChangeRequest : wtcMissingAction_,
    getStudentProgress: getStudentProgress,
    logAccess: logAccess,

    getStudentBootstrap: runtimeApiGetStudentBootstrap,
    getSubjects: runtimeApiGetSubjects,
    getChapters: runtimeApiGetChapters,
    getChapterFeatures: runtimeApiGetChapterFeatures,
    getFeatureRegistry: runtimeApiGetFeatureRegistry,

    adminDashboard: typeof adminDashboardWithProfileRequests === 'function' ? adminDashboardWithProfileRequests : adminDashboard,
    getProfileChangeRequests: typeof getProfileChangeRequests === 'function' ? getProfileChangeRequests : wtcMissingAction_,
    approveProfileChangeRequest: typeof approveProfileChangeRequest === 'function' ? approveProfileChangeRequest : wtcMissingAction_,
    rejectProfileChangeRequest: typeof rejectProfileChangeRequest === 'function' ? rejectProfileChangeRequest : wtcMissingAction_,
    adminGetSubjects: typeof adminGetSubjects === 'function' ? adminGetSubjects : wtcMissingAction_,
    adminSaveSubject: typeof adminSaveSubject === 'function' ? adminSaveSubject : wtcMissingAction_,
    adminGetChapters: typeof adminGetChapters === 'function' ? adminGetChapters : wtcMissingAction_,
    adminSaveChapter: typeof adminSaveChapter === 'function' ? adminSaveChapter : wtcMissingAction_,
    adminGetChapterFeatures: typeof adminGetChapterFeatures === 'function' ? adminGetChapterFeatures : wtcMissingAction_,
    adminSaveChapterFeatures: typeof adminSaveChapterFeatures === 'function' ? adminSaveChapterFeatures : wtcMissingAction_,

    saveStaticMCQResult: typeof saveStaticMCQResult === 'function' ? saveStaticMCQResult : wtcMissingAction_,
    getMCQProgressReport: typeof getMCQProgressReport === 'function' ? getMCQProgressReport : wtcMissingAction_,
    refreshFeatureRegistryCache: typeof refreshFeatureRegistryCache === 'function' ? refreshFeatureRegistryCache : wtcMissingAction_,

    healthCheck: healthCheck,
    getSystemVersion: getSystemVersion,
    getMigrationStatus: getMigrationStatus,
    getDependencyStatus: getDependencyStatus
  };
}

function wtcRouteApiRequest_(request) {
  if (typeof WTC_CODE_ROWS_CACHE !== 'undefined') WTC_CODE_ROWS_CACHE = {};
  if (typeof WTC_WorkbookRepository !== 'undefined' && WTC_WorkbookRepository.resetRequestCache) WTC_WorkbookRepository.resetRequestCache();
  var d = request || {};
  var action = String(d.action || '').trim();
  var map = wtcApiActionMap_();
  if (!action || !map[action]) {
    return wtcApiEnvelope_({ success: false, message: 'Unknown action: ' + (action || '(empty)') });
  }
  try { return wtcApiEnvelope_(map[action](d)); }
  catch (error) {
    console.error('WTC API Error [' + action + ']:', error);
    return wtcApiEnvelope_({ success: false, message: error.message || 'Unexpected server error.', action: action });
  }
}

function wtcApiEnvelope_(payload) {
  var response = payload || {};
  if (response.apiVersion === undefined) response.apiVersion = WTC_VERSION.API;
  if (response.platformVersion === undefined) response.platformVersion = WTC_VERSION.PLATFORM;
  if (response.serverTime === undefined) response.serverTime = wtcBackendNow_();
  return response;
}
function wtcMissingAction_() { return { success: false, message: 'Requested module/action is not installed.' }; }
function wtcBackendNow_() { return Utilities.formatDate(new Date(), WTC_BACKEND.TIMEZONE, 'yyyy-MM-dd HH:mm:ss'); }
