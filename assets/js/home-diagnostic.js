/* WAGH Tuition Classes — Home Diagnostic Funnel H1.2 */
window.WTC_DIAGNOSTIC = (() => {
  const MAX_QUESTIONS = 10;
  const MIN_QUESTIONS = 3;
  const state = {
    subjects:[], chapters:[], selectedSubject:null, selectedChapter:null,
    questions:[], answers:{}, currentIndex:0, startedAt:0, result:null, diagnosticId:'',
    submitConfirmUntil:0, loadingCatalog:false
  };

  const byId = id => document.getElementById(id);
  const escapeHTML = value => window.WTC_UI?.escape
    ? WTC_UI.escape(String(value ?? ''))
    : String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[char]));
  const attr = value => escapeHTML(value).replace(/`/g, '&#096;');
  const normalize = value => String(value || '').trim();
  const normalizeLower = value => normalize(value).toLowerCase();
  const normalizeMobile = value => {
    const digits = String(value || '').replace(/\D/g, '');
    return digits.length === 12 && digits.startsWith('91') ? digits.slice(2) : digits;
  };

  function init() {
    const selectorForm = byId('diagnosticSelectorForm');
    if (!selectorForm) return;

    selectorForm.addEventListener('submit', startDiagnostic);
    byId('diagnosticClass')?.addEventListener('change', onClassChange);
    byId('diagnosticBoard')?.addEventListener('change', onBoardChange);
    byId('diagnosticMedium')?.addEventListener('change', onMediumChange);
    byId('diagnosticSubject')?.addEventListener('change', onSubjectChange);
    byId('diagnosticChapter')?.addEventListener('change', onChapterChange);
    byId('diagnosticRestart')?.addEventListener('click', restart);
    byId('diagnosticLeadForm')?.addEventListener('submit', submitDiagnosticLead);
    byId('diagnosticParentMobile')?.addEventListener('input', event => {
      event.currentTarget.value = normalizeMobile(event.currentTarget.value).slice(0, 10);
    });

    document.querySelectorAll('[data-diagnostic-class]').forEach(button => {
      button.addEventListener('click', () => openForClass(button.dataset.diagnosticClass || ''));
    });

    loadCatalog();
  }

  async function loadCatalog(forceRefresh=false) {
    if (state.loadingCatalog) return;
    state.loadingCatalog = true;
    setSelectorStatus('Loading available classes and subjects…', 'info');
    setSelectLoading('diagnosticClass', 'Loading classes…');
    try {
      if (typeof WTC_API === 'undefined' || !WTC_API.getSubjects) throw new Error('The learning catalogue service is unavailable.');
      const response = await WTC_API.getSubjects({}, forceRefresh);
      state.subjects = (response?.subjects || [])
        .filter(item => item && normalize(item.subjectId || item.id) && normalize(item.subjectName || item.name))
        .sort((a,b) => (Number(a.sortOrder) || 99) - (Number(b.sortOrder) || 99));
      if (!state.subjects.length) throw new Error('No active subjects are available for a public diagnostic yet.');
      populateClasses();
      setSelectorStatus('Select each option in order to find an available chapter test.', 'success');
    } catch (error) {
      resetSelect('diagnosticClass', 'Classes unavailable');
      setSelectorStatus(error.message || 'The learning catalogue could not be loaded.', 'error');
    } finally {
      state.loadingCatalog = false;
    }
  }

  function populateClasses() {
    const values = unique(state.subjects.map(item => item.className).filter(Boolean))
      .sort((a,b) => classNumber(a) - classNumber(b) || a.localeCompare(b));
    populateSelect('diagnosticClass', values.map(value => ({ value, label:value })), 'Select class');
    resetAfter('class');
  }

  function onClassChange() {
    const className = normalize(byId('diagnosticClass')?.value);
    resetAfter('class');
    if (!className) return;
    const boards = unique(filteredSubjects({ className }).map(item => item.board).filter(Boolean))
      .sort(orderBy(['CBSE','GSEB']));
    populateSelect('diagnosticBoard', boards.map(value => ({ value, label:value })), 'Select board');
    setSelectorStatus(boards.length ? 'Now select the board.' : 'No board is available for this class.', boards.length ? 'info' : 'error');
  }

  function onBoardChange() {
    const context = selectorContext();
    resetAfter('board');
    if (!context.className || !context.board) return;
    const mediums = unique(filteredSubjects(context).map(item => item.medium).filter(Boolean))
      .sort(orderBy(['English Medium','Gujarati Medium']));
    populateSelect('diagnosticMedium', mediums.map(value => ({ value, label:value })), 'Select medium');
    setSelectorStatus(mediums.length ? 'Now select the medium.' : 'No medium is available for this selection.', mediums.length ? 'info' : 'error');
  }

  function onMediumChange() {
    const context = selectorContext();
    resetAfter('medium');
    if (!context.className || !context.board || !context.medium) return;
    const subjects = filteredSubjects(context);
    const seen = new Set();
    const options = subjects.filter(item => {
      const id = normalize(item.subjectId || item.id);
      if (!id || seen.has(id)) return false;
      seen.add(id);
      return true;
    }).map(item => ({
      value:normalize(item.subjectId || item.id),
      label:[item.icon, item.subjectName || item.name].filter(Boolean).join(' '),
      item
    }));
    populateSelect('diagnosticSubject', options, 'Select subject');
    setSelectorStatus(options.length ? 'Now select the subject.' : 'No subject is available for this selection.', options.length ? 'info' : 'error');
  }

  async function onSubjectChange() {
    const context = selectorContext();
    resetAfter('subject');
    const subjectId = normalize(byId('diagnosticSubject')?.value);
    state.selectedSubject = state.subjects.find(item => normalize(item.subjectId || item.id) === subjectId) || null;
    if (!subjectId) return;

    setSelectLoading('diagnosticChapter', 'Loading chapters…');
    setSelectorStatus('Loading available chapters…', 'info');
    try {
      const response = await WTC_API.getChapters({ ...context, subjectId });
      state.chapters = (response?.chapters || []).filter(item => {
        if (!normalize(item.chapterId || item.id)) return false;
        if (normalize(item.subjectId) && normalizeLower(item.subjectId) !== normalizeLower(subjectId)) return false;
        return (!item.className || normalizeLower(item.className) === normalizeLower(context.className)) &&
          (!item.board || normalizeLower(item.board) === normalizeLower(context.board)) &&
          (!item.medium || normalizeLower(item.medium) === normalizeLower(context.medium));
      });
      if (!state.chapters.length) throw new Error('No active chapters are available for this subject yet.');
      const options = state.chapters.map(item => ({
        value:normalize(item.chapterId || item.id),
        label:`${item.chapterNo ? `Chapter ${item.chapterNo}: ` : ''}${item.chapterName || item.name || 'Chapter'}`,
        item
      }));
      populateSelect('diagnosticChapter', options, 'Select chapter');
      setSelectorStatus('Select a chapter, then start the free diagnostic.', 'success');
    } catch (error) {
      resetSelect('diagnosticChapter', 'No chapters available');
      setSelectorStatus(error.message || 'Chapters could not be loaded.', 'error');
    }
  }

  function onChapterChange() {
    const chapterId = normalize(byId('diagnosticChapter')?.value);
    state.selectedChapter = state.chapters.find(item => normalize(item.chapterId || item.id) === chapterId) || null;
    const button = byId('diagnosticStartButton');
    if (button) button.disabled = !state.selectedChapter;
    if (state.selectedChapter) setSelectorStatus('Your chapter is ready. Start the free diagnostic test.', 'success');
  }

  async function startDiagnostic(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const button = byId('diagnosticStartButton');
    if (!form.checkValidity()) {
      form.reportValidity();
      setSelectorStatus('Complete the sequence: class, board, medium, subject and chapter.', 'error');
      return;
    }
    if (!state.selectedSubject || !state.selectedChapter) {
      setSelectorStatus('Select a valid subject and chapter.', 'error');
      return;
    }

    WTC_UI.setBusy?.(button, true, 'Preparing test…');
    setSelectorStatus('Preparing a chapter-based diagnostic…', 'info');
    try {
      if (!window.WTC_ASSESSMENT_API?.getPublicDiagnostic || !window.WTC_ASSESSMENT_API?.scorePublicDiagnostic) {
        throw new Error('The published diagnostic content service is unavailable.');
      }
      const chapterId = normalize(state.selectedChapter.chapterId || state.selectedChapter.id);
      const response = await WTC_ASSESSMENT_API.getPublicDiagnostic(chapterId);
      if (!response || response.success === false) throw new Error(response?.message || 'The chapter diagnostic is unavailable.');
      const pool = normalizeQuestions(response?.questions || []);
      if (pool.length < MIN_QUESTIONS) throw new Error('This chapter does not yet contain enough published questions for a diagnostic test.');

      state.diagnosticId = normalize(response.diagnosticId);
      if (!state.diagnosticId) throw new Error('The diagnostic session could not be created.');
      state.questions = pool.slice(0, MAX_QUESTIONS);
      state.answers = {};
      state.currentIndex = 0;
      state.startedAt = Date.now();
      state.result = null;
      state.submitConfirmUntil = 0;
      showPanel('diagnosticTestPanel');
      renderQuestion();
      byId('diagnostic')?.scrollIntoView({ behavior:'smooth', block:'start' });
    } catch (error) {
      setSelectorStatus(error.message || 'The diagnostic test could not be prepared.', 'error');
      WTC_UI.toast?.(error.message || 'Diagnostic test unavailable.', 'error');
    } finally {
      WTC_UI.setBusy?.(button, false);
    }
  }

  function normalizeQuestions(items) {
    return (items || []).map((question, index) => ({
      ...question,
      mcqId:normalize(question.questionId || question.mcqId || question.id || `DIAG-${index + 1}`),
      questionText:normalize(question.questionText || question.question || question.text),
      optionA:normalize(question.optionA || question.options?.A || question.options?.[0]),
      optionB:normalize(question.optionB || question.options?.B || question.options?.[1]),
      optionC:normalize(question.optionC || question.options?.C || question.options?.[2]),
      optionD:normalize(question.optionD || question.options?.D || question.options?.[3]),
      topic:normalize(question.topic || question.subtopic || 'General') || 'General'
    })).filter(question => question.questionText && question.mcqId &&
      ['A','B','C','D'].every(letter => question[`option${letter}`]));
  }

  function renderQuestion() {
    const question = state.questions[state.currentIndex];
    if (!question) return;
    const selected = state.answers[question.mcqId] || '';
    const answered = state.questions.filter(item => state.answers[item.mcqId]).length;
    const progress = Math.round(((state.currentIndex + 1) / state.questions.length) * 100);

    setText('diagnosticQuestionNumber', `Question ${state.currentIndex + 1} of ${state.questions.length}`);
    setText('diagnosticQuestionTopic', question.topic || 'General');
    setText('diagnosticAnsweredCount', `${answered}/${state.questions.length} answered`);
    const progressBar = byId('diagnosticProgressBar');
    if (progressBar) progressBar.style.width = `${progress}%`;
    const questionBox = byId('diagnosticQuestionText');
    if (questionBox) questionBox.textContent = question.questionText;

    const options = byId('diagnosticOptions');
    if (options) {
      options.innerHTML = ['A','B','C','D'].map(letter => `
        <button class="diagnostic-option${selected === letter ? ' selected' : ''}" type="button" data-diagnostic-option="${letter}" aria-pressed="${selected === letter}">
          <b>${letter}</b><span>${escapeHTML(question[`option${letter}`])}</span><i aria-hidden="true">✓</i>
        </button>`).join('');
      options.querySelectorAll('[data-diagnostic-option]').forEach(button => {
        button.addEventListener('click', () => selectOption(button.dataset.diagnosticOption));
      });
    }

    const previous = byId('diagnosticPrevious');
    const next = byId('diagnosticNext');
    const submit = byId('diagnosticSubmit');
    if (previous) previous.disabled = state.currentIndex === 0;
    if (next) next.hidden = state.currentIndex >= state.questions.length - 1;
    if (submit) submit.hidden = state.currentIndex < state.questions.length - 1;
    setTestStatus('', '');
    typesetMath(byId('diagnosticQuestionCard'));
  }

  function selectOption(letter) {
    const question = state.questions[state.currentIndex];
    if (!question || !['A','B','C','D'].includes(letter)) return;
    state.answers[question.mcqId] = letter;
    renderQuestion();
  }

  function previousQuestion() {
    if (state.currentIndex <= 0) return;
    state.currentIndex -= 1;
    renderQuestion();
  }

  function nextQuestion() {
    if (state.currentIndex >= state.questions.length - 1) return;
    state.currentIndex += 1;
    renderQuestion();
  }

  async function submitTest() {
    const unanswered = state.questions.filter(question => !state.answers[question.mcqId]).length;
    if (unanswered && Date.now() > state.submitConfirmUntil) {
      state.submitConfirmUntil = Date.now() + 7000;
      setTestStatus(`${unanswered} question${unanswered === 1 ? ' is' : 's are'} unanswered. Tap “Submit Diagnostic” again to finish anyway.`, 'warning');
      return;
    }
    if (!state.diagnosticId) {
      setTestStatus('The diagnostic session is missing. Start the chapter test again.', 'error');
      return;
    }

    const button = byId('diagnosticSubmit');
    WTC_UI.setBusy?.(button, true, 'Checking…');
    setTestStatus('Checking your answers securely…', 'info');
    try {
      const response = await WTC_ASSESSMENT_API.scorePublicDiagnostic({
        diagnosticId:state.diagnosticId,
        answers:{ ...state.answers }
      });
      if (!response || response.success === false) throw new Error(response?.message || 'The diagnostic could not be scored.');
      state.result = {
        correct:Number(response.correct || 0),
        total:Number(response.total || state.questions.length || 0),
        percent:Number(response.percent || 0),
        weakTopics:Array.isArray(response.weakTopics) ? response.weakTopics : [],
        unanswered:Number(response.unanswered || 0),
        elapsedSec:Math.max(1, Math.round((Date.now() - state.startedAt) / 1000))
      };
      renderResult();
      showPanel('diagnosticResultPanel');
      byId('diagnosticResultPanel')?.scrollIntoView({ behavior:'smooth', block:'center' });
    } catch (error) {
      setTestStatus(error.message || 'The diagnostic could not be scored.', 'error');
      WTC_UI.toast?.(error.message || 'Diagnostic scoring failed.', 'error');
    } finally {
      WTC_UI.setBusy?.(button, false);
    }
  }

  function renderResult() {
    const result = state.result;
    const subjectName = state.selectedSubject?.subjectName || state.selectedSubject?.name || 'Subject';
    const chapterName = state.selectedChapter?.chapterName || state.selectedChapter?.name || 'Chapter';
    setText('diagnosticResultPercent', `${result.percent}%`);
    setText('diagnosticResultScore', `${result.correct}/${result.total} correct`);
    setText('diagnosticResultMessage', resultMessage(result.percent));
    setText('diagnosticResultContext', `${selectorContext().className} · ${selectorContext().board} · ${selectorContext().medium} · ${subjectName} · ${chapterName}`);
    setText('diagnosticCorrectCount', result.correct);
    setText('diagnosticWrongCount', result.total - result.correct - result.unanswered);
    setText('diagnosticUnansweredCount', result.unanswered);
    const weakBox = byId('diagnosticWeakTopics');
    if (weakBox) {
      weakBox.innerHTML = result.weakTopics.length
        ? result.weakTopics.map(topic => `<span>${escapeHTML(topic)}</span>`).join('')
        : '<span class="strong-topic">Strong across the sampled topics</span>';
    }
    const leadStatus = byId('diagnosticLeadStatus');
    if (leadStatus) { leadStatus.textContent = ''; leadStatus.className = 'form-status'; }
    byId('diagnosticLeadSuccess')?.setAttribute('hidden', '');
  }

  async function submitDiagnosticLead(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const button = form.querySelector('button[type="submit"]');
    if (!state.result || !state.selectedSubject || !state.selectedChapter) {
      setLeadStatus('Complete the diagnostic test first.', 'error');
      return;
    }
    if (!form.checkValidity()) {
      form.reportValidity();
      setLeadStatus('Enter the student name, a valid parent mobile number and contact consent.', 'error');
      return;
    }

    const data = Object.fromEntries(new FormData(form).entries());
    if (String(data.website || '').trim()) return;
    const mobile = normalizeMobile(data.parentMobile);
    if (!/^\d{10}$/.test(mobile)) {
      setLeadStatus('Enter a valid 10-digit parent mobile number.', 'error');
      byId('diagnosticParentMobile')?.focus();
      return;
    }

    const context = selectorContext();
    const subjectName = state.selectedSubject.subjectName || state.selectedSubject.name || '';
    const chapterId = normalize(state.selectedChapter.chapterId || state.selectedChapter.id);
    const chapterName = state.selectedChapter.chapterName || state.selectedChapter.name || '';
    const payload = {
      studentName:normalize(data.studentName),
      parentMobile:mobile,
      className:context.className,
      board:context.board,
      medium:context.medium,
      subject:subjectName,
      preferredTime:normalize(data.preferredTime || 'Any suitable time'),
      source:'DIAGNOSTIC_TEST',
      pageUrl:window.location.href.split('#')[0],
      consent:String(data.consent || '') === 'yes',
      chapterId,
      chapterName,
      diagnosticScore:state.result.correct,
      diagnosticTotal:state.result.total,
      diagnosticPercent:state.result.percent,
      weakTopics:state.result.weakTopics.join(', '),
      diagnosticTakenAt:new Date().toISOString()
    };

    WTC_UI.setBusy?.(button, true, 'Sending report…');
    setLeadStatus('Saving the diagnostic report and demo request…', 'info');
    try {
      if (typeof WTC_API === 'undefined' || !WTC_API.saveAdmissionLead) throw new Error('The enquiry service is unavailable.');
      const response = await WTC_API.saveAdmissionLead(payload);
      if (!response || response.success === false) throw new Error(response?.message || 'The report request could not be saved.');
      showLeadSuccess(payload, response.leadId || '', true);
      WTC_UI.toast?.('Diagnostic report request saved.', 'success');
    } catch (error) {
      savePendingLead(payload);
      showLeadSuccess(payload, '', false);
      WTC_UI.toast?.('Use WhatsApp to send your diagnostic result.', 'info');
    } finally {
      WTC_UI.setBusy?.(button, false);
    }
  }

  function showLeadSuccess(payload, leadId, savedOnline) {
    const success = byId('diagnosticLeadSuccess');
    const whatsapp = byId('diagnosticWhatsapp');
    if (whatsapp) whatsapp.href = whatsappUrl(buildWhatsAppMessage(payload, leadId));
    if (success) success.hidden = false;
    setLeadStatus(savedOnline
      ? `Your diagnostic report request${leadId ? ` (${leadId})` : ''} has been saved.`
      : 'Your result is ready. Send it on WhatsApp to complete the request.', savedOnline ? 'success' : 'info');
  }

  function buildWhatsAppMessage(payload, leadId='') {
    const lines = [
      'Hello WAGH Tuition Classes, I completed the free diagnostic test.',
      '',
      `Student: ${payload.studentName}`,
      `Class: ${payload.className}`,
      `Board: ${payload.board}`,
      `Medium: ${payload.medium}`,
      `Subject: ${payload.subject}`,
      `Chapter: ${payload.chapterName}`,
      `Score: ${payload.diagnosticScore}/${payload.diagnosticTotal} (${payload.diagnosticPercent}%)`,
      `Focus topics: ${payload.weakTopics || 'No major weak topic in this sample'}`,
      `Preferred contact time: ${payload.preferredTime}`
    ];
    if (leadId) lines.push(`Enquiry ID: ${leadId}`);
    lines.push('', 'Please share guidance and a free demo time.');
    return lines.join('\n');
  }

  function whatsappUrl(message) {
    return `https://wa.me/919537036383?text=${encodeURIComponent(message)}`;
  }

  function savePendingLead(payload) {
    try { localStorage.setItem('wtcPendingDiagnosticLead', JSON.stringify({ ...payload, savedAt:Date.now() })); }
    catch (error) {}
  }

  function restart() {
    state.questions = [];
    state.answers = {};
    state.currentIndex = 0;
    state.result = null;
    state.diagnosticId = '';
    state.submitConfirmUntil = 0;
    byId('diagnosticLeadForm')?.reset();
    showPanel('diagnosticSelectorPanel');
    setSelectorStatus('Your previous selection is preserved. Choose a chapter or start again.', 'info');
    byId('diagnostic')?.scrollIntoView({ behavior:'smooth', block:'start' });
  }

  async function openForClass(className) {
    byId('diagnostic')?.scrollIntoView({ behavior:'smooth', block:'start' });
    if (!state.subjects.length && !state.loadingCatalog) await loadCatalog();
    const select = byId('diagnosticClass');
    if (select && [...select.options].some(option => option.value === className)) {
      select.value = className;
      onClassChange();
      window.setTimeout(() => byId('diagnosticBoard')?.focus({ preventScroll:true }), 450);
    }
  }

  function selectorContext() {
    return {
      className:normalize(byId('diagnosticClass')?.value),
      board:normalize(byId('diagnosticBoard')?.value),
      medium:normalize(byId('diagnosticMedium')?.value)
    };
  }

  function filteredSubjects(filters) {
    return state.subjects.filter(item => Object.entries(filters).every(([key,value]) => !value || normalizeLower(item[key]) === normalizeLower(value)));
  }

  function resetAfter(level) {
    const order = ['class','board','medium','subject','chapter'];
    const ids = { board:'diagnosticBoard', medium:'diagnosticMedium', subject:'diagnosticSubject', chapter:'diagnosticChapter' };
    const placeholders = { board:'Select class first', medium:'Select board first', subject:'Select medium first', chapter:'Select subject first' };
    const start = order.indexOf(level) + 1;
    order.slice(start).forEach(name => {
      if (ids[name]) resetSelect(ids[name], placeholders[name]);
    });
    if (['class','board','medium','subject'].includes(level)) {
      state.selectedSubject = level === 'subject' ? state.selectedSubject : null;
      state.selectedChapter = null;
      state.chapters = [];
      const button = byId('diagnosticStartButton');
      if (button) button.disabled = true;
    }
  }

  function populateSelect(id, options, placeholder) {
    const select = byId(id);
    if (!select) return;
    select.innerHTML = `<option value="">${escapeHTML(placeholder)}</option>` + options.map(option =>
      `<option value="${attr(option.value)}">${escapeHTML(option.label)}</option>`).join('');
    select.disabled = !options.length;
  }

  function resetSelect(id, placeholder) {
    const select = byId(id);
    if (!select) return;
    select.innerHTML = `<option value="">${escapeHTML(placeholder)}</option>`;
    select.disabled = true;
  }

  function setSelectLoading(id, label) {
    const select = byId(id);
    if (!select) return;
    select.innerHTML = `<option value="">${escapeHTML(label)}</option>`;
    select.disabled = true;
  }

  function showPanel(id) {
    ['diagnosticSelectorPanel','diagnosticTestPanel','diagnosticResultPanel'].forEach(panelId => {
      const panel = byId(panelId);
      if (panel) panel.hidden = panelId !== id;
    });
  }

  function setSelectorStatus(message, type='info') {
    const element = byId('diagnosticSelectorStatus');
    if (!element) return;
    element.textContent = message || '';
    element.className = `diagnostic-status ${type || ''}`;
  }

  function setTestStatus(message, type='') {
    const element = byId('diagnosticTestStatus');
    if (!element) return;
    element.textContent = message || '';
    element.className = `diagnostic-status ${type || ''}`;
  }

  function setLeadStatus(message, type='') {
    const element = byId('diagnosticLeadStatus');
    if (!element) return;
    element.textContent = message || '';
    element.className = `form-status ${type || ''}`;
  }

  function resultMessage(percent) {
    if (percent >= 80) return 'Strong start. A focused plan can help turn this into consistent chapter mastery.';
    if (percent >= 60) return 'Good progress. Review the focus topics before attempting a full chapter test.';
    if (percent >= 40) return 'Some concepts need focused revision and guided practice.';
    return 'Start with the chapter foundations and practise one concept at a time.';
  }

  function unique(values) { return [...new Set(values.map(normalize).filter(Boolean))]; }
  function classNumber(value) { const match = String(value || '').match(/\d+/); return match ? Number(match[0]) : 999; }
  function orderBy(preferred) { return (a,b) => {
    const ai = preferred.indexOf(a); const bi = preferred.indexOf(b);
    return (ai < 0 ? 999 : ai) - (bi < 0 ? 999 : bi) || a.localeCompare(b);
  }; }
  function setText(id, value) { const element = byId(id); if (element) element.textContent = String(value ?? ''); }

  let mathJaxPromise = null;
  function typesetMath(node) {
    if (!node || !/[\\$]/.test(node.textContent || '')) return;
    ensureMathJax().then(() => window.MathJax?.typesetPromise?.([node])).catch(() => {});
  }
  function ensureMathJax() {
    if (window.MathJax?.typesetPromise) return Promise.resolve(window.MathJax);
    if (mathJaxPromise) return mathJaxPromise;
    window.MathJax = window.MathJax || {
      tex:{ inlineMath:[['\\(','\\)'],['$','$']], displayMath:[['\\[','\\]'],['$$','$$']] },
      options:{ skipHtmlTags:['script','noscript','style','textarea','pre','code'] }
    };
    mathJaxPromise = new Promise((resolve,reject) => {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/mathjax@3.2.2/es5/tex-mml-chtml.js';
      script.async = true;
      script.onload = () => resolve(window.MathJax);
      script.onerror = () => reject(new Error('MathJax could not be loaded.'));
      document.head.appendChild(script);
    });
    return mathJaxPromise;
  }

  document.addEventListener('DOMContentLoaded', init);
  return { init, loadCatalog, previousQuestion, nextQuestion, submitTest, restart, openForClass };
})();
