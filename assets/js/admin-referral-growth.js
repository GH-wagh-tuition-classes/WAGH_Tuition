/* WAGH Tuition Classes — H1.4 Admin Referral & Growth Tracking */
window.WTC_REFERRAL_ADMIN = (() => {
  let referrals = [];
  let codes = [];
  let summary = {};
  const byId = id => document.getElementById(id);
  const esc = value => window.WTC_UI?.escape ? WTC_UI.escape(value) : String(value || '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[char]));

  function credentials() {
    const user = WTC_AUTH.getUser() || {};
    return {
      adminId:user.adminId || user.id || '',
      adminMobile:user.mobile || '',
      adminPassword:String(byId('referralAdminPassword')?.value || '').trim()
    };
  }

  async function open() {
    if (referrals.length) return;
    setStatus('Enter the Admin password and load referral data.', 'info');
  }

  async function load() {
    const creds = credentials();
    if (!creds.adminPassword) return setStatus('Enter the Admin password.', 'error');
    const button = byId('referralLoadButton');
    WTC_UI.setBusy?.(button, true, 'Loading…');
    setStatus('Loading referral funnel and rewards…', 'info');
    try {
      const data = await WTC_API.getReferralGrowth({ ...creds, limit:500 });
      if (!data?.success) throw new Error(data?.message || 'Referral data could not be loaded.');
      referrals = data.referrals || [];
      codes = data.codes || [];
      summary = data.summary || {};
      renderSummary();
      populateFilters();
      applyFilters();
      renderCodes();
      setStatus(`Loaded ${referrals.length} referral record(s).`, 'success');
    } catch (error) {
      setStatus(error.message || 'Referral data could not be loaded.', 'error');
    } finally { WTC_UI.setBusy?.(button, false); }
  }

  function renderSummary() {
    const values = {
      referralSummaryCodes:summary.ACTIVE_CODES || 0,
      referralSummaryClicks:summary.CLICKS || 0,
      referralSummarySignups:summary.SIGNUPS || 0,
      referralSummaryEnquiries:summary.ENQUIRIES || 0,
      referralSummaryJoined:summary.JOINED || 0,
      referralSummaryPending:summary.PENDING_REWARDS || 0,
      referralSummaryConversion:`${Number(summary.CONVERSION_RATE || 0)}%`,
      referralSummaryTop:summary.TOP_REFERRER || '—',
      referralSidebarCount:summary.PENDING_REWARDS || 0
    };
    Object.entries(values).forEach(([id,value]) => { const el=byId(id); if(el) el.textContent=String(value); });
  }

  function populateFilters() {
    const codeSelect = byId('referralCodeFilter');
    if (codeSelect) {
      const current = codeSelect.value || 'ALL';
      codeSelect.innerHTML = '<option value="ALL">All referral codes</option>' + codes.map(item => `<option value="${esc(item.referralCode)}">${esc(item.referralCode)} · ${esc(item.studentName)}</option>`).join('');
      codeSelect.value = codes.some(item => item.referralCode === current) ? current : 'ALL';
    }
  }

  function applyFilters() {
    const search = String(byId('referralSearch')?.value || '').trim().toLowerCase();
    const stage = String(byId('referralStageFilter')?.value || 'ALL');
    const reward = String(byId('referralRewardFilter')?.value || 'ALL');
    const code = String(byId('referralCodeFilter')?.value || 'ALL');
    const filtered = referrals.filter(item => {
      if (stage !== 'ALL' && String(item.stage || '') !== stage) return false;
      if (reward !== 'ALL' && String(item.rewardStatus || '') !== reward) return false;
      if (code !== 'ALL' && String(item.referralCode || '') !== code) return false;
      if (!search) return true;
      const haystack = [item.referralId,item.referralCode,item.referrerName,item.referrerStudentId,item.referredName,item.referredMobile,item.stage,item.rewardStatus,item.rewardType,item.leadId,item.campaign].join(' ').toLowerCase();
      return haystack.includes(search);
    });
    renderRecords(filtered);
  }

  function renderRecords(items) {
    const box = byId('referralRecords');
    if (!box) return;
    if (!items.length) { box.innerHTML = '<div class="referral-empty">No referral records match the current filters.</div>'; return; }
    box.innerHTML = items.map(item => {
      const codeOwner = codes.find(code => code.referralCode === item.referralCode) || {};
      return `<article class="referral-admin-card" data-referral-id="${esc(item.referralId)}">
        <div class="referral-admin-head">
          <div><span class="referral-code-pill">${esc(item.referralCode)}</span><h3>${esc(item.referrerName || codeOwner.studentName || 'Student referrer')}</h3><p>${esc(item.referrerType || codeOwner.studentType || '')} · ${esc(item.referrerStudentId || '')}</p></div>
          <span class="referral-stage ${String(item.stage||'').toLowerCase()}">${esc(stageLabel(item.stage))}</span>
        </div>
        <div class="referral-admin-details">
          <div><small>Referred student</small><strong>${esc(item.referredName || 'Not provided yet')}</strong></div>
          <div><small>Mobile</small><strong>${esc(item.referredMobile || '—')}</strong></div>
          <div><small>Lead ID</small><strong>${esc(item.leadId || '—')}</strong></div>
          <div><small>Last activity</small><strong>${esc(formatDate(item.updatedAt))}</strong></div>
        </div>
        <div class="referral-admin-controls">
          <label>Stage<select data-referral-field="stage">${stageOptions(item.stage)}</select></label>
          <label>Reward type<input data-referral-field="rewardType" value="${esc(item.rewardType || '')}" placeholder="Doubt-solving session / fee benefit"></label>
          <label class="wide">Reward note<textarea data-referral-field="rewardNote" rows="2" placeholder="Internal reward note">${esc(item.rewardNote || '')}</textarea></label>
        </div>
        <div class="referral-admin-foot">
          <span class="referral-reward-status ${String(item.rewardStatus||'').toLowerCase()}">${esc(rewardLabel(item.rewardStatus))}</span>
          <div><button class="btn outline small" type="button" onclick="WTC_REFERRAL_ADMIN.saveStage('${js(item.referralId)}')">Save Stage</button><button class="btn success small" type="button" onclick="WTC_REFERRAL_ADMIN.reward('${js(item.referralId)}','APPROVED')">Approve Reward</button><button class="btn danger small" type="button" onclick="WTC_REFERRAL_ADMIN.reward('${js(item.referralId)}','REJECTED')">Reject Reward</button></div>
        </div>
      </article>`;
    }).join('');
  }

  async function saveStage(referralId) {
    const card = findCard(referralId);
    const stage = card?.querySelector('[data-referral-field="stage"]')?.value || '';
    await performUpdate(() => WTC_API.updateReferralRecord({ referralId, stage, ...credentials() }), 'Referral stage updated.');
  }

  async function reward(referralId, decision) {
    const card = findCard(referralId);
    const rewardType = card?.querySelector('[data-referral-field="rewardType"]')?.value || '';
    const rewardNote = card?.querySelector('[data-referral-field="rewardNote"]')?.value || '';
    await performUpdate(() => WTC_API.updateReferralReward({ referralId, decision, rewardType, rewardNote, ...credentials() }), `Reward ${decision.toLowerCase()}.`);
  }

  async function toggleCode(referralCode, status) {
    await performUpdate(() => WTC_API.setReferralCodeStatus({ referralCode, status, ...credentials() }), 'Referral code status updated.');
  }

  async function performUpdate(fn, successMessage) {
    try {
      const data = await fn();
      if (!data?.success) throw new Error(data?.message || 'Update failed.');
      WTC_UI.toast(data.message || successMessage, 'success');
      await load();
    } catch (error) { WTC_UI.toast(error.message || 'Update failed.', 'error'); }
  }

  function renderCodes() {
    const box = byId('referralCodeDirectory');
    if (!box) return;
    box.innerHTML = codes.length ? codes.map(item => `<div class="referral-code-row"><div><strong>${esc(item.referralCode)}</strong><span>${esc(item.studentName)} · ${esc(item.studentType || '')}</span></div><div><small>${Number(item.shareCount || 0)} shares</small><button class="btn outline small" type="button" onclick="WTC_REFERRAL_ADMIN.toggleCode('${js(item.referralCode)}','${item.status==='ACTIVE'?'INACTIVE':'ACTIVE'}')">${item.status==='ACTIVE'?'Disable':'Enable'}</button></div></div>`).join('') : '<p class="muted">Referral codes are created when students open their referral dashboard.</p>';
  }

  const stageLabel = value => ({CLICKED:'Clicked',SIGNED_UP:'Signed up',ENQUIRY:'Enquiry',DEMO_BOOKED:'Demo booked',JOINED:'Joined',REWARD_APPROVED:'Reward approved',REJECTED:'Rejected'})[String(value||'').toUpperCase()] || value || 'Clicked';
  const rewardLabel = value => ({NOT_ELIGIBLE:'Not eligible yet',PENDING:'Reward review pending',APPROVED:'Reward approved',REJECTED:'Reward rejected'})[String(value||'').toUpperCase()] || value || 'Not eligible yet';
  const stageOptions = selected => ['CLICKED','SIGNED_UP','ENQUIRY','DEMO_BOOKED','JOINED','REJECTED'].map(value => `<option value="${value}"${value===selected?' selected':''}>${stageLabel(value)}</option>`).join('');
  const formatDate = value => window.WTC_TIME?.stampForDisplay?.(value) || String(value || '—');
  const findCard = id => [...document.querySelectorAll('.referral-admin-card')].find(card => card.dataset.referralId === String(id));
  const js = value => String(value || '').replace(/\\/g,'\\\\').replace(/'/g,"\\'").replace(/[\r\n]/g,' ');
  function setStatus(message,type='info'){const box=byId('referralAdminStatus');if(box){box.textContent=message;box.className=`referral-admin-status ${type}`;}}
  function togglePassword(button){const input=byId('referralAdminPassword');if(!input)return;const show=input.type==='password';input.type=show?'text':'password';button.textContent=show?'Hide':'Show';}

  document.addEventListener('DOMContentLoaded', () => {
    byId('referralLoadButton')?.addEventListener('click', async () => { await load(); renderCodes(); });
  });
  return { open, load, applyFilters, saveStage, reward, toggleCode, togglePassword };
})();
