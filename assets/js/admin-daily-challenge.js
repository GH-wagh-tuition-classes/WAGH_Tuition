/* WAGH Tuition Classes — Admin Multi-Subject Chapter Challenge Manager H1.3B-R2 */
window.WTC_DAILY_CHALLENGE_ADMIN = (() => {
  let user = null;
  let data = null;
  let opened = false;
  let rotationItems = [];
  let applyingConfig = false;

  function open() {
    if (opened) return;
    opened = true;
    try { user = WTC_AUTH.getUser?.() || null; } catch (error) { user = null; }
    bind();
    setDateDefaults();
    message('Enter the Admin password, then load the chapter catalogue.', 'info');
  }

  function bind() {
    byId('dcAdminLoad')?.addEventListener('click', load);
    byId('dcAdminSave')?.addEventListener('click', save);
    byId('dcAdminPrepare')?.addEventListener('click', prepare);
    byId('dcAddChapters')?.addEventListener('click', addSelectedChapters);
    ['dcBoard', 'dcClass', 'dcMedium'].forEach(id => byId(id)?.addEventListener('change', () => cascadeGroup(id)));
    byId('dcSubject')?.addEventListener('change', renderAvailableChapters);
    ['dcRotationStart', 'dcPreviewDate'].forEach(id => byId(id)?.addEventListener('change', updateDateDisplays));
    byId('dcRotationList')?.addEventListener('click', handleRotationAction);
  }

  function identity() {
    return {
      adminId: user?.adminId || user?.id || '',
      adminMobile: user?.mobile || '',
      adminPassword: byId('dcAdminPassword')?.value || '',
      deviceId: WTC_AUTH.deviceId?.() || ''
    };
  }

  function setDateDefaults() {
    const today = window.WTC_TIME?.todayKey?.() || '';
    if (today) {
      if (!val('dcRotationStart')) byId('dcRotationStart').value = today;
      if (!val('dcPreviewDate')) byId('dcPreviewDate').value = today;
    }
    updateDateDisplays();
  }

  async function load() {
    const button = byId('dcAdminLoad');
    setBusy(button, true, 'Loading…');
    try {
      const result = await WTC_API.call({ action: 'adminGetDailyChallengeManager', ...identity() });
      if (result?.success === false) throw new Error(result.message || 'Could not load challenge manager.');
      data = result;
      renderServerClock();
      renderSelectors();
      renderConfigs();
      message('Chapter catalogue loaded. Select a Board + Class + Medium group, then add chapters from one or more subjects.', 'success');
    } catch (error) {
      message(error.message || 'Could not load challenge manager.', 'error');
    } finally {
      setBusy(button, false);
    }
  }

  function renderServerClock() {
    const server = data?.serverTime || '';
    const display = window.WTC_TIME?.formatDateTime?.(server, { seconds: true }) || server || 'Unavailable';
    text('dcServerClock', `${display} IST`);
    if (data?.serverDate) {
      if (!val('dcRotationStart')) byId('dcRotationStart').value = data.serverDate;
      if (!val('dcPreviewDate')) byId('dcPreviewDate').value = data.serverDate;
    }
    updateDateDisplays();
  }

  function renderSelectors() {
    const subjects = data?.subjects || [];
    fill('dcBoard', unique(subjects.map(item => item.board)), 'Select board');
    cascadeGroup('dcBoard');
  }

  function cascadeGroup(changed) {
    if (!data || applyingConfig) return;
    const subjects = data.subjects || [];
    const board = val('dcBoard');
    if (changed === 'dcBoard') fill('dcClass', unique(subjects.filter(item => item.board === board).map(item => item.className)), 'Select class');
    const className = val('dcClass');
    if (changed === 'dcBoard' || changed === 'dcClass') fill('dcMedium', unique(subjects.filter(item => item.board === board && item.className === className).map(item => item.medium)), 'Select medium');
    const medium = val('dcMedium');
    fillObjects('dcSubject', subjects.filter(item => item.board === board && item.className === className && item.medium === medium), 'subjectId', 'subjectName', 'Select subject');
    renderAvailableChapters();
    applyMatchingConfig();
  }

  function renderAvailableChapters() {
    const host = byId('dcChapterPool');
    if (!host) return;
    const list = (data?.chapters || []).filter(item =>
      item.board === val('dcBoard') &&
      item.className === val('dcClass') &&
      item.medium === val('dcMedium') &&
      item.subjectId === val('dcSubject')
    ).sort((a, b) => a.sortOrder - b.sortOrder);
    if (!list.length) {
      host.innerHTML = '<div class="dc-empty">Select a complete academic group and subject.</div>';
      return;
    }
    const existing = new Set(rotationItems.map(item => `${item.subjectId}|${item.chapterId}`));
    host.innerHTML = list.map(chapter => {
      const duplicate = existing.has(`${chapter.subjectId}|${chapter.chapterId}`);
      return `<label class="dc-chapter-option ${chapter.publishedMcqCount >= 20 ? 'ready' : 'limited'} ${duplicate ? 'already-added' : ''}">
        <input type="checkbox" value="${attr(chapter.chapterId)}" ${duplicate ? 'disabled' : ''}>
        <span><b>${esc(chapter.chapterName)}</b><small>${chapter.publishedMcqCount} Published MCQs${duplicate ? ' • Already in rotation' : chapter.publishedMcqCount >= 20 ? ' • Can run alone' : ' • May combine with another chapter from this subject'}</small></span>
      </label>`;
    }).join('');
  }

  function addSelectedChapters() {
    const subjectId = val('dcSubject');
    if (!subjectId) return message('Select a subject first.', 'error');
    const selected = [...document.querySelectorAll('#dcChapterPool input:checked')].map(input => input.value);
    if (!selected.length) return message('Select one or more chapters to add.', 'error');
    const subject = (data?.subjects || []).find(item => item.subjectId === subjectId) || {};
    selected.forEach(chapterId => {
      const chapter = (data?.chapters || []).find(item => item.chapterId === chapterId && item.subjectId === subjectId);
      if (!chapter || rotationItems.some(item => item.subjectId === subjectId && item.chapterId === chapterId)) return;
      rotationItems.push({
        itemId: createItemId(subjectId, chapterId),
        subjectId,
        subjectName: subject.subjectName || chapter.subjectName || subjectId,
        chapterId,
        chapterName: chapter.chapterName || chapterId,
        publishedMcqCount: Number(chapter.publishedMcqCount || 0),
        enabled: true,
        order: rotationItems.length + 1
      });
    });
    normalizeOrder();
    renderRotation();
    renderAvailableChapters();
    message('Selected chapters added to the multi-subject rotation.', 'success');
  }

  function renderRotation() {
    const host = byId('dcRotationList');
    if (!host) return;
    if (!rotationItems.length) {
      host.innerHTML = '<div class="dc-empty">No chapters added to this group rotation.</div>';
      text('dcRotationSummary', '0 rotation items.');
      return;
    }
    const subjectTotals = calculateSubjectTotals();
    host.innerHTML = rotationItems.map((item, index) => {
      const subjectTotal = Number(subjectTotals[item.subjectId] || 0);
      const eligibility = subjectTotal >= 20 ? 'Eligible subject pool' : 'Subject pool below 20 MCQs — skipped automatically';
      return `<article class="dc-rotation-item ${item.enabled ? '' : 'disabled'}" data-item-id="${attr(item.itemId)}">
        <div class="dc-rotation-order">${index + 1}</div>
        <div class="dc-rotation-copy"><b>${esc(item.subjectName || item.subjectId)}</b><span>${esc(item.chapterName || item.chapterId)}</span><small>${item.publishedMcqCount} Published MCQs • ${esc(eligibility)}</small></div>
        <div class="dc-rotation-actions">
          <button type="button" data-action="up" aria-label="Move up" ${index === 0 ? 'disabled' : ''}>↑</button>
          <button type="button" data-action="down" aria-label="Move down" ${index === rotationItems.length - 1 ? 'disabled' : ''}>↓</button>
          <button type="button" data-action="toggle">${item.enabled ? 'Disable' : 'Enable'}</button>
          <button type="button" data-action="remove" class="danger">Remove</button>
        </div>
      </article>`;
    }).join('');
    const enabledCount = rotationItems.filter(item => item.enabled).length;
    const subjectCount = new Set(rotationItems.filter(item => item.enabled).map(item => item.subjectId)).size;
    const warningCount = Object.values(subjectTotals).filter(total => total < 20).length;
    text('dcRotationSummary', `${rotationItems.length} chapter(s) • ${subjectCount} subject(s) • ${enabledCount} enabled${warningCount ? ` • ${warningCount} subject pool(s) currently below 20 MCQs` : ''}`);
  }

  function handleRotationAction(event) {
    const button = event.target.closest('button[data-action]');
    if (!button) return;
    const card = button.closest('[data-item-id]');
    const index = rotationItems.findIndex(item => item.itemId === card?.dataset.itemId);
    if (index < 0) return;
    const action = button.dataset.action;
    if (action === 'up' && index > 0) [rotationItems[index - 1], rotationItems[index]] = [rotationItems[index], rotationItems[index - 1]];
    if (action === 'down' && index < rotationItems.length - 1) [rotationItems[index + 1], rotationItems[index]] = [rotationItems[index], rotationItems[index + 1]];
    if (action === 'toggle') rotationItems[index].enabled = !rotationItems[index].enabled;
    if (action === 'remove') rotationItems.splice(index, 1);
    normalizeOrder();
    renderRotation();
    renderAvailableChapters();
  }

  function calculateSubjectTotals() {
    return rotationItems.filter(item => item.enabled).reduce((totals, item) => {
      totals[item.subjectId] = Number(totals[item.subjectId] || 0) + Number(item.publishedMcqCount || 0);
      return totals;
    }, {});
  }

  function applyMatchingConfig() {
    if (!data) return;
    const complete = val('dcBoard') && val('dcClass') && val('dcMedium');
    const config = complete ? (data.configs || []).find(item => item.board === val('dcBoard') && item.className === val('dcClass') && item.medium === val('dcMedium')) : null;
    byId('dcConfigId').value = config?.configId || '';
    rotationItems = (config?.rotationItems || []).map((item, index) => ({ ...item, order: index + 1, enabled: item.enabled !== false }));
    renderRotation();
    renderAvailableChapters();
    if (config) {
      byId('dcRotationStart').value = String(config.rotationStartDate || data.serverDate || '').slice(0, 10);
      byId('dcDuration').value = config.durationMin || 20;
      byId('dcOpensTime').value = config.opensTime || '06:00';
      byId('dcClosesTime').value = config.closesTime || '23:59';
      byId('dcEnabled').checked = String(config.status || '').toUpperCase() === 'ACTIVE';
      text('dcCurrentConfig', `Current configuration: ${config.status} • ${rotationItems.length} chapter(s) • ${new Set(rotationItems.map(item => item.subjectId)).size} subject(s) • Updated ${formatDateTime(config.updatedAt)}`);
    } else {
      setDateDefaults();
      byId('dcDuration').value = 20;
      byId('dcOpensTime').value = '06:00';
      byId('dcClosesTime').value = '23:59';
      byId('dcEnabled').checked = true;
      text('dcCurrentConfig', complete ? 'No saved configuration for this group.' : 'Select Board, Class and Medium.');
    }
    updateDateDisplays();
  }

  async function save() {
    if (!val('dcBoard') || !val('dcClass') || !val('dcMedium')) return message('Select Board, Class and Medium.', 'error');
    if (!rotationItems.length) return message('Add at least one chapter to the rotation.', 'error');
    if (!rotationItems.some(item => item.enabled)) return message('Enable at least one rotation item.', 'error');
    const button = byId('dcAdminSave');
    setBusy(button, true, 'Saving…');
    try {
      const result = await WTC_API.call({
        action: 'adminSaveDailyChallengeConfig',
        ...identity(),
        board: val('dcBoard'),
        className: val('dcClass'),
        medium: val('dcMedium'),
        rotationItems: JSON.stringify(rotationItems.map((item, index) => ({ ...item, order: index + 1 }))),
        rotationStartDate: val('dcRotationStart'),
        opensTime: val('dcOpensTime'),
        closesTime: val('dcClosesTime'),
        durationMin: val('dcDuration'),
        enabled: byId('dcEnabled').checked
      });
      if (result?.success === false) throw new Error(result.message || 'Configuration could not be saved.');
      byId('dcConfigId').value = result.config?.configId || '';
      const warnings = (result.warnings || []).join(' ');
      message(`${result.message || 'Rotation saved.'}${warnings ? ` ${warnings}` : ''}`, warnings ? 'info' : 'success');
      await load();
      restoreGroup(result.config);
    } catch (error) {
      message(error.message || 'Configuration could not be saved.', 'error');
    } finally {
      setBusy(button, false);
    }
  }

  async function prepare() {
    const configId = val('dcConfigId');
    if (!configId) return message('Save the configuration before preparing a challenge.', 'error');
    const button = byId('dcAdminPrepare');
    setBusy(button, true, 'Preparing…');
    try {
      const challengeDate = val('dcPreviewDate') || data?.serverDate || window.WTC_TIME?.todayKey?.() || '';
      const result = await WTC_API.call({ action: 'adminPrepareDailyChallenge', ...identity(), configId, challengeDate });
      if (result?.success === false) throw new Error(result.message || 'Challenge could not be prepared.');
      renderPreview(result);
      message(result.message || 'Challenge prepared.', 'success');
    } catch (error) {
      message(error.message || 'Challenge could not be prepared.', 'error');
    } finally {
      setBusy(button, false);
    }
  }

  function renderPreview(result) {
    const challenge = result.challenge || {};
    const host = byId('dcPreview');
    if (!host) return;
    host.innerHTML = `<div class="dc-preview-head"><div><small>Frozen challenge • ${esc(challenge.timezoneLabel || 'IST')}</small><h3>${esc(challenge.testTitle || 'Chapter Challenge')}</h3><p>${esc([challenge.className, challenge.board, challenge.medium, challenge.subjectName].filter(Boolean).join(' • '))}</p><p>${esc(challenge.opensAtDisplay || challenge.opensAt || '')} → ${esc(challenge.closesAtDisplay || challenge.closesAt || '')}</p></div><b>${challenge.questionCount || 20} MCQs</b></div><ol>${(result.preview || []).map(question => `<li><span>Q${question.questionNo}</span><div><b>${esc(question.text)}</b><small>${esc(question.subjectName || challenge.subjectName || '')} • ${esc(question.chapterName || '')} • ${esc(question.topic || 'General')} • ${esc(question.difficulty || 'Medium')}</small></div></li>`).join('')}</ol>`;
  }

  function renderConfigs() {
    const host = byId('dcConfigList');
    if (!host) return;
    const configs = data?.configs || [];
    host.innerHTML = configs.length ? configs.map(config => {
      const items = config.rotationItems || [];
      const subjects = new Set(items.map(item => item.subjectId)).size;
      return `<button type="button" data-config="${attr(config.configId)}"><b>${esc([config.className, config.board, config.medium].filter(Boolean).join(' • '))}</b><small>${subjects} subject(s) • ${items.length} chapter(s) • ${esc(config.opensTime || '06:00')}–${esc(config.closesTime || '23:59')} IST • ${esc(config.status)}</small></button>`;
    }).join('') : '<div class="dc-empty">No Chapter Challenge rotations have been saved.</div>';
    host.querySelectorAll('[data-config]').forEach(button => button.addEventListener('click', () => selectConfig(button.dataset.config)));
  }

  function selectConfig(id) {
    const config = (data?.configs || []).find(item => item.configId === id);
    if (!config) return;
    restoreGroup(config);
  }

  function restoreGroup(config) {
    applyingConfig = true;
    try {
      byId('dcBoard').value = config.board || '';
      const subjects = data?.subjects || [];
      fill('dcClass', unique(subjects.filter(item => item.board === config.board).map(item => item.className)), 'Select class');
      byId('dcClass').value = config.className || '';
      fill('dcMedium', unique(subjects.filter(item => item.board === config.board && item.className === config.className).map(item => item.medium)), 'Select medium');
      byId('dcMedium').value = config.medium || '';
      fillObjects('dcSubject', subjects.filter(item => item.board === config.board && item.className === config.className && item.medium === config.medium), 'subjectId', 'subjectName', 'Select subject');
    } finally {
      applyingConfig = false;
    }
    applyMatchingConfig();
  }

  function updateDateDisplays() {
    const formatter = window.WTC_TIME?.formatDate;
    text('dcRotationStartDisplay', val('dcRotationStart') ? `${formatter ? formatter(val('dcRotationStart')) : val('dcRotationStart')} (IST)` : 'Select India date');
    text('dcPreviewDateDisplay', val('dcPreviewDate') ? `${formatter ? formatter(val('dcPreviewDate')) : val('dcPreviewDate')} (IST)` : 'Select India date');
  }

  function normalizeOrder() { rotationItems = rotationItems.map((item, index) => ({ ...item, order: index + 1 })); }
  function createItemId(subjectId, chapterId) { return `DCI-${subjectId}-${chapterId}-${Date.now()}`.replace(/[^A-Za-z0-9_-]/g, '').slice(0, 80); }
  function formatDateTime(value) { return window.WTC_TIME?.formatDateTime?.(value) || value || '—'; }
  function message(value, type = 'info') { const element = byId('dcAdminStatus'); if (element) { element.textContent = value; element.className = `dc-status ${type}`; } }
  function fill(id, items, placeholder) { const element = byId(id); if (!element) return; element.innerHTML = `<option value="">${esc(placeholder)}</option>` + items.map(item => `<option value="${attr(item)}">${esc(item)}</option>`).join(''); }
  function fillObjects(id, items, valueKey, labelKey, placeholder) { const element = byId(id); if (!element) return; element.innerHTML = `<option value="">${esc(placeholder)}</option>` + [...items].sort((a, b) => a.sortOrder - b.sortOrder).map(item => `<option value="${attr(item[valueKey])}">${esc(item[labelKey])}</option>`).join(''); }
  function unique(items) { return [...new Set(items.filter(Boolean))].sort((a, b) => String(a).localeCompare(String(b), undefined, { numeric: true })); }
  function val(id) { return byId(id)?.value?.trim() || ''; }
  function byId(id) { return document.getElementById(id); }
  function text(id, value) { const element = byId(id); if (element) element.textContent = String(value ?? ''); }
  function setBusy(button, busy, label) { if (!button) return; if (WTC_UI.setBusy) return WTC_UI.setBusy(button, busy, label); button.disabled = busy; }
  function esc(value = '') { return String(value).replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[character])); }
  function attr(value = '') { return esc(value).replace(/`/g, '&#096;'); }

  return { open, load };
})();
