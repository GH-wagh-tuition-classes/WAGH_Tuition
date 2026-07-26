/* ============================================================================
   WAGH Tuition Classes — H1.3C Private Leaderboard, Controls & Analytics
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

var WTC_DAILY_CHALLENGE_R2 = {
  VERSION: 'H1.3C-v1.0',
  MIGRATION_KEY: 'HOME_DAILY_CHALLENGE_H1_3C_V1',
  QUESTION_COUNT: 20,
  DURATION_MIN: 20,
  CLEANUP_HOURS: 24,
  LEADERBOARD_MIN_COMPLETIONS: 5,
  LEADERBOARD_LIMIT: 10,
  SUSPICIOUS_MIN_TOTAL_SEC: 60,
  DEFAULT_OPEN_TIME: '06:00',
  DEFAULT_CLOSE_TIME: '23:59',
  TIMEZONE: 'Asia/Kolkata',
  CONFIG_TYPE: 'DAILY_CHALLENGE_CONFIG',
  CHALLENGE_TYPE: 'DAILY_CHALLENGE',
  VISIBLE_STATUSES: ['published','active','ready'],
  LIVE_HEADERS: [
    'liveId','challengeId','challengeDate','participantHash','attemptTokenHash',
    'attemptStatus','startedAt','expiresAt','submittedAt','score','total','percent',
    'correctCount','wrongCount','unansweredCount','totalTimeSec','strongTopics',
    'weakTopics','studentType','suspiciousFlag','suspiciousReason','reviewStatus',
    'rankedEligible','expiresOn','createdAt','updatedAt'
  ],
  PARTICIPATION_HEADERS: [
    'participationId','participantHash','challengeDate','challengeId','studentType',
    'completedAt','createdAt','updatedAt'
  ],
  AUTHORING_TEST_HEADERS: [
    'testId','mcqSetId','uploadId','chapterId','testTitle','testType','topic',
    'questionLabel','instructions','questionCount','sortOrder','status','createdAt',
    'updatedAt','board','className','medium','subjectId','challengeDate','challengeKey',
    'opensAt','closesAt','durationMin','generatedBy','configId','chapterPool',
    'chapterIds','primaryChapterId','rotationStartDate','selectionMode','allowGeneral',
    'allowWtc','cleanupHours','rotationItems','opensTime','closesTime','timezone',
    'subjectName','rotationItemId','challengeState','frozenAt','stateUpdatedAt',
    'stateUpdatedBy','stateNote'
  ],
  AUTHORING_MAP_HEADERS: ['mapId','testId','mcqId','questionOrder','status','createdAt','updatedAt']
};

function installDailyChallengeSystem(){ return installDailyChallengeLeaderboardSystem(); }
function installChapterDailyChallengeSystem(){ return installDailyChallengeLeaderboardSystem(); }
function installMultiSubjectChapterDailyChallengeSystem(){ return installDailyChallengeLeaderboardSystem(); }

/** Safe, additive and idempotent. Never clears academic or challenge data. */
function installDailyChallengeLeaderboardSystem() {
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) throw new Error('Another setup operation is running. Try again shortly.');
  try {
    var runtime = SpreadsheetApp.getActiveSpreadsheet();
    var live = wtcDCEnsureSheet_(runtime, 'DAILY_CHALLENGE_LIVE', WTC_DAILY_CHALLENGE_R2.LIVE_HEADERS);
    var participation = wtcDCEnsureSheet_(runtime, 'DAILY_CHALLENGE_PARTICIPATION', WTC_DAILY_CHALLENGE_R2.PARTICIPATION_HEADERS);
    var authoring = wtcDCOpenAuthoring_();
    var tests = wtcDCEnsureSheet_(authoring, 'MCQ_TEST_ENGINE', WTC_DAILY_CHALLENGE_R2.AUTHORING_TEST_HEADERS);
    var map = wtcDCEnsureSheet_(authoring, 'MCQ_TEST_QUESTION_MAP', WTC_DAILY_CHALLENGE_R2.AUTHORING_MAP_HEADERS);
    var props = PropertiesService.getScriptProperties();
    if (!props.getProperty('WTC_DAILY_CHALLENGE_SALT')) props.setProperty('WTC_DAILY_CHALLENGE_SALT', Utilities.getUuid() + Utilities.getUuid());
    var timezoneAudit = typeof installProjectDateTimeStandard === 'function' ? installProjectDateTimeStandard() : { success:true, timezone:WTC_DAILY_CHALLENGE_R2.TIMEZONE, warnings:['Install datetime.gs to run the complete project-time audit.'] };
    var configMigration = wtcDCMigrateLegacyConfigs_();
    var trigger = wtcDCEnsureCleanupTrigger_();
    var migration = wtcDCRecordMigration_(runtime, {
      migrationId:'MIG-' + wtcDCHash_(WTC_DAILY_CHALLENGE_R2.MIGRATION_KEY).slice(0,20),
      migrationKey:WTC_DAILY_CHALLENGE_R2.MIGRATION_KEY,
      version:WTC_DAILY_CHALLENGE_R2.VERSION,
      status:'APPLIED',
      appliedAt:wtcDCNow_(),
      notes:'Added private temporary leaderboard, anonymous participation streaks, challenge state controls, suspicious-attempt review and admin live analytics. Academic progress/result sheets remain untouched.'
    });
    return {
      success:true,
      version:WTC_DAILY_CHALLENGE_R2.VERSION,
      message:'Private Chapter Challenge Leaderboard H1.3C is ready.',
      timezone:WTC_DAILY_CHALLENGE_R2.TIMEZONE,
      serverDate:wtcDCDate_(),
      serverTime:wtcDCNow_(),
      runtime:{ dailyChallengeLive:live, dailyChallengeParticipation:participation },
      authoring:{ mcqTestEngine:tests, mcqTestQuestionMap:map },
      cleanupTrigger:trigger,
      configMigration:configMigration,
      timezoneAudit:timezoneAudit,
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
  result.note = 'H1.3C does not write to these sheets. Existing legacy rows are reported only and are not removed.';
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
  var state = resolved.windowState || 'OPEN';
  if (live) {
    var status = wtcDCNorm_(live.attemptStatus);
    if (status === 'completed') state = 'COMPLETED';
    else if (status === 'in_progress' && wtcDCTime_(live.expiresAt) > Date.now() && ['CLOSED','SUSPENDED'].indexOf(resolved.windowState) < 0) state = 'IN_PROGRESS';
    else if (status === 'expired') state = 'EXPIRED';
  }
  if (state === 'OPEN') state='AVAILABLE';
  var summary = wtcDCLeaderboardSummary_(resolved.challenge, student, live);
  return {
    success:true,
    phase:'H1.3C',
    available:true,
    state:state,
    challenge:wtcDCPublicChallenge_(resolved.challenge),
    result:state === 'COMPLETED' ? wtcDCPublicLiveResult_(live) : null,
    leaderboardSummary:summary,
    streak:wtcDCParticipationStats_(student),
    canStart:state === 'AVAILABLE' || state === 'IN_PROGRESS',
    progressImpact:'NONE',
    scoreRetention:'TEMPORARY_ONLY',
    timezone:WTC_DAILY_CHALLENGE_R2.TIMEZONE,
    serverTime:resolved.serverTime || wtcDCNow_()
  };
}

function studentGetDailyChallengeLeaderboard(d) {
  wtcDCMaybeCleanup_();
  var request=d||{}, student=wtcDCRequireStudent_(request), challengeId=String(request.challengeId||'').trim();
  var challenge;
  if (challengeId) challenge=wtcDCLoadChallengeById_(student,challengeId);
  else {
    var resolved=wtcDCResolveToday_(student);
    if(!resolved.available)return resolved;
    challenge=resolved.challenge;
  }
  var participantHash=wtcDCParticipantHash_(student,challenge.challengeId);
  var live=wtcDCFindLive_(participantHash,challenge.challengeId);
  var leaderboard=wtcDCBuildLeaderboard_(challenge,participantHash,wtcDCStudentDisplayName_(student));
  return {
    success:true,phase:'H1.3C',challenge:wtcDCPublicChallenge_(challenge),
    leaderboard:leaderboard,streak:wtcDCParticipationStats_(student),
    result:live&&wtcDCNorm_(live.attemptStatus)==='completed'?wtcDCPublicLiveResult_(live):null,
    progressImpact:'NONE',scoreRetention:'TEMPORARY_ONLY',timezone:WTC_DAILY_CHALLENGE_R2.TIMEZONE,serverTime:wtcDCNow_()
  };
}

function studentOpenDailyChallenge(d) {
  wtcDCMaybeCleanup_();
  var request = d || {};
  var student = wtcDCRequireStudent_(request);
  var resolved = wtcDCResolveToday_(student);
  if (!resolved.available) return resolved;
  if (resolved.windowState === 'DRAFT' || resolved.windowState === 'UPCOMING') return { success:false,code:'CHALLENGE_NOT_OPEN',message:'Today’s Chapter Challenge has not opened yet. It opens at '+wtcDCDisplayTime_(resolved.challenge.opensAt)+' IST.',timezone:WTC_DAILY_CHALLENGE_R2.TIMEZONE,serverTime:wtcDCNow_() };
  if (resolved.windowState === 'SUSPENDED') return { success:false,code:'CHALLENGE_SUSPENDED',message:'Today’s Chapter Challenge has been suspended by the Admin.',timezone:WTC_DAILY_CHALLENGE_R2.TIMEZONE,serverTime:wtcDCNow_() };
  if (resolved.windowState === 'CLOSED') return { success:false,code:'CHALLENGE_CLOSED',message:'Today’s Chapter Challenge is closed.',timezone:WTC_DAILY_CHALLENGE_R2.TIMEZONE,serverTime:wtcDCNow_() };
  var challenge = resolved.challenge;
  var participantHash = wtcDCParticipantHash_(student, challenge.challengeId);
  var live = wtcDCFindLive_(participantHash, challenge.challengeId);
  var nowMs = Date.now();

  if (live && wtcDCNorm_(live.attemptStatus) === 'completed') {
    return { success:true, phase:'H1.3C', completed:true, challenge:wtcDCPublicChallenge_(challenge), result:wtcDCPublicLiveResult_(live), leaderboard:wtcDCBuildLeaderboard_(challenge,participantHash,wtcDCStudentDisplayName_(student)), streak:wtcDCParticipationStats_(student),timezone:WTC_DAILY_CHALLENGE_R2.TIMEZONE,serverTime:wtcDCNow_() };
  }
  if (live && wtcDCTime_(live.expiresAt) <= nowMs) {
    wtcDCUpdateRuntimeRow_('DAILY_CHALLENGE_LIVE', live._row, { attemptStatus:'EXPIRED', updatedAt:wtcDCNow_() });
    return { success:false, code:'ATTEMPT_EXPIRED', message:'Today’s official Chapter Challenge attempt has expired.' };
  }

  var rawToken = Utilities.getUuid() + '-' + Utilities.getUuid();
  var tokenHash = wtcDCHash_(rawToken);
  if (!live) {
    var startedAt = wtcDCNow_();
    var durationEnd = nowMs + Number(challenge.durationMin || WTC_DAILY_CHALLENGE_R2.DURATION_MIN) * 60000;
    var expiresAtMs = Math.min(durationEnd, wtcDCTime_(challenge.closesAt));
    var expiresOnMs = wtcDCTime_(challenge.closesAt) + Number(challenge.cleanupHours || WTC_DAILY_CHALLENGE_R2.CLEANUP_HOURS) * 3600000;
    wtcDCAppendRuntime_('DAILY_CHALLENGE_LIVE', {
      liveId:'DCL-' + wtcDCHash_([participantHash, challenge.challengeId].join('|')).slice(0,24),
      challengeId:challenge.challengeId,
      challengeDate:challenge.challengeDate,
      participantHash:participantHash,
      attemptTokenHash:tokenHash,
      attemptStatus:'IN_PROGRESS',
      studentType:wtcDCStudentType_(student),
      suspiciousFlag:'NO',
      reviewStatus:'NOT_REQUIRED',
      rankedEligible:'NO',
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
    phase:'H1.3C',
    completed:false,
    attempt:{ attemptToken:rawToken, startedAt:live.startedAt || '', expiresAt:live.expiresAt || '', officialAttempt:true },
    challenge:wtcDCPublicChallenge_(challenge),
    questions:challenge.questions,
    progressImpact:'NONE',
    timezone:WTC_DAILY_CHALLENGE_R2.TIMEZONE,
    serverTime:wtcDCNow_()
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
    return { success:true,reused:true,phase:'H1.3C',result:wtcDCPublicLiveResult_(live),leaderboard:wtcDCBuildLeaderboard_(challenge,participantHash,wtcDCStudentDisplayName_(student)),streak:wtcDCParticipationStats_(student),answersAvailableAt:challenge.closesAt,reviewLocked:true };
  }
  if (wtcDCTime_(live.expiresAt) && Date.now() > wtcDCTime_(live.expiresAt) + 90000) {
    wtcDCUpdateRuntimeRow_('DAILY_CHALLENGE_LIVE', live._row, { attemptStatus:'EXPIRED', updatedAt:wtcDCNow_() });
    throw new Error('The official Chapter Challenge timer has expired.');
  }

  var scored = wtcDCScoreSubmission_(challenge, request.attemptDetails);
  var startedMs=wtcDCTime_(live.startedAt), elapsedCandidate=startedMs?Math.round((Date.now()-startedMs)/1000):(Number(request.totalTimeSec||0)||0), totalTimeSec=Math.max(0,Math.min(elapsedCandidate,Number(challenge.durationMin||20)*60+90));
  var suspicious=totalTimeSec < Number(WTC_DAILY_CHALLENGE_R2.SUSPICIOUS_MIN_TOTAL_SEC||60);
  var now = wtcDCNow_();
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) throw new Error('Another submission is being saved. Try again shortly.');
  try {
    live = wtcDCFindLive_(participantHash, challengeId);
    if (!live) throw new Error('The temporary challenge attempt has expired.');
    if (wtcDCNorm_(live.attemptStatus) === 'completed') return { success:true,reused:true,result:wtcDCPublicLiveResult_(live),leaderboard:wtcDCBuildLeaderboard_(challenge,participantHash,wtcDCStudentDisplayName_(student)),streak:wtcDCParticipationStats_(student),answersAvailableAt:challenge.closesAt,reviewLocked:true };
    wtcDCUpdateRuntimeRow_('DAILY_CHALLENGE_LIVE', live._row, {
      attemptStatus:'COMPLETED', submittedAt:now, score:scored.score, total:scored.total,
      percent:scored.percent, correctCount:scored.score, wrongCount:scored.wrongCount,
      unansweredCount:scored.unansweredCount, totalTimeSec:totalTimeSec,
      strongTopics:scored.strongTopics.join(', '), weakTopics:scored.weakTopics.join(', '),
      studentType:wtcDCStudentType_(student),suspiciousFlag:suspicious?'YES':'NO',
      suspiciousReason:suspicious?('Completed 20 questions in '+totalTimeSec+' seconds.'):'',
      reviewStatus:suspicious?'PENDING_REVIEW':'AUTO_APPROVED',rankedEligible:suspicious?'NO':'YES',updatedAt:now
    });
    wtcDCRecordParticipation_(student,challenge.challengeDate,challenge.challengeId,now);
    live=wtcDCFindLive_(participantHash,challengeId);
    var result=wtcDCPublicLiveResult_(live);
    var leaderboard=wtcDCBuildLeaderboard_(challenge,participantHash,wtcDCStudentDisplayName_(student));
    return {
      success:true,reused:false,phase:'H1.3C',result:result,leaderboard:leaderboard,streak:wtcDCParticipationStats_(student),
      answersAvailableAt:challenge.closesAt,reviewLocked:Date.now()<wtcDCTime_(challenge.closesAt),
      remainingAttempts:0,progressImpact:'NONE',scoreRetention:'TEMPORARY_ONLY',
      message:suspicious?'Result saved. Its leaderboard rank is pending Admin review because the completion time was unusually fast.':'Chapter Challenge result calculated. It is not added to academic progress.'
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
  var subjectNames = {};
  subjects.forEach(function(row){ subjectNames[wtcDCNorm_(row.subjectId)] = row.subjectName || row.subjectId; });
  var counts = wtcDCQuestionCounts_();
  var chapters = wtcDCRuntimeRows_('CHAPTER_MASTER').filter(wtcDCActive_).map(function(row){
    return { chapterId:row.chapterId || '', chapterName:row.chapterName || row.name || row.chapterId || '', subjectId:row.subjectId || '', subjectName:subjectNames[wtcDCNorm_(row.subjectId)] || row.subjectId || '', board:row.board || '', className:row.className || '', medium:row.medium || '', sortOrder:Number(row.sortOrder || row.chapterNo || 999), publishedMcqCount:Number(counts[wtcDCNorm_(row.chapterId)] || 0) };
  });
  var configs = wtcDCAuthoringRows_('MCQ_TEST_ENGINE').filter(function(row){ return wtcDCNorm_(row.testType) === wtcDCNorm_(WTC_DAILY_CHALLENGE_R2.CONFIG_TYPE); }).map(wtcDCPublicConfig_);
  return {
    success:true,
    phase:'H1.3C',
    timezone:WTC_DAILY_CHALLENGE_R2.TIMEZONE,
    timezoneLabel:'India Standard Time (IST)',
    serverDate:wtcDCDate_(),
    serverTime:wtcDCNow_(),
    subjects:subjects,
    chapters:chapters,
    configs:configs,
    todayAnalytics:wtcDCAdminAnalyticsForDate_(wtcDCDate_(),''),
    rules:{ questionCount:20, durationMin:20, scoreStorage:'Temporary anonymous live data only', progressImpact:'None', oneSubjectPerChallenge:true, sameSubjectFallbackOnly:true, leaderboardMinimum:WTC_DAILY_CHALLENGE_R2.LEADERBOARD_MIN_COMPLETIONS, suspiciousUnderSeconds:WTC_DAILY_CHALLENGE_R2.SUSPICIOUS_MIN_TOTAL_SEC }
  };
}

function adminSaveDailyChallengeConfig(d) {
  var request = d || {};
  var admin = wtcDCRequireAdmin_(request);
  var board = wtcDCText_(request.board,30).toUpperCase();
  var className = wtcDCText_(request.className,30);
  var medium = wtcDCText_(request.medium,40);
  var enabled = !['false','0','no','suspended'].includes(wtcDCNorm_(request.enabled));
  var rotationStartDate = wtcDCDateValue_(request.rotationStartDate || wtcDCDate_());
  var durationMin = Math.max(5, Math.min(60, Number(request.durationMin || 20) || 20));
  var opensTime = wtcDCTimeValue_(request.opensTime || WTC_DAILY_CHALLENGE_R2.DEFAULT_OPEN_TIME);
  var closesTime = wtcDCTimeValue_(request.closesTime || WTC_DAILY_CHALLENGE_R2.DEFAULT_CLOSE_TIME);
  if (!board || !className || !medium) throw new Error('Board, class and medium are required.');
  if (wtcDCTimeOfDayMinutes_(closesTime) <= wtcDCTimeOfDayMinutes_(opensTime)) throw new Error('Closing time must be later than opening time on the same IST date.');

  var rotationItems = wtcDCParseRotationItems_(request.rotationItems);
  if (!rotationItems.length) {
    var legacySubject = wtcDCText_(request.subjectId,100);
    var legacyChapters = wtcDCParseList_(request.chapterIds);
    rotationItems = legacyChapters.map(function(chapterId,index){ return { itemId:'DCI-'+wtcDCHash_([legacySubject,chapterId,index].join('|')).slice(0,16), subjectId:legacySubject, chapterId:chapterId, enabled:true, order:index+1 }; });
  }
  if (!rotationItems.length) throw new Error('Add at least one chapter to the rotation.');

  var subjectRows = wtcDCRuntimeRows_('SUBJECT_MASTER').filter(wtcDCActive_);
  var chapterRows = wtcDCRuntimeRows_('CHAPTER_MASTER').filter(wtcDCActive_);
  var subjects = {}, chapters = {};
  subjectRows.forEach(function(row){ subjects[wtcDCNorm_(row.subjectId)] = row; });
  chapterRows.forEach(function(row){ chapters[wtcDCNorm_(row.chapterId)] = row; });
  var counts = wtcDCQuestionCounts_(), seen = {}, normalized = [];
  rotationItems.sort(function(a,b){ return Number(a.order||999)-Number(b.order||999); }).forEach(function(item,index){
    var chapter = chapters[wtcDCNorm_(item.chapterId)], subject = subjects[wtcDCNorm_(item.subjectId)];
    if (!chapter || !subject) throw new Error('One or more selected chapters or subjects no longer exist.');
    if (wtcDCNorm_(chapter.subjectId) !== wtcDCNorm_(item.subjectId) || wtcDCNorm_(chapter.board) !== wtcDCNorm_(board) || wtcDCNorm_(chapter.className) !== wtcDCNorm_(className) || wtcDCNorm_(chapter.medium) !== wtcDCNorm_(medium)) throw new Error('Every selected chapter must belong to the chosen Board + Class + Medium group and its subject.');
    var unique = wtcDCNorm_(item.subjectId)+'|'+wtcDCNorm_(item.chapterId);
    if (seen[unique]) return;
    seen[unique] = true;
    normalized.push({
      itemId:item.itemId || ('DCI-'+wtcDCHash_([board,className,medium,item.subjectId,item.chapterId,index].join('|')).slice(0,18)),
      subjectId:String(item.subjectId),
      subjectName:subject.subjectName || subject.name || item.subjectId,
      chapterId:String(item.chapterId),
      chapterName:chapter.chapterName || chapter.name || item.chapterId,
      enabled:item.enabled !== false,
      order:normalized.length+1,
      publishedMcqCount:Number(counts[wtcDCNorm_(item.chapterId)] || 0)
    });
  });
  if (!normalized.some(function(item){return item.enabled;})) throw new Error('At least one rotation item must be enabled.');

  var subjectTotals = {};
  normalized.filter(function(item){return item.enabled;}).forEach(function(item){ subjectTotals[item.subjectId] = Number(subjectTotals[item.subjectId] || 0) + item.publishedMcqCount; });
  var warnings = [];
  Object.keys(subjectTotals).forEach(function(subjectId){ if(subjectTotals[subjectId] < 20) warnings.push((normalized.find(function(item){return item.subjectId===subjectId;})||{}).subjectName+' has fewer than 20 unique published MCQs across its selected chapters and will be skipped until more questions are published.'); });

  var sheet = wtcDCOpenAuthoring_().getSheetByName('MCQ_TEST_ENGINE');
  var configId = 'DCCFG-' + wtcDCHash_([board,className,medium].join('|')).slice(0,16);
  var now = wtcDCNow_();
  var row = wtcDCRowsFromSheet_(sheet).find(function(item){ return wtcDCNorm_(item.testId) === wtcDCNorm_(configId); });
  var payload = {
    testId:configId,configId:configId,testTitle:'Multi-Subject Chapter Daily Challenge Configuration',testType:WTC_DAILY_CHALLENGE_R2.CONFIG_TYPE,
    board:board,className:className,medium:medium,subjectId:'MULTI_SUBJECT',chapterPool:JSON.stringify(normalized.map(function(item){return item.chapterId;})),
    rotationItems:JSON.stringify(normalized),rotationStartDate:rotationStartDate,selectionMode:'MULTI_SUBJECT_AUTO_ROTATION',questionCount:20,durationMin:durationMin,
    opensTime:opensTime,closesTime:closesTime,timezone:WTC_DAILY_CHALLENGE_R2.TIMEZONE,
    status:enabled?'ACTIVE':'SUSPENDED',allowGeneral:'YES',allowWtc:'YES',cleanupHours:24,
    generatedBy:admin.adminId || admin.mobile || 'Admin',updatedAt:now
  };
  if (row) wtcDCUpdateSheetRow_(sheet,row._row,payload);
  else { payload.createdAt=now; wtcDCAppendToSheet_(sheet,payload); }
  var publicConfig = wtcDCPublicConfig_(Object.assign({},row||{},payload));
  return { success:true,message:enabled?'Multi-subject chapter rotation saved.':'Chapter Challenge rotation suspended.',config:publicConfig,warnings:warnings,subjectTotals:subjectTotals,timezone:WTC_DAILY_CHALLENGE_R2.TIMEZONE,serverTime:wtcDCNow_() };
}

function adminPrepareDailyChallenge(d) {
  var request = d || {};
  wtcDCRequireAdmin_(request);
  var configId = String(request.configId || '').trim();
  var dateKey = wtcDCDateValue_(request.challengeDate || wtcDCDate_());
  var config = wtcDCAuthoringRows_('MCQ_TEST_ENGINE').find(function(row){ return wtcDCNorm_(row.testId) === wtcDCNorm_(configId) && wtcDCNorm_(row.testType) === wtcDCNorm_(WTC_DAILY_CHALLENGE_R2.CONFIG_TYPE); });
  if (!config) throw new Error('Daily Challenge configuration was not found.');
  var challenge = wtcDCEnsureChallengeFromConfig_(config,dateKey);
  return {
    success:true,
    message:'The chapter challenge is frozen for '+wtcDCDisplayDate_(dateKey)+' (IST).',
    timezone:WTC_DAILY_CHALLENGE_R2.TIMEZONE,
    serverTime:wtcDCNow_(),
    challenge:wtcDCPublicChallenge_(challenge),
    analytics:wtcDCAdminChallengeAnalytics_(challenge),
    preview:challenge.questions.map(function(q,index){ return { questionNo:index+1,subjectName:challenge.subjectName,chapterName:q.chapterName,topic:q.topic,difficulty:q.difficulty,text:q.text }; })
  };
}


function adminGetDailyChallengeAnalytics(d) {
  var request=d||{};wtcDCRequireAdmin_(request);cleanupDailyChallengeLiveData();
  var dateKey=wtcDCDateValue_(request.challengeDate||wtcDCDate_());
  return {success:true,phase:'H1.3C',date:dateKey,dateDisplay:wtcDCDisplayDate_(dateKey),analytics:wtcDCAdminAnalyticsForDate_(dateKey,String(request.configId||'')),timezone:WTC_DAILY_CHALLENGE_R2.TIMEZONE,serverTime:wtcDCNow_()};
}

function adminSetDailyChallengeState(d) {
  var request=d||{},admin=wtcDCRequireAdmin_(request),challengeId=String(request.challengeId||'').trim(),state=String(request.challengeState||request.state||'').trim().toUpperCase();
  if(!challengeId)throw new Error('Challenge ID is required.');
  if(['DRAFT','OPEN','CLOSED','SUSPENDED'].indexOf(state)<0)throw new Error('Challenge state must be Draft, Open, Closed or Suspended.');
  var sheet=wtcDCOpenAuthoring_().getSheetByName('MCQ_TEST_ENGINE');
  var row=wtcDCRowsFromSheet_(sheet).find(function(item){return wtcDCNorm_(item.testId)===wtcDCNorm_(challengeId)&&wtcDCNorm_(item.testType)==='daily_challenge';});
  if(!row)throw new Error('Chapter Challenge was not found.');
  var now=wtcDCNow_();
  wtcDCUpdateSheetRow_(sheet,row._row,{challengeState:state,stateUpdatedAt:now,stateUpdatedBy:admin.adminId||admin.mobile||'Admin',stateNote:wtcDCText_(request.note,200),updatedAt:now});
  row=wtcDCRowsFromSheet_(sheet).find(function(item){return wtcDCNorm_(item.testId)===wtcDCNorm_(challengeId);});
  var challenge=wtcDCHydrateChallenge_(row);
  return {success:true,message:'Challenge state changed to '+state+'.',challenge:wtcDCPublicChallenge_(challenge),analytics:wtcDCAdminChallengeAnalytics_(challenge),timezone:WTC_DAILY_CHALLENGE_R2.TIMEZONE,serverTime:wtcDCNow_()};
}

function adminReviewDailyChallengeAttempt(d) {
  var request=d||{};wtcDCRequireAdmin_(request);
  var liveId=String(request.liveId||'').trim(),decision=String(request.decision||'').trim().toUpperCase();
  if(!liveId)throw new Error('Temporary attempt ID is required.');
  if(['APPROVED','EXCLUDED'].indexOf(decision)<0)throw new Error('Review decision must be APPROVED or EXCLUDED.');
  var row=wtcDCRuntimeRows_('DAILY_CHALLENGE_LIVE').find(function(item){return wtcDCNorm_(item.liveId)===wtcDCNorm_(liveId);});
  if(!row)throw new Error('Temporary challenge attempt is no longer available.');
  wtcDCUpdateRuntimeRow_('DAILY_CHALLENGE_LIVE',row._row,{reviewStatus:decision,rankedEligible:decision==='APPROVED'?'YES':'NO',updatedAt:wtcDCNow_()});
  var challengeRow=wtcDCAuthoringRows_('MCQ_TEST_ENGINE').find(function(item){return wtcDCNorm_(item.testId)===wtcDCNorm_(row.challengeId);});
  var challenge=challengeRow?wtcDCHydrateChallenge_(challengeRow):{challengeId:row.challengeId,challengeDate:row.challengeDate};
  return {success:true,message:decision==='APPROVED'?'Attempt approved for ranking.':'Attempt excluded from ranking.',analytics:wtcDCAdminChallengeAnalytics_(challenge),timezone:WTC_DAILY_CHALLENGE_R2.TIMEZONE,serverTime:wtcDCNow_()};
}

/* ========================= Challenge orchestration ======================== */

function wtcDCResolveToday_(student) {
  var dateKey = wtcDCDate_();
  var config = wtcDCAuthoringRows_('MCQ_TEST_ENGINE').filter(function(row){
    return wtcDCNorm_(row.testType) === wtcDCNorm_(WTC_DAILY_CHALLENGE_R2.CONFIG_TYPE) && wtcDCNorm_(row.status) === 'active' &&
      wtcDCNorm_(row.board) === wtcDCNorm_(student.board) && wtcDCNorm_(row.className) === wtcDCNorm_(student.className) && wtcDCNorm_(row.medium) === wtcDCNorm_(student.medium);
  }).sort(function(a,b){ return String(b.updatedAt || b.createdAt || '').localeCompare(String(a.updatedAt || a.createdAt || '')); })[0];
  if (!config) return { success:true,phase:'H1.3C',available:false,state:'UNAVAILABLE',message:'The Admin has not activated a Chapter Challenge for this board, class and medium yet.',timezone:WTC_DAILY_CHALLENGE_R2.TIMEZONE,serverTime:wtcDCNow_() };
  try {
    var challenge = wtcDCEnsureChallengeFromConfig_(config,dateKey);
    var windowState=wtcDCEffectiveChallengeState_(challenge,Date.now());
    return { success:true,available:true,challenge:challenge,windowState:windowState,timezone:WTC_DAILY_CHALLENGE_R2.TIMEZONE,serverTime:wtcDCNow_() };
  } catch(error) {
    return { success:true,phase:'H1.3C',available:false,state:'UNAVAILABLE',message:error.message || 'Today’s Chapter Challenge is not ready.',timezone:WTC_DAILY_CHALLENGE_R2.TIMEZONE,serverTime:wtcDCNow_() };
  }
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
    var selection = wtcDCSelectRotation_(config,dateKey);
    var questions = wtcDCBuildQuestionSet_(selection.chapterIds,challengeKey);
    if (questions.length !== 20) throw new Error('The selected same-subject chapters do not currently contain 20 valid unique published MCQs.');
    var now = wtcDCNow_();
    var opensTime = wtcDCTimeValue_(config.opensTime || WTC_DAILY_CHALLENGE_R2.DEFAULT_OPEN_TIME);
    var closesTime = wtcDCTimeValue_(config.closesTime || WTC_DAILY_CHALLENGE_R2.DEFAULT_CLOSE_TIME);
    var openTime = wtcDCDateTime_(dateKey,opensTime);
    var closeTime = wtcDCDateTime_(dateKey,closesTime,true);
    var title = selection.subjectName + ': ' + selection.chapterNames.join(' + ') + ' — Daily Chapter Challenge';
    wtcDCAppendToSheet_(testSheet, {
      testId:challengeId,configId:config.testId || config.configId || '',chapterId:selection.primaryChapterId,
      chapterIds:JSON.stringify(selection.chapterIds),testTitle:title,testType:WTC_DAILY_CHALLENGE_R2.CHALLENGE_TYPE,
      topic:'Chapter Challenge',questionLabel:'Daily 20 MCQ',instructions:'Attempt all 20 questions. This challenge is separate from academic progress and its score is retained only temporarily.',
      questionCount:20,status:'PUBLISHED',createdAt:now,updatedAt:now,board:config.board || '',className:config.className || '',
      medium:config.medium || '',subjectId:selection.subjectId,subjectName:selection.subjectName,challengeDate:dateKey,challengeKey:challengeKey,
      opensAt:openTime,closesAt:closeTime,opensTime:opensTime,closesTime:closesTime,timezone:WTC_DAILY_CHALLENGE_R2.TIMEZONE,
      durationMin:Number(config.durationMin || 20),generatedBy:'H1.3C',primaryChapterId:selection.primaryChapterId,
      rotationItemId:selection.rotationItemId,selectionMode:'MULTI_SUBJECT_ADMIN_ROTATION',allowGeneral:'YES',allowWtc:'YES',cleanupHours:24,
      challengeState:'DRAFT',frozenAt:now,stateUpdatedAt:now,stateUpdatedBy:'SYSTEM',stateNote:'Automatically opens at the configured IST opening time.'
    });
    questions.forEach(function(row,index){
      wtcDCAppendToSheet_(mapSheet,{ mapId:'DCM-'+wtcDCHash_([challengeId,row.mcqId].join('|')).slice(0,22),testId:challengeId,mcqId:row.mcqId,questionOrder:index+1,status:'PUBLISHED',createdAt:now,updatedAt:now });
    });
    existing = wtcDCRowsFromSheet_(testSheet).find(function(row){ return wtcDCNorm_(row.testId) === wtcDCNorm_(challengeId); });
    return wtcDCHydrateChallenge_(existing);
  } finally { lock.releaseLock(); }
}

function wtcDCSelectRotation_(config,dateKey) {
  var pool = wtcDCConfigRotationItems_(config).filter(function(item){return item.enabled!==false;});
  if (!pool.length) throw new Error('No enabled chapters are selected in the active challenge rotation.');
  var chapterRows = wtcDCRuntimeRows_('CHAPTER_MASTER'), subjectRows=wtcDCRuntimeRows_('SUBJECT_MASTER');
  var chapterById = {}, subjectById={};
  chapterRows.forEach(function(row){ chapterById[wtcDCNorm_(row.chapterId)] = row; });
  subjectRows.forEach(function(row){ subjectById[wtcDCNorm_(row.subjectId)] = row; });
  pool = pool.filter(function(item){
    var chapter=chapterById[wtcDCNorm_(item.chapterId)];
    return !!chapter && wtcDCNorm_(chapter.subjectId)===wtcDCNorm_(item.subjectId);
  });
  if (!pool.length) throw new Error('The configured chapters are no longer available in CHAPTER_MASTER.');
  var counts = wtcDCQuestionCounts_();
  var start = wtcDCDateValue_(config.rotationStartDate || dateKey);
  var dayOffset = wtcDCDayDiff_(start,dateKey);
  if(dayOffset<0)throw new Error('The challenge rotation starts on '+wtcDCDisplayDate_(start)+' (IST).');
  var primaryIndex = dayOffset % pool.length;

  for (var candidateStep=0; candidateStep<pool.length; candidateStep++) {
    var candidateIndex=(primaryIndex+candidateStep)%pool.length;
    var primary=pool[candidateIndex], selected=[], total=0;
    for (var sameStep=0; sameStep<pool.length; sameStep++) {
      var item=pool[(candidateIndex+sameStep)%pool.length];
      if (wtcDCNorm_(item.subjectId)!==wtcDCNorm_(primary.subjectId)) continue;
      var count=Number(counts[wtcDCNorm_(item.chapterId)]||0);
      if (!count) continue;
      selected.push(item); total+=count;
      if (total>=20) break;
    }
    if (total>=20) {
      var subject=subjectById[wtcDCNorm_(primary.subjectId)]||{};
      return {
        rotationItemId:primary.itemId||'',
        subjectId:primary.subjectId,
        subjectName:primary.subjectName||subject.subjectName||subject.name||primary.subjectId,
        primaryChapterId:selected[0].chapterId,
        chapterIds:selected.map(function(item){return item.chapterId;}),
        chapterNames:selected.map(function(item){var row=chapterById[wtcDCNorm_(item.chapterId)]||{};return item.chapterName||row.chapterName||row.name||item.chapterId;})
      };
    }
  }
  throw new Error('No enabled subject in this rotation currently has 20 unique Published MCQs across its selected chapters.');
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
    challengeId:test.testId||'',testId:test.testId||'',configId:test.configId||'',testTitle:test.testTitle||'Daily Chapter Challenge',testType:'DAILY_CHALLENGE',
    board:test.board||'',className:test.className||'',medium:test.medium||'',subjectId:test.subjectId||'',subjectName:test.subjectName||subject.subjectName||subject.name||test.subjectId||'',
    chapterId:test.primaryChapterId||test.chapterId||'',chapterIds:chapterIds,chapterNames:chapterIds.map(function(id){return chapterNames[wtcDCNorm_(id)]||id;}),
    challengeDate:test.challengeDate||'',challengeKey:test.challengeKey||'',opensAt:test.opensAt||'',closesAt:test.closesAt||'',opensTime:test.opensTime||'',closesTime:test.closesTime||'',timezone:test.timezone||WTC_DAILY_CHALLENGE_R2.TIMEZONE,durationMin:Number(test.durationMin||20),cleanupHours:Number(test.cleanupHours||24),
    questionCount:publicQuestions.length,instructions:test.instructions||'',challengeState:String(test.challengeState||'DRAFT').toUpperCase(),frozenAt:test.frozenAt||test.createdAt||'',stateUpdatedAt:test.stateUpdatedAt||'',stateNote:test.stateNote||'',questions:publicQuestions,_answerRows:answers
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
    if (!existing) ScriptApp.newTrigger('cleanupDailyChallengeLiveData').timeBased().everyHours(6).create();
    return existing?'REUSED':'CREATED';
  } catch(error) { return 'MANUAL_REQUIRED: '+error.message; }
}

function wtcDCParticipantHash_(student, challengeId) {
  var salt = PropertiesService.getScriptProperties().getProperty('WTC_DAILY_CHALLENGE_SALT') || 'WTC-DAILY-CHALLENGE';
  return wtcDCHash_([salt,challengeId||wtcDCDate_(),student.studentId||'',wtcDCDigits_(student.mobile)].join('|'));
}
function wtcDCFindLive_(participantHash,challengeId) { return wtcDCRuntimeRows_('DAILY_CHALLENGE_LIVE').find(function(row){return wtcDCNorm_(row.participantHash)===wtcDCNorm_(participantHash)&&wtcDCNorm_(row.challengeId)===wtcDCNorm_(challengeId);})||null; }
function wtcDCPublicLiveResult_(row){return{score:Number(row.score||0),total:Number(row.total||20),percent:Number(row.percent||0),correctCount:Number(row.correctCount||0),wrongCount:Number(row.wrongCount||0),unansweredCount:Number(row.unansweredCount||0),totalTimeSec:Number(row.totalTimeSec||0),strongTopics:row.strongTopics||'',weakTopics:row.weakTopics||'',submittedAt:row.submittedAt||'',rankedEligible:wtcDCNorm_(row.rankedEligible)==='yes',reviewStatus:String(row.reviewStatus||'NOT_REQUIRED'),suspicious:wtcDCNorm_(row.suspiciousFlag)==='yes'};}


/* =================== Private leaderboard and participation ================== */

function wtcDCEffectiveChallengeState_(challenge,nowMs) {
  var configured=String((challenge||{}).challengeState||'DRAFT').toUpperCase();
  if(configured==='SUSPENDED'||configured==='CLOSED')return configured;
  var now=Number(nowMs||Date.now()),opens=wtcDCTime_((challenge||{}).opensAt),closes=wtcDCTime_((challenge||{}).closesAt);
  if(configured==='OPEN')return closes&&now>closes?'CLOSED':'OPEN';
  if(opens&&now<opens)return'DRAFT';
  if(closes&&now>closes)return'CLOSED';
  return'OPEN';
}

function wtcDCStudentDisplayName_(student){return String((student||{}).studentName||(student||{}).name||(student||{}).fullName||'You').trim()||'You';}
function wtcDCStudentType_(student){var value=wtcDCNorm_((student||{}).studentType||(student||{}).accessType||(student||{}).plan||(student||{}).category);return value.indexOf('wtc')>=0||value.indexOf('premium')>=0?'WTC_STUDENT':'GENERAL_STUDENT';}
function wtcDCStableParticipantHash_(student){var salt=PropertiesService.getScriptProperties().getProperty('WTC_DAILY_CHALLENGE_SALT')||'WTC-DAILY-CHALLENGE';return wtcDCHash_([salt,'PARTICIPATION',student.studentId||'',wtcDCDigits_(student.mobile)].join('|'));}

function wtcDCRecordParticipation_(student,dateKey,challengeId,completedAt){
  var hash=wtcDCStableParticipantHash_(student),date=wtcDCDateValue_(dateKey),id='DCP-'+wtcDCHash_([hash,date].join('|')).slice(0,24);
  var existing=wtcDCRuntimeRows_('DAILY_CHALLENGE_PARTICIPATION').find(function(row){return wtcDCNorm_(row.participationId)===wtcDCNorm_(id);});
  if(existing)return existing;
  wtcDCAppendRuntime_('DAILY_CHALLENGE_PARTICIPATION',{participationId:id,participantHash:hash,challengeDate:date,challengeId:challengeId||'',studentType:wtcDCStudentType_(student),completedAt:completedAt||wtcDCNow_(),createdAt:completedAt||wtcDCNow_(),updatedAt:completedAt||wtcDCNow_()});
  return true;
}

function wtcDCParticipationStats_(student){
  var hash=wtcDCStableParticipantHash_(student),dates={};
  wtcDCRuntimeRows_('DAILY_CHALLENGE_PARTICIPATION').forEach(function(row){if(wtcDCNorm_(row.participantHash)===wtcDCNorm_(hash)&&row.challengeDate)dates[wtcDCDateValue_(row.challengeDate)]=true;});
  var keys=Object.keys(dates).sort(),best=0,current=0,run=0,prev='';
  keys.forEach(function(key){if(prev&&wtcDCDayDiff_(prev,key)===1)run++;else run=1;if(run>best)best=run;prev=key;});
  var today=wtcDCDate_(),last=keys.length?keys[keys.length-1]:'',cursor=(last&&wtcDCDayDiff_(last,today)<=1)?last:'';
  while(cursor&&dates[cursor]){current++;cursor=typeof wtcProjectAddDays_==='function'?wtcProjectAddDays_(cursor,-1):wtcDCFormatDateTime_(new Date(wtcDCTime_(cursor)-86400000)).slice(0,10);}
  return{currentStreak:current,bestStreak:best,completedDays:keys.length,lastCompletedDate:last,scoreHistoryStored:false,progressImpact:'NONE'};
}

function wtcDCChallengeLiveRows_(challengeId){return wtcDCRuntimeRows_('DAILY_CHALLENGE_LIVE').filter(function(row){return wtcDCNorm_(row.challengeId)===wtcDCNorm_(challengeId);});}
function wtcDCRankEligible_(row){if(wtcDCNorm_(row.attemptStatus)!=='completed')return false;var review=wtcDCNorm_(row.reviewStatus),suspicious=wtcDCNorm_(row.suspiciousFlag),ranked=wtcDCNorm_(row.rankedEligible);if(review==='excluded')return false;if(suspicious==='yes'&&review!=='approved')return false;if(!review&&!suspicious&&!ranked)return true;return ranked==='yes'||review==='approved'||review==='auto_approved';}
function wtcDCSortRankRows_(rows){return rows.slice().sort(function(a,b){return Number(b.score||0)-Number(a.score||0)||Number(a.wrongCount||0)-Number(b.wrongCount||0)||Number(a.totalTimeSec||0)-Number(b.totalTimeSec||0)||wtcDCTime_(a.submittedAt)-wtcDCTime_(b.submittedAt);});}

function wtcDCBuildLeaderboard_(challenge,selfHash,selfName){
  var all=wtcDCChallengeLiveRows_(challenge.challengeId),completed=all.filter(function(row){return wtcDCNorm_(row.attemptStatus)==='completed';}),eligible=wtcDCSortRankRows_(completed.filter(wtcDCRankEligible_));
  var visible=eligible.length>=Number(WTC_DAILY_CHALLENGE_R2.LEADERBOARD_MIN_COMPLETIONS||5),ranked=[];
  eligible.forEach(function(row,index){ranked.push({rank:index+1,participantHash:row.participantHash,score:Number(row.score||0),total:Number(row.total||20),percent:Number(row.percent||0),wrongCount:Number(row.wrongCount||0),totalTimeSec:Number(row.totalTimeSec||0),submittedAt:row.submittedAt||''});});
  var top=ranked.slice(0,Number(WTC_DAILY_CHALLENGE_R2.LEADERBOARD_LIMIT||10)),self=ranked.find(function(row){return wtcDCNorm_(row.participantHash)===wtcDCNorm_(selfHash);})||null;
  if(self&&!top.some(function(row){return row.rank===self.rank;}))top.push(self);
  var rows=visible?top.map(function(row){var isSelf=wtcDCNorm_(row.participantHash)===wtcDCNorm_(selfHash);return{rank:row.rank,label:isSelf?(selfName+' — You'):'Hidden Student',isSelf:isSelf,score:row.score,total:row.total,percent:row.percent,totalTimeSec:row.totalTimeSec,submittedAt:row.submittedAt};}):[];
  return{visible:visible,minimumCompletions:Number(WTC_DAILY_CHALLENGE_R2.LEADERBOARD_MIN_COMPLETIONS||5),startedCount:all.length,completedCount:completed.length,rankedCount:eligible.length,flaggedCount:completed.filter(function(row){return wtcDCNorm_(row.suspiciousFlag)==='yes'&&wtcDCNorm_(row.reviewStatus)!=='approved';}).length,rows:rows,self:visible&&self?{rank:self.rank,label:selfName+' — You',isSelf:true,score:self.score,total:self.total,percent:self.percent,totalTimeSec:self.totalTimeSec}:null,privacy:'Only your name is shown. Every other participant is labelled Hidden Student.',temporary:true};
}
function wtcDCLeaderboardSummary_(challenge,student,live){var board=wtcDCBuildLeaderboard_(challenge,wtcDCParticipantHash_(student,challenge.challengeId),wtcDCStudentDisplayName_(student));return{visible:board.visible,startedCount:board.startedCount,completedCount:board.completedCount,rankedCount:board.rankedCount,flaggedCount:board.flaggedCount,selfRank:board.self?board.self.rank:null,minimumCompletions:board.minimumCompletions};}

function wtcDCAdminChallengeAnalytics_(challenge){
  var rows=wtcDCChallengeLiveRows_(challenge.challengeId),completed=rows.filter(function(row){return wtcDCNorm_(row.attemptStatus)==='completed';}),eligible=wtcDCSortRankRows_(completed.filter(wtcDCRankEligible_));
  var scores=eligible.map(function(row){return Number(row.percent||0);});
  return{challenge:wtcDCPublicChallenge_(challenge),startedCount:rows.length,inProgressCount:rows.filter(function(row){return wtcDCNorm_(row.attemptStatus)==='in_progress';}).length,completedCount:completed.length,rankedCount:eligible.length,flaggedCount:completed.filter(function(row){return wtcDCNorm_(row.suspiciousFlag)==='yes'&&wtcDCNorm_(row.reviewStatus)!=='approved';}).length,averagePercent:scores.length?Math.round(scores.reduce(function(a,b){return a+b;},0)/scores.length):0,leaderboard:eligible.slice(0,10).map(function(row,index){return{rank:index+1,label:'Hidden Student',score:Number(row.score||0),total:Number(row.total||20),percent:Number(row.percent||0),totalTimeSec:Number(row.totalTimeSec||0),submittedAt:row.submittedAt||''};}),flaggedAttempts:completed.filter(function(row){return wtcDCNorm_(row.suspiciousFlag)==='yes'&&['approved','excluded'].indexOf(wtcDCNorm_(row.reviewStatus))<0;}).map(function(row){return{liveId:row.liveId||'',label:'Hidden Student',score:Number(row.score||0),total:Number(row.total||20),percent:Number(row.percent||0),totalTimeSec:Number(row.totalTimeSec||0),reason:row.suspiciousReason||'Unusually fast completion.',submittedAt:row.submittedAt||'',reviewStatus:row.reviewStatus||'PENDING_REVIEW'};}),scoreStorage:'Temporary only',progressImpact:'None'};
}
function wtcDCAdminAnalyticsForDate_(dateKey,configId){
  var tests=wtcDCAuthoringRows_('MCQ_TEST_ENGINE').filter(function(row){
    try {
      return wtcDCNorm_(row.testType)==='daily_challenge'&&wtcDCDateValue_(row.challengeDate||'')===dateKey&&(!configId||wtcDCNorm_(row.configId)===wtcDCNorm_(configId));
    } catch(error) {
      return false;
    }
  });
  var analytics=[],errors=[];
  tests.forEach(function(row){
    try {
      analytics.push(wtcDCAdminChallengeAnalytics_(wtcDCHydrateChallenge_(row)));
    } catch(error) {
      errors.push({
        challengeId:String(row.challengeId||row.testId||''),
        testTitle:String(row.testTitle||'Daily Chapter Challenge'),
        message:wtcDCText_(error&&error.message?error.message:error,240)
      });
    }
  });
  analytics.errors=errors;
  return analytics;
}

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

function wtcDCPublicChallenge_(c){var effective=wtcDCEffectiveChallengeState_(c,Date.now());return{challengeId:c.challengeId||'',testId:c.testId||'',configId:c.configId||'',testTitle:c.testTitle||'Daily Chapter Challenge',testType:'DAILY_CHALLENGE',board:c.board||'',className:c.className||'',medium:c.medium||'',subjectId:c.subjectId||'',subjectName:c.subjectName||'',chapterId:c.chapterId||'',chapterIds:c.chapterIds||[],chapterNames:c.chapterNames||[],challengeDate:c.challengeDate||'',challengeDateDisplay:wtcDCDisplayDate_(c.challengeDate||''),opensAt:c.opensAt||'',closesAt:c.closesAt||'',opensAtDisplay:wtcDCDisplayDateTime_(c.opensAt||''),closesAtDisplay:wtcDCDisplayDateTime_(c.closesAt||''),durationMin:Number(c.durationMin||20),questionCount:Number(c.questionCount||20),instructions:c.instructions||'',challengeState:effective,configuredState:String(c.challengeState||'DRAFT').toUpperCase(),frozenAt:c.frozenAt||'',timezone:c.timezone||WTC_DAILY_CHALLENGE_R2.TIMEZONE,timezoneLabel:'India Standard Time (IST)',progressImpact:'NONE',scoreRetention:'TEMPORARY_ONLY'};}
function wtcDCPublicConfig_(row){var items=wtcDCConfigRotationItems_(row);return{configId:row.testId||row.configId||'',board:row.board||'',className:row.className||'',medium:row.medium||'',subjectId:row.subjectId||'',chapterIds:items.map(function(item){return item.chapterId;}),rotationItems:items,rotationStartDate:row.rotationStartDate?wtcDCDateValue_(row.rotationStartDate):'',durationMin:Number(row.durationMin||20),opensTime:wtcDCTimeValue_(row.opensTime||WTC_DAILY_CHALLENGE_R2.DEFAULT_OPEN_TIME),closesTime:wtcDCTimeValue_(row.closesTime||WTC_DAILY_CHALLENGE_R2.DEFAULT_CLOSE_TIME),timezone:row.timezone||WTC_DAILY_CHALLENGE_R2.TIMEZONE,status:String(row.status||'').toUpperCase(),updatedAt:row.updatedAt||row.createdAt||''};}


function wtcDCParseRotationItems_(value) {
  var raw=value;
  if (typeof raw==='string') {
    var text=raw.trim();
    if (!text) return [];
    try { raw=JSON.parse(text); } catch(error) { throw new Error('Rotation items are invalid JSON.'); }
  }
  if (!Array.isArray(raw)) return [];
  return raw.map(function(item,index){
    item=item||{};
    return {
      itemId:String(item.itemId||item.id||''),
      subjectId:String(item.subjectId||''),
      subjectName:String(item.subjectName||''),
      chapterId:String(item.chapterId||''),
      chapterName:String(item.chapterName||''),
      enabled:!(item.enabled===false||wtcDCNorm_(item.enabled)==='false'||wtcDCNorm_(item.status)==='disabled'),
      order:Number(item.order||index+1),
      publishedMcqCount:Number(item.publishedMcqCount||0)
    };
  }).filter(function(item){return item.subjectId&&item.chapterId;}).sort(function(a,b){return a.order-b.order;});
}

function wtcDCConfigRotationItems_(row) {
  var items=[];
  try { items=wtcDCParseRotationItems_(row.rotationItems); } catch(error) { items=[]; }
  if (!items.length) {
    var subjectId=String(row.subjectId||'').trim();
    items=wtcDCParseList_(row.chapterPool||row.chapterIds).map(function(chapterId,index){
      return { itemId:'DCI-'+wtcDCHash_([subjectId,chapterId,index].join('|')).slice(0,16),subjectId:subjectId,chapterId:chapterId,enabled:true,order:index+1,publishedMcqCount:0 };
    });
  }
  if (!items.length) return [];
  var subjects={},chapters={},counts=wtcDCQuestionCounts_();
  wtcDCRuntimeRows_('SUBJECT_MASTER').forEach(function(subject){subjects[wtcDCNorm_(subject.subjectId)]=subject;});
  wtcDCRuntimeRows_('CHAPTER_MASTER').forEach(function(chapter){chapters[wtcDCNorm_(chapter.chapterId)]=chapter;});
  return items.map(function(item,index){
    var subject=subjects[wtcDCNorm_(item.subjectId)]||{},chapter=chapters[wtcDCNorm_(item.chapterId)]||{};
    return {
      itemId:item.itemId||('DCI-'+wtcDCHash_([item.subjectId,item.chapterId,index].join('|')).slice(0,16)),
      subjectId:item.subjectId,
      subjectName:item.subjectName||subject.subjectName||subject.name||item.subjectId,
      chapterId:item.chapterId,
      chapterName:item.chapterName||chapter.chapterName||chapter.name||item.chapterId,
      enabled:item.enabled!==false,
      order:index+1,
      publishedMcqCount:Number(counts[wtcDCNorm_(item.chapterId)]||item.publishedMcqCount||0)
    };
  });
}

function wtcDCMigrateLegacyConfigs_() {
  var sheet=wtcDCOpenAuthoring_().getSheetByName('MCQ_TEST_ENGINE');
  if (!sheet || sheet.getLastRow()<2) return {upgradedConfigs:0,upgradedChallenges:0,reused:0};
  var upgradedConfigs=0,upgradedChallenges=0,reused=0;
  wtcDCRowsFromSheet_(sheet).forEach(function(row){
    var type=wtcDCNorm_(row.testType),patch={};
    if(type===wtcDCNorm_(WTC_DAILY_CHALLENGE_R2.CONFIG_TYPE)){
      var existing=[];try{existing=wtcDCParseRotationItems_(row.rotationItems);}catch(error){existing=[];}
      if(!existing.length){var subjectId=String(row.subjectId||'').trim();var legacy=wtcDCParseList_(row.chapterPool||row.chapterIds).map(function(chapterId,index){return{itemId:'DCI-'+wtcDCHash_([subjectId,chapterId,index].join('|')).slice(0,16),subjectId:subjectId,chapterId:chapterId,enabled:true,order:index+1};});if(legacy.length)patch.rotationItems=JSON.stringify(legacy);}
      if(!String(row.opensTime||'').trim())patch.opensTime=WTC_DAILY_CHALLENGE_R2.DEFAULT_OPEN_TIME;
      if(!String(row.closesTime||'').trim())patch.closesTime=WTC_DAILY_CHALLENGE_R2.DEFAULT_CLOSE_TIME;
      if(!String(row.timezone||'').trim())patch.timezone=WTC_DAILY_CHALLENGE_R2.TIMEZONE;
      if(Object.keys(patch).length){patch.updatedAt=wtcDCNow_();wtcDCUpdateSheetRow_(sheet,row._row,patch);upgradedConfigs++;}else reused++;
    }else if(type==='daily_challenge'){
      if(!String(row.challengeState||'').trim())patch.challengeState='DRAFT';
      if(!String(row.frozenAt||'').trim())patch.frozenAt=row.createdAt||wtcDCNow_();
      if(!String(row.stateUpdatedAt||'').trim())patch.stateUpdatedAt=row.updatedAt||row.createdAt||wtcDCNow_();
      if(Object.keys(patch).length){patch.updatedAt=row.updatedAt||wtcDCNow_();wtcDCUpdateSheetRow_(sheet,row._row,patch);upgradedChallenges++;}else reused++;
    }
  });
  return {upgradedConfigs:upgradedConfigs,upgradedChallenges:upgradedChallenges,reused:reused};
}

/* ============================== Sheet helpers ============================= */

function wtcDCQuestionCounts_(){var counts={},seen={};wtcDCAuthoringRows_('MCQ_ENGINE').forEach(function(row){if(!wtcDCVisible_(row)||!wtcDCValidQuestion_(row))return;var unique=wtcDCNorm_(row.contentHash||row.mcqId||row.questionText),key=wtcDCNorm_(row.chapterId)+'|'+unique;if(seen[key])return;seen[key]=true;counts[wtcDCNorm_(row.chapterId)]=Number(counts[wtcDCNorm_(row.chapterId)]||0)+1;});return counts;}
function wtcDCOpenAuthoring_(){var id=PropertiesService.getScriptProperties().getProperty('WTC_AI_CONTENT_ENGINE_ID');if(!id)throw new Error('WTC_AI_CONTENT_ENGINE_ID is not configured in Runtime Script Properties.');try{return SpreadsheetApp.openById(id);}catch(error){throw new Error('Unable to open WTC_AI_CONTENT_ENGINE. Check permissions.');}}
function wtcDCRuntimeRows_(name){var sheet=SpreadsheetApp.getActiveSpreadsheet().getSheetByName(name);return(!sheet||sheet.getLastRow()<2)?[]:wtcDCRowsFromSheet_(sheet);}
function wtcDCAuthoringRows_(name){var sheet=wtcDCOpenAuthoring_().getSheetByName(name);return(!sheet||sheet.getLastRow()<2)?[]:wtcDCRowsFromSheet_(sheet);}
function wtcDCRowsFromSheet_(sheet){var values=sheet.getDataRange().getValues(),headers=(values[0]||[]).map(String);return values.slice(1).filter(function(row){return row.join('')!=='';}).map(function(row,index){var object={_row:index+2};headers.forEach(function(header,column){if(header)object[header]=row[column];});return object;});}
function wtcDCEnsureSheet_(ss,name,required){var sheet=ss.getSheetByName(name),created=false;if(!sheet){sheet=ss.insertSheet(name);created=true;}var existing=[];if(sheet.getLastRow()>0&&sheet.getLastColumn()>0)existing=sheet.getRange(1,1,1,sheet.getLastColumn()).getValues()[0].map(String);var added=[];required.forEach(function(header){if(existing.indexOf(header)<0){existing.push(header);added.push(header);}});if(existing.length){sheet.getRange(1,1,1,existing.length).setValues([existing]).setFontWeight('bold').setBackground('#0f172a').setFontColor('#fff');sheet.setFrozenRows(1);}return{sheet:name,created:created,addedColumns:added};}
function wtcDCAppendRuntime_(name,object){var sheet=SpreadsheetApp.getActiveSpreadsheet().getSheetByName(name);if(!sheet)throw new Error(name+' is missing. Run installDailyChallengeLeaderboardSystem() once.');wtcDCAppendToSheet_(sheet,object);}
function wtcDCAppendToSheet_(sheet,object){var headers=sheet.getRange(1,1,1,sheet.getLastColumn()).getValues()[0].map(String);sheet.appendRow(headers.map(function(header){return object[header]===undefined?'':object[header];}));}
function wtcDCUpdateSheetRow_(sheet,rowNumber,patch){var headers=sheet.getRange(1,1,1,sheet.getLastColumn()).getValues()[0].map(String),values=sheet.getRange(rowNumber,1,1,headers.length).getValues()[0];Object.keys(patch||{}).forEach(function(key){var i=headers.indexOf(key);if(i>=0)values[i]=patch[key];});sheet.getRange(rowNumber,1,1,headers.length).setValues([values]);return true;}
function wtcDCUpdateRuntimeRow_(name,rowNumber,patch){var sheet=SpreadsheetApp.getActiveSpreadsheet().getSheetByName(name);return sheet&&rowNumber?wtcDCUpdateSheetRow_(sheet,rowNumber,patch):false;}
function wtcDCRecordMigration_(ss,row){wtcDCEnsureSheet_(ss,'MIGRATION_LOG',['migrationId','migrationKey','version','status','appliedAt','notes']);var sheet=ss.getSheetByName('MIGRATION_LOG'),existing=wtcDCRowsFromSheet_(sheet).find(function(item){return wtcDCNorm_(item.migrationKey)===wtcDCNorm_(row.migrationKey);});if(existing)return{reused:true,migrationId:existing.migrationId||row.migrationId};wtcDCAppendToSheet_(sheet,row);return{reused:false,migrationId:row.migrationId};}

/* =============================== Utilities ================================ */

function wtcDCVisible_(row){return WTC_DAILY_CHALLENGE_R2.VISIBLE_STATUSES.indexOf(wtcDCNorm_(row.status))>=0;}
function wtcDCActive_(row){return['blocked','inactive','no','false','archived','suspended'].indexOf(wtcDCNorm_(row.status||row.isActive||'active'))<0;}
function wtcDCValidQuestion_(row){return!!(String(row.mcqId||'').trim()&&String(row.questionText||'').trim()&&String(row.optionA||'').trim()&&String(row.optionB||'').trim()&&String(row.optionC||'').trim()&&String(row.optionD||'').trim()&&['A','B','C','D'].indexOf(String(row.correctOption||'').trim().toUpperCase())>=0);}
function wtcDCDifficulty_(value){var text=wtcDCNorm_(value);if(text.indexOf('easy')>=0||text.indexOf('simple')>=0)return'easy';if(text.indexOf('hard')>=0||text.indexOf('difficult')>=0||text.indexOf('advanced')>=0)return'hard';return'medium';}
function wtcDCParseList_(value){if(Array.isArray(value))return value.map(String).map(function(x){return x.trim();}).filter(Boolean);var text=String(value||'').trim();if(!text)return[];if(text.charAt(0)==='['){try{var parsed=JSON.parse(text);if(Array.isArray(parsed))return parsed.map(String).map(function(x){return x.trim();}).filter(Boolean);}catch(error){}}return text.split(',').map(function(x){return x.trim();}).filter(Boolean);}
function wtcDCText_(value,max){return String(value||'').replace(/[\u0000-\u001F\u007F]/g,' ').replace(/\s+/g,' ').trim().slice(0,max||200);}
function wtcDCDateValue_(value){if(value instanceof Date)return Utilities.formatDate(value,WTC_DAILY_CHALLENGE_R2.TIMEZONE,'yyyy-MM-dd');var text=String(value||'').trim();if(/^\d{4}-\d{2}-\d{2}/.test(text))return text.slice(0,10);if(typeof wtcProjectDateKey_==='function')return wtcProjectDateKey_(text);throw new Error('Date must use YYYY-MM-DD format.');}
function wtcDCTimeValue_(value){if(value instanceof Date)return Utilities.formatDate(value,WTC_DAILY_CHALLENGE_R2.TIMEZONE,'HH:mm');var text=String(value||'').trim();if(/^\d{1,2}:\d{2}/.test(text)){var parts=text.split(':');text=('0'+Number(parts[0])).slice(-2)+':'+('0'+Number(parts[1])).slice(-2);}if(/^\d{2}:\d{2}:\d{2}$/.test(text))text=text.slice(0,5);if(!/^([01]\d|2[0-3]):[0-5]\d$/.test(text))throw new Error('Time must use 24-hour HH:mm format.');return text;}
function wtcDCTimeOfDayMinutes_(value){var parts=wtcDCTimeValue_(value).split(':').map(Number);return parts[0]*60+parts[1];}
function wtcDCDate_(){return typeof wtcProjectToday_==='function'?wtcProjectToday_():Utilities.formatDate(new Date(),WTC_DAILY_CHALLENGE_R2.TIMEZONE,'yyyy-MM-dd');}
function wtcDCNow_(){return typeof wtcProjectNow_==='function'?wtcProjectNow_():Utilities.formatDate(new Date(),WTC_DAILY_CHALLENGE_R2.TIMEZONE,'yyyy-MM-dd HH:mm:ss');}
function wtcDCFormatDateTime_(date){return typeof wtcProjectFormat_==='function'?wtcProjectFormat_(date,'yyyy-MM-dd HH:mm:ss'):Utilities.formatDate(date,WTC_DAILY_CHALLENGE_R2.TIMEZONE,'yyyy-MM-dd HH:mm:ss');}
function wtcDCDateTime_(dateKey,timeText,endOfMinute){var time=wtcDCTimeValue_(timeText);return wtcDCDateValue_(dateKey)+' '+time+(endOfMinute?':59':':00');}
function wtcDCTime_(value){if(typeof wtcProjectTimeMs_==='function')return wtcProjectTimeMs_(value);if(!value)return 0;if(value instanceof Date)return value.getTime();var raw=String(value).trim().replace(' ','T');if(!/[zZ]|[+\-]\d\d:?\d\d$/.test(raw))raw+='+05:30';var date=new Date(raw);return isNaN(date.getTime())?0:date.getTime();}
function wtcDCDayDiff_(fromKey,toKey){return typeof wtcProjectDayDiff_==='function'?wtcProjectDayDiff_(fromKey,toKey):Math.floor((wtcDCTime_(toKey+' 00:00:00')-wtcDCTime_(fromKey+' 00:00:00'))/86400000);}
function wtcDCDisplayDate_(value){var time=wtcDCTime_(value);return time?Utilities.formatDate(new Date(time),WTC_DAILY_CHALLENGE_R2.TIMEZONE,'dd MMM yyyy'):String(value||'');}
function wtcDCDisplayDateTime_(value){var time=wtcDCTime_(value);return time?Utilities.formatDate(new Date(time),WTC_DAILY_CHALLENGE_R2.TIMEZONE,'dd MMM yyyy, hh:mm a'):String(value||'');}
function wtcDCDisplayTime_(value){var time=wtcDCTime_(value);return time?Utilities.formatDate(new Date(time),WTC_DAILY_CHALLENGE_R2.TIMEZONE,'hh:mm a'):String(value||'');}
function wtcDCNorm_(value){return String(value||'').trim().toLowerCase();}
function wtcDCDigits_(value){return String(value||'').replace(/\D/g,'');}
function wtcDCHash_(value){var bytes=Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,String(value||''),Utilities.Charset.UTF_8);return bytes.map(function(byte){var v=byte<0?byte+256:byte;return('0'+v.toString(16)).slice(-2);}).join('');}
function wtcDCNumericHash_(value){return parseInt(wtcDCHash_(value).slice(0,8),16)||0;}
