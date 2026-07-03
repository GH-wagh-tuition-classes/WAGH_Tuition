const AdminApp = (() => {
  let adminUser = null;

  async function init() {
    adminUser = WTC_AUTH.requireRole('Admin');
    if (!adminUser) return;

    fillHeader();
    await loadDashboard();
    bindAIInputForm();
    await loadAIQueue();
  }

  function fillHeader() {
    document.querySelectorAll('[data-user-name]').forEach(el => {
      el.textContent = adminUser.name || 'Admin';
    });
    document.querySelectorAll('[data-user-avatar]').forEach(el => {
      el.textContent = WTC_UI.initials(adminUser.name || 'Admin');
    });
  }

  async function loadDashboard() {
    try {
      const data = await WTC_API.call({ action: 'adminDashboard' });
      document.getElementById('studentTotal').textContent = data.totalStudents || 0;
      document.getElementById('teacherTotal').textContent = data.totalTeachers || 0;
      document.getElementById('logTotal').textContent = data.totalLogs || 0;
    } catch (err) {
      WTC_UI.toast(err.message || 'Admin dashboard failed.', 'error');
    }
  }

  function bindAIInputForm() {
    const form = document.getElementById('aiInputForm');
    if (!form) return;

    const fileInput = document.getElementById('aiSourceFile');
    if (fileInput) {
      fileInput.addEventListener('change', async () => {
        const file = fileInput.files && fileInput.files[0];
        if (!file) return;

        const rawBox = form.querySelector('[name="rawContent"]');
        form.dataset.fileName = file.name;

        if (file.type === 'text/plain' || file.name.toLowerCase().endsWith('.txt')) {
          rawBox.value = await file.text();
          WTC_UI.toast('Text file loaded.', 'success');
        } else {
          WTC_UI.toast('File selected. Paste extracted/OCR text in Raw Chapter Text before saving.', 'success');
        }
      });
    }

    form.addEventListener('submit', submitAIInput);
  }

  async function submitAIInput(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const payload = Object.fromEntries(new FormData(form).entries());

    payload.uploadedBy = adminUser.name || 'Admin';
    payload.fileName = form.dataset.fileName || '';

    if (!payload.chapterId || !payload.rawContent) {
      return WTC_UI.toast('Chapter ID and raw chapter text are required.', 'error');
    }

    try {
      const data = await WTC_ASSESSMENT_API.submitAIInput(payload);
      if (!data.success) return WTC_UI.toast(data.message || 'AI input failed.', 'error');
      WTC_UI.toast('Saved to AI input queue.', 'success');
      form.reset();
      form.dataset.fileName = '';
      await loadAIQueue();
    } catch (err) {
      WTC_UI.toast(err.message || 'AI input failed.', 'error');
    }
  }

  async function loadAIQueue() {
    const box = document.getElementById('aiQueueBox');
    if (!box) return;
    box.innerHTML = '<div class="ai-empty">Loading AI queue...</div>';

    try {
      const data = await WTC_ASSESSMENT_API.listAIQueue();
      const rows = data.queue || [];
      if (!rows.length) {
        box.innerHTML = '<div class="ai-empty">No uploads yet. Paste a chapter text and save it first.</div>';
        return;
      }

      box.innerHTML = rows.map(renderQueueItem).join('');
    } catch (err) {
      box.innerHTML = `<div class="ai-empty error">${escapeHTML(err.message || 'Could not load AI queue.')}</div>`;
    }
  }

  function renderQueueItem(item) {
    const uploadId = escapeHTML(item.uploadId || '');
    const chapterTitle = escapeHTML(item.chapterName || item.chapterId || 'Chapter');
    const meta = escapeHTML(`${item.board || ''} · ${item.className || ''} · ${item.medium || ''}`);
    const status = escapeHTML(item.processingStatus || 'Pending');

    return `
      <div class="ai-queue-item">
        <div>
          <h4>${chapterTitle}</h4>
          <p>${meta}</p>
          <small><b>Upload ID:</b> ${uploadId} · <b>Status:</b> ${status}</small>
        </div>
        <div class="ai-actions">
          <button class="btn small" onclick="AdminApp.generateAI('${uploadId}')">Generate</button>
          <button class="btn small outline" onclick="AdminApp.formatLatest('${uploadId}')">Format Latest</button>
        </div>
      </div>
    `;
  }

  async function generateAI(uploadId) {
    try {
      WTC_UI.toast('Generating AI content...', 'success');
      const data = await WTC_ASSESSMENT_API.generateAIContent(uploadId);
      if (!data.success) return WTC_UI.toast(data.message || 'Generation failed.', 'error');
      WTC_UI.toast(`Generated content: ${data.contentId}`, 'success');
      await loadAIQueue();
    } catch (err) {
      WTC_UI.toast(err.message || 'Generation failed.', 'error');
    }
  }

  async function formatLatest(uploadId) {
    const contentId = prompt('Enter contentId generated for this upload. Example: CNT-...');
    if (!contentId) return;

    try {
      const data = await WTC_ASSESSMENT_API.formatGeneratedContent(contentId.trim());
      if (!data.success) return WTC_UI.toast(data.message || 'Formatting failed.', 'error');
      WTC_UI.toast('Formatted content created for review.', 'success');

      if (confirm('Approve and publish this content to students now?')) {
        await WTC_ASSESSMENT_API.reviewContent({
          contentId: contentId.trim(),
          reviewStatus: 'Approved',
          approvedBy: adminUser.name || 'Admin',
          publishLesson: 'Yes',
          publishSolutions: 'Yes',
          publishMCQ: 'Yes',
          publishWorksheet: 'Yes',
          remarks: 'Approved from admin AI engine.'
        });
        const pub = await WTC_ASSESSMENT_API.publishContent(contentId.trim());
        WTC_UI.toast(pub.message || 'Published.', pub.success ? 'success' : 'error');
      }
    } catch (err) {
      WTC_UI.toast(err.message || 'Formatting/publish failed.', 'error');
    }
  }

  function escapeHTML(value = '') {
    return String(value).replace(/[&<>\"]/g, char => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;'
    }[char]));
  }

  return {
    init,
    loadDashboard,
    loadAIQueue,
    generateAI,
    formatLatest
  };
})();

document.addEventListener('DOMContentLoaded', AdminApp.init);
