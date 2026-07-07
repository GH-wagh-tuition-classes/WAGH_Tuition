const StudentApp = (() => {
  let user = null;
  let subjects = [];
  let chapters = [];
  let selectedSubject = null;
  let selectedChapter = null;
  let currentFeatures = [];

  function init() {
    user = WTC_AUTH.requireRole('Student');
    if (!user) return;

    fillUser();
    bindProfile();
    loadSubjects();
    loadProgress();
  }

  function fillUser() {
    document.querySelectorAll('[data-user-name]').forEach(el => {
      el.textContent = user.name || 'Student';
    });

    document.querySelectorAll('[data-user-avatar]').forEach(el => {
      el.textContent = WTC_UI.initials(user.name || 'Student');
    });

    const meta = `${user.board || 'Board'} · ${user.className || user.class || 'Class'} · ${user.medium || 'Medium'}`;
    document.getElementById('studentMeta').textContent = meta;
  }

  function show(sectionId) {
    document.querySelectorAll('.page-section').forEach(section => {
      section.classList.remove('active');
    });

    const section = document.getElementById(sectionId);
    if (section) section.classList.add('active');

    document.querySelectorAll('[data-nav]').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.nav === sectionId);
    });
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

      box.innerHTML = subjects.length
        ? subjects.map(subjectCard).join('')
        : WTC_UI.loadingHTML('No subjects found for your profile yet.');
    } catch (err) {
      box.innerHTML = WTC_UI.loadingHTML(err.message);
    }
  }

  function subjectCard(subject) {
    const id = WTC_UI.escape(subject.subjectId || subject.id || subject.subjectName || subject.name);
    const name = WTC_UI.escape(subject.subjectName || subject.name || 'Subject');

    return `
      <div class="card subject-card" onclick="StudentApp.openSubject('${id}')">
        <div class="subject-icon">${subject.icon || '📚'}</div>
        <h3>${name}</h3>
        <p class="muted">${WTC_UI.escape(subject.description || 'Open chapters')}</p>
      </div>
    `;
  }

  async function openSubject(id) {
    selectedSubject = subjects.find(subject => {
      return String(subject.subjectId || subject.id || subject.subjectName || subject.name) === String(id);
    });

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

      box.innerHTML = chapters.length
        ? chapters.map(chapterCard).join('')
        : WTC_UI.loadingHTML('No chapters added yet.');
    } catch (err) {
      box.innerHTML = WTC_UI.loadingHTML(err.message);
    }
  }

  function chapterCard(chapter) {
    const id = WTC_UI.escape(chapter.chapterId || chapter.id || chapter.chapterNo || chapter.chapterName);

    return `
      <div class="card chapter-card" onclick="StudentApp.openChapter('${id}')">
        <span class="pill">Chapter ${WTC_UI.escape(chapter.chapterNo || '')}</span>
        <h3>${WTC_UI.escape(chapter.chapterName || chapter.name || 'Chapter')}</h3>
        <p class="muted">${WTC_UI.escape(chapter.description || 'Open chapter features')}</p>
      </div>
    `;
  }

  async function openChapter(id) {
    selectedChapter = chapters.find(chapter => {
      return String(chapter.chapterId || chapter.id || chapter.chapterNo || chapter.chapterName) === String(id);
    });

    if (!selectedChapter) return;

    document.getElementById('featureChapterTitle').textContent = selectedChapter.chapterName || selectedChapter.name || 'Chapter';
    show('featuresSection');

    const box = document.getElementById('featureGrid');
    box.innerHTML = WTC_UI.loadingHTML('Loading feature buttons...');

    try {
      const staticData = await WTC_API.getChapterFeatures({
        chapterId: selectedChapter.chapterId || selectedChapter.id,
        subjectId: selectedSubject.subjectId || selectedSubject.id
      });

      const staticFeatures = staticData.features || [];
      const dynamicFeatures = await loadDynamicFeatures(selectedChapter.chapterId || selectedChapter.id);

      currentFeatures = [...dynamicFeatures, ...staticFeatures];

      box.innerHTML = currentFeatures.length
        ? currentFeatures.map(featureButton).join('')
        : WTC_UI.loadingHTML('No feature buttons added yet.');
    } catch (err) {
      box.innerHTML = WTC_UI.loadingHTML(err.message);
    }
  }

  async function loadDynamicFeatures(chapterId) {
    if (!window.WTC_ASSESSMENT_API || !chapterId) return [];

    try {
      const data = await WTC_ASSESSMENT_API.getFeatureMap(chapterId);
      return data.features || [];
    } catch (err) {
      console.warn('Dynamic feature map not available:', err.message);
      return [];
    }
  }

  function featureButton(feature, index) {
    const name = WTC_UI.escape(feature.featureName || feature.name || 'Feature');
    const label = feature.type === 'dynamic' ? 'AI Content Engine' : (feature.type || 'Learning feature');

    return `
      <button class="feature-btn" onclick="StudentApp.openFeatureByIndex(${index})">
        ${feature.icon || '🔗'} ${name}
        <small>${WTC_UI.escape(label)}</small>
      </button>
    `;
  }

  async function openFeatureByIndex(index) {
    const feature = currentFeatures[index];
    if (!feature) return;

    const featureName = feature.featureName || feature.name || 'Feature';

    WTC_API.logAccess({
      userId: user.id || user.studentId,
      name: user.name,
      role: user.role,
      mobile: user.mobile,
      actionName: featureName,
      url: feature.url || feature.contentId || ''
    }).catch(() => {});

    if (feature.type === 'dynamic' && window.WTC_DYNAMIC_CONTENT) {
      try {
        const opened = await WTC_DYNAMIC_CONTENT.openFeature(feature);
        if (opened !== false) return;
      } catch (err) {
        WTC_UI.toast(err.message || 'Dynamic content failed to open.', 'error');
        return;
      }
    }

    openStaticFeature(feature.url, featureName);
  }

  function openStaticFeature(url, name) {
    if (!url || url === '#') {
      return WTC_UI.toast('This feature URL is not added yet.', 'error');
    }

    window.location.href = url;
  }

  function openFeature(url, name) {
    openStaticFeature(url, name);
  }

  async function loadProgress() {
    try {
      const data = await WTC_API.getStudentProgress(user.id || user.studentId);
      const progress = Array.isArray(data.progress) ? data.progress[0] : data.progress;
      const percent = Number(progress?.percent || progress?.overallPercent || 0);

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

    ['name', 'mobile', 'board', 'className', 'medium'].forEach(key => {
      if (form[key]) form[key].value = user[key] || user.class || '';
    });

    form.addEventListener('submit', async event => {
      event.preventDefault();

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
      } catch (err) {
        WTC_UI.toast(err.message, 'error');
      }
    });
  }
  /* smart navigation*/
function backToSubjects() {
  selectedChapter = null;
  currentFeatures = [];
  show('subjectsSection');
}

function backToChapters() {
  selectedChapter = null;
  currentFeatures = [];
  show('chaptersSection');
}
  return {
    init,
    show,
    loadSubjects,
    openSubject,
    openChapter,
    openFeature,
    openFeatureByIndex,
    backToSubjects, 
    backToChapters
  };
})();

document.addEventListener('DOMContentLoaded', StudentApp.init);
