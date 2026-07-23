/* ============================================================================
   FILE: admission_leads.gs
   PURPOSE: Safe public demo/admission enquiry capture for the WTC homepage.
   VERSION: 1.0
   NOTES:
   - Creates only the missing ADMISSION_LEADS sheet/header.
   - Never clears or overwrites existing lead data.
   - Public endpoint: validates, rate-limits and neutralizes Sheet formulas.
============================================================================ */

var WTC_ADMISSION_LEAD_HEADERS = [
  'leadId',
  'createdAt',
  'studentName',
  'parentMobile',
  'className',
  'board',
  'medium',
  'subject',
  'preferredTime',
  'source',
  'status',
  'notes',
  'deviceId',
  'pageUrl',
  'consent',
  'updatedAt'
];

function installAdmissionLeadSystem() {
  var sheet = ensureAdmissionLeadsSheet_();
  return {
    success: true,
    message: 'ADMISSION_LEADS is ready.',
    sheetName: sheet.getName(),
    columns: WTC_ADMISSION_LEAD_HEADERS.length
  };
}

function saveAdmissionLead(d) {
  d = d || {};

  var studentName = wtcLeadText_(d.studentName, 80);
  var parentMobile = String(d.parentMobile || '').replace(/\D/g, '');
  if (parentMobile.length === 12 && parentMobile.indexOf('91') === 0) parentMobile = parentMobile.slice(2);

  var className = wtcLeadText_(d.className, 20);
  var board = wtcLeadText_(d.board, 20).toUpperCase();
  var medium = wtcLeadText_(d.medium, 30);
  var subject = wtcLeadText_(d.subject, 60);
  var preferredTime = wtcLeadText_(d.preferredTime || 'Any suitable time', 40);
  var source = wtcLeadText_(d.source || 'Direct', 120);
  var deviceId = wtcLeadText_(d.deviceId, 100);
  var pageUrl = wtcLeadText_(d.pageUrl, 300);
  var consent = d.consent === true || String(d.consent || '').toLowerCase() === 'true' || String(d.consent || '').toLowerCase() === 'yes';

  if (studentName.length < 2) return { success:false, message:'Student name is required.' };
  if (!/^\d{10}$/.test(parentMobile)) return { success:false, message:'Enter a valid 10-digit parent mobile number.' };
  if (['Class 5','Class 6','Class 7','Class 8','Class 9','Class 10'].indexOf(className) === -1) {
    return { success:false, message:'Select a valid class.' };
  }
  if (['CBSE','GSEB'].indexOf(board) === -1) return { success:false, message:'Select a valid board.' };
  if (['English Medium','Gujarati Medium'].indexOf(medium) === -1) return { success:false, message:'Select a valid medium.' };
  if (!subject) return { success:false, message:'Select a subject.' };
  if (!consent) return { success:false, message:'Contact consent is required.' };

  var cache = CacheService.getScriptCache();
  var rateKey = 'wtc-admission-' + parentMobile + '-' + (deviceId || 'public');
  if (cache.get(rateKey)) {
    return { success:true, duplicate:true, message:'Your enquiry was already received recently.' };
  }

  var lock = LockService.getScriptLock();
  if (!lock.tryLock(5000)) return { success:false, message:'The enquiry service is busy. Please try again.' };

  try {
    ensureAdmissionLeadsSheet_();
    var timestamp = now();
    var leadId = 'LEAD-' + Utilities.formatDate(new Date(), IST, 'yyyyMMdd-HHmmss') + '-' + Math.floor(100 + Math.random() * 900);

    append('ADMISSION_LEADS', {
      leadId:leadId,
      createdAt:timestamp,
      studentName:wtcLeadCell_(studentName),
      parentMobile:parentMobile,
      className:className,
      board:board,
      medium:medium,
      subject:wtcLeadCell_(subject),
      preferredTime:wtcLeadCell_(preferredTime),
      source:wtcLeadCell_(source),
      status:'NEW',
      notes:'',
      deviceId:wtcLeadCell_(deviceId),
      pageUrl:wtcLeadCell_(pageUrl),
      consent:'YES',
      updatedAt:timestamp
    });

    cache.put(rateKey, leadId, 120);
    return { success:true, leadId:leadId, message:'Demo enquiry saved successfully.' };
  } finally {
    lock.releaseLock();
  }
}

function ensureAdmissionLeadsSheet_() {
  var spreadsheet = ss();
  var sheet = spreadsheet.getSheetByName('ADMISSION_LEADS');
  if (!sheet) sheet = spreadsheet.insertSheet('ADMISSION_LEADS');

  var lastColumn = Math.max(sheet.getLastColumn(), WTC_ADMISSION_LEAD_HEADERS.length);
  var currentHeaders = sheet.getLastRow() > 0
    ? sheet.getRange(1, 1, 1, lastColumn).getValues()[0].map(String)
    : [];

  var needsHeader = sheet.getLastRow() === 0 || currentHeaders.join('').trim() === '';
  if (needsHeader) {
    sheet.getRange(1, 1, 1, WTC_ADMISSION_LEAD_HEADERS.length)
      .setValues([WTC_ADMISSION_LEAD_HEADERS])
      .setFontWeight('bold')
      .setBackground('#0f172a')
      .setFontColor('#ffffff');
    sheet.setFrozenRows(1);
    sheet.autoResizeColumns(1, WTC_ADMISSION_LEAD_HEADERS.length);
  } else {
    var missing = WTC_ADMISSION_LEAD_HEADERS.filter(function(header) {
      return currentHeaders.indexOf(header) === -1;
    });
    if (missing.length) {
      var startColumn = sheet.getLastColumn() + 1;
      sheet.getRange(1, startColumn, 1, missing.length)
        .setValues([missing])
        .setFontWeight('bold')
        .setBackground('#0f172a')
        .setFontColor('#ffffff');
    }
  }

  clearRowsCache_('ADMISSION_LEADS');
  return sheet;
}

function wtcLeadText_(value, maxLength) {
  return String(value || '')
    .replace(/[\u0000-\u001F\u007F]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength || 200);
}

function wtcLeadCell_(value) {
  var text = String(value || '');
  return /^[=+\-@]/.test(text) ? "'" + text : text;
}
