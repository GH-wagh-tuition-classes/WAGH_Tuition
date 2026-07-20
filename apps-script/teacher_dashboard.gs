/* ============================================================================
   WAGH Tuition Classes — Teacher Dashboard Phase 2.5B v1.0
   FILE: teacher_dashboard.gs
   SCOPE: Read-only Teacher Student Analytics

   Cumulative replacement for the Phase 2.5A teacher_dashboard.gs module.
   Reads existing WTC_CONTENT_ENGINE sheets through WTC_WorkbookRepository.
   Creates no Sheet, column, row, migration or content record.
============================================================================ */

var WTC_TEACHER_25B = {
  ATTENTION_PERCENT: 60,
  CRITICAL_PERCENT: 50,
  GOOD_PERCENT: 60,
  EXCELLENT_PERCENT: 85,
  INACTIVE_DAYS: 14,
  MAX_DASHBOARD_RESULTS: 100,
  MAX_STUDENT_HISTORY: 200
};

function teacherDashboard(d) {
  var scope = wtcTeacher25BBuildScope_(d || {});
  var students = wtcTeacher25BStudentSummaries_(scope);
  var classChapters = wtcTeacher25BClassChapterAnalytics_(scope);
  var recentResults = wtcTeacher25BResultPayload_(scope, scope.results.slice(0, WTC_TEACHER_25B.MAX_DASHBOARD_RESULTS));
  var attentionStudents = students.filter(function(student) { return student.needsAttention; });
  var resultPercentages = scope.results.map(wtcTeacher25BPercent_).filter(wtcTeacher25BNotNull_);
  var activeStudentCount = scope.students.filter(wtcTeacher25BActive_).length;

  return {
    success: true,
    phase: '2.5B',
    mode: 'READ_ONLY',
    teacher: wtcTeacher25BTeacherPayload_(scope.teacher),
    assignment: wtcTeacher25BAssignmentPayload_(scope),
    overview: {
      assignedStudents: scope.students.length,
      activeStudents: activeStudentCount,
      totalAttempts: scope.results.length,
      averagePercent: resultPercentages.length ? wtcTeacher25BRound_(wtcTeacher25BSum_(resultPercentages) / resultPercentages.length) : 0,
      needsAttention: attentionStudents.length,
      assignedChapters: scope.chapters.length,
      attemptedChapters: classChapters.filter(function(item) { return item.attemptCount > 0; }).length,
      activeLast14Days: students.filter(function(student) { return student.daysSinceActivity !== null && student.daysSinceActivity <= WTC_TEACHER_25B.INACTIVE_DAYS; }).length
    },
    students: students,
    recentResults: recentResults,
    chapterAnalytics: classChapters,
    attentionStudents: attentionStudents,
    assignmentWarnings: scope.warnings
  };
}

function teacherGetStudents(d) {
  var scope = wtcTeacher25BBuildScope_(d || {});
  return {
    success: true,
    phase: '2.5B',
    mode: 'READ_ONLY',
    students: wtcTeacher25BStudentSummaries_(scope),
    assignment: wtcTeacher25BAssignmentPayload_(scope)
  };
}

function teacherGetStudentReport(d) {
  var request = d || {};
  var scope = wtcTeacher25BBuildScope_(request);
  var student = wtcTeacher25BRequireAssignedStudent_(scope, request.studentId);
  return wtcTeacher25BStudentReportPayload_(scope, student);
}

function teacherGetStudentTestHistory(d) {
  var request = d || {};
  var scope = wtcTeacher25BBuildScope_(request);
  var student = wtcTeacher25BRequireAssignedStudent_(scope, request.studentId);
  var report = wtcTeacher25BStudentReportPayload_(scope, student);
  return {
    success: true,
    phase: '2.5B',
    mode: 'READ_ONLY',
    student: report.student,
    summary: report.summary,
    testHistory: report.testHistory
  };
}

function teacherGetChapterAnalytics(d) {
  var scope = wtcTeacher25BBuildScope_(d || {});
  return {
    success: true,
    phase: '2.5B',
    mode: 'READ_ONLY',
    assignment: wtcTeacher25BAssignmentPayload_(scope),
    chapterAnalytics: wtcTeacher25BClassChapterAnalytics_(scope)
  };
}

function teacherGetAttentionStudents(d) {
  var scope = wtcTeacher25BBuildScope_(d || {});
  return {
    success: true,
    phase: '2.5B',
    mode: 'READ_ONLY',
    attentionStudents: wtcTeacher25BStudentSummaries_(scope).filter(function(student) { return student.needsAttention; })
  };
}

function wtcTeacher25BBuildScope_(request) {
  var teacher = wtcTeacher25BRequireTeacher_(request);
  var contentKey = WTC_BACKEND.WORKBOOK_KEYS.CONTENT;
  var studentsAll = WTC_WorkbookRepository.readRows(contentKey, 'STUDENT_MASTER');
  var subjectsAll = WTC_WorkbookRepository.readRows(contentKey, 'SUBJECT_MASTER');
  var chaptersAll = WTC_WorkbookRepository.readRows(contentKey, 'CHAPTER_MASTER');
  var resultsAll = WTC_WorkbookRepository.readRows(contentKey, 'TEST_RESULTS');
  var progressAll = WTC_WorkbookRepository.readRows(contentKey, 'PROGRESS_TRACKER');
  var accessAll = WTC_WorkbookRepository.readRows(contentKey, 'ACCESS_LOGS');

  var classTokens = wtcTeacher25BTokens_(teacher.className);
  var subjectTokens = wtcTeacher25BTokens_(teacher.subject);
  var boardTokens = wtcTeacher25BTokens_(teacher.board);
  var mediumTokens = wtcTeacher25BTokens_(teacher.medium);
  var warnings = [];

  if (!classTokens.length) warnings.push('No className is assigned in TEACHER_MASTER. Add the teacher class assignment before student analytics can be shown.');
  if (!subjectTokens.length) warnings.push('No subject is assigned in TEACHER_MASTER. Subject analytics remain hidden until a subject assignment is added.');

  var students = classTokens.length ? studentsAll.filter(function(student) {
    if (classTokens.indexOf(wtcTeacher25BNorm_(student.className)) < 0) return false;
    if (boardTokens.length && boardTokens.indexOf(wtcTeacher25BNorm_(student.board)) < 0) return false;
    if (mediumTokens.length && mediumTokens.indexOf(wtcTeacher25BNorm_(student.medium)) < 0) return false;
    return true;
  }) : [];

  var subjects = subjectsAll.filter(function(subject) {
    if (!wtcTeacher25BActive_(subject)) return false;
    var id = wtcTeacher25BNorm_(subject.subjectId);
    var name = wtcTeacher25BNorm_(subject.subjectName);
    var matched = subjectTokens.some(function(token) { return token === id || token === name; });
    if (!matched) return false;
    if (classTokens.length && subject.className && classTokens.indexOf(wtcTeacher25BNorm_(subject.className)) < 0) return false;
    if (boardTokens.length && subject.board && boardTokens.indexOf(wtcTeacher25BNorm_(subject.board)) < 0) return false;
    if (mediumTokens.length && subject.medium && mediumTokens.indexOf(wtcTeacher25BNorm_(subject.medium)) < 0) return false;
    return true;
  });

  var subjectIds = wtcTeacher25BUnique_(subjects.map(function(subject) { return wtcTeacher25BNorm_(subject.subjectId); }).filter(Boolean));
  if (subjectTokens.length && !subjectIds.length) {
    warnings.push('The TEACHER_MASTER subject value does not match an active SUBJECT_MASTER subject ID or name for the assigned class. Unrelated analytics remain hidden.');
  }

  var chapters = chaptersAll.filter(function(chapter) {
    if (!wtcTeacher25BActive_(chapter)) return false;
    if (subjectIds.indexOf(wtcTeacher25BNorm_(chapter.subjectId)) < 0) return false;
    if (classTokens.length && chapter.className && classTokens.indexOf(wtcTeacher25BNorm_(chapter.className)) < 0) return false;
    if (boardTokens.length && chapter.board && boardTokens.indexOf(wtcTeacher25BNorm_(chapter.board)) < 0) return false;
    if (mediumTokens.length && chapter.medium && mediumTokens.indexOf(wtcTeacher25BNorm_(chapter.medium)) < 0) return false;
    return true;
  });

  chapters.sort(function(a, b) {
    var ao = Number(a.sortOrder || a.chapterNo || 9999);
    var bo = Number(b.sortOrder || b.chapterNo || 9999);
    if (ao !== bo) return ao - bo;
    return String(a.chapterName || '').localeCompare(String(b.chapterName || ''));
  });

  var studentMap = {};
  var studentMobileMap = {};
  students.forEach(function(student) {
    studentMap[wtcTeacher25BNorm_(student.studentId)] = student;
    var mobileKey = wtcTeacher25BDigits_(student.mobile);
    if (mobileKey) studentMobileMap[mobileKey] = student;
  });

  var subjectMap = {};
  subjectsAll.forEach(function(subject) { subjectMap[wtcTeacher25BNorm_(subject.subjectId)] = subject; });
  var chapterMap = {};
  chaptersAll.forEach(function(chapter) { chapterMap[wtcTeacher25BNorm_(chapter.chapterId)] = chapter; });
  var chapterIds = wtcTeacher25BUnique_(chapters.map(function(chapter) { return wtcTeacher25BNorm_(chapter.chapterId); }).filter(Boolean));

  var results = subjectIds.length ? resultsAll.filter(function(result) {
    var studentId = wtcTeacher25BNorm_(result.studentId || result.userId);
    if (!studentMap[studentId]) return false;
    var chapterId = wtcTeacher25BNorm_(result.chapterId);
    if (chapterId && chapterIds.indexOf(chapterId) >= 0) return true;
    // A known chapter outside the verified scope must never be included.
    if (chapterId && chapterMap[chapterId]) return false;
    // Compatibility only for historical rows without a resolvable chapter ID.
    var resultSubject = wtcTeacher25BNorm_(result.subjectId || result.subjectName || result.subject);
    return subjectTokens.indexOf(resultSubject) >= 0 || subjectIds.indexOf(resultSubject) >= 0;
  }) : [];

  results.sort(function(a, b) { return wtcTeacher25BTime_(b.createdAt || b.timestamp || b.submittedAt) - wtcTeacher25BTime_(a.createdAt || a.timestamp || a.submittedAt); });

  var progress = progressAll.filter(function(row) {
    var studentId = wtcTeacher25BNorm_(row.studentId || row.userId);
    if (!studentMap[studentId]) return false;
    var chapterId = wtcTeacher25BNorm_(row.chapterId);
    if (!chapterId) return true;
    return chapterIds.indexOf(chapterId) >= 0;
  });

  var access = accessAll.filter(function(row) {
    var studentId = wtcTeacher25BNorm_(row.studentId || row.userId || row.id);
    if (studentId && studentMap[studentId]) return true;
    var mobile = wtcTeacher25BDigits_(row.mobile || row.userMobile);
    return !!(mobile && studentMobileMap[mobile]);
  });

  return {
    teacher: teacher,
    students: students,
    subjects: subjects,
    chapters: chapters,
    results: results,
    progress: progress,
    access: access,
    studentMap: studentMap,
    studentMobileMap: studentMobileMap,
    subjectMap: subjectMap,
    chapterMap: chapterMap,
    classTokens: classTokens,
    subjectTokens: subjectTokens,
    subjectIds: subjectIds,
    chapterIds: chapterIds,
    boardTokens: boardTokens,
    mediumTokens: mediumTokens,
    warnings: warnings
  };
}

function wtcTeacher25BStudentReportPayload_(scope, student) {
  var studentId = wtcTeacher25BNorm_(student.studentId);
  var records = scope.results.filter(function(result) { return wtcTeacher25BNorm_(result.studentId || result.userId) === studentId; });
  var resultPayload = wtcTeacher25BResultPayload_(scope, records.slice(0, WTC_TEACHER_25B.MAX_STUDENT_HISTORY));
  var chapterPerformance = wtcTeacher25BStudentChapterPerformance_(scope, student, records);
  var summary = wtcTeacher25BStudentSummary_(scope, student, records, chapterPerformance);

  return {
    success: true,
    phase: '2.5B',
    mode: 'READ_ONLY',
    student: {
      studentId: student.studentId || '',
      name: student.name || student.studentName || 'Student',
      mobileMasked: wtcTeacher25BMaskMobile_(student.mobile),
      board: student.board || '',
      className: student.className || '',
      medium: student.medium || '',
      status: student.status || 'Active',
      studentType: student.studentType || '',
      createdAt: student.createdAt || '',
      updatedAt: student.updatedAt || ''
    },
    assignment: wtcTeacher25BAssignmentPayload_(scope),
    summary: summary,
    chapterPerformance: chapterPerformance,
    testHistory: resultPayload,
    weakChapters: chapterPerformance.filter(function(item) { return item.status === 'Critical' || item.status === 'Needs Attention'; })
  };
}

function wtcTeacher25BStudentSummaries_(scope) {
  var resultsByStudent = {};
  scope.results.forEach(function(result) {
    var key = wtcTeacher25BNorm_(result.studentId || result.userId);
    if (!resultsByStudent[key]) resultsByStudent[key] = [];
    resultsByStudent[key].push(result);
  });

  var payload = scope.students.map(function(student) {
    var studentId = wtcTeacher25BNorm_(student.studentId);
    var records = resultsByStudent[studentId] || [];
    var chapterPerformance = wtcTeacher25BStudentChapterPerformance_(scope, student, records);
    return wtcTeacher25BStudentSummary_(scope, student, records, chapterPerformance);
  });

  payload.sort(function(a, b) {
    if (a.needsAttention !== b.needsAttention) return a.needsAttention ? -1 : 1;
    if (a.statusRank !== b.statusRank) return a.statusRank - b.statusRank;
    return String(a.name || '').localeCompare(String(b.name || ''));
  });
  return payload;
}

function wtcTeacher25BStudentSummary_(scope, student, records, chapterPerformance) {
  var percentages = records.map(wtcTeacher25BPercent_).filter(wtcTeacher25BNotNull_);
  var averagePercent = percentages.length ? wtcTeacher25BRound_(wtcTeacher25BSum_(percentages) / percentages.length) : 0;
  var bestPercent = percentages.length ? wtcTeacher25BRound_(Math.max.apply(null, percentages)) : 0;
  var latestPercent = records.length ? wtcTeacher25BRound_(wtcTeacher25BPercent_(records[0]) || 0) : 0;
  var trend = wtcTeacher25BTrend_(records);
  var lastActivityAt = wtcTeacher25BLastActivity_(scope, student, records);
  var daysSinceActivity = wtcTeacher25BDaysSince_(lastActivityAt);
  var status = wtcTeacher25BPerformanceStatus_(records.length, averagePercent);
  var attentionReasons = [];

  if (!records.length) attentionReasons.push('No recorded test attempt');
  if (records.length && averagePercent < WTC_TEACHER_25B.ATTENTION_PERCENT) attentionReasons.push('Average below ' + WTC_TEACHER_25B.ATTENTION_PERCENT + '%');
  if (trend === 'Declining') attentionReasons.push('Recent performance is declining');
  if (daysSinceActivity !== null && daysSinceActivity > WTC_TEACHER_25B.INACTIVE_DAYS) attentionReasons.push('No recent activity for ' + daysSinceActivity + ' days');
  if (chapterPerformance.some(function(item) { return item.repeatedLow; })) attentionReasons.push('Repeated low score in a chapter');

  var completed = chapterPerformance.filter(function(item) { return item.completionState === 'Completed'; }).length;
  var inProgress = chapterPerformance.filter(function(item) { return item.completionState === 'In Progress'; }).length;
  var overallProgress = scope.chapters.length ? wtcTeacher25BRound_(wtcTeacher25BSum_(chapterPerformance.map(function(item) { return item.progressPercent; })) / scope.chapters.length) : 0;

  return {
    studentId: student.studentId || '',
    name: student.name || student.studentName || 'Student',
    mobileMasked: wtcTeacher25BMaskMobile_(student.mobile),
    board: student.board || '',
    className: student.className || '',
    medium: student.medium || '',
    status: student.status || 'Active',
    studentType: student.studentType || '',
    attemptCount: records.length,
    averagePercent: averagePercent,
    bestPercent: bestPercent,
    latestPercent: latestPercent,
    progressPercent: overallProgress,
    completedChapters: completed,
    inProgressChapters: inProgress,
    notStartedChapters: Math.max(0, scope.chapters.length - completed - inProgress),
    weakChapterCount: chapterPerformance.filter(function(item) { return item.status === 'Critical' || item.status === 'Needs Attention'; }).length,
    lastAttemptAt: records.length ? wtcTeacher25BDateValue_(records[0]) : '',
    lastActivityAt: lastActivityAt,
    daysSinceActivity: daysSinceActivity,
    performanceStatus: status.label,
    statusClass: status.key,
    statusRank: status.rank,
    trend: trend,
    needsAttention: attentionReasons.length > 0,
    attentionReason: attentionReasons[0] || '',
    attentionReasons: attentionReasons
  };
}

function wtcTeacher25BStudentChapterPerformance_(scope, student, records) {
  var studentId = wtcTeacher25BNorm_(student.studentId);
  var resultsByChapter = {};
  records.forEach(function(result) {
    var chapterId = wtcTeacher25BNorm_(result.chapterId);
    if (!resultsByChapter[chapterId]) resultsByChapter[chapterId] = [];
    resultsByChapter[chapterId].push(result);
  });

  var progressIndex = wtcTeacher25BProgressIndex_(scope.progress, studentId);
  return scope.chapters.map(function(chapter) {
    var chapterId = wtcTeacher25BNorm_(chapter.chapterId);
    var chapterResults = resultsByChapter[chapterId] || [];
    var percentages = chapterResults.map(wtcTeacher25BPercent_).filter(wtcTeacher25BNotNull_);
    var average = percentages.length ? wtcTeacher25BRound_(wtcTeacher25BSum_(percentages) / percentages.length) : 0;
    var best = percentages.length ? wtcTeacher25BRound_(Math.max.apply(null, percentages)) : 0;
    var latest = chapterResults.length ? wtcTeacher25BRound_(wtcTeacher25BPercent_(chapterResults[0]) || 0) : 0;
    var progressRow = progressIndex[chapterId] || {};
    var progressPercent = wtcTeacher25BProgressPercent_(progressRow);
    var completionState = progressPercent >= 100 || wtcTeacher25BNorm_(progressRow.status || progressRow.progressStatus) === 'completed'
      ? 'Completed'
      : (progressPercent > 0 || chapterResults.length ? 'In Progress' : 'Not Started');
    var status = wtcTeacher25BPerformanceStatus_(chapterResults.length, average);

    return {
      chapterId: chapter.chapterId || '',
      chapterNo: chapter.chapterNo || chapter.sortOrder || '',
      chapterName: chapter.chapterName || 'Chapter',
      subjectId: chapter.subjectId || '',
      attemptCount: chapterResults.length,
      averagePercent: average,
      bestPercent: best,
      latestPercent: latest,
      progressPercent: progressPercent,
      completionState: completionState,
      performanceStatus: status.label,
      status: status.label,
      statusClass: status.key,
      trend: wtcTeacher25BTrend_(chapterResults),
      repeatedLow: wtcTeacher25BRepeatedLow_(chapterResults),
      lastAttemptAt: chapterResults.length ? wtcTeacher25BDateValue_(chapterResults[0]) : ''
    };
  });
}

function wtcTeacher25BClassChapterAnalytics_(scope) {
  var progressByStudent = {};
  scope.students.forEach(function(student) {
    var id = wtcTeacher25BNorm_(student.studentId);
    progressByStudent[id] = wtcTeacher25BProgressIndex_(scope.progress, id);
  });

  return scope.chapters.map(function(chapter) {
    var chapterId = wtcTeacher25BNorm_(chapter.chapterId);
    var chapterResults = scope.results.filter(function(result) { return wtcTeacher25BNorm_(result.chapterId) === chapterId; });
    var percentages = chapterResults.map(wtcTeacher25BPercent_).filter(wtcTeacher25BNotNull_);
    var studentAttempts = {};
    var studentPercentages = {};
    chapterResults.forEach(function(result) {
      var studentId = wtcTeacher25BNorm_(result.studentId || result.userId);
      studentAttempts[studentId] = true;
      if (!studentPercentages[studentId]) studentPercentages[studentId] = [];
      var percent = wtcTeacher25BPercent_(result);
      if (percent !== null) studentPercentages[studentId].push(percent);
    });

    var progressValues = [];
    var completedStudents = 0;
    scope.students.forEach(function(student) {
      var studentId = wtcTeacher25BNorm_(student.studentId);
      var progressRow = (progressByStudent[studentId] || {})[chapterId] || {};
      var progressPercent = wtcTeacher25BProgressPercent_(progressRow);
      progressValues.push(progressPercent);
      if (progressPercent >= 100 || wtcTeacher25BNorm_(progressRow.status || progressRow.progressStatus) === 'completed') completedStudents += 1;
    });

    var average = percentages.length ? wtcTeacher25BRound_(wtcTeacher25BSum_(percentages) / percentages.length) : 0;
    var status = wtcTeacher25BPerformanceStatus_(chapterResults.length, average);
    var weakStudents = Object.keys(studentPercentages).filter(function(studentId) {
      var values = studentPercentages[studentId];
      return values.length && (wtcTeacher25BSum_(values) / values.length) < WTC_TEACHER_25B.ATTENTION_PERCENT;
    }).length;
    var attemptedStudents = Object.keys(studentAttempts).length;

    return {
      chapterId: chapter.chapterId || '',
      chapterNo: chapter.chapterNo || chapter.sortOrder || '',
      chapterName: chapter.chapterName || 'Chapter',
      subjectId: chapter.subjectId || '',
      attemptCount: chapterResults.length,
      attemptedStudents: attemptedStudents,
      noAttemptStudents: Math.max(0, scope.students.length - attemptedStudents),
      weakStudents: weakStudents,
      completedStudents: completedStudents,
      averageProgress: progressValues.length ? wtcTeacher25BRound_(wtcTeacher25BSum_(progressValues) / progressValues.length) : 0,
      averagePercent: average,
      bestPercent: percentages.length ? wtcTeacher25BRound_(Math.max.apply(null, percentages)) : 0,
      latestAttemptAt: chapterResults.length ? wtcTeacher25BDateValue_(chapterResults[0]) : '',
      performanceStatus: status.label,
      statusClass: status.key
    };
  });
}

function wtcTeacher25BResultPayload_(scope, rows) {
  var chronological = (rows || []).slice().sort(function(a, b) { return wtcTeacher25BTime_(wtcTeacher25BDateValue_(a)) - wtcTeacher25BTime_(wtcTeacher25BDateValue_(b)); });
  var counters = {};
  var attemptNumbers = {};
  chronological.forEach(function(result) {
    var key = wtcTeacher25BResultIdentity_(result);
    counters[key] = (counters[key] || 0) + 1;
    attemptNumbers[wtcTeacher25BResultRowKey_(result)] = counters[key];
  });

  return (rows || []).map(function(result, index) {
    var student = scope.studentMap[wtcTeacher25BNorm_(result.studentId || result.userId)] || {};
    var chapter = scope.chapterMap[wtcTeacher25BNorm_(result.chapterId)] || {};
    var subject = scope.subjectMap[wtcTeacher25BNorm_(chapter.subjectId || result.subjectId)] || {};
    return {
      resultId: result.resultId || result.attemptId || ('RESULT-' + index),
      studentId: result.studentId || result.userId || '',
      studentName: student.name || student.studentName || result.name || result.studentName || 'Student',
      chapterId: result.chapterId || '',
      chapterNo: chapter.chapterNo || chapter.sortOrder || '',
      chapterName: chapter.chapterName || result.chapterName || '',
      subjectId: chapter.subjectId || result.subjectId || '',
      subjectName: subject.subjectName || result.subjectName || result.subject || '',
      testId: result.testId || '',
      testTitle: result.testTitle || result.title || '',
      testType: result.testType || result.assessmentType || '',
      topic: result.topic || '',
      score: result.score === undefined ? '' : result.score,
      total: result.total === undefined ? (result.totalMarks === undefined ? '' : result.totalMarks) : result.total,
      percent: wtcTeacher25BRound_(wtcTeacher25BPercent_(result) || 0),
      attemptNumber: attemptNumbers[wtcTeacher25BResultRowKey_(result)] || 1,
      createdAt: wtcTeacher25BDateValue_(result)
    };
  });
}

function wtcTeacher25BRequireTeacher_(request) {
  var rows = WTC_WorkbookRepository.readRows(WTC_BACKEND.WORKBOOK_KEYS.CONTENT, 'TEACHER_MASTER');
  var teacherId = wtcTeacher25BNorm_(request.teacherId || request.userId || request.id);
  var mobile = wtcTeacher25BDigits_(request.mobile);
  if (!teacherId || !mobile) throw new Error('Teacher session identity is incomplete. Please log out and log in again.');

  var teacher = rows.find(function(row) {
    return wtcTeacher25BNorm_(row.teacherId) === teacherId && wtcTeacher25BDigits_(row.mobile) === mobile;
  });
  if (!teacher) throw new Error('Teacher account could not be verified.');
  if (!wtcTeacher25BActive_(teacher)) throw new Error('Teacher account is not active.');
  return teacher;
}

function wtcTeacher25BRequireAssignedStudent_(scope, studentId) {
  var id = wtcTeacher25BNorm_(studentId);
  if (!id) throw new Error('Student ID is required.');
  var student = scope.studentMap[id];
  if (!student) throw new Error('This student is outside the verified Teacher assignment scope.');
  return student;
}

function wtcTeacher25BTeacherPayload_(teacher) {
  return {
    teacherId: teacher.teacherId || '',
    name: teacher.name || teacher.teacherName || 'Teacher',
    mobileMasked: wtcTeacher25BMaskMobile_(teacher.mobile),
    subject: teacher.subject || '',
    className: teacher.className || '',
    board: teacher.board || '',
    medium: teacher.medium || '',
    status: teacher.status || 'Active',
    role: 'Teacher',
    createdAt: teacher.createdAt || '',
    updatedAt: teacher.updatedAt || ''
  };
}

function wtcTeacher25BAssignmentPayload_(scope) {
  return {
    classLabel: wtcTeacher25BDisplayTokens_(scope.teacher.className),
    subjectLabel: wtcTeacher25BDisplayTokens_(scope.teacher.subject),
    boardLabel: wtcTeacher25BDisplayTokens_(scope.teacher.board),
    mediumLabel: wtcTeacher25BDisplayTokens_(scope.teacher.medium),
    classReady: scope.classTokens.length > 0,
    subjectReady: scope.subjectIds.length > 0,
    subjectIds: scope.subjectIds,
    chapterCount: scope.chapters.length,
    boards: wtcTeacher25BUnique_(scope.students.map(function(student) { return String(student.board || '').trim(); }).filter(Boolean)).sort(),
    media: wtcTeacher25BUnique_(scope.students.map(function(student) { return String(student.medium || '').trim(); }).filter(Boolean)).sort(),
    availableProfiles: wtcTeacher25BProfiles_(scope.students)
  };
}

function wtcTeacher25BProgressIndex_(rows, studentId) {
  var index = {};
  (rows || []).forEach(function(row) {
    if (wtcTeacher25BNorm_(row.studentId || row.userId) !== studentId) return;
    var chapterId = wtcTeacher25BNorm_(row.chapterId);
    if (!chapterId) return;
    var current = index[chapterId];
    if (!current || wtcTeacher25BTime_(row.updatedAt || row.createdAt || row.timestamp) >= wtcTeacher25BTime_(current.updatedAt || current.createdAt || current.timestamp)) index[chapterId] = row;
  });
  return index;
}

function wtcTeacher25BProgressPercent_(row) {
  var values = [row.percent, row.progressPercent, row.completionPercent, row.progress];
  for (var i = 0; i < values.length; i += 1) {
    if (values[i] === undefined || values[i] === '') continue;
    var number = Number(String(values[i]).replace('%', '').trim());
    if (isFinite(number)) return Math.max(0, Math.min(100, wtcTeacher25BRound_(number)));
  }
  return 0;
}

function wtcTeacher25BLastActivity_(scope, student, records) {
  var studentId = wtcTeacher25BNorm_(student.studentId);
  var mobile = wtcTeacher25BDigits_(student.mobile);
  var candidates = [];
  (records || []).forEach(function(row) { candidates.push(wtcTeacher25BDateValue_(row)); });
  scope.progress.forEach(function(row) {
    if (wtcTeacher25BNorm_(row.studentId || row.userId) === studentId) candidates.push(row.updatedAt || row.createdAt || row.timestamp || '');
  });
  scope.access.forEach(function(row) {
    var rowStudent = wtcTeacher25BNorm_(row.studentId || row.userId || row.id);
    var rowMobile = wtcTeacher25BDigits_(row.mobile || row.userMobile);
    if ((rowStudent && rowStudent === studentId) || (mobile && rowMobile === mobile)) candidates.push(row.createdAt || row.timestamp || row.accessedAt || row.date || '');
  });
  candidates = candidates.filter(Boolean).sort(function(a, b) { return wtcTeacher25BTime_(b) - wtcTeacher25BTime_(a); });
  return candidates.length ? candidates[0] : '';
}

function wtcTeacher25BPerformanceStatus_(attemptCount, average) {
  if (!attemptCount) return { key: 'no-activity', label: 'No Activity', rank: 0 };
  if (average < WTC_TEACHER_25B.CRITICAL_PERCENT) return { key: 'critical', label: 'Critical', rank: 1 };
  if (average < WTC_TEACHER_25B.ATTENTION_PERCENT) return { key: 'attention', label: 'Needs Attention', rank: 2 };
  if (average < WTC_TEACHER_25B.EXCELLENT_PERCENT) return { key: 'good', label: 'Good', rank: 3 };
  return { key: 'excellent', label: 'Excellent', rank: 4 };
}

function wtcTeacher25BTrend_(records) {
  var values = (records || []).map(wtcTeacher25BPercent_).filter(wtcTeacher25BNotNull_);
  if (values.length < 4) return 'Not enough data';
  var recent = values.slice(0, Math.min(3, values.length));
  var previous = values.slice(recent.length, recent.length + Math.min(3, values.length - recent.length));
  if (!previous.length) return 'Not enough data';
  var recentAverage = wtcTeacher25BSum_(recent) / recent.length;
  var previousAverage = wtcTeacher25BSum_(previous) / previous.length;
  var difference = recentAverage - previousAverage;
  if (difference >= 8) return 'Improving';
  if (difference <= -8) return 'Declining';
  return 'Stable';
}

function wtcTeacher25BRepeatedLow_(records) {
  var values = (records || []).slice(0, 3).map(wtcTeacher25BPercent_).filter(wtcTeacher25BNotNull_);
  if (values.length < 3) return false;
  if (!values.every(function(value) { return value < WTC_TEACHER_25B.ATTENTION_PERCENT; })) return false;
  return values[0] <= values[values.length - 1] + 5;
}

function wtcTeacher25BPercent_(row) {
  var raw = row.percent;
  if (raw === undefined || raw === '') raw = row.percentage;
  if (raw !== undefined && raw !== '') {
    var normalized = Number(String(raw).replace('%', '').trim());
    if (isFinite(normalized)) return normalized;
  }
  var score = Number(row.score);
  var total = Number(row.total === undefined || row.total === '' ? row.totalMarks : row.total);
  if (isFinite(score) && isFinite(total) && total > 0) return (score / total) * 100;
  return null;
}

function wtcTeacher25BResultIdentity_(row) {
  return [row.studentId || row.userId, row.testId, row.chapterId, row.testType || row.assessmentType, row.testTitle || row.title].map(wtcTeacher25BNorm_).join('|');
}

function wtcTeacher25BResultRowKey_(row) {
  return [row.resultId || row.attemptId, row.studentId || row.userId, row.testId, row.chapterId, wtcTeacher25BDateValue_(row), row.score, row.total || row.totalMarks].join('|');
}

function wtcTeacher25BDateValue_(row) {
  return row.createdAt || row.timestamp || row.submittedAt || row.updatedAt || row.date || '';
}

function wtcTeacher25BDaysSince_(value) {
  if (!value) return null;
  var time = wtcTeacher25BTime_(value);
  if (!time) return null;
  return Math.max(0, Math.floor((new Date().getTime() - time) / 86400000));
}

function wtcTeacher25BTime_(value) {
  if (!value) return 0;
  if (Object.prototype.toString.call(value) === '[object Date]') return value.getTime();
  var raw = String(value);
  var parsed = new Date(raw);
  if (isNaN(parsed.getTime()) && /^\d{4}-\d{2}-\d{2} /.test(raw)) parsed = new Date(raw.replace(' ', 'T'));
  return isNaN(parsed.getTime()) ? 0 : parsed.getTime();
}

function wtcTeacher25BProfiles_(students) {
  var seen = {};
  var profiles = [];
  students.forEach(function(student) {
    var board = String(student.board || '').trim();
    var medium = String(student.medium || '').trim();
    var key = wtcTeacher25BNorm_(board + '|' + medium);
    if (!key || seen[key]) return;
    seen[key] = true;
    profiles.push({ board: board, medium: medium });
  });
  profiles.sort(function(a, b) { return String(a.board + a.medium).localeCompare(String(b.board + b.medium)); });
  return profiles;
}

function wtcTeacher25BTokens_(value) {
  return wtcTeacher25BUnique_(String(value || '').split(/[,;|]+/).map(wtcTeacher25BNorm_).filter(Boolean));
}

function wtcTeacher25BDisplayTokens_(value) {
  var values = String(value || '').split(/[,;|]+/).map(function(item) { return item.trim(); }).filter(Boolean);
  return values.length ? values.join(', ') : 'Not assigned';
}

function wtcTeacher25BActive_(row) {
  var status = wtcTeacher25BNorm_(row.status || row.isActive || 'Active');
  return ['blocked', 'inactive', 'disabled', 'no', 'false', 'rejected'].indexOf(status) < 0;
}

function wtcTeacher25BMaskMobile_(value) {
  var digits = wtcTeacher25BDigits_(value);
  if (!digits) return '';
  return new Array(Math.max(0, digits.length - 4) + 1).join('•') + digits.slice(-4);
}

function wtcTeacher25BDigits_(value) {
  return String(value || '').replace(/\D/g, '');
}

function wtcTeacher25BSum_(values) {
  return (values || []).reduce(function(total, value) { return total + Number(value || 0); }, 0);
}

function wtcTeacher25BRound_(value) {
  var number = Number(value || 0);
  return isFinite(number) ? Math.round(number) : 0;
}

function wtcTeacher25BUnique_(values) {
  var seen = {};
  return (values || []).filter(function(value) {
    var key = String(value || '');
    if (!key || seen[key]) return false;
    seen[key] = true;
    return true;
  });
}

function wtcTeacher25BNotNull_(value) {
  return value !== null;
}

function wtcTeacher25BNorm_(value) {
  return String(value || '').trim().toLowerCase();
}
