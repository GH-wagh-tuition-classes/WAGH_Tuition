/* ============================================================================
   FILE: workbook_repository.gs
   PURPOSE: Central workbook access + safe read-through catalogue cache.
============================================================================ */

var WTC_WorkbookRepository = (function() {
  var requestWorkbooks_ = {};
  var requestRows_ = {};
  var CACHE_PREFIX_ = 'WTC_ROWS_V1_';

  function resetRequestCache() {
    requestWorkbooks_ = {};
    requestRows_ = {};
  }

  function getContentWorkbook() {
    if (!requestWorkbooks_.CONTENT) {
      var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
      if (!spreadsheet) throw new Error('WTC_CONTENT_ENGINE active spreadsheet is unavailable.');
      requestWorkbooks_.CONTENT = spreadsheet;
    }
    return requestWorkbooks_.CONTENT;
  }

  function getFeatureWorkbook() {
    return openByProperty_(WTC_BACKEND.SCRIPT_PROPERTIES.FEATURE_WORKBOOK_ID, 'WTC_FEATURE_ENGINE', 'FEATURE');
  }

  function getAIAuthoringWorkbook() {
    return openByProperty_(WTC_BACKEND.SCRIPT_PROPERTIES.AI_WORKBOOK_ID, 'WTC_AI_CONTENT_ENGINE', 'AI_AUTHORING');
  }

  function getWorkbook(workbookKey) {
    switch (String(workbookKey || '').toUpperCase()) {
      case WTC_BACKEND.WORKBOOK_KEYS.CONTENT: return getContentWorkbook();
      case WTC_BACKEND.WORKBOOK_KEYS.FEATURE: return getFeatureWorkbook();
      case WTC_BACKEND.WORKBOOK_KEYS.AI_AUTHORING: return getAIAuthoringWorkbook();
      default: throw new Error('Unknown workbook key: ' + workbookKey);
    }
  }

  function tryWorkbook(workbookKey) {
    try {
      var spreadsheet = getWorkbook(workbookKey);
      return { connected:true, configured:true, name:spreadsheet.getName(), spreadsheetId:spreadsheet.getId() };
    } catch (error) {
      var notConfigured = String(error.message || '').indexOf('Missing Script Property') !== -1;
      return { connected:false, configured:!notConfigured, name:workbookLabel_(workbookKey), error:error.message };
    }
  }

  function requestKey_(workbookKey, sheetName) {
    return String(workbookKey || '').toUpperCase() + '|' + String(sheetName || '').toUpperCase();
  }

  function cacheKey_(workbookKey, sheetName) {
    return CACHE_PREFIX_ + requestKey_(workbookKey, sheetName).replace(/[^A-Z0-9_]+/g, '_');
  }

  function readRows(workbookKey, sheetName) {
    var requestKey = requestKey_(workbookKey, sheetName);
    if (requestRows_[requestKey]) return requestRows_[requestKey];
    var sheet = requireSheet_(getWorkbook(workbookKey), sheetName);
    var values = sheet.getDataRange().getValues();
    if (values.length < 2) return requestRows_[requestKey] = [];
    var headers = values[0].map(function(value) { return String(value || '').trim(); });
    var rows = values.slice(1)
      .filter(function(row) { return row.join('') !== ''; })
      .map(function(row, index) {
        var item = { _row:index + 2 };
        headers.forEach(function(header, columnIndex) { if (header) item[header] = row[columnIndex]; });
        return item;
      });
    requestRows_[requestKey] = rows;
    return rows;
  }

  function readRowsCached(workbookKey, sheetName, seconds) {
    var requestKey = requestKey_(workbookKey, sheetName);
    if (requestRows_[requestKey]) return requestRows_[requestKey];
    var cache = CacheService.getScriptCache();
    var key = cacheKey_(workbookKey, sheetName);
    var cached = cache.get(key);
    if (cached) {
      try {
        var rows = JSON.parse(cached);
        requestRows_[requestKey] = rows;
        return rows;
      } catch (ignore) {}
    }
    var fresh = readRows(workbookKey, sheetName);
    try { cache.put(key, JSON.stringify(fresh), Math.max(30, Number(seconds || 300))); }
    catch (ignore) { /* Oversized cache entries safely fall back to direct reads. */ }
    return fresh;
  }

  function clearRowsCache(workbookKey, sheetName) {
    var requestKey = requestKey_(workbookKey, sheetName);
    delete requestRows_[requestKey];
    CacheService.getScriptCache().remove(cacheKey_(workbookKey, sheetName));
  }

  function requireSheet(workbookKey, sheetName) { return requireSheet_(getWorkbook(workbookKey), sheetName); }

  function openByProperty_(propertyName, workbookLabel, requestKey) {
    if (requestWorkbooks_[requestKey]) return requestWorkbooks_[requestKey];
    var id = PropertiesService.getScriptProperties().getProperty(propertyName);
    if (!id) throw new Error('Missing Script Property: ' + propertyName + ' for ' + workbookLabel + '.');
    requestWorkbooks_[requestKey] = SpreadsheetApp.openById(String(id).trim());
    return requestWorkbooks_[requestKey];
  }

  function requireSheet_(spreadsheet, sheetName) {
    var sheet = spreadsheet.getSheetByName(sheetName);
    if (!sheet) throw new Error('Missing sheet: ' + sheetName + ' in ' + spreadsheet.getName());
    return sheet;
  }

  function workbookLabel_(workbookKey) {
    var key = String(workbookKey || '').toUpperCase();
    if (key === WTC_BACKEND.WORKBOOK_KEYS.CONTENT) return 'WTC_CONTENT_ENGINE';
    if (key === WTC_BACKEND.WORKBOOK_KEYS.FEATURE) return 'WTC_FEATURE_ENGINE';
    if (key === WTC_BACKEND.WORKBOOK_KEYS.AI_AUTHORING) return 'WTC_AI_CONTENT_ENGINE';
    return key || 'Unknown workbook';
  }

  return {
    resetRequestCache:resetRequestCache,
    getWorkbook:getWorkbook,
    getContentWorkbook:getContentWorkbook,
    getFeatureWorkbook:getFeatureWorkbook,
    getAIAuthoringWorkbook:getAIAuthoringWorkbook,
    tryWorkbook:tryWorkbook,
    readRows:readRows,
    readRowsCached:readRowsCached,
    clearRowsCache:clearRowsCache,
    requireSheet:requireSheet
  };
})();
