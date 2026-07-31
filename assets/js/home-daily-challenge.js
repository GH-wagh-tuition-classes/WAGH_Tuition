/* WAGH Tuition Classes — Homepage Daily Challenge full-screen access H1.4.4 */
const WTC_HOME_DAILY_CHALLENGE = (() => {
  let user = null;
  let statusData = null;
  let bindingsReady = false;
  let actionMode = 'login';

  function currentStudent() {
    try {
      const candidate = WTC_AUTH.getUser ? WTC_AUTH.getUser() : null;
      return candidate && String(candidate.role || '').toLowerCase() === 'student' ? candidate : null;
    } catch (error) {
      return null;
    }
  }

  async function init() {
    const host = document.getElementById('dailyChallengeCard');
    if (!host) return;
    bind();
    user = currentStudent();
    if (!user) {
      renderLogin();
      return;
    }
    hideInlineLogin({ focusAction:false, clearStatus:true });
    await loadStatus();
  }

  async function refresh() {
    user = currentStudent();
    if (!user) {
      renderLogin();
      return false;
    }
    hideInlineLogin({ focusAction:false, clearStatus:true });
    return loadStatus();
  }

  async function loadStatus() {
    renderLoading();
    try {
      const data = await WTC_DAILY_CHALLENGE.status(user);
      if (data?.success === false) throw new Error(data.message || 'Today’s challenge could not be checked.');
      statusData = data;
      render(data);
      return true;
    } catch (error) {
      renderError(error.message || 'Today’s challenge is temporarily unavailable.');
      return false;
    }
  }

  function bind() {
    if (bindingsReady) return;
    bindingsReady = true;

    document.getElementById('dailyChallengeAction')?.addEventListener('click', async () => {
      user = currentStudent();
      if (!user || actionMode === 'login') {
        showInlineLogin();
        return;
      }
      if (actionMode === 'retry') {
        await loadStatus();
        return;
      }
      WTC_DAILY_CHALLENGE.open();
    });

    document.querySelectorAll('[data-daily-login-close]').forEach(button => {
      button.addEventListener('click', () => hideInlineLogin({ focusAction:true }));
    });

    const mobile = document.getElementById('dailyChallengeLoginMobile');
    mobile?.addEventListener('input', () => {
      mobile.value = String(mobile.value || '').replace(/\D/g, '').slice(0, 10);
    });

    document.getElementById('dailyChallengeLoginForm')?.addEventListener('submit', async event => {
      event.preventDefault();
      await WTC_AUTH.handleLogin('dailyChallengeLoginForm', {
        role:'Student',
        requiredRole:'Student',
        redirect:false,
        toast:false,
        statusId:'dailyChallengeLoginStatus',
        successMessage:'Student login successful. Loading today’s challenge…',
        onSuccess:async cleanUser => {
          user = cleanUser;
          await loadStatus();
          hideInlineLogin({ focusAction:false, clearStatus:false });
        }
      });
    });
  }

  function showInlineLogin() {
    const panel = document.getElementById('dailyChallengeLoginPanel');
    const action = document.getElementById('dailyChallengeAction');
    if (!panel) return;
    panel.hidden = false;
    action?.setAttribute('aria-expanded', 'true');
    window.setTimeout(() => document.getElementById('dailyChallengeLoginMobile')?.focus({ preventScroll:true }), 30);
  }

  function hideInlineLogin({ focusAction=false, clearStatus=false }={}) {
    const panel = document.getElementById('dailyChallengeLoginPanel');
    const action = document.getElementById('dailyChallengeAction');
    if (panel) panel.hidden = true;
    action?.setAttribute('aria-expanded', 'false');
    if (clearStatus) WTC_UI.setStatus('dailyChallengeLoginStatus', '', '');
    if (focusAction) action?.focus({ preventScroll:true });
  }

  function renderLoading() {
    setText('dailyChallengeSubject','Checking today’s chapter…');
    setText('dailyChallengeMessage','Preparing today’s chapter challenge for your learning profile.');
    setText('dailyChallengeProfile','');
    setText('dailyChallengeState','Loading');
    setButton('Please wait…',true,'loading');
  }

  function renderLogin() {
    statusData = null;
    setText('dailyChallengeSubject','One subject. Selected chapters. 20 questions every day.');
    setText('dailyChallengeMessage','Use your Student account to enter today’s official challenge. Teacher, Admin and Parent accounts cannot join from this screen.');
    setText('dailyChallengeProfile','');
    setText('dailyChallengeState','Student login required');
    setButton('Login to Join',false,'login');
  }

  function render(data) {
    hideInlineLogin({ focusAction:false });
    if (!data.available) {
      setText('dailyChallengeSubject','Chapter Challenge coming soon for this learning path');
      setText('dailyChallengeMessage',data.message || 'The Admin must activate a chapter pool containing at least 20 published MCQs.');
      setText('dailyChallengeProfile','');
      setText('dailyChallengeState','Not available today');
      setButton('Unavailable',true,'unavailable');
      return;
    }

    const challenge = data.challenge || {};
    setText('dailyChallengeSubject',`${challenge.subjectName ? `${challenge.subjectName} — ` : ''}${challenge.chapterNames?.join(' + ') || 'Today’s Chapter'}`);
    setText('dailyChallengeMessage',`${challenge.questionCount || 20} chapter MCQs • ${challenge.durationMin || 20} minutes • Closes ${challenge.closesAtDisplay || window.WTC_TIME?.formatDateTime?.(challenge.closesAt) || 'today'} IST`);
    setText('dailyChallengeProfile',[challenge.className,challenge.board,challenge.medium].filter(Boolean).join(' • '));

    if (data.state === 'COMPLETED') {
      setText('dailyChallengeState',`Completed • ${data.result?.score || 0}/${data.result?.total || 20} • ${data.result?.percent || 0}%${data.leaderboardSummary?.selfRank ? ` • Rank #${data.leaderboardSummary.selfRank}` : ` • ${Number(data.leaderboardSummary?.completedCount||0)} completed`}`);
      setButton('View Today’s Result',false);
    } else if (data.state === 'IN_PROGRESS') {
      setText('dailyChallengeState','Attempt in progress — resume before time ends');
      setButton('Resume Challenge',false);
    } else if (data.state === 'EXPIRED') {
      setText('dailyChallengeState','Today’s official attempt has expired');
      setButton('Attempt Expired',true,'expired');
    } else if (data.state === 'SUSPENDED') {
      setText('dailyChallengeState','Suspended by Admin');
      setButton('Suspended',true,'suspended');
    } else if (data.state === 'DRAFT' || data.state === 'UPCOMING') {
      setText('dailyChallengeState',`Opens ${challenge.opensAtDisplay || window.WTC_TIME?.formatDateTime?.(challenge.opensAt) || 'later'} IST`);
      setButton('Not Open Yet',true,'upcoming');
    } else if (data.state === 'CLOSED') {
      setText('dailyChallengeState','Today’s challenge is closed');
      setButton('Closed Today',true,'closed');
    } else {
      setText('dailyChallengeState',`Available now • ${Number(data.leaderboardSummary?.startedCount||0)} joined • IST`);
      setButton('Start Today’s Challenge',false);
    }
  }

  function renderError(message) {
    setText('dailyChallengeSubject','Daily Chapter Challenge');
    setText('dailyChallengeMessage',message);
    setText('dailyChallengeProfile','');
    setText('dailyChallengeState','Could not load');
    setButton('Try Again',false,'retry');
  }

  function setButton(label, disabled, mode='open') {
    const button = document.getElementById('dailyChallengeAction');
    if (!button) return;
    actionMode = mode;
    button.textContent = label;
    button.disabled = !!disabled;
  }

  function setText(id, value) {
    const element = document.getElementById(id);
    if (element) element.textContent = String(value ?? '');
  }

  return { init, refresh, showInlineLogin, hideInlineLogin };
})();

window.WTC_HOME_DAILY_CHALLENGE = WTC_HOME_DAILY_CHALLENGE;
document.addEventListener('DOMContentLoaded', WTC_HOME_DAILY_CHALLENGE.init);
