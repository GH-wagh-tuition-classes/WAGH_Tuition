/* WAGH Tuition Classes — Chapter Daily Challenge shared launcher H1.3B-R2 */
window.WTC_DAILY_CHALLENGE = (() => {
  function identity(user) {
    return {
      studentId:user?.studentId || user?.id || '',
      mobile:user?.mobile || '',
      deviceId:typeof WTC_AUTH?.deviceId === 'function' ? WTC_AUTH.deviceId() : ''
    };
  }

  async function status(user) {
    if (!user || String(user.role || '').toLowerCase() !== 'student') {
      return { success:true, available:false, state:'LOGIN_REQUIRED', message:'Student login is required for the official Chapter Challenge.' };
    }
    return WTC_API.call({ action:'studentGetDailyChallengeStatus', ...identity(user) });
  }

  function open() {
    const url = new URL('tests/online-test/daily-challenge.html', document.baseURI);
    const features = 'popup=yes,width=1280,height=850,resizable=yes,scrollbars=yes';
    const popup = window.open(url.href, 'wtcDailyChallenge', features);
    if (!popup) location.href = url.href;
    else popup.focus();
  }

  function goToLogin() {
    const tab = document.getElementById('loginTab');
    if (tab) tab.click();
    document.getElementById('portal-access')?.scrollIntoView({ behavior:'smooth', block:'start' });
  }

  return { identity, status, open, goToLogin };
})();
