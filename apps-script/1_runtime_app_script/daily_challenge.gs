/* ============================================================================
   WAGH Tuition Classes — H1.3B-R1 Chapter Daily Challenge
   Architecture: LOCKED v2.3.1 R2

   PURPOSE
   - Admin-controlled chapter pool for each Board + Class + Medium group.
   - One frozen 20-MCQ chapter challenge per group per day.
   - Available to active General and WTC Student accounts.
   - Completely separate from PROGRESS_TRACKER, TEST_RESULTS, MCQ_ATTEMPTS,
     MCQ_ATTEMPT_DETAILS, STUDENT_SKILL_REPORT and GAMIFICATION_DATA.
   - Only short-lived anonymous attempt/score summaries are kept in
     DAILY_CHALLENGE_LIVE and automatically deleted after the challenge closes.
============================================================================ */

var WTC_DAILY_CHALLENGE_R1 = {
  VERSION: 'H1.3B-R1-v1.0',
  MIGRATION_KEY: 'HOME_DAILY_CHALLENGE_H1_3B_R1_V1',
  QUESTION_COUNT: 20,
  DURATION_MIN: 20,
  CLEANUP_HOURS: 24,
  CONFIG_TYPE: 'DAILY_CHALLENGE_CONFIG',
  CHALLENGE_TYPE: 'DAILY_CHALLENGE',
  VISIBLE_STATUSES: ['published','active','ready'],
  LIVE_HEADERS: [
    'liveId','challengeId','challengeDate','participantHash','attemptTokenHash',
    'attemptStatus','startedAt','expiresAt','submittedAt','score','total','percent',
    'correctCount','wrongCount','unansweredCount','totalTimeSec','strongTopics',
    'weakTopics','expiresOn','createdAt','updatedAt'
  ],
  AUTHORING_TEST_HEADERS: [
    'testId','mcqSetId','uploadId','chapterId','testTitle','testType','topic',
    'questionLabel','instructions','questionCount','sortOrder','status','createdAt',
    'updatedAt','board','className','medium','subjectId','challengeDate','challengeKey',
    'opensAt','closesAt','durationMin','generatedBy','configId','chapterPool',
    'chapterIds','primaryChapterId','rotationStartDate','selectionMode','allowGeneral',
    'allowWtc','cleanupHours'
  ],
  AUTHORING_MAP_HEADERS: ['mapId','testId','mcqId','questionOrder','status','createdAt','updatedAt']
};

function installDailyChallengeSystem(){ return installChapterDailyChallengeSystem(); }

/** Safe, additive and idempotent. Never clears academic or challenge data. */
function installChapterDailyChallengeSystem() {
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) throw new Error('Another setup operation is running. Try again shortly.');
  try {
    var runtime = SpreadsheetApp.getActiveSpreadsheet();
    var live = wtcDCEnsureSheet_(runtime, 'DAILY_CHALLENGE_LIVE', WTC_DAILY_CHALLENGE_R1.LIVE_HEADERS);
    var authoring = wtcDCOpenAuthoring_();
    var tests = wtcDCEnsureSheet_(authoring, 'MCQ_TEST_ENGINE', WTC_DAILY_CHALLENGE_R1.AUTHORING_TEST_HEADERS);
    var map = wtcDCEnsureSheet_(authoring, 'MCQ_TEST_QUESTION_MAP', WTC_DAILY_CHALLENGE_R1.AUTHORING_MAP_HEADERS);
    var props = PropertiesService.getScriptProperties();
    if (!props.getProperty('WTC_DAILY_CHALLENGE_SALT')) props.setProperty('WTC_DAILY_CHALLENGE_SALT', Utilities.getUuid() + Utilities.getUuid());
    var trigger = wtcDCEnsureCleanupTrigger_();
    var migration = wtcDCRecordMigration_(runtime, {
      migrationId:'MIG-' + wtcDCHash_(WTC_DAILY_CHALLENGE_R1.MIGRATION_KEY).slice(0,20),
      migrationKey:WTC_DAILY_CHALLENGE_R1.MIGRATION_KEY,
      version:WTC_DAILY_CHALLENGE_R1.VERSION,
      status:'APPLIED',
      appliedAt:wtcDCNow_(),
      notes:'Created temporary anonymous DAILY_CHALLENGE_LIVE storage and added chapter-pool metadata to existing Authoring test sheets. No academic progress/result sheet is used.'
    });
    return {
      success:true,
      version:WTC_DAILY_CHALLENGE_R1.VERSION,
      message:'Chapter Daily Challenge H1.3B-R1 is ready.',
      runtime:{ dailyChallengeLive:live },
      authoring:{ mcqTestEngine:tests, mcqTestQuestionMap:map },
      cleanupTrigger:trigger,
      legacyEvidenceAudit:auditLegacyDailyChallengeEvidence(),
      migration:migration
    };
  } finally { lock.releaseLock(); }
}


/** Read-only audit. It never deletes or changes old H1.3B test evidence. */
function auditLegacyDailyChallengeEvidence() {
  var result = {};
  ['TEST_RESULTS','MCQ_ATTEMPTS','MCQ_ATTEMPT_DETAILS'].forEach(function(name) {
    result[name] = wtcDCRuntimeRows_(name).filter(function(row) {
      return wtcDCNorm_(row.testType) === 'daily_challenge' || String(row.challengeId || '').trim() !== '';
    }).length;
  });
  result.note = 'H1.3B-R1 does not write to these sheets. Existing legacy rows are reported only and are not removed.';
  return result;
}

/* ============================== Student API ============================== */

function studentGetDailyChallengeStatus(d) {
  wtcDCMaybeCleanup_();
  var student = wtcDCRequireStudent_(d || {});
  var resolved = wtcDCResolveToday_(student);
  if (!resolved.available) return resolved;
  var participantHash = wtcDCParticipantHash_(student, resolved.challenge.challengeId);
  var live = wtcDCFindLive_(participantHash, resolved.challenge.challengeId);
  var state = 'AVAILABLE';
  if (live) {
    var status = wtcDCNorm_(live.attemptStatus);
    if (status === 'completed') state = 'COMPLETED';
    else if (status === 'in_progress' && wtcDCTime_(live.expiresAt) > Date.now()) state = 'IN_PROGRESS';
    else state = 'EXPIRED';
  }
  return {
    success:true,
    phase:'H1.3B-R1',
    available:true,
    state:state,
    challenge:wtcDCPublicChallenge_(resolved.challenge),
    result:state === 'COMPLETED' ? wtcDCPublicLiveResult_(live) : null,
    canStart:state === 'AVAILABLE' || state === 'IN_PROGRESS',
    progressImpact:'NONE',
    scoreRetention:'TEMPORARY_ONLY'
  };
}

function studentOpenDailyChallenge(d) {
  wtcDCMaybeCleanup_();
  var request = d || {};
  var student = wtcDCRequireStudent_(request);
  var resolved = wtcDCResolveToday_(student);
  if (!resolved.available) return resolved;
  var challenge = resolved.challenge;
  var participantHash = wtcDCParticipantHash_(student, challenge.challengeId);
  var live = wtcDCFindLive_(participantHash, challenge.challengeId);
  var nowMs = Date.now();

  if (live && wtcDCNorm_(live.attemptStatus) === 'completed') {
    return { success:true, phase:'H1.3B-R1', completed:true, challenge:wtcDCPublicChallenge_(challenge), result:wtcDCPublicLiveResult_(live) };
  }
  if (live && wtcDCTime_(live.expiresAt) <= nowMs) {
    wtcDCUpdateRuntimeRow_('DAILY_CHALLENGE_LIVE', live._row, { attemptStatus:'EXPIRED', updatedAt:wtcDCNow_() });
    return { success:false, code:'ATTEMPT_EXPIRED', message:'Today’s official Chapter Challenge attempt has expired.' };
  }

  var rawToken = Utilities.getUuid() + '-' + Utilities.getUuid();
  var tokenHash = wtcDCHash_(rawToken);
  if (!live) {
    var startedAt = wtcDCNow_();
    var durationEnd = nowMs + Number(challenge.durationMin || WTC_DAILY_CHALLENGE_R1.DURATION_MIN) * 60000;
    var expiresAtMs = Math.min(durationEnd, wtcDCTime_(challenge.closesAt));
    var expiresOnMs = wtcDCTime_(challenge.closesAt) + Number(challenge.cleanupHours || WTC_DAILY_CHALLENGE_R1.CLEANUP_HOURS) * 3600000;
    wtcDCAppendRuntime_('DAILY_CHALLENGE_LIVE', {
      liveId:'DCL-' + wtcDCHash_([participantHash, challenge.challengeId].join('|')).slice(0,24),
      challengeId:challenge.challengeId,
      challengeDate:challenge.challengeDate,
      participantHash:participantHash,
      attemptTokenHash:tokenHash,
      attemptStatus:'IN_PROGRESS',
      startedAt:startedAt,
      expiresAt:wtcDCFormatDateTime_(new Date(expiresAtMs)),
      expiresOn:wtcDCFormatDateTime_(new Date(expiresOnMs)),
      createdAt:startedAt,
      updatedAt:startedAt
    });
    live = wtcDCFindLive_(participantHash, challenge.challengeId);
  } else {
    wtcDCUpdateRuntimeRow_('DAILY_CHALLENGE_LIVE', live._row, { attemptTokenHash:tokenHash, updatedAt:wtcDCNow_() });
  }

  return {
    success:true,
    phase:'H1.3B-R1',
    completed:false,
    attempt:{ attemptToken:rawToken, startedAt:live.startedAt || '', expiresAt:live.expiresAt || '', officialAttempt:true },
    challenge:wtcDCPublicChallenge_(challenge),
    questions:challenge.questions,
    progressImpact:'NONE'
  };
}

function saveDailyChallengeResult(d) {
  wtcDCMaybeCleanup_();
  var request = d || {};
  var student = wtcDCRequireStudent_(request);
  var challengeId = String(request.challengeId || '').trim();
  var attemptToken = String(request.attemptToken || request.attemptId || '').trim();
  if (!challengeId || !attemptToken) throw new Error('Challenge attempt identity is missing.');
  var challenge = wtcDCLoadChallengeById_(student, challengeId);
  var participantHash = wtcDCParticipantHash_(student, challengeId);
  var live = wtcDCFindLive_(participantHash, challengeId);
  if (!live || wtcDCNorm_(live.attemptTokenHash) !== wtcDCNorm_(wtcDCHash_(attemptToken))) throw new Error('This Chapter Challenge attempt could not be verified.');
  if (wtcDCNorm_(live.attemptStatus) === 'completed') {
    return { success:true, reused:true, phase:'H1.3B-R1', result:wtcDCPublicLiveResult_(live), answersAvailableAt:challenge.closesAt, reviewLocked:true };
  }
  if (wtcDCTime_(live.expiresAt) && Date.now() > wtcDCTime_(live.expiresAt) + 90000) {
    wtcDCUpdateRuntimeRow_('DAILY_CHALLENGE_LIVE', live._row, { attemptStatus:'EXPIRED', updatedAt:wtcDCNow_() });
    throw new Error('The official Chapter Challenge timer has expired.');
  }

  var scored = wtcDCScoreSubmission_(challenge, request.attemptDetails);
  var totalTimeSec = Math.max(0, Math.min(Number(request.totalTimeSec || 0) || 0, Number(challenge.durationMin || 20) * 60 + 90));
  var now = wtcDCNow_();
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) throw new Error('Another submission is being saved. Try again shortly.');
  try {
    live = wtcDCFindLive_(participantHash, challengeId);
    if (!live) throw new Error('The temporary challenge attempt has expired.');
    if (wtcDCNorm_(live.attemptStatus) === 'completed') return { success:true, reused:true, result:wtcDCPublicLiveResult_(live), answersAvailableAt:challenge.closesAt, reviewLocked:true };
    wtcDCUpdateRuntimeRow_('DAILY_CHALLENGE_LIVE', live._row, {
      attemptStatus:'COMPLETED', submittedAt:now, score:scored.score, total:scored.total,
      percent:scored.percent, correctCount:scored.score, wrongCount:scored.wrongCount,
      unansweredCount:scored.unansweredCount, totalTimeSec:totalTimeSec,
      strongTopics:scored.strongTopics.join(', '), weakTopics:scored.weakTopics.join(', '), updatedAt:now
    });
    var result = {
      score:scored.score,total:scored.total,percent:scored.percent,correctCount:scored.score,
      wrongCount:scored.wrongCount,unansweredCount:scored.unansweredCount,totalTimeSec:totalTimeSec,
      strongTopics:scored.strongTopics.join(', '),weakTopics:scored.weakTopics.join(', '),submittedAt:now
    };
    return {
      success:true,reused:false,phase:'H1.3B-R1',result:result,
      answersAvailableAt:challenge.closesAt,reviewLocked:Date.now() < wtcDCTime_(challenge.closesAt),
      remainingAttempts:0,progressImpact:'NONE',scoreRetention:'TEMPORARY_ONLY',
      message:'Chapter Challenge result calculated. It is not added to academic progress.'
    };
  } finally { lock.releaseLock(); }
}

/* ================================ Admin API =============================== */

function adminGetDailyChallengeManager(d) {
  wtcDCRequireAdmin_(d || {});
  cleanupDailyChallengeLiveData();
  var subjects = wtcDCRuntimeRows_('SUBJECT_MASTER').filter(wtcDCActive_).map(function(row){
    return { subjectId:row.subjectId || '', subjectName:row.subjectName || row.name || row.subjectId || '', board:row.board || '', className:row.className || '', medium:row.medium || '', sortOrder:Number(row.sortOrder || 999) };
  });
  var counts = wtcDCQuestionCounts_();
  var chapters = wtcDCRuntimeRows_('CHAPTER_MASTER').filter(wtcDCActive_).map(function(row){
    return { chapterId:row.chapterId || '', chapterName:row.chapterName || row.name || row.chapterId || '', subjectId:row.subjectId || '', board:row.board || '', className:row.className || '', medium:row.medium || '', sortOrder:Number(row.sortOrder || row.chapterNo || 999), publishedMcqCount:Number(counts[wtcDCNorm_(row.chapterId)] || 0) };
  });
  var configs = wtcDCAuthoringRows_('MCQ_TEST_ENGINE').filter(function(row){ return wtcDCNorm_(row.testType) === wtcDCNorm_(WTC_DAILY_CHALLENGE_R1.CONFIG_TYPE); }).map(wtcDCPublicConfig_);
  return { success:true, phase:'H1.3B-R1', subjects:subjects, chapters:chapters, configs:configs, rules:{ questionCount:20, durationMin:20, scoreStorage:'Temporary anonymous live data only', progressImpact:'None' } };
}

function adminSaveDailyChallengeConfig(d) {
  var request = d || {};
  var admin = wtcDCRequireAdmin_(request);
  var board = wtcDCText_(request.board,30).toUpperCase();
  var className = wtcDCText_(request.className,30);
  var medium = wtcDCText_(request.medium,40);
  var subjectId = wtcDCText_(request.subjectId,100);
  var chapterIds = wtcDCParseList_(request.chapterIds);
  var enabled = !['false','0','no','suspended'].includes(wtcDCNorm_(request.enabled));
  var rotationStartDate = wtcDCDateValue_(request.rotationStartDate || wtcDCDate_());
  var durationMin = Math.max(5, Math.min(60, Number(request.durationMin || 20) || 20));
  if (!board || !className || !medium || !subjectId) throw new Error('Board, class, medium and subject are required.');
  if (!chapterIds.length) throw new Error('Select at least one chapter.');

  var chapters = wtcDCRuntimeRows_('CHAPTER_MASTER').filter(function(row){
    return chapterIds.indexOf(String(row.chapterId || '')) >= 0 && wtcDCNorm_(row.subjectId) === wtcDCNorm_(subjectId) &&
      wtcDCNorm_(row.board) === wtcDCNorm_(board) && wtcDCNorm_(row.className) === wtcDCNorm_(className) && wtcDCNorm_(row.medium) === wtcDCNorm_(medium);
  });
  if (chapters.length !== chapterIds.length) throw new Error('One or more selected chapters do not belong to this academic group and subject.');
  var counts = wtcDCQuestionCounts_();
  var total = chapters.reduce(function(sum,row){ return sum + Number(counts[wtcDCNorm_(row.chapterId)] || 0); },0);
  if (total < WTC_DAILY_CHALLENGE_R1.QUESTION_COUNT) throw new Error('The selected chapter pool needs at least 20 unique published MCQs in total.');

  var sheet = wtcDCOpenAuthoring_().getSheetByName('MCQ_TEST_ENGINE');
  var configId = 'DCCFG-' + wtcDCHash_([board,className,medium].join('|')).slice(0,16);
  var now = wtcDCNow_();
  var row = wtcDCRowsFromSheet_(sheet).find(function(item){ return wtcDCNorm_(item.testId) === wtcDCNorm_(configId); });
  var payload = {
    testId:configId,configId:configId,testTitle:'Chapter Daily Challenge Configuration',testType:WTC_DAILY_CHALLENGE_R1.CONFIG_TYPE,
    board:board,className:className,medium:medium,subjectId:subjectId,chapterPool:JSON.stringify(chapterIds),
    rotationStartDate:rotationStartDate,selectionMode:'AUTO_ROTATION',questionCount:20,durationMin:durationMin,
    status:enabled?'ACTIVE':'SUSPENDED',allowGeneral:'YES',allowWtc:'YES',cleanupHours:24,
    generatedBy:admin.adminId || admin.mobile || 'Admin',updatedAt:now
  };
  if (row) wtcDCUpdateSheetRow_(sheet,row._row,payload);
  else { payload.createdAt=now; wtcDCAppendToSheet_(sheet,payload); }
  return { success:true,message:enabled?'Chapter Challenge rotation saved.':'Chapter Challenge rotation suspended.',config:wtcDCPublicConfig_(Object.assign({},row||{},payload)),availableMcqCount:total };
}

function adminPrepareDailyChallenge(d) {
  var request = d || {};
  wtcDCRequireAdmin_(request);
  var configId = String(request.configId || '').trim();
  var dateKey = wtcDCDateValue_(request.challengeDate || wtcDCDate_());
  var config = wtcDCAuthoringRows_('MCQ_TEST_ENGINE').find(function(row){ return wtcDCNorm_(row.testId) === wtcDCNorm_(configId) && wtcDCNorm_(row.testType) === wtcDCNorm_(WTC_DAILY_CHALLENGE_R1.CONFIG_TYPE); });
  if (!config) throw new Error('Daily Challenge configuration was not found.');
  var challenge = wtcDCEnsureChallengeFromConfig_(config,dateKey);
  return { success:true,message:'The chapter challenge is frozen for '+dateKey+'.',challenge:wtcDCPublicChallenge_(challenge),preview:challenge.questions.map(function(q,index){ return { questionNo:index+1,chapterName:q.chapterName,topic:q.topic,difficulty:q.difficulty,text:q.text }; }) };
}

/* ========================= Challenge orchestration ======================== */

function wtcDCResolveToday_(student) {
  var dateKey = wtcDCDate_();
  var config = wtcDCAuthoringRows_('MCQ_TEST_ENGINE').filter(function(row){
    return wtcDCNorm_(row.testType) === wtcDCNorm_(WTC_DAILY_CHALLENGE_R1.CONFIG_TYPE) && wtcDCNorm_(row.status) === 'active' &&
      wtcDCNorm_(row.board) === wtcDCNorm_(student.board) && wtcDCNorm_(row.className) === wtcDCNorm_(student.className) && wtcDCNorm_(row.medium) === wtcDCNorm_(student.medium);
  }).sort(function(a,b){ return String(b.updatedAt || b.createdAt || '').localeCompare(String(a.updatedAt || a.createdAt || '')); })[0];
  if (!config) return { success:true,phase:'H1.3B-R1',available:false,state:'UNAVAILABLE',message:'The Admin has not activated a Chapter Challenge for this board, class and medium yet.' };
  try { return { success:true,available:true,challenge:wtcDCEnsureChallengeFromConfig_(config,dateKey) }; }
  catch(error) { return { success:true,phase:'H1.3B-R1',available:false,state:'UNAVAILABLE',message:error.message || 'Today’s Chapter Challenge is not ready.' }; }
}

function wtcDCEnsureChallengeFromConfig_(config,dateKey) {
  var authoring = wtcDCOpenAuthoring_();
  var testSheet = authoring.getSheetByName('MCQ_TEST_ENGINE');
  var mapSheet = authoring.getSheetByName('MCQ_TEST_QUESTION_MAP');
  var challengeKey = [config.testId,config.board,config.className,config.medium,dateKey].join('|');
  var challengeId = 'DCH-' + dateKey.replace(/-/g,'') + '-' + wtcDCHash_(challengeKey).slice(0,12);
  var existing = wtcDCRowsFromSheet_(testSheet).find(function(row){ return wtcDCNorm_(row.testId) === wtcDCNorm_(challengeId) && wtcDCNorm_(row.testType) === 'daily_challenge'; });
  if (existing) return wtcDCHydrateChallenge_(existing);

  var lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) throw new Error('Today’s Chapter Challenge is being prepared. Try again shortly.');
  try {
    existing = wtcDCRowsFromSheet_(testSheet).find(function(row){ return wtcDCNorm_(row.testId) === wtcDCNorm_(challengeId); });
    if (existing) return wtcDCHydrateChallenge_(existing);
    var selection = wtcDCSelectChapters_(config,dateKey);
    var questions = wtcDCBuildQuestionSet_(selection.chapterIds,challengeKey);
    if (questions.length !== 20) throw new Error('The configured chapter pool does not currently contain 20 valid unique published MCQs.');
    var now = wtcDCNow_();
    var openTime = dateKey + ' 00:00:00';
    var closeTime = dateKey + ' 23:59:59';
    var title = selection.chapterNames.join(' + ') + ' — Daily Chapter Challenge';
    wtcDCAppendToSheet_(testSheet, {
      testId:challengeId,configId:config.testId || config.configId || '',chapterId:selection.primaryChapterId,
      chapterIds:JSON.stringify(selection.chapterIds),testTitle:title,testType:WTC_DAILY_CHALLENGE_R1.CHALLENGE_TYPE,
      topic:'Chapter Challenge',questionLabel:'Daily 20 MCQ',instructions:'Attempt all 20 questions. This challenge is separate from academic progress and its score is retained only temporarily.',
      questionCount:20,status:'PUBLISHED',createdAt:now,updatedAt:now,board:config.board || '',className:config.className || '',
      medium:config.medium || '',subjectId:config.subjectId || '',challengeDate:dateKey,challengeKey:challengeKey,
      opensAt:openTime,closesAt:closeTime,durationMin:Number(config.durationMin || 20),generatedBy:'H1.3B-R1',
      primaryChapterId:selection.primaryChapterId,selectionMode:'ADMIN_POOL_ROTATION',allowGeneral:'YES',allowWtc:'YES',cleanupHours:24
    });
    questions.forEach(function(row,index){
      wtcDCAppendToSheet_(mapSheet,{ mapId:'DCM-'+wtcDCHash_([challengeId,row.mcqId].join('|')).slice(0,22),testId:challengeId,mcqId:row.mcqId,questionOrder:index+1,status:'PUBLISHED',createdAt:now,updatedAt:now });
    });
    existing = wtcDCRowsFromSheet_(testSheet).find(function(row){ return wtcDCNorm_(row.testId) === wtcDCNorm_(challengeId); });
    return wtcDCHydrateChallenge_(existing);
  } finally { lock.releaseLock(); }
}

function wtcDCSelectChapters_(config,dateKey) {
  var pool = wtcDCParseList_(config.chapterPool || config.chapterIds);
  if (!pool.length) throw new Error('No chapters are selected in the active challenge configuration.');
  var chapterRows = wtcDCRuntimeRows_('CHAPTER_MASTER');
  var chapterById = {};
  chapterRows.forEach(function(row){ chapterById[wtcDCNorm_(row.chapterId)] = row; });
  pool = pool.filter(function(id){ return !!chapterById[wtcDCNorm_(id)]; });
  if (!pool.length) throw new Error('The configured chapters are no longer available in CHAPTER_MASTER.');
  var counts = wtcDCQuestionCounts_();
  var start = wtcDCDateValue_(config.rotationStartDate || dateKey);
  var dayOffset = Math.max(0,Math.floor((wtcDCTime_(dateKey+' 00:00:00') - wtcDCTime_(start+' 00:00:00')) / 86400000));
  var primaryIndex = dayOffset % pool.length;
  var selected = [], total = 0;
  for (var step=0; step<pool.length; step++) {
    var id = pool[(primaryIndex + step) % pool.length];
    var count = Number(counts[wtcDCNorm_(id)] || 0);
    if (!count) continue;
    selected.push(id); total += count;
    if (total >= 20) break;
  }
  if (total < 20) throw new Error('The Admin-selected chapter pool needs at least 20 unique published MCQs.');
  return {
    primaryChapterId:selected[0],chapterIds:selected,
    chapterNames:selected.map(function(id){ var row=chapterById[wtcDCNorm_(id)]||{}; return row.chapterName || row.name || id; })
  };
}

function wtcDCBuildQuestionSet_(chapterIds,seed) {
  var allowed = {};
  chapterIds.forEach(function(id){ allowed[wtcDCNorm_(id)] = true; });
  var seen = {}, rows = wtcDCAuthoringRows_('MCQ_ENGINE').filter(function(row){
    if (!allowed[wtcDCNorm_(row.chapterId)] || !wtcDCVisible_(row) || !wtcDCValidQuestion_(row)) return false;
    var unique = wtcDCNorm_(row.contentHash || row.mcqId || row.questionText);
    if (seen[unique]) return false;
    seen[unique] = true; return true;
  });
  var buckets = { easy:[],medium:[],hard:[] };
  rows.forEach(function(row){ buckets[wtcDCDifficulty_(row.difficulty)].push(row); });
  Object.keys(buckets).forEach(function(key){ buckets[key].sort(function(a,b){ return wtcDCNumericHash_(seed+'|'+a.mcqId)-wtcDCNumericHash_(seed+'|'+b.mcqId); }); });
  var selected = [];
  [['easy',6],['medium',10],['hard',4]].forEach(function(rule){ selected = selected.concat(buckets[rule[0]].splice(0,rule[1])); });
  var used = {}; selected.forEach(function(row){ used[wtcDCNorm_(row.mcqId)] = true; });
  rows.filter(function(row){ return !used[wtcDCNorm_(row.mcqId)]; }).sort(function(a,b){ return wtcDCNumericHash_(seed+'|fill|'+a.mcqId)-wtcDCNumericHash_(seed+'|fill|'+b.mcqId); }).forEach(function(row){ if(selected.length<20)selected.push(row); });
  return selected.slice(0,20);
}

function wtcDCHydrateChallenge_(test) {
  var maps = wtcDCAuthoringRows_('MCQ_TEST_QUESTION_MAP').filter(function(row){ return wtcDCNorm_(row.testId) === wtcDCNorm_(test.testId) && wtcDCVisible_(row); }).sort(function(a,b){ return Number(a.questionOrder||999)-Number(b.questionOrder||999); });
  var mcqs = wtcDCAuthoringRows_('MCQ_ENGINE'), byId = {};
  mcqs.forEach(function(row){ byId[wtcDCNorm_(row.mcqId)] = row; });
  var chapterRows = wtcDCRuntimeRows_('CHAPTER_MASTER'), chapterNames = {};
  chapterRows.forEach(function(row){ chapterNames[wtcDCNorm_(row.chapterId)] = row.chapterName || row.name || row.chapterId; });
  var answers = maps.map(function(map,index){
    var row = byId[wtcDCNorm_(map.mcqId)];
    if (!row || !wtcDCValidQuestion_(row)) throw new Error('A mapped Daily Challenge question is missing or invalid.');
    row = Object.assign({},row); row._publicQuestionId='Q-'+wtcDCHash_([test.testId,row.mcqId,index+1].join('|')).slice(0,18); return row;
  });
  var publicQuestions = answers.map(function(row){ return { id:row._publicQuestionId,chapterId:row.chapterId||'',chapterName:chapterNames[wtcDCNorm_(row.chapterId)]||'',topic:row.topic||'General',difficulty:row.difficulty||'Medium',text:row.questionText||'',options:{A:row.optionA||'',B:row.optionB||'',C:row.optionC||'',D:row.optionD||''} }; });
  var subject = wtcDCRuntimeRows_('SUBJECT_MASTER').find(function(row){ return wtcDCNorm_(row.subjectId) === wtcDCNorm_(test.subjectId); }) || {};
  var chapterIds = wtcDCParseList_(test.chapterIds || test.chapterId);
  return {
    challengeId:test.testId||'',testId:test.testId||'',testTitle:test.testTitle||'Daily Chapter Challenge',testType:'DAILY_CHALLENGE',
    board:test.board||'',className:test.className||'',medium:test.medium||'',subjectId:test.subjectId||'',subjectName:subject.subjectName||subject.name||test.subjectId||'',
    chapterId:test.primaryChapterId||test.chapterId||'',chapterIds:chapterIds,chapterNames:chapterIds.map(function(id){return chapterNames[wtcDCNorm_(id)]||id;}),
    challengeDate:test.challengeDate||'',challengeKey:test.challengeKey||'',opensAt:test.opensAt||'',closesAt:test.closesAt||'',durationMin:Number(test.durationMin||20),cleanupHours:Number(test.cleanupHours||24),
    questionCount:publicQuestions.length,instructions:test.instructions||'',questions:publicQuestions,_answerRows:answers
  };
}

function wtcDCLoadChallengeById_(student,challengeId) {
  var test = wtcDCAuthoringRows_('MCQ_TEST_ENGINE').find(function(row){ return wtcDCNorm_(row.testId)===wtcDCNorm_(challengeId) && wtcDCNorm_(row.testType)==='daily_challenge' && wtcDCVisible_(row); });
  if (!test) throw new Error('The Chapter Challenge definition was not found.');
  if (wtcDCNorm_(test.board)!==wtcDCNorm_(student.board)||wtcDCNorm_(test.className)!==wtcDCNorm_(student.className)||wtcDCNorm_(test.medium)!==wtcDCNorm_(student.medium)) throw new Error('This Chapter Challenge does not belong to the signed-in Student profile.');
  return wtcDCHydrateChallenge_(test);
}

function wtcDCScoreSubmission_(challenge,rawDetails) {
  var submitted;
  try { submitted = typeof rawDetails==='string'?JSON.parse(rawDetails||'[]'):(rawDetails||[]); } catch(error){ throw new Error('Attempt details are invalid.'); }
  if (!Array.isArray(submitted)) throw new Error('Attempt details are invalid.');
  var expected={},submittedMap={};
  challenge._answerRows.forEach(function(row){ expected[wtcDCNorm_(row._publicQuestionId)] = row; });
  submitted.forEach(function(item){ var id=wtcDCNorm_(item&&(item.questionId||item.mcqId)); if(!id||!expected[id])throw new Error('The submission contains a question outside today’s challenge.'); if(submittedMap[id])throw new Error('The submission contains a duplicate question.'); submittedMap[id]=item||{}; });
  var score=0,wrong=0,unanswered=0,topicStats={};
  challenge._answerRows.forEach(function(row){
    var item=submittedMap[wtcDCNorm_(row._publicQuestionId)]||{},selected=String(item.selectedOption||'').trim().toUpperCase(),correct=String(row.correctOption||'').trim().toUpperCase();
    if(selected&&['A','B','C','D'].indexOf(selected)<0)throw new Error('An invalid answer option was submitted.');
    var ok=!!selected&&selected===correct;if(!selected)unanswered++;else if(ok)score++;else wrong++;
    var topic=String(row.topic||'General').trim()||'General';if(!topicStats[topic])topicStats[topic]={correct:0,total:0};topicStats[topic].total++;if(ok)topicStats[topic].correct++;
  });
  var strong=[],weak=[];Object.keys(topicStats).forEach(function(topic){var s=topicStats[topic],p=s.total?Math.round(s.correct/s.total*100):0;if(p>=75)strong.push({topic:topic,p:p});if(p<60)weak.push({topic:topic,p:p});});
  strong.sort(function(a,b){return b.p-a.p;});weak.sort(function(a,b){return a.p-b.p;});
  return {score:score,total:challenge._answerRows.length,percent:Math.round(score/challenge._answerRows.length*100),wrongCount:wrong,unansweredCount:unanswered,strongTopics:strong.slice(0,4).map(function(x){return x.topic;}),weakTopics:weak.slice(0,4).map(function(x){return x.topic;})};
}

/* ============================ Temporary storage ========================== */

function wtcDCMaybeCleanup_() {
  var cache = CacheService.getScriptCache();
  if (cache.get('WTC_DC_LAST_CLEANUP')) return;
  cache.put('WTC_DC_LAST_CLEANUP', '1', 3600);
  cleanupDailyChallengeLiveData();
}

function cleanupDailyChallengeLiveData() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('DAILY_CHALLENGE_LIVE');
  if (!sheet || sheet.getLastRow()<2) return { success:true,deleted:0 };
  var rows = wtcDCRowsFromSheet_(sheet), nowMs=Date.now(), deleteRows=[];
  rows.forEach(function(row){ if(wtcDCTime_(row.expiresOn)&&wtcDCTime_(row.expiresOn)<=nowMs)deleteRows.push(row._row); });
  deleteRows.sort(function(a,b){return b-a;}).forEach(function(rowNo){sheet.deleteRow(rowNo);});
  return { success:true,deleted:deleteRows.length };
}

function wtcDCEnsureCleanupTrigger_() {
  try {
    var existing = ScriptApp.getProjectTriggers().some(function(trigger){ return trigger.getHandlerFunction()==='cleanupDailyChallengeLiveData'; });
    if (!existing) ScriptApp.newTrigger('cleanupDailyChallengeLiveData').timeBased().everyDays(1).atHour(2).create();
    return existing?'REUSED':'CREATED';
  } catch(error) { return 'MANUAL_REQUIRED: '+error.message; }
}

function wtcDCParticipantHash_(student, challengeId) {
  var salt = PropertiesService.getScriptProperties().getProperty('WTC_DAILY_CHALLENGE_SALT') || 'WTC-DAILY-CHALLENGE';
  return wtcDCHash_([salt,challengeId||wtcDCDate_(),student.studentId||'',wtcDCDigits_(student.mobile)].join('|'));
}
function wtcDCFindLive_(participantHash,challengeId) { return wtcDCRuntimeRows_('DAILY_CHALLENGE_LIVE').find(function(row){return wtcDCNorm_(row.participantHash)===wtcDCNorm_(participantHash)&&wtcDCNorm_(row.challengeId)===wtcDCNorm_(challengeId);})||null; }
function wtcDCPublicLiveResult_(row){return{score:Number(row.score||0),total:Number(row.total||20),percent:Number(row.percent||0),correctCount:Number(row.correctCount||0),wrongCount:Number(row.wrongCount||0),unansweredCount:Number(row.unansweredCount||0),totalTimeSec:Number(row.totalTimeSec||0),strongTopics:row.strongTopics||'',weakTopics:row.weakTopics||'',submittedAt:row.submittedAt||''};}

/* ================================ Security ================================ */

function wtcDCRequireStudent_(request) {
  if (typeof wtcTARequireStudent_==='function') return wtcTARequireStudent_(request||{});
  var studentId=wtcDCNorm_((request||{}).studentId||(request||{}).userId),mobile=wtcDCDigits_((request||{}).mobile);
  if(!studentId||!mobile)throw new Error('Student session identity is incomplete. Please log in again.');
  var student=wtcDCRuntimeRows_('STUDENT_MASTER').find(function(row){return wtcDCNorm_(row.studentId)===studentId&&wtcDCDigits_(row.mobile)===mobile;});
  if(!student||!wtcDCActive_(student))throw new Error('Student account could not be verified.');return student;
}
function wtcDCRequireAdmin_(request){ if(typeof wtcAdmissionRequireAdmin_==='function')return wtcAdmissionRequireAdmin_(request||{}); throw new Error('Admin verification module is not installed.'); }

/* ============================= Public payloads ============================ */

function wtcDCPublicChallenge_(c){return{challengeId:c.challengeId||'',testId:c.testId||'',testTitle:c.testTitle||'Daily Chapter Challenge',testType:'DAILY_CHALLENGE',board:c.board||'',className:c.className||'',medium:c.medium||'',subjectId:c.subjectId||'',subjectName:c.subjectName||'',chapterId:c.chapterId||'',chapterIds:c.chapterIds||[],chapterNames:c.chapterNames||[],challengeDate:c.challengeDate||'',opensAt:c.opensAt||'',closesAt:c.closesAt||'',durationMin:Number(c.durationMin||20),questionCount:Number(c.questionCount||20),instructions:c.instructions||'',progressImpact:'NONE',scoreRetention:'TEMPORARY_ONLY'};}
function wtcDCPublicConfig_(row){return{configId:row.testId||row.configId||'',board:row.board||'',className:row.className||'',medium:row.medium||'',subjectId:row.subjectId||'',chapterIds:wtcDCParseList_(row.chapterPool||row.chapterIds),rotationStartDate:row.rotationStartDate||'',durationMin:Number(row.durationMin||20),status:String(row.status||'').toUpperCase(),updatedAt:row.updatedAt||row.createdAt||''};}

/* ============================== Sheet helpers ============================= */

function wtcDCQuestionCounts_(){var counts={},seen={};wtcDCAuthoringRows_('MCQ_ENGINE').forEach(function(row){if(!wtcDCVisible_(row)||!wtcDCValidQuestion_(row))return;var unique=wtcDCNorm_(row.contentHash||row.mcqId||row.questionText),key=wtcDCNorm_(row.chapterId)+'|'+unique;if(seen[key])return;seen[key]=true;counts[wtcDCNorm_(row.chapterId)]=Number(counts[wtcDCNorm_(row.chapterId)]||0)+1;});return counts;}
function wtcDCOpenAuthoring_(){var id=PropertiesService.getScriptProperties().getProperty('WTC_AI_CONTENT_ENGINE_ID');if(!id)throw new Error('WTC_AI_CONTENT_ENGINE_ID is not configured in Runtime Script Properties.');try{return SpreadsheetApp.openById(id);}catch(error){throw new Error('Unable to open WTC_AI_CONTENT_ENGINE. Check permissions.');}}
function wtcDCRuntimeRows_(name){var sheet=SpreadsheetApp.getActiveSpreadsheet().getSheetByName(name);return(!sheet||sheet.getLastRow()<2)?[]:wtcDCRowsFromSheet_(sheet);}
function wtcDCAuthoringRows_(name){var sheet=wtcDCOpenAuthoring_().getSheetByName(name);return(!sheet||sheet.getLastRow()<2)?[]:wtcDCRowsFromSheet_(sheet);}
function wtcDCRowsFromSheet_(sheet){var values=sheet.getDataRange().getValues(),headers=(values[0]||[]).map(String);return values.slice(1).filter(function(row){return row.join('')!=='';}).map(function(row,index){var object={_row:index+2};headers.forEach(function(header,column){if(header)object[header]=row[column];});return object;});}
function wtcDCEnsureSheet_(ss,name,required){var sheet=ss.getSheetByName(name),created=false;if(!sheet){sheet=ss.insertSheet(name);created=true;}var existing=[];if(sheet.getLastRow()>0&&sheet.getLastColumn()>0)existing=sheet.getRange(1,1,1,sheet.getLastColumn()).getValues()[0].map(String);var added=[];required.forEach(function(header){if(existing.indexOf(header)<0){existing.push(header);added.push(header);}});if(existing.length){sheet.getRange(1,1,1,existing.length).setValues([existing]).setFontWeight('bold').setBackground('#0f172a').setFontColor('#fff');sheet.setFrozenRows(1);}return{sheet:name,created:created,addedColumns:added};}
function wtcDCAppendRuntime_(name,object){var sheet=SpreadsheetApp.getActiveSpreadsheet().getSheetByName(name);if(!sheet)throw new Error(name+' is missing. Run installChapterDailyChallengeSystem() once.');wtcDCAppendToSheet_(sheet,object);}
function wtcDCAppendToSheet_(sheet,object){var headers=sheet.getRange(1,1,1,sheet.getLastColumn()).getValues()[0].map(String);sheet.appendRow(headers.map(function(header){return object[header]===undefined?'':object[header];}));}
function wtcDCUpdateSheetRow_(sheet,rowNumber,patch){var headers=sheet.getRange(1,1,1,sheet.getLastColumn()).getValues()[0].map(String),values=sheet.getRange(rowNumber,1,1,headers.length).getValues()[0];Object.keys(patch||{}).forEach(function(key){var i=headers.indexOf(key);if(i>=0)values[i]=patch[key];});sheet.getRange(rowNumber,1,1,headers.length).setValues([values]);return true;}
function wtcDCUpdateRuntimeRow_(name,rowNumber,patch){var sheet=SpreadsheetApp.getActiveSpreadsheet().getSheetByName(name);return sheet&&rowNumber?wtcDCUpdateSheetRow_(sheet,rowNumber,patch):false;}
function wtcDCRecordMigration_(ss,row){wtcDCEnsureSheet_(ss,'MIGRATION_LOG',['migrationId','migrationKey','version','status','appliedAt','notes']);var sheet=ss.getSheetByName('MIGRATION_LOG'),existing=wtcDCRowsFromSheet_(sheet).find(function(item){return wtcDCNorm_(item.migrationKey)===wtcDCNorm_(row.migrationKey);});if(existing)return{reused:true,migrationId:existing.migrationId||row.migrationId};wtcDCAppendToSheet_(sheet,row);return{reused:false,migrationId:row.migrationId};}

/* =============================== Utilities ================================ */

function wtcDCVisible_(row){return WTC_DAILY_CHALLENGE_R1.VISIBLE_STATUSES.indexOf(wtcDCNorm_(row.status))>=0;}
function wtcDCActive_(row){return['blocked','inactive','no','false','archived','suspended'].indexOf(wtcDCNorm_(row.status||row.isActive||'active'))<0;}
function wtcDCValidQuestion_(row){return!!(String(row.mcqId||'').trim()&&String(row.questionText||'').trim()&&String(row.optionA||'').trim()&&String(row.optionB||'').trim()&&String(row.optionC||'').trim()&&String(row.optionD||'').trim()&&['A','B','C','D'].indexOf(String(row.correctOption||'').trim().toUpperCase())>=0);}
function wtcDCDifficulty_(value){var text=wtcDCNorm_(value);if(text.indexOf('easy')>=0||text.indexOf('simple')>=0)return'easy';if(text.indexOf('hard')>=0||text.indexOf('difficult')>=0||text.indexOf('advanced')>=0)return'hard';return'medium';}
function wtcDCParseList_(value){if(Array.isArray(value))return value.map(String).map(function(x){return x.trim();}).filter(Boolean);var text=String(value||'').trim();if(!text)return[];if(text.charAt(0)==='['){try{var parsed=JSON.parse(text);if(Array.isArray(parsed))return parsed.map(String).map(function(x){return x.trim();}).filter(Boolean);}catch(error){}}return text.split(',').map(function(x){return x.trim();}).filter(Boolean);}
function wtcDCText_(value,max){return String(value||'').replace(/[\u0000-\u001F\u007F]/g,' ').replace(/\s+/g,' ').trim().slice(0,max||200);}
function wtcDCDateValue_(value){var text=String(value||'').trim();if(!/^\d{4}-\d{2}-\d{2}$/.test(text))throw new Error('Date must use YYYY-MM-DD format.');return text;}
function wtcDCDate_(){return Utilities.formatDate(new Date(),'Asia/Kolkata','yyyy-MM-dd');}
function wtcDCNow_(){return Utilities.formatDate(new Date(),'Asia/Kolkata','yyyy-MM-dd HH:mm:ss');}
function wtcDCFormatDateTime_(date){return Utilities.formatDate(date,'Asia/Kolkata','yyyy-MM-dd HH:mm:ss');}
function wtcDCTime_(value){if(!value)return 0;if(value instanceof Date)return value.getTime();var raw=String(value).trim().replace(' ','T');if(!/[zZ]|[+\-]\d\d:\d\d$/.test(raw))raw+='+05:30';var date=new Date(raw);return isNaN(date.getTime())?0:date.getTime();}
function wtcDCNorm_(value){return String(value||'').trim().toLowerCase();}
function wtcDCDigits_(value){return String(value||'').replace(/\D/g,'');}
function wtcDCHash_(value){var bytes=Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,String(value||''),Utilities.Charset.UTF_8);return bytes.map(function(byte){var v=byte<0?byte+256:byte;return('0'+v.toString(16)).slice(-2);}).join('');}
function wtcDCNumericHash_(value){return parseInt(wtcDCHash_(value).slice(0,8),16)||0;}
