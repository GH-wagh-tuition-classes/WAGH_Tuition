/* ============================================================================
   FILE: version.gs
   PURPOSE: Central module-version registry.
============================================================================ */

var WTC_VERSION = Object.freeze({
  PLATFORM: '1.0',
  API: '1.4',
  BACKEND_ARCHITECTURE: '2.4',
  RUNTIME_API: '1.0',
  FEATURE_ENGINE: '1.0',
  ACCESS_GUARD: '1.0',
  MCQ_ENGINE: '1.0',
  SOLUTION_ENGINE: '1.0',
  STUDENT_PORTAL: '2.3',
  MIGRATION_MANAGER: '1.0',
  HEALTH_CHECK: '1.0',
  DEPENDENCY_MANAGER: '1.0',
  PROFILE_CHANGE_APPROVAL: '1.0',
  ADMISSION_LEADS: '1.2',
  ADMIN_ADMISSION_PANEL: 'H1.2',
  HOME_PAGE: 'H1.2',
  HOME_DIAGNOSTIC: 'H1.2'
});

function getSystemVersion() {
  return {
    success: true,
    app: WTC_BACKEND.APP_NAME,
    versions: wtcVersionPayload_(),
    serverTime: wtcBackendNow_(),
    timezone: WTC_BACKEND.TIMEZONE
  };
}

function wtcVersionPayload_() {
  return {
    platform: WTC_VERSION.PLATFORM,
    api: WTC_VERSION.API,
    backendArchitecture: WTC_VERSION.BACKEND_ARCHITECTURE,
    runtimeApi: WTC_VERSION.RUNTIME_API,
    featureEngine: WTC_VERSION.FEATURE_ENGINE,
    accessGuard: WTC_VERSION.ACCESS_GUARD,
    mcqEngine: WTC_VERSION.MCQ_ENGINE,
    solutionEngine: WTC_VERSION.SOLUTION_ENGINE,
    studentPortal: WTC_VERSION.STUDENT_PORTAL,
    migrationManager: WTC_VERSION.MIGRATION_MANAGER,
    healthCheck: WTC_VERSION.HEALTH_CHECK,
    dependencyManager: WTC_VERSION.DEPENDENCY_MANAGER,
    profileChangeApproval: WTC_VERSION.PROFILE_CHANGE_APPROVAL,
    admissionLeads: WTC_VERSION.ADMISSION_LEADS,
    adminAdmissionPanel: WTC_VERSION.ADMIN_ADMISSION_PANEL,
    homePage: WTC_VERSION.HOME_PAGE,
    homeDiagnostic: WTC_VERSION.HOME_DIAGNOSTIC
  };
}
