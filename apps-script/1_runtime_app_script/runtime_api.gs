/* ============================================================================
   FILE: runtime_api.gs
   PURPOSE: Unified Runtime API Layer + Stage 1 cached catalogue/bootstrap.
============================================================================ */

var WTC_RuntimeAPI = (function() {
  function getSubjects(request) {
    var d = request || {};
    var list = WTC_WorkbookRepository
      .readRowsCached(WTC_BACKEND.WORKBOOK_KEYS.CONTENT, 'SUBJECT_MASTER', 600)
      .filter(function(item) { return wtcRuntimeActive_(item) && wtcRuntimeProfileMatch_(item, d); })
      .sort(wtcRuntimeSort_);
    return { success:true, subjects:list, source:'WTC_CONTENT_ENGINE' };
  }

  function getChapters(request) {
    var d = request || {};
    var subjectId = wtcRuntimeNorm_(d.subjectId);
    var list = WTC_WorkbookRepository
      .readRowsCached(WTC_BACKEND.WORKBOOK_KEYS.CONTENT, 'CHAPTER_MASTER', 600)
      .filter(function(item) {
        return wtcRuntimeActive_(item) && wtcRuntimeProfileMatch_(item, d) &&
          (!subjectId || wtcRuntimeNorm_(item.subjectId) === subjectId);
      })
      .sort(wtcRuntimeSort_);
    return { success:true, chapters:list, source:'WTC_CONTENT_ENGINE' };
  }

  function getChapterFeatures(request) {
    var d = request || {};
    var chapterId = wtcRuntimeNorm_(d.chapterId);
    var rows = WTC_WorkbookRepository
      .readRowsCached(WTC_BACKEND.WORKBOOK_KEYS.CONTENT, 'CHAPTER_LIST', 300)
      .filter(function(item) { return wtcRuntimeActive_(item) && wtcRuntimeNorm_(item.chapterId) === chapterId; });
    var definitions = [
      ['lessonUrl','LESSON','Lesson','📖','Lesson'], ['notesUrl','NOTES','Notes','📚','Notes'],
      ['mcqUrl','MCQ','MCQ Test','📝','Test'], ['worksheetUrl','WORKSHEET','Worksheet','📄','Worksheet'],
      ['answerWritingUrl','ANSWER_WRITING','Answer Writing','✍️','Practice'], ['videoUrl','VIDEO','Video','🎬','Video'],
      ['revisionUrl','REVISION','Revision','🔁','Revision'], ['solutionUrl','SOLUTION','Solution','📘','Solution']
    ];
    var features = [];
    rows.forEach(function(row) {
      definitions.forEach(function(definition) {
        var url = row[definition[0]];
        if (!url) return;
        features.push({ featureId:definition[1], featureName:definition[2], icon:definition[3], type:definition[4], url:url, chapterId:row.chapterId, routingSource:'STATIC_FALLBACK' });
      });
    });
    return { success:true, features:features, source:'WTC_CONTENT_ENGINE' };
  }

  function getStudentBootstrap(request) {
    var d = request || {};
    var studentId = wtcRuntimeNorm_(d.studentId || d.id);
    var subjects = getSubjects(d).subjects;
    var chapters = getChapters(d).chapters;
    var progress = typeof wtcMcqProfileProgress_ === 'function'
      ? wtcMcqProfileProgress_(d)
      : (WTC_WorkbookRepository.readRows(WTC_BACKEND.WORKBOOK_KEYS.CONTENT, 'PROGRESS_TRACKER')
          .filter(function(item) { return wtcRuntimeNorm_(item.studentId) === studentId; })[0] || { studentId:studentId, percent:0 });
    return {
      success:true,
      bootstrapVersion:'1.1',
      subjects:subjects,
      catalog:{ subjectCount:subjects.length, chapterCount:chapters.length },
      progress:progress,
      source:'WTC_CONTENT_ENGINE'
    };
  }

  function getRuntimeFeatureRegistry(request) {
    if (typeof getFeatureRegistry !== 'function') throw new Error('Feature Engine backend module is not loaded.');
    return getFeatureRegistry(request || {});
  }

  function getRuntimeSummary() {
    return { success:true, runtime:{
      contentEngine:WTC_WorkbookRepository.tryWorkbook(WTC_BACKEND.WORKBOOK_KEYS.CONTENT),
      featureEngine:WTC_WorkbookRepository.tryWorkbook(WTC_BACKEND.WORKBOOK_KEYS.FEATURE)
    }};
  }

  return {
    getSubjects:getSubjects,
    getChapters:getChapters,
    getChapterFeatures:getChapterFeatures,
    getStudentBootstrap:getStudentBootstrap,
    getFeatureRegistry:getRuntimeFeatureRegistry,
    getRuntimeSummary:getRuntimeSummary
  };
})();

function runtimeApiGetSubjects(d) { return WTC_RuntimeAPI.getSubjects(d); }
function runtimeApiGetChapters(d) { return WTC_RuntimeAPI.getChapters(d); }
function runtimeApiGetChapterFeatures(d) { return WTC_RuntimeAPI.getChapterFeatures(d); }
function runtimeApiGetStudentBootstrap(d) { return WTC_RuntimeAPI.getStudentBootstrap(d); }
function runtimeApiGetFeatureRegistry(d) { return WTC_RuntimeAPI.getFeatureRegistry(d); }
function wtcRuntimeNorm_(value) { return String(value || '').trim(); }
function wtcRuntimeActive_(item) {
  var status = String(item.status || item.isActive || 'Active').toLowerCase();
  return ['blocked','inactive','no','false'].indexOf(status) === -1;
}
function wtcRuntimeProfileMatch_(item, request) {
  return (!item.board || !request.board || wtcRuntimeNorm_(item.board) === wtcRuntimeNorm_(request.board)) &&
    (!item.className || !request.className || wtcRuntimeNorm_(item.className) === wtcRuntimeNorm_(request.className)) &&
    (!item.medium || !request.medium || wtcRuntimeNorm_(item.medium) === wtcRuntimeNorm_(request.medium));
}
function wtcRuntimeSort_(a, b) { return (Number(a.sortOrder) || 99) - (Number(b.sortOrder) || 99); }
