/* WAGH Tuition Classes — Student Portal Multi-Subject Chapter Challenge Widget H1.3B-R2 */
const WTC_STUDENT_DAILY_CHALLENGE = (() => {
  let user = null;

  function init() {
    try { user = WTC_AUTH.getUser ? WTC_AUTH.getUser() : null; } catch (error) { user = null; }
    if (!user || String(user.role || '').toLowerCase() !== 'student') return;
    inject();
    bind();
    load();
  }

  function inject() {
    if (document.getElementById('wtcDailyChallengeWidget')) return;
    const home = document.getElementById('homeSection');
    if (!home) return;
    const section = document.createElement('section');
    section.id = 'wtcDailyChallengeWidget';
    section.className = 'wtc-daily-widget loading';
    section.innerHTML = `<div class="wtc-daily-copy"><span class="wtc-daily-icon" aria-hidden="true">⚡</span><div><small>Daily chapter practice</small><h2 id="wtcDailyTitle">Today’s Chapter Challenge</h2><p id="wtcDailyMessage">Checking today’s chapter…</p><span id="wtcDailyProfile" class="wtc-daily-profile"></span></div></div><div class="wtc-daily-actions"><span id="wtcDailyState" class="wtc-daily-state">Loading</span><button id="wtcDailyOpen" class="btn" type="button" disabled>Open Challenge</button></div>`;
    const assigned = document.getElementById('wtcAssignedTestsWidget');
    const hero = home.querySelector('.hero-card');
    if (assigned) assigned.insertAdjacentElement('afterend',section);
    else if (hero) hero.insertAdjacentElement('afterend',section);
    else home.prepend(section);
  }

  function bind() { document.getElementById('wtcDailyOpen')?.addEventListener('click', WTC_DAILY_CHALLENGE.open); }

  async function load() {
    try {
      const data = await WTC_DAILY_CHALLENGE.status(user);
      if (data?.success === false) throw new Error(data.message || 'Daily Challenge could not be loaded.');
      render(data);
    } catch (error) { renderError(error.message || 'Daily Challenge is unavailable.'); }
  }

  function render(data) {
    const widget=document.getElementById('wtcDailyChallengeWidget'); widget?.classList.remove('loading');
    const button=document.getElementById('wtcDailyOpen');
    if (!data.available) {
      text('wtcDailyTitle','Daily Challenge coming soon'); text('wtcDailyMessage',data.message || 'More published questions are required.'); text('wtcDailyState','Unavailable'); if(button)button.disabled=true; return;
    }
    const challenge=data.challenge || {};
    const chapterLabel=(challenge.chapterNames || []).filter(Boolean).join(' + ') || challenge.subjectName || 'Today’s Chapter Challenge';
    text('wtcDailyTitle',chapterLabel);
    text('wtcDailyMessage',`${challenge.subjectName || 'Subject'} • ${challenge.questionCount || 20} questions • ${challenge.durationMin || 20} minutes • Closes ${challenge.closesAtDisplay || window.WTC_TIME?.formatDateTime?.(challenge.closesAt) || 'today'} IST`);
    text('wtcDailyProfile',[challenge.className,challenge.board,challenge.medium].filter(Boolean).join(' • '));
    if (data.state === 'COMPLETED') { const score=Number(data.result?.score||0),total=Number(data.result?.total||20),percent=Number(data.result?.percent||0); text('wtcDailyState',`Challenge score ${score}/${total} (${percent}%)`); if(button){button.textContent='View Challenge Result';button.disabled=false;} }
    else if (data.state === 'IN_PROGRESS') { text('wtcDailyState','In progress'); if(button){button.textContent='Resume Challenge';button.disabled=false;} }
    else if (data.state === 'EXPIRED') { text('wtcDailyState','Attempt expired'); if(button){button.textContent='Expired';button.disabled=true;} }
    else if (data.state === 'UPCOMING') { text('wtcDailyState',`Opens ${challenge.opensAtDisplay || window.WTC_TIME?.formatDateTime?.(challenge.opensAt) || 'later'} IST`); if(button){button.textContent='Not Open Yet';button.disabled=true;} }
    else if (data.state === 'CLOSED') { text('wtcDailyState','Closed today'); if(button){button.textContent='Closed';button.disabled=true;} }
    else { text('wtcDailyState','Available today • IST'); if(button){button.textContent='Start Challenge';button.disabled=false;} }
  }

  function renderError(message) { document.getElementById('wtcDailyChallengeWidget')?.classList.remove('loading'); text('wtcDailyMessage',message); text('wtcDailyState','Unavailable'); }
  function text(id,value) { const el=document.getElementById(id); if(el)el.textContent=String(value ?? ''); }
  return { init, load };
})();

document.addEventListener('DOMContentLoaded', WTC_STUDENT_DAILY_CHALLENGE.init);
