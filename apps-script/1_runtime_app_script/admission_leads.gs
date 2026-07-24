/* ============================================================================
   FILE: admission_leads.gs
   PURPOSE: Public admission capture plus secure Admin follow-up manager.
   VERSION: 1.1
   SAFETY:
   - Adds only missing columns; never clears existing lead data.
   - Public write is validated, rate-limited, locked and formula-neutralized.
   - Admin read/update requires current ADMIN_MASTER password verification.
============================================================================ */

var WTC_ADMISSION_LEAD_HEADERS = [
  'leadId','createdAt','studentName','parentMobile','className','board','medium',
  'subject','preferredTime','source','status','notes','deviceId','pageUrl','consent',
  'updatedAt','demoDate','followUpDate'
];

var WTC_ADMISSION_STATUSES = ['NEW','CONTACTED','DEMO_BOOKED','JOINED','NOT_INTERESTED'];

function installAdmissionLeadSystem() {
  var sheet = ensureAdmissionLeadsSheet_();
  return {
    success:true,
    message:'ADMISSION_LEADS v1.1 is ready.',
    sheetName:sheet.getName(),
    columns:sheet.getLastColumn()
  };
}

function installAdmissionLeadAdminSystem() {
  return installAdmissionLeadSystem();
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
  var consent = d.consent === true || ['true','yes'].indexOf(String(d.consent || '').toLowerCase()) !== -1;

  if (studentName.length < 2) return { success:false, message:'Student name is required.' };
  if (!/^\d{10}$/.test(parentMobile)) return { success:false, message:'Enter a valid 10-digit parent mobile number.' };
  if (['Class 5','Class 6','Class 7','Class 8','Class 9','Class 10'].indexOf(className) === -1) return { success:false, message:'Select a valid class.' };
  if (['CBSE','GSEB'].indexOf(board) === -1) return { success:false, message:'Select a valid board.' };
  if (['English Medium','Gujarati Medium'].indexOf(medium) === -1) return { success:false, message:'Select a valid medium.' };
  if (!subject) return { success:false, message:'Select a subject.' };
  if (!consent) return { success:false, message:'Contact consent is required.' };

  var cache = CacheService.getScriptCache();
  var rateKey = 'wtc-admission-' + parentMobile + '-' + (deviceId || 'public');
  if (cache.get(rateKey)) return { success:true, duplicate:true, message:'Your enquiry was already received recently.' };

  var lock = LockService.getScriptLock();
  if (!lock.tryLock(5000)) return { success:false, message:'The enquiry service is busy. Please try again.' };

  try {
    ensureAdmissionLeadsSheet_();
    var timestamp = now();
    var leadId = 'LEAD-' + Utilities.formatDate(new Date(), IST, 'yyyyMMdd-HHmmss') + '-' + Math.floor(100 + Math.random() * 900);
    append('ADMISSION_LEADS', {
      leadId:leadId, createdAt:timestamp, studentName:wtcLeadCell_(studentName),
      parentMobile:parentMobile, className:className, board:board, medium:medium,
      subject:wtcLeadCell_(subject), preferredTime:wtcLeadCell_(preferredTime),
      source:wtcLeadCell_(source), status:'NEW', notes:'', deviceId:wtcLeadCell_(deviceId),
      pageUrl:wtcLeadCell_(pageUrl), consent:'YES', updatedAt:timestamp,
      demoDate:'', followUpDate:''
    });
    cache.put(rateKey, leadId, 120);
    return { success:true, leadId:leadId, message:'Demo enquiry saved successfully.' };
  } finally {
    lock.releaseLock();
  }
}

function adminGetAdmissionLeads(d) {
  var request = d || {};
  wtcAdmissionRequireAdmin_(request);
  ensureAdmissionLeadsSheet_();

  var limit = Math.min(500, Math.max(1, Number(request.limit || 300)));
  var all = rows('ADMISSION_LEADS').sort(function(a,b) {
    return String(b.createdAt || '').localeCompare(String(a.createdAt || ''));
  });

  return {
    success:true,
    leads:all.slice(0, limit).map(wtcAdmissionAdminView_),
    summary:wtcAdmissionSummary_(all),
    truncated:all.length > limit,
    totalAvailable:all.length
  };
}

function adminUpdateAdmissionLead(d) {
  var request = d || {};
  var admin = wtcAdmissionRequireAdmin_(request);
  var leadId = wtcLeadText_(request.leadId, 80);
  var status = String(request.status || 'NEW').trim().toUpperCase();
  var notes = wtcLeadText_(request.notes, 1000);
  var demoDate = wtcLeadDate_(request.demoDate);
  var followUpDate = wtcLeadDate_(request.followUpDate);

  if (!leadId) return { success:false, message:'Lead ID is required.' };
  if (WTC_ADMISSION_STATUSES.indexOf(status) === -1) return { success:false, message:'Select a valid lead status.' };

  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    ensureAdmissionLeadsSheet_();
    var lead = rows('ADMISSION_LEADS').filter(function(item) { return norm(item.leadId) === norm(leadId); })[0];
    if (!lead) return { success:false, message:'Admission lead not found.' };

    var timestamp = now();
    updateRow('ADMISSION_LEADS', lead._row, {
      status:status,
      notes:wtcLeadCell_(notes),
      demoDate:demoDate,
      followUpDate:followUpDate,
      updatedAt:timestamp
    });

    logAccess({
      userId:admin.adminId || admin.mobile,
      name:admin.name,
      role:'Admin',
      mobile:admin.mobile,
      actionName:'Admission Lead Updated',
      url:leadId + ' → ' + status,
      deviceId:request.deviceId
    });

    var refreshed = rows('ADMISSION_LEADS');
    var updated = refreshed.filter(function(item) { return norm(item.leadId) === norm(leadId); })[0];
    return {
      success:true,
      message:'Admission follow-up saved.',
      lead:wtcAdmissionAdminView_(updated || {}),
      summary:wtcAdmissionSummary_(refreshed)
    };
  } finally {
    lock.releaseLock();
  }
}

function adminDashboardWithAdmissionLeads(d) {
  var summary = typeof adminDashboardWithProfileRequests === 'function'
    ? adminDashboardWithProfileRequests(d || {})
    : adminDashboard(d || {});
  try {
    ensureAdmissionLeadsSheet_();
    var leadSummary = wtcAdmissionSummary_(rows('ADMISSION_LEADS'));
    summary.totalAdmissionLeads = leadSummary.TOTAL;
    summary.newAdmissionLeads = leadSummary.NEW;
  } catch (error) {
    summary.totalAdmissionLeads = 0;
    summary.newAdmissionLeads = 0;
  }
  return summary;
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
      .setValues([WTC_ADMISSION_LEAD_HEADERS]).setFontWeight('bold')
      .setBackground('#0f172a').setFontColor('#ffffff');
    sheet.setFrozenRows(1);
    sheet.autoResizeColumns(1, WTC_ADMISSION_LEAD_HEADERS.length);
  } else {
    var missing = WTC_ADMISSION_LEAD_HEADERS.filter(function(header) { return currentHeaders.indexOf(header) === -1; });
    if (missing.length) {
      var startColumn = sheet.getLastColumn() + 1;
      sheet.getRange(1, startColumn, 1, missing.length).setValues([missing])
        .setFontWeight('bold').setBackground('#0f172a').setFontColor('#ffffff');
    }
  }

  SpreadsheetApp.flush();
  if (typeof clearRowsCache_ === 'function') clearRowsCache_('ADMISSION_LEADS');
  return sheet;
}

function wtcAdmissionRequireAdmin_(d) {
  if (typeof wtcProfileRequireAdmin_ === 'function') return wtcProfileRequireAdmin_(d || {});
  var request = d || {};
  var adminId = norm(request.adminId);
  var adminMobile = norm(request.adminMobile);
  var adminPassword = norm(request.adminPassword);
  if (!adminPassword) throw new Error('Admin password is required.');
  var admin = rows('ADMIN_MASTER').filter(function(item) {
    var identityMatches = (adminId && norm(item.adminId) === adminId) || (adminMobile && norm(item.mobile) === adminMobile);
    return identityMatches && norm(item.password) === adminPassword;
  })[0];
  if (!admin) throw new Error('Admin password verification failed.');
  if (!active(admin)) throw new Error('Admin account is not active.');
  return admin;
}

function wtcAdmissionSummary_(items) {
  var summary = { TOTAL:0, NEW:0, CONTACTED:0, DEMO_BOOKED:0, JOINED:0, NOT_INTERESTED:0 };
  (items || []).forEach(function(item) {
    var status = String(item.status || 'NEW').trim().toUpperCase();
    if (WTC_ADMISSION_STATUSES.indexOf(status) === -1) status = 'NEW';
    summary.TOTAL += 1;
    summary[status] += 1;
  });
  return summary;
}

function wtcAdmissionAdminView_(item) {
  return {
    leadId:item.leadId || '', createdAt:item.createdAt || '', studentName:item.studentName || '',
    parentMobile:String(item.parentMobile || ''), className:item.className || '', board:item.board || '',
    medium:item.medium || '', subject:item.subject || '', preferredTime:item.preferredTime || '',
    source:item.source || 'Direct', status:String(item.status || 'NEW').toUpperCase(), notes:item.notes || '',
    pageUrl:item.pageUrl || '', consent:item.consent || '', updatedAt:item.updatedAt || '',
    demoDate:item.demoDate || '', followUpDate:item.followUpDate || ''
  };
}

function wtcLeadDate_(value) {
  var text = String(value || '').trim();
  if (!text) return '';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) throw new Error('Dates must use YYYY-MM-DD format.');
  return text;
}

function wtcLeadText_(value, maxLength) {
  return String(value || '').replace(/[\u0000-\u001F\u007F]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, maxLength || 200);
}

function wtcLeadCell_(value) {
  var text = String(value || '');
  return /^[=+\-@]/.test(text) ? "'" + text : text;
}
