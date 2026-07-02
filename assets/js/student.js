const StudentApp = (() => {
  let user = null;
  let subjects = [];
  let chapters = [];
  let selectedSubject = null;
  let selectedChapter = null;

  function init() {
    user = WTC_AUTH.requireRole('Student');
    if (!user) return;
    fillUser();
    bindProfile();
    loadSubjects();
    loadProgress();
  }

  function fillUser() {
    document.querySelectorAll('[data-user-name]').forEach(el => el.textContent = user.name || 'Student');
    document.querySelectorAll('[data-user-avatar]').forEach(el => el.textContent = WTC_UI.initials(user.name));
    const meta = `${user.board || 'Board'} · ${user.className || user.class || 'Class'} · ${user.medium || 'Medium'}`;
    document.getElementById('studentMeta').textContent = meta;
  }

  function show(sectionId) {
    document.querySelectorAll('.page-section').forEach(s => s.classList.remove('active'));
    document.getElementById(sectionId).classList.add('active');
    document.querySelectorAll('[data-nav]').forEach(btn => btn.classList.toggle('active', btn.dataset.nav === sectionId));
  }

  async function loadSubjects() {
    const box = document.getElementById('subjectGrid');
    box.innerHTML = WTC_UI.loadingHTML('Loading your subjects...');
    try {
      const data = await WTC_API.getSubjects({
        studentId: user.id || user.studentId,
        board: user.board,
        className: user.className || user.class,
        medium: user.medium
      });
      subjects = data.subjects || [];
      document.getElementById('subjectCount').textContent = subjects.length;
      box.innerHTML = subjects.length ? subjects.map(s => subjectCard(s)).join('') : WTC_UI.loadingHTML('No subjects found for your profile yet.');
    } catch (err) {
      box.innerHTML = WTC_UI.loadingHTML(err.message);
    }
  }

  function subjectCard(s) {
    const id = WTC_UI.escape(s.subjectId || s.id || s.subjectName || s.name);
    const name = WTC_UI.escape(s.subjectName || s.name || 'Subject');
    return `<div class="card subject-card" onclick="StudentApp.openSubject('${id}')">
      <div class="subject-icon">${s.icon || '📚'}</div>
      <h3>${name}</h3>
      <p class="muted">${WTC_UI.escape(s.description || 'Open chapters')}</p>
    </div>`;
  }

  async function openSubject(id) {
    selectedSubject = subjects.find(s => String(s.subjectId || s.id || s.subjectName || s.name) === String(id));
    if (!selectedSubject) return;
    document.getElementById('chapterSubjectTitle').textContent = selectedSubject.subjectName || selectedSubject.name || 'Subject';
    show('chaptersSection');
    await loadChapters();
  }

  async function loadChapters() {
    const box = document.getElementById('chapterGrid');
    box.innerHTML = WTC_UI.loadingHTML('Loading chapters...');
    const subjectId = selectedSubject.subjectId || selectedSubject.id;
    try {
      const data = await WTC_API.getChapters({
        studentId: user.id || user.studentId,
        board: user.board,
        className: user.className || user.class,
        medium: user.medium,
        subjectId,
        subjectName: selectedSubject.subjectName || selectedSubject.name
      });
      chapters = data.chapters || [];
      document.getElementById('chapterCount').textContent = chapters.length;
      box.innerHTML = chapters.length ? chapters.map(c => chapterCard(c)).join('') : WTC_UI.loadingHTML('No chapters added yet.');
    } catch (err) {
      box.innerHTML = WTC_UI.loadingHTML(err.message);
    }
  }

  function chapterCard(c) {
    const id = WTC_UI.escape(c.chapterId || c.id || c.chapterNo || c.chapterName);
    return `<div class="card chapter-card" onclick="StudentApp.openChapter('${id}')">
      <span class="pill">Chapter ${WTC_UI.escape(c.chapterNo || '')}</span>
      <h3>${WTC_UI.escape(c.chapterName || c.name || 'Chapter')}</h3>
      <p class="muted">${WTC_UI.escape(c.description || 'Open chapter features')}</p>
    </div>`;
  }

  async function openChapter(id) {
    selectedChapter = chapters.find(c => String(c.chapterId || c.id || c.chapterNo || c.chapterName) === String(id));
    if (!selectedChapter) return;
    document.getElementById('featureChapterTitle').textContent = selectedChapter.chapterName || selectedChapter.name || 'Chapter';
    show('featuresSection');
    const box = document.getElementById('featureGrid');
    box.innerHTML = WTC_UI.loadingHTML('Loading feature buttons...');
    try {
      const data = await WTC_API.getChapterFeatures({
        chapterId: selectedChapter.chapterId || selectedChapter.id,
        subjectId: selectedSubject.subjectId || selectedSubject.id
      });
      const features = data.features || [];
      box.innerHTML = features.length ? features.map(f => featureButton(f)).join('') : WTC_UI.loadingHTML('No feature buttons added yet.');
    } catch (err) {
      box.innerHTML = WTC_UI.loadingHTML(err.message);
    }
  }

  function featureButton(f) {
    return `<button class="feature-btn" onclick="StudentApp.openFeature('${WTC_UI.escape(f.url || '#')}', '${WTC_UI.escape(f.featureName || f.name || 'Feature')}')">
      ${f.icon || '🔗'} ${WTC_UI.escape(f.featureName || f.name || 'Feature')}
      <small>${WTC_UI.escape(f.type || 'Learning feature')}</small>
    </button>`;
  }

  function openFeature(url, name) {
    WTC_API.logAccess({
      userId: user.id || user.studentId,
      name: user.name,
      role: user.role,
      mobile: user.mobile,
      actionName: name,
      url
    }).catch(() => {});
    if (!url || url === '#') return WTC_UI.toast('This feature URL is not added yet.', 'error');
    window.location.href = url;
  }

  async function loadProgress() {
    try {
      const data = await WTC_API.getStudentProgress(user.id || user.studentId);
      const p = Array.isArray(data.progress) ? data.progress[0] : data.progress;
      const percent = Number(p?.percent || p?.overallPercent || 0);
      document.getElementById('progressPercent').textContent = percent + '%';
      document.getElementById('progressFill').style.width = percent + '%';
      document.getElementById('progressFill2').style.width = percent + '%';
      document.getElementById('progressText').textContent = `Overall progress: ${percent}%`;
    } catch {
      document.getElementById('progressText').textContent = 'Progress will appear after test records are added.';
    }
  }

  function bindProfile() {
    const form = document.getElementById('profileForm');
    if (!form) return;
    ['name', 'mobile', 'board', 'className', 'medium'].forEach(k => {
      if (form[k]) form[k].value = user[k] || user.class || '';
    });
    form.addEventListener('submit', async e => {
      e.preventDefault();
      const payload = Object.fromEntries(new FormData(form).entries());
      payload.studentId = user.id || user.studentId;
      try {
        const data = await WTC_API.updateStudentProfile(payload);
        if (!data.success) return WTC_UI.toast(data.message || 'Profile update failed.', 'error');
        user = { ...user, ...payload };
        delete user.password;
        WTC_AUTH.setUser(user);
        fillUser();
        WTC_UI.toast('Profile saved successfully.', 'success');
        await loadSubjects();
      } catch (err) { WTC_UI.toast(err.message, 'error'); }
    });
  }

  return { init, show, loadSubjects, openSubject, openChapter, openFeature };
})();

document.addEventListener('DOMContentLoaded', StudentApp.init);
