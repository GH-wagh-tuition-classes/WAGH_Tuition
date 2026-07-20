/* WAGH Tuition Classes — Teacher Dashboard Phase 2.5A v1.0 */
const TeacherApp = (() => {
  const PANEL_HASH = {
    dashboardPanel: 'overview',
    studentsPanel: 'students',
    resultsPanel: 'results',
    profilePanel: 'profile'
  };
  const HASH_PANEL = Object.fromEntries(Object.entries(PANEL_HASH).map(([panel, hash]) => [hash, panel]));
  const PANEL_STORAGE_KEY = 'wtc:teacher:last-panel:2-5a';

  let teacherUser = null;
  let dashboardData = null;
  let students = [];
  let results = [];
  let loadingPromise = null;

  async function init() {
    teacherUser = WTC_AUTH.requireRole('Teacher');
    if (!teacherUser) return;

    fillSessionHeader();
    bindLayout();
    bindStudentFilters();
    restorePanel();
    await loadDashboard();
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

  function bindStudentFilters() {
    ['teacherStudentSearch', 'teacherBoardFilter', 'teacherMediumFilter', 'teacherPerformanceFilter']
      .forEach(id => document.getElementById(id)?.addEventListener('input', renderStudents));
  }

  function restorePanel() {
    const hash = String(window.location.hash || '').replace(/^#/, '');
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

    safeStorageSet(PANEL_STORAGE_KEY, panelId);
    if (updateLocation && PANEL_HASH[panelId]) history.replaceState(null, '', `#${PANEL_HASH[panelId]}`);

    toggleSidebar(false);
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
    return loadDashboard(true);
  }

  async function loadDashboard(force=false) {
    if (loadingPromise && !force) return loadingPromise;
    if (loadingPromise && force) return loadingPromise;

    const refreshButton = document.querySelector('.teacher-refresh-button');
    setBusy(refreshButton, true, 'Refreshing…');
    setGlobalStatus('Loading teacher dashboard…', 'info');

    loadingPromise = (async () => {
      try {
        const data = await WTC_API.call({
          action: 'teacherDashboard',
          teacherId: teacherUser.teacherId || teacherUser.id || '',
          mobile: teacherUser.mobile || '',
          deviceId: typeof WTC_AUTH.deviceId === 'function' ? WTC_AUTH.deviceId() : ''
        });
        if (!data || data.success === false) throw new Error(data?.message || 'Teacher dashboard could not be loaded.');

        dashboardData = data;
        students = Array.isArray(data.students) ? data.students : [];
        results = Array.isArray(data.recentResults) ? data.recentResults : [];
        renderAll();

        const warningCount = Array.isArray(data.assignmentWarnings) ? data.assignmentWarnings.length : 0;
        setGlobalStatus(
          warningCount ? 'Dashboard loaded with an assignment notice. Review Teaching Scope below.' : 'Teacher dashboard loaded successfully.',
          warningCount ? 'warning' : 'success'
        );
        return data;
      } catch (error) {
        setGlobalStatus(error.message || 'Teacher dashboard failed to load.', 'error');
        showToast(error.message || 'Teacher dashboard failed to load.', 'error');
        renderLoadError(error.message || 'Teacher dashboard failed to load.');
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

    setText('teacherHeroAssignment', `You are viewing the read-only Phase 2.5A dashboard for ${assignmentText}.`);
    setText('teacherAssignedStudents', numberText(overview.assignedStudents));
    setText('teacherActiveStudentsText', `${numberText(overview.activeStudents)} active`);
    setText('teacherTotalAttempts', numberText(overview.totalAttempts));
    setText('teacherAveragePercent', `${numberText(overview.averagePercent)}%`);
    setText('teacherAttentionCount', numberText(overview.needsAttention));
    setText('teacherStudentNavCount', numberText(overview.assignedStudents));

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
    renderStudents();
    renderResults();
    renderRecentPreview();
  }

  function renderStudents() {
    const box = document.getElementById('teacherStudentList');
    if (!box) return;

    const query = normalize(document.getElementById('teacherStudentSearch')?.value);
    const board = normalize(document.getElementById('teacherBoardFilter')?.value);
    const medium = normalize(document.getElementById('teacherMediumFilter')?.value);
    const performance = normalize(document.getElementById('teacherPerformanceFilter')?.value);

    const filtered = students.filter(student => {
      const searchText = normalize([student.studentId, student.name, student.board, student.className, student.medium].join(' '));
      if (query && !searchText.includes(query)) return false;
      if (board && normalize(student.board) !== board) return false;
      if (medium && normalize(student.medium) !== medium) return false;
      if (performance === 'attention' && !student.needsAttention) return false;
      if (performance === 'strong' && Number(student.averagePercent || 0) < 60) return false;
      if (performance === 'no-attempt' && Number(student.attemptCount || 0) !== 0) return false;
      return true;
    });

    setText('teacherStudentCountLabel', `${filtered.length} student${filtered.length === 1 ? '' : 's'}`);

    if (!filtered.length) {
      box.innerHTML = `<div class="teacher-empty">${students.length ? 'No students match the current filters.' : 'No students are currently connected to this class assignment.'}</div>`;
      return;
    }

    box.innerHTML = filtered.map(student => {
      const attempts = Number(student.attemptCount || 0);
      const average = Number(student.averagePercent || 0);
      const progress = Number(student.progressPercent || 0);
      return `<article class="teacher-student-card">
        <div class="teacher-student-main">
          <div class="teacher-student-avatar" aria-hidden="true">${escapeHTML(initials(student.name || 'Student'))}</div>
          <div class="teacher-student-copy">
            <h3>${escapeHTML(student.name || 'Unnamed Student')}</h3>
            <div class="teacher-student-meta">
              <span>ID: ${escapeHTML(student.studentId || '—')}</span>
              <span>${escapeHTML(student.board || '—')}</span>
              <span>${escapeHTML(student.className || '—')}</span>
              <span>${escapeHTML(student.medium || '—')}</span>
              <span>${escapeHTML(student.mobileMasked || 'Mobile hidden')}</span>
              <span>Status: ${escapeHTML(student.status || '—')}</span>
            </div>
            ${student.needsAttention ? `<span class="teacher-attention-flag">${escapeHTML(student.attentionReason || 'Needs attention')}</span>` : ''}
          </div>
        </div>
        <div class="teacher-student-performance" aria-label="Performance for ${escapeAttribute(student.name || 'student')}">
          <div class="teacher-mini-stat"><small>Attempts</small><b>${attempts}</b></div>
          <div class="teacher-mini-stat"><small>Average</small><b>${average}%</b></div>
          <div class="teacher-mini-stat"><small>Progress</small><b>${progress}%</b></div>
        </div>
      </article>`;
    }).join('');
  }

  function renderResults() {
    const box = document.getElementById('teacherResultList');
    if (!box) return;
    setText('teacherResultCountLabel', `${results.length} result${results.length === 1 ? '' : 's'}`);

    if (!results.length) {
      const ready = dashboardData?.assignment?.subjectReady;
      box.innerHTML = `<div class="teacher-empty">${ready ? 'No matching test results have been recorded yet.' : 'Result analytics will load after the Teacher subject assignment matches SUBJECT_MASTER.'}</div>`;
      return;
    }

    box.innerHTML = results.map(result => `<article class="teacher-result-card">
      <div>
        <h3>${escapeHTML(result.studentName || 'Student')} • ${escapeHTML(result.testTitle || result.testType || 'Test')}</h3>
        <div class="teacher-result-meta">
          <span>Student ID: ${escapeHTML(result.studentId || '—')}</span>
          <span>${escapeHTML(result.chapterName || result.chapterId || 'Chapter')}</span>
          <span>${escapeHTML(result.subjectName || 'Subject')}</span>
          <span>${escapeHTML(result.testType || 'Assessment')}</span>
          <span>${escapeHTML(formatDate(result.createdAt))}</span>
        </div>
      </div>
      <div class="teacher-result-score"><strong>${numberText(result.percent)}%</strong><span>${escapeHTML(scoreLine(result))}</span></div>
    </article>`).join('');
  }

  function renderRecentPreview() {
    const box = document.getElementById('teacherRecentResultPreview');
    if (!box) return;
    const preview = results.slice(0, 4);
    if (!preview.length) {
      box.innerHTML = '<div class="teacher-empty">No matching results yet.</div>';
      return;
    }
    box.innerHTML = preview.map(result => `<div class="teacher-compact-result">
      <div><h4>${escapeHTML(result.studentName || 'Student')} • ${escapeHTML(result.chapterName || result.chapterId || 'Chapter')}</h4><p>${escapeHTML(result.testTitle || result.testType || 'Assessment')} • ${escapeHTML(formatDate(result.createdAt))}</p></div>
      <div class="teacher-score-badge">${numberText(result.percent)}%</div>
    </div>`).join('');
  }

  function renderLoadError(message) {
    const safe = escapeHTML(message || 'Could not load teacher data.');
    ['teacherStudentList', 'teacherResultList', 'teacherRecentResultPreview'].forEach(id => {
      const element = document.getElementById(id);
      if (element) element.innerHTML = `<div class="teacher-empty">${safe}</div>`;
    });
  }

  function populateFilterOptions(id, values, firstLabel) {
    const select = document.getElementById(id);
    if (!select) return;
    const current = select.value;
    const clean = unique((values || []).filter(Boolean));
    select.innerHTML = `<option value="">${escapeHTML(firstLabel)}</option>` + clean.map(value => `<option value="${escapeAttribute(value)}">${escapeHTML(value)}</option>`).join('');
    if (clean.includes(current)) select.value = current;
  }

  function logDashboardOpen() {
    try {
      if (typeof WTC_API.logAccess !== 'function') return;
      Promise.resolve(WTC_API.logAccess({
        userId: teacherUser.teacherId || teacherUser.id || '',
        name: teacherUser.name || 'Teacher',
        role: 'Teacher',
        mobile: teacherUser.mobile || '',
        actionName: 'Teacher Dashboard Open',
        url: location.pathname
      })).catch(() => {});
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
    if (window.WTC_UI?.setBusy) {
      WTC_UI.setBusy(button, busy, busyLabel);
      return;
    }
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

  function showToast(message, type='success') {
    if (window.WTC_UI?.toast) WTC_UI.toast(message, type);
  }

  function setText(id, value) {
    const element = document.getElementById(id);
    if (element) element.textContent = String(value ?? '');
  }

  function profileList(profiles) {
    if (!Array.isArray(profiles) || !profiles.length) return 'No matching student profiles';
    return profiles.map(item => [item.board, item.medium].filter(Boolean).join(' / ')).filter(Boolean).join(', ');
  }

  function scoreLine(result) {
    const score = result.score;
    const total = result.total;
    return score !== undefined && score !== '' && total !== undefined && total !== '' ? `${score}/${total}` : 'Recorded result';
  }

  function formatDate(value) {
    if (!value) return 'Date unavailable';
    const parsed = new Date(String(value).replace(' ', 'T'));
    if (Number.isNaN(parsed.getTime())) return String(value);
    return new Intl.DateTimeFormat('en-IN', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' }).format(parsed);
  }

  function maskMobile(value) {
    const digits = String(value || '').replace(/\D/g, '');
    if (!digits) return '—';
    return `${'•'.repeat(Math.max(0, digits.length - 4))}${digits.slice(-4)}`;
  }

  function firstName(value) {
    return String(value || 'Teacher').trim().split(/\s+/)[0] || 'Teacher';
  }

  function initials(value) {
    if (window.WTC_UI?.initials) return WTC_UI.initials(value || 'Teacher');
    return String(value || 'Teacher').trim().split(/\s+/).slice(0, 2).map(part => part.charAt(0).toUpperCase()).join('') || 'T';
  }

  function numberText(value) {
    const number = Number(value || 0);
    return Number.isFinite(number) ? Math.round(number) : 0;
  }

  function normalize(value='') {
    return String(value || '').trim().toLowerCase();
  }

  function unique(values) {
    return [...new Set((values || []).map(value => String(value || '').trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b));
  }

  function escapeHTML(value='') {
    return String(value).replace(/[&<>"']/g, character => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#039;' }[character]));
  }

  function escapeAttribute(value='') {
    return escapeHTML(value).replace(/`/g, '&#096;');
  }

  function cssEscape(value='') {
    if (window.CSS?.escape) return CSS.escape(String(value));
    return String(value).replace(/[^A-Za-z0-9_-]/g, '\\$&');
  }

  function safeStorageGet(key) {
    try { return localStorage.getItem(key) || ''; } catch (error) { return ''; }
  }

  function safeStorageSet(key, value) {
    try { localStorage.setItem(key, value); } catch (error) {}
  }

  return { init, openPanel, toggleSidebar, refresh };
})();

document.addEventListener('DOMContentLoaded', TeacherApp.init);
