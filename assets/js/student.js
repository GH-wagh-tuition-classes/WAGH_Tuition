const StudentApp = (() => {
  let user, subjects = [], chapters = [], selectedSubject = null, selectedChapter = null;
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
    document.getElementById('studentMeta').textContent = `${user.board || 'Board'} · ${user.className || user.class || 'Class'} · ${user.medium || 'Medium'}`;
  }
  function show(section) {
    document.querySelectorAll('.page-section').forEach(s => s.classList.remove('active'));
    document.getElementById(section).classList.add('active');
    document.querySelectorAll('[data-nav]').forEach(b => b.classList.toggle('active', b.dataset.nav === section));
  }
  async function loadSubjects() {
    const box = document.getElementById('subjectGrid');
    box.innerHTML = '<div class="card">Loading subjects...</div>';
    const data = await WTC_API.getSubjects({ board: user.board, className: user.className || user.class, medium: user.medium, studentId: user.id });
    subjects = data.subjects || [];
    if (!subjects.length) subjects = [{subjectId:'SCI',subjectName:'Science',icon:'🔬'},{subjectId:'MATH',subjectName:'Mathematics',icon:'➗'},{subjectId:'ENG',subjectName:'English',icon:'📘'}];
    box.innerHTML = subjects.map(s => `<div class="card subject-card" onclick="StudentApp.openSubject('${s.subjectId || s.id || s.subjectName}')"><div class="subject-icon">${s.icon || '📚'}</div><h3>${s.subjectName || s.name}</h3><p class="muted">Open chapters</p></div>`).join('');
  }
  async function openSubject(id) {
    selectedSubject = subjects.find(s => String(s.subjectId || s.id || s.subjectName) === String(id));
    document.getElementById('chapterSubjectTitle').textContent = selectedSubject.subjectName || selectedSubject.name;
    show('chaptersSection');
    await loadChapters();
  }
  async function loadChapters() {
    const box = document.getElementById('chapterGrid');
    box.innerHTML = '<div class="card">Loading chapters...</div>';
    const data = await WTC_API.getChapters({ board: user.board, className: user.className || user.class, medium: user.medium, subjectId: selectedSubject.subjectId || selectedSubject.id, subjectName: selectedSubject.subjectName || selectedSubject.name });
    chapters = data.chapters || [];
    box.innerHTML = chapters.length ? chapters.map(c => `<div class="card chapter-card" onclick="StudentApp.openChapter('${c.chapterId || c.id || c.chapterNo}')"><span class="pill">Chapter ${c.chapterNo || ''}</span><h3>${c.chapterName || c.name}</h3><p class="muted">${c.description || 'Open chapter features'}</p></div>`).join('') : '<div class="card">No chapters found for this subject yet.</div>';
  }
  async function openChapter(id) {
    selectedChapter = chapters.find(c => String(c.chapterId || c.id || c.chapterNo) === String(id));
    document.getElementById('featureChapterTitle').textContent = selectedChapter.chapterName || selectedChapter.name;
    show('featuresSection');
    const box = document.getElementById('featureGrid');
    box.innerHTML = '<div class="card">Loading features...</div>';
    const data = await WTC_API.getFeatures({ chapterId: selectedChapter.chapterId || selectedChapter.id, subjectId: selectedSubject.subjectId || selectedSubject.id });
    const features = data.features && data.features.length ? data.features : selectedChapter.features || [];
    box.innerHTML = features.length ? features.map(f => `<button class="feature-btn" onclick="StudentApp.openFeature('${f.url || '#'}','${f.featureName || f.name}')">${f.icon || '🔗'} ${f.featureName || f.name}<small>${f.type || 'Learning feature'}</small></button>`).join('') : '<div class="card">No feature buttons added yet.</div>';
  }
  function openFeature(url, name) {
    WTC_API.logAccess({ userId:user.id, name:user.name, role:user.role, mobile:user.mobile, actionName:name, url }).catch(()=>{});
    if (!url || url === '#') return WTC_UI.toast('This feature will be added soon.', 'error');
    window.location.href = url;
  }
  async function loadProgress() {
    try {
      const data = await WTC_API.getProgress(user.id);
      const p = Array.isArray(data.progress) ? data.progress[0] : data.progress;
      const percent = Number(p?.percent || 0);
      document.getElementById('progressPercent').textContent = percent + '%';
      document.getElementById('progressFill').style.width = percent + '%';
    } catch { document.getElementById('progressPercent').textContent = '0%'; }
  }
  function bindProfile() {
    const form = document.getElementById('profileForm');
    ['name','mobile','board','className','medium'].forEach(k => { if (form[k]) form[k].value = user[k] || user.class || ''; });
    form.addEventListener('submit', async e => {
      e.preventDefault();
      const payload = Object.fromEntries(new FormData(form).entries());
      payload.studentId = user.id;
      try {
        const data = await WTC_API.updateProfile(payload);
        if (!data.success) return WTC_UI.toast(data.message || 'Profile update failed.', 'error');
        user = { ...user, ...payload };
        WTC_AUTH.setUser(user);
        fillUser();
        WTC_UI.toast('Profile saved successfully.', 'success');
      } catch (err) { WTC_UI.toast(err.message, 'error'); }
    });
  }
  return { init, show, openSubject, openChapter, openFeature };
})();
document.addEventListener('DOMContentLoaded', StudentApp.init);
