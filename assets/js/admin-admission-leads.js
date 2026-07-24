/* WTC Admission Leads Admin Panel H1.1 */
window.WTC_ADMISSION_ADMIN = (() => {
  const STATUS_LABELS = Object.freeze({
    NEW:'New', CONTACTED:'Contacted', DEMO_BOOKED:'Demo booked', JOINED:'Joined', NOT_INTERESTED:'Not interested'
  });

  let leads = [];
  let loaded = false;

  function init() {
    const password = document.getElementById('admissionLeadAdminPassword');
    password?.addEventListener('keydown', event => {
      if (event.key === 'Enter') {
        event.preventDefault();
        load();
      }
    });
  }

  function open() {
    if (!loaded) setStatus('Enter the admin password and tap Load leads.', 'info');
  }

  function credentials() {
    const password = String(document.getElementById('admissionLeadAdminPassword')?.value || '').trim();
    const user = WTC_AUTH.getUser?.() || {};
    if (!password) {
      setStatus('Enter your admin password to view parent contact details.', 'error');
      document.getElementById('admissionLeadAdminPassword')?.focus();
      return null;
    }
    return {
      adminId:user.adminId || user.id || '',
      adminMobile:user.mobile || '',
      adminPassword:password
    };
  }

  async function load(button=null) {
    const auth = credentials();
    if (!auth) return;
    WTC_UI.setBusy?.(button, true, 'Loading...');
    setStatus('Loading admission leads securely...', 'info');
    try {
      const data = await WTC_API.getAdmissionLeads(auth);
      if (!data.success) throw new Error(data.message || 'Could not load admission leads.');
      leads = Array.isArray(data.leads) ? data.leads : [];
      loaded = true;
      updateSummary(data.summary || {});
      populateSourceFilter();
      applyFilters();
      setStatus(`${leads.length} admission lead(s) loaded.`, 'success');
    } catch (error) {
      loaded = false;
      leads = [];
      render([]);
      updateSummary({});
      setStatus(error.message || 'Admission leads could not be loaded.', 'error');
      WTC_UI.toast(error.message || 'Admission leads could not be loaded.', 'error');
    } finally {
      WTC_UI.setBusy?.(button, false);
    }
  }

  function applyFilters() {
    const search = normalize(document.getElementById('admissionLeadSearch')?.value);
    const status = String(document.getElementById('admissionLeadStatusFilter')?.value || 'ALL');
    const source = String(document.getElementById('admissionLeadSourceFilter')?.value || 'ALL');
    const filtered = leads.filter(item => {
      if (status !== 'ALL' && String(item.status || '').toUpperCase() !== status) return false;
      if (source !== 'ALL' && String(item.source || '') !== source) return false;
      if (!search) return true;
      const haystack = [item.leadId,item.studentName,item.parentMobile,item.className,item.board,item.medium,item.subject,item.preferredTime,item.source,item.status,item.notes,item.demoDate,item.followUpDate]
        .map(normalize).join(' ');
      return haystack.includes(search);
    });
    render(filtered);
  }

  function render(list) {
    const box = document.getElementById('admissionLeadList');
    if (!box) return;
    setText('admissionVisibleCount', list.length);
    if (!list.length) {
      box.innerHTML = `<div class="admission-empty">${loaded ? 'No admission leads match the selected filters.' : 'No lead data loaded yet.'}</div>`;
      return;
    }
    box.innerHTML = list.map(renderCard).join('');
  }

  function renderCard(item) {
    const id = String(item.leadId || '');
    const status = allowedStatus(item.status);
    const statusClass = `status-${status.toLowerCase().replace(/_/g, '-')}`;
    const mobile = String(item.parentMobile || '').replace(/\D/g, '').slice(-10);
    const whatsappText = encodeURIComponent(`Hello, this is WAGH Tuition Classes regarding the demo enquiry for ${item.studentName || 'your child'} (${item.className || ''}, ${item.subject || ''}).`);
    const sourceUrl = safeUrl(item.pageUrl);
    const sourceCopy = sourceUrl ? `<a href="${escapeHTML(sourceUrl)}" target="_blank" rel="noopener">Open source page</a>` : escapeHTML(item.pageUrl || '—');
    return `<article class="admission-lead-card ${statusClass}" data-lead-id="${escapeHTML(id)}">
      <div class="admission-lead-head">
        <div class="admission-lead-title">
          <h3>${escapeHTML(item.studentName || 'Student enquiry')}</h3>
          <p>${escapeHTML(id)} · Received ${escapeHTML(item.createdAt || '—')}</p>
        </div>
        <span class="admission-status-chip ${statusClass}">${escapeHTML(statusLabel(status))}</span>
      </div>
      <div class="admission-lead-body">
        <div>
          <div class="admission-detail-grid">
            ${detail('Parent mobile', mobile || '—')}
            ${detail('Learning profile', [item.className,item.board,item.medium].filter(Boolean).join(' · ') || '—')}
            ${detail('Subject', item.subject || '—')}
            ${detail('Preferred time', item.preferredTime || '—')}
            ${detail('Source', item.source || 'Direct')}
            <div class="admission-detail"><small>Page</small><span>${sourceCopy}</span></div>
          </div>
          <div class="admission-contact-actions">
            <a class="btn small" href="tel:+91${escapeHTML(mobile)}">☎ Call parent</a>
            <a class="btn small outline" href="https://wa.me/91${escapeHTML(mobile)}?text=${whatsappText}" target="_blank" rel="noopener">💬 WhatsApp</a>
          </div>
        </div>
        <div class="admission-editor">
          <label class="admin-field">
            <span>Status</span>
            <select data-lead-field="status">${statusOptions(status)}</select>
          </label>
          <label class="admin-field">
            <span>Demo date</span>
            <input data-lead-field="demoDate" type="date" value="${escapeHTML(dateValue(item.demoDate))}">
          </label>
          <label class="admin-field">
            <span>Follow-up date</span>
            <input data-lead-field="followUpDate" type="date" value="${escapeHTML(dateValue(item.followUpDate))}">
          </label>
          <label class="admin-field admin-field-wide">
            <span>Follow-up notes</span>
            <textarea data-lead-field="notes" maxlength="1000" placeholder="Call outcome, parent requirement, fee discussion or next action">${escapeHTML(item.notes || '')}</textarea>
          </label>
          <div class="admission-editor-actions">
            <small class="admission-updated-copy">Updated: ${escapeHTML(item.updatedAt || '—')}</small>
            <button class="btn small" type="button" onclick="WTC_ADMISSION_ADMIN.saveLead('${escapeJs(id)}', this)">Save follow-up</button>
          </div>
        </div>
      </div>
    </article>`;
  }

  async function saveLead(leadId, button=null) {
    const auth = credentials();
    if (!auth) return;
    const card = findCard(leadId);
    if (!card) return WTC_UI.toast('Lead card not found. Refresh the panel.', 'error');
    const payload = {
      ...auth,
      leadId,
      status:card.querySelector('[data-lead-field="status"]')?.value || 'NEW',
      demoDate:card.querySelector('[data-lead-field="demoDate"]')?.value || '',
      followUpDate:card.querySelector('[data-lead-field="followUpDate"]')?.value || '',
      notes:card.querySelector('[data-lead-field="notes"]')?.value || ''
    };
    WTC_UI.setBusy?.(button, true, 'Saving...');
    setStatus(`Saving follow-up for ${leadId}...`, 'info');
    try {
      const data = await WTC_API.updateAdmissionLead(payload);
      if (!data.success) throw new Error(data.message || 'Lead update failed.');
      const updated = data.lead || {
        leadId,
        status:payload.status,
        notes:payload.notes,
        demoDate:payload.demoDate,
        followUpDate:payload.followUpDate,
        updatedAt:new Date().toISOString().slice(0, 19).replace('T', ' ')
      };
      const index = leads.findIndex(item => String(item.leadId) === String(leadId));
      if (index >= 0) leads[index] = { ...leads[index], ...updated };
      updateSummary(data.summary || calculateSummary(leads));
      setText('admissionLeadNewTotal', Number((data.summary || calculateSummary(leads)).NEW || 0));
      setText('admissionLeadSidebarCount', Number((data.summary || calculateSummary(leads)).NEW || 0));
      applyFilters();
      setStatus(data.message || 'Admission lead updated.', 'success');
      WTC_UI.toast(data.message || 'Admission lead updated.', 'success');
    } catch (error) {
      setStatus(error.message || 'Lead update failed.', 'error');
      WTC_UI.toast(error.message || 'Lead update failed.', 'error');
    } finally {
      WTC_UI.setBusy?.(button, false);
    }
  }

  function populateSourceFilter() {
    const select = document.getElementById('admissionLeadSourceFilter');
    if (!select) return;
    const current = select.value || 'ALL';
    const sources = [...new Set(leads.map(item => String(item.source || 'Direct').trim()).filter(Boolean))].sort((a,b) => a.localeCompare(b));
    select.innerHTML = '<option value="ALL">All sources</option>' + sources.map(source => `<option value="${escapeHTML(source)}">${escapeHTML(source)}</option>`).join('');
    select.value = sources.includes(current) ? current : 'ALL';
  }

  function updateSummary(summary) {
    const normalized = {
      TOTAL:Number(summary.TOTAL || summary.total || 0),
      NEW:Number(summary.NEW || 0),
      CONTACTED:Number(summary.CONTACTED || 0),
      DEMO_BOOKED:Number(summary.DEMO_BOOKED || 0),
      JOINED:Number(summary.JOINED || 0),
      NOT_INTERESTED:Number(summary.NOT_INTERESTED || 0)
    };
    setText('admissionSummaryTotal', normalized.TOTAL);
    setText('admissionSummaryNew', normalized.NEW);
    setText('admissionSummaryContacted', normalized.CONTACTED);
    setText('admissionSummaryDemo', normalized.DEMO_BOOKED);
    setText('admissionSummaryJoined', normalized.JOINED);
    setText('admissionSummaryNotInterested', normalized.NOT_INTERESTED);
    setText('admissionLeadNewTotal', normalized.NEW);
    setText('admissionLeadSidebarCount', normalized.NEW);
  }

  function calculateSummary(items) {
    const summary = { TOTAL:items.length, NEW:0, CONTACTED:0, DEMO_BOOKED:0, JOINED:0, NOT_INTERESTED:0 };
    items.forEach(item => { const status = allowedStatus(item.status); summary[status] = Number(summary[status] || 0) + 1; });
    return summary;
  }

  function togglePassword(button) {
    const input = document.getElementById('admissionLeadAdminPassword');
    if (!input) return;
    const show = input.type === 'password';
    input.type = show ? 'text' : 'password';
    button.textContent = show ? 'Hide' : 'Show';
    button.setAttribute('aria-label', show ? 'Hide password' : 'Show password');
  }

  function statusOptions(selected) {
    return Object.entries(STATUS_LABELS).map(([value,label]) => `<option value="${value}"${value === selected ? ' selected' : ''}>${escapeHTML(label)}</option>`).join('');
  }

  function statusLabel(value) { return STATUS_LABELS[allowedStatus(value)] || 'New'; }
  function allowedStatus(value) { const status = String(value || 'NEW').toUpperCase(); return STATUS_LABELS[status] ? status : 'NEW'; }
  function dateValue(value) { const match = String(value || '').match(/^\d{4}-\d{2}-\d{2}/); return match ? match[0] : ''; }
  function normalize(value) { return String(value || '').trim().toLowerCase(); }
  function detail(label, value) { return `<div class="admission-detail"><small>${escapeHTML(label)}</small><strong>${escapeHTML(value)}</strong></div>`; }
  function safeUrl(value) { try { const url = new URL(String(value || '')); return /^https?:$/.test(url.protocol) ? url.href : ''; } catch (error) { return ''; } }
  function findCard(id) { return [...document.querySelectorAll('.admission-lead-card')].find(card => card.dataset.leadId === String(id)); }
  function setStatus(message, type='info') { const box = document.getElementById('admissionLeadStatus'); if (box) { box.textContent = message; box.className = `admission-manager-status ${type}`; } }
  function setText(id, value) { const element = document.getElementById(id); if (element) element.textContent = String(value ?? ''); }
  function escapeHTML(value='') { return WTC_UI.escape ? WTC_UI.escape(value) : String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c])); }
  function escapeJs(value='') { return String(value).replace(/\\/g,'\\\\').replace(/'/g,"\\'").replace(/[\r\n]/g,' '); }

  document.addEventListener('DOMContentLoaded', init);
  return { init, open, load, applyFilters, saveLead, togglePassword };
})();
