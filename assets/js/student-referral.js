/* WAGH Tuition Classes — H1.4.1 Student Referral Dashboard hotfix */
window.WTC_STUDENT_REFERRAL = (() => {
  let dashboard = null;
  let loading = null;

  const byId = id => document.getElementById(id);
  const escapeHTML = value => window.WTC_UI?.escape ? WTC_UI.escape(value) : String(value || '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[char]));

  function currentUser() {
    if (typeof WTC_AUTH !== 'undefined' && typeof WTC_AUTH.getUser === 'function') return WTC_AUTH.getUser();
    if (window.WTC_AUTH && typeof window.WTC_AUTH.getUser === 'function') return window.WTC_AUTH.getUser();
    return null;
  }
  function referralLink(code) {
    const base = String(window.WTC_CONFIG?.BASE_URL || '/');
    const normalized = base.endsWith('/') ? base : `${base}/`;
    const url = new URL(`${normalized}index.html`, window.location.origin);
    url.searchParams.set('source', 'referral');
    url.searchParams.set('campaign', 'student-referral');
    url.searchParams.set('ref', code);
    return url.href;
  }

  function setStatus(message, type='info') {
    const box = byId('studentReferralStatus');
    if (!box) return;
    box.textContent = message || '';
    box.className = `student-referral-status ${type}`;
  }

  async function load(force=false) {
    if (loading && !force) return loading;
    const user = currentUser();
    if (!user) {
      setText('studentReferralCode', 'Session unavailable');
      setStatus('Your student session could not be read. Reload the portal or sign in again.', 'error');
      return null;
    }
    setStatus('Preparing your referral link…', 'info');
    loading = (async () => {
      try {
        const data = await WTC_API.getReferralDashboard(user);
        if (!data?.success) throw new Error(data?.message || 'Referral dashboard could not be loaded.');
        dashboard = data;
        render();
        setStatus('Your referral dashboard is ready.', 'success');
        return dashboard;
      } catch (error) {
        setStatus(error.message || 'Referral dashboard could not be loaded.', 'error');
      } finally { loading = null; }
    })();
    return loading;
  }

  function render() {
    if (!dashboard) return;
    const code = dashboard.referralCode || '';
    const link = referralLink(code);
    const summary = dashboard.summary || {};
    setText('studentReferralCode', code || '—');
    setText('studentReferralLink', link);
    setText('studentReferralClicks', Number(summary.CLICKS || 0));
    setText('studentReferralSignups', Number(summary.SIGNUPS || 0));
    setText('studentReferralEnquiries', Number(summary.ENQUIRIES || 0));
    setText('studentReferralJoined', Number(summary.JOINED || 0));
    setText('studentReferralPendingRewards', Number(summary.REWARD_PENDING || 0));
    setText('studentReferralApprovedRewards', Number(summary.REWARD_APPROVED || 0));

    const recent = byId('studentReferralRecent');
    if (recent) {
      recent.innerHTML = (dashboard.recent || []).length
        ? dashboard.recent.map((item, index) => `
          <div class="student-referral-event">
            <span class="student-referral-event-number">${index + 1}</span>
            <div><strong>${escapeHTML(stageLabel(item.stage))}</strong><small>${escapeHTML(formatDate(item.updatedAt))}</small></div>
            <span class="student-referral-reward ${String(item.rewardStatus || '').toLowerCase()}">${escapeHTML(rewardLabel(item.rewardStatus, item.rewardType))}</span>
          </div>`).join('')
        : '<p class="muted">Share your referral link to begin tracking visits and conversions.</p>';
    }
  }

  async function ensureDashboard() {
    if (!dashboard?.referralCode) await load();
    if (!dashboard?.referralCode) {
      WTC_UI.toast('Referral link is not ready yet.', 'error');
      return false;
    }
    return true;
  }

  async function copyLink() {
    if (!(await ensureDashboard())) return;
    const link = referralLink(dashboard.referralCode);
    try {
      await navigator.clipboard.writeText(link);
      WTC_UI.toast('Referral link copied.', 'success');
      recordShare();
    } catch (error) {
      const input = byId('studentReferralLink');
      input?.select();
      document.execCommand?.('copy');
      WTC_UI.toast('Referral link copied.', 'success');
      recordShare();
    }
  }

  async function shareWhatsApp() {
    if (!(await ensureDashboard())) return;
    const user = currentUser();
    const link = referralLink(dashboard.referralCode);
    const message = [
      `Hello! ${user?.name || 'A WTC student'} invited you to WAGH Tuition Classes.`,
      'Take a free diagnostic test, join the Daily Chapter Challenge or book a free demo:',
      link
    ].join('\n\n');
    recordShare();
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank', 'noopener');
  }

  async function nativeShare() {
    if (!(await ensureDashboard())) return;
    const link = referralLink(dashboard.referralCode);
    if (!navigator.share) return copyLink();
    try {
      await navigator.share({ title:'WAGH Tuition Classes', text:'Join WTC for a free diagnostic test and structured learning support.', url:link });
      recordShare();
    } catch (error) {
      if (error?.name !== 'AbortError') WTC_UI.toast('Sharing was not completed.', 'info');
    }
  }

  async function recordShare() {
    try { await WTC_API.recordReferralShare(currentUser()); } catch (error) {}
  }

  function stageLabel(value) {
    return ({ CLICKED:'Referral link opened', SIGNED_UP:'Student account created', ENQUIRY:'Demo/report enquiry received', DEMO_BOOKED:'Demo booked', JOINED:'Student joined', REWARD_APPROVED:'Reward approved', REJECTED:'Referral closed' })[String(value || '').toUpperCase()] || 'Referral activity';
  }
  function rewardLabel(status, type) {
    const value = String(status || 'NOT_ELIGIBLE').toUpperCase();
    if (value === 'APPROVED') return type ? `Approved: ${type}` : 'Reward approved';
    if (value === 'PENDING') return 'Reward review pending';
    if (value === 'REJECTED') return 'No reward';
    return 'In progress';
  }
  function formatDate(value) { return window.WTC_TIME?.stampForDisplay?.(value) || String(value || ''); }
  function setText(id, value) { const el = byId(id); if (el) el.textContent = String(value ?? ''); }

  document.addEventListener('DOMContentLoaded', () => {
    byId('studentReferralCopy')?.addEventListener('click', copyLink);
    byId('studentReferralWhatsApp')?.addEventListener('click', shareWhatsApp);
    byId('studentReferralShare')?.addEventListener('click', nativeShare);
    if (byId('referralSection')?.classList.contains('active')) load();
  });

  return { load, copyLink, shareWhatsApp, nativeShare };
})();
