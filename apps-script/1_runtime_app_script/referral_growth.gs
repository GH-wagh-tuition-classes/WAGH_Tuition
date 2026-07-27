/* ==========================================================================
   FILE: referral_growth.gs
   PURPOSE: H1.4 Referral and Growth Tracking Engine.
   VERSION: H1.4
   SAFETY:
   - additive/idempotent sheets only
   - no academic progress, test, skill or gamification writes
   - student views expose aggregate/anonymized referral status only
   - rewards require explicit Admin approval after JOINED
============================================================================ */

var WTC_REFERRAL_CODE_HEADERS = [
  'referralCode','studentId','studentName','studentType','status','createdAt','updatedAt','shareCount','lastSharedAt'
];
var WTC_REFERRAL_TRACKER_HEADERS = [
  'referralId','referralCode','referrerStudentId','referrerName','referrerType','visitorHash',
  'referredStudentId','referredName','referredMobile','stage','source','campaign','landingPage','leadId',
  'clickAt','signupAt','enquiryAt','demoBookedAt','joinedAt','rewardStatus','rewardType','rewardNote',
  'rewardApprovedBy','rewardApprovedAt','rejectionReason','createdAt','updatedAt'
];
var WTC_REFERRAL_STAGES = ['CLICKED','SIGNED_UP','ENQUIRY','DEMO_BOOKED','JOINED','REWARD_APPROVED','REJECTED'];
var WTC_REFERRAL_REWARD_STATUSES = ['NOT_ELIGIBLE','PENDING','APPROVED','REJECTED'];
var WTC_REFERRAL_CODE_STATUSES = ['ACTIVE','INACTIVE'];

function installReferralGrowthSystem() {
  var workbook = ss();
  var codeSheet = wtcReferralEnsureSheet_(workbook, 'REFERRAL_CODES', WTC_REFERRAL_CODE_HEADERS);
  var trackerSheet = wtcReferralEnsureSheet_(workbook, 'REFERRAL_TRACKER', WTC_REFERRAL_TRACKER_HEADERS);
  var migration = { migrationId:'MIGRATION_H1_4_REFERRAL_GROWTH', reused:false };
  try {
    migration = wtcReferralRecordMigration_(workbook, migration.migrationId, {
      referralCodesColumns:codeSheet.getLastColumn(),
      referralTrackerColumns:trackerSheet.getLastColumn(),
      timezone:(typeof wtcProjectTimeZone_ === 'function' ? wtcProjectTimeZone_() : IST)
    });
  } catch (migrationError) {
    console.warn('Referral migration log could not be updated:', migrationError.message);
  }
  return {
    success:true,
    message:'Referral and Growth Tracking H1.4 is ready.',
    sheets:['REFERRAL_CODES','REFERRAL_TRACKER'],
    codeColumns:codeSheet.getLastColumn(),
    trackerColumns:trackerSheet.getLastColumn(),
    migration:migration,
    timezone:(typeof wtcProjectTimeZone_ === 'function' ? wtcProjectTimeZone_() : IST)
  };
}


function wtcReferralRecordMigration_(workbook, migrationId, details) {
  var sheet = workbook.getSheetByName('MIGRATION_LOG');
  if (!sheet) sheet = workbook.insertSheet('MIGRATION_LOG');
  var preferred = ['migrationId','migrationKey','description','version','status','details','appliedAt','notes'];
  var current = sheet.getLastRow() > 0 ? sheet.getRange(1,1,1,Math.max(1,sheet.getLastColumn())).getValues()[0].map(String) : [];
  if (sheet.getLastRow() === 0 || current.join('').trim() === '') {
    sheet.getRange(1,1,1,preferred.length).setValues([preferred]).setFontWeight('bold').setBackground('#0f172a').setFontColor('#ffffff');
    sheet.setFrozenRows(1);
    current = preferred.slice();
  } else {
    var missing = preferred.filter(function(header){ return current.indexOf(header) === -1; });
    if (missing.length) {
      sheet.getRange(1,sheet.getLastColumn()+1,1,missing.length).setValues([missing]).setFontWeight('bold').setBackground('#0f172a').setFontColor('#ffffff');
      current = current.concat(missing);
    }
  }
  var values = sheet.getDataRange().getValues();
  var headers = values[0].map(String);
  var idIndex = headers.indexOf('migrationId');
  var keyIndex = headers.indexOf('migrationKey');
  var exists = values.slice(1).some(function(row){
    return (idIndex >= 0 && String(row[idIndex]||'') === migrationId) || (keyIndex >= 0 && String(row[keyIndex]||'') === migrationId);
  });
  if (exists) return { migrationId:migrationId, reused:true };
  var timestamp = wtcReferralNow_();
  var object = {
    migrationId:migrationId,
    migrationKey:migrationId,
    description:'Create REFERRAL_CODES and REFERRAL_TRACKER for H1.4',
    version:'H1.4',
    status:'Completed',
    details:JSON.stringify(details || {}),
    appliedAt:timestamp,
    notes:'Additive referral growth migration; no academic data changes.'
  };
  sheet.appendRow(headers.map(function(header){ return object[header] !== undefined ? object[header] : ''; }));
  return { migrationId:migrationId, reused:false };
}

/* ---------------------------- Public capture ----------------------------- */

function trackReferralVisit(d) {
  var request = d || {};
  var code = wtcReferralCode_(request.referralCode);
  if (!code) return { success:false, message:'Referral code is missing.' };
  ensureReferralGrowthSheets_();
  var owner = wtcReferralFindCode_(code);
  if (!owner || String(owner.status || 'ACTIVE').toUpperCase() !== 'ACTIVE') {
    return { success:false, message:'This referral link is unavailable.' };
  }

  var visitorHash = wtcReferralVisitorHash_(code, request.deviceId || 'public');
  var cacheKey = 'wtc-ref-visit-' + code + '-' + visitorHash.slice(0, 16);
  var cache = CacheService.getScriptCache();
  if (cache.get(cacheKey)) return { success:true, valid:true, duplicate:true };

  var lock = LockService.getScriptLock();
  if (!lock.tryLock(5000)) return { success:true, valid:true, queued:false };
  try {
    var existing = wtcReferralFindTracker_({ referralCode:code, visitorHash:visitorHash });
    var timestamp = wtcReferralNow_();
    var source = wtcReferralText_(request.source || request.trafficSource || 'Referral', 80);
    var campaign = wtcReferralText_(request.campaign || 'student-referral', 120);
    var landingPage = wtcReferralText_(request.landingPage || request.pageUrl || '', 300);
    if (existing) {
      updateRow('REFERRAL_TRACKER', existing._row, {
        source:source || existing.source,
        campaign:campaign || existing.campaign,
        landingPage:landingPage || existing.landingPage,
        updatedAt:timestamp
      });
    } else {
      append('REFERRAL_TRACKER', {
        referralId:wtcReferralId_(), referralCode:code,
        referrerStudentId:owner.studentId || '', referrerName:wtcReferralCell_(owner.studentName || ''),
        referrerType:owner.studentType || '', visitorHash:visitorHash,
        referredStudentId:'', referredName:'', referredMobile:'', stage:'CLICKED',
        source:wtcReferralCell_(source), campaign:wtcReferralCell_(campaign), landingPage:wtcReferralCell_(landingPage), leadId:'',
        clickAt:timestamp, signupAt:'', enquiryAt:'', demoBookedAt:'', joinedAt:'',
        rewardStatus:'NOT_ELIGIBLE', rewardType:'', rewardNote:'', rewardApprovedBy:'', rewardApprovedAt:'', rejectionReason:'',
        createdAt:timestamp, updatedAt:timestamp
      });
    }
    cache.put(cacheKey, '1', 300);
    return { success:true, valid:true, message:'Referral visit recorded.' };
  } finally { lock.releaseLock(); }
}

/* ---------------------------- Student APIs ------------------------------- */

function studentGetReferralDashboard(d) {
  var request = d || {};
  var student = wtcReferralRequireStudent_(request);
  ensureReferralGrowthSheets_();
  var owner = wtcReferralGetOrCreateCode_(student);
  var items = rows('REFERRAL_TRACKER').filter(function(item) {
    return wtcReferralCode_(item.referralCode) === wtcReferralCode_(owner.referralCode);
  });
  return {
    success:true,
    referralCode:owner.referralCode,
    codeStatus:String(owner.status || 'ACTIVE').toUpperCase(),
    rewardEligible:true,
    summary:wtcReferralStudentSummary_(items),
    recent:items.sort(function(a,b){ return String(b.updatedAt||'').localeCompare(String(a.updatedAt||'')); })
      .slice(0, 8).map(wtcReferralStudentView_),
    privacy:'Referred student names and contact details are not shown in the Student Portal.',
    rewardRule:'Rewards are reviewed manually after a referred student is confirmed as joined.'
  };
}

function studentRecordReferralShare(d) {
  var request = d || {};
  var student = wtcReferralRequireStudent_(request);
  ensureReferralGrowthSheets_();
  var owner = wtcReferralGetOrCreateCode_(student);
  var current = Number(owner.shareCount || 0);
  updateRow('REFERRAL_CODES', owner._row, {
    shareCount:current + 1,
    lastSharedAt:wtcReferralNow_(),
    updatedAt:wtcReferralNow_()
  });
  return { success:true, shareCount:current + 1 };
}

/* ---------------------------- Admin APIs --------------------------------- */

function adminGetReferralGrowth(d) {
  var request = d || {};
  wtcReferralRequireAdmin_(request);
  ensureReferralGrowthSheets_();
  var codes = rows('REFERRAL_CODES').sort(function(a,b){ return String(b.updatedAt||'').localeCompare(String(a.updatedAt||'')); });
  var items = rows('REFERRAL_TRACKER').sort(function(a,b){ return String(b.updatedAt||'').localeCompare(String(a.updatedAt||'')); });
  var limit = Math.min(1000, Math.max(1, Number(request.limit || 500)));
  return {
    success:true,
    summary:wtcReferralAdminSummary_(codes, items),
    codes:codes.map(wtcReferralAdminCodeView_),
    referrals:items.slice(0, limit).map(wtcReferralAdminView_),
    totalAvailable:items.length,
    truncated:items.length > limit
  };
}

function adminUpdateReferralRecord(d) {
  var request = d || {};
  var admin = wtcReferralRequireAdmin_(request);
  ensureReferralGrowthSheets_();
  var referralId = wtcReferralText_(request.referralId, 80);
  var stage = String(request.stage || '').trim().toUpperCase();
  if (!referralId) throw new Error('Referral ID is required.');
  var editableStages = ['CLICKED','SIGNED_UP','ENQUIRY','DEMO_BOOKED','JOINED','REJECTED'];
  if (editableStages.indexOf(stage) === -1) throw new Error('Select a valid referral stage. Reward approval must use the dedicated reward action.');
  var item = rows('REFERRAL_TRACKER').filter(function(row){ return String(row.referralId||'') === referralId; })[0];
  if (!item) throw new Error('Referral record not found.');
  var timestamp = wtcReferralNow_();
  var updates = { stage:stage, updatedAt:timestamp };
  if (stage === 'DEMO_BOOKED' && !item.demoBookedAt) updates.demoBookedAt = timestamp;
  if (stage === 'JOINED') {
    if (!item.joinedAt) updates.joinedAt = timestamp;
    if (String(item.rewardStatus || 'NOT_ELIGIBLE').toUpperCase() === 'NOT_ELIGIBLE') updates.rewardStatus = 'PENDING';
  }
  if (stage === 'REJECTED') {
    updates.rewardStatus = 'REJECTED';
    updates.rejectionReason = wtcReferralCell_(wtcReferralText_(request.rejectionReason || request.notes || 'Referral closed by Admin.', 500));
  }
  updateRow('REFERRAL_TRACKER', item._row, updates);
  logAccess({
    userId:admin.adminId || admin.mobile, name:admin.name, role:'Admin', mobile:admin.mobile,
    actionName:'Referral Stage Updated', url:referralId + ' → ' + stage, deviceId:request.deviceId
  });
  return { success:true, message:'Referral stage updated.', referral:wtcReferralAdminView_(wtcReferralFindTracker_({ referralId:referralId })) };
}

function adminUpdateReferralReward(d) {
  var request = d || {};
  var admin = wtcReferralRequireAdmin_(request);
  ensureReferralGrowthSheets_();
  var referralId = wtcReferralText_(request.referralId, 80);
  var decision = String(request.decision || request.rewardStatus || '').trim().toUpperCase();
  if (!referralId) throw new Error('Referral ID is required.');
  if (['APPROVED','REJECTED'].indexOf(decision) === -1) throw new Error('Reward decision must be APPROVED or REJECTED.');
  var item = rows('REFERRAL_TRACKER').filter(function(row){ return String(row.referralId||'') === referralId; })[0];
  if (!item) throw new Error('Referral record not found.');
  if (decision === 'APPROVED' && String(item.stage || '').toUpperCase() !== 'JOINED' && !item.joinedAt) {
    throw new Error('A reward can be approved only after the referred student is confirmed as joined.');
  }
  var timestamp = wtcReferralNow_();
  var rewardType = wtcReferralText_(request.rewardType, 120);
  var rewardNote = wtcReferralText_(request.rewardNote, 600);
  if (decision === 'APPROVED' && !rewardType) throw new Error('Select or enter a reward type.');
  var updates = {
    rewardStatus:decision,
    rewardType:wtcReferralCell_(rewardType),
    rewardNote:wtcReferralCell_(rewardNote),
    rewardApprovedBy:wtcReferralCell_(admin.name || admin.adminId || 'Admin'),
    rewardApprovedAt:timestamp,
    updatedAt:timestamp
  };
  if (decision === 'APPROVED') updates.stage = 'REWARD_APPROVED';
  updateRow('REFERRAL_TRACKER', item._row, updates);
  logAccess({
    userId:admin.adminId || admin.mobile, name:admin.name, role:'Admin', mobile:admin.mobile,
    actionName:'Referral Reward ' + decision, url:referralId + ' · ' + rewardType, deviceId:request.deviceId
  });
  return { success:true, message:'Referral reward ' + decision.toLowerCase() + '.', referral:wtcReferralAdminView_(wtcReferralFindTracker_({ referralId:referralId })) };
}

function adminSetReferralCodeStatus(d) {
  var request = d || {};
  var admin = wtcReferralRequireAdmin_(request);
  ensureReferralGrowthSheets_();
  var code = wtcReferralCode_(request.referralCode);
  var status = String(request.status || '').trim().toUpperCase();
  if (!code) throw new Error('Referral code is required.');
  if (WTC_REFERRAL_CODE_STATUSES.indexOf(status) === -1) throw new Error('Code status must be ACTIVE or INACTIVE.');
  var owner = wtcReferralFindCode_(code);
  if (!owner) throw new Error('Referral code not found.');
  updateRow('REFERRAL_CODES', owner._row, { status:status, updatedAt:wtcReferralNow_() });
  logAccess({
    userId:admin.adminId || admin.mobile, name:admin.name, role:'Admin', mobile:admin.mobile,
    actionName:'Referral Code ' + status, url:code, deviceId:request.deviceId
  });
  return { success:true, message:'Referral code status updated.', referralCode:code, status:status };
}

/* ---------------------- Compatibility wrappers/hooks --------------------- */

function signupStudentWithReferral(d) {
  var result = signupStudent(d || {});
  if (result && result.success && d && d.referralCode) {
    try { wtcReferralRecordSignup_(d, result.user || {}); }
    catch (error) { console.warn('Referral signup attribution failed:', error.message); }
  }
  return result;
}

function saveAdmissionLeadWithReferral(d) {
  var result = saveAdmissionLead(d || {});
  if (result && result.success && d && d.referralCode) {
    try { wtcReferralRecordEnquiry_(d, result.leadId || ''); }
    catch (error) { console.warn('Referral enquiry attribution failed:', error.message); }
  }
  return result;
}

function adminUpdateAdmissionLeadWithReferral(d) {
  var result = adminUpdateAdmissionLead(d || {});
  if (result && result.success && result.lead) {
    try { wtcReferralSyncLeadStatus_(result.lead, d || {}); }
    catch (error) { console.warn('Referral lead status sync failed:', error.message); }
  }
  return result;
}

function wtcReferralRecordSignup_(request, user) {
  ensureReferralGrowthSheets_();
  var code = wtcReferralCode_(request.referralCode);
  var owner = wtcReferralFindCode_(code);
  if (!owner || String(owner.status || 'ACTIVE').toUpperCase() !== 'ACTIVE') return;
  var referredMobile = String(user.mobile || request.mobile || '').replace(/\D/g,'');
  var visitorHash = wtcReferralVisitorHash_(code, request.deviceId || user.studentId || referredMobile || 'signup');
  var abuseReason = wtcReferralAbuseReason_(owner, {
    referredStudentId:user.studentId || user.id || '',
    referredMobile:referredMobile,
    referralCode:code
  });
  if (abuseReason) {
    wtcReferralRecordRejectedAttribution_(owner, visitorHash, {
      referredStudentId:user.studentId || user.id || '', referredName:user.name || request.name || '',
      referredMobile:referredMobile, source:'Student Signup', campaign:request.campaign || 'student-referral',
      landingPage:request.landingPage || request.pageUrl || '', reason:abuseReason
    });
    return;
  }
  var item = wtcReferralFindTracker_({ referralCode:code, visitorHash:visitorHash }) ||
    wtcReferralFindTracker_({ referralCode:code, referredMobile:referredMobile });
  wtcReferralUpsertConversion_(owner, item, {
    visitorHash:visitorHash,
    referredStudentId:user.studentId || user.id || '',
    referredName:user.name || request.name || '',
    referredMobile:user.mobile || request.mobile || '',
    stage:'SIGNED_UP',
    signupAt:wtcReferralNow_(),
    source:'Student Signup',
    campaign:request.campaign || 'student-referral',
    landingPage:request.landingPage || request.pageUrl || ''
  });
}

function wtcReferralRecordEnquiry_(request, leadId) {
  ensureReferralGrowthSheets_();
  var code = wtcReferralCode_(request.referralCode);
  var owner = wtcReferralFindCode_(code);
  if (!owner || String(owner.status || 'ACTIVE').toUpperCase() !== 'ACTIVE') return;
  var visitorHash = wtcReferralVisitorHash_(code, request.deviceId || request.parentMobile || 'enquiry');
  var mobile = String(request.parentMobile || '').replace(/\D/g,'');
  var abuseReason = wtcReferralAbuseReason_(owner, { referredMobile:mobile, referralCode:code });
  if (abuseReason) {
    wtcReferralRecordRejectedAttribution_(owner, visitorHash, {
      referredName:request.studentName || '', referredMobile:mobile, source:request.source || 'DEMO_FORM',
      campaign:request.campaign || 'student-referral', landingPage:request.landingPage || request.pageUrl || '',
      leadId:leadId || '', reason:abuseReason
    });
    return;
  }
  var item = wtcReferralFindTracker_({ referralCode:code, visitorHash:visitorHash }) ||
    wtcReferralFindTracker_({ referralCode:code, referredMobile:mobile });
  wtcReferralUpsertConversion_(owner, item, {
    visitorHash:visitorHash,
    referredName:request.studentName || '',
    referredMobile:mobile,
    stage:'ENQUIRY',
    enquiryAt:wtcReferralNow_(),
    source:request.source || 'DEMO_FORM',
    campaign:request.campaign || 'student-referral',
    landingPage:request.landingPage || request.pageUrl || '',
    leadId:leadId || ''
  });
}

function wtcReferralSyncLeadStatus_(lead, request) {
  ensureReferralGrowthSheets_();
  var leadId = String(lead.leadId || '').trim();
  if (!leadId) return;
  var item = wtcReferralFindTracker_({ leadId:leadId });
  if (!item) return;
  var status = String(lead.status || '').toUpperCase();
  var timestamp = wtcReferralNow_();
  var updates = { updatedAt:timestamp };
  if (status === 'DEMO_BOOKED') {
    updates.stage = 'DEMO_BOOKED';
    if (!item.demoBookedAt) updates.demoBookedAt = timestamp;
  } else if (status === 'JOINED') {
    updates.stage = 'JOINED';
    if (!item.joinedAt) updates.joinedAt = timestamp;
    if (String(item.rewardStatus || 'NOT_ELIGIBLE').toUpperCase() === 'NOT_ELIGIBLE') updates.rewardStatus = 'PENDING';
  } else if (status === 'NOT_INTERESTED') {
    updates.stage = 'REJECTED';
    updates.rewardStatus = 'REJECTED';
    updates.rejectionReason = 'Admission lead marked Not Interested.';
  } else return;
  updateRow('REFERRAL_TRACKER', item._row, updates);
}

function wtcReferralAbuseReason_(owner, data) {
  var request = data || {};
  var referrerId = String(owner && owner.studentId || '').trim();
  var referredId = String(request.referredStudentId || '').trim();
  var referredMobile = String(request.referredMobile || '').replace(/\D/g,'');

  if (referrerId && referredId && referrerId === referredId) return 'Self-referral is not eligible.';

  if (referrerId && referredMobile) {
    var referrer = rows('STUDENT_MASTER').filter(function(student) {
      return String(student.studentId || '') === referrerId;
    })[0];
    if (referrer && String(referrer.mobile || '').replace(/\D/g,'') === referredMobile) {
      return 'Self-referral mobile number is not eligible.';
    }
  }

  // A referred mobile/student may belong to only one referral code. This
  // prevents duplicate reward claims from different links or devices.
  var duplicate = rows('REFERRAL_TRACKER').filter(function(item) {
    if (wtcReferralCode_(item.referralCode) === wtcReferralCode_(request.referralCode)) return false;
    if (referredId && String(item.referredStudentId || '') === referredId) return true;
    if (referredMobile && String(item.referredMobile || '').replace(/\D/g,'') === referredMobile) return true;
    return false;
  })[0];
  if (duplicate) return 'This student is already attributed to another referral code.';
  return '';
}

function wtcReferralRecordRejectedAttribution_(owner, visitorHash, data) {
  var request = data || {};
  var existing = wtcReferralFindTracker_({ referralCode:owner.referralCode, visitorHash:visitorHash });
  var timestamp = wtcReferralNow_();
  var updates = {
    referredStudentId:request.referredStudentId || '',
    referredName:wtcReferralCell_(request.referredName || ''),
    referredMobile:String(request.referredMobile || '').replace(/\D/g,''),
    stage:'REJECTED', rewardStatus:'REJECTED', rejectionReason:wtcReferralCell_(request.reason || 'Referral is not eligible.'),
    source:wtcReferralCell_(request.source || 'Referral'), campaign:wtcReferralCell_(request.campaign || 'student-referral'),
    landingPage:wtcReferralCell_(request.landingPage || ''), leadId:request.leadId || '', updatedAt:timestamp
  };
  if (existing) {
    updateRow('REFERRAL_TRACKER', existing._row, updates);
    return;
  }
  append('REFERRAL_TRACKER', {
    referralId:wtcReferralId_(), referralCode:owner.referralCode, referrerStudentId:owner.studentId || '',
    referrerName:wtcReferralCell_(owner.studentName || ''), referrerType:owner.studentType || '', visitorHash:visitorHash || '',
    referredStudentId:updates.referredStudentId, referredName:updates.referredName, referredMobile:updates.referredMobile,
    stage:'REJECTED', source:updates.source, campaign:updates.campaign, landingPage:updates.landingPage, leadId:updates.leadId,
    clickAt:timestamp, signupAt:'', enquiryAt:'', demoBookedAt:'', joinedAt:'', rewardStatus:'REJECTED',
    rewardType:'', rewardNote:'', rewardApprovedBy:'', rewardApprovedAt:'', rejectionReason:updates.rejectionReason,
    createdAt:timestamp, updatedAt:timestamp
  });
}

/* ---------------------------- Internal helpers --------------------------- */

function ensureReferralGrowthSheets_() {
  var workbook = ss();
  wtcReferralEnsureSheet_(workbook, 'REFERRAL_CODES', WTC_REFERRAL_CODE_HEADERS);
  wtcReferralEnsureSheet_(workbook, 'REFERRAL_TRACKER', WTC_REFERRAL_TRACKER_HEADERS);
}

function wtcReferralEnsureSheet_(workbook, name, headers) {
  var sheet = workbook.getSheetByName(name);
  if (!sheet) sheet = workbook.insertSheet(name);
  var lastColumn = Math.max(sheet.getLastColumn(), headers.length);
  var current = sheet.getLastRow() > 0 ? sheet.getRange(1,1,1,lastColumn).getValues()[0].map(String) : [];
  if (sheet.getLastRow() === 0 || current.join('').trim() === '') {
    sheet.getRange(1,1,1,headers.length).setValues([headers]).setFontWeight('bold').setBackground('#0f172a').setFontColor('#ffffff');
    sheet.setFrozenRows(1);
    sheet.autoResizeColumns(1, headers.length);
  } else {
    var missing = headers.filter(function(header){ return current.indexOf(header) === -1; });
    if (missing.length) {
      sheet.getRange(1, sheet.getLastColumn()+1, 1, missing.length).setValues([missing]).setFontWeight('bold').setBackground('#0f172a').setFontColor('#ffffff');
    }
  }
  SpreadsheetApp.flush();
  if (typeof clearRowsCache_ === 'function') clearRowsCache_(name);
  return sheet;
}

function wtcReferralGetOrCreateCode_(student) {
  var existing = rows('REFERRAL_CODES').filter(function(item){ return String(item.studentId||'') === String(student.studentId||''); })[0];
  if (existing) return existing;
  var lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    existing = rows('REFERRAL_CODES').filter(function(item){ return String(item.studentId||'') === String(student.studentId||''); })[0];
    if (existing) return existing;
    var code = wtcReferralGenerateUniqueCode_(student.studentId);
    var timestamp = wtcReferralNow_();
    append('REFERRAL_CODES', {
      referralCode:code, studentId:student.studentId, studentName:wtcReferralCell_(student.name || 'Student'),
      studentType:student.studentType || 'GENERAL_STUDENT', status:'ACTIVE', createdAt:timestamp, updatedAt:timestamp,
      shareCount:0, lastSharedAt:''
    });
    return rows('REFERRAL_CODES').filter(function(item){ return String(item.studentId||'') === String(student.studentId||''); })[0];
  } finally { lock.releaseLock(); }
}

function wtcReferralGenerateUniqueCode_(studentId) {
  for (var attempt=0; attempt<20; attempt++) {
    var raw = String(studentId || '') + '|' + new Date().getTime() + '|' + Math.random() + '|' + attempt;
    var digest = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, raw, Utilities.Charset.UTF_8);
    var token = digest.map(function(value){ return ('0' + ((value + 256) % 256).toString(16)).slice(-2); }).join('').slice(0, 7).toUpperCase();
    var code = 'WTC-' + token;
    if (!wtcReferralFindCode_(code)) return code;
  }
  throw new Error('Could not generate a unique referral code. Please try again.');
}

function wtcReferralRequireStudent_(d) {
  var request = d || {};
  var studentId = String(request.studentId || request.id || '').trim();
  var mobile = String(request.mobile || '').replace(/\D/g,'');
  if (!studentId) throw new Error('Student identity is required.');
  var student = rows('STUDENT_MASTER').filter(function(item){
    var idMatches = String(item.studentId || '') === studentId;
    var mobileMatches = !mobile || String(item.mobile || '').replace(/\D/g,'') === mobile;
    return idMatches && mobileMatches;
  })[0];
  if (!student) throw new Error('Student account could not be verified.');
  if (!active(student)) throw new Error('Student account is not active.');
  return student;
}

function wtcReferralRequireAdmin_(d) {
  if (typeof wtcAdmissionRequireAdmin_ === 'function') return wtcAdmissionRequireAdmin_(d || {});
  var request = d || {};
  var adminId = String(request.adminId || '').trim();
  var adminMobile = String(request.adminMobile || '').trim();
  var adminPassword = String(request.adminPassword || '').trim();
  if (!adminPassword) throw new Error('Admin password is required.');
  var admin = rows('ADMIN_MASTER').filter(function(item){
    var identityMatches = (adminId && String(item.adminId||'') === adminId) || (adminMobile && String(item.mobile||'') === adminMobile);
    return identityMatches && String(item.password||'') === adminPassword;
  })[0];
  if (!admin) throw new Error('Admin password verification failed.');
  if (!active(admin)) throw new Error('Admin account is not active.');
  return admin;
}

function wtcReferralUpsertConversion_(owner, item, data) {
  var timestamp = wtcReferralNow_();
  var stage = String(data.stage || 'CLICKED').toUpperCase();
  if (item) {
    var currentStage = String(item.stage || 'CLICKED').toUpperCase();
    var updates = {
      visitorHash:data.visitorHash || item.visitorHash || '',
      referredStudentId:data.referredStudentId || item.referredStudentId || '',
      referredName:wtcReferralCell_(data.referredName || item.referredName || ''),
      referredMobile:String(data.referredMobile || item.referredMobile || '').replace(/\D/g,''),
      stage:wtcReferralHigherStage_(currentStage, stage),
      source:wtcReferralCell_(data.source || item.source || 'Referral'),
      campaign:wtcReferralCell_(data.campaign || item.campaign || 'student-referral'),
      landingPage:wtcReferralCell_(data.landingPage || item.landingPage || ''),
      leadId:data.leadId || item.leadId || '',
      signupAt:data.signupAt || item.signupAt || '', enquiryAt:data.enquiryAt || item.enquiryAt || '',
      demoBookedAt:data.demoBookedAt || item.demoBookedAt || '', joinedAt:data.joinedAt || item.joinedAt || '',
      updatedAt:timestamp
    };
    updateRow('REFERRAL_TRACKER', item._row, updates);
    return;
  }
  append('REFERRAL_TRACKER', {
    referralId:wtcReferralId_(), referralCode:owner.referralCode, referrerStudentId:owner.studentId,
    referrerName:wtcReferralCell_(owner.studentName || ''), referrerType:owner.studentType || '', visitorHash:data.visitorHash || '',
    referredStudentId:data.referredStudentId || '', referredName:wtcReferralCell_(data.referredName || ''),
    referredMobile:String(data.referredMobile || '').replace(/\D/g,''), stage:stage,
    source:wtcReferralCell_(data.source || 'Referral'), campaign:wtcReferralCell_(data.campaign || 'student-referral'),
    landingPage:wtcReferralCell_(data.landingPage || ''), leadId:data.leadId || '', clickAt:timestamp,
    signupAt:data.signupAt || '', enquiryAt:data.enquiryAt || '', demoBookedAt:data.demoBookedAt || '', joinedAt:data.joinedAt || '',
    rewardStatus:stage === 'JOINED' ? 'PENDING' : 'NOT_ELIGIBLE', rewardType:'', rewardNote:'', rewardApprovedBy:'', rewardApprovedAt:'',
    rejectionReason:'', createdAt:timestamp, updatedAt:timestamp
  });
}

function wtcReferralHigherStage_(currentStage, nextStage) {
  if (nextStage === 'REJECTED' || nextStage === 'REWARD_APPROVED') return nextStage;
  var currentIndex = WTC_REFERRAL_STAGES.indexOf(currentStage);
  var nextIndex = WTC_REFERRAL_STAGES.indexOf(nextStage);
  return nextIndex > currentIndex ? nextStage : currentStage;
}

function wtcReferralFindCode_(code) {
  var normalized = wtcReferralCode_(code);
  if (!normalized) return null;
  return rows('REFERRAL_CODES').filter(function(item){ return wtcReferralCode_(item.referralCode) === normalized; })[0] || null;
}

function wtcReferralFindTracker_(criteria) {
  var c = criteria || {};
  return rows('REFERRAL_TRACKER').filter(function(item){
    if (c.referralId && String(item.referralId||'') !== String(c.referralId)) return false;
    if (c.referralCode && wtcReferralCode_(item.referralCode) !== wtcReferralCode_(c.referralCode)) return false;
    if (c.visitorHash && String(item.visitorHash||'') !== String(c.visitorHash)) return false;
    if (c.referredMobile && String(item.referredMobile||'').replace(/\D/g,'') !== String(c.referredMobile||'').replace(/\D/g,'')) return false;
    if (c.leadId && String(item.leadId||'') !== String(c.leadId)) return false;
    return true;
  })[0] || null;
}

function wtcReferralStudentSummary_(items) {
  var summary = { CLICKS:0, SIGNUPS:0, ENQUIRIES:0, DEMO_BOOKED:0, JOINED:0, REWARD_PENDING:0, REWARD_APPROVED:0 };
  (items || []).forEach(function(item){
    summary.CLICKS += 1;
    if (item.signupAt) summary.SIGNUPS += 1;
    if (item.enquiryAt) summary.ENQUIRIES += 1;
    if (item.demoBookedAt) summary.DEMO_BOOKED += 1;
    if (item.joinedAt) summary.JOINED += 1;
    var reward = String(item.rewardStatus || '').toUpperCase();
    if (reward === 'PENDING') summary.REWARD_PENDING += 1;
    if (reward === 'APPROVED') summary.REWARD_APPROVED += 1;
  });
  return summary;
}

function wtcReferralAdminSummary_(codes, items) {
  var summary = { ACTIVE_CODES:0, TOTAL_CODES:(codes||[]).length, CLICKS:0, SIGNUPS:0, ENQUIRIES:0, DEMO_BOOKED:0, JOINED:0, PENDING_REWARDS:0, APPROVED_REWARDS:0, CONVERSION_RATE:0, TOP_REFERRER:'—' };
  var referrerCounts = {};
  (codes || []).forEach(function(code){ if (String(code.status||'ACTIVE').toUpperCase() === 'ACTIVE') summary.ACTIVE_CODES += 1; });
  (items || []).forEach(function(item){
    summary.CLICKS += 1;
    if (item.signupAt) summary.SIGNUPS += 1;
    if (item.enquiryAt) summary.ENQUIRIES += 1;
    if (item.demoBookedAt) summary.DEMO_BOOKED += 1;
    if (item.joinedAt) summary.JOINED += 1;
    var reward = String(item.rewardStatus || '').toUpperCase();
    if (reward === 'PENDING') summary.PENDING_REWARDS += 1;
    if (reward === 'APPROVED') summary.APPROVED_REWARDS += 1;
    if (item.joinedAt) {
      var label = String(item.referrerName || item.referralCode || 'Unknown');
      referrerCounts[label] = (referrerCounts[label] || 0) + 1;
    }
  });
  summary.CONVERSION_RATE = summary.CLICKS ? Math.round(summary.JOINED / summary.CLICKS * 100) : 0;
  var top = Object.keys(referrerCounts).sort(function(a,b){ return referrerCounts[b]-referrerCounts[a] || a.localeCompare(b); })[0];
  if (top) summary.TOP_REFERRER = top;
  return summary;
}

function wtcReferralStudentView_(item) {
  return {
    referralId:item.referralId || '',
    stage:String(item.stage || 'CLICKED').toUpperCase(),
    rewardStatus:String(item.rewardStatus || 'NOT_ELIGIBLE').toUpperCase(),
    rewardType:item.rewardType || '',
    updatedAt:item.updatedAt || item.createdAt || ''
  };
}

function wtcReferralAdminCodeView_(item) {
  return {
    referralCode:item.referralCode || '', studentId:item.studentId || '', studentName:item.studentName || '',
    studentType:item.studentType || '', status:String(item.status || 'ACTIVE').toUpperCase(),
    shareCount:Number(item.shareCount || 0), lastSharedAt:item.lastSharedAt || '', createdAt:item.createdAt || '', updatedAt:item.updatedAt || ''
  };
}

function wtcReferralAdminView_(item) {
  return {
    referralId:item.referralId || '', referralCode:item.referralCode || '', referrerStudentId:item.referrerStudentId || '',
    referrerName:item.referrerName || '', referrerType:item.referrerType || '', referredStudentId:item.referredStudentId || '',
    referredName:item.referredName || '', referredMobile:String(item.referredMobile || ''), stage:String(item.stage || 'CLICKED').toUpperCase(),
    source:item.source || '', campaign:item.campaign || '', landingPage:item.landingPage || '', leadId:item.leadId || '',
    clickAt:item.clickAt || '', signupAt:item.signupAt || '', enquiryAt:item.enquiryAt || '', demoBookedAt:item.demoBookedAt || '', joinedAt:item.joinedAt || '',
    rewardStatus:String(item.rewardStatus || 'NOT_ELIGIBLE').toUpperCase(), rewardType:item.rewardType || '', rewardNote:item.rewardNote || '',
    rewardApprovedBy:item.rewardApprovedBy || '', rewardApprovedAt:item.rewardApprovedAt || '', rejectionReason:item.rejectionReason || '',
    createdAt:item.createdAt || '', updatedAt:item.updatedAt || ''
  };
}

function wtcReferralVisitorHash_(code, identity) {
  var raw = wtcReferralCode_(code) + '|' + String(identity || 'public');
  var digest = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, raw, Utilities.Charset.UTF_8);
  return digest.map(function(value){ return ('0' + ((value + 256) % 256).toString(16)).slice(-2); }).join('');
}
function wtcReferralId_() { return 'REF-' + Utilities.formatDate(new Date(), (typeof wtcProjectTimeZone_ === 'function' ? wtcProjectTimeZone_() : IST), 'yyyyMMdd-HHmmss') + '-' + Math.floor(100 + Math.random()*900); }
function wtcReferralNow_() { return typeof wtcProjectNow_ === 'function' ? wtcProjectNow_() : now(); }
function wtcReferralCode_(value) { var code=String(value||'').trim().toUpperCase().replace(/[^A-Z0-9-]/g,''); return /^WTC-[A-Z0-9]{5,12}$/.test(code) ? code : ''; }
function wtcReferralText_(value, maxLength) { return String(value||'').replace(/[\u0000-\u001F\u007F]/g,' ').replace(/\s+/g,' ').trim().slice(0,maxLength||200); }
function wtcReferralCell_(value) { var text=String(value||''); return /^[=+\-@]/.test(text) ? "'"+text : text; }
