const WTC_API = (() => {
  async function call(payload) {
    if (!WTC_CONFIG.API_URL || WTC_CONFIG.API_URL.includes('PASTE')) {
      throw new Error('Apps Script API URL is not set in assets/js/config.js');
    }
    const res = await fetch(WTC_CONFIG.API_URL, { method: 'POST', body: JSON.stringify(payload) });
    return await res.json();
  }
  async function fallback() {
    const res = await fetch(WTC_CONFIG.FALLBACK_CONTENT_URL);
    return await res.json();
  }
  async function safeCall(payload, fallbackKey = null) {
    try {
      const data = await call(payload);
      if (data && data.success !== false) return data;
      throw new Error(data.message || 'API failed');
    } catch (e) {
      console.warn('API fallback:', e.message);
      if (!fallbackKey) throw e;
      const data = await fallback();
      return { success: true, [fallbackKey]: data[fallbackKey] || [] };
    }
  }
  return {
    call,
    login: (mobile, password) => call({ action: 'login', mobile, password, deviceId: WTC_AUTH.deviceId() }),
    signupStudent: (student) => call({ action: 'signupStudent', ...student, deviceId: WTC_AUTH.deviceId() }),
    updateProfile: (profile) => call({ action: 'updateStudentProfile', ...profile, deviceId: WTC_AUTH.deviceId() }),
    getSubjects: (student) => safeCall({ action: 'getSubjects', ...student }, 'subjects'),
    getChapters: (params) => safeCall({ action: 'getChapters', ...params }, 'chapters'),
    getFeatures: (params) => safeCall({ action: 'getChapterFeatures', ...params }, 'features'),
    getProgress: (studentId) => safeCall({ action: 'getStudentProgress', studentId }, 'progress'),
    logAccess: (data) => call({ action: 'logAccess', ...data, deviceId: WTC_AUTH.deviceId() })
  };
})();
