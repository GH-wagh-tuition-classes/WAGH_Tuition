/* WAGH Tuition Classes — H1.4 referral first-touch attribution */
window.WTC_REFERRAL_ATTRIBUTION = (() => {
  const STORAGE_KEY = 'wtcReferralAttribution:v1';
  const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;
  const codePattern = /^WTC-[A-Z0-9]{5,12}$/;

  const cleanCode = value => {
    const code = String(value || '').trim().toUpperCase().replace(/[^A-Z0-9-]/g, '');
    return codePattern.test(code) ? code : '';
  };

  function read() {
    try {
      const item = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
      if (!item || !item.referralCode || !item.capturedAt || Date.now() - Number(item.capturedAt) > MAX_AGE_MS) return null;
      return item;
    } catch (error) { return null; }
  }

  function capture() {
    const params = new URLSearchParams(window.location.search);
    const incoming = cleanCode(params.get('ref') || params.get('referral') || '');
    const stored = read();
    if (!incoming) return stored;

    // First valid referral wins for 30 days. This prevents link-hopping from
    // changing the referrer after the learner has already entered the funnel.
    if (stored?.referralCode && stored.referralCode !== incoming) return stored;

    const item = stored || {
      referralCode:incoming,
      source:String(params.get('source') || 'referral').slice(0, 80),
      campaign:String(params.get('campaign') || params.get('utm_campaign') || 'student-referral').slice(0, 120),
      landingPage:window.location.href.split('#')[0].slice(0, 300),
      capturedAt:Date.now()
    };
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(item)); } catch (error) {}
    return item;
  }

  function get() { return read() || capture(); }
  function getCode() { return get()?.referralCode || ''; }
  function decorate(payload={}) {
    const item = get();
    return item?.referralCode ? { ...payload, referralCode:item.referralCode } : payload;
  }

  async function recordVisit(item) {
    if (!item?.referralCode || !window.WTC_API?.trackReferralVisit) return;
    try {
      await WTC_API.trackReferralVisit({
        referralCode:item.referralCode,
        source:item.source,
        campaign:item.campaign,
        landingPage:item.landingPage
      });
    } catch (error) {
      console.warn('Referral visit could not be recorded:', error.message);
    }
  }

  function showWelcome(item) {
    const banner = document.getElementById('referralWelcomeBanner');
    const code = document.getElementById('referralWelcomeCode');
    if (!banner || !item?.referralCode) return;
    banner.hidden = false;
    if (code) code.textContent = item.referralCode;
  }

  function init() {
    const item = capture();
    if (!item?.referralCode) return;
    showWelcome(item);
    recordVisit(item);
  }

  document.addEventListener('DOMContentLoaded', init);
  return { capture, get, getCode, decorate, init };
})();
