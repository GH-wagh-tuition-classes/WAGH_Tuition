const WTC_AI_ADMIN = (() => {
  let lastUploadId = '';
  let lastContentId = '';

  function init() {
    const form = document.getElementById('wtcAiUploadForm');
    if (form) form.addEventListener('submit', submitInput);
    const file = document.getElementById('aiSourceFile');
    if (file) file.addEventListener('change', readTextFile);
    refreshQueue();
  }

  function showMsg(msg, type = 'success') {
    const box = document.getElementById('aiEngineMsg');
    if (!box) return alert(msg);
    box.className = 'ai-msg ' + type;
    box.textContent = msg;
  }

  function readTextFile(e) {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    document.getElementById('aiFileName').value = f.name;
    if (f.type === 'application/pdf') {
      showMsg('PDF selected. Browser cannot extract PDF text in this build. Paste extracted text below or use OCR/PDF extraction phase next.', 'warn');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => { document.getElementById('aiRawContent').value = reader.result || ''; };
    reader.readAsText(f);
  }

  async function submitInput(e) {
    e.preventDefault();
    const form = e.target;
    const data = Object.fromEntries(new FormData(form).entries());
    if (!data.rawContent || data.rawContent.trim().length < 50) return showMsg('Paste chapter text first. Minimum 50 characters required.', 'error');
    try {
      showMsg('Saving input to AI_INPUT_QUEUE...', 'warn');
      const res = await WTC_ASSESSMENT_API.submitAIInput(data);
      if (!res.success) return showMsg(res.message || 'Input save failed.', 'error');
      lastUploadId = res.uploadId;
      document.getElementById('lastUploadId').textContent = lastUploadId;
      showMsg('Input saved. Now click Generate AI Content.', 'success');
      await refreshQueue();
    } catch (err) { showMsg(err.message, 'error'); }
  }

  async function generate() {
    const uploadId = document.getElementById('lastUploadId').textContent || lastUploadId || document.getElementById('manualUploadId').value.trim();
    if (!uploadId) return showMsg('No uploadId found.', 'error');
    try {
      showMsg('Generating lesson, MCQ, inside chapter questions, end exercise questions and solutions...', 'warn');
      const res = await WTC_ASSESSMENT_API.generateAIContent(uploadId);
      if (!res.success) return showMsg(res.message || 'Generation failed.', 'error');
      lastContentId = res.contentId;
      document.getElementById('lastContentId').textContent = lastContentId;
      showMsg(res.usedFallback ? 'Fallback content generated. Add AI API key in Apps Script for real AI extraction.' : 'AI content generated successfully.', res.usedFallback ? 'warn' : 'success');
      await refreshQueue();
    } catch (err) { showMsg(err.message, 'error'); }
  }

  async function format() {
    const contentId = document.getElementById('lastContentId').textContent || lastContentId || document.getElementById('manualContentId').value.trim();
    if (!contentId) return showMsg('No contentId found.', 'error');
    try {
      showMsg('Formatting content for clean student display...', 'warn');
      const res = await WTC_ASSESSMENT_API.formatGeneratedContent(contentId);
      if (!res.success) return showMsg(res.message || 'Formatting failed.', 'error');
      showMsg('Formatted content created. Review and publish when ready.', 'success');
      document.getElementById('aiCreatedIds').innerHTML = `Lesson: <b>${res.lessonId}</b><br>Solutions: <b>${res.solutionSetId}</b><br>MCQ: <b>${res.mcqSetId}</b><br>Worksheet: <b>${res.worksheetSetId}</b>`;
    } catch (err) { showMsg(err.message, 'error'); }
  }

  async function approveAndPublish() {
    const contentId = document.getElementById('lastContentId').textContent || lastContentId || document.getElementById('manualContentId').value.trim();
    if (!contentId) return showMsg('No contentId found.', 'error');
    try {
      showMsg('Approving review...', 'warn');
      const r = await WTC_ASSESSMENT_API.reviewContent({
        contentId,
        reviewStatus: 'Approved',
        approvedBy: 'Admin',
        publishLesson: 'Yes',
        publishSolutions: 'Yes',
        publishMCQ: 'Yes',
        publishWorksheet: 'Yes',
        remarks: 'Approved from AI Content Engine panel.'
      });
      if (!r.success) return showMsg(r.message || 'Review failed.', 'error');
      showMsg('Publishing to student feature buttons...', 'warn');
      const p = await WTC_ASSESSMENT_API.publishContent(contentId);
      if (!p.success) return showMsg(p.message || 'Publish failed.', 'error');
      showMsg('Published. Chapter feature buttons are now dynamic.', 'success');
    } catch (err) { showMsg(err.message, 'error'); }
  }

  async function refreshQueue() {
    const box = document.getElementById('aiQueueBox');
    if (!box) return;
    try {
      const res = await WTC_ASSESSMENT_API.listAIQueue();
      const rows = res.queue || [];
      box.innerHTML = rows.length ? rows.slice(0,10).map(r => `<div class="ai-queue-row"><b>${esc(r.uploadId)}</b><span>${esc(r.chapterId)} · ${esc(r.processingStatus)}</span><small>${esc(r.fileName || r.sourceType)}</small></div>`).join('') : '<div class="ai-empty">No AI uploads yet.</div>';
    } catch (err) { box.innerHTML = `<div class="ai-empty">${esc(err.message)}</div>`; }
  }

  function esc(s='') { return String(s).replace(/[&<>\"]/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[m])); }
  return { init, generate, format, approveAndPublish, refreshQueue };
})();
document.addEventListener('DOMContentLoaded', WTC_AI_ADMIN.init);
