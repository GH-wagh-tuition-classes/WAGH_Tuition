/* WAGH Tuition Classes — Homepage Chapter Challenge Card H1.3B-R1 */
const WTC_HOME_DAILY_CHALLENGE = (() => {
  let user = null;
  let statusData = null;

  async function init() {
    const host = document.getElementById('dailyChallengeCard');
    if (!host) return;
    try { user = WTC_AUTH.getUser ? WTC_AUTH.getUser() : null; } catch (error) { user = null; }
    bind();
    if (!user || String(user.role || '').toLowerCase() !== 'student') return renderLogin();
    renderLoading();
    try {
      const data = await WTC_DAILY_CHALLENGE.status(user);
      if (data?.success === false) throw new Error(data.message || 'Today’s challenge could not be checked.');
      statusData = data;
      render(data);
    } catch (error) {
      renderError(error.message || 'Today’s challenge is temporarily unavailable.');
    }
  }

  function bind() {
    document.getElementById('dailyChallengeAction')?.addEventListener('click', () => {
      if (!user || String(user.role || '').toLowerCase() !== 'student') return WTC_DAILY_CHALLENGE.goToLogin();
      WTC_DAILY_CHALLENGE.open();
    });
  }

  function renderLoading() {
    setText('dailyChallengeSubject','Checking today’s chapter…');
    setText('dailyChallengeMessage','Preparing today’s chapter challenge for your learning profile.');
    setButton('Please wait…',true);
  }

  function renderLogin() {
    setText('dailyChallengeSubject','One chapter challenge. 20 questions. Every day.');
    setText('dailyChallengeMessage','Login as a Student to enter the official challenge attempt. Guests can still use the free chapter diagnostic below.');
    setText('dailyChallengeState','Student login required');
    setButton('Login to Join',false);
  }

  function render(data) {
    if (!data.available) {
      setText('dailyChallengeSubject','Chapter Challenge coming soon for this learning path');
      setText('dailyChallengeMessage',data.message || 'The Admin must activate a chapter pool containing at least 20 published MCQs.');
      setText('dailyChallengeState','Not available today');
      return setButton('Unavailable',true);
    }
    const challenge = data.challenge || {};
    setText('dailyChallengeSubject',challenge.chapterNames?.join(' + ') || challenge.subjectName || 'Today’s Chapter');
    setText('dailyChallengeMessage',`${challenge.questionCount || 20} chapter MCQs • ${challenge.durationMin || 20} minutes • One official attempt`);
    setText('dailyChallengeProfile',[challenge.className,challenge.board,challenge.medium].filter(Boolean).join(' • '));
    if (data.state === 'COMPLETED') {
      setText('dailyChallengeState',`Completed • ${data.result?.score || 0}/${data.result?.total || 20} • ${data.result?.percent || 0}%`);
      setButton('View Today’s Result',false);
    } else if (data.state === 'IN_PROGRESS') {
      setText('dailyChallengeState','Attempt in progress — resume before time ends');
      setButton('Resume Challenge',false);
    } else if (data.state === 'EXPIRED') {
      setText('dailyChallengeState','Today’s official attempt has expired');
      setButton('Attempt Expired',true);
    } else {
      setText('dailyChallengeState','Available now');
      setButton('Start Today’s Challenge',false);
    }
  }

  function renderError(message) {
    setText('dailyChallengeSubject','Daily Challenge');
    setText('dailyChallengeMessage',message);
    setText('dailyChallengeState','Could not load');
    setButton('Try from Student Portal',true);
  }

  function setButton(label,disabled) { const button=document.getElementById('dailyChallengeAction'); if(button){button.textContent=label;button.disabled=!!disabled;} }
  function setText(id,value) { const el=document.getElementById(id); if(el)el.textContent=String(value ?? ''); }
  return { init };
})();

document.addEventListener('DOMContentLoaded', WTC_HOME_DAILY_CHALLENGE.init);
