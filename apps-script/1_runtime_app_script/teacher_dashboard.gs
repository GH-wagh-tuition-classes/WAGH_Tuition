/* ============================================================================
   WAGH Tuition Classes — Teacher Dashboard Phase 2.5A v1.0
   FILE: teacher_dashboard.gs
   SCOPE: Read-only Teacher Portal foundation

   Reads existing WTC_CONTENT_ENGINE sheets through WTC_WorkbookRepository.
   Creates no Sheet, column, row, migration or content record.
============================================================================ */

function teacherDashboard(d) {
  var request = d || {};
  var teacher = wtcTeacher25ARequireTeacher_(request);
  var contentKey = WTC_BACKEND.WORKBOOK_KEYS.CONTENT;

  var studentsAll = WTC_WorkbookRepository.readRows(contentKey, 'STUDENT_MASTER');
  var subjectsAll = WTC_WorkbookRepository.readRows(contentKey, 'SUBJECT_MASTER');
  var chaptersAll = WTC_WorkbookRepository.readRows(contentKey, 'CHAPTER_MASTER');
  var resultsAll = WTC_WorkbookRepository.readRows(contentKey, 'TEST_RESULTS');
  var progressAll = WTC_WorkbookRepository.readRows(contentKey, 'PROGRESS_TRACKER');

  var classTokens = wtcTeacher25ATokens_(teacher.className);
  var subjectTokens = wtcTeacher25ATokens_(teacher.subject);
  var warnings = [];

  if (!classTokens.length) {
    warnings.push('No className is assigned in TEACHER_MASTER. Add the teacher class assignment before student data can be shown.');
  }
  if (!subjectTokens.length) {
    warnings.push('No subject is assigned in TEACHER_MASTER. Result analytics remain hidden until a subject assignment is added.');
  }

  var assignedStudents = classTokens.length ? studentsAll.filter(function(student) {
    return classTokens.indexOf(wtcTeacher25ANorm_(student.className)) >= 0;
  }) : [];

  var subjectRows = subjectsAll.filter(function(subject) {
    if (!wtcTeacher25AActive_(subject)) return false;
    var subjectId = wtcTeacher25ANorm_(subject.subjectId);
    var subjectName = wtcTeacher25ANorm_(subject.subjectName);
    var subjectMatch = subjectTokens.some(function(token) {
      return token === subjectId || token === subjectName;
    });
    if (!subjectMatch) return false;
    if (!classTokens.length) return true;
    return !subject.className || classTokens.indexOf(wtcTeacher25ANorm_(subject.className)) >= 0;
  });

  var subjectIds = wtcTeacher25AUnique_(subjectRows.map(function(subject) {
    return wtcTeacher25ANorm_(subject.subjectId);
  }).filter(Boolean));

  if (subjectTokens.length && !subjectIds.length) {
    warnings.push('The TEACHER_MASTER subject value does not match an active SUBJECT_MASTER subject ID or name for the assigned class. Result analytics are hidden to avoid showing another subject.');
  }

  var chapterRows = chaptersAll.filter(function(chapter) {
    if (!wtcTeacher25AActive_(chapter)) return false;
    if (subjectIds.indexOf(wtcTeacher25ANorm_(chapter.subjectId)) < 0) return false;
    if (!classTokens.length) return true;
    return !chapter.className || classTokens.indexOf(wtcTeacher25ANorm_(chapter.className)) >= 0;
  });
  var chapterIds = wtcTeacher25AUnique_(chapterRows.map(function(chapter) {
    return wtcTeacher25ANorm_(chapter.chapterId);
  }).filter(Boolean));

  var studentMap = {};
  assignedStudents.forEach(function(student) {
    studentMap[wtcTeacher25ANorm_(student.studentId)] = student;
  });

  var subjectMap = {};
  subjectsAll.forEach(function(subject) {
    subjectMap[wtcTeacher25ANorm_(subject.subjectId)] = subject;
  });

  var chapterMap = {};
  chaptersAll.forEach(function(chapter) {
    chapterMap[wtcTeacher25ANorm_(chapter.chapterId)] = chapter;
  });

  var matchingResults = subjectIds.length ? resultsAll.filter(function(result) {
    var studentId = wtcTeacher25ANorm_(result.studentId);
    var chapterId = wtcTeacher25ANorm_(result.chapterId);
    if (!studentMap[studentId]) return false;
    if (chapterIds.length && chapterIds.indexOf(chapterId) >= 0) return true;

    // Compatibility for historical result rows that include subject fields.
    var resultSubject = wtcTeacher25ANorm_(result.subjectId || result.subjectName || result.subject);
    return subjectTokens.indexOf(resultSubject) >= 0 || subjectIds.indexOf(resultSubject) >= 0;
  }) : [];

  matchingResults.sort(function(a, b) {
    return String(b.createdAt || b.timestamp || '').localeCompare(String(a.createdAt || a.timestamp || ''));
  });

  var resultsByStudent = {};
  matchingResults.forEach(function(result) {
    var key = wtcTeacher25ANorm_(result.studentId);
    if (!resultsByStudent[key]) resultsByStudent[key] = [];
    resultsByStudent[key].push(result);
  });

  var progressByStudent = wtcTeacher25AProgressIndex_(progressAll, assignedStudents);
  var studentPayload = assignedStudents.map(function(student) {
    var studentId = wtcTeacher25ANorm_(student.studentId);
    var records = resultsByStudent[studentId] || [];
    var percentages = records.map(wtcTeacher25APercent_).filter(function(value) { return value !== null; });
    var averagePercent = percentages.length ? wtcTeacher25ARound_(wtcTeacher25ASum_(percentages) / percentages.length) : 0;
    var bestPercent = percentages.length ? Math.max.apply(null, percentages) : 0;
    var progress = progressByStudent[studentId] || {};
    var noAttempt = records.length === 0;
    var needsAttention = noAttempt || averagePercent < 60;

    return {
      studentId: student.studentId || '',
      name: student.name || student.studentName || 'Student',
      mobileMasked: wtcTeacher25AMaskMobile_(student.mobile),
      board: student.board || '',
      className: student.className || '',
      medium: student.medium || '',
      status: student.status || 'Active',
      studentType: student.studentType || '',
      attemptCount: records.length,
      averagePercent: averagePercent,
      bestPercent: wtcTeacher25ARound_(bestPercent),
      progressPercent: wtcTeacher25ARound_(Number(progress.percent || 0)),
      lastAttemptAt: records.length ? (records[0].createdAt || records[0].timestamp || '') : '',
      needsAttention: needsAttention,
      attentionReason: noAttempt ? 'No recorded attempt' : 'Average below 60%'
    };
  });

  studentPayload.sort(function(a, b) {
    if (a.needsAttention !== b.needsAttention) return a.needsAttention ? -1 : 1;
    return String(a.name || '').localeCompare(String(b.name || ''));
  });

  var recentResults = matchingResults.slice(0, 30).map(function(result) {
    var student = studentMap[wtcTeacher25ANorm_(result.studentId)] || {};
    var chapter = chapterMap[wtcTeacher25ANorm_(result.chapterId)] || {};
    var subject = subjectMap[wtcTeacher25ANorm_(chapter.subjectId)] || {};
    return {
      resultId: result.resultId || result.attemptId || '',
      studentId: result.studentId || '',
      studentName: student.name || result.name || result.studentName || 'Student',
      chapterId: result.chapterId || '',
      chapterName: chapter.chapterName || result.chapterName || '',
      subjectId: chapter.subjectId || result.subjectId || '',
      subjectName: subject.subjectName || result.subjectName || result.subject || '',
      testId: result.testId || '',
      testTitle: result.testTitle || '',
      testType: result.testType || '',
      topic: result.topic || '',
      score: result.score === undefined ? '' : result.score,
      total: result.total === undefined ? '' : result.total,
      percent: wtcTeacher25ARound_(wtcTeacher25APercent_(result) || 0),
      createdAt: result.createdAt || result.timestamp || ''
    };
  });

  var resultPercentages = matchingResults.map(wtcTeacher25APercent_).filter(function(value) { return value !== null; });
  var activeStudentCount = assignedStudents.filter(wtcTeacher25AActive_).length;
  var needsAttentionCount = studentPayload.filter(function(student) { return student.needsAttention; }).length;
  var profiles = wtcTeacher25AProfiles_(assignedStudents);

  return {
    success: true,
    phase: '2.5A',
    mode: 'READ_ONLY',
    teacher: {
      teacherId: teacher.teacherId || '',
      name: teacher.name || teacher.teacherName || 'Teacher',
      mobileMasked: wtcTeacher25AMaskMobile_(teacher.mobile),
      subject: teacher.subject || '',
      className: teacher.className || '',
      status: teacher.status || 'Active',
      role: 'Teacher',
      createdAt: teacher.createdAt || '',
      updatedAt: teacher.updatedAt || ''
    },
    assignment: {
      classLabel: wtcTeacher25ADisplayTokens_(teacher.className),
      subjectLabel: wtcTeacher25ADisplayTokens_(teacher.subject),
      classReady: classTokens.length > 0,
      subjectReady: subjectIds.length > 0,
      subjectIds: subjectIds,
      chapterCount: chapterRows.length,
      boards: wtcTeacher25AUnique_(assignedStudents.map(function(student) { return String(student.board || '').trim(); }).filter(Boolean)).sort(),
      media: wtcTeacher25AUnique_(assignedStudents.map(function(student) { return String(student.medium || '').trim(); }).filter(Boolean)).sort(),
      availableProfiles: profiles
    },
    overview: {
      assignedStudents: assignedStudents.length,
      activeStudents: activeStudentCount,
      totalAttempts: matchingResults.length,
      averagePercent: resultPercentages.length ? wtcTeacher25ARound_(wtcTeacher25ASum_(resultPercentages) / resultPercentages.length) : 0,
      needsAttention: needsAttentionCount
    },
    students: studentPayload,
    recentResults: recentResults,
    assignmentWarnings: warnings
  };
}

function wtcTeacher25ARequireTeacher_(request) {
  var rows = WTC_WorkbookRepository.readRows(WTC_BACKEND.WORKBOOK_KEYS.CONTENT, 'TEACHER_MASTER');
  var teacherId = wtcTeacher25ANorm_(request.teacherId || request.userId || request.id);
  var mobile = wtcTeacher25ANorm_(request.mobile);

  if (!teacherId || !mobile) throw new Error('Teacher session identity is incomplete. Please log out and log in again.');

  var teacher = rows.find(function(row) {
    return wtcTeacher25ANorm_(row.teacherId) === teacherId && wtcTeacher25ANorm_(row.mobile) === mobile;
  });

  if (!teacher) throw new Error('Teacher account could not be verified.');
  if (!wtcTeacher25AActive_(teacher)) throw new Error('Teacher account is not active.');
  return teacher;
}

function wtcTeacher25AProgressIndex_(rows, students) {
  var profiles = {};
  students.forEach(function(student) {
    profiles[wtcTeacher25ANorm_(student.studentId)] = student;
  });

  var index = {};
  rows.forEach(function(row) {
    var studentId = wtcTeacher25ANorm_(row.studentId);
    var student = profiles[studentId];
    if (!student) return;

    var hasProfileColumns = row.board !== undefined || row.className !== undefined || row.medium !== undefined;
    if (hasProfileColumns) {
      if (row.board && wtcTeacher25ANorm_(row.board) !== wtcTeacher25ANorm_(student.board)) return;
      if (row.className && wtcTeacher25ANorm_(row.className) !== wtcTeacher25ANorm_(student.className)) return;
      if (row.medium && wtcTeacher25ANorm_(row.medium) !== wtcTeacher25ANorm_(student.medium)) return;
    }

    var current = index[studentId];
    if (!current || String(row.updatedAt || '').localeCompare(String(current.updatedAt || '')) >= 0) index[studentId] = row;
  });
  return index;
}

function wtcTeacher25AProfiles_(students) {
  var seen = {};
  var profiles = [];
  students.forEach(function(student) {
    var board = String(student.board || '').trim();
    var medium = String(student.medium || '').trim();
    var key = wtcTeacher25ANorm_(board + '|' + medium);
    if (!key || seen[key]) return;
    seen[key] = true;
    profiles.push({ board: board, medium: medium });
  });
  profiles.sort(function(a, b) {
    return String(a.board + a.medium).localeCompare(String(b.board + b.medium));
  });
  return profiles;
}

function wtcTeacher25ATokens_(value) {
  return wtcTeacher25AUnique_(String(value || '')
    .split(/[,;|]+/)
    .map(wtcTeacher25ANorm_)
    .filter(Boolean));
}

function wtcTeacher25ADisplayTokens_(value) {
  var values = String(value || '').split(/[,;|]+/).map(function(item) { return item.trim(); }).filter(Boolean);
  return values.length ? values.join(', ') : 'Not assigned';
}

function wtcTeacher25APercent_(row) {
  var raw = row.percent;
  if (raw === undefined || raw === '') raw = row.percentage;
  if (raw !== undefined && raw !== '') {
    var normalizedPercent = Number(String(raw).replace('%', '').trim());
    if (isFinite(normalizedPercent)) return normalizedPercent;
  }
  var score = Number(row.score);
  var total = Number(row.total);
  if (isFinite(score) && isFinite(total) && total > 0) return (score / total) * 100;
  return null;
}

function wtcTeacher25AActive_(row) {
  var status = wtcTeacher25ANorm_(row.status || row.isActive || 'Active');
  return ['blocked', 'inactive', 'disabled', 'no', 'false', 'rejected'].indexOf(status) < 0;
}

function wtcTeacher25AMaskMobile_(value) {
  var digits = String(value || '').replace(/\D/g, '');
  if (!digits) return '';
  return new Array(Math.max(0, digits.length - 4) + 1).join('•') + digits.slice(-4);
}

function wtcTeacher25ASum_(values) {
  return values.reduce(function(total, value) { return total + Number(value || 0); }, 0);
}

function wtcTeacher25ARound_(value) {
  var number = Number(value || 0);
  return isFinite(number) ? Math.round(number) : 0;
}

function wtcTeacher25AUnique_(values) {
  var seen = {};
  return (values || []).filter(function(value) {
    var key = String(value || '');
    if (!key || seen[key]) return false;
    seen[key] = true;
    return true;
  });
}

function wtcTeacher25ANorm_(value) {
  return String(value || '').trim().toLowerCase();
}
