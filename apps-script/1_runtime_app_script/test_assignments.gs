/* ============================================================================
   WAGH Tuition Classes — Teacher Dashboard Phase 2.5F v1.0
   FILE: test_assignments.gs
   SCOPE: Published Test Assignment, Student Delivery and Assignment Analytics

   Architecture: LOCKED v2.3.1 R2
   - Additive Runtime module. Do not merge into legacy Code.gs.
   - Uses the active WTC_CONTENT_ENGINE workbook for assignments/evidence.
   - Reads published tests from WTC_AI_CONTENT_ENGINE through Script Property:
       WTC_AI_CONTENT_ENGINE_ID
   - Teachers can assign published tests only to verified assigned students.
   - Teachers cannot edit questions, answers, marks or published content.
============================================================================ */

var WTC_TA_REQUEST_CACHE = {};

var WTC_TEST_ASSIGNMENTS_25F = {
  VERSION: '2.5F-v1.0',
  SHEET: 'TEST_ASSIGNMENTS',
  MIGRATION_KEY: 'TEACHER_TEST_ASSIGNMENTS_2_5F_V1',
  MAX_MESSAGE: 300,
  MAX_ASSIGNMENT_STUDENTS: 500,
  VISIBLE_STATUSES: ['published', 'active', 'ready'],
  HEADERS: [
    'assignmentId','assignmentGroupId','teacherId','studentId',
    'board','className','medium','subjectId','chapterId','mcqSetId',
    'testId','testTitle','testType','assignedAt','dueAt','maxAttempts',
    'teacherMessage','status','cancelledAt','createdAt','updatedAt'
  ]
};

/**
 * Run exactly once after adding this module. Safe to rerun.
 * Creates only missing structure and never clears populated data.
 */
function installTestAssignmentSystem() {
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) throw new Error('Another setup operation is running. Try again in a few seconds.');
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var assignmentResult = wtcTAEnsureSheet_(ss, WTC_TEST_ASSIGNMENTS_25F.SHEET, WTC_TEST_ASSIGNMENTS_25F.HEADERS);
    var resultResult = wtcTAEnsureSheet_(ss, 'TEST_RESULTS', ['resultId','studentId','chapterId','testType','score','total','percent','createdAt','assignmentId']);
    var attemptResult = wtcTAEnsureSheet_(ss, 'MCQ_ATTEMPTS', ['attemptId','studentId','name','mobile','board','className','medium','subjectId','subjectName','chapterId','chapterName','testId','testTitle','testType','score','total','percent','earnedMarks','totalMarks','correctCount','wrongCount','totalTimeSec','page','deviceId','createdAt','assignmentId']);
    var detailResult = wtcTAEnsureSheet_(ss, 'MCQ_ATTEMPT_DETAILS', ['detailId','attemptId','studentId','chapterId','questionNo','questionId','topic','difficulty','selectedOption','correctOption','isCorrect','marks','timeTakenSec','createdAt']);
    var migrationResult = wtcTARecordMigration_(ss, {
      migrationId: 'MIG-' + wtcTAHash_([WTC_TEST_ASSIGNMENTS_25F.MIGRATION_KEY, WTC_TEST_ASSIGNMENTS_25F.VERSION].join('|')).slice(0, 20),
      migrationKey: WTC_TEST_ASSIGNMENTS_25F.MIGRATION_KEY,
      version: WTC_TEST_ASSIGNMENTS_25F.VERSION,
      status: 'APPLIED',
      appliedAt: wtcTANow_(),
      notes: 'Created TEST_ASSIGNMENTS and added optional assignmentId columns to TEST_RESULTS and MCQ_ATTEMPTS. Non-destructive and idempotent.'
    });
    return {
      success: true,
      version: WTC_TEST_ASSIGNMENTS_25F.VERSION,
      message: 'Teacher Test Assignment System Phase 2.5F is ready.',
      testAssignments: assignmentResult,
      testResults: resultResult,
      mcqAttempts: attemptResult,
      mcqAttemptDetails: detailResult,
      migration: migrationResult
    };
  } finally {
    lock.releaseLock();
  }
}

/* ============================= Teacher APIs ============================== */

function teacherGetAssignableTests(d) {
  var request = d || {};
  var scope = wtcTeacher25BBuildScope_(request);
  var tests = wtcTAGetAssignableTestsForScope_(scope);
  var summaries = wtcTeacher25BStudentSummaries_(scope);
  var summaryMap = {};
  summaries.forEach(function(item) { summaryMap[wtcTANorm_(item.studentId)] = item; });

  return {
    success: true,
    phase: '2.5F',
    mode: 'CONTROLLED_ASSIGNMENT_WRITE',
    assignment: wtcTeacher25BAssignmentPayload_(scope),
    tests: tests,
    students: scope.students.map(function(student) {
      var summary = summaryMap[wtcTANorm_(student.studentId)] || {};
      return {
        studentId: student.studentId || '',
        name: student.name || student.studentName || 'Student',
        board: student.board || '',
        className: student.className || '',
        medium: student.medium || '',
        status: student.status || 'Active',
        performanceStatus: summary.performanceStatus || 'No Activity',
        averagePercent: Number(summary.averagePercent || 0),
        attemptCount: Number(summary.attemptCount || 0),
        needsAttention: !!summary.needsAttention
      };
    }),
    total: tests.length
  };
}

function teacherCreateTestAssignment(d) {
  var request = d || {};
  var scope = wtcTeacher25BBuildScope_(request);
  var test = wtcTARequireAssignableTest_(scope, request.testId);
  var eligible = wtcTAEligibleStudentsForTest_(scope, test);
  var selected = wtcTASelectStudents_(scope, test, eligible, request);
  if (!selected.length) throw new Error('No eligible assigned students match the selected send option.');
  if (selected.length > WTC_TEST_ASSIGNMENTS_25F.MAX_ASSIGNMENT_STUDENTS) throw new Error('Too many students were selected for one assignment.');

  var teacherId = String(scope.teacher.teacherId || '').trim();
  var clientRequestId = String(request.clientRequestId || '').trim();
  if (!clientRequestId) throw new Error('clientRequestId is required to prevent duplicate assignments.');
  var groupId = 'TAG-' + wtcTAHash_([teacherId, clientRequestId].join('|')).slice(0, 24);
  var existing = wtcTARows_(WTC_TEST_ASSIGNMENTS_25F.SHEET).filter(function(row) {
    return wtcTANorm_(row.assignmentGroupId) === wtcTANorm_(groupId) && wtcTANorm_(row.teacherId) === wtcTANorm_(teacherId);
  });
  if (existing.length) {
    return {
      success: true,
      reused: true,
      assignmentGroupId: groupId,
      assignedCount: existing.length,
      message: 'This assignment request was already saved. The existing assignment was reused.'
    };
  }

  var lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) throw new Error('Another assignment is currently being saved. Try again in a few seconds.');
  try {
    // Check again after acquiring the lock.
    existing = wtcTARows_(WTC_TEST_ASSIGNMENTS_25F.SHEET).filter(function(row) {
      return wtcTANorm_(row.assignmentGroupId) === wtcTANorm_(groupId) && wtcTANorm_(row.teacherId) === wtcTANorm_(teacherId);
    });
    if (existing.length) {
      return { success:true, reused:true, assignmentGroupId:groupId, assignedCount:existing.length, message:'Existing assignment reused.' };
    }

    var now = wtcTANow_();
    var dueAt = wtcTAValidateDueAt_(request.dueAt || request.dueDate || '');
    var maxAttempts = wtcTAMaxAttempts_(request.maxAttempts);
    var message = String(request.teacherMessage || '').trim().slice(0, WTC_TEST_ASSIGNMENTS_25F.MAX_MESSAGE);
    var rows = selected.map(function(student) {
      var assignmentId = 'TAS-' + wtcTAHash_([groupId, student.studentId].join('|')).slice(0, 26);
      return {
        assignmentId: assignmentId,
        assignmentGroupId: groupId,
        teacherId: teacherId,
        studentId: student.studentId || '',
        board: student.board || test.board || '',
        className: student.className || test.className || '',
        medium: student.medium || test.medium || '',
        subjectId: test.subjectId || '',
        chapterId: test.chapterId || '',
        mcqSetId: test.mcqSetId || '',
        testId: test.testId || '',
        testTitle: test.testTitle || '',
        testType: test.testType || '',
        assignedAt: now,
        dueAt: dueAt,
        maxAttempts: maxAttempts,
        teacherMessage: message,
        status: 'ASSIGNED',
        cancelledAt: '',
        createdAt: now,
        updatedAt: now
      };
    });
    wtcTAAppendRows_(WTC_TEST_ASSIGNMENTS_25F.SHEET, rows);
    return {
      success: true,
      reused: false,
      assignmentGroupId: groupId,
      assignedCount: rows.length,
      test: wtcTAPublicTest_(test),
      message: 'Test assigned successfully to ' + rows.length + ' student' + (rows.length === 1 ? '' : 's') + '.'
    };
  } finally {
    lock.releaseLock();
  }
}

function teacherGetSentTests(d) {
  var request = d || {};
  var scope = wtcTeacher25BBuildScope_(request);
  var teacherId = wtcTANorm_(scope.teacher.teacherId);
  var rows = wtcTARows_(WTC_TEST_ASSIGNMENTS_25F.SHEET).filter(function(row) {
    return wtcTANorm_(row.teacherId) === teacherId;
  });
  var results = wtcTARows_('TEST_RESULTS');
  var groups = wtcTAGroupAssignmentRows_(rows, results);
  return {
    success: true,
    phase: '2.5F',
    assignments: groups,
    summary: wtcTAGroupsSummary_(groups),
    total: groups.length
  };
}

function teacherGetAssignmentReport(d) {
  var request = d || {};
  var scope = wtcTeacher25BBuildScope_(request);
  var groupId = String(request.assignmentGroupId || '').trim();
  if (!groupId) throw new Error('assignmentGroupId is required.');
  var teacherId = wtcTANorm_(scope.teacher.teacherId);
  var rows = wtcTARows_(WTC_TEST_ASSIGNMENTS_25F.SHEET).filter(function(row) {
    return wtcTANorm_(row.assignmentGroupId) === wtcTANorm_(groupId) && wtcTANorm_(row.teacherId) === teacherId;
  });
  if (!rows.length) throw new Error('Assignment not found in this Teacher scope.');

  // Teacher ownership is the authorization boundary for historical reports.
  // A Student may later change class/profile; the original assignment evidence
  // must remain reviewable by the Teacher who created it.
  var results = wtcTARows_('TEST_RESULTS');
  var group = wtcTAGroupAssignmentRows_(rows, results)[0];
  return {
    success: true,
    phase: '2.5F',
    generatedAt: wtcTANow_(),
    assignment: group,
    students: group.students,
    summary: group.summary
  };
}

function teacherCancelTestAssignment(d) {
  var request = d || {};
  var scope = wtcTeacher25BBuildScope_(request);
  var groupId = String(request.assignmentGroupId || '').trim();
  if (!groupId) throw new Error('assignmentGroupId is required.');
  var rows = wtcTARows_(WTC_TEST_ASSIGNMENTS_25F.SHEET);
  var teacherId = wtcTANorm_(scope.teacher.teacherId);
  var now = wtcTANow_();
  var updated = 0;
  rows.forEach(function(row) {
    if (wtcTANorm_(row.assignmentGroupId) !== wtcTANorm_(groupId)) return;
    if (wtcTANorm_(row.teacherId) !== teacherId) throw new Error('You cannot cancel another Teacher\'s assignment.');
    if (wtcTANorm_(row.status) === 'cancelled' || wtcTANorm_(row.status) === 'completed') return;
    wtcTAUpdateRow_(WTC_TEST_ASSIGNMENTS_25F.SHEET, row._row, { status:'CANCELLED', cancelledAt:now, updatedAt:now });
    updated += 1;
  });
  if (!updated) return { success:true, cancelledCount:0, message:'No pending assignment rows required cancellation.' };
  return { success:true, cancelledCount:updated, message:'Pending assignment rows were cancelled. Completed evidence was preserved.' };
}

/* ============================== Student APIs ============================= */

function studentGetAssignedTests(d) {
  var request = d || {};
  var student = wtcTARequireStudent_(request);
  var studentId = wtcTANorm_(student.studentId);
  var rows = wtcTARows_(WTC_TEST_ASSIGNMENTS_25F.SHEET).filter(function(row) {
    return wtcTANorm_(row.studentId) === studentId;
  });
  var results = wtcTARows_('TEST_RESULTS');
  var tests = rows.map(function(row) { return wtcTAStudentAssignmentPayload_(row, results); })
    .filter(function(item) { return item.status !== 'CANCELLED'; })
    .sort(function(a, b) { return wtcTATime_(b.assignedAt) - wtcTATime_(a.assignedAt); });
  var pending = tests.filter(function(item) { return item.status === 'PENDING' || item.status === 'OVERDUE'; }).length;
  return {
    success: true,
    phase: '2.5F',
    assignments: tests,
    summary: {
      total: tests.length,
      pending: pending,
      overdue: tests.filter(function(item) { return item.status === 'OVERDUE'; }).length,
      completed: tests.filter(function(item) { return item.status === 'COMPLETED'; }).length
    }
  };
}

function studentOpenAssignedTest(d) {
  var request = d || {};
  var student = wtcTARequireStudent_(request);
  var assignment = wtcTARequireStudentAssignment_(student, request.assignmentId);
  if (wtcTANorm_(assignment.status) === 'cancelled') throw new Error('This assignment was cancelled by the Teacher.');
  var results = wtcTAResultsForAssignment_(wtcTARows_('TEST_RESULTS'), assignment.assignmentId);
  var maxAttempts = Number(assignment.maxAttempts || 0);
  if (maxAttempts > 0 && results.length >= maxAttempts) throw new Error('Maximum attempts reached for this assigned test.');
  var test = wtcTAFindPublishedTest_(assignment.testId, assignment.mcqSetId);
  if (!test) throw new Error('The assigned test is no longer published or available.');
  return {
    success: true,
    phase: '2.5F',
    assignment: wtcTAStudentAssignmentPayload_(assignment, wtcTARows_('TEST_RESULTS')),
    launch: {
      assignmentId: assignment.assignmentId,
      assignmentGroupId: assignment.assignmentGroupId,
      mcqSetId: assignment.mcqSetId,
      testId: assignment.testId,
      testTitle: assignment.testTitle,
      testType: assignment.testType,
      chapterId: assignment.chapterId,
      subjectId: assignment.subjectId,
      board: assignment.board,
      className: assignment.className,
      medium: assignment.medium,
      maxAttempts: maxAttempts,
      attemptsUsed: results.length
    }
  };
}

/**
 * Dedicated result route for the reusable Assigned Test Runner.
 * Existing static/dynamic result actions remain untouched.
 */
function saveAssignedMCQResult(d) {
  var request = d || {};
  var student = wtcTARequireStudent_(request);
  var assignment = wtcTARequireStudentAssignment_(student, request.assignmentId);
  if (wtcTANorm_(assignment.status) === 'cancelled') throw new Error('This assignment has been cancelled.');
  if (wtcTANorm_(assignment.testId) !== wtcTANorm_(request.testId)) throw new Error('Submitted test ID does not match the assignment.');
  if (wtcTANorm_(assignment.chapterId) !== wtcTANorm_(request.chapterId)) throw new Error('Submitted chapter does not match the assignment.');

  var clientAttemptId = String(request.clientAttemptId || '').trim();
  if (!clientAttemptId) throw new Error('clientAttemptId is required to save an assigned test safely.');
  var attemptId = 'ATTA-' + wtcTAHash_([assignment.assignmentId, clientAttemptId].join('|')).slice(0, 26);
  var resultId = 'RES-' + wtcTAHash_([attemptId, 'RESULT'].join('|')).slice(0, 24);

  // A delayed response may reach the browser after the server has already saved.
  // Check the deterministic IDs before enforcing the attempt limit so a retry of
  // the same request always reuses the existing evidence instead of failing.
  var initialAttempt = wtcTARows_('MCQ_ATTEMPTS').find(function(row) {
    return wtcTANorm_(row.attemptId) === wtcTANorm_(attemptId);
  });
  var initialResult = wtcTARows_('TEST_RESULTS').find(function(row) {
    return wtcTANorm_(row.resultId) === wtcTANorm_(resultId);
  });
  if (initialAttempt && initialResult) {
    return { success:true, reused:true, attemptId:attemptId, assignmentId:assignment.assignmentId, message:'This attempt was already saved.' };
  }

  var scored = wtcTAValidateAndScoreSubmission_(assignment, request);
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) throw new Error('Another result is currently being saved. Try again in a few seconds.');
  try {
    var attempts = wtcTARows_('MCQ_ATTEMPTS');
    var results = wtcTARows_('TEST_RESULTS');
    var existingAttempt = attempts.find(function(row) { return wtcTANorm_(row.attemptId) === wtcTANorm_(attemptId); });
    var existingResult = results.find(function(row) { return wtcTANorm_(row.resultId) === wtcTANorm_(resultId); });
    if (existingAttempt && existingResult) {
      return { success:true, reused:true, attemptId:attemptId, assignmentId:assignment.assignmentId, message:'Existing attempt reused.' };
    }

    var otherResults = wtcTAResultsForAssignment_(results, assignment.assignmentId).filter(function(row) {
      return wtcTANorm_(row.resultId) !== wtcTANorm_(resultId) && wtcTANorm_(row.attemptId) !== wtcTANorm_(attemptId);
    });
    var maxAttempts = Number(assignment.maxAttempts || 0);
    if (maxAttempts > 0 && otherResults.length >= maxAttempts) throw new Error('Maximum attempts reached for this assigned test.');

    var now = wtcTANow_();
    var studentId = student.studentId || '';

    // Repair-safe writes: if a prior execution stopped between Sheet writes,
    // the retry appends only the missing evidence and never duplicates it.
    if (!existingAttempt) {
      wtcTAAppendObject_('MCQ_ATTEMPTS', {
        attemptId: attemptId,
        assignmentId: assignment.assignmentId,
        studentId: studentId,
        name: student.name || student.studentName || '',
        mobile: student.mobile || '',
        board: assignment.board || student.board || '',
        className: assignment.className || student.className || '',
        medium: assignment.medium || student.medium || '',
        subjectId: assignment.subjectId || '',
        subjectName: request.subjectName || '',
        chapterId: assignment.chapterId || '',
        chapterName: request.chapterName || '',
        testId: assignment.testId || '',
        testTitle: assignment.testTitle || '',
        testType: assignment.testType || 'Assigned MCQ Test',
        score: scored.score,
        total: scored.total,
        percent: scored.percent,
        earnedMarks: scored.earnedMarks,
        totalMarks: scored.totalMarks,
        correctCount: scored.score,
        wrongCount: Math.max(0, scored.total - scored.score),
        totalTimeSec: request.totalTimeSec || '',
        page: request.page || '',
        deviceId: request.deviceId || '',
        createdAt: now
      });
    }

    if (!existingResult) {
      wtcTAAppendObject_('TEST_RESULTS', {
        resultId: resultId,
        assignmentId: assignment.assignmentId,
        attemptId: attemptId,
        studentId: studentId,
        board: assignment.board || student.board || '',
        className: assignment.className || student.className || '',
        medium: assignment.medium || student.medium || '',
        subjectId: assignment.subjectId || '',
        chapterId: assignment.chapterId || '',
        testId: assignment.testId || '',
        testTitle: assignment.testTitle || '',
        testType: assignment.testType || 'Assigned MCQ Test',
        topic: scored.topic || '',
        score: scored.score,
        total: scored.total,
        percent: scored.percent,
        createdAt: now,
        submittedAt: now
      });
    }

    var existingDetails = {};
    wtcTARows_('MCQ_ATTEMPT_DETAILS').forEach(function(row) {
      if (wtcTANorm_(row.attemptId) === wtcTANorm_(attemptId)) existingDetails[wtcTANorm_(row.detailId)] = true;
    });
    var missingDetails = scored.details.map(function(item, index) {
      var detailId = 'MCQDET-' + wtcTAHash_([attemptId, index + 1].join('|')).slice(0, 24);
      if (existingDetails[wtcTANorm_(detailId)]) return null;
      return {
        detailId: detailId,
        attemptId: attemptId,
        studentId: studentId,
        chapterId: assignment.chapterId || '',
        questionNo: item.questionNo || index + 1,
        questionId: item.questionId || '',
        topic: item.topic || 'General',
        difficulty: item.difficulty || '',
        selectedOption: item.selectedOption || '',
        correctOption: item.correctOption || '',
        isCorrect: item.isCorrect === true ? 'TRUE' : 'FALSE',
        marks: item.marks || '',
        timeTakenSec: item.timeTakenSec || '',
        createdAt: now
      };
    }).filter(Boolean);
    if (missingDetails.length) wtcTAAppendRows_('MCQ_ATTEMPT_DETAILS', missingDetails);

    if (typeof updateWTCMCQProgress_ === 'function') updateWTCMCQProgress_(studentId, scored.percent, assignment.subjectId || '', assignment.chapterId || '', now, assignment.board || '', assignment.className || '', assignment.medium || '');
    if (typeof updateWTCMCQSkillReport_ === 'function') updateWTCMCQSkillReport_(studentId, assignment.chapterId || '', scored.details, now);
    if (typeof updateWTCMCQGamification_ === 'function') updateWTCMCQGamification_(studentId, scored.percent, now);

    wtcTAUpdateRow_(WTC_TEST_ASSIGNMENTS_25F.SHEET, assignment._row, { status:'COMPLETED', updatedAt:now });
    var attemptsUsed = otherResults.length + 1;
    return {
      success: true,
      reused: !!existingAttempt || !!existingResult,
      attemptId: attemptId,
      assignmentId: assignment.assignmentId,
      attemptsUsed: attemptsUsed,
      remainingAttempts: maxAttempts > 0 ? Math.max(0, maxAttempts - attemptsUsed) : null,
      score: scored.score,
      total: scored.total,
      percent: scored.percent,
      message: existingAttempt || existingResult ? 'Incomplete prior save was repaired safely.' : 'Assigned test result saved successfully.'
    };
  } finally {
    lock.releaseLock();
  }
}

/* ============================== Core helpers ============================== */

function wtcTAGetAssignableTestsForScope_(scope) {
  var rows = wtcTAAuthoringRows_('MCQ_TEST_ENGINE');
  var tests = rows.filter(function(row) {
    if (WTC_TEST_ASSIGNMENTS_25F.VISIBLE_STATUSES.indexOf(wtcTANorm_(row.status)) < 0) return false;
    if (!row.testId || !row.mcqSetId || !row.chapterId) return false;
    return scope.chapterIds.indexOf(wtcTANorm_(row.chapterId)) >= 0;
  }).map(function(row) {
    var chapter = scope.chapterMap[wtcTANorm_(row.chapterId)] || {};
    var subject = scope.subjectMap[wtcTANorm_(chapter.subjectId)] || {};
    var test = {
      testId: row.testId || '',
      mcqSetId: row.mcqSetId || '',
      chapterId: row.chapterId || '',
      chapterNo: chapter.chapterNo || '',
      chapterName: chapter.chapterName || row.chapterId || '',
      subjectId: chapter.subjectId || subject.subjectId || '',
      subjectName: subject.subjectName || '',
      board: chapter.board || subject.board || '',
      className: chapter.className || subject.className || '',
      medium: chapter.medium || subject.medium || '',
      testTitle: row.testTitle || row.testId || 'MCQ Test',
      testType: row.testType || 'MCQ Test',
      topic: row.topic || '',
      instructions: row.instructions || '',
      questionCount: Number(row.questionCount || 0),
      sortOrder: Number(row.sortOrder || 999),
      status: row.status || ''
    };
    test.eligibleStudentCount = wtcTAEligibleStudentsForTest_(scope, test).length;
    return test;
  });
  var seen = {};
  tests = tests.filter(function(test) {
    var key = wtcTANorm_(test.testId);
    if (!key || seen[key]) return false;
    seen[key] = true;
    return true;
  });
  tests.sort(function(a, b) {
    var ao = Number(a.chapterNo || 9999); var bo = Number(b.chapterNo || 9999);
    if (ao !== bo) return ao - bo;
    if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
    return String(a.testTitle).localeCompare(String(b.testTitle));
  });
  return tests;
}

function wtcTARequireAssignableTest_(scope, testId) {
  var id = wtcTANorm_(testId);
  if (!id) throw new Error('Test ID is required.');
  var test = wtcTAGetAssignableTestsForScope_(scope).find(function(item) { return wtcTANorm_(item.testId) === id; });
  if (!test) throw new Error('This test is not published or is outside the verified Teacher subject/class scope.');
  return test;
}

function wtcTAEligibleStudentsForTest_(scope, test) {
  return scope.students.filter(function(student) {
    if (test.className && wtcTANorm_(student.className) !== wtcTANorm_(test.className)) return false;
    if (test.board && wtcTANorm_(student.board) !== wtcTANorm_(test.board)) return false;
    if (test.medium && wtcTANorm_(student.medium) !== wtcTANorm_(test.medium)) return false;
    return wtcTeacher25BActive_(student);
  });
}

function wtcTASelectStudents_(scope, test, eligible, request) {
  var mode = String(request.selectionMode || 'ALL').trim().toUpperCase();
  var eligibleMap = {};
  eligible.forEach(function(student) { eligibleMap[wtcTANorm_(student.studentId)] = student; });
  if (mode === 'ALL') return eligible;

  if (mode === 'SELECTED') {
    var ids = request.studentIds;
    if (typeof ids === 'string') {
      try { ids = JSON.parse(ids); } catch (ignore) { ids = ids.split(','); }
    }
    ids = Array.isArray(ids) ? ids : [];
    var selected = [];
    var seen = {};
    ids.forEach(function(id) {
      var key = wtcTANorm_(id);
      if (!key || seen[key]) return;
      if (!eligibleMap[key]) throw new Error('One selected student is outside the test/Teacher scope: ' + id);
      seen[key] = true;
      selected.push(eligibleMap[key]);
    });
    return selected;
  }

  if (mode === 'ATTENTION') {
    var summaries = wtcTeacher25BStudentSummaries_(scope);
    var attention = {};
    summaries.forEach(function(item) { if (item.needsAttention) attention[wtcTANorm_(item.studentId)] = true; });
    return eligible.filter(function(student) { return !!attention[wtcTANorm_(student.studentId)]; });
  }

  if (mode === 'NO_ATTEMPT') {
    var attempted = {};
    var evidence = (scope.results || []).concat(wtcTARows_('MCQ_ATTEMPTS'));
    evidence.forEach(function(result) {
      if (wtcTANorm_(result.testId) === wtcTANorm_(test.testId)) attempted[wtcTANorm_(result.studentId || result.userId)] = true;
    });
    return eligible.filter(function(student) { return !attempted[wtcTANorm_(student.studentId)]; });
  }
  throw new Error('Unsupported student selection mode.');
}

/**
 * Recalculate the assigned-test score from the published Authoring rows.
 * Client totals/correct answers are never trusted for Teacher analytics.
 */
function wtcTAValidateAndScoreSubmission_(assignment, request) {
  var test = wtcTAFindPublishedTest_(assignment.testId, assignment.mcqSetId);
  if (!test) throw new Error('The assigned test is no longer published.');

  var visible = WTC_TEST_ASSIGNMENTS_25F.VISIBLE_STATUSES;
  var mapRows = wtcTAAuthoringRows_('MCQ_TEST_QUESTION_MAP').filter(function(row) {
    return wtcTANorm_(row.testId) === wtcTANorm_(assignment.testId) && visible.indexOf(wtcTANorm_(row.status)) >= 0;
  }).sort(function(a, b) { return Number(a.questionOrder || 9999) - Number(b.questionOrder || 9999); });
  if (!mapRows.length) throw new Error('The published test has no question mapping. Ask the Admin to republish the test.');

  var questionIds = mapRows.map(function(row) { return String(row.mcqId || '').trim(); }).filter(Boolean);
  var questionIdSet = {};
  questionIds.forEach(function(id) { questionIdSet[wtcTANorm_(id)] = true; });
  var questionMap = {};
  wtcTAAuthoringRows_('MCQ_ENGINE').forEach(function(row) {
    var id = wtcTANorm_(row.mcqId);
    if (!questionIdSet[id]) return;
    if (wtcTANorm_(row.mcqSetId) !== wtcTANorm_(assignment.mcqSetId)) return;
    if (wtcTANorm_(row.chapterId) !== wtcTANorm_(assignment.chapterId)) return;
    if (visible.indexOf(wtcTANorm_(row.status)) < 0) return;
    questionMap[id] = row;
  });
  if (Object.keys(questionMap).length !== questionIds.length) throw new Error('One or more published questions are missing from this test. Ask the Admin to republish it.');

  var submitted = [];
  try { submitted = typeof request.attemptDetails === 'string' ? JSON.parse(request.attemptDetails || '[]') : (request.attemptDetails || []); }
  catch (error) { throw new Error('Attempt details are invalid. Reload the test and try again.'); }
  if (!Array.isArray(submitted)) throw new Error('Attempt details are invalid.');
  var submittedMap = {};
  submitted.forEach(function(item) {
    var id = wtcTANorm_(item && item.questionId);
    if (!id || !questionIdSet[id]) throw new Error('The submission contains a question outside this assigned test.');
    if (submittedMap[id]) throw new Error('The submission contains a duplicate question.');
    submittedMap[id] = item || {};
  });

  var score = 0;
  var totalMarks = 0;
  var earnedMarks = 0;
  var topics = {};
  var details = questionIds.map(function(questionId, index) {
    var row = questionMap[wtcTANorm_(questionId)];
    var item = submittedMap[wtcTANorm_(questionId)] || {};
    var selected = String(item.selectedOption || '').trim().toUpperCase();
    if (selected && ['A','B','C','D'].indexOf(selected) < 0) throw new Error('An invalid answer option was submitted.');
    var correctOption = String(row.correctOption || '').trim().toUpperCase();
    if (['A','B','C','D'].indexOf(correctOption) < 0) throw new Error('A published question has an invalid correct option. Ask the Admin to repair it.');
    var marks = Number(row.marks || 1);
    if (!isFinite(marks) || marks <= 0) marks = 1;
    var isCorrect = !!selected && selected === correctOption;
    totalMarks += marks;
    if (isCorrect) { score += 1; earnedMarks += marks; }
    var topic = row.topic || 'General';
    topics[topic] = true;
    return {
      questionNo:index + 1,
      questionId:questionId,
      topic:topic,
      difficulty:row.difficulty || '',
      selectedOption:selected,
      correctOption:correctOption,
      isCorrect:isCorrect,
      marks:marks,
      timeTakenSec:Number(item.timeTakenSec || 0) || 0
    };
  });
  var total = questionIds.length;
  return {
    score:score,
    total:total,
    percent:total ? Math.round((score / total) * 100) : 0,
    earnedMarks:earnedMarks,
    totalMarks:totalMarks,
    topic:Object.keys(topics).join(', '),
    details:details
  };
}

function wtcTAFindPublishedTest_(testId, mcqSetId) {
  var id = wtcTANorm_(testId);
  var setId = wtcTANorm_(mcqSetId);
  return wtcTAAuthoringRows_('MCQ_TEST_ENGINE').find(function(row) {
    return wtcTANorm_(row.testId) === id && wtcTANorm_(row.mcqSetId) === setId && WTC_TEST_ASSIGNMENTS_25F.VISIBLE_STATUSES.indexOf(wtcTANorm_(row.status)) >= 0;
  }) || null;
}

function wtcTAPublicTest_(test) {
  return {
    testId:test.testId || '', mcqSetId:test.mcqSetId || '', chapterId:test.chapterId || '', chapterNo:test.chapterNo || '',
    chapterName:test.chapterName || '', subjectId:test.subjectId || '', subjectName:test.subjectName || '', board:test.board || '',
    className:test.className || '', medium:test.medium || '', testTitle:test.testTitle || '', testType:test.testType || '',
    topic:test.topic || '', questionCount:Number(test.questionCount || 0), eligibleStudentCount:Number(test.eligibleStudentCount || 0)
  };
}

function wtcTAGroupAssignmentRows_(rows, results) {
  var groups = {};
  rows.forEach(function(row) {
    var key = String(row.assignmentGroupId || row.assignmentId || '').trim();
    if (!key) return;
    if (!groups[key]) groups[key] = [];
    groups[key].push(row);
  });
  return Object.keys(groups).map(function(key) {
    var groupRows = groups[key];
    var first = groupRows[0];
    var students = groupRows.map(function(row) {
      var attempts = wtcTAResultsForAssignment_(results, row.assignmentId);
      return wtcTAAssignmentStudentAnalytics_(row, attempts);
    });
    var summary = wtcTAStudentAnalyticsSummary_(students);
    return {
      assignmentGroupId:key,
      testId:first.testId || '', mcqSetId:first.mcqSetId || '', testTitle:first.testTitle || '', testType:first.testType || '',
      chapterId:first.chapterId || '', subjectId:first.subjectId || '', board:first.board || '', className:first.className || '', medium:first.medium || '',
      assignedAt:first.assignedAt || first.createdAt || '', dueAt:first.dueAt || '', maxAttempts:Number(first.maxAttempts || 0),
      teacherMessage:first.teacherMessage || '', status:wtcTAGroupStatus_(students), summary:summary, students:students
    };
  }).sort(function(a, b) { return wtcTATime_(b.assignedAt) - wtcTATime_(a.assignedAt); });
}

function wtcTAAssignmentStudentAnalytics_(row, attempts) {
  attempts = (attempts || []).slice().sort(function(a, b) { return wtcTATime_(a.createdAt || a.submittedAt || a.timestamp) - wtcTATime_(b.createdAt || b.submittedAt || b.timestamp); });
  var percentages = attempts.map(wtcTAResultPercent_).filter(function(value) { return value !== null; });
  var latest = attempts.length ? attempts[attempts.length - 1] : null;
  var first = attempts.length ? attempts[0] : null;
  var dueTime = wtcTADueTime_(row.dueAt);
  var latestTime = latest ? wtcTATime_(latest.createdAt || latest.submittedAt || latest.timestamp) : 0;
  var cancelled = wtcTANorm_(row.status) === 'cancelled';
  var status = cancelled ? 'CANCELLED' : (attempts.length ? 'COMPLETED' : (dueTime && dueTime < new Date().getTime() ? 'OVERDUE' : 'PENDING'));
  return {
    assignmentId:row.assignmentId || '', studentId:row.studentId || '', studentName:wtcTAStudentName_(row.studentId),
    board:row.board || '', className:row.className || '', medium:row.medium || '', status:status,
    attempts:attempts.length, firstPercent:first ? wtcTAResultPercent_(first) : null,
    latestPercent:latest ? wtcTAResultPercent_(latest) : null,
    bestPercent:percentages.length ? Math.max.apply(null, percentages) : null,
    trend:percentages.length >= 2 ? wtcTARound_(percentages[percentages.length - 1] - percentages[0]) : null,
    lastSubmittedAt:latest ? (latest.createdAt || latest.submittedAt || latest.timestamp || '') : '',
    onTime:attempts.length ? (!dueTime || latestTime <= dueTime) : null,
    maxAttempts:Number(row.maxAttempts || 0)
  };
}

function wtcTAStudentAnalyticsSummary_(students) {
  var assigned = students.length;
  var attempted = students.filter(function(item) { return item.attempts > 0; }).length;
  var cancelled = students.filter(function(item) { return item.status === 'CANCELLED'; }).length;
  var overdue = students.filter(function(item) { return item.status === 'OVERDUE'; }).length;
  var scores = students.map(function(item) { return item.latestPercent; }).filter(function(value) { return value !== null; });
  return {
    assigned:assigned, attempted:attempted, pending:students.filter(function(item) { return item.status === 'PENDING'; }).length,
    overdue:overdue, cancelled:cancelled, completionRate:assigned ? wtcTARound_((attempted / assigned) * 100) : 0,
    averagePercent:scores.length ? wtcTARound_(wtcTASum_(scores) / scores.length) : 0,
    highestPercent:scores.length ? Math.max.apply(null, scores) : 0,
    lowestPercent:scores.length ? Math.min.apply(null, scores) : 0,
    below50:students.filter(function(item) { return item.latestPercent !== null && item.latestPercent < 50; }).length,
    onTime:students.filter(function(item) { return item.onTime === true; }).length,
    totalAttempts:wtcTASum_(students.map(function(item) { return item.attempts; })),
    averageAttempts:attempted ? Math.round((wtcTASum_(students.map(function(item) { return item.attempts; })) / attempted) * 10) / 10 : 0
  };
}

function wtcTAGroupsSummary_(groups) {
  return {
    groups:groups.length,
    assignedStudents:wtcTASum_(groups.map(function(group) { return group.summary.assigned; })),
    pending:wtcTASum_(groups.map(function(group) { return group.summary.pending; })),
    overdue:wtcTASum_(groups.map(function(group) { return group.summary.overdue; })),
    attempted:wtcTASum_(groups.map(function(group) { return group.summary.attempted; }))
  };
}

function wtcTAGroupStatus_(students) {
  if (students.length && students.every(function(item) { return item.status === 'CANCELLED'; })) return 'CANCELLED';
  if (students.length && students.every(function(item) { return item.status === 'COMPLETED' || item.status === 'CANCELLED'; })) return 'COMPLETED';
  if (students.some(function(item) { return item.status === 'OVERDUE'; })) return 'OVERDUE';
  if (students.some(function(item) { return item.status === 'COMPLETED'; })) return 'IN_PROGRESS';
  return 'ASSIGNED';
}

function wtcTAStudentAssignmentPayload_(row, results) {
  var analytics = wtcTAAssignmentStudentAnalytics_(row, wtcTAResultsForAssignment_(results, row.assignmentId));
  var maxAttempts = Number(row.maxAttempts || 0);
  return {
    assignmentId:row.assignmentId || '', assignmentGroupId:row.assignmentGroupId || '', teacherId:row.teacherId || '',
    teacherName:wtcTATeacherName_(row.teacherId), testId:row.testId || '', mcqSetId:row.mcqSetId || '', testTitle:row.testTitle || '',
    testType:row.testType || '', chapterId:row.chapterId || '', chapterName:wtcTAChapterName_(row.chapterId), subjectId:row.subjectId || '',
    assignedAt:row.assignedAt || '', dueAt:row.dueAt || '', maxAttempts:maxAttempts, teacherMessage:row.teacherMessage || '',
    status:analytics.status, attemptsUsed:analytics.attempts, latestPercent:analytics.latestPercent, bestPercent:analytics.bestPercent,
    canStart:analytics.status !== 'CANCELLED' && (maxAttempts <= 0 || analytics.attempts < maxAttempts)
  };
}

function wtcTAResultsForAssignment_(results, assignmentId) {
  var id = wtcTANorm_(assignmentId);
  return (results || []).filter(function(row) { return wtcTANorm_(row.assignmentId) === id; });
}

function wtcTARequireStudent_(request) {
  var studentId = wtcTANorm_(request.studentId || request.userId || request.id);
  var mobile = wtcTADigits_(request.mobile);
  if (!studentId || !mobile) throw new Error('Student session identity is incomplete. Please log out and log in again.');
  var rows = WTC_WorkbookRepository.readRows(WTC_BACKEND.WORKBOOK_KEYS.CONTENT, 'STUDENT_MASTER');
  var student = rows.find(function(row) {
    return wtcTANorm_(row.studentId) === studentId && wtcTADigits_(row.mobile) === mobile;
  });
  if (!student) throw new Error('Student account could not be verified.');
  if (!wtcTeacher25BActive_(student)) throw new Error('Student account is not active.');
  return student;
}

function wtcTARequireStudentAssignment_(student, assignmentId) {
  var id = wtcTANorm_(assignmentId);
  if (!id) throw new Error('assignmentId is required.');
  var studentId = wtcTANorm_(student.studentId);
  var row = wtcTARows_(WTC_TEST_ASSIGNMENTS_25F.SHEET).find(function(item) {
    return wtcTANorm_(item.assignmentId) === id && wtcTANorm_(item.studentId) === studentId;
  });
  if (!row) throw new Error('This test assignment does not belong to the signed-in student.');
  return row;
}

function wtcTAAuthoringRows_(sheetName) {
  var id = PropertiesService.getScriptProperties().getProperty('WTC_AI_CONTENT_ENGINE_ID');
  if (!id) throw new Error('WTC_AI_CONTENT_ENGINE_ID is not configured in Runtime Script Properties.');
  var ss;
  try { ss = SpreadsheetApp.openById(id); }
  catch (error) { throw new Error('Unable to open WTC_AI_CONTENT_ENGINE. Check the Runtime Script Property and permissions.'); }
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet || sheet.getLastRow() < 2) return [];
  return wtcTARowsFromSheet_(sheet);
}

/* ============================ Spreadsheet helpers ======================== */

function wtcTAEnsureSheet_(ss, name, requiredHeaders) {
  var sheet = ss.getSheetByName(name);
  var created = false;
  if (!sheet) { sheet = ss.insertSheet(name); created = true; }
  var existing = [];
  if (sheet.getLastRow() > 0 && sheet.getLastColumn() > 0) {
    existing = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(String);
  }
  var added = [];
  requiredHeaders.forEach(function(header) {
    if (existing.indexOf(header) < 0) { existing.push(header); added.push(header); }
  });
  if (existing.length) {
    sheet.getRange(1, 1, 1, existing.length).setValues([existing]);
    sheet.getRange(1, 1, 1, existing.length).setFontWeight('bold').setBackground('#0f172a').setFontColor('#ffffff');
    sheet.setFrozenRows(1);
  }
  return { sheet:name, created:created, addedColumns:added };
}

function wtcTARows_(sheetName) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
  if (!sheet || sheet.getLastRow() < 2) return [];
  return wtcTARowsFromSheet_(sheet);
}

function wtcTARowsFromSheet_(sheet) {
  var values = sheet.getDataRange().getValues();
  if (!values.length) return [];
  var headers = values[0].map(String);
  return values.slice(1).map(function(row, index) {
    var object = { _row:index + 2 };
    headers.forEach(function(header, column) { if (header) object[header] = row[column]; });
    return object;
  });
}

function wtcTAAppendRows_(sheetName, objects) {
  if (!objects || !objects.length) return 0;
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
  if (!sheet) throw new Error(sheetName + ' is missing. Run installTestAssignmentSystem() once.');
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(String);
  var values = objects.map(function(object) { return headers.map(function(header) { return object[header] === undefined ? '' : object[header]; }); });
  sheet.getRange(sheet.getLastRow() + 1, 1, values.length, headers.length).setValues(values);
  return values.length;
}

function wtcTAAppendObject_(sheetName, object) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
  if (!sheet) throw new Error(sheetName + ' is missing.');
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(String);
  var values = headers.map(function(header) { return object[header] === undefined ? '' : object[header]; });
  sheet.appendRow(values);
}

function wtcTAUpdateRow_(sheetName, rowNumber, patch) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
  if (!sheet || !rowNumber) return false;
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(String);
  var row = sheet.getRange(rowNumber, 1, 1, headers.length).getValues()[0];
  Object.keys(patch || {}).forEach(function(key) {
    var index = headers.indexOf(key);
    if (index >= 0) row[index] = patch[key];
  });
  sheet.getRange(rowNumber, 1, 1, headers.length).setValues([row]);
  return true;
}

function wtcTARecordMigration_(ss, row) {
  var headers = ['migrationId','migrationKey','version','status','appliedAt','notes'];
  wtcTAEnsureSheet_(ss, 'MIGRATION_LOG', headers);
  var existing = wtcTARows_('MIGRATION_LOG').find(function(item) { return wtcTANorm_(item.migrationKey) === wtcTANorm_(row.migrationKey); });
  if (existing) return { reused:true, migrationKey:row.migrationKey };
  wtcTAAppendObject_('MIGRATION_LOG', row);
  return { reused:false, migrationKey:row.migrationKey };
}

/* ================================ Utilities ============================== */

function wtcTAValidateDueAt_(value) {
  if (!value) return '';
  var raw = String(value).trim();
  var parsed = new Date(raw + (/^\d{4}-\d{2}-\d{2}$/.test(raw) ? 'T23:59:59' : ''));
  if (isNaN(parsed.getTime())) throw new Error('Due date is invalid.');
  return raw;
}

function wtcTAMaxAttempts_(value) {
  var number = Number(value || 0);
  if (!isFinite(number) || number < 0 || number > 10) throw new Error('Maximum attempts must be 0 (unlimited) or between 1 and 10.');
  return Math.floor(number);
}

function wtcTAResultPercent_(row) {
  var value = row.percent;
  if (value === undefined || value === '') value = row.percentage;
  if (value !== undefined && value !== '') {
    var number = Number(String(value).replace('%', '').trim());
    if (isFinite(number)) return Math.max(0, Math.min(100, number));
  }
  var score = Number(row.score); var total = Number(row.total || row.totalMarks);
  return isFinite(score) && isFinite(total) && total > 0 ? Math.round((score / total) * 100) : null;
}

function wtcTAStudentName_(studentId) {
  var id = wtcTANorm_(studentId);
  if (!WTC_TA_REQUEST_CACHE.studentNames) {
    WTC_TA_REQUEST_CACHE.studentNames = {};
    WTC_WorkbookRepository.readRows(WTC_BACKEND.WORKBOOK_KEYS.CONTENT, 'STUDENT_MASTER').forEach(function(item) {
      WTC_TA_REQUEST_CACHE.studentNames[wtcTANorm_(item.studentId)] = item.name || item.studentName || item.studentId || '';
    });
  }
  return WTC_TA_REQUEST_CACHE.studentNames[id] || String(studentId || '');
}

function wtcTATeacherName_(teacherId) {
  var id = wtcTANorm_(teacherId);
  if (!WTC_TA_REQUEST_CACHE.teacherNames) {
    WTC_TA_REQUEST_CACHE.teacherNames = {};
    WTC_WorkbookRepository.readRows(WTC_BACKEND.WORKBOOK_KEYS.CONTENT, 'TEACHER_MASTER').forEach(function(item) {
      WTC_TA_REQUEST_CACHE.teacherNames[wtcTANorm_(item.teacherId)] = item.name || item.teacherName || item.teacherId || '';
    });
  }
  return WTC_TA_REQUEST_CACHE.teacherNames[id] || String(teacherId || '');
}

function wtcTAChapterName_(chapterId) {
  var id = wtcTANorm_(chapterId);
  if (!WTC_TA_REQUEST_CACHE.chapterNames) {
    WTC_TA_REQUEST_CACHE.chapterNames = {};
    WTC_WorkbookRepository.readRows(WTC_BACKEND.WORKBOOK_KEYS.CONTENT, 'CHAPTER_MASTER').forEach(function(item) {
      WTC_TA_REQUEST_CACHE.chapterNames[wtcTANorm_(item.chapterId)] = item.chapterName || item.chapterId || '';
    });
  }
  return WTC_TA_REQUEST_CACHE.chapterNames[id] || String(chapterId || '');
}

function wtcTAHash_(value) {
  var digest = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, String(value || ''), Utilities.Charset.UTF_8);
  return digest.map(function(byte) { return ('0' + ((byte + 256) % 256).toString(16)).slice(-2); }).join('').toUpperCase();
}

function wtcTANow_() { return Utilities.formatDate(new Date(), 'Asia/Kolkata', 'yyyy-MM-dd HH:mm:ss'); }
function wtcTATime_(value) { if (!value) return 0; var date = value instanceof Date ? value : new Date(String(value).replace(' ', 'T')); return isNaN(date.getTime()) ? 0 : date.getTime(); }
function wtcTADueTime_(value) { if (!value) return 0; var raw = String(value).trim(); if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) raw += 'T23:59:59'; return wtcTATime_(raw); }
function wtcTANorm_(value) { return String(value || '').trim().toLowerCase(); }
function wtcTADigits_(value) { return String(value || '').replace(/\D/g, ''); }
function wtcTASum_(values) { return (values || []).reduce(function(total, value) { return total + Number(value || 0); }, 0); }
function wtcTARound_(value) { var number = Number(value || 0); return isFinite(number) ? Math.round(number) : 0; }
