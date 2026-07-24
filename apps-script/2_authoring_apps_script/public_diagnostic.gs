/* ==========================================================================
   WAGH Tuition Classes — Public Chapter Diagnostic H1.2
   PURPOSE:
   - Returns only a short published-question sample without answer keys.
   - Scores the sample server-side through a short-lived diagnostic session.
   - Does not write to MCQ progress or reveal the full published question bank.
   DEPENDENCIES: rows_, findBy_, norm_, isPublishedForStudents_/isVisible_
============================================================================ */

var WTC_PUBLIC_DIAGNOSTIC_VERSION = 'H1.2';
var WTC_PUBLIC_DIAGNOSTIC_LIMIT = 10;
var WTC_PUBLIC_DIAGNOSTIC_TTL_SECONDS = 1800;

function getPublicDiagnostic(d) {
  var request = d || {};
  var chapterId = norm_(request.chapterId);
  if (!chapterId) return { success:false, message:'chapterId is required.' };

  var featureMap = findBy_('FEATURE_MAP', 'chapterId', chapterId) || {};
  var mcqSetId = norm_(featureMap.mcqSetId) || ('MCQSET-' + chapterId);
  var pool = rows_('MCQ_ENGINE').filter(function(row) {
    return norm_(row.chapterId) === chapterId &&
      norm_(row.mcqSetId) === mcqSetId &&
      wtcPublicDiagnosticVisible_(row) &&
      wtcPublicDiagnosticValidQuestion_(row);
  });

  if (pool.length < 3) {
    return {
      success:false,
      message:'This chapter does not yet contain enough published questions for a public diagnostic.'
    };
  }

  var selected = wtcPublicDiagnosticSelect_(pool, WTC_PUBLIC_DIAGNOSTIC_LIMIT);
  var diagnosticId = 'DIAG-' + Utilities.getUuid();
  var session = {
    diagnosticId:diagnosticId,
    chapterId:chapterId,
    mcqSetId:mcqSetId,
    createdAt:new Date().toISOString(),
    questions:selected.map(function(row, index) {
      return {
        questionNo:index + 1,
        questionId:norm_(row.mcqId),
        correctOption:String(row.correctOption || '').trim().toUpperCase(),
        topic:norm_(row.topic) || 'General'
      };
    })
  };

  CacheService.getScriptCache().put(
    wtcPublicDiagnosticCacheKey_(diagnosticId),
    JSON.stringify(session),
    WTC_PUBLIC_DIAGNOSTIC_TTL_SECONDS
  );

  return {
    success:true,
    diagnosticId:diagnosticId,
    chapterId:chapterId,
    questionCount:selected.length,
    expiresInSec:WTC_PUBLIC_DIAGNOSTIC_TTL_SECONDS,
    version:WTC_PUBLIC_DIAGNOSTIC_VERSION,
    questions:selected.map(function(row, index) {
      return {
        questionNo:index + 1,
        questionId:norm_(row.mcqId),
        questionText:norm_(row.questionText),
        optionA:norm_(row.optionA),
        optionB:norm_(row.optionB),
        optionC:norm_(row.optionC),
        optionD:norm_(row.optionD),
        topic:norm_(row.topic) || 'General',
        difficulty:norm_(row.difficulty) || 'Medium'
      };
    })
  };
}

function scorePublicDiagnostic(d) {
  var request = d || {};
  var diagnosticId = norm_(request.diagnosticId);
  if (!diagnosticId) return { success:false, message:'diagnosticId is required.' };

  var raw = CacheService.getScriptCache().get(wtcPublicDiagnosticCacheKey_(diagnosticId));
  if (!raw) return { success:false, expired:true, message:'This diagnostic session expired. Start the chapter test again.' };

  var session = JSON.parse(raw);
  var answers = wtcPublicDiagnosticAnswers_(request.answers);
  var topicMap = {};
  var correct = 0;
  var unanswered = 0;

  (session.questions || []).forEach(function(question) {
    var selected = String(answers[question.questionId] || '').trim().toUpperCase();
    var isCorrect = selected && selected === question.correctOption;
    if (isCorrect) correct += 1;
    if (!selected) unanswered += 1;

    var topic = question.topic || 'General';
    if (!topicMap[topic]) topicMap[topic] = { topic:topic, total:0, missed:0 };
    topicMap[topic].total += 1;
    if (!isCorrect) topicMap[topic].missed += 1;
  });

  var total = (session.questions || []).length;
  var percent = total ? Math.round((correct / total) * 100) : 0;
  var weakTopics = Object.keys(topicMap).map(function(key) { return topicMap[key]; })
    .filter(function(item) { return item.missed > 0; })
    .sort(function(a,b) {
      return b.missed - a.missed || b.total - a.total || String(a.topic).localeCompare(String(b.topic));
    })
    .slice(0, 4)
    .map(function(item) { return item.topic; });

  return {
    success:true,
    diagnosticId:diagnosticId,
    chapterId:session.chapterId || '',
    correct:correct,
    total:total,
    percent:percent,
    unanswered:unanswered,
    wrong:Math.max(0, total - correct - unanswered),
    weakTopics:weakTopics,
    version:WTC_PUBLIC_DIAGNOSTIC_VERSION
  };
}

function wtcPublicDiagnosticSelect_(rows, limit) {
  var groups = {};
  (rows || []).forEach(function(row) {
    var topic = norm_(row.topic) || 'General';
    if (!groups[topic]) groups[topic] = [];
    groups[topic].push(row);
  });

  var topics = wtcPublicDiagnosticShuffle_(Object.keys(groups));
  topics.forEach(function(topic) { groups[topic] = wtcPublicDiagnosticShuffle_(groups[topic]); });
  var selected = [];
  var round = 0;
  var maximum = Math.min(Number(limit || 10), rows.length);
  while (selected.length < maximum) {
    var added = false;
    topics.forEach(function(topic) {
      if (selected.length >= maximum) return;
      var row = groups[topic][round];
      if (row) { selected.push(row); added = true; }
    });
    if (!added) break;
    round += 1;
  }
  return selected;
}

function wtcPublicDiagnosticShuffle_(items) {
  var copy = (items || []).slice();
  for (var index = copy.length - 1; index > 0; index -= 1) {
    var other = Math.floor(Math.random() * (index + 1));
    var value = copy[index]; copy[index] = copy[other]; copy[other] = value;
  }
  return copy;
}

function wtcPublicDiagnosticValidQuestion_(row) {
  var correct = String(row.correctOption || '').trim().toUpperCase();
  return Boolean(norm_(row.mcqId) && norm_(row.questionText) &&
    norm_(row.optionA) && norm_(row.optionB) && norm_(row.optionC) && norm_(row.optionD) &&
    ['A','B','C','D'].indexOf(correct) !== -1);
}

function wtcPublicDiagnosticVisible_(row) {
  if (typeof isPublishedForStudents_ === 'function') return isPublishedForStudents_(row);
  if (typeof isVisible_ === 'function') return isVisible_(row);
  var status = String(row.status || '').trim().toLowerCase();
  return ['published','active','yes','true'].indexOf(status) !== -1;
}

function wtcPublicDiagnosticAnswers_(value) {
  if (value && typeof value === 'object') return value;
  try { return JSON.parse(String(value || '{}')); }
  catch (error) { return {}; }
}

function wtcPublicDiagnosticCacheKey_(diagnosticId) {
  return 'wtc-public-diagnostic-' + String(diagnosticId || '').replace(/[^A-Za-z0-9_-]/g, '').slice(0, 80);
}
