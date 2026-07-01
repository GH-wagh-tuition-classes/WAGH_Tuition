const WTC_UI = (() => {
  function toast(message, type = 'success') {
    let box = document.getElementById('wtcToastBox');
    if (!box) {
      box = document.createElement('div');
      box.id = 'wtcToastBox';
      box.className = 'toast-box';
      document.body.appendChild(box);
    }
    const item = document.createElement('div');
    item.className = `toast ${type}`;
    item.textContent = message;
    box.appendChild(item);
    setTimeout(() => item.remove(), 3200);
  }
  function setLoading(target, isLoading, text = 'Loading...') {
    const el = typeof target === 'string' ? document.querySelector(target) : target;
    if (!el) return;
    if (isLoading) {
      el.dataset.oldText = el.textContent;
      el.textContent = text;
      el.disabled = true;
    } else {
      el.textContent = el.dataset.oldText || el.textContent;
      el.disabled = false;
    }
  }
  function initials(name = 'User') {
    return String(name).trim().split(/\s+/).slice(0, 2).map(x => x[0]).join('').toUpperCase() || 'U';
  }
  return { toast, setLoading, initials };
})();
