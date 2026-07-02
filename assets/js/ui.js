const WTC_UI = (() => {
  function toast(message, type = 'success') {
    let box = document.getElementById('wtcToastBox');
    if (!box) {
      box = document.createElement('div');
      box.id = 'wtcToastBox';
      box.className = 'toast-box';
      document.body.appendChild(box);
    }
    const t = document.createElement('div');
    t.className = `toast ${type}`;
    t.textContent = message;
    box.appendChild(t);
    setTimeout(() => t.remove(), 3200);
  }
  function initials(name = 'User') {
    return String(name).trim().split(/\s+/).slice(0, 2).map(x => x[0] || '').join('').toUpperCase() || 'U';
  }
  function escape(v = '') {
    return String(v).replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[m]));
  }
  function loadingHTML(text = 'Loading...') {
    return `<div class="empty-state">${escape(text)}</div>`;
  }
  return { toast, initials, escape, loadingHTML };
})();
