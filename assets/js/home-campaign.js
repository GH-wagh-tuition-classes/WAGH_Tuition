/* WAGH Tuition Classes — First-touch Campaign Attribution H1.3A */
window.WTC_CAMPAIGN = (() => {
  const STORAGE_KEY = 'wtcCampaignAttribution:v1';
  const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

  const clean = (value, max=160) => String(value || '').replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);

  function readStored() {
    try {
      const item = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
      if (!item || !item.capturedAt || Date.now() - Number(item.capturedAt) > MAX_AGE_MS) return null;
      return item;
    } catch (error) { return null; }
  }

  function referrerHost() {
    try { return document.referrer ? new URL(document.referrer).hostname : ''; }
    catch (error) { return ''; }
  }

  function current() {
    const params = new URLSearchParams(window.location.search);
    const explicitSource = params.get('utm_source') || params.get('source') || '';
    const referrer = referrerHost();
    return {
      trafficSource:clean(explicitSource || referrer || 'Direct', 80),
      campaign:clean(params.get('utm_campaign') || params.get('campaign') || '', 120),
      campaignMedium:clean(params.get('utm_medium') || '', 80),
      campaignContent:clean(params.get('utm_content') || '', 120),
      referrer:clean(referrer, 160),
      landingPage:clean(window.location.href.split('#')[0], 300),
      capturedAt:Date.now()
    };
  }

  function hasAttribution(item) {
    return Boolean(item && (item.campaign || item.campaignMedium || item.campaignContent || (item.trafficSource && item.trafficSource !== 'Direct')));
  }

  function capture() {
    const fresh = current();
    const stored = readStored();
    const chosen = hasAttribution(fresh) ? fresh : (stored || fresh);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(chosen)); } catch (error) {}
    return chosen;
  }

  function get() { return readStored() || capture(); }
  function decorateLead(lead={}) { return { ...lead, ...get() }; }

  capture();
  return { capture, get, decorateLead };
})();
