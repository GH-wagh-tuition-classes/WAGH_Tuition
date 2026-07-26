/* ============================================================================
   FILE: api_router.gs
   PURPOSE: Central cumulative Runtime API router.
   H1.3C preserves all Phase 2.5A–2.5G Teacher/Test routes while
           preserving Home, Admission, Diagnostic and Daily Challenge routes.
============================================================================ */

function wtcApiActionMap_() {
  return {
    /* Authentication / profile */
    login: login,
    signupStudent: signupStudent,
    updateStudentProfile: typeof protectedStudentProfileUpdate === 'function' ? protectedStudentProfileUpdate : updateStudentProfile,
    changeStudentPassword: typeof changeStudentPassword === 'function' ? changeStudentPassword : wtcMissingAction_,
    createProfileChangeRequest: typeof createProfileChangeRequest === 'function' ? createProfileChangeRequest : wtcMissingAction_,
    getMyProfileChangeRequests: typeof getMyProfileChangeRequests === 'function' ? getMyProfileChangeRequests : wtcMissingAction_,
    cancelProfileChangeRequest: typeof cancelProfileChangeRequest === 'function' ? cancelProfileChangeRequest : wtcMissingAction_,
    getStudentProgress: getStudentProgress,
    logAccess: logAccess,

    /* Admission / conversion */
    saveAdmissionLead: typeof saveAdmissionLead === 'function' ? saveAdmissionLead : wtcMissingAction_,
    adminGetAdmissionLeads: typeof adminGetAdmissionLeads === 'function' ? adminGetAdmissionLeads : wtcMissingAction_,
    adminUpdateAdmissionLead: typeof adminUpdateAdmissionLead === 'function' ? adminUpdateAdmissionLead : wtcMissingAction_,

    /* Chapter Daily Challenge */
    studentGetDailyChallengeStatus: typeof studentGetDailyChallengeStatus === 'function' ? studentGetDailyChallengeStatus : wtcMissingAction_,
    studentOpenDailyChallenge: typeof studentOpenDailyChallenge === 'function' ? studentOpenDailyChallenge : wtcMissingAction_,
    saveDailyChallengeResult: typeof saveDailyChallengeResult === 'function' ? saveDailyChallengeResult : wtcMissingAction_,
    studentGetDailyChallengeLeaderboard: typeof studentGetDailyChallengeLeaderboard === 'function' ? studentGetDailyChallengeLeaderboard : wtcMissingAction_,
    adminGetDailyChallengeManager: typeof adminGetDailyChallengeManager === 'function' ? adminGetDailyChallengeManager : wtcMissingAction_,
    adminSaveDailyChallengeConfig: typeof adminSaveDailyChallengeConfig === 'function' ? adminSaveDailyChallengeConfig : wtcMissingAction_,
    adminPrepareDailyChallenge: typeof adminPrepareDailyChallenge === 'function' ? adminPrepareDailyChallenge : wtcMissingAction_,
    adminGetDailyChallengeAnalytics: typeof adminGetDailyChallengeAnalytics === 'function' ? adminGetDailyChallengeAnalytics : wtcMissingAction_,
    adminSetDailyChallengeState: typeof adminSetDailyChallengeState === 'function' ? adminSetDailyChallengeState : wtcMissingAction_,
    adminReviewDailyChallengeAttempt: typeof adminReviewDailyChallengeAttempt === 'function' ? adminReviewDailyChallengeAttempt : wtcMissingAction_,

    /* Student catalogue / Feature Engine */
    getStudentBootstrap: runtimeApiGetStudentBootstrap,
    getSubjects: runtimeApiGetSubjects,
    getChapters: runtimeApiGetChapters,
    getChapterFeatures: runtimeApiGetChapterFeatures,
    getFeatureRegistry: runtimeApiGetFeatureRegistry,

    /* Admin dashboard / content / profile approvals */
    adminDashboard: typeof adminDashboardWithAdmissionLeads === 'function'
      ? adminDashboardWithAdmissionLeads
      : (typeof adminDashboardWithProfileRequests === 'function' ? adminDashboardWithProfileRequests : adminDashboard),
    getProfileChangeRequests: typeof getProfileChangeRequests === 'function' ? getProfileChangeRequests : wtcMissingAction_,
    approveProfileChangeRequest: typeof approveProfileChangeRequest === 'function' ? approveProfileChangeRequest : wtcMissingAction_,
    rejectProfileChangeRequest: typeof rejectProfileChangeRequest === 'function' ? rejectProfileChangeRequest : wtcMissingAction_,
    adminGetSubjects: typeof adminGetSubjects === 'function' ? adminGetSubjects : wtcMissingAction_,
    adminSaveSubject: typeof adminSaveSubject === 'function' ? adminSaveSubject : wtcMissingAction_,
    adminGetChapters: typeof adminGetChapters === 'function' ? adminGetChapters : wtcMissingAction_,
    adminSaveChapter: typeof adminSaveChapter === 'function' ? adminSaveChapter : wtcMissingAction_,
    adminGetChapterFeatures: typeof adminGetChapterFeatures === 'function' ? adminGetChapterFeatures : wtcMissingAction_,
    adminSaveChapterFeatures: typeof adminSaveChapterFeatures === 'function' ? adminSaveChapterFeatures : wtcMissingAction_,

    /* Phase 2.5G Admin-controlled Teacher assignments */
    adminGetTeacherAssignmentBootstrap: typeof adminGetTeacherAssignmentBootstrap === 'function' ? adminGetTeacherAssignmentBootstrap : wtcMissingAction_,
    adminSaveTeacherAssignments: typeof adminSaveTeacherAssignments === 'function' ? adminSaveTeacherAssignments : wtcMissingAction_,
    adminSetTeacherAssignmentStatus: typeof adminSetTeacherAssignmentStatus === 'function' ? adminSetTeacherAssignmentStatus : wtcMissingAction_,
    adminPreviewTeacherAssignmentMigration: typeof adminPreviewTeacherAssignmentMigration === 'function' ? adminPreviewTeacherAssignmentMigration : wtcMissingAction_,
    adminMigrateTeacherAssignments: typeof adminMigrateTeacherAssignments === 'function' ? adminMigrateTeacherAssignments : wtcMissingAction_,

    /* Phase 2.5A–2.5C Teacher analytics */
    teacherDashboard: typeof teacherDashboard === 'function' ? teacherDashboard : wtcMissingAction_,
    teacherGetStudents: typeof teacherGetStudents === 'function' ? teacherGetStudents : wtcMissingAction_,
    teacherGetStudentReport: typeof teacherGetStudentReport === 'function' ? teacherGetStudentReport : wtcMissingAction_,
    teacherGetStudentTestHistory: typeof teacherGetStudentTestHistory === 'function' ? teacherGetStudentTestHistory : wtcMissingAction_,
    teacherGetChapterAnalytics: typeof teacherGetChapterAnalytics === 'function' ? teacherGetChapterAnalytics : wtcMissingAction_,
    teacherGetAttentionStudents: typeof teacherGetAttentionStudents === 'function' ? teacherGetAttentionStudents : wtcMissingAction_,
    teacherGetTestCatalog: typeof teacherGetTestCatalog === 'function' ? teacherGetTestCatalog : wtcMissingAction_,
    teacherGetTestReport: typeof teacherGetTestReport === 'function' ? teacherGetTestReport : wtcMissingAction_,
    teacherGetClassReport: typeof teacherGetClassReport === 'function' ? teacherGetClassReport : wtcMissingAction_,
    teacherGetNonAttemptedStudents: typeof teacherGetNonAttemptedStudents === 'function' ? teacherGetNonAttemptedStudents : wtcMissingAction_,
    teacherGetRecentAttempts: typeof teacherGetRecentAttempts === 'function' ? teacherGetRecentAttempts : wtcMissingAction_,

    /* Phase 2.5F Assigned Tests */
    teacherGetAssignableTests: typeof teacherGetAssignableTests === 'function' ? teacherGetAssignableTests : wtcMissingAction_,
    teacherCreateTestAssignment: typeof teacherCreateTestAssignment === 'function' ? teacherCreateTestAssignment : wtcMissingAction_,
    teacherGetSentTests: typeof teacherGetSentTests === 'function' ? teacherGetSentTests : wtcMissingAction_,
    teacherGetAssignmentReport: typeof teacherGetAssignmentReport === 'function' ? teacherGetAssignmentReport : wtcMissingAction_,
    teacherCancelTestAssignment: typeof teacherCancelTestAssignment === 'function' ? teacherCancelTestAssignment : wtcMissingAction_,
    studentGetAssignedTests: typeof studentGetAssignedTests === 'function' ? studentGetAssignedTests : wtcMissingAction_,
    studentOpenAssignedTest: typeof studentOpenAssignedTest === 'function' ? studentOpenAssignedTest : wtcMissingAction_,
    saveAssignedMCQResult: typeof saveAssignedMCQResult === 'function' ? saveAssignedMCQResult : wtcMissingAction_,

    /* MCQ / system */
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
  if (response.serverDate === undefined) response.serverDate = (typeof wtcProjectToday_ === 'function' ? wtcProjectToday_() : Utilities.formatDate(new Date(), WTC_BACKEND.TIMEZONE, 'yyyy-MM-dd'));
  if (response.timezone === undefined) response.timezone = WTC_BACKEND.TIMEZONE;
  if (response.timezoneLabel === undefined) response.timezoneLabel = 'India Standard Time (IST)';
  return response;
}
function wtcMissingAction_() { return { success: false, message: 'Requested module/action is not installed.' }; }
function wtcBackendNow_() { return typeof wtcProjectNow_ === 'function' ? wtcProjectNow_() : Utilities.formatDate(new Date(), WTC_BACKEND.TIMEZONE, 'yyyy-MM-dd HH:mm:ss'); }
