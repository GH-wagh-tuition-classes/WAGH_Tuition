/* ============================================================================
   FILE: migration_manager.gs
   PURPOSE: Safe, idempotent migrations for runtime workbooks only.

   RULES:
   - Never clear sheets.
   - Never delete sheets.
   - Create only missing system sheets/rows.
   - Record each migration once.
============================================================================ */

var WTC_MIGRATIONS = [
  {
    id: 'MIGRATION_001',
    description: 'Create SYSTEM_INFO and MIGRATION_LOG in runtime workbooks',
    apply: function(workbook) {
      wtcEnsureSystemSheet_(workbook);
      wtcEnsureMigrationSheet_(workbook);
      return { createdOrVerified: true };
    }
  },
  {
    id: 'MIGRATION_002',
    description: 'Record Phase 2.4 runtime architecture versions',
    apply: function(workbook) {
      wtcEnsureSystemSheet_(workbook);
      wtcUpsertSystemInfo_(workbook, 'PLATFORM_VERSION', WTC_VERSION.PLATFORM, 'WAGH Tuition Classes platform');
      wtcUpsertSystemInfo_(workbook, 'API_VERSION', WTC_VERSION.API, 'Runtime API version');
      wtcUpsertSystemInfo_(workbook, 'BACKEND_ARCHITECTURE', WTC_VERSION.BACKEND_ARCHITECTURE, 'Modular runtime backend');
      wtcUpsertSystemInfo_(workbook, 'RUNTIME_API_VERSION', WTC_VERSION.RUNTIME_API, 'Runtime API layer');
      return { versionInfoUpdated: true };
    }
  }
];

function runWTCMigrations() {
  var targets = [
    { key: WTC_BACKEND.WORKBOOK_KEYS.CONTENT, label: 'WTC_CONTENT_ENGINE' },
    { key: WTC_BACKEND.WORKBOOK_KEYS.FEATURE, label: 'WTC_FEATURE_ENGINE' }
  ];
  var results = [];

  targets.forEach(function(target) {
    var workbook = WTC_WorkbookRepository.getWorkbook(target.key);
    wtcEnsureSystemSheet_(workbook);
    wtcEnsureMigrationSheet_(workbook);
    var completed = wtcCompletedMigrationIds_(workbook);

    WTC_MIGRATIONS.forEach(function(migration) {
      if (completed.indexOf(migration.id) !== -1) {
        results.push({ workbook: target.label, migrationId: migration.id, status: 'Skipped' });
        return;
      }
      try {
        var details = migration.apply(workbook) || {};
        wtcRecordMigration_(workbook, migration, 'Completed', details);
        results.push({ workbook: target.label, migrationId: migration.id, status: 'Completed' });
      } catch (error) {
        wtcRecordMigration_(workbook, migration, 'Failed', { error: error.message });
        results.push({ workbook: target.label, migrationId: migration.id, status: 'Failed', error: error.message });
        throw error;
      }
    });
  });

  return { success: true, migrations: results, serverTime: wtcBackendNow_() };
}

function getMigrationStatus() {
  var result = {};
  [WTC_BACKEND.WORKBOOK_KEYS.CONTENT, WTC_BACKEND.WORKBOOK_KEYS.FEATURE].forEach(function(key) {
    var workbook = WTC_WorkbookRepository.getWorkbook(key);
    wtcEnsureMigrationSheet_(workbook);
    result[key] = {
      workbookName: workbook.getName(),
      completedIds: wtcCompletedMigrationIds_(workbook)
    };
  });
  return { success: true, workbooks: result };
}

function wtcEnsureSystemSheet_(workbook) {
  var name = WTC_BACKEND.SYSTEM_SHEETS.SYSTEM_INFO;
  var sheet = workbook.getSheetByName(name);
  if (!sheet) sheet = workbook.insertSheet(name);
  if (sheet.getLastRow() === 0) sheet.appendRow(['key', 'value', 'notes', 'updatedAt']);
  return sheet;
}
function wtcEnsureMigrationSheet_(workbook) {
  var name = WTC_BACKEND.SYSTEM_SHEETS.MIGRATION_LOG;
  var sheet = workbook.getSheetByName(name);
  if (!sheet) sheet = workbook.insertSheet(name);
  if (sheet.getLastRow() === 0) sheet.appendRow(['migrationId', 'description', 'status', 'details', 'appliedAt']);
  return sheet;
}
function wtcUpsertSystemInfo_(workbook, key, value, notes) {
  var sheet = wtcEnsureSystemSheet_(workbook);
  var rows = wtcSystemRows_(sheet);
  var found = rows.filter(function(row) { return String(row.key) === String(key); })[0];
  var rowValues = [key, value, notes || '', wtcBackendNow_()];
  if (found) sheet.getRange(found._row, 1, 1, rowValues.length).setValues([rowValues]);
  else sheet.appendRow(rowValues);
}
function wtcCompletedMigrationIds_(workbook) {
  var sheet = wtcEnsureMigrationSheet_(workbook);
  return wtcSystemRows_(sheet)
    .filter(function(row) { return String(row.status) === 'Completed'; })
    .map(function(row) { return String(row.migrationId); });
}
function wtcRecordMigration_(workbook, migration, status, details) {
  var sheet = wtcEnsureMigrationSheet_(workbook);
  sheet.appendRow([migration.id, migration.description, status, JSON.stringify(details || {}), wtcBackendNow_()]);
}
function wtcSystemRows_(sheet) {
  var values = sheet.getDataRange().getValues();
  if (values.length < 2) return [];
  var headers = values[0].map(function(value) { return String(value || '').trim(); });
  return values.slice(1).filter(function(row) { return row.join('') !== ''; }).map(function(row, index) {
    var item = { _row: index + 2 };
    headers.forEach(function(header, columnIndex) { item[header] = row[columnIndex]; });
    return item;
  });
}
