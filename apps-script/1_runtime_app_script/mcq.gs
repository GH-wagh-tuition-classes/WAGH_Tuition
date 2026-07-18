/******************************************************************************
 WAGH Tuition Classes — MCQ Personalization & Progress Engine v2.0

 Purpose
 - Saves both static and dynamic MCQ attempts through the existing
   saveStaticMCQResult action (backward compatible).
 - Stores question-level evidence for personalization.
 - Builds student progress, topic accuracy, recommendations and gamification.
 - Keeps WTC_CONTENT_ENGINE as the student/runtime source of truth.
******************************************************************************/

function saveStaticMCQResult(d) {
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(10000)) return { success:false, message:'Another result is being saved. Please try again.' };
  try {
  ensureWTCMCQSheets_();

  var createdAt = wtcMcqNow_();
  var studentId = String(d.studentId || '').trim();
  var chapterId = String(d.chapterId || '').trim();
  var subjectId = String(d.subjectId || '').trim();
  var testId = String(d.testId || '').trim();
  var requestedAttemptId = String(d.attemptId || '').trim().replace(/[^A-Za-z0-9_-]/g, '').slice(0, 120);
  var allAttempts = wtcMcqRows_('MCQ_ATTEMPTS');
  if (requestedAttemptId) {
    var existingAttempt = allAttempts.filter(function(row) {
      return String(row.attemptId || '') === requestedAttemptId && String(row.studentId || '') === studentId;
    })[0];
    if (existingAttempt) {
      return {
        success:true, duplicatePrevented:true, attemptId:requestedAttemptId,
        retryCount:Number(existingAttempt.retryCount || 0),
        personalizedMessage:existingAttempt.personalizedMessage || '',
        message:'MCQ progress was already saved.'
      };
    }
  }
  var attemptId = requestedAttemptId || ('MCQATT' + Date.now() + '_' + Math.floor(Math.random() * 1000));
  var details = wtcMcqParseDetails_(d.attemptDetails);
  var priorAttempts = allAttempts.filter(function(row) {
    return String(row.studentId) === studentId && String(row.testId) === testId;
  }).length;
  var retryCount = priorAttempts;

  var correctCount = details.length
    ? details.filter(function(x) { return wtcMcqTruth_(x.isCorrect); }).length
    : Number(d.score || 0);
  var total = Number(d.total || details.length || 0);
  var unansweredCount = details.length
    ? details.filter(function(x) { return !String(x.selectedOption || '').trim(); }).length
    : Number(d.unansweredCount || 0);
  var wrongCount = Math.max(0, total - correctCount - unansweredCount);
  var percent = total ? Math.round((correctCount / total) * 100) : Number(d.percent || 0);
  var earnedMarks = d.earnedMarks !== undefined ? d.earnedMarks : correctCount;
  var totalMarks = d.totalMarks !== undefined ? d.totalMarks : total;
  var message = wtcMcqPersonalMessage_(percent, unansweredCount);

  wtcMcqAppend_('TEST_RESULTS', {
    resultId:'RES' + Date.now(), studentId:studentId, chapterId:chapterId,
    testType:d.testType || 'MCQ Practice', score:correctCount, total:total,
    percent:percent, createdAt:createdAt, testId:testId, subjectId:subjectId
  });

  wtcMcqAppend_('MCQ_ATTEMPTS', {
    attemptId:attemptId, studentId:studentId, name:d.name || '', mobile:d.mobile || '',
    board:d.board || '', className:d.className || '', medium:d.medium || '',
    subjectId:subjectId, subjectName:d.subjectName || '', chapterId:chapterId,
    chapterName:d.chapterName || '', testId:testId, testTitle:d.testTitle || '',
    testType:d.testType || 'MCQ Practice', score:correctCount, total:total,
    percent:percent, earnedMarks:earnedMarks, totalMarks:totalMarks,
    correctCount:correctCount, wrongCount:wrongCount,
    totalTimeSec:Number(d.totalTimeSec || 0), page:d.page || '',
    deviceId:d.deviceId || '', createdAt:createdAt, unansweredCount:unansweredCount,
    retryCount:retryCount, sourceType:d.sourceType || 'Static MCQ',
    personalizedMessage:message
  });

  var detailRows = details.map(function(x, index) {
    return {
      detailId:'MCQDET' + Date.now() + '_' + (index + 1), attemptId:attemptId,
      studentId:studentId, chapterId:chapterId, questionNo:x.questionNo || (index + 1),
      questionId:x.questionId || '', topic:x.topic || 'General',
      difficulty:x.difficulty || '', selectedOption:x.selectedOption || '',
      correctOption:x.correctOption || '',
      isCorrect:wtcMcqTruth_(x.isCorrect) ? 'TRUE' : 'FALSE', marks:x.marks || 1,
      timeTakenSec:Number(x.timeTakenSec || 0), createdAt:createdAt,
      subjectId:subjectId, testId:testId, questionText:x.questionText || '',
      explanationViewed:wtcMcqTruth_(x.explanationViewed) ? 'TRUE' : 'FALSE',
      retryCount:retryCount
    };
  });
  wtcMcqAppendMany_('MCQ_ATTEMPT_DETAILS', detailRows);

  var progress = updateWTCMCQProgress_(studentId, subjectId, chapterId, testId, d.testTitle || '', createdAt);
  updateWTCMCQSkillReport_(studentId, chapterId, createdAt);
  updateWTCMCQGamification_(studentId, percent, createdAt);

  wtcMcqClearReportCache_(studentId, d);
  return {
    success:true, attemptId:attemptId, retryCount:retryCount,
    personalizedMessage:message, progress:progress,
    message:'MCQ progress saved.'
  };
  } finally {
    lock.releaseLock();
  }
}

function getMCQProgressReport(d) {
  ensureWTCMCQSheets_();
  var studentId = String((d && d.studentId) || '').trim();
  if (!studentId) return { success:false, message:'studentId is required.' };
  var forceRefresh = !!(d && (d.forceRefresh === true || String(d.forceRefresh).toLowerCase() === 'true'));
  var profile = wtcMcqProfile_(d || {});
  var reportCache = CacheService.getScriptCache();
  var reportKey = wtcMcqReportCacheKey_(studentId, profile);
  if (!forceRefresh) {
    var cachedReport = reportCache.get(reportKey);
    if (cachedReport) { try { return JSON.parse(cachedReport); } catch (ignore) {} }
  }

  var attempts = wtcMcqRows_('MCQ_ATTEMPTS').filter(function(row) {
    return String(row.studentId) === studentId && wtcMcqProfileMatch_(row, profile);
  });
  var attemptIds = {};
  attempts.forEach(function(row) { attemptIds[String(row.attemptId)] = true; });
  var details = wtcMcqRows_('MCQ_ATTEMPT_DETAILS').filter(function(row) {
    return !!attemptIds[String(row.attemptId)];
  });
  var gamification = wtcMcqRows_('GAMIFICATION_DATA').filter(function(row) {
    return String(row.studentId) === studentId;
  })[0] || { studentId:studentId, xp:0, level:1, badges:'', streak:0 };

  var report = wtcMcqBuildReport_(attempts, details);
  report.progress = {
    studentId:studentId,
    percent:Number(report.summary.overallPercent || 0),
    overallPercent:Number(report.summary.overallPercent || 0),
    averagePercent:Number(report.summary.averagePercent || 0),
    bestPercent:Number(report.summary.bestPercent || 0),
    totalAttempts:Number(report.summary.totalAttempts || 0),
    testsCompleted:Number(report.summary.testsCompleted || 0),
    correctCount:Number(report.summary.totalCorrect || 0),
    questionCount:Number(report.summary.totalQuestions || 0),
    totalTimeSec:Number(report.summary.totalTimeSec || 0),
    board:profile.board, className:profile.className, medium:profile.medium
  };
  report.gamification = gamification;
  var response = Object.assign({ success:true, studentId:studentId }, report);
  try { reportCache.put(reportKey, JSON.stringify(response), 30); } catch (ignore) {}
  return response;
}

/** Run once from the Apps Script editor after installing this file. */
function setupWtcMcqProgressEngine() {
  ensureWTCMCQSheets_(true);
  return 'WTC MCQ Progress Engine v2.0 + Stage 1 performance is ready.';
}

function ensureWTCMCQSheets_(forceRefresh) {
  var schemaCache = CacheService.getScriptCache();
  var schemaKey = 'WTC_MCQ_SCHEMA_READY_V2';
  if (!forceRefresh && schemaCache.get(schemaKey)) return;
  ensureWTCMCQSheet_('TEST_RESULTS', [
    'resultId','studentId','chapterId','testType','score','total','percent','createdAt',
    'testId','subjectId'
  ]);
  ensureWTCMCQSheet_('PROGRESS_TRACKER', [
    'studentId','percent','lastSubjectId','lastChapterId','updatedAt','totalAttempts',
    'testsCompleted','averagePercent','bestPercent','correctCount','questionCount',
    'totalTimeSec','lastTestId','lastTestTitle'
  ]);
  ensureWTCMCQSheet_('MCQ_ATTEMPTS', [
    'attemptId','studentId','name','mobile','board','className','medium','subjectId',
    'subjectName','chapterId','chapterName','testId','testTitle','testType','score',
    'total','percent','earnedMarks','totalMarks','correctCount','wrongCount',
    'totalTimeSec','page','deviceId','createdAt','unansweredCount','retryCount',
    'sourceType','personalizedMessage'
  ]);
  ensureWTCMCQSheet_('MCQ_ATTEMPT_DETAILS', [
    'detailId','attemptId','studentId','chapterId','questionNo','questionId','topic',
    'difficulty','selectedOption','correctOption','isCorrect','marks','timeTakenSec',
    'createdAt','subjectId','testId','questionText','explanationViewed','retryCount'
  ]);
  ensureWTCMCQSheet_('STUDENT_SKILL_REPORT', [
    'studentId','chapterId','topic','attempted','correct','wrong','accuracy',
    'lastUpdated','averageTimeSec','lastScore'
  ]);
  ensureWTCMCQSheet_('GAMIFICATION_DATA', [
    'studentId','xp','level','badges','streak','updatedAt','lastAttemptDate'
  ]);
  schemaCache.put(schemaKey, '1', 21600);
}

function ensureWTCMCQSheet_(sheetName, headers) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(sheetName);
  if (!sh) sh = ss.insertSheet(sheetName);

  var lastColumn = sh.getLastColumn();
  var existing = lastColumn
    ? sh.getRange(1, 1, 1, lastColumn).getValues()[0].map(function(v) { return String(v || '').trim(); })
    : [];
  var merged = existing.slice();
  headers.forEach(function(header) { if (merged.indexOf(header) < 0) merged.push(header); });
  if (sh.getMaxColumns() < merged.length) {
    sh.insertColumnsAfter(sh.getMaxColumns(), merged.length - sh.getMaxColumns());
  }
  if (!merged.length) return;
  sh.getRange(1, 1, 1, merged.length).setValues([merged])
    .setFontWeight('bold').setBackground('#0f172a').setFontColor('#ffffff');
  sh.setFrozenRows(1);
}

function updateWTCMCQProgress_(studentId, subjectId, chapterId, testId, testTitle, updatedAt) {
  if (!studentId) return { percent:0 };
  var attempts = wtcMcqRows_('MCQ_ATTEMPTS').filter(function(row) {
    return String(row.studentId) === String(studentId);
  });
  var bestByTest = {};
  var correct = 0, questions = 0, totalTime = 0, best = 0;
  attempts.forEach(function(row) {
    var key = String(row.testId || row.chapterId || 'TEST');
    var value = Number(row.percent || 0);
    bestByTest[key] = Math.max(Number(bestByTest[key] || 0), value);
    correct += Number(row.correctCount || row.score || 0);
    questions += Number(row.total || 0);
    totalTime += Number(row.totalTimeSec || 0);
    best = Math.max(best, value);
  });
  var keys = Object.keys(bestByTest);
  var overall = keys.length
    ? Math.round(keys.reduce(function(sum, key) { return sum + bestByTest[key]; }, 0) / keys.length)
    : 0;
  var average = attempts.length
    ? Math.round(attempts.reduce(function(sum, row) { return sum + Number(row.percent || 0); }, 0) / attempts.length)
    : 0;
  var value = {
    studentId:studentId, percent:overall, lastSubjectId:subjectId,
    lastChapterId:chapterId, updatedAt:updatedAt, totalAttempts:attempts.length,
    testsCompleted:keys.length, averagePercent:average, bestPercent:best,
    correctCount:correct, questionCount:questions, totalTimeSec:totalTime,
    lastTestId:testId, lastTestTitle:testTitle
  };
  wtcMcqUpsert_('PROGRESS_TRACKER', 'studentId', studentId, value);
  return value;
}

function updateWTCMCQSkillReport_(studentId, chapterId, updatedAt) {
  if (!studentId) return;
  var details = wtcMcqRows_('MCQ_ATTEMPT_DETAILS').filter(function(row) {
    return String(row.studentId) === String(studentId) &&
      (!chapterId || String(row.chapterId || '') === String(chapterId));
  });
  var summary = {};
  details.forEach(function(row) {
    var key = String(row.chapterId || chapterId) + '|' + String(row.topic || 'General');
    if (!summary[key]) summary[key] = {
      chapterId:row.chapterId || chapterId, topic:row.topic || 'General',
      attempted:0, correct:0, wrong:0, time:0
    };
    summary[key].attempted++;
    if (wtcMcqTruth_(row.isCorrect)) summary[key].correct++;
    else summary[key].wrong++;
    summary[key].time += Number(row.timeTakenSec || 0);
  });
  Object.keys(summary).forEach(function(key) {
    var item = summary[key];
    var accuracy = item.attempted ? Math.round((item.correct / item.attempted) * 100) : 0;
    wtcMcqUpsert_('STUDENT_SKILL_REPORT', 'studentTopicKey',
      studentId + '|' + item.chapterId + '|' + item.topic, {
        studentTopicKey:studentId + '|' + item.chapterId + '|' + item.topic,
        studentId:studentId, chapterId:item.chapterId, topic:item.topic,
        attempted:item.attempted, correct:item.correct, wrong:item.wrong,
        accuracy:accuracy, lastUpdated:updatedAt,
        averageTimeSec:item.attempted ? Math.round(item.time / item.attempted) : 0,
        lastScore:accuracy
      });
  });
}

function updateWTCMCQGamification_(studentId, percent, updatedAt) {
  if (!studentId) return;
  var rows = wtcMcqRows_('GAMIFICATION_DATA');
  var current = rows.filter(function(row) { return String(row.studentId) === String(studentId); })[0] || {};
  var xpGain = percent >= 90 ? 30 : percent >= 75 ? 20 : percent >= 50 ? 12 : 6;
  var xp = Number(current.xp || 0) + xpGain;
  var level = Math.max(1, Math.floor(xp / 100) + 1);
  var badge = percent >= 90 ? 'Mastery Star' : percent >= 75 ? 'High Scorer' : (current.badges || 'Starter');
  wtcMcqUpsert_('GAMIFICATION_DATA', 'studentId', studentId, {
    studentId:studentId, xp:xp, level:level, badges:badge,
    streak:Number(current.streak || 0) + 1, updatedAt:updatedAt,
    lastAttemptDate:updatedAt
  });
}

function wtcMcqBuildReport_(attempts, details) {
  attempts.sort(function(a, b) { return String(b.createdAt).localeCompare(String(a.createdAt)); });
  var totalCorrect = 0, totalQuestions = 0, totalTime = 0, bestPercent = 0;
  var tests = {}, topics = {}, chapters = {};

  attempts.forEach(function(row) {
    var percent = Number(row.percent || 0);
    var testKey = String(row.testId || row.chapterId || 'TEST');
    totalCorrect += Number(row.correctCount || row.score || 0);
    totalQuestions += Number(row.total || 0);
    totalTime += Number(row.totalTimeSec || 0);
    bestPercent = Math.max(bestPercent, percent);
    if (!tests[testKey]) tests[testKey] = {
      testId:row.testId || testKey, testTitle:row.testTitle || row.testType || 'MCQ Test',
      chapterId:row.chapterId || '', attempts:0, bestPercent:0, latestPercent:percent,
      lastAttempt:row.createdAt || ''
    };
    tests[testKey].attempts++;
    tests[testKey].bestPercent = Math.max(tests[testKey].bestPercent, percent);

    var chapterKey = String(row.chapterId || 'Chapter');
    if (!chapters[chapterKey]) chapters[chapterKey] = {
      chapterId:row.chapterId || '', chapterName:row.chapterName || chapterKey,
      attempts:0, bestPercent:0, testsCompleted:{}
    };
    chapters[chapterKey].attempts++;
    chapters[chapterKey].bestPercent = Math.max(chapters[chapterKey].bestPercent, percent);
    chapters[chapterKey].testsCompleted[testKey] = true;
  });

  details.forEach(function(row) {
    var topic = String(row.topic || 'General');
    if (!topics[topic]) topics[topic] = { topic:topic, attempted:0, correct:0, wrong:0, totalTimeSec:0 };
    topics[topic].attempted++;
    if (wtcMcqTruth_(row.isCorrect)) topics[topic].correct++;
    else topics[topic].wrong++;
    topics[topic].totalTimeSec += Number(row.timeTakenSec || 0);
  });

  var skills = Object.keys(topics).map(function(key) {
    var item = topics[key];
    item.accuracy = item.attempted ? Math.round((item.correct / item.attempted) * 100) : 0;
    item.averageTimeSec = item.attempted ? Math.round(item.totalTimeSec / item.attempted) : 0;
    item.level = item.accuracy >= 80 ? 'Strength' : item.accuracy >= 60 ? 'Developing' : 'Focus';
    return item;
  }).sort(function(a, b) { return a.accuracy - b.accuracy; });

  var bestValues = Object.keys(tests).map(function(key) { return tests[key].bestPercent; });
  var overall = bestValues.length
    ? Math.round(bestValues.reduce(function(sum, value) { return sum + value; }, 0) / bestValues.length)
    : 0;
  var average = attempts.length
    ? Math.round(attempts.reduce(function(sum, row) { return sum + Number(row.percent || 0); }, 0) / attempts.length)
    : 0;
  var accuracy = totalQuestions ? Math.round((totalCorrect / totalQuestions) * 100) : 0;
  var recommendations = wtcMcqRecommendations_(attempts, skills, accuracy, totalQuestions ? Math.round(totalTime / totalQuestions) : 0);

  return {
    summary:{
      overallPercent:overall, averagePercent:average, bestPercent:bestPercent,
      totalAttempts:attempts.length, testsCompleted:Object.keys(tests).length,
      totalCorrect:totalCorrect, totalQuestions:totalQuestions, accuracy:accuracy,
      totalTimeSec:totalTime, averageTimeSec:totalQuestions ? Math.round(totalTime / totalQuestions) : 0
    },
    testPerformance:Object.keys(tests).map(function(key) { return tests[key]; }),
    chapterPerformance:Object.keys(chapters).map(function(key) {
      var item = chapters[key]; item.testsCompleted = Object.keys(item.testsCompleted).length; return item;
    }),
    skills:skills.slice(0, 12), recommendations:recommendations,
    recentAttempts:attempts.slice(0, 8).map(function(row) {
      return {
        attemptId:row.attemptId, testId:row.testId, testTitle:row.testTitle || row.testType,
        chapterId:row.chapterId, chapterName:row.chapterName, score:Number(row.score || 0),
        total:Number(row.total || 0), percent:Number(row.percent || 0),
        correctCount:Number(row.correctCount || row.score || 0),
        wrongCount:Number(row.wrongCount || 0), unansweredCount:Number(row.unansweredCount || 0),
        totalTimeSec:Number(row.totalTimeSec || 0), retryCount:Number(row.retryCount || 0),
        createdAt:row.createdAt || '', personalizedMessage:row.personalizedMessage || ''
      };
    })
  };
}

function wtcMcqRecommendations_(attempts, skills, accuracy, averageTimeSec) {
  if (!attempts.length) return [{
    type:'start', title:'Start your first MCQ test',
    message:'Choose a topic test to create your personalized learning report.'
  }];
  var recommendations = [];
  skills.filter(function(item) { return item.accuracy < 65; }).slice(0, 3).forEach(function(item) {
    recommendations.push({
      type:'focus', title:'Revise ' + item.topic,
      message:'Your accuracy is ' + item.accuracy + '%. Review the explanation and retry its topic test.'
    });
  });
  if (averageTimeSec > 75) recommendations.push({
    type:'speed', title:'Improve test speed',
    message:'You average ' + averageTimeSec + ' seconds per question. Try a timed topic test next.'
  });
  if (accuracy >= 80) recommendations.push({
    type:'strength', title:'Ready for a full-length test',
    message:'Your overall accuracy is ' + accuracy + '%. Challenge yourself with the complete chapter test.'
  });
  if (!recommendations.length) recommendations.push({
    type:'practice', title:'Build consistency',
    message:'Retake one developing topic and aim for at least 80% accuracy.'
  });
  return recommendations.slice(0, 4);
}

function wtcMcqPersonalMessage_(percent, unanswered) {
  if (percent >= 90) return 'Outstanding mastery! Keep your accuracy strong.';
  if (percent >= 75) return 'Strong work. Review the missed questions and try for mastery.';
  if (percent >= 50) return 'Good progress. Revise weak topics before your next attempt.';
  if (unanswered) return 'Complete every question and review the explanations before retrying.';
  return 'Keep practising. Start with the topic tests and improve one concept at a time.';
}

function wtcMcqParseDetails_(value) {
  if (Array.isArray(value)) return value;
  try { var parsed = JSON.parse(value || '[]'); return Array.isArray(parsed) ? parsed : []; }
  catch (error) { return []; }
}

function wtcMcqTruth_(value) {
  return value === true || String(value || '').toUpperCase() === 'TRUE' || String(value) === '1';
}

function wtcMcqRows_(sheetName) {
  var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
  if (!sh || sh.getLastRow() < 2) return [];
  var values = sh.getDataRange().getValues();
  var headers = values[0].map(String);
  return values.slice(1).map(function(row, index) {
    var object = { _row:index + 2, _empty:row.join('') === '' };
    headers.forEach(function(header, column) { if (header) object[header] = row[column]; });
    return object;
  }).filter(function(object) { return !object._empty; });
}

function wtcMcqUpsert_(sheetName, key, value, object) {
  var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
  if (!sh) throw new Error('Missing sheet: ' + sheetName);
  var headers = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0].map(String);
  if (headers.indexOf(key) < 0) {
    if (sh.getMaxColumns() < headers.length + 1) sh.insertColumnAfter(sh.getMaxColumns());
    headers.push(key);
    sh.getRange(1, 1, 1, headers.length).setValues([headers]);
  }
  var found = wtcMcqRows_(sheetName).filter(function(row) { return String(row[key]) === String(value); })[0];
  if (!found) return wtcMcqAppend_(sheetName, object);
  var rowValues = sh.getRange(found._row, 1, 1, headers.length).getValues()[0];
  headers.forEach(function(header, index) { if (object[header] !== undefined) rowValues[index] = object[header]; });
  sh.getRange(found._row, 1, 1, headers.length).setValues([rowValues]);
}

function wtcMcqAppend_(sheetName, object) {
  return wtcMcqAppendMany_(sheetName, [object]);
}

function wtcMcqAppendMany_(sheetName, objects) {
  if (!objects || !objects.length) return;
  var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
  if (!sh) throw new Error('Missing sheet: ' + sheetName);
  var headers = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0].map(String);
  var values = objects.map(function(object) {
    return headers.map(function(header) { return object[header] !== undefined ? object[header] : ''; });
  });
  sh.getRange(sh.getLastRow() + 1, 1, values.length, headers.length).setValues(values);
}

function wtcMcqProfile_(value) {
  var source = value || {};
  return {
    board:String(source.board || '').trim(),
    className:String(source.className || source.class || '').trim(),
    medium:String(source.medium || '').trim()
  };
}

function wtcMcqProfileMatch_(row, profile) {
  var p = profile || {};
  return (!p.board || String(row.board || '').trim() === p.board) &&
    (!p.className || String(row.className || '').trim() === p.className) &&
    (!p.medium || String(row.medium || '').trim() === p.medium);
}

function wtcMcqProfileProgress_(request) {
  var d = request || {};
  var studentId = String(d.studentId || d.id || '').trim();
  if (!studentId) return { studentId:'', percent:0, testsCompleted:0, totalAttempts:0 };
  var profile = wtcMcqProfile_(d);
  var attempts = wtcMcqRows_('MCQ_ATTEMPTS').filter(function(row) {
    return String(row.studentId || '') === studentId && wtcMcqProfileMatch_(row, profile);
  });
  var report = wtcMcqBuildReport_(attempts, []);
  return {
    studentId:studentId,
    percent:Number(report.summary.overallPercent || 0),
    overallPercent:Number(report.summary.overallPercent || 0),
    averagePercent:Number(report.summary.averagePercent || 0),
    bestPercent:Number(report.summary.bestPercent || 0),
    totalAttempts:Number(report.summary.totalAttempts || 0),
    testsCompleted:Number(report.summary.testsCompleted || 0),
    correctCount:Number(report.summary.totalCorrect || 0),
    questionCount:Number(report.summary.totalQuestions || 0),
    totalTimeSec:Number(report.summary.totalTimeSec || 0),
    board:profile.board, className:profile.className, medium:profile.medium
  };
}

function wtcMcqReportCacheKey_(studentId, profile) {
  var p = profile || {};
  var identity = [studentId || '', p.board || '', p.className || '', p.medium || ''].join('|');
  var digest = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, identity, Utilities.Charset.UTF_8);
  return 'WTC_MCQ_REPORT_V2_' + Utilities.base64EncodeWebSafe(digest).replace(/=+$/g, '').slice(0, 32);
}
function wtcMcqClearReportCache_(studentId, request) {
  var cache = CacheService.getScriptCache();
  cache.remove(wtcMcqReportCacheKey_(studentId, wtcMcqProfile_(request || {})));
  cache.remove(wtcMcqReportCacheKey_(studentId, {}));
}

function wtcMcqNow_() {
  if (typeof now === 'function') return now();
  return Utilities.formatDate(new Date(), 'Asia/Kolkata', 'yyyy-MM-dd HH:mm:ss');
}
