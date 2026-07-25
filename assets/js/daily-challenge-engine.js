/* WAGH Tuition Classes — Daily 20-MCQ Challenge Engine H1.3B */
const WTC_DAILY_CHALLENGE_ENGINE = (() => {
  let user = null;
  let challenge = null;
  let attempt = null;
  let questions = [];
  let answers = {};
  let questionTimes = {};
  let openedAt = {};
  let startedAtMs = 0;
  let expiresAtMs = 0;
  let timer = null;
  let submitting = false;

  async function init() {
    user = WTC_AUTH.requireRole('Student');
    if (!user) return;
    text('dailyStudentName', user.name || 'Student');
    bindWindowActions();
    try {
      const data = await WTC_API.call({ action:'studentOpenDailyChallenge', ...identity(), page:location.pathname });
      if (data?.success === false) throw new Error(data.message || 'Today’s challenge could not be opened.');
      challenge = data.challenge || {};
      if (data.completed) return showCompleted(data.result || {});
      attempt = data.attempt || {};
      questions = Array.isArray(data.questions) ? data.questions.map(normalizeQuestion).filter(q => q.id) : [];
      if (questions.length !== 20) throw new Error('Today’s challenge does not contain the required 20 questions.');
      startedAtMs = parseTime(attempt.startedAt) || Date.now();
      expiresAtMs = parseTime(attempt.expiresAt) || (startedAtMs + Number(challenge.durationMin || 20) * 60000);
      restoreDraft();
      start();
    } catch (error) {
      fail(error.message || 'Today’s challenge could not be loaded.');
    }
  }

  function identity() {
    return {
      studentId:user.studentId || user.id || '',
      mobile:user.mobile || '',
      deviceId:typeof WTC_AUTH.deviceId === 'function' ? WTC_AUTH.deviceId() : ''
    };
  }

  function normalizeQuestion(row) {
    return {
      id:String(row.questionId || row.mcqId || row.id || ''),
      chapterId:row.chapterId || '',
      chapterName:row.chapterName || '',
      topic:row.topic || 'General',
      difficulty:row.difficulty || 'Medium',
      marks:Number(row.marks || 1) || 1,
      text:row.questionText || row.question || '',
      options:{ A:row.optionA || '', B:row.optionB || '', C:row.optionC || '', D:row.optionD || '' }
    };
  }

  function start() {
    text('dailyTestTitle', challenge.testTitle || 'Daily 20-MCQ Challenge');
    text('dailyTestMeta', [challenge.subjectName, challenge.className, challenge.board, challenge.medium, `${questions.length} questions`, `${challenge.durationMin || 20} minutes`].filter(Boolean).join(' • '));
    text('dailyInstructions', challenge.instructions || 'One official attempt. Exact answers remain hidden until the challenge closes.');
    text('dailyTotal', questions.length);
    renderPalette();
    renderQuestions();
    bindQuizActions();
    applyRestoredAnswers();
    updateProgress();
    document.getElementById('dailyLoading')?.classList.add('hidden');
    document.getElementById('dailyQuiz')?.classList.remove('hidden');
    timer = window.setInterval(updateTimer, 1000);
    updateTimer();
  }

  function bindWindowActions() {
    document.getElementById('dailyCloseWindow')?.addEventListener('click', closeWindow);
    document.getElementById('dailyCloseResult')?.addEventListener('click', closeWindow);
    window.addEventListener('beforeunload', saveDraft);
  }

  function bindQuizActions() {
    document.getElementById('dailySubmitButton')?.addEventListener('click', () => submit(false));
    document.getElementById('dailyReviewButton')?.addEventListener('click', reviewUnanswered);
  }

  function renderPalette() {
    const box = document.getElementById('dailyPalette');
    box.innerHTML = questions.map((q,index) => `<button id="dailyPal-${attr(q.id)}" type="button" data-question-id="${attr(q.id)}">${index+1}</button>`).join('');
    box.querySelectorAll('button').forEach(button => button.addEventListener('click', () => scrollToQuestion(button.dataset.questionId)));
  }

  function renderQuestions() {
    const box = document.getElementById('dailyQuestionList');
    box.innerHTML = questions.map((q,index) => `<article id="dailyQ-${attr(q.id)}" class="assigned-question" data-question-id="${attr(q.id)}"><div class="assigned-question-top"><span>Question ${index+1}</span><span>${esc(q.chapterName || 'Whole Subject')}</span><span>${esc(q.topic)}</span><span>${esc(q.difficulty)}</span></div><h3>${esc(q.text)}</h3><div class="assigned-options">${Object.keys(q.options).map(letter => `<button class="assigned-option" type="button" data-question-id="${attr(q.id)}" data-option="${letter}"><b>${letter}</b><span>${esc(q.options[letter])}</span></button>`).join('')}</div></article>`).join('');
    box.querySelectorAll('.assigned-option').forEach(button => button.addEventListener('click', () => choose(button.dataset.questionId, button.dataset.option)));
    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver(entries => entries.forEach(entry => {
        if (entry.isIntersecting) openedAt[entry.target.dataset.questionId] ||= Date.now();
      }), { threshold:.35 });
      box.querySelectorAll('.assigned-question').forEach(card => observer.observe(card));
    }
  }

  function choose(questionId, option) {
    if (submitting) return;
    answers[questionId] = option;
    questionTimes[questionId] = Math.max(1, Math.round((Date.now() - (openedAt[questionId] || Date.now())) / 1000));
    const card = document.getElementById(`dailyQ-${cssEscape(questionId)}`);
    card?.querySelectorAll('.assigned-option').forEach(button => button.classList.toggle('selected', button.dataset.option === option));
    document.getElementById(`dailyPal-${cssEscape(questionId)}`)?.classList.add('answered');
    saveDraft();
    updateProgress();
  }

  function applyRestoredAnswers() {
    Object.entries(answers).forEach(([questionId,option]) => {
      const card = document.getElementById(`dailyQ-${cssEscape(questionId)}`);
      card?.querySelectorAll('.assigned-option').forEach(button => button.classList.toggle('selected', button.dataset.option === option));
      document.getElementById(`dailyPal-${cssEscape(questionId)}`)?.classList.add('answered');
    });
  }

  function updateProgress() {
    const count = Object.keys(answers).filter(id => answers[id]).length;
    text('dailyAnswered', count);
    document.getElementById('dailyProgressFill')?.style.setProperty('width', `${questions.length ? (count/questions.length)*100 : 0}%`);
  }

  function reviewUnanswered() {
    const q = questions.find(item => !answers[item.id]) || questions[0];
    if (q) scrollToQuestion(q.id);
  }

  async function submit(autoSubmit) {
    if (submitting) return;
    const unanswered = questions.filter(q => !answers[q.id]).length;
    if (!autoSubmit && unanswered && !confirm(`${unanswered} question(s) are unanswered. Submit the only official attempt now?`)) return;
    submitting = true;
    if (timer) clearInterval(timer);
    const button = document.getElementById('dailySubmitButton');
    setBusy(button, true, autoSubmit ? 'Time ended — submitting…' : 'Submitting…');
    try {
      const details = questions.map((q,index) => ({
        questionNo:index+1,
        questionId:q.id,
        selectedOption:answers[q.id] || '',
        timeTakenSec:Number(questionTimes[q.id] || 0)
      }));
      const data = await WTC_API.call({
        action:'saveDailyChallengeResult',
        ...identity(),
        challengeId:challenge.challengeId,
        attemptId:attempt.attemptId,
        totalTimeSec:Math.max(0, Math.round((Date.now() - startedAtMs) / 1000)),
        attemptDetails:JSON.stringify(details),
        page:location.pathname
      });
      if (data?.success === false) throw new Error(data.message || 'Daily Challenge result could not be saved.');
      clearDraft();
      showResult(data.result || {}, data.answersAvailableAt || challenge.closesAt, !!data.reviewLocked, !!data.reused);
    } catch (error) {
      submitting = false;
      setBusy(button, false);
      if (Date.now() < expiresAtMs) {
        alert(error.message || 'Result could not be saved. Please try again.');
        timer = window.setInterval(updateTimer, 1000);
        updateTimer();
      } else {
        fail(error.message || 'The timer ended before the result could be saved.');
      }
    }
  }

  function showCompleted(result) {
    challenge ||= {};
    document.getElementById('dailyLoading')?.classList.add('hidden');
    document.getElementById('dailyQuiz')?.classList.remove('hidden');
    document.querySelector('.assigned-hero')?.classList.add('hidden');
    document.querySelector('.assigned-progress')?.classList.add('hidden');
    document.querySelector('.daily-rule-strip')?.classList.add('hidden');
    document.querySelector('.assigned-layout')?.classList.add('hidden');
    showResult(result, challenge.closesAt || '', true, true);
  }

  function showResult(result, answersAvailableAt='', reviewLocked=true, reused=false) {
    if (timer) clearInterval(timer);
    const box = document.getElementById('dailyResult');
    const strong = result.strongTopics || 'Keep practising';
    const weak = result.weakTopics || 'No major weak topic detected';
    box.classList.remove('hidden');
    box.innerHTML = `<div class="assigned-result-head"><div><span class="eyebrow">Official Daily Result</span><h2>${result.percent>=80?'Excellent board-pattern performance!':result.percent>=60?'Good attempt — revise the focus topics.':'Use the focus topics for your next revision.'}</h2></div><div class="assigned-result-score">${esc(result.percent || 0)}%</div></div><div class="assigned-result-grid"><div><small>Score</small><b>${esc(result.score || 0)}/${esc(result.total || 20)}</b></div><div><small>Correct</small><b>${esc(result.correctCount ?? result.score ?? 0)}</b></div><div><small>Wrong</small><b>${esc(result.wrongCount || 0)}</b></div><div><small>Unanswered</small><b>${esc(result.unansweredCount || 0)}</b></div></div><div class="daily-result-topics"><div><small>Strong topics</small><b>${esc(strong)}</b></div><div><small>Focus topics</small><b>${esc(weak)}</b></div></div><div class="daily-result-lock">🔒 Exact correct answers and explanations remain hidden until today’s challenge closes${answersAvailableAt ? ` at ${esc(formatDateTime(answersAvailableAt))}` : ''}.</div><p class="assigned-save-status">${reused?'✅ Your saved official result was loaded safely.':'✅ Your official Daily Challenge result is saved.'}</p>`;
    document.getElementById('dailySubmitButton')?.classList.add('hidden');
    document.getElementById('dailyReviewButton')?.classList.add('hidden');
    document.getElementById('dailyCloseResult')?.classList.remove('hidden');
    document.querySelectorAll('.assigned-option').forEach(button => button.disabled = true);
    box.scrollIntoView({ behavior:'smooth', block:'center' });
    submitting = true;
  }

  function updateTimer() {
    const remaining = Math.max(0, Math.ceil((expiresAtMs - Date.now()) / 1000));
    text('dailyTimer', formatClock(remaining));
    document.querySelector('.daily-countdown')?.classList.toggle('warning', remaining > 0 && remaining <= 60);
    if (remaining <= 0 && !submitting) submit(true);
  }

  function draftKey() { return `wtc:daily-challenge:draft:${user?.studentId || user?.id || ''}:${challenge?.challengeId || ''}`; }
  function saveDraft() {
    if (!challenge?.challengeId || submitting) return;
    try { localStorage.setItem(draftKey(), JSON.stringify({ answers, questionTimes, savedAt:Date.now(), attemptId:attempt?.attemptId || '' })); } catch (error) {}
  }
  function restoreDraft() {
    try {
      const draft = JSON.parse(localStorage.getItem(draftKey()) || 'null');
      if (!draft || (draft.attemptId && draft.attemptId !== attempt.attemptId)) return;
      answers = draft.answers && typeof draft.answers === 'object' ? draft.answers : {};
      questionTimes = draft.questionTimes && typeof draft.questionTimes === 'object' ? draft.questionTimes : {};
    } catch (error) {}
  }
  function clearDraft() { try { localStorage.removeItem(draftKey()); } catch (error) {} }

  function closeWindow() {
    try { window.close(); } catch (error) {}
    window.setTimeout(() => { if (!window.closed) location.href='../../student.html'; }, 120);
  }
  function fail(message) { document.getElementById('dailyLoading')?.classList.add('hidden'); document.getElementById('dailyQuiz')?.classList.add('hidden'); document.getElementById('dailyError')?.classList.remove('hidden'); text('dailyErrorText',message); }
  function scrollToQuestion(id) { document.getElementById(`dailyQ-${cssEscape(id)}`)?.scrollIntoView({behavior:'smooth',block:'start'}); }
  function setBusy(button,busy,label) { if (!button) return; if (window.WTC_UI?.setBusy) return WTC_UI.setBusy(button,busy,label); button.disabled=busy; if (label) button.textContent=label; }
  function text(id,value) { const el=document.getElementById(id); if(el) el.textContent=String(value ?? ''); }
  function parseTime(value) { if(!value)return 0; const raw=String(value).trim().replace(' ','T'); const withZone=/[zZ]|[+\-]\d\d:\d\d$/.test(raw)?raw:`${raw}+05:30`; const date=new Date(withZone); return Number.isNaN(date.getTime())?0:date.getTime(); }
  function formatClock(sec) { return `${String(Math.floor(sec/60)).padStart(2,'0')}:${String(sec%60).padStart(2,'0')}`; }
  function formatDateTime(value) { const ms=parseTime(value); if(!ms)return String(value||''); return new Intl.DateTimeFormat('en-IN',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'}).format(new Date(ms)); }
  function cssEscape(value='') { return window.CSS?.escape ? CSS.escape(String(value)) : String(value).replace(/[^A-Za-z0-9_-]/g,'\\$&'); }
  function esc(value='') { return String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c])); }
  function attr(value='') { return esc(value).replace(/`/g,'&#096;'); }
  return { init };
})();

document.addEventListener('DOMContentLoaded', WTC_DAILY_CHALLENGE_ENGINE.init);
