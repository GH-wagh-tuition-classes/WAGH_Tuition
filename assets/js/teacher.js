/* WAGH Tuition Classes — Teacher Dashboard Phase 2.5C v1.0 */
const TeacherApp = (() => {
  const PANEL_HASH = {
    dashboardPanel: 'overview',
    studentsPanel: 'students',
    chaptersPanel: 'chapters',
    resultsPanel: 'results',
    testMonitoringPanel: 'tests',
    classReportsPanel: 'reports',
    attentionPanel: 'attention',
    profilePanel: 'profile'
  };
  const HASH_PANEL = Object.fromEntries(Object.entries(PANEL_HASH).map(([panel, hash]) => [hash, panel]));
  const PANEL_STORAGE_KEY = 'wtc:teacher:last-panel:2-5c';

  let teacherUser = null;
  let dashboardData = null;
  let students = [];
  let results = [];
  let chapterAnalytics = [];
  let attentionStudents = [];
  let testCatalog = [];
  let classReport = null;
  let selectedTestReport = null;
  let selectedTestKey = '';
  let pendingTestKey = '';
  let testReportPromise = null;
  let classReportPromise = null;
  let loadingPromise = null;
  let selectedStudentReport = null;
  let selectedStudentId = '';
  let pendingStudentId = '';
  let studentReportPromise = null;

  async function init() {
    teacherUser = WTC_AUTH.requireRole('Teacher');
    if (!teacherUser) return;

    fillSessionHeader();
    bindLayout();
    bindFilters();
    bindDelegatedActions();
    restorePanel();
    await loadDashboard();
    if (pendingStudentId) await openStudentReport(pendingStudentId, null, false);
    if (pendingTestKey) await openTestReport(pendingTestKey, null, false);
    logDashboardOpen();
  }

  function fillSessionHeader() {
    const name = teacherUser.name || 'Teacher';
    document.querySelectorAll('[data-teacher-name]').forEach(element => { element.textContent = name; });
    document.querySelectorAll('[data-teacher-first-name]').forEach(element => { element.textContent = firstName(name); });
    document.querySelectorAll('[data-teacher-avatar]').forEach(element => { element.textContent = initials(name); });
    document.querySelectorAll('[data-teacher-avatar-large]').forEach(element => { element.textContent = initials(name); });
  }

  function bindLayout() {
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape') toggleSidebar(false);
    });
    window.addEventListener('resize', () => {
      if (window.innerWidth > 980) toggleSidebar(false);
    });
  }

  function bindFilters() {
    ['teacherStudentSearch', 'teacherBoardFilter', 'teacherMediumFilter', 'teacherPerformanceFilter', 'teacherTrendFilter']
      .forEach(id => document.getElementById(id)?.addEventListener('input', renderStudents));
    ['teacherChapterSearch', 'teacherChapterStatusFilter', 'teacherChapterSort']
      .forEach(id => document.getElementById(id)?.addEventListener('input', renderChapterAnalytics));
    ['teacherResultSearch', 'teacherResultStudentFilter', 'teacherResultChapterFilter', 'teacherResultScoreFilter']
      .forEach(id => document.getElementById(id)?.addEventListener('input', renderResults));
    ['teacherTestSearch', 'teacherTestChapterFilter', 'teacherTestTypeFilter', 'teacherTestCompletionFilter', 'teacherTestSort']
      .forEach(id => document.getElementById(id)?.addEventListener('input', renderTestCatalog));
  }

  function bindDelegatedActions() {
    document.addEventListener('click', event => {
      const reportButton = event.target.closest('[data-open-student-report]');
      if (reportButton) {
        openStudentReport(reportButton.dataset.openStudentReport || '', reportButton);
        return;
      }
      const testButton = event.target.closest('[data-open-test-report]');
      if (testButton) openTestReport(testButton.dataset.openTestReport || '', testButton);
    });
    document.addEventListener('change', event => {
      if (event.target.id === 'teacherDetailHistoryChapterFilter') renderDetailHistory();
    });
  }

  function restorePanel() {
    const hash = decodeURIComponent(String(window.location.hash || '').replace(/^#/, ''));
    if (hash.startsWith('student-')) {
      pendingStudentId = hash.slice('student-'.length);
      openPanel('studentsPanel', null, false);
      return;
    }
    if (hash.startsWith('test-')) {
      pendingTestKey = hash.slice('test-'.length);
      openPanel('testMonitoringPanel', null, false);
      return;
    }
    const stored = safeStorageGet(PANEL_STORAGE_KEY);
    const panelId = HASH_PANEL[hash] || (document.getElementById(stored) ? stored : 'dashboardPanel');
    openPanel(panelId, document.querySelector(`[data-teacher-nav="${cssEscape(panelId)}"]`), false);
  }

  function openPanel(panelId, sourceButton=null, updateLocation=true) {
    const panel = document.getElementById(panelId);
    if (!panel) return false;

    document.querySelectorAll('.teacher-panel').forEach(item => item.classList.toggle('active', item === panel));
    document.querySelectorAll('[data-teacher-nav]').forEach(button => {
      const active = button.dataset.teacherNav === panelId;
      button.classList.toggle('active', active);
      button.setAttribute('aria-current', active ? 'page' : 'false');
    });
    document.querySelectorAll('[data-teacher-mobile-nav]').forEach(button => {
      const active = button.dataset.teacherMobileNav === panelId;
      button.classList.toggle('active', active);
      button.setAttribute('aria-current', active ? 'page' : 'false');
    });

    if (sourceButton?.matches?.('[data-teacher-nav],[data-teacher-mobile-nav]')) sourceButton.classList.add('active');

    const title = panel.dataset.panelTitle || 'Teacher Dashboard';
    const subtitle = panel.dataset.panelSubtitle || '';
    setText('teacherPageTitle', title);
    setText('teacherBreadcrumbCurrent', title);
    setText('teacherPageSubtitle', subtitle);

    if (panelId !== 'studentDetailPanel' && panelId !== 'testDetailPanel') {
      safeStorageSet(PANEL_STORAGE_KEY, panelId);
      if (updateLocation && PANEL_HASH[panelId]) history.replaceState(null, '', `#${PANEL_HASH[panelId]}`);
    }

    toggleSidebar(false);
    if (panelId === 'classReportsPanel' && !classReport && !classReportPromise) loadClassReport(false);
    window.scrollTo({ top:0, behavior:'smooth' });
    return true;
  }

  function toggleSidebar(force) {
    const page = document.body;
    const open = typeof force === 'boolean' ? force : !page.classList.contains('sidebar-open');
    page.classList.toggle('sidebar-open', open);
    document.querySelector('.teacher-menu-toggle')?.setAttribute('aria-expanded', open ? 'true' : 'false');
  }

  async function refresh() {
    selectedStudentReport = null;
    selectedTestReport = null;
    classReport = null;
    return loadDashboard(true);
  }

  async function loadDashboard(force=false) {
    if (loadingPromise) return loadingPromise;

    const refreshButton = document.querySelector('.teacher-refresh-button');
    setBusy(refreshButton, true, 'Refreshing…');
    setGlobalStatus('Loading teacher analytics and test monitoring…', 'info');

    loadingPromise = (async () => {
      try {
        const data = await WTC_API.call({ action:'teacherDashboard', ...teacherIdentity() });
        if (!data || data.success === false) throw new Error(data?.message || 'Teacher analytics could not be loaded.');

        dashboardData = data;
        students = Array.isArray(data.students) ? data.students : [];
        results = Array.isArray(data.recentResults) ? data.recentResults : [];
        chapterAnalytics = Array.isArray(data.chapterAnalytics) ? data.chapterAnalytics : [];
        attentionStudents = Array.isArray(data.attentionStudents) ? data.attentionStudents : students.filter(student => student.needsAttention);
        testCatalog = Array.isArray(data.testCatalog) ? data.testCatalog : [];
        renderAll();

        const warningCount = Array.isArray(data.assignmentWarnings) ? data.assignmentWarnings.length : 0;
        setGlobalStatus(
          warningCount ? 'Analytics loaded with an assignment notice. Review Teaching Scope.' : 'Teacher analytics and test monitoring loaded successfully.',
          warningCount ? 'warning' : 'success'
        );
        return data;
      } catch (error) {
        setGlobalStatus(error.message || 'Teacher analytics failed to load.', 'error');
        showToast(error.message || 'Teacher analytics failed to load.', 'error');
        renderLoadError(error.message || 'Teacher analytics failed to load.');
        return null;
      } finally {
        setBusy(refreshButton, false);
        loadingPromise = null;
      }
    })();

    return loadingPromise;
  }

  function renderAll() {
    const profile = dashboardData?.teacher || {};
    const overview = dashboardData?.overview || {};
    const assignment = dashboardData?.assignment || {};
    const name = profile.name || teacherUser.name || 'Teacher';
    const classLabel = assignment.classLabel || profile.className || 'Not assigned';
    const subjectLabel = assignment.subjectLabel || profile.subject || 'Not assigned';
    const assignmentText = `${classLabel} • ${subjectLabel}`;

    document.querySelectorAll('[data-teacher-name]').forEach(element => { element.textContent = name; });
    document.querySelectorAll('[data-teacher-first-name]').forEach(element => { element.textContent = firstName(name); });
    document.querySelectorAll('[data-teacher-avatar]').forEach(element => { element.textContent = initials(name); });
    document.querySelectorAll('[data-teacher-avatar-large]').forEach(element => { element.textContent = initials(name); });
    document.querySelectorAll('[data-teacher-assignment]').forEach(element => { element.textContent = assignmentText; });

    setText('teacherHeroAssignment', `Read-only analytics for ${assignmentText}. Open a student to review chapter-level performance.`);
    setText('teacherAssignedStudents', numberText(overview.assignedStudents));
    setText('teacherActiveStudentsText', `${numberText(overview.activeStudents)} active • ${numberText(overview.activeLast14Days)} recently active`);
    setText('teacherTotalAttempts', numberText(overview.totalAttempts));
    setText('teacherAveragePercent', `${numberText(overview.averagePercent)}%`);
    setText('teacherAttentionCount', numberText(overview.needsAttention));
    setText('teacherAssignedChapters', numberText(overview.assignedChapters));
    setText('teacherAttemptedChaptersText', `${numberText(overview.attemptedChapters)} attempted`);
    setText('teacherStudentNavCount', numberText(overview.assignedStudents));
    setText('teacherAttentionNavCount', numberText(overview.needsAttention));
    setText('teacherUniqueTests', numberText(overview.uniqueTests));
    setText('teacherAverageCompletion', `${numberText(overview.averageTestCompletion)}%`);
    setText('teacherNoAttemptText', `${numberText(overview.studentsWithoutAttempts)} student${numberText(overview.studentsWithoutAttempts) === 1 ? '' : 's'} without attempts`);
    setText('teacherTestNavCount', numberText(overview.uniqueTests));

    setText('teacherAssignmentId', profile.teacherId || '—');
    setText('teacherAssignmentClass', classLabel);
    setText('teacherAssignmentSubject', subjectLabel);
    setText('teacherAssignmentProfiles', profileList(assignment.availableProfiles));

    const assignmentReady = assignment.classReady && assignment.subjectReady;
    const statusElement = document.getElementById('teacherAssignmentStatus');
    if (statusElement) {
      statusElement.textContent = assignmentReady ? 'Ready' : 'Needs setup';
      statusElement.className = `teacher-chip ${assignmentReady ? 'active' : 'warning'}`;
    }

    const warnings = Array.isArray(dashboardData.assignmentWarnings) ? dashboardData.assignmentWarnings : [];
    const warningBox = document.getElementById('teacherAssignmentWarning');
    if (warningBox) {
      warningBox.classList.toggle('hidden', !warnings.length);
      warningBox.innerHTML = warnings.map(item => escapeHTML(item)).join('<br>');
    }

    setText('teacherProfileRole', profile.role || 'Teacher');
    setText('teacherProfileId', profile.teacherId || '—');
    setText('teacherProfileMobile', profile.mobileMasked || maskMobile(profile.mobile || teacherUser.mobile));
    setText('teacherProfileClass', classLabel);
    setText('teacherProfileSubject', subjectLabel);
    setText('teacherProfileAccountStatus', profile.status || '—');
    setText('teacherProfileUpdatedAt', profile.updatedAt || profile.createdAt || '—');

    const profileStatus = document.getElementById('teacherProfileStatus');
    if (profileStatus) {
      const active = normalize(profile.status || 'Active') === 'active';
      profileStatus.textContent = profile.status || (active ? 'Active' : 'Inactive');
      profileStatus.className = `teacher-chip ${active ? 'active' : 'inactive'}`;
    }

    populateFilterOptions('teacherBoardFilter', assignment.boards || unique(students.map(item => item.board)), 'All boards');
    populateFilterOptions('teacherMediumFilter', assignment.media || unique(students.map(item => item.medium)), 'All media');
    populateFilterOptions('teacherResultStudentFilter', students.map(item => ({ value:item.studentId, label:item.name })), 'All students', true);
    populateFilterOptions('teacherResultChapterFilter', chapterAnalytics.map(item => ({ value:item.chapterId, label:chapterLabel(item) })), 'All chapters', true);
    populateFilterOptions('teacherTestChapterFilter', chapterAnalytics.map(item => ({ value:item.chapterId, label:chapterLabel(item) })), 'All chapters', true);
    populateFilterOptions('teacherTestTypeFilter', testCatalog.map(item => item.testType), 'All test types');
    populateFilterOptions('teacherReportBoardFilter', assignment.boards || unique(students.map(item => item.board)), 'All boards');
    populateFilterOptions('teacherReportMediumFilter', assignment.media || unique(students.map(item => item.medium)), 'All media');
    populateFilterOptions('teacherReportChapterFilter', chapterAnalytics.map(item => ({ value:item.chapterId, label:chapterLabel(item) })), 'All chapters', true);
    populateFilterOptions('teacherReportTestTypeFilter', testCatalog.map(item => item.testType), 'All test types');

    renderStudents();
    renderResults();
    renderChapterAnalytics();
    renderAttention();
    renderRecentPreview();
    renderAttentionPreview();
    renderChapterPreview();
    renderTestCatalog();
    renderTestPreview();
    renderClassReportPreview();
  }

  function renderStudents() {
    const box = document.getElementById('teacherStudentList');
    if (!box) return;

    const query = normalize(document.getElementById('teacherStudentSearch')?.value);
    const board = normalize(document.getElementById('teacherBoardFilter')?.value);
    const medium = normalize(document.getElementById('teacherMediumFilter')?.value);
    const performance = normalize(document.getElementById('teacherPerformanceFilter')?.value);
    const trend = normalize(document.getElementById('teacherTrendFilter')?.value);

    const filtered = students.filter(student => {
      const searchText = normalize([student.studentId, student.name, student.board, student.className, student.medium].join(' '));
      if (query && !searchText.includes(query)) return false;
      if (board && normalize(student.board) !== board) return false;
      if (medium && normalize(student.medium) !== medium) return false;
      if (performance && normalize(student.statusClass) !== performance) return false;
      if (trend && normalize(student.trend).replaceAll(' ', '-') !== trend) return false;
      return true;
    });

    setText('teacherStudentCountLabel', `${filtered.length} student${filtered.length === 1 ? '' : 's'}`);
    if (!filtered.length) {
      box.innerHTML = `<div class="teacher-empty">${students.length ? 'No students match the current filters.' : 'No students are currently connected to this assignment.'}</div>`;
      return;
    }

    box.innerHTML = filtered.map(student => `<article class="teacher-student-card">
      <div class="teacher-student-main">
        <div class="teacher-student-avatar" aria-hidden="true">${escapeHTML(initials(student.name || 'Student'))}</div>
        <div class="teacher-student-copy">
          <div class="teacher-student-copy-head"><h3>${escapeHTML(student.name || 'Unnamed Student')}</h3>${performanceBadge(student)}</div>
          <div class="teacher-student-meta">
            <span>ID: ${escapeHTML(student.studentId || '—')}</span><span>${escapeHTML(student.board || '—')}</span><span>${escapeHTML(student.className || '—')}</span><span>${escapeHTML(student.medium || '—')}</span><span>${escapeHTML(student.mobileMasked || 'Mobile hidden')}</span>
          </div>
          <div class="teacher-student-signals">
            <span class="teacher-signal neutral">${escapeHTML(trendLabel(student.trend))}</span>
            <span class="teacher-signal neutral">${numberText(student.weakChapterCount)} weak chapter${numberText(student.weakChapterCount) === 1 ? '' : 's'}</span>
            ${(student.attentionReasons || []).slice(0, 2).map(reason => `<span class="teacher-signal">${escapeHTML(reason)}</span>`).join('')}
          </div>
          <div class="teacher-last-activity">Last activity: ${escapeHTML(formatDate(student.lastActivityAt, true))}</div>
          <div class="teacher-card-actions"><button class="teacher-view-report" type="button" data-open-student-report="${escapeAttribute(student.studentId || '')}">View Student Report</button></div>
        </div>
      </div>
      <div class="teacher-student-performance" aria-label="Performance for ${escapeAttribute(student.name || 'student')}">
        <div class="teacher-mini-stat"><small>Attempts</small><b>${numberText(student.attemptCount)}</b></div>
        <div class="teacher-mini-stat"><small>Average</small><b>${numberText(student.averagePercent)}%</b></div>
        <div class="teacher-mini-stat"><small>Progress</small><b>${numberText(student.progressPercent)}%</b></div>
      </div>
    </article>`).join('');
  }

  async function openStudentReport(studentId, sourceButton=null, updateLocation=true) {
    const cleanId = String(studentId || '').trim();
    if (!cleanId) return;
    if (studentReportPromise) return studentReportPromise;

    selectedStudentId = cleanId;
    openPanel('studentDetailPanel', null, false);
    if (updateLocation) history.replaceState(null, '', `#student-${encodeURIComponent(cleanId)}`);

    if (selectedStudentReport?.student?.studentId === cleanId) {
      renderStudentDetail();
      return selectedStudentReport;
    }

    setDetailStatus('Loading verified student report…', 'info');
    document.getElementById('teacherStudentDetailContent').innerHTML = '<div class="teacher-empty">Loading chapter performance and test history…</div>';
    setBusy(sourceButton, true, 'Loading…');

    studentReportPromise = (async () => {
      try {
        const data = await WTC_API.call({ action:'teacherGetStudentReport', studentId:cleanId, ...teacherIdentity() });
        if (!data || data.success === false) throw new Error(data?.message || 'Student report could not be loaded.');
        selectedStudentReport = data;
        renderStudentDetail();
        setDetailStatus('', 'success');
        return data;
      } catch (error) {
        selectedStudentReport = null;
        setDetailStatus(error.message || 'Student report failed to load.', 'error');
        document.getElementById('teacherStudentDetailContent').innerHTML = `<div class="teacher-empty">${escapeHTML(error.message || 'Student report failed to load.')}</div>`;
        showToast(error.message || 'Student report failed to load.', 'error');
        return null;
      } finally {
        setBusy(sourceButton, false);
        studentReportPromise = null;
      }
    })();

    return studentReportPromise;
  }

  function renderStudentDetail() {
    const box = document.getElementById('teacherStudentDetailContent');
    const data = selectedStudentReport;
    if (!box || !data) return;

    const student = data.student || {};
    const summary = data.summary || {};
    const chapters = Array.isArray(data.chapterPerformance) ? data.chapterPerformance : [];
    const history = Array.isArray(data.testHistory) ? data.testHistory : [];
    const reasons = Array.isArray(summary.attentionReasons) ? summary.attentionReasons : [];

    box.innerHTML = `
      <div class="teacher-detail-hero">
        <article class="teacher-student-profile-card">
          <div class="teacher-student-profile-avatar">${escapeHTML(initials(student.name || 'Student'))}</div>
          <div><div class="teacher-student-copy-head"><h2>${escapeHTML(student.name || 'Student')}</h2>${performanceBadge(summary)}</div>
          <div class="teacher-student-profile-meta"><span>ID: ${escapeHTML(student.studentId || '—')}</span><span>${escapeHTML(student.board || '—')}</span><span>${escapeHTML(student.className || '—')}</span><span>${escapeHTML(student.medium || '—')}</span><span>${escapeHTML(student.mobileMasked || 'Mobile hidden')}</span></div>
          <div class="teacher-last-activity">Last activity: ${escapeHTML(formatDate(summary.lastActivityAt, true))} • Trend: ${escapeHTML(summary.trend || 'Not enough data')}</div></div>
        </article>
        ${reasons.length ? `<article class="teacher-attention-box"><h3>⚑ Attention Signals</h3><ul>${reasons.map(reason => `<li>${escapeHTML(reason)}</li>`).join('')}</ul></article>` : '<article class="teacher-attention-box clear"><h3>✓ No active warning</h3><p>This student currently has no automated attention signal.</p></article>'}
      </div>
      <div class="teacher-detail-stats">
        ${detailStat('Attempts', summary.attemptCount)}${detailStat('Average', `${numberText(summary.averagePercent)}%`)}${detailStat('Best', `${numberText(summary.bestPercent)}%`)}${detailStat('Latest', `${numberText(summary.latestPercent)}%`)}${detailStat('Completed', summary.completedChapters)}${detailStat('Weak Chapters', summary.weakChapterCount)}
      </div>
      <div class="teacher-detail-grid">
        <article class="teacher-detail-section">
          <div class="teacher-detail-section-head"><div><h3>Chapter Performance</h3><p>${chapters.length} assigned chapter${chapters.length === 1 ? '' : 's'}</p></div></div>
          <div class="teacher-student-chapter-list">${chapters.length ? chapters.map(renderStudentChapterCard).join('') : '<div class="teacher-empty">No assigned chapters found.</div>'}</div>
        </article>
        <article class="teacher-detail-section">
          <div class="teacher-detail-section-head"><div><h3>Test History</h3><p>${history.length} recorded result${history.length === 1 ? '' : 's'}</p></div></div>
          <div class="teacher-history-filter"><select id="teacherDetailHistoryChapterFilter"><option value="">All chapters</option>${chapters.map(chapter => `<option value="${escapeAttribute(chapter.chapterId || '')}">${escapeHTML(chapterLabel(chapter))}</option>`).join('')}</select></div>
          <div id="teacherDetailHistoryList" class="teacher-history-list"></div>
        </article>
      </div>`;
    renderDetailHistory();
  }

  function renderStudentChapterCard(chapter) {
    return `<article class="teacher-student-chapter-card">
      <div class="teacher-student-chapter-head"><div><h4>${escapeHTML(chapterLabel(chapter))}</h4><p>${escapeHTML(chapter.completionState || 'Not Started')} • ${escapeHTML(chapter.trend || 'Not enough data')}</p></div>${performanceBadge(chapter)}</div>
      <div class="teacher-chapter-metrics">
        ${chapterMetric('Attempts', chapter.attemptCount)}${chapterMetric('Average', `${numberText(chapter.averagePercent)}%`)}${chapterMetric('Best', `${numberText(chapter.bestPercent)}%`)}${chapterMetric('Progress', `${numberText(chapter.progressPercent)}%`)}
      </div>
      <div class="teacher-progress-bar" aria-label="Chapter progress ${numberText(chapter.progressPercent)} percent"><span style="width:${clampPercent(chapter.progressPercent)}%"></span></div>
      ${chapter.repeatedLow ? '<div class="teacher-attention-flag">Repeated low score detected</div>' : ''}
    </article>`;
  }

  function renderDetailHistory() {
    const box = document.getElementById('teacherDetailHistoryList');
    if (!box || !selectedStudentReport) return;
    const selectedChapter = normalize(document.getElementById('teacherDetailHistoryChapterFilter')?.value);
    const history = (selectedStudentReport.testHistory || []).filter(item => !selectedChapter || normalize(item.chapterId) === selectedChapter);
    box.innerHTML = history.length ? history.map(result => `<article class="teacher-history-card"><div><h4>${escapeHTML(result.testTitle || result.testType || 'Assessment')}</h4><div class="teacher-history-meta"><span>${escapeHTML(result.chapterName || result.chapterId || 'Chapter')}</span><span>${escapeHTML(result.testType || 'Test')}</span><span>Attempt ${numberText(result.attemptNumber || 1)}</span><span>${escapeHTML(formatDate(result.createdAt))}</span></div></div><div class="teacher-history-score">${numberText(result.percent)}%</div></article>`).join('') : '<div class="teacher-empty">No results match this chapter.</div>';
  }

  function backToStudents() {
    selectedStudentId = '';
    openPanel('studentsPanel');
  }

  function renderChapterAnalytics() {
    const box = document.getElementById('teacherChapterAnalyticsList');
    if (!box) return;
    const query = normalize(document.getElementById('teacherChapterSearch')?.value);
    const status = normalize(document.getElementById('teacherChapterStatusFilter')?.value);
    const sort = normalize(document.getElementById('teacherChapterSort')?.value || 'chapter');

    let filtered = chapterAnalytics.filter(chapter => {
      const text = normalize([chapter.chapterId, chapter.chapterNo, chapter.chapterName].join(' '));
      if (query && !text.includes(query)) return false;
      if (status && normalize(chapter.statusClass) !== status) return false;
      return true;
    });

    filtered = [...filtered].sort((a, b) => {
      if (sort === 'weak') return Number(b.weakStudents || 0) - Number(a.weakStudents || 0);
      if (sort === 'average-low') return Number(a.averagePercent || 0) - Number(b.averagePercent || 0);
      if (sort === 'attempts') return Number(b.attemptCount || 0) - Number(a.attemptCount || 0);
      return Number(a.chapterNo || 9999) - Number(b.chapterNo || 9999);
    });

    setText('teacherChapterCountLabel', `${filtered.length} chapter${filtered.length === 1 ? '' : 's'}`);
    box.innerHTML = filtered.length ? filtered.map(chapter => `<article class="teacher-chapter-card">
      <div class="teacher-chapter-title"><div class="teacher-chapter-number">${escapeHTML(String(chapter.chapterNo || '•'))}</div><div><div class="teacher-student-copy-head"><h3>${escapeHTML(chapter.chapterName || 'Chapter')}</h3>${performanceBadge(chapter)}</div><p>${escapeHTML(chapter.chapterId || '')} • Latest: ${escapeHTML(formatDate(chapter.latestAttemptAt, true))}</p><div class="teacher-progress-bar"><span style="width:${clampPercent(chapter.averageProgress)}%"></span></div></div></div>
      <div class="teacher-class-chapter-metrics">
        ${classChapterMetric('Attempts', chapter.attemptCount)}${classChapterMetric('Students', chapter.attemptedStudents)}${classChapterMetric('Average', `${numberText(chapter.averagePercent)}%`)}${classChapterMetric('Weak', chapter.weakStudents)}${classChapterMetric('Completed', chapter.completedStudents)}
      </div>
    </article>`).join('') : '<div class="teacher-empty">No chapters match the current filters.</div>';
  }

  function renderResults() {
    const box = document.getElementById('teacherResultList');
    if (!box) return;
    const query = normalize(document.getElementById('teacherResultSearch')?.value);
    const studentId = normalize(document.getElementById('teacherResultStudentFilter')?.value);
    const chapterId = normalize(document.getElementById('teacherResultChapterFilter')?.value);
    const scoreBand = normalize(document.getElementById('teacherResultScoreFilter')?.value);

    const filtered = results.filter(result => {
      const text = normalize([result.studentName, result.studentId, result.testTitle, result.testType, result.topic, result.chapterName].join(' '));
      if (query && !text.includes(query)) return false;
      if (studentId && normalize(result.studentId) !== studentId) return false;
      if (chapterId && normalize(result.chapterId) !== chapterId) return false;
      if (scoreBand && scoreClass(result.percent) !== scoreBand) return false;
      return true;
    });

    setText('teacherResultCountLabel', `${filtered.length} result${filtered.length === 1 ? '' : 's'}`);
    if (!filtered.length) {
      box.innerHTML = `<div class="teacher-empty">${results.length ? 'No results match the current filters.' : 'No matching test results have been recorded yet.'}</div>`;
      return;
    }

    box.innerHTML = filtered.map(result => `<article class="teacher-result-card"><div><div class="teacher-student-copy-head"><h3>${escapeHTML(result.studentName || 'Student')} • ${escapeHTML(result.testTitle || result.testType || 'Test')}</h3><span class="teacher-performance-badge ${scoreClass(result.percent)}">${escapeHTML(scoreLabel(result.percent))}</span></div><div class="teacher-result-meta"><span>Student ID: ${escapeHTML(result.studentId || '—')}</span><span>${escapeHTML(result.chapterName || result.chapterId || 'Chapter')}</span><span>${escapeHTML(result.subjectName || 'Subject')}</span><span>${escapeHTML(result.testType || 'Assessment')}</span><span>Attempt ${numberText(result.attemptNumber || 1)}</span><span>${escapeHTML(formatDate(result.createdAt))}</span></div></div><div class="teacher-result-score"><strong>${numberText(result.percent)}%</strong><span>${escapeHTML(scoreLine(result))}</span></div></article>`).join('');
  }


  function renderTestCatalog() {
    const box = document.getElementById('teacherTestCatalogList');
    if (!box) return;
    const query = normalize(document.getElementById('teacherTestSearch')?.value);
    const chapterId = normalize(document.getElementById('teacherTestChapterFilter')?.value);
    const testType = normalize(document.getElementById('teacherTestTypeFilter')?.value);
    const completion = normalize(document.getElementById('teacherTestCompletionFilter')?.value);
    const sort = normalize(document.getElementById('teacherTestSort')?.value || 'recent');

    let filtered = testCatalog.filter(test => {
      const text = normalize([test.testId, test.testTitle, test.testType, test.topic, test.chapterName].join(' '));
      if (query && !text.includes(query)) return false;
      if (chapterId && normalize(test.chapterId) !== chapterId) return false;
      if (testType && normalize(test.testType) !== testType) return false;
      if (completion === 'complete' && Number(test.completionRate || 0) < 100) return false;
      if (completion === 'partial' && !(Number(test.completionRate || 0) > 0 && Number(test.completionRate || 0) < 100)) return false;
      if (completion === 'none' && Number(test.attemptedStudents || 0) > 0) return false;
      return true;
    });

    filtered = [...filtered].sort((a, b) => {
      if (sort === 'completion-low') return Number(a.completionRate || 0) - Number(b.completionRate || 0);
      if (sort === 'average-low') return Number(a.averagePercent || 0) - Number(b.averagePercent || 0);
      if (sort === 'non-attempted') return Number(b.nonAttemptedStudents || 0) - Number(a.nonAttemptedStudents || 0);
      return dateTime(b.latestAttemptAt) - dateTime(a.latestAttemptAt);
    });

    setText('teacherTestCountLabel', `${filtered.length} test${filtered.length === 1 ? '' : 's'}`);
    if (!filtered.length) {
      box.innerHTML = `<div class="teacher-empty">${testCatalog.length ? 'No tests match the current filters.' : 'No test results are available for this assignment yet.'}</div>`;
      return;
    }

    box.innerHTML = filtered.map(test => `<article class="teacher-test-card">
      <div class="teacher-test-card-main">
        <div class="teacher-test-card-head"><div><span class="teacher-card-kicker">${escapeHTML(test.testType || 'Assessment')}</span><h3>${escapeHTML(test.testTitle || 'Assessment')}</h3><p>${escapeHTML(chapterLabel(test))}${test.topic ? ` • ${escapeHTML(test.topic)}` : ''}</p></div>${performanceBadge(test)}</div>
        <div class="teacher-progress-bar teacher-test-completion"><span style="width:${clampPercent(test.completionRate)}%"></span></div>
        <div class="teacher-test-metrics">${testMetric('Completion', `${numberText(test.completionRate)}%`)}${testMetric('Attempted', `${numberText(test.attemptedStudents)}/${numberText(test.eligibleStudents)}`)}${testMetric('Average', `${numberText(test.averagePercent)}%`)}${testMetric('Not Attempted', test.nonAttemptedStudents)}${testMetric('Retries', test.multipleAttemptStudents)}</div>
      </div>
      <div class="teacher-test-card-action"><small>Latest ${escapeHTML(formatDate(test.latestAttemptAt, true))}</small><button class="teacher-view-report" type="button" data-open-test-report="${escapeAttribute(test.testKey || '')}">Open Test Report</button></div>
    </article>`).join('');
  }

  async function openTestReport(testKey, sourceButton=null, updateLocation=true) {
    const key = String(testKey || '').trim();
    if (!key) return;
    if (testReportPromise) return testReportPromise;
    selectedTestKey = key;
    openPanel('testDetailPanel', null, false);
    if (updateLocation) history.replaceState(null, '', `#test-${encodeURIComponent(key)}`);

    if (selectedTestReport?.test?.testKey === key) {
      renderTestDetail();
      return selectedTestReport;
    }

    setTestDetailStatus('Loading verified test report…', 'info');
    document.getElementById('teacherTestDetailContent').innerHTML = '<div class="teacher-empty">Loading completion, ranking and retry evidence…</div>';
    setBusy(sourceButton, true, 'Loading…');

    testReportPromise = (async () => {
      try {
        const data = await WTC_API.call({ action:'teacherGetTestReport', testKey:key, ...teacherIdentity() });
        if (!data || data.success === false) throw new Error(data?.message || 'Test report could not be loaded.');
        selectedTestReport = data;
        renderTestDetail();
        setTestDetailStatus('', 'success');
        return data;
      } catch (error) {
        selectedTestReport = null;
        setTestDetailStatus(error.message || 'Test report failed to load.', 'error');
        document.getElementById('teacherTestDetailContent').innerHTML = `<div class="teacher-empty">${escapeHTML(error.message || 'Test report failed to load.')}</div>`;
        showToast(error.message || 'Test report failed to load.', 'error');
        return null;
      } finally {
        setBusy(sourceButton, false);
        testReportPromise = null;
      }
    })();
    return testReportPromise;
  }

  function renderTestDetail() {
    const box = document.getElementById('teacherTestDetailContent');
    if (!box || !selectedTestReport) return;
    const test = selectedTestReport.test || {};
    const summary = selectedTestReport.summary || {};
    const ranking = selectedTestReport.ranking || [];
    const nonAttempted = selectedTestReport.nonAttemptedStudents || [];
    const attempts = selectedTestReport.attemptHistory || [];

    box.innerHTML = `<div class="teacher-print-report" data-report-kind="test">
      <div class="teacher-report-heading"><div><span class="teacher-card-kicker">Test report • Phase 2.5C</span><h2>${escapeHTML(test.testTitle || 'Assessment')}</h2><p>${escapeHTML(chapterLabel(test))} • ${escapeHTML(test.testType || 'Assessment')}${test.topic ? ` • ${escapeHTML(test.topic)}` : ''}</p></div><div class="teacher-report-date">Generated ${escapeHTML(formatDate(selectedTestReport.generatedAt))}</div></div>
      <div class="teacher-report-stats">${reportStat('Eligible', summary.eligibleStudents)}${reportStat('Attempted', summary.attemptedStudents)}${reportStat('Not Attempted', summary.nonAttemptedStudents)}${reportStat('Completion', `${numberText(summary.completionRate)}%`)}${reportStat('Average', `${numberText(summary.averagePercent)}%`)}${reportStat('Highest', `${numberText(summary.highestPercent)}%`)}${reportStat('Lowest', `${numberText(summary.lowestPercent)}%`)}${reportStat('Multiple Attempts', summary.multipleAttemptStudents)}</div>
      <div class="teacher-report-grid">
        <section class="teacher-report-section"><div class="teacher-detail-section-head"><div><h3>Student Ranking</h3><p>Ranked by best score, then latest score.</p></div></div>${ranking.length ? `<div class="teacher-table-wrap"><table class="teacher-report-table"><thead><tr><th>Rank</th><th>Student</th><th>Attempts</th><th>First</th><th>Latest</th><th>Best</th><th>Change</th><th>Trend</th></tr></thead><tbody>${ranking.map(row => `<tr><td>${numberText(row.rank)}</td><td><b>${escapeHTML(row.name)}</b><small>${escapeHTML(row.studentId)}</small></td><td>${numberText(row.attemptCount)}</td><td>${numberText(row.firstPercent)}%</td><td>${numberText(row.latestPercent)}%</td><td>${numberText(row.bestPercent)}%</td><td class="${Number(row.improvement || 0) >= 0 ? 'positive' : 'negative'}">${signedNumber(row.improvement)}%</td><td>${escapeHTML(row.trend || '—')}</td></tr>`).join('')}</tbody></table></div>` : '<div class="teacher-empty">No students have attempted this test.</div>'}</section>
        <section class="teacher-report-section"><div class="teacher-detail-section-head"><div><h3>Not Attempted</h3><p>Eligible students without a recorded result.</p></div><span class="teacher-count-pill warning">${nonAttempted.length}</span></div><div class="teacher-non-attempt-list">${nonAttempted.length ? nonAttempted.map(student => `<div><b>${escapeHTML(student.name)}</b><span>${escapeHTML(student.studentId)} • ${escapeHTML(student.board || '')} • ${escapeHTML(student.medium || '')}</span></div>`).join('') : '<div class="teacher-empty">Every eligible student has attempted this test.</div>'}</div></section>
      </div>
      <section class="teacher-report-section teacher-attempt-history-section"><div class="teacher-detail-section-head"><div><h3>Attempt History</h3><p>All recorded attempts, including retries.</p></div><span class="teacher-count-pill">${attempts.length} attempts</span></div><div class="teacher-table-wrap"><table class="teacher-report-table"><thead><tr><th>Date</th><th>Student</th><th>Attempt</th><th>Score</th><th>Percentage</th></tr></thead><tbody>${attempts.map(row => `<tr><td>${escapeHTML(formatDate(row.createdAt))}</td><td><b>${escapeHTML(row.studentName)}</b><small>${escapeHTML(row.studentId)}</small></td><td>${numberText(row.attemptNumber)}</td><td>${escapeHTML(scoreLine(row))}</td><td>${numberText(row.percent)}%</td></tr>`).join('')}</tbody></table></div></section>
    </div>`;
  }

  function backToTests() {
    selectedTestKey = '';
    openPanel('testMonitoringPanel');
  }

  async function loadClassReport(force=false) {
    if (classReportPromise) return classReportPromise;
    if (classReport && !force) { renderClassReport(); return classReport; }
    const button = document.getElementById('teacherBuildClassReport');
    setBusy(button, true, 'Building…');
    setClassReportStatus('Building verified class report…', 'info');

    const filters = {
      board:document.getElementById('teacherReportBoardFilter')?.value || '',
      medium:document.getElementById('teacherReportMediumFilter')?.value || '',
      chapterId:document.getElementById('teacherReportChapterFilter')?.value || '',
      testType:document.getElementById('teacherReportTestTypeFilter')?.value || '',
      dateFrom:document.getElementById('teacherReportDateFrom')?.value || '',
      dateTo:document.getElementById('teacherReportDateTo')?.value || ''
    };

    classReportPromise = (async () => {
      try {
        const data = await WTC_API.call({ action:'teacherGetClassReport', ...filters, ...teacherIdentity() });
        if (!data || data.success === false) throw new Error(data?.message || 'Class report could not be loaded.');
        classReport = data;
        renderClassReport();
        setClassReportStatus('', 'success');
        return data;
      } catch (error) {
        classReport = null;
        setClassReportStatus(error.message || 'Class report failed to load.', 'error');
        document.getElementById('teacherClassReportContent').innerHTML = `<div class="teacher-empty">${escapeHTML(error.message || 'Class report failed to load.')}</div>`;
        showToast(error.message || 'Class report failed to load.', 'error');
        return null;
      } finally {
        setBusy(button, false);
        classReportPromise = null;
      }
    })();
    return classReportPromise;
  }

  function renderClassReport() {
    const box = document.getElementById('teacherClassReportContent');
    if (!box || !classReport) return;
    const summary = classReport.summary || {};
    const reportStudents = classReport.students || [];
    const tests = classReport.tests || [];
    const chapters = classReport.chapters || [];
    const assignment = classReport.assignment || dashboardData?.assignment || {};
    const filters = classReport.filters || {};
    const filterLabel = [filters.board, filters.medium, filters.chapterId, filters.testType, filters.dateFrom && `From ${filters.dateFrom}`, filters.dateTo && `To ${filters.dateTo}`].filter(Boolean).join(' • ') || 'All verified assignment evidence';

    box.innerHTML = `<div class="teacher-print-report" data-report-kind="class">
      <div class="teacher-report-heading"><div><span class="teacher-card-kicker">Class report • Phase 2.5C</span><h2>${escapeHTML(assignment.classLabel || 'Assigned Class')} • ${escapeHTML(assignment.subjectLabel || 'Assigned Subject')}</h2><p>${escapeHTML(filterLabel)}</p></div><div class="teacher-report-date">Generated ${escapeHTML(formatDate(classReport.generatedAt))}</div></div>
      <div class="teacher-report-stats">${reportStat('Students', summary.assignedStudents)}${reportStat('With Attempts', summary.studentsWithAttempts)}${reportStat('Without Attempts', summary.studentsWithoutAttempts)}${reportStat('Tests', summary.uniqueTests)}${reportStat('Attempts', summary.totalAttempts)}${reportStat('Class Average', `${numberText(summary.classAverage)}%`)}${reportStat('Avg. Completion', `${numberText(summary.averageTestCompletion)}%`)}${reportStat('Below 50%', summary.studentsBelow50)}</div>
      <section class="teacher-report-section"><div class="teacher-detail-section-head"><div><h3>Student Summary</h3><p>Average, progress, completed tests and attention status.</p></div></div><div class="teacher-table-wrap"><table class="teacher-report-table"><thead><tr><th>Student</th><th>Attempts</th><th>Tests</th><th>Test Completion</th><th>Average</th><th>Progress</th><th>Trend</th><th>Status</th></tr></thead><tbody>${reportStudents.map(row => `<tr><td><b>${escapeHTML(row.name)}</b><small>${escapeHTML(row.studentId)} • ${escapeHTML(row.board || '')} • ${escapeHTML(row.medium || '')}</small></td><td>${numberText(row.attemptCount)}</td><td>${numberText(row.testsAttempted)}</td><td>${numberText(row.testCompletionRate)}%</td><td>${numberText(row.averagePercent)}%</td><td>${numberText(row.progressPercent)}%</td><td>${escapeHTML(row.trend || '—')}</td><td>${escapeHTML(row.performanceStatus || '—')}</td></tr>`).join('')}</tbody></table></div></section>
      <section class="teacher-report-section"><div class="teacher-detail-section-head"><div><h3>Test Summary</h3><p>Completion and performance for each recorded test.</p></div></div><div class="teacher-table-wrap"><table class="teacher-report-table"><thead><tr><th>Test</th><th>Chapter</th><th>Type</th><th>Attempted</th><th>Not Attempted</th><th>Completion</th><th>Average</th></tr></thead><tbody>${tests.map(test => `<tr><td><b>${escapeHTML(test.testTitle)}</b><small>${escapeHTML(test.testId || '')}</small></td><td>${escapeHTML(test.chapterName || test.chapterId || '—')}</td><td>${escapeHTML(test.testType || '—')}</td><td>${numberText(test.attemptedStudents)}/${numberText(test.eligibleStudents)}</td><td>${numberText(test.nonAttemptedStudents)}</td><td>${numberText(test.completionRate)}%</td><td>${numberText(test.averagePercent)}%</td></tr>`).join('')}</tbody></table></div></section>
      <section class="teacher-report-section"><div class="teacher-detail-section-head"><div><h3>Chapter Summary</h3><p>Class progress and weak-student signals by chapter.</p></div></div><div class="teacher-table-wrap"><table class="teacher-report-table"><thead><tr><th>Chapter</th><th>Attempts</th><th>Attempted Students</th><th>Average</th><th>Progress</th><th>Weak Students</th><th>Completed</th></tr></thead><tbody>${chapters.map(chapter => `<tr><td><b>${escapeHTML(chapterLabel(chapter))}</b><small>${escapeHTML(chapter.chapterId || '')}</small></td><td>${numberText(chapter.attemptCount)}</td><td>${numberText(chapter.attemptedStudents)}</td><td>${numberText(chapter.averagePercent)}%</td><td>${numberText(chapter.averageProgress)}%</td><td>${numberText(chapter.weakStudents)}</td><td>${numberText(chapter.completedStudents)}</td></tr>`).join('')}</tbody></table></div></section>
    </div>`;
  }

  function renderTestPreview() {
    const box = document.getElementById('teacherTestPreview');
    if (!box) return;
    const preview = [...testCatalog].sort((a, b) => Number(a.completionRate || 0) - Number(b.completionRate || 0)).slice(0, 4);
    box.innerHTML = preview.length ? preview.map(test => `<div class="teacher-compact-result"><div><h4>${escapeHTML(test.testTitle || 'Assessment')}</h4><p>${numberText(test.attemptedStudents)}/${numberText(test.eligibleStudents)} attempted • ${numberText(test.nonAttemptedStudents)} pending</p></div><div class="teacher-score-badge">${numberText(test.completionRate)}%</div></div>`).join('') : '<div class="teacher-empty">No recorded tests yet.</div>';
  }

  function renderClassReportPreview() {
    const box = document.getElementById('teacherClassReportPreview');
    if (!box) return;
    const summary = dashboardData?.classReportSummary || {};
    box.innerHTML = `<div class="teacher-report-preview-grid">${reportPreviewMetric('Tests', summary.uniqueTests)}${reportPreviewMetric('Completion', `${numberText(summary.averageTestCompletion)}%`)}${reportPreviewMetric('Class Average', `${numberText(summary.classAverage)}%`)}${reportPreviewMetric('No Attempts', summary.studentsWithoutAttempts)}</div>`;
  }

  function downloadTestCsv() {
    if (!selectedTestReport) return showToast('Open a test report first.', 'error');
    const test = selectedTestReport.test || {};
    const rows = [['Record Type','Rank','Student ID','Student Name','Attempts','First %','Latest %','Best %','Average %','Improvement','Trend','Status']];
    (selectedTestReport.ranking || []).forEach(row => rows.push(['Attempted',row.rank,row.studentId,row.name,row.attemptCount,row.firstPercent,row.latestPercent,row.bestPercent,row.averagePercent,row.improvement,row.trend,row.performanceStatus]));
    (selectedTestReport.nonAttemptedStudents || []).forEach(row => rows.push(['Not Attempted','',row.studentId,row.name,0,'','','','','','','No Attempt']));
    downloadCsv(rows, `WTC_Test_Report_${safeFileName(test.testTitle || test.testId || 'Test')}.csv`);
  }

  function downloadClassCsv() {
    if (!classReport) return showToast('Build the class report first.', 'error');
    const rows = [['Record Type','Student/Test ID','Name/Title','Board/Chapter','Medium/Type','Attempts','Tests Attempted','Completion %','Average %','Progress %','Trend/Status']];
    (classReport.students || []).forEach(row => rows.push(['Student',row.studentId,row.name,row.board,row.medium,row.attemptCount,row.testsAttempted,row.testCompletionRate,row.averagePercent,row.progressPercent,row.trend]));
    (classReport.tests || []).forEach(row => rows.push(['Test',row.testId,row.testTitle,row.chapterName,row.testType,row.attemptCount,row.attemptedStudents,row.completionRate,row.averagePercent,'',row.performanceStatus]));
    downloadCsv(rows, `WTC_Class_Report_${new Date().toISOString().slice(0,10)}.csv`);
  }

  function printTestReport() {
    if (!selectedTestReport) return showToast('Open a test report first.', 'error');
    printReport('printing-test-report');
  }

  function printClassReport() {
    if (!classReport) return showToast('Build the class report first.', 'error');
    printReport('printing-class-report');
  }

  function printReport(className) {
    document.body.classList.add(className);
    window.addEventListener('afterprint', () => document.body.classList.remove(className), { once:true });
    window.print();
  }

  function downloadCsv(rows, filename) {
    const csv = '\ufeff' + rows.map(row => row.map(csvCell).join(',')).join('\r\n');
    const blob = new Blob([csv], { type:'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  function csvCell(value) { const raw = String(value ?? ''); const safe = /^[=+@]/.test(raw) || /^-[^0-9.]/.test(raw) ? `'${raw}` : raw; return `"${safe.replace(/"/g, '""')}"`; }
  function safeFileName(value) { return String(value || 'Report').replace(/[^A-Za-z0-9_-]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 80) || 'Report'; }
  function signedNumber(value) { const number = numberText(value); return number > 0 ? `+${number}` : String(number); }
  function dateTime(value) { const time = new Date(value || 0).getTime(); return Number.isFinite(time) ? time : 0; }
  function testMetric(label, value) { return `<div><small>${escapeHTML(label)}</small><b>${escapeHTML(String(value ?? '—'))}</b></div>`; }
  function reportStat(label, value) { return `<div class="teacher-report-stat"><small>${escapeHTML(label)}</small><strong>${escapeHTML(String(value ?? '—'))}</strong></div>`; }
  function reportPreviewMetric(label, value) { return `<div><small>${escapeHTML(label)}</small><b>${escapeHTML(String(value ?? '—'))}</b></div>`; }

  function setTestDetailStatus(message, type='info') {
    const element = document.getElementById('teacherTestDetailStatus');
    if (!element) return;
    element.className = `teacher-detail-status ${type}${message ? '' : ' hidden'}`;
    element.textContent = message || '';
  }

  function setClassReportStatus(message, type='info') {
    const element = document.getElementById('teacherClassReportStatus');
    if (!element) return;
    element.className = `teacher-detail-status ${type}${message ? '' : ' hidden'}`;
    element.textContent = message || '';
  }

  function renderAttention() {
    const box = document.getElementById('teacherAttentionList');
    const summary = document.getElementById('teacherAttentionSummary');
    if (!box || !summary) return;

    const critical = attentionStudents.filter(item => item.statusClass === 'critical').length;
    const noActivity = attentionStudents.filter(item => item.statusClass === 'no-activity').length;
    const declining = attentionStudents.filter(item => normalize(item.trend) === 'declining').length;
    const weakChapters = attentionStudents.reduce((total, item) => total + Number(item.weakChapterCount || 0), 0);
    summary.innerHTML = `${attentionSummaryCard('Critical', critical)}${attentionSummaryCard('No Activity', noActivity)}${attentionSummaryCard('Declining', declining)}${attentionSummaryCard('Weak Chapter Signals', weakChapters)}`;
    setText('teacherAttentionCountLabel', `${attentionStudents.length} student${attentionStudents.length === 1 ? '' : 's'}`);

    box.innerHTML = attentionStudents.length ? attentionStudents.map(student => `<article class="teacher-attention-card ${escapeAttribute(student.statusClass || 'attention')}">
      <div class="teacher-attention-card-head"><div><div class="teacher-student-copy-head"><h3>${escapeHTML(student.name || 'Student')}</h3>${performanceBadge(student)}</div><p>${escapeHTML(student.studentId || '—')} • ${escapeHTML(student.board || '—')} • ${escapeHTML(student.medium || '—')}</p></div><button class="teacher-view-report" type="button" data-open-student-report="${escapeAttribute(student.studentId || '')}">Open Report</button></div>
      <div class="teacher-attention-reasons">${(student.attentionReasons || ['Needs attention']).map(reason => `<span class="teacher-attention-reason">${escapeHTML(reason)}</span>`).join('')}</div>
      <div class="teacher-attention-performance">${attentionMetric('Average', `${numberText(student.averagePercent)}%`)}${attentionMetric('Attempts', student.attemptCount)}${attentionMetric('Weak Chapters', student.weakChapterCount)}${attentionMetric('Last Activity', shortActivity(student))}</div>
    </article>`).join('') : '<div class="teacher-empty">No students currently trigger an automated weak-area signal.</div>';
  }

  function renderRecentPreview() {
    const box = document.getElementById('teacherRecentResultPreview');
    if (!box) return;
    const preview = results.slice(0, 4);
    box.innerHTML = preview.length ? preview.map(result => `<div class="teacher-compact-result"><div><h4>${escapeHTML(result.studentName || 'Student')} • ${escapeHTML(result.chapterName || result.chapterId || 'Chapter')}</h4><p>${escapeHTML(result.testTitle || result.testType || 'Assessment')} • ${escapeHTML(formatDate(result.createdAt))}</p></div><div class="teacher-score-badge">${numberText(result.percent)}%</div></div>`).join('') : '<div class="teacher-empty">No matching results yet.</div>';
  }

  function renderAttentionPreview() {
    const box = document.getElementById('teacherAttentionPreview');
    if (!box) return;
    const preview = attentionStudents.slice(0, 4);
    box.innerHTML = preview.length ? preview.map(student => `<div class="teacher-compact-result"><div><h4>${escapeHTML(student.name || 'Student')}</h4><p>${escapeHTML(student.attentionReason || 'Needs attention')} • ${numberText(student.averagePercent)}% average</p></div>${performanceBadge(student)}</div>`).join('') : '<div class="teacher-empty">No current attention signals.</div>';
  }

  function renderChapterPreview() {
    const box = document.getElementById('teacherChapterPreview');
    if (!box) return;
    const preview = [...chapterAnalytics].sort((a, b) => Number(b.weakStudents || 0) - Number(a.weakStudents || 0)).slice(0, 4);
    box.innerHTML = preview.length ? preview.map(chapter => `<div class="teacher-compact-result"><div><h4>${escapeHTML(chapterLabel(chapter))}</h4><p>${numberText(chapter.attemptedStudents)} attempted • ${numberText(chapter.weakStudents)} weak • ${numberText(chapter.averageProgress)}% progress</p></div><div class="teacher-score-badge">${numberText(chapter.averagePercent)}%</div></div>`).join('') : '<div class="teacher-empty">No assigned chapters found.</div>';
  }

  function renderLoadError(message) {
    const safe = escapeHTML(message || 'Could not load teacher data.');
    ['teacherStudentList', 'teacherResultList', 'teacherRecentResultPreview', 'teacherChapterAnalyticsList', 'teacherAttentionList', 'teacherAttentionPreview', 'teacherChapterPreview', 'teacherTestCatalogList', 'teacherTestPreview', 'teacherClassReportPreview'].forEach(id => {
      const element = document.getElementById(id);
      if (element) element.innerHTML = `<div class="teacher-empty">${safe}</div>`;
    });
  }

  function teacherIdentity() {
    return {
      teacherId: teacherUser.teacherId || teacherUser.id || '',
      mobile: teacherUser.mobile || '',
      deviceId: typeof WTC_AUTH.deviceId === 'function' ? WTC_AUTH.deviceId() : ''
    };
  }

  function performanceBadge(item) {
    const key = normalize(item.statusClass || scoreClass(item.averagePercent));
    const label = item.performanceStatus || scoreLabel(item.averagePercent, Number(item.attemptCount || 0));
    return `<span class="teacher-performance-badge ${escapeAttribute(key || 'no-activity')}">${escapeHTML(label)}</span>`;
  }

  function scoreClass(percent) {
    const value = Number(percent || 0);
    if (value >= 85) return 'excellent';
    if (value >= 60) return 'good';
    if (value >= 50) return 'attention';
    return 'critical';
  }

  function scoreLabel(percent, attemptCount=1) {
    if (!attemptCount) return 'No Activity';
    return ({ excellent:'Excellent', good:'Good', attention:'Needs Attention', critical:'Critical' })[scoreClass(percent)];
  }

  function trendLabel(value) {
    const trend = String(value || 'Not enough data');
    const icon = trend === 'Improving' ? '↗' : trend === 'Declining' ? '↘' : trend === 'Stable' ? '→' : '•';
    return `${icon} ${trend}`;
  }

  function chapterLabel(chapter) {
    const number = chapter.chapterNo ? `Chapter ${chapter.chapterNo}: ` : '';
    return `${number}${chapter.chapterName || chapter.chapterId || 'Chapter'}`;
  }

  function detailStat(label, value) { return `<div class="teacher-detail-stat"><small>${escapeHTML(label)}</small><strong>${escapeHTML(String(value ?? '—'))}</strong></div>`; }
  function chapterMetric(label, value) { return `<div class="teacher-chapter-metric"><small>${escapeHTML(label)}</small><b>${escapeHTML(String(value ?? '—'))}</b></div>`; }
  function classChapterMetric(label, value) { return `<div class="teacher-class-chapter-metric"><small>${escapeHTML(label)}</small><b>${escapeHTML(String(value ?? '—'))}</b></div>`; }
  function attentionMetric(label, value) { return `<div><small>${escapeHTML(label)}</small><b>${escapeHTML(String(value ?? '—'))}</b></div>`; }
  function attentionSummaryCard(label, value) { return `<div class="teacher-attention-summary-card"><small>${escapeHTML(label)}</small><strong>${numberText(value)}</strong></div>`; }

  function shortActivity(student) {
    if (student.daysSinceActivity === null || student.daysSinceActivity === undefined) return 'No data';
    return Number(student.daysSinceActivity) === 0 ? 'Today' : `${numberText(student.daysSinceActivity)}d ago`;
  }

  function setDetailStatus(message, type='info') {
    const element = document.getElementById('teacherStudentDetailStatus');
    if (!element) return;
    element.classList.toggle('hidden', !message);
    element.className = `teacher-detail-status ${type}${message ? '' : ' hidden'}`;
    element.textContent = message || '';
  }

  function populateFilterOptions(id, values, firstLabel, objectMode=false) {
    const select = document.getElementById(id);
    if (!select) return;
    const current = select.value;
    const options = objectMode
      ? uniqueObjects(values || [])
      : unique((values || []).filter(Boolean)).map(value => ({ value, label:value }));
    select.innerHTML = `<option value="">${escapeHTML(firstLabel)}</option>` + options.map(item => `<option value="${escapeAttribute(item.value)}">${escapeHTML(item.label)}</option>`).join('');
    if (options.some(item => item.value === current)) select.value = current;
  }

  function uniqueObjects(values) {
    const map = new Map();
    values.forEach(item => {
      const value = String(item?.value || '').trim();
      if (value && !map.has(value)) map.set(value, { value, label:String(item?.label || value) });
    });
    return [...map.values()].sort((a, b) => a.label.localeCompare(b.label));
  }

  function logDashboardOpen() {
    try {
      if (typeof WTC_API.logAccess !== 'function') return;
      Promise.resolve(WTC_API.logAccess({ userId:teacherUser.teacherId || teacherUser.id || '', name:teacherUser.name || 'Teacher', role:'Teacher', mobile:teacherUser.mobile || '', actionName:'Teacher Dashboard 2.5C Open', url:location.pathname })).catch(() => {});
    } catch (error) {}
  }

  function setGlobalStatus(message, type='info') {
    const element = document.getElementById('teacherGlobalStatus');
    if (!element) return;
    element.className = `teacher-status ${type}`;
    element.textContent = message;
  }

  function setBusy(button, busy, busyLabel='Loading…') {
    if (!button) return;
    if (window.WTC_UI?.setBusy) { WTC_UI.setBusy(button, busy, busyLabel); return; }
    if (busy) {
      button.dataset.originalText = button.textContent;
      button.textContent = busyLabel;
      button.disabled = true;
    } else {
      button.textContent = button.dataset.originalText || button.textContent;
      button.disabled = false;
      delete button.dataset.originalText;
    }
  }

  function showToast(message, type='success') { if (window.WTC_UI?.toast) WTC_UI.toast(message, type); }
  function setText(id, value) { const element = document.getElementById(id); if (element) element.textContent = String(value ?? ''); }
  function profileList(profiles) { return Array.isArray(profiles) && profiles.length ? profiles.map(item => [item.board, item.medium].filter(Boolean).join(' / ')).filter(Boolean).join(', ') : 'No matching student profiles'; }
  function scoreLine(result) { return result.score !== undefined && result.score !== '' && result.total !== undefined && result.total !== '' ? `${result.score}/${result.total}` : 'Recorded result'; }

  function formatDate(value, compact=false) {
    if (!value) return compact ? 'No activity recorded' : 'Date unavailable';
    const raw = String(value);
    let parsed = new Date(raw);
    if (Number.isNaN(parsed.getTime()) && /^\d{4}-\d{2}-\d{2} /.test(raw)) parsed = new Date(raw.replace(' ', 'T'));
    if (Number.isNaN(parsed.getTime())) return raw;
    return new Intl.DateTimeFormat('en-IN', compact ? { day:'2-digit', month:'short', year:'numeric' } : { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' }).format(parsed);
  }

  function clampPercent(value) { return Math.max(0, Math.min(100, numberText(value))); }
  function maskMobile(value) { const digits = String(value || '').replace(/\D/g, ''); return digits ? `${'•'.repeat(Math.max(0, digits.length - 4))}${digits.slice(-4)}` : '—'; }
  function firstName(value) { return String(value || 'Teacher').trim().split(/\s+/)[0] || 'Teacher'; }
  function initials(value) { if (window.WTC_UI?.initials) return WTC_UI.initials(value || 'Teacher'); return String(value || 'Teacher').trim().split(/\s+/).slice(0, 2).map(part => part.charAt(0).toUpperCase()).join('') || 'T'; }
  function numberText(value) { const number = Number(value || 0); return Number.isFinite(number) ? Math.round(number) : 0; }
  function normalize(value='') { return String(value || '').trim().toLowerCase(); }
  function unique(values) { return [...new Set((values || []).map(value => String(value || '').trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b)); }
  function escapeHTML(value='') { return String(value).replace(/[&<>"']/g, character => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#039;' }[character])); }
  function escapeAttribute(value='') { return escapeHTML(value).replace(/`/g, '&#096;'); }
  function cssEscape(value='') { return window.CSS?.escape ? CSS.escape(String(value)) : String(value).replace(/[^A-Za-z0-9_-]/g, '\\$&'); }
  function safeStorageGet(key) { try { return localStorage.getItem(key) || ''; } catch (error) { return ''; } }
  function safeStorageSet(key, value) { try { localStorage.setItem(key, value); } catch (error) {} }

  return { init, openPanel, toggleSidebar, refresh, openStudentReport, backToStudents, openTestReport, backToTests, loadClassReport, downloadTestCsv, downloadClassCsv, printTestReport, printClassReport };
})();

document.addEventListener('DOMContentLoaded', TeacherApp.init);
