/* ============================================================================
   WAGH Tuition Classes — Feature Engine Backend v1.0
   FILE: apps-script/feature_engine.gs

   PURPOSE
   -------
   This is a SEPARATE Apps Script module for the third workbook:

       WTC_FEATURE_ENGINE

   The workbook stores only global feature configuration:
       1. FEATURE_METADATA
       2. FEATURE_UI
       3. FEATURE_RULES

   SAFETY GUARANTEE
   ----------------
   • Never clears a sheet.
   • Never deletes a sheet.
   • Never overwrites existing rows.
   • Creates only missing sheets/headers.
   • Seeds only missing feature IDs.

   REQUIRED SCRIPT PROPERTY
   ------------------------
   WTC_FEATURE_ENGINE_ID = Spreadsheet ID of WTC_FEATURE_ENGINE

   IMPORTANT
   ---------
   Do NOT use SpreadsheetApp.getActiveSpreadsheet() for this module.
   All reads/writes explicitly target WTC_FEATURE_ENGINE by spreadsheet ID.
============================================================================ */

const WTC_FEATURE_ENGINE_PROPERTY = 'WTC_FEATURE_ENGINE_ID';
const WTC_FEATURE_CACHE_KEY = 'WTC_FEATURE_REGISTRY_V1';
const WTC_FEATURE_CACHE_SECONDS = 300;

const WTC_FEATURE_ENGINE_SHEETS = {
  FEATURE_METADATA: [
    'featureId',
    'featureName',
    'enginePath',
    'accessLevel',
    'enabled',
    'requiresLogin',
    'saveProgress',
    'resumeAllowed',
    'logAccess',
    'comingSoon',
    'version',
    'routingMode',
    'updatedAt'
  ],

  FEATURE_UI: [
    'featureId',
    'icon',
    'buttonText',
    'description',
    'themeClass',
    'displayOrder',
    'visible',
    'updatedAt'
  ],

  FEATURE_RULES: [
    'featureId',
    'xpReward',
    'unlockLevel',
    'dailyLimit',
    'badgeCode',
    'subscriptionRequired',
    'cooldownMinutes',
    'status',
    'updatedAt'
  ]
};

/* --------------------------------------------------------------------------
   PUBLIC SETUP FUNCTION
   Run this ONCE after adding WTC_FEATURE_ENGINE_ID in Script Properties.
   It is safe to run again later.
---------------------------------------------------------------------------- */
function setupWTCFeatureEngineWorkbook() {
  const spreadsheet = getWTCFeatureEngineSpreadsheet_();
  const report = {
    workbook: spreadsheet.getName(),
    spreadsheetId: spreadsheet.getId(),
    createdSheets: [],
    existingSheets: [],
    addedHeaders: [],
    seededFeatureIds: []
  };

  Object.keys(WTC_FEATURE_ENGINE_SHEETS).forEach(function(sheetName) {
    const requiredHeaders = WTC_FEATURE_ENGINE_SHEETS[sheetName];
    let sheet = spreadsheet.getSheetByName(sheetName);

    if (!sheet) {
      sheet = spreadsheet.insertSheet(sheetName);
      report.createdSheets.push(sheetName);
    } else {
      report.existingSheets.push(sheetName);
    }

    ensureFeatureHeaders_(sheet, requiredHeaders, report);
  });

  seedWTCFeatureEngineDefaults_(spreadsheet, report);
  clearWTCFeatureRegistryCache_();

  return {
    success: true,
    message: 'WTC_FEATURE_ENGINE setup completed safely. No existing data was deleted.',
    report: report
  };
}

/* --------------------------------------------------------------------------
   API ACTION
   Register getFeatureRegistry in apicode.gs doPost action map.
---------------------------------------------------------------------------- */
function getFeatureRegistry(d) {
  const forceRefresh = featureToBoolean_(d && d.forceRefresh, false);
  const cache = CacheService.getScriptCache();

  if (!forceRefresh) {
    const cached = cache.get(WTC_FEATURE_CACHE_KEY);
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch (error) {
        // Ignore damaged cache and rebuild from workbook.
      }
    }
  }

  const spreadsheet = getWTCFeatureEngineSpreadsheet_();
  const metadataRows = readFeatureSheetRows_(spreadsheet, 'FEATURE_METADATA');
  const uiRows = readFeatureSheetRows_(spreadsheet, 'FEATURE_UI');
  const ruleRows = readFeatureSheetRows_(spreadsheet, 'FEATURE_RULES');

  const response = {
    success: true,
    registryVersion: '1.0',
    generatedAt: featureNow_(),
    metadata: metadataRows.map(normalizeFeatureMetadata_),
    ui: uiRows.map(normalizeFeatureUI_),
    rules: ruleRows.map(normalizeFeatureRules_)
  };

  cache.put(
    WTC_FEATURE_CACHE_KEY,
    JSON.stringify(response),
    WTC_FEATURE_CACHE_SECONDS
  );

  return response;
}

/* --------------------------------------------------------------------------
   OPTIONAL ADMIN/DEBUG ACTION
   Clears only the short-lived cache. It does not touch spreadsheet data.
---------------------------------------------------------------------------- */
function refreshFeatureRegistryCache(d) {
  clearWTCFeatureRegistryCache_();
  return {
    success: true,
    message: 'Feature registry cache cleared. The next request will reload the workbook.'
  };
}

/* ============================================================================
   PRIVATE HELPERS
============================================================================ */

function getWTCFeatureEngineSpreadsheet_() {
  const spreadsheetId = PropertiesService
    .getScriptProperties()
    .getProperty(WTC_FEATURE_ENGINE_PROPERTY);

  if (!spreadsheetId) {
    throw new Error(
      'Missing Script Property: ' + WTC_FEATURE_ENGINE_PROPERTY +
      '. Add the WTC_FEATURE_ENGINE spreadsheet ID in Apps Script Project Settings.'
    );
  }

  try {
    return SpreadsheetApp.openById(String(spreadsheetId).trim());
  } catch (error) {
    throw new Error(
      'Unable to open WTC_FEATURE_ENGINE. Verify the spreadsheet ID and permissions. ' +
      error.message
    );
  }
}

function ensureFeatureHeaders_(sheet, requiredHeaders, report) {
  if (sheet.getLastRow() === 0 || sheet.getLastColumn() === 0) {
    sheet.getRange(1, 1, 1, requiredHeaders.length).setValues([requiredHeaders]);
    styleFeatureHeader_(sheet, requiredHeaders.length);
    report.addedHeaders.push({
      sheet: sheet.getName(),
      headers: requiredHeaders.slice()
    });
    return;
  }

  const existingHeaders = sheet
    .getRange(1, 1, 1, sheet.getLastColumn())
    .getValues()[0]
    .map(function(value) { return String(value || '').trim(); });

  const missingHeaders = requiredHeaders.filter(function(header) {
    return existingHeaders.indexOf(header) === -1;
  });

  if (!missingHeaders.length) return;

  const startColumn = sheet.getLastColumn() + 1;
  sheet.getRange(1, startColumn, 1, missingHeaders.length).setValues([missingHeaders]);
  styleFeatureHeader_(sheet, sheet.getLastColumn());

  report.addedHeaders.push({
    sheet: sheet.getName(),
    headers: missingHeaders
  });
}

function styleFeatureHeader_(sheet, headerCount) {
  sheet.getRange(1, 1, 1, headerCount)
    .setFontWeight('bold')
    .setBackground('#0f172a')
    .setFontColor('#ffffff');
  sheet.setFrozenRows(1);
  sheet.autoResizeColumns(1, headerCount);
}

function seedWTCFeatureEngineDefaults_(spreadsheet, report) {
  const nowValue = featureNow_();

  const metadataRows = [
    {
      featureId: 'LESSON',
      featureName: 'Lesson',
      enginePath: 'chapters/lesson.html',
      accessLevel: 'PREMIUM',
      enabled: true,
      requiresLogin: true,
      saveProgress: true,
      resumeAllowed: true,
      logAccess: true,
      comingSoon: false,
      version: '1.0',
      routingMode: 'HYBRID',
      updatedAt: nowValue
    },
    {
      featureId: 'SOLUTION',
      featureName: 'Solution',
      enginePath: 'solutions/index.html',
      accessLevel: 'PUBLIC',
      enabled: true,
      requiresLogin: true,
      saveProgress: false,
      resumeAllowed: false,
      logAccess: true,
      comingSoon: false,
      version: '1.0',
      routingMode: 'HYBRID',
      updatedAt: nowValue
    },
    {
      featureId: 'NOTES',
      featureName: 'Notes',
      enginePath: 'notes/index.html',
      accessLevel: 'PREMIUM',
      enabled: true,
      requiresLogin: true,
      saveProgress: true,
      resumeAllowed: true,
      logAccess: true,
      comingSoon: false,
      version: '1.0',
      routingMode: 'HYBRID',
      updatedAt: nowValue
    },
    {
      featureId: 'MCQ',
      featureName: 'MCQ Practice',
      enginePath: 'tests/mcq/index.html',
      accessLevel: 'PREMIUM',
      enabled: true,
      requiresLogin: true,
      saveProgress: true,
      resumeAllowed: true,
      logAccess: true,
      comingSoon: false,
      version: '1.0',
      routingMode: 'HYBRID',
      updatedAt: nowValue
    },
    {
      featureId: 'WORKSHEET',
      featureName: 'Worksheet',
      enginePath: 'tests/online-test/index.html',
      accessLevel: 'PREMIUM',
      enabled: true,
      requiresLogin: true,
      saveProgress: true,
      resumeAllowed: true,
      logAccess: true,
      comingSoon: false,
      version: '1.0',
      routingMode: 'HYBRID',
      updatedAt: nowValue
    },
    {
      featureId: 'ANSWER_WRITING',
      featureName: 'Answer Writing',
      enginePath: 'tests/answer-writing/index.html',
      accessLevel: 'PREMIUM',
      enabled: true,
      requiresLogin: true,
      saveProgress: true,
      resumeAllowed: true,
      logAccess: true,
      comingSoon: false,
      version: '1.0',
      routingMode: 'HYBRID',
      updatedAt: nowValue
    },
    {
      featureId: 'VIDEO',
      featureName: 'Video',
      enginePath: 'chapters/video.html',
      accessLevel: 'PREMIUM',
      enabled: true,
      requiresLogin: true,
      saveProgress: true,
      resumeAllowed: true,
      logAccess: true,
      comingSoon: false,
      version: '1.0',
      routingMode: 'HYBRID',
      updatedAt: nowValue
    },
    {
      featureId: 'REVISION',
      featureName: 'Revision',
      enginePath: 'chapters/revision.html',
      accessLevel: 'PREMIUM',
      enabled: true,
      requiresLogin: true,
      saveProgress: true,
      resumeAllowed: true,
      logAccess: true,
      comingSoon: false,
      version: '1.0',
      routingMode: 'HYBRID',
      updatedAt: nowValue
    },
    {
      featureId: 'DIGITAL_LAB',
      featureName: 'Digital Lab',
      enginePath: 'digital-lab/index.html',
      accessLevel: 'PREMIUM',
      enabled: false,
      requiresLogin: true,
      saveProgress: true,
      resumeAllowed: true,
      logAccess: true,
      comingSoon: true,
      version: '1.0',
      routingMode: 'DYNAMIC',
      updatedAt: nowValue
    },
    {
      featureId: 'ACTIVITY',
      featureName: 'Activity',
      enginePath: 'activities/index.html',
      accessLevel: 'PREMIUM',
      enabled: false,
      requiresLogin: true,
      saveProgress: true,
      resumeAllowed: true,
      logAccess: true,
      comingSoon: true,
      version: '1.0',
      routingMode: 'DYNAMIC',
      updatedAt: nowValue
    }
  ];

  const uiRows = [
    { featureId: 'LESSON', icon: '📖', buttonText: 'Open Lesson', description: 'Read chapter lesson', themeClass: 'feature-lesson', displayOrder: 10, visible: true, updatedAt: nowValue },
    { featureId: 'SOLUTION', icon: '📘', buttonText: 'View Solution', description: 'Open detailed solutions', themeClass: 'feature-solution', displayOrder: 20, visible: true, updatedAt: nowValue },
    { featureId: 'NOTES', icon: '📚', buttonText: 'Open Notes', description: 'Read chapter notes', themeClass: 'feature-notes', displayOrder: 30, visible: true, updatedAt: nowValue },
    { featureId: 'MCQ', icon: '📝', buttonText: 'Start MCQ', description: 'Practice chapter MCQs', themeClass: 'feature-mcq', displayOrder: 40, visible: true, updatedAt: nowValue },
    { featureId: 'WORKSHEET', icon: '📄', buttonText: 'Open Worksheet', description: 'Practice worksheet', themeClass: 'feature-worksheet', displayOrder: 50, visible: true, updatedAt: nowValue },
    { featureId: 'ANSWER_WRITING', icon: '✍️', buttonText: 'Practice Writing', description: 'Practice answer writing', themeClass: 'feature-answer-writing', displayOrder: 60, visible: true, updatedAt: nowValue },
    { featureId: 'VIDEO', icon: '🎬', buttonText: 'Watch Video', description: 'Watch chapter video', themeClass: 'feature-video', displayOrder: 70, visible: true, updatedAt: nowValue },
    { featureId: 'REVISION', icon: '🔁', buttonText: 'Start Revision', description: 'Revise chapter concepts', themeClass: 'feature-revision', displayOrder: 80, visible: true, updatedAt: nowValue },
    { featureId: 'DIGITAL_LAB', icon: '🧪', buttonText: 'Open Digital Lab', description: 'Interactive digital experiment', themeClass: 'feature-digital-lab', displayOrder: 90, visible: true, updatedAt: nowValue },
    { featureId: 'ACTIVITY', icon: '🎯', buttonText: 'Open Activity', description: 'Interactive chapter activity', themeClass: 'feature-activity', displayOrder: 100, visible: true, updatedAt: nowValue }
  ];

  const ruleRows = [
    { featureId: 'LESSON', xpReward: 10, unlockLevel: 0, dailyLimit: 0, badgeCode: '', subscriptionRequired: false, cooldownMinutes: 0, status: 'Active', updatedAt: nowValue },
    { featureId: 'SOLUTION', xpReward: 0, unlockLevel: 0, dailyLimit: 0, badgeCode: '', subscriptionRequired: false, cooldownMinutes: 0, status: 'Active', updatedAt: nowValue },
    { featureId: 'NOTES', xpReward: 20, unlockLevel: 0, dailyLimit: 0, badgeCode: '', subscriptionRequired: false, cooldownMinutes: 0, status: 'Active', updatedAt: nowValue },
    { featureId: 'MCQ', xpReward: 50, unlockLevel: 0, dailyLimit: 0, badgeCode: '', subscriptionRequired: false, cooldownMinutes: 0, status: 'Active', updatedAt: nowValue },
    { featureId: 'WORKSHEET', xpReward: 30, unlockLevel: 0, dailyLimit: 0, badgeCode: '', subscriptionRequired: false, cooldownMinutes: 0, status: 'Active', updatedAt: nowValue },
    { featureId: 'ANSWER_WRITING', xpReward: 40, unlockLevel: 0, dailyLimit: 0, badgeCode: '', subscriptionRequired: false, cooldownMinutes: 0, status: 'Active', updatedAt: nowValue },
    { featureId: 'VIDEO', xpReward: 15, unlockLevel: 0, dailyLimit: 0, badgeCode: '', subscriptionRequired: false, cooldownMinutes: 0, status: 'Active', updatedAt: nowValue },
    { featureId: 'REVISION', xpReward: 25, unlockLevel: 0, dailyLimit: 0, badgeCode: '', subscriptionRequired: false, cooldownMinutes: 0, status: 'Active', updatedAt: nowValue },
    { featureId: 'DIGITAL_LAB', xpReward: 100, unlockLevel: 0, dailyLimit: 0, badgeCode: '', subscriptionRequired: false, cooldownMinutes: 0, status: 'Active', updatedAt: nowValue },
    { featureId: 'ACTIVITY', xpReward: 30, unlockLevel: 0, dailyLimit: 0, badgeCode: '', subscriptionRequired: false, cooldownMinutes: 0, status: 'Active', updatedAt: nowValue }
  ];

  upsertFeatureObjects_(spreadsheet, 'FEATURE_METADATA', metadataRows, report);
  upsertFeatureObjects_(spreadsheet, 'FEATURE_UI', uiRows, report);
  upsertFeatureObjects_(spreadsheet, 'FEATURE_RULES', ruleRows, report);
}

function upsertFeatureObjects_(spreadsheet, sheetName, objects, report) {
  const sheet = spreadsheet.getSheetByName(sheetName);
  if (!sheet) throw new Error('Missing WTC_FEATURE_ENGINE sheet: ' + sheetName);

  const headers = sheet
    .getRange(1, 1, 1, sheet.getLastColumn())
    .getValues()[0]
    .map(function(value) { return String(value || '').trim(); });

  const existingRows = readFeatureSheetRows_(spreadsheet, sheetName);
  const existingIds = {};

  existingRows.forEach(function(row) {
    const featureId = normalizeFeatureId_(row.featureId);
    if (featureId) existingIds[featureId] = true;
  });

  objects.forEach(function(item) {
    const featureId = normalizeFeatureId_(item.featureId);
    if (!featureId || existingIds[featureId]) return;

    const row = headers.map(function(header) {
      return item[header] !== undefined ? item[header] : '';
    });

    sheet.appendRow(row);
    existingIds[featureId] = true;
    report.seededFeatureIds.push(sheetName + ':' + featureId);
  });
}

function readFeatureSheetRows_(spreadsheet, sheetName) {
  const sheet = spreadsheet.getSheetByName(sheetName);
  if (!sheet || sheet.getLastRow() < 2 || sheet.getLastColumn() < 1) return [];

  const values = sheet.getDataRange().getValues();
  const headers = values[0].map(function(value) {
    return String(value || '').trim();
  });

  return values.slice(1)
    .filter(function(row) {
      return row.some(function(value) { return value !== '' && value !== null; });
    })
    .map(function(row) {
      const item = {};
      headers.forEach(function(header, index) {
        if (header) item[header] = row[index];
      });
      return item;
    });
}

function normalizeFeatureMetadata_(row) {
  return {
    featureId: normalizeFeatureId_(row.featureId),
    featureName: String(row.featureName || '').trim(),
    enginePath: String(row.enginePath || '').trim(),
    accessLevel: String(row.accessLevel || 'PREMIUM').trim().toUpperCase(),
    enabled: featureToBoolean_(row.enabled, true),
    requiresLogin: featureToBoolean_(row.requiresLogin, true),
    saveProgress: featureToBoolean_(row.saveProgress, false),
    resumeAllowed: featureToBoolean_(row.resumeAllowed, false),
    logAccess: featureToBoolean_(row.logAccess, true),
    comingSoon: featureToBoolean_(row.comingSoon, false),
    version: String(row.version || '1.0').trim(),
    routingMode: String(row.routingMode || 'HYBRID').trim().toUpperCase(),
    updatedAt: row.updatedAt || ''
  };
}

function normalizeFeatureUI_(row) {
  return {
    featureId: normalizeFeatureId_(row.featureId),
    icon: String(row.icon || '').trim(),
    buttonText: String(row.buttonText || '').trim(),
    description: String(row.description || '').trim(),
    themeClass: String(row.themeClass || '').trim(),
    displayOrder: Number(row.displayOrder || 999),
    visible: featureToBoolean_(row.visible, true),
    updatedAt: row.updatedAt || ''
  };
}

function normalizeFeatureRules_(row) {
  return {
    featureId: normalizeFeatureId_(row.featureId),
    xpReward: Number(row.xpReward || 0),
    unlockLevel: Number(row.unlockLevel || 0),
    dailyLimit: Number(row.dailyLimit || 0),
    badgeCode: String(row.badgeCode || '').trim(),
    subscriptionRequired: featureToBoolean_(row.subscriptionRequired, false),
    cooldownMinutes: Number(row.cooldownMinutes || 0),
    status: String(row.status || 'Active').trim(),
    updatedAt: row.updatedAt || ''
  };
}

function normalizeFeatureId_(value) {
  return String(value || '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function featureToBoolean_(value, defaultValue) {
  if (value === '' || value === null || value === undefined) return defaultValue;
  if (typeof value === 'boolean') return value;

  const normalized = String(value).trim().toLowerCase();
  if (['true', 'yes', '1', 'active', 'enabled'].indexOf(normalized) !== -1) return true;
  if (['false', 'no', '0', 'inactive', 'disabled'].indexOf(normalized) !== -1) return false;
  return defaultValue;
}

function featureNow_() {
  return Utilities.formatDate(new Date(), 'Asia/Kolkata', 'yyyy-MM-dd HH:mm:ss');
}

function clearWTCFeatureRegistryCache_() {
  CacheService.getScriptCache().remove(WTC_FEATURE_CACHE_KEY);
}
