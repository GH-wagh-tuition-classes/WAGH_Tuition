/* ============================================================================
   WAGH Tuition Classes — Project Date & Time Standard
   Canonical zone: Asia/Kolkata (Tapi, Gujarat, India / IST / UTC+05:30)
   Use Date.now() only for elapsed durations, cache ages and opaque IDs.
============================================================================ */
window.WTC_TIME = (() => {
  const TIME_ZONE = 'Asia/Kolkata';
  const OFFSET = '+05:30';
  const LOCALE = 'en-IN';
  const LABEL = 'India Standard Time (IST)';

  const partFormatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: TIME_ZONE,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hourCycle: 'h23'
  });

  function parts(value = Date.now()) {
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    const result = {};
    partFormatter.formatToParts(date).forEach(part => {
      if (part.type !== 'literal') result[part.type] = part.value;
    });
    return result;
  }

  function todayKey(value = Date.now()) {
    const p = parts(value);
    return p ? `${p.year}-${p.month}-${p.day}` : '';
  }

  function nowStamp(value = Date.now()) {
    const p = parts(value);
    return p ? `${p.year}-${p.month}-${p.day} ${p.hour}:${p.minute}:${p.second}` : '';
  }

  function zonedIso(value = Date.now()) {
    const p = parts(value);
    return p ? `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}:${p.second}${OFFSET}` : '';
  }

  function parse(value, endOfDay = false) {
    if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
    if (typeof value === 'number') {
      const date = new Date(value);
      return Number.isNaN(date.getTime()) ? null : date;
    }
    const text = String(value || '').trim();
    if (!text) return null;
    let raw = text;
    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) raw += endOfDay ? 'T23:59:59.999+05:30' : 'T00:00:00+05:30';
    else {
      raw = raw.replace(' ', 'T');
      if (!/[zZ]|[+\-]\d{2}:?\d{2}$/.test(raw)) raw += OFFSET;
    }
    const date = new Date(raw);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  function dateKey(value) {
    if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value.trim())) return value.trim();
    const date = parse(value);
    return date ? todayKey(date) : '';
  }

  function formatDate(value, fallback = '—') {
    const date = parse(value);
    return date ? new Intl.DateTimeFormat(LOCALE, {
      timeZone: TIME_ZONE, day: '2-digit', month: 'short', year: 'numeric'
    }).format(date) : (value ? String(value) : fallback);
  }

  function formatDateTime(value, options = {}) {
    const date = parse(value);
    if (!date) return value ? String(value) : (options.fallback || '—');
    return new Intl.DateTimeFormat(LOCALE, {
      timeZone: TIME_ZONE,
      day: '2-digit', month: 'short', year: options.hideYear ? undefined : 'numeric',
      hour: '2-digit', minute: '2-digit', second: options.seconds ? '2-digit' : undefined,
      hour12: true
    }).format(date);
  }

  function formatTime(value, fallback = '—') {
    const date = parse(value);
    return date ? new Intl.DateTimeFormat(LOCALE, {
      timeZone: TIME_ZONE, hour: '2-digit', minute: '2-digit', hour12: true
    }).format(date) : (value ? String(value) : fallback);
  }

  function addDays(value, days) {
    const key = dateKey(value) || todayKey();
    const date = parse(key);
    return date ? todayKey(date.getTime() + Number(days || 0) * 86400000) : '';
  }

  function daysBetween(fromKey, toKey) {
    const from = parse(dateKey(fromKey));
    const to = parse(dateKey(toKey));
    if (!from || !to) return 0;
    return Math.floor((to.getTime() - from.getTime()) / 86400000);
  }

  function year(value = Date.now()) {
    return parts(value)?.year || String(new Date(Date.now() + 19800000).getUTCFullYear());
  }

  function stampForDisplay(value = Date.now()) {
    return `${formatDateTime(value)} IST`;
  }

  return Object.freeze({
    TIME_ZONE, OFFSET, LOCALE, LABEL,
    parts, todayKey, dateKey, nowStamp, zonedIso, parse,
    formatDate, formatDateTime, formatTime, addDays, daysBetween,
    year, stampForDisplay
  });
})();
