/* WAGH Tuition Classes — Homepage Full-Screen Test Experience H1.4.4-R1 */
const WTC_HOME = (() => {
  const PHONE_DISPLAY = '95370 36383';
  let authHashRoutingInitialized = false;
  let experienceRoutingInitialized = false;
  let mobileBarBehaviorInitialized = false;
  let activeExperience = '';
  let experienceReturnFocus = null;
  let diagnosticStateObserver = null;

  function byId(id) {
    return document.getElementById(id);
  }

  function normalizeMobile(value) {
    const digits = String(value || '').replace(/\D/g, '');
    return digits.length === 12 && digits.startsWith('91') ? digits.slice(2) : digits;
  }

  function whatsappNumber() {
    return String(window.WTC_CONFIG?.WHATSAPP_NUMBER || '919537036383').replace(/\D/g, '');
  }

  function whatsappUrl(message='') {
    const base = `https://wa.me/${whatsappNumber()}`;
    return message ? `${base}?text=${encodeURIComponent(message)}` : base;
  }

  function sourceDetails() {
    const params = new URLSearchParams(window.location.search);
    const campaign = params.get('utm_campaign') || '';
    const explicitSource = params.get('utm_source') || params.get('source') || '';
    let referrer = '';
    try { referrer = document.referrer ? new URL(document.referrer).hostname : ''; }
    catch (error) { referrer = ''; }
    const source = explicitSource || referrer || 'Direct';
    return campaign ? `${source} / ${campaign}` : source;
  }

  function initializeContactLinks() {
    document.querySelectorAll('[data-whatsapp]').forEach(link => {
      if (!link.dataset.customMessage) link.href = whatsappUrl('Hello WAGH Tuition Classes, I would like information about tuition and a free demo.');
    });
  }

  function initializeMenu() {
    const button = byId('menuButton');
    const nav = byId('navLinks');
    if (!button || !nav) return;

    const close = () => {
      nav.classList.remove('open');
      button.setAttribute('aria-expanded', 'false');
      button.setAttribute('aria-label', 'Open navigation menu');
    };

    button.addEventListener('click', () => {
      const open = !nav.classList.contains('open');
      nav.classList.toggle('open', open);
      button.setAttribute('aria-expanded', String(open));
      button.setAttribute('aria-label', open ? 'Close navigation menu' : 'Open navigation menu');
    });

    nav.querySelectorAll('a').forEach(link => link.addEventListener('click', close));
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape') {
        close();
        button.focus();
      }
    });
    document.addEventListener('click', event => {
      if (!nav.classList.contains('open')) return;
      if (!nav.contains(event.target) && !button.contains(event.target)) close();
    });
  }

  function setAuthDrawerExpanded(expanded) {
    const drawer = byId('portal-access');
    if (!drawer) return;
    drawer.hidden = !expanded;
    document.querySelectorAll('[data-auth-target]').forEach(control => {
      control.setAttribute('aria-expanded', String(expanded && control.dataset.authTarget === currentAuthPanel()));
    });
  }

  function currentAuthPanel() {
    return byId('signupPanel')?.hidden === false ? 'signup' : 'login';
  }

  function showAuthPanel(name='login', { updateHash=false }={}) {
    const isSignup = name === 'signup';
    const loginTab = byId('loginTab');
    const signupTab = byId('signupTab');
    const loginPanel = byId('loginPanel');
    const signupPanel = byId('signupPanel');
    if (!loginTab || !signupTab || !loginPanel || !signupPanel) return;

    loginTab.setAttribute('aria-selected', String(!isSignup));
    signupTab.setAttribute('aria-selected', String(isSignup));
    loginPanel.classList.toggle('active', !isSignup);
    signupPanel.classList.toggle('active', isSignup);
    loginPanel.hidden = isSignup;
    signupPanel.hidden = !isSignup;
    setAuthDrawerExpanded(true);

    if (updateHash) {
      const nextHash = isSignup ? '#signup' : '#login';
      if (window.location.hash.toLowerCase() !== nextHash) history.pushState({ wtcAuth:isSignup ? 'signup' : 'login' }, '', nextHash);
    }
  }

  function hideAuthPanel({ clearHash=true }={}) {
    setAuthDrawerExpanded(false);
    const hash = String(window.location.hash || '').toLowerCase();
    if (clearHash && (hash === '#login' || hash === '#signup')) {
      history.replaceState({}, '', `${window.location.pathname}${window.location.search}`);
    }
  }

  function routeAuthHash() {
    const hash = String(window.location.hash || '').toLowerCase();
    if (hash !== '#login' && hash !== '#signup') return false;
    showAuthPanel(hash === '#signup' ? 'signup' : 'login');
    return true;
  }

  function initializeAuthHashRouting() {
    if (authHashRoutingInitialized) {
      routeAuthHash();
      return;
    }
    authHashRoutingInitialized = true;
    routeAuthHash();
  }

  function initializeAuthTabs() {
    document.querySelectorAll('[data-auth-tab]').forEach(button => {
      button.addEventListener('click', () => showAuthPanel(button.dataset.authTab || 'login'));
    });

    document.querySelectorAll('[data-auth-target]').forEach(control => {
      control.addEventListener('click', event => {
        event.preventDefault();
        showAuthPanel(control.dataset.authTarget || 'login', { updateHash:true });
      });
    });

    document.querySelectorAll('[data-auth-close]').forEach(button => {
      button.addEventListener('click', () => hideAuthPanel());
    });

    const loginForm = byId('loginForm');
    const signupForm = byId('signupForm');
    loginForm?.addEventListener('submit', event => {
      event.preventDefault();
      WTC_AUTH.handleLogin();
    });
    signupForm?.addEventListener('submit', event => {
      event.preventDefault();
      WTC_AUTH.handleSignup();
    });
  }

  function experienceNameFromHash() {
    const hash = String(window.location.hash || '').toLowerCase();
    return hash === '#daily-challenge' ? 'daily-challenge' : hash === '#diagnostic' ? 'diagnostic' : '';
  }

  function experienceModal(name) {
    return document.querySelector(`[data-experience-modal="${name}"]`);
  }

  function focusableElements(dialog) {
    return [...dialog.querySelectorAll('a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])')]
      .filter(element => !element.hidden && element.offsetParent !== null);
  }

  function openExperience(name, { updateHash=false, trigger=null }={}) {
    const modal = experienceModal(name);
    if (!modal) return false;
    if (activeExperience && activeExperience !== name) closeExperience({ clearHash:false, restoreFocus:false });

    experienceReturnFocus = trigger instanceof HTMLElement ? trigger : document.activeElement instanceof HTMLElement ? document.activeElement : null;
    modal.hidden = false;
    activeExperience = name;
    document.body.classList.add('experience-modal-open');
    modal.querySelector('.experience-modal-dialog')?.focus({ preventScroll:true });

    if (name === 'daily-challenge') {
      window.WTC_HOME_DAILY_CHALLENGE?.refresh?.();
    } else if (name === 'diagnostic') {
      syncDiagnosticExperienceState({ scrollOnChange:false });
      window.requestAnimationFrame(() => syncDiagnosticExperienceState({ scrollOnChange:false }));
    }

    if (updateHash) {
      const nextHash = `#${name}`;
      if (window.location.hash.toLowerCase() !== nextHash) history.pushState({ wtcExperience:name }, '', nextHash);
      else history.replaceState({ ...(history.state || {}), wtcExperience:name }, '', nextHash);
    }
    return true;
  }

  function closeExperience({ clearHash=true, restoreFocus=true }={}) {
    if (!activeExperience) return;
    const modal = experienceModal(activeExperience);
    if (modal) modal.hidden = true;
    if (activeExperience === 'daily-challenge') {
      window.WTC_HOME_DAILY_CHALLENGE?.hideInlineLogin?.({ focusAction:false, clearStatus:true });
    }
    activeExperience = '';
    document.body.classList.remove('experience-modal-open');

    if (clearHash && experienceNameFromHash()) {
      history.replaceState({}, '', `${window.location.pathname}${window.location.search}`);
    }
    if (restoreFocus && experienceReturnFocus?.isConnected) experienceReturnFocus.focus({ preventScroll:true });
    experienceReturnFocus = null;
  }

  function requestExperienceClose() {
    if (history.state?.wtcExperience && experienceNameFromHash()) history.back();
    else closeExperience();
  }

  function routeExperienceHash({ prepareBackEntry=false }={}) {
    const name = experienceNameFromHash();
    if (!name) {
      closeExperience({ clearHash:false });
      return false;
    }

    if (prepareBackEntry && !history.state?.wtcExperience) {
      const hash = `#${name}`;
      history.replaceState({ wtcExperienceBase:true }, '', `${window.location.pathname}${window.location.search}`);
      history.pushState({ wtcExperience:name }, '', hash);
    }
    openExperience(name);
    return true;
  }

  function scrollExperienceTop(name) {
    const modal = experienceModal(name);
    const body = modal?.querySelector('.experience-modal-body');
    body?.scrollTo({ top:0, behavior:'smooth' });
  }

  function syncDiagnosticExperienceState({ scrollOnChange=true }={}) {
    const section = byId('diagnostic');
    if (!section) return 'selection';

    const selectorPanel = byId('diagnosticSelectorPanel');
    const testPanel = byId('diagnosticTestPanel');
    const resultPanel = byId('diagnosticResultPanel');
    const state = testPanel && !testPanel.hidden
      ? 'test'
      : resultPanel && !resultPanel.hidden
        ? 'result'
        : selectorPanel && !selectorPanel.hidden
          ? 'selection'
          : 'loading';
    const previousState = section.dataset.diagnosticState || '';
    const running = state === 'test' || state === 'result';

    section.dataset.diagnosticState = state;
    section.classList.toggle('diagnostic-run-active', running);
    experienceModal('diagnostic')?.setAttribute('data-diagnostic-state', state);

    if (scrollOnChange && previousState && previousState !== state && activeExperience === 'diagnostic') {
      window.requestAnimationFrame(() => {
        const body = experienceModal('diagnostic')?.querySelector('.experience-modal-body');
        body?.scrollTo({ top:0, left:0, behavior:'auto' });
      });
    }
    return state;
  }

  function initializeDiagnosticExperienceState() {
    const panels = [
      byId('diagnosticSelectorPanel'),
      byId('diagnosticTestPanel'),
      byId('diagnosticResultPanel')
    ].filter(Boolean);
    if (!panels.length) return;

    syncDiagnosticExperienceState({ scrollOnChange:false });
    if (diagnosticStateObserver) return;

    diagnosticStateObserver = new MutationObserver(() => syncDiagnosticExperienceState());
    panels.forEach(panel => diagnosticStateObserver.observe(panel, {
      attributes:true,
      attributeFilter:['hidden']
    }));
  }

  function initializeExperienceModals() {
    document.querySelectorAll('[data-experience-target]').forEach(control => {
      control.addEventListener('click', event => {
        event.preventDefault();
        openExperience(control.dataset.experienceTarget || '', { updateHash:true, trigger:control });
      });
    });
    document.querySelectorAll('[data-experience-close]').forEach(control => {
      control.addEventListener('click', requestExperienceClose);
    });

    if (!experienceRoutingInitialized) {
      experienceRoutingInitialized = true;
      window.addEventListener('popstate', () => {
        routeAuthHash();
        routeExperienceHash();
      });
      window.addEventListener('hashchange', () => {
        routeAuthHash();
        routeExperienceHash();
      });
      document.addEventListener('keydown', event => {
        if (!activeExperience) return;
        if (event.key === 'Escape') {
          event.preventDefault();
          requestExperienceClose();
          return;
        }
        if (event.key !== 'Tab') return;
        const dialog = experienceModal(activeExperience)?.querySelector('.experience-modal-dialog');
        if (!dialog) return;
        const focusable = focusableElements(dialog);
        if (!focusable.length) {
          event.preventDefault();
          dialog.focus();
          return;
        }
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      });
    }

    routeExperienceHash({ prepareBackEntry:true });
  }

  function initializePasswordToggles() {
    document.querySelectorAll('[data-password-toggle]').forEach(button => {
      button.addEventListener('click', () => {
        const input = byId(button.dataset.passwordToggle);
        if (!input) return;
        const show = input.type === 'password';
        input.type = show ? 'text' : 'password';
        button.textContent = show ? 'Hide' : 'Show';
        button.setAttribute('aria-label', show ? 'Hide password' : 'Show password');
      });
    });
  }

  function scrollToAdmission() {
    byId('admission')?.scrollIntoView({ behavior:'smooth', block:'start' });
  }

  function initializeClassChoices() {
    document.querySelectorAll('[data-class-choice]').forEach(button => {
      button.addEventListener('click', () => {
        const select = byId('leadClass');
        const preferred = button.dataset.classChoice || '';
        if (select && [...select.options].some(option => option.value === preferred)) select.value = preferred;
        scrollToAdmission();
        window.setTimeout(() => byId('leadStudentName')?.focus({ preventScroll:true }), 450);
      });
    });
  }

  function buildLeadMessage(lead, leadId='') {
    const lines = [
      'Hello WAGH Tuition Classes, I would like to book a free demo.',
      '',
      `Student: ${lead.studentName}`,
      `Parent Mobile: ${lead.parentMobile}`,
      `Class: ${lead.className}`,
      `Board: ${lead.board}`,
      `Medium: ${lead.medium}`,
      `Subject: ${lead.subject}`,
      `Preferred Time: ${lead.preferredTime || 'Any suitable time'}`
    ];
    if (leadId) lines.push(`Enquiry ID: ${leadId}`);
    return lines.join('\n');
  }

  function saveLeadDraft(lead) {
    try {
      localStorage.setItem('wtcPendingAdmissionLead', JSON.stringify({ ...lead, savedAt:Date.now() }));
    } catch (error) {
      // WhatsApp fallback still works when storage is unavailable.
    }
  }

  function showLeadSuccess(lead, leadId='', onlineSaved=false) {
    const successBox = byId('admissionSuccess');
    const whatsapp = byId('admissionWhatsapp');
    const message = buildLeadMessage(lead, leadId);
    if (whatsapp) whatsapp.href = whatsappUrl(message);
    if (successBox) successBox.hidden = false;
    WTC_UI.setStatus(
      'admissionStatus',
      onlineSaved
        ? `Thank you. Your enquiry${leadId ? ` (${leadId})` : ''} has been saved.`
        : 'Your details are ready. Please send them on WhatsApp to complete the enquiry.',
      onlineSaved ? 'success' : 'info'
    );
  }

  async function handleAdmissionSubmit(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const submitButton = form.querySelector('button[type="submit"]');
    byId('admissionSuccess')?.setAttribute('hidden', '');
    WTC_UI.setStatus('admissionStatus', '', '');

    if (!form.checkValidity()) {
      form.reportValidity();
      WTC_UI.setStatus('admissionStatus', 'Please complete all required fields correctly.', 'error');
      return;
    }

    const data = Object.fromEntries(new FormData(form).entries());
    if (String(data.website || '').trim()) return;

    const baseLead = {
      studentName:String(data.studentName || '').trim(),
      parentMobile:normalizeMobile(data.parentMobile),
      className:String(data.className || '').trim(),
      board:String(data.board || '').trim(),
      medium:String(data.medium || '').trim(),
      subject:String(data.subject || '').trim(),
      preferredTime:String(data.preferredTime || 'Any suitable time').trim(),
      source:'DEMO_FORM',
      pageUrl:window.location.href.split('#')[0],
      consent:String(data.consent || '') === 'yes'
    };
    let lead = window.WTC_CAMPAIGN?.decorateLead ? WTC_CAMPAIGN.decorateLead(baseLead) : baseLead;
    if (window.WTC_REFERRAL_ATTRIBUTION?.decorate) lead = WTC_REFERRAL_ATTRIBUTION.decorate(lead);

    if (!/^\d{10}$/.test(lead.parentMobile)) {
      WTC_UI.setStatus('admissionStatus', 'Enter a valid 10-digit mobile number.', 'error');
      byId('leadParentMobile')?.focus();
      return;
    }

    WTC_UI.setBusy(submitButton, true, 'Submitting...');
    WTC_UI.setStatus('admissionStatus', 'Submitting your enquiry...', 'info');

    try {
      if (typeof WTC_API === 'undefined' || !WTC_API.saveAdmissionLead) throw new Error('Online lead service is not available yet.');
      const response = await WTC_API.saveAdmissionLead(lead);
      if (!response || response.success === false) throw new Error(response?.message || 'Could not save the enquiry.');
      showLeadSuccess(lead, response.leadId || '', true);
      form.reset();
      WTC_UI.toast('Demo enquiry submitted successfully.', 'success');
    } catch (error) {
      console.warn('Admission enquiry fallback:', error.message);
      saveLeadDraft(lead);
      showLeadSuccess(lead, '', false);
      WTC_UI.toast('Use the WhatsApp button to complete your enquiry.', 'info');
    } finally {
      WTC_UI.setBusy(submitButton, false);
    }
  }

  function initializeAdmissionForm() {
    const form = byId('admissionForm');
    form?.addEventListener('submit', handleAdmissionSubmit);

    const mobile = byId('leadParentMobile');
    mobile?.addEventListener('input', () => {
      mobile.value = normalizeMobile(mobile.value).slice(0, 10);
    });

    ['loginMobile','signupMobile'].forEach(id => {
      const input = byId(id);
      input?.addEventListener('input', () => {
        input.value = normalizeMobile(input.value).slice(0, 10);
      });
    });
  }

  function initializeMobileConversionBar() {
    if (mobileBarBehaviorInitialized) return;
    const bar = document.querySelector('.mobile-conversion-bar');
    if (!bar) return;
    mobileBarBehaviorInitialized = true;

    const isEditable = element => element instanceof Element && element.matches('input, select, textarea, [contenteditable="true"]');
    const update = () => bar.classList.toggle('is-suppressed', isEditable(document.activeElement));

    document.addEventListener('focusin', event => {
      if (isEditable(event.target)) bar.classList.add('is-suppressed');
    });
    document.addEventListener('focusout', () => window.setTimeout(update, 80));
    window.visualViewport?.addEventListener('resize', update);
  }

  function resetPlainHomepagePosition() {
    if (window.location.hash) return;
    if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
    window.requestAnimationFrame(() => window.scrollTo({ top:0, left:0, behavior:'auto' }));
  }

  function autoRedirectLoggedUser() {
    if (!window.WTC_CONFIG || typeof WTC_AUTH === 'undefined') return false;
    const user = WTC_AUTH.getUser();
    if (!user) return false;
    const role = String(user.role || 'Student').toLowerCase();
    if (role === 'teacher') window.location.replace('teacher.html');
    else if (role === 'admin') window.location.replace('admin.html');
    else if (role === 'parent') window.location.replace('parent.html');
    else window.location.replace('student.html');
    return true;
  }

  function initializeYear() {
    const year = byId('currentYear');
    if (year) year.textContent = String(window.WTC_TIME?.year?.() || new Date().getFullYear());
  }

  function initialize() {
    if (autoRedirectLoggedUser()) return;
    initializeYear();
    initializeContactLinks();
    resetPlainHomepagePosition();
    initializeMenu();
    initializeAuthTabs();
    initializeAuthHashRouting();
    initializeDiagnosticExperienceState();
    initializeExperienceModals();
    initializePasswordToggles();
    initializeClassChoices();
    initializeAdmissionForm();
    initializeMobileConversionBar();
  }

  return { initialize, showAuthPanel, hideAuthPanel, routeAuthHash, openExperience, closeExperience, scrollExperienceTop, PHONE_DISPLAY };
})();

window.WTC_HOME = WTC_HOME;
document.addEventListener('DOMContentLoaded', WTC_HOME.initialize);
window.addEventListener('pageshow', () => {
  if (!window.location.hash) window.scrollTo({ top:0, left:0, behavior:'auto' });
  if (WTC_HOME && WTC_AUTH && WTC_HOME.initialize && WTC_AUTH.getUser()) WTC_AUTH.redirectByRole(WTC_AUTH.getUser());
});
