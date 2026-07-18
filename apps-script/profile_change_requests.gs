/* ============================================================================
   FILE: profile_change_requests.gs
   MODULE: Student Profile Change Approval System v1.0
   PURPOSE:
   - Students may change only their own password directly.
   - Name, mobile, board, class and medium changes require admin approval.
   - Admin approval/rejection requires the active admin password.
   - Existing progress is never deleted; profile-specific progress stays isolated.
============================================================================ */

var WTC_PROFILE_CHANGE = Object.freeze({
  SHEET_NAME: 'PROFILE_CHANGE_REQUESTS',
  VERSION: '1.0',
  STATUS: Object.freeze({
    PENDING: 'PENDING',
    APPLIED: 'APPLIED',
    REJECTED: 'REJECTED',
    CANCELLED: 'CANCELLED'
  }),
  HEADERS: Object.freeze([
    'requestId','studentId','studentName',
    'currentMobile','requestedName','requestedMobile',
    'currentBoard','requestedBoard',
    'currentClassName','requestedClassName',
    'currentMedium','requestedMedium',
    'reason','status','requestedAt',
    'reviewedBy','reviewedAt','adminRemarks','appliedAt','updatedAt'
  ])
});

function installProfileChangeApprovalSystem() {
  var sheet = wtcProfileEnsureSheet_();
  return {
    success: true,
    message: 'Student Profile Change Approval System v1.0 is ready.',
    sheetName: sheet.getName(),
    columns: sheet.getLastColumn()
  };
}

function protectedStudentProfileUpdate(d) {
  var request = d || {};
  var requestedPassword = norm(request.newPassword || request.password);
  var hasProtectedFields = ['name','mobile','board','className','medium','studentType','accessStatus']
    .some(function(key) { return request[key] !== undefined && norm(request[key]) !== ''; });

  if (!hasProtectedFields && requestedPassword && norm(request.currentPassword)) {
    return changeStudentPassword({
      studentId: request.studentId,
      currentPassword: request.currentPassword,
      newPassword: requestedPassword,
      deviceId: request.deviceId
    });
  }

  return {
    success: false,
    code: 'PROFILE_APPROVAL_REQUIRED',
    message: 'Students may change only their password directly. Submit a profile change request for other details.'
  };
}

function changeStudentPassword(d) {
  var request = d || {};
  var student = wtcProfileRequireStudent_(request.studentId, request.currentPassword);
  var newPassword = norm(request.newPassword);

  if (newPassword.length < 4) {
    return { success:false, message:'New password must contain at least 4 characters.' };
  }
  if (newPassword === norm(request.currentPassword)) {
    return { success:false, message:'New password must be different from the current password.' };
  }

  wtcProfileUpdateSheetRow_('STUDENT_MASTER', student._row, {
    password: newPassword,
    updatedAt: now()
  });
  wtcProfileClearStudentCache_();

  logAccess({
    userId:student.studentId,
    name:student.name,
    role:'Student',
    mobile:student.mobile,
    actionName:'Password Changed',
    url:'student profile',
    deviceId:request.deviceId
  });

  return { success:true, message:'Password changed successfully.' };
}

function createProfileChangeRequest(d) {
  var request = d || {};
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);

  try {
    var student = wtcProfileRequireStudent_(request.studentId, request.currentPassword);
    var existing = wtcProfileRows_().filter(function(item) {
      return norm(item.studentId) === norm(student.studentId) &&
        norm(item.status).toUpperCase() === WTC_PROFILE_CHANGE.STATUS.PENDING;
    })[0];

    if (existing) {
      return {
        success:false,
        code:'PENDING_REQUEST_EXISTS',
        message:'A profile change request is already waiting for admin approval.',
        request:wtcProfileStudentView_(existing)
      };
    }

    var requestedName = norm(request.requestedName || student.name);
    var requestedMobile = norm(request.requestedMobile || student.mobile).replace(/\D/g, '');
    var requestedBoard = norm(request.requestedBoard || student.board);
    var requestedClassName = norm(request.requestedClassName || student.className || student.class);
    var requestedMedium = norm(request.requestedMedium || student.medium);
    var reason = norm(request.reason);

    if (!requestedName) return { success:false, message:'Student name cannot be empty.' };
    if (!/^\d{10}$/.test(requestedMobile)) {
      return { success:false, message:'Requested mobile number must contain exactly 10 digits.' };
    }
    if (!requestedBoard || !requestedClassName || !requestedMedium) {
      return { success:false, message:'Board, class and medium are required.' };
    }
    if (!reason || reason.length < 5) {
      return { success:false, message:'Please give a short reason for the requested change.' };
    }

    var duplicateMobile = rows('STUDENT_MASTER').some(function(item) {
      return norm(item.studentId) !== norm(student.studentId) &&
        norm(item.mobile) === requestedMobile;
    });
    if (duplicateMobile) {
      return { success:false, message:'The requested mobile number is already registered.' };
    }

    var changed = requestedName !== norm(student.name) ||
      requestedMobile !== norm(student.mobile) ||
      requestedBoard !== norm(student.board) ||
      requestedClassName !== norm(student.className || student.class) ||
      requestedMedium !== norm(student.medium);

    if (!changed) {
      return { success:false, message:'No profile change was detected.' };
    }

    var timestamp = now();
    var item = {
      requestId:'PCR' + Date.now() + Math.floor(Math.random() * 1000),
      studentId:student.studentId,
      studentName:student.name,
      currentMobile:student.mobile,
      requestedName:requestedName,
      requestedMobile:requestedMobile,
      currentBoard:student.board,
      requestedBoard:requestedBoard,
      currentClassName:student.className || student.class,
      requestedClassName:requestedClassName,
      currentMedium:student.medium,
      requestedMedium:requestedMedium,
      reason:reason,
      status:WTC_PROFILE_CHANGE.STATUS.PENDING,
      requestedAt:timestamp,
      reviewedBy:'',
      reviewedAt:'',
      adminRemarks:'',
      appliedAt:'',
      updatedAt:timestamp
    };

    wtcProfileAppend_(item);

    logAccess({
      userId:student.studentId,
      name:student.name,
      role:'Student',
      mobile:student.mobile,
      actionName:'Profile Change Requested',
      url:item.requestId,
      deviceId:request.deviceId
    });

    return {
      success:true,
      message:'Your request has been sent for admin approval.',
      request:wtcProfileStudentView_(item)
    };
  } finally {
    lock.releaseLock();
  }
}

function getMyProfileChangeRequests(d) {
  var request = d || {};
  var student = wtcProfileFindStudent_(request.studentId);
  if (!student) return { success:false, message:'Student not found.' };

  var list = wtcProfileRows_()
    .filter(function(item) { return norm(item.studentId) === norm(student.studentId); })
    .sort(function(a, b) { return String(b.requestedAt || '').localeCompare(String(a.requestedAt || '')); })
    .slice(0, 10)
    .map(wtcProfileStudentView_);

  return {
    success:true,
    requests:list,
    pendingRequest:list.filter(function(item) { return item.status === WTC_PROFILE_CHANGE.STATUS.PENDING; })[0] || null,
    student:publicUser(student, 'Student', 'studentId'),
    maskedMobile:wtcProfileMaskMobile_(student.mobile)
  };
}

function cancelProfileChangeRequest(d) {
  var request = d || {};
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);

  try {
    var student = wtcProfileRequireStudent_(request.studentId, request.currentPassword);
    var item = wtcProfileRows_().filter(function(row) {
      return norm(row.requestId) === norm(request.requestId) &&
        norm(row.studentId) === norm(student.studentId);
    })[0];

    if (!item) return { success:false, message:'Profile change request not found.' };
    if (norm(item.status).toUpperCase() !== WTC_PROFILE_CHANGE.STATUS.PENDING) {
      return { success:false, message:'Only a pending request can be cancelled.' };
    }

    var timestamp = now();
    wtcProfileUpdateRequestRow_(item._row, {
      status:WTC_PROFILE_CHANGE.STATUS.CANCELLED,
      updatedAt:timestamp
    });

    return { success:true, message:'Profile change request cancelled.' };
  } finally {
    lock.releaseLock();
  }
}

function getProfileChangeRequests(d) {
  var request = d || {};
  var status = norm(request.status || 'PENDING').toUpperCase();
  var all = wtcProfileRows_()
    .sort(function(a, b) { return String(b.requestedAt || '').localeCompare(String(a.requestedAt || '')); });

  var list = status === 'ALL'
    ? all
    : all.filter(function(item) { return norm(item.status).toUpperCase() === status; });

  return {
    success:true,
    requests:list,
    pendingCount:all.filter(function(item) {
      return norm(item.status).toUpperCase() === WTC_PROFILE_CHANGE.STATUS.PENDING;
    }).length
  };
}

function approveProfileChangeRequest(d) {
  var request = d || {};
  var admin = wtcProfileRequireAdmin_(request);
  var lock = LockService.getScriptLock();
  lock.waitLock(30000);

  try {
    var item = wtcProfileRows_().filter(function(row) {
      return norm(row.requestId) === norm(request.requestId);
    })[0];

    if (!item) return { success:false, message:'Profile change request not found.' };
    if (norm(item.status).toUpperCase() !== WTC_PROFILE_CHANGE.STATUS.PENDING) {
      return { success:false, message:'This request has already been reviewed.' };
    }

    var student = wtcProfileFindStudent_(item.studentId);
    if (!student) return { success:false, message:'Student account no longer exists.' };

    var nextName = norm(item.requestedName || student.name);
    var nextMobile = norm(item.requestedMobile || student.mobile).replace(/\D/g, '');
    var nextBoard = norm(item.requestedBoard || student.board);
    var nextClass = norm(item.requestedClassName || student.className || student.class);
    var nextMedium = norm(item.requestedMedium || student.medium);

    if (!nextName) return { success:false, message:'Approved name cannot be empty.' };
    if (!/^\d{10}$/.test(nextMobile)) return { success:false, message:'Approved mobile number is invalid.' };

    var duplicateMobile = rows('STUDENT_MASTER').some(function(other) {
      return norm(other.studentId) !== norm(student.studentId) && norm(other.mobile) === nextMobile;
    });
    if (duplicateMobile) return { success:false, message:'The requested mobile number is already registered.' };

    var profileChanged = nextBoard !== norm(student.board) ||
      nextClass !== norm(student.className || student.class) ||
      nextMedium !== norm(student.medium);

    if (profileChanged && !wtcProfileHasSupportedCurriculum_(nextBoard, nextClass, nextMedium)) {
      return {
        success:false,
        code:'UNSUPPORTED_PROFILE',
        message:'No active subjects exist for the requested Board, Class and Medium. Add curriculum data before approval.'
      };
    }

    var timestamp = now();
    wtcProfileUpdateSheetRow_('STUDENT_MASTER', student._row, {
      name:nextName,
      mobile:nextMobile,
      board:nextBoard,
      className:nextClass,
      medium:nextMedium,
      updatedAt:timestamp
    });

    wtcProfileUpdateRequestRow_(item._row, {
      status:WTC_PROFILE_CHANGE.STATUS.APPLIED,
      reviewedBy:admin.name || admin.adminId || admin.mobile,
      reviewedAt:timestamp,
      adminRemarks:norm(request.adminRemarks),
      appliedAt:timestamp,
      updatedAt:timestamp
    });

    wtcProfileClearStudentCache_();

    logAccess({
      userId:admin.adminId || admin.mobile,
      name:admin.name,
      role:'Admin',
      mobile:admin.mobile,
      actionName:'Profile Change Approved',
      url:item.requestId,
      deviceId:request.deviceId
    });

    var updatedStudent = wtcProfileFindStudent_(student.studentId);
    return {
      success:true,
      message:'Student profile updated and request approved.',
      student:publicUser(updatedStudent, 'Student', 'studentId'),
      maskedMobile:wtcProfileMaskMobile_(updatedStudent.mobile)
    };
  } finally {
    lock.releaseLock();
  }
}

function rejectProfileChangeRequest(d) {
  var request = d || {};
  var admin = wtcProfileRequireAdmin_(request);
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);

  try {
    var item = wtcProfileRows_().filter(function(row) {
      return norm(row.requestId) === norm(request.requestId);
    })[0];

    if (!item) return { success:false, message:'Profile change request not found.' };
    if (norm(item.status).toUpperCase() !== WTC_PROFILE_CHANGE.STATUS.PENDING) {
      return { success:false, message:'This request has already been reviewed.' };
    }

    var timestamp = now();
    wtcProfileUpdateRequestRow_(item._row, {
      status:WTC_PROFILE_CHANGE.STATUS.REJECTED,
      reviewedBy:admin.name || admin.adminId || admin.mobile,
      reviewedAt:timestamp,
      adminRemarks:norm(request.adminRemarks || 'Request rejected by administrator.'),
      updatedAt:timestamp
    });

    logAccess({
      userId:admin.adminId || admin.mobile,
      name:admin.name,
      role:'Admin',
      mobile:admin.mobile,
      actionName:'Profile Change Rejected',
      url:item.requestId,
      deviceId:request.deviceId
    });

    return { success:true, message:'Profile change request rejected.' };
  } finally {
    lock.releaseLock();
  }
}

function adminDashboardWithProfileRequests(d) {
  var summary = adminDashboard(d || {});
  var pending = wtcProfileRows_().filter(function(item) {
    return norm(item.status).toUpperCase() === WTC_PROFILE_CHANGE.STATUS.PENDING;
  }).length;
  summary.pendingProfileRequests = pending;
  return summary;
}

function wtcProfileRequireStudent_(studentId, currentPassword) {
  var student = wtcProfileFindStudent_(studentId);
  if (!student) throw new Error('Student not found.');
  if (!active(student)) throw new Error('Student account is not active.');
  if (!norm(currentPassword)) throw new Error('Current password is required.');
  if (norm(student.password) !== norm(currentPassword)) throw new Error('Current password is incorrect.');
  return student;
}

function wtcProfileFindStudent_(studentId) {
  return rows('STUDENT_MASTER').filter(function(item) {
    return norm(item.studentId) === norm(studentId);
  })[0] || null;
}

function wtcProfileRequireAdmin_(d) {
  var request = d || {};
  var adminId = norm(request.adminId);
  var adminMobile = norm(request.adminMobile);
  var adminPassword = norm(request.adminPassword);

  if (!adminPassword) throw new Error('Admin password is required to review this request.');

  var admin = rows('ADMIN_MASTER').filter(function(item) {
    var identityMatches = (adminId && norm(item.adminId) === adminId) ||
      (adminMobile && norm(item.mobile) === adminMobile);
    return identityMatches && norm(item.password) === adminPassword;
  })[0];

  if (!admin) throw new Error('Admin password verification failed.');
  if (!active(admin)) throw new Error('Admin account is not active.');
  return admin;
}

function wtcProfileHasSupportedCurriculum_(board, className, medium) {
  return rows('SUBJECT_MASTER').some(function(item) {
    return active(item) &&
      norm(item.board) === norm(board) &&
      norm(item.className) === norm(className) &&
      norm(item.medium) === norm(medium);
  });
}

function wtcProfileStudentView_(item) {
  return {
    requestId:item.requestId,
    studentId:item.studentId,
    studentName:item.studentName,
    requestedName:item.requestedName,
    currentMobileMasked:wtcProfileMaskMobile_(item.currentMobile),
    requestedMobileMasked:wtcProfileMaskMobile_(item.requestedMobile),
    currentBoard:item.currentBoard,
    requestedBoard:item.requestedBoard,
    currentClassName:item.currentClassName,
    requestedClassName:item.requestedClassName,
    currentMedium:item.currentMedium,
    requestedMedium:item.requestedMedium,
    reason:item.reason,
    status:norm(item.status).toUpperCase(),
    requestedAt:item.requestedAt,
    reviewedAt:item.reviewedAt,
    adminRemarks:item.adminRemarks,
    appliedAt:item.appliedAt,
    updatedAt:item.updatedAt
  };
}

function wtcProfileMaskMobile_(mobile) {
  var digits = String(mobile || '').replace(/\D/g, '');
  if (!digits) return 'Not available';
  return '••••••' + digits.slice(-4);
}

function wtcProfileEnsureSheet_() {
  var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = spreadsheet.getSheetByName(WTC_PROFILE_CHANGE.SHEET_NAME);

  if (!sheet) {
    sheet = spreadsheet.insertSheet(WTC_PROFILE_CHANGE.SHEET_NAME);
    sheet.getRange(1, 1, 1, WTC_PROFILE_CHANGE.HEADERS.length)
      .setValues([WTC_PROFILE_CHANGE.HEADERS.slice()])
      .setFontWeight('bold')
      .setBackground('#0f172a')
      .setFontColor('#ffffff');
    sheet.setFrozenRows(1);
    sheet.autoResizeColumns(1, WTC_PROFILE_CHANGE.HEADERS.length);
    return sheet;
  }

  var lastColumn = Math.max(1, sheet.getLastColumn());
  var existing = sheet.getRange(1, 1, 1, lastColumn).getValues()[0]
    .map(function(value) { return norm(value); });

  if (!sheet.getLastRow() || existing.join('') === '') {
    sheet.getRange(1, 1, 1, WTC_PROFILE_CHANGE.HEADERS.length)
      .setValues([WTC_PROFILE_CHANGE.HEADERS.slice()])
      .setFontWeight('bold')
      .setBackground('#0f172a')
      .setFontColor('#ffffff');
    sheet.setFrozenRows(1);
    sheet.autoResizeColumns(1, WTC_PROFILE_CHANGE.HEADERS.length);
    return sheet;
  }

  var missing = WTC_PROFILE_CHANGE.HEADERS.filter(function(header) {
    return existing.indexOf(header) === -1;
  });

  if (missing.length) {
    sheet.getRange(1, lastColumn + 1, 1, missing.length)
      .setValues([missing])
      .setFontWeight('bold')
      .setBackground('#0f172a')
      .setFontColor('#ffffff');
  }
  sheet.setFrozenRows(1);
  return sheet;
}

function wtcProfileRows_() {
  var sheet = wtcProfileEnsureSheet_();
  var values = sheet.getDataRange().getValues();
  if (values.length < 2) return [];
  var headers = values[0].map(function(value) { return norm(value); });

  return values.slice(1)
    .filter(function(row) { return row.join('') !== ''; })
    .map(function(row, index) {
      var item = { _row:index + 2 };
      headers.forEach(function(header, columnIndex) {
        if (header) item[header] = row[columnIndex];
      });
      return item;
    });
}

function wtcProfileAppend_(item) {
  var sheet = wtcProfileEnsureSheet_();
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0]
    .map(function(value) { return norm(value); });
  sheet.appendRow(headers.map(function(header) {
    return item[header] !== undefined ? item[header] : '';
  }));
}

function wtcProfileUpdateRequestRow_(rowNumber, changes) {
  var sheet = wtcProfileEnsureSheet_();
  wtcProfileUpdateSheetRowBySheet_(sheet, rowNumber, changes);
}

function wtcProfileUpdateSheetRow_(sheetName, rowNumber, changes) {
  var sheet = sh(sheetName);
  wtcProfileUpdateSheetRowBySheet_(sheet, rowNumber, changes);
}

function wtcProfileUpdateSheetRowBySheet_(sheet, rowNumber, changes) {
  var lastColumn = sheet.getLastColumn();
  var headers = sheet.getRange(1, 1, 1, lastColumn).getValues()[0]
    .map(function(value) { return norm(value); });
  var row = sheet.getRange(rowNumber, 1, 1, lastColumn).getValues()[0];
  headers.forEach(function(header, index) {
    if (changes[header] !== undefined) row[index] = changes[header];
  });
  sheet.getRange(rowNumber, 1, 1, lastColumn).setValues([row]);
  try {
    if (typeof clearRowsCache_ === 'function') clearRowsCache_(sheet.getName());
  } catch (ignore) {}
}

function wtcProfileClearStudentCache_() {
  try {
    if (typeof clearRowsCache_ === 'function') clearRowsCache_('STUDENT_MASTER');
  } catch (ignore) {}
  try {
    if (typeof WTC_WorkbookRepository !== 'undefined' &&
        WTC_WorkbookRepository.clearRowsCache) {
      WTC_WorkbookRepository.clearRowsCache(WTC_BACKEND.WORKBOOK_KEYS.CONTENT, 'STUDENT_MASTER');
    }
  } catch (ignore) {}
}
