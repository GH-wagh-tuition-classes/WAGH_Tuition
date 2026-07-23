/* WAGH Tuition Classes — Home Page & Conversion Funnel H1.0 */
const WTC_HOME = (() => {
  const PHONE_DISPLAY = '95370 36383';

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

  function showAuthPanel(name='login') {
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
  }

  function initializeAuthTabs() {
    document.querySelectorAll('[data-auth-tab]').forEach(button => {
      button.addEventListener('click', () => showAuthPanel(button.dataset.authTab || 'login'));
    });

    document.querySelectorAll('[data-auth-target]').forEach(link => {
      link.addEventListener('click', () => showAuthPanel(link.dataset.authTarget || 'login'));
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

    const lead = {
      studentName:String(data.studentName || '').trim(),
      parentMobile:normalizeMobile(data.parentMobile),
      className:String(data.className || '').trim(),
      board:String(data.board || '').trim(),
      medium:String(data.medium || '').trim(),
      subject:String(data.subject || '').trim(),
      preferredTime:String(data.preferredTime || 'Any suitable time').trim(),
      source:sourceDetails(),
      pageUrl:window.location.href.split('#')[0],
      consent:String(data.consent || '') === 'yes'
    };

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
    if (year) year.textContent = String(new Date().getFullYear());
  }

  function initialize() {
    if (autoRedirectLoggedUser()) return;
    initializeYear();
    initializeContactLinks();
    initializeMenu();
    initializeAuthTabs();
    initializePasswordToggles();
    initializeClassChoices();
    initializeAdmissionForm();
  }

  return { initialize, showAuthPanel, PHONE_DISPLAY };
})();

document.addEventListener('DOMContentLoaded', WTC_HOME.initialize);
window.addEventListener('pageshow', () => WTC_HOME && WTC_AUTH && WTC_HOME.initialize && WTC_AUTH.getUser() && WTC_AUTH.redirectByRole(WTC_AUTH.getUser()));
