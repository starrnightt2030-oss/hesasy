/* حصصي — الأساسيات: الأيقونات، الصوت، التنبيهات، الشيتات، الحماية، التنقل */
'use strict';
const E = window.Engine;
const App = window.App = {
  st: null, C: null, sec: null, unlocked: false, revealed: false, ui: {}, hiddenAt: 0,
  version: '1.2.0'
};
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmt = n => Math.round(+n || 0).toLocaleString('en-US');
const shown = () => App.revealed || !App.st.settings.privacy.hide;
const money = n => shown() ? fmt(n) + ' ج' : '•••• ج';
const moneyN = n => shown() ? fmt(n) : '••••';
const pct = (a, b) => b ? Math.max(0, Math.min(100, Math.round(a / b * 100))) : 0;
const gradeOf = subjectId => (E.SUBJ[subjectId] || {}).grade || 1;
const initial = name => (String(name || '؟').trim().replace(/^(ال)/, '') || '؟').charAt(0);
const nowHM = () => { const d = new Date(); return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); };
const minutesUntil = (date, time) => { const [y, m, d] = date.split('-').map(Number); const [h, mi] = time.split(':').map(Number); return Math.round((new Date(y, m - 1, d, h, mi) - new Date()) / 60000); };

/* ---------- الأيقونات ---------- */
const I = {
  home: '<path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
  cal: '<path d="M8 2v4M16 2v4M3 9h18M5 4h14a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z"/>',
  calPlus: '<path d="M8 2v4M16 2v4M3 9h18M5 4h14a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2zM12 12v6M9 15h6"/>',
  users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
  user: '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
  wallet: '<path d="M20 7H5a2 2 0 0 1 0-4h14v4M3 5v14a2 2 0 0 0 2 2h15V7M16 14h.01"/>',
  box: '<path d="M21 8 12 3 3 8v8l9 5 9-5zM3 8l9 5 9-5M12 13v8"/>',
  bell: '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>',
  back: '<path d="m9 18 6-6-6-6"/>',
  chev: '<path d="m15 18-6-6 6-6"/>',
  chevDown: '<path d="m6 9 6 6 6-6"/>',
  chevUp: '<path d="m18 15-6-6-6 6"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  minus: '<path d="M5 12h14"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  x: '<path d="M18 6 6 18M6 6l12 12"/>',
  clock: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
  xCircle: '<circle cx="12" cy="12" r="10"/><path d="m15 9-6 6M9 9l6 6"/>',
  print: '<path d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2M6 14h12v8H6z"/>',
  eye: '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>',
  eyeOff: '<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24M1 1l22 22"/>',
  alert: '<path d="M12 9v4M12 17h.01"/><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/>',
  info: '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>',
  phone: '<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z"/>',
  chat: '<path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>',
  edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z"/>',
  trash: '<path d="M3 6h18M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6M10 11v6M14 11v6M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>',
  lock: '<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
  finger: '<path d="M12 10a2 2 0 0 0-2 2c0 1.02-.1 2.51-.26 4M14 13.12c0 2.38 0 6.38-1 8.88M17.29 21.02c.12-.6.43-2.3.5-3.02M2 12a10 10 0 0 1 18-6M2 16h.01M21.8 16c.2-2 .131-5.354 0-6M5 19.5C5.5 18 6 15 6 12a6 6 0 0 1 .34-2M8.65 22c.21-.66.45-1.32.57-2M9 6.8a6 6 0 0 1 9 5.2v2"/>',
  download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>',
  upload: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/>',
  share: '<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.59 13.51 6.83 3.98M15.41 6.51l-6.82 3.98"/>',
  folder: '<path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>',
  refresh: '<path d="M23 4v6h-6M1 20v-6h6"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>',
  chart: '<path d="M3 3v18h18M7 16l4-4 4 4 5-6"/>',
  search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>',
  bolt: '<path d="M13 2 4 14h7l-1 8 9-12h-7l1-8z"/>',
  book: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V3H6.5A2.5 2.5 0 0 0 4 5.5zM4 19.5A2.5 2.5 0 0 0 6.5 22H20v-5"/>',
  cap: '<path d="M22 10 12 5 2 10l10 5 10-5zM6 12v5c3 2 9 2 12 0v-5"/>',
  bulb: '<path d="M9 18h6M10 22h4M12 2a7 7 0 0 0-4 12.7V17h8v-2.3A7 7 0 0 0 12 2z"/>',
  plug: '<path d="M12 22v-5M9 8V2M15 8V2M18 8v5a6 6 0 0 1-12 0V8z"/>',
  gearSm: '<circle cx="12" cy="12" r="3"/><path d="M12 1v3M12 20v3M4.22 4.22l2.12 2.12M17.66 17.66l2.12 2.12M1 12h3M20 12h3M4.22 19.78l2.12-2.12M17.66 6.34l2.12-2.12"/>',
  star: '<path d="m12 2 3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01z"/>',
  cpu: '<rect x="4" y="4" width="16" height="16" rx="2"/><rect x="9" y="9" width="6" height="6"/><path d="M9 1v3M15 1v3M9 20v3M15 20v3M20 9h3M20 14h3M1 9h3M1 14h3"/>',
  wrench: '<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94z"/>',
  monitor: '<rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/>',
  image: '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/>',
  pen: '<path d="M12 19l7-7 3 3-7 7zM18 13l-1.5-7.5L2 2l3.5 14.5L13 18zM2 2l7.59 7.59"/>',
  logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>',
  layers: '<path d="m12 2 10 5-10 5L2 7zM2 17l10 5 10-5M2 12l10 5 10-5"/>',
  undo: '<path d="M3 7v6h6"/><path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13"/>',
  sound: '<path d="M11 5 6 9H2v6h4l5 4zM19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/>',
  shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
  key: '<path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.78 7.78 5.5 5.5 0 0 1 7.78-7.78zm0 0L15.5 7.5m0 0 3 3L22 7l-3-3m-3.5 3.5L19 4"/>',
  sun: '<circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>'
};
const ic = (name, size = 22, sw = 2, cls = '') => `<svg class="${cls}" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${I[name] || ''}</svg>`;
const APP_ICONS = ['bolt', 'plug', 'bulb', 'book', 'cap', 'wallet', 'cpu', 'wrench', 'gearSm', 'star', 'cal', 'users'];
const ACCENTS = ['#E8962E', '#2BB673', '#4C8DFF', '#9B6BFF', '#E5484D', '#14B8A6'];

/* ---------- الصوت والاهتزاز ---------- */
const Sound = {
  ctx: null,
  ensure() {
    try {
      if (!this.ctx) this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      if (this.ctx.state === 'suspended') this.ctx.resume();
    } catch (e) {}
    return this.ctx;
  },
  tone(freq, at, dur, type, gain) {
    const c = this.ctx; if (!c) return;
    const o = c.createOscillator(), g = c.createGain();
    o.type = type || 'sine'; o.frequency.value = freq;
    const t = c.currentTime + at;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain || 0.25, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(c.destination);
    o.start(t); o.stop(t + dur + 0.05);
  },
  play(kind, force) {
    if (!force && App.st && !App.st.settings.reminders.sound) return;
    if (!this.ensure()) return;
    if (kind === 'chime') { this.tone(880, 0, .5, 'sine', .25); this.tone(1318.5, .18, .7, 'sine', .22); this.tone(1760, .36, .9, 'sine', .14); vib([60, 40, 60]); }
    else if (kind === 'alert') { [0, .22, .44].forEach(t => { this.tone(740, t, .16, 'square', .09); this.tone(988, t + .08, .12, 'square', .07); }); this.tone(587, .7, .5, 'triangle', .2); vib([200, 100, 200, 100, 300]); }
    else if (kind === 'ok') { this.tone(1046.5, 0, .18, 'sine', .18); this.tone(1568, .08, .25, 'sine', .14); vib(25); }
    else if (kind === 'err') { this.tone(220, 0, .25, 'sawtooth', .08); vib([80, 50, 80]); }
    else if (kind === 'tap') { this.tone(1200, 0, .05, 'sine', .05); }
  }
};
function vib(p) { try { if (navigator.vibrate) navigator.vibrate(p); } catch (e) {} }
document.addEventListener('pointerdown', () => Sound.ensure(), { once: false, passive: true });

/* ---------- التوست ---------- */
function toast(msg, opt = {}) {
  const wrap = $('.toast-wrap') || document.body.appendChild(Object.assign(document.createElement('div'), { className: 'toast-wrap' }));
  const type = opt.type || 'ok';
  const el = document.createElement('div');
  el.className = 'toast ' + type;
  el.setAttribute('role', 'status');
  el.innerHTML = `<span class="ti">${ic(opt.icon || (type === 'ok' ? 'check' : type === 'err' ? 'x' : 'bell'), 18, 2.4)}</span><span class="grow">${msg}</span>${opt.action ? `<button class="act">${esc(opt.action)}</button>` : ''}`;
  wrap.appendChild(el);
  if (opt.action) el.querySelector('.act').onclick = () => { el.remove(); opt.onAction && opt.onAction(); };
  if (opt.sound) Sound.play(opt.sound);
  setTimeout(() => { el.style.transition = 'opacity .3s, transform .3s'; el.style.opacity = '0'; el.style.transform = 'translateY(-10px)'; setTimeout(() => el.remove(), 320); }, opt.ms || 3200);
}

/* ---------- الشيت ---------- */
function sheet(html, opt = {}) {
  const ov = document.createElement('div');
  ov.className = 'overlay' + (opt.center ? ' center' : '');
  ov.innerHTML = `<div class="sheet" role="dialog" aria-modal="true">${opt.center ? '' : '<div class="grab"></div>'}${html}</div>`;
  const close = (v) => { if (!ov.isConnected) return; ov.remove(); opt.onClose && opt.onClose(v); };
  ov.addEventListener('click', e => { if (e.target === ov && !opt.sticky) close(); if (e.target.closest('[data-close]')) close(); });
  document.body.appendChild(ov);
  const f = ov.querySelector('[autofocus]'); if (f) setTimeout(() => f.focus(), 250);
  return { el: ov.querySelector('.sheet'), close, ov };
}
function confirmBox(o) {
  return new Promise(res => {
    const s = sheet(`
      ${o.icon ? `<div class="alarm-ic ${o.danger ? '' : 'amber'}" style="animation:none">${ic(o.icon, 38)}</div>` : ''}
      <h2 style="text-align:center">${esc(o.title)}</h2>
      ${o.text ? `<div class="banner ${o.danger ? 'red' : 'amber'}">${ic('info', 18)}<span>${o.text}</span></div>` : ''}
      <div class="grid2"><button class="btn ghost" data-r="0">${esc(o.cancel || 'رجوع')}</button><button class="btn ${o.danger ? 'danger' : ''}" data-r="1">${esc(o.ok || 'تأكيد')}</button></div>`,
      { center: true, onClose: v => res(!!v) });
    s.el.addEventListener('click', e => { const b = e.target.closest('[data-r]'); if (b) s.close(b.dataset.r === '1'); });
  });
}

/* ---------- الحماية: الباسورد والبصمة ---------- */
function pinPad(id) {
  return `<div class="pin-dots" id="${id}-dots">${'<span></span>'.repeat(6)}</div>
  <div class="keypad" id="${id}-pad">${[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => `<button type="button" data-k="${n}">${n}</button>`).join('')}
  <button type="button" class="ghost" data-k="bio" aria-label="البصمة">${ic('finger', 28)}</button><button type="button" data-k="0">0</button>
  <button type="button" class="ghost" data-k="del" aria-label="مسح">${ic('chev', 26)}</button></div>`;
}
function wirePad(root, id, len, onDone, onBio) {
  let v = '';
  const dots = $('#' + id + '-dots', root);
  const draw = () => dots.querySelectorAll('span').forEach((s, i) => { s.classList.toggle('on', i < v.length); s.style.display = i < len ? '' : 'none'; });
  draw();
  $('#' + id + '-pad', root).addEventListener('click', async e => {
    const b = e.target.closest('[data-k]'); if (!b) return;
    const k = b.dataset.k;
    Sound.play('tap');
    if (k === 'del') v = v.slice(0, -1);
    else if (k === 'bio') { onBio && onBio(); return; }
    else if (v.length < len) v += k;
    draw();
    if (v.length === len) {
      const ok = await onDone(v);
      if (ok === false) { dots.classList.add('shake'); Sound.play('err'); vib(120); setTimeout(() => { dots.classList.remove('shake'); v = ''; draw(); }, 550); }
    }
  });
  return { reset() { v = ''; draw(); } };
}
/* تأكيد الهوية بالباسورد أو البصمة (لعرض الأرصدة والطباعة) */
function askPin(title, sub) {
  return new Promise(async res => {
    const sec = await Security.get();
    if (!sec.pin) return res(true);
    let done = false;
    const s = sheet(`<h2 style="text-align:center">${esc(title || 'أدخل الباسورد')}</h2>
      ${sub ? `<div class="muted sm" style="text-align:center;margin-top:-8px">${esc(sub)}</div>` : ''}
      <div class="err" id="ap-err" style="color:var(--red);text-align:center;min-height:20px;font-weight:600;font-size:14px"></div>
      ${pinPad('ap')}`, { center: true, onClose: () => { if (!done) res(false); } });
    const finish = () => { done = true; s.close(); Sound.play('ok'); res(true); };
    const bio = async () => { try { if (await Security.bioVerify()) finish(); } catch (e) { $('#ap-err', s.el).textContent = 'البصمة ما اشتغلتش، استخدم الباسورد'; } };
    if (!sec.bio) { const b = $('[data-k="bio"]', s.el); b.style.visibility = 'hidden'; }
    wirePad(s.el, 'ap', sec.pin.len || 4, async v => {
      if (await Security.checkPin(v)) { finish(); return true; }
      $('#ap-err', s.el).textContent = 'الباسورد غلط'; return false;
    }, bio);
    if (sec.bio) bio();
  });
}
function askAdmin(title, opt = {}) {
  return new Promise(res => {
    let done = false;
    const s = sheet(`
      <div class="alarm-ic" style="animation:none">${ic('shield', 38)}</div>
      <h2 style="text-align:center">${esc(title)}</h2>
      ${opt.text ? `<div class="banner red">${ic('alert', 18)}<span>${opt.text}</span></div>` : ''}
      <label class="field">باسورد الأدمن<input class="input" type="password" id="adm-pw" autocomplete="off" autofocus></label>
      ${opt.phrase ? `<label class="field">اكتب جملة التأكيد: <b style="color:var(--red)">${esc(opt.phrase)}</b><input class="input" id="adm-ph" autocomplete="off"></label>` : ''}
      ${opt.extra || ''}
      <div class="err" id="adm-err" style="color:var(--red);font-weight:600;font-size:14px;min-height:20px"></div>
      <div class="grid2"><button class="btn ghost" data-close>رجوع</button><button class="btn ${opt.danger ? 'danger' : ''}" id="adm-ok">${esc(opt.ok || 'تأكيد')}</button></div>`,
      { center: true, onClose: () => { if (!done) res(false); } });
    $('#adm-ok', s.el).onclick = async () => {
      const pw = $('#adm-pw', s.el).value;
      if (opt.phrase && $('#adm-ph', s.el).value.trim() !== opt.phrase) { $('#adm-err', s.el).textContent = 'جملة التأكيد مش مطابقة'; Sound.play('err'); s.el.classList.add('shake'); setTimeout(() => s.el.classList.remove('shake'), 600); return; }
      if (!(await Security.checkAdmin(pw))) { $('#adm-err', s.el).textContent = 'باسورد الأدمن غلط'; Sound.play('err'); s.el.classList.add('shake'); setTimeout(() => s.el.classList.remove('shake'), 600); return; }
      const extra = {}; $$('[data-extra]', s.el).forEach(x => extra[x.dataset.extra] = x.type === 'checkbox' ? x.checked : x.value);
      done = true; s.close(); res(opt.extra ? extra : true);
    };
  });
}
async function reveal() {
  if (shown()) { App.revealed = false; render(); return; }
  if (await askPin('عرض الأرصدة', 'الأرصدة هتتخفي تاني لما تقفل التطبيق')) { App.revealed = true; render(); }
}
async function needReveal() {
  if (shown()) return true;
  if (await askPin('تأكيد الهوية', 'لازم تأكيد قبل عرض أو طباعة الحسابات')) { App.revealed = true; render(); return true; }
  return false;
}

/* ---------- حفظ التعديلات ---------- */
function recompute() { App.C = E.computeAll(App.st); }
function commit(fn, msg, opt = {}) {
  fn(App.st);
  recompute();
  Store.save(App.st);
  if (!opt.noRender) render();
  if (msg) toast(msg, { sound: opt.sound === undefined ? 'ok' : opt.sound, type: opt.type || 'ok' });
}

/* ---------- التنقل ---------- */
const TABS = [
  { r: 'home', label: 'الرئيسية', icon: 'home' },
  { r: 'schedule', label: 'الجدول', icon: 'cal' },
  { r: 'students', label: 'الطلاب', icon: 'users' },
  { r: 'dues', label: 'التحصيل', icon: 'wallet' },
  { r: 'project', label: 'المشروع', icon: 'box' }
];
const TAB_OF = { student: 'students', 'student-new': 'students', 'student-edit': 'students', session: 'schedule', groups: 'schedule' };
function route() {
  const h = decodeURIComponent(location.hash.replace(/^#\/?/, '')) || 'home';
  const i = h.indexOf('/');
  return i < 0 ? { name: h, arg: '' } : { name: h.slice(0, i), arg: h.slice(i + 1) };
}
const go = (name, arg) => { location.hash = '#/' + name + (arg != null && arg !== '' ? '/' + encodeURIComponent(arg) : ''); };
let lastRoute = '';
function render() {
  if (!App.unlocked) return;
  const r = route();
  if (r.name === 'exit-guard') {
    // زرار الرجوع في الموبايل وهو على الرئيسية: لازم يتداس مرتين علشان التطبيق يتقفل
    if (Date.now() - (App.ui.exitAt || 0) < 2500) { history.back(); return; }
    App.ui.exitAt = Date.now();
    toast('اضغط رجوع تاني للخروج من التطبيق', { type: 'warn', icon: 'logout', ms: 2500 });
    history.pushState(null, '', '#/home');
    return render();
  }
  const V = window.Views[r.name] ? r.name : 'home';
  const key = V + '/' + r.arg;
  const sameRoute = key === lastRoute;
  const y = window.scrollY;
  let html;
  try { html = window.Views[V](r.arg); } catch (e) { console.error(e); html = `<div class="pad"><div class="banner red">${ic('alert', 18)}<span>حصلت مشكلة في عرض الصفحة: ${esc(e.message)}</span></div><a class="btn" href="#/home">الرئيسية</a></div>`; }
  const view = $('#view');
  view.innerHTML = html;
  const tab = TAB_OF[V] || V;
  const isTab = TABS.some(t => t.r === V);
  view.classList.toggle('no-tabs', !isTab);
  $('#tabbar').hidden = !isTab;
  $$('#tabbar a').forEach(a => a.classList.toggle('on', a.dataset.r === tab));
  if (sameRoute) window.scrollTo(0, y); else window.scrollTo(0, 0);
  lastRoute = key;
  const after = window.Views[V + '_after']; if (after) after(r.arg);
  document.title = App.st.settings.appName;
}
window.addEventListener('hashchange', () => { $$('.overlay').forEach(o => o.remove()); render(); });

/* ---------- تفويض الأحداث ---------- */
const ACT = window.ACT = {};
document.addEventListener('click', e => {
  const el = e.target.closest('[data-act]');
  if (!el || el.closest('.overlay') && !el.closest('.overlay').contains(el)) return;
  const fn = ACT[el.dataset.act];
  if (fn) { e.preventDefault(); fn(el, e); }
});
document.addEventListener('input', e => { const el = e.target.closest('[data-input]'); if (el && ACT[el.dataset.input]) ACT[el.dataset.input](el, e); });
document.addEventListener('change', e => { const el = e.target.closest('[data-change]'); if (el && ACT[el.dataset.change]) ACT[el.dataset.change](el, e); });

/* ---------- مساعدات العرض ---------- */
const backBtn = (to) => `<a class="icon-btn light" href="${to || 'javascript:history.back()'}" ${to ? '' : 'data-act="back"'} aria-label="رجوع">${ic('back')}</a>`;
ACT.back = () => { if (history.length > 1) history.back(); else go('home'); };
const eyeBtn = (light) => App.st.settings.privacy.hide ? `<button class="icon-btn ${light ? 'light' : ''}" data-act="reveal" aria-label="${shown() ? 'إخفاء الأرصدة' : 'عرض الأرصدة'}">${ic(shown() ? 'eyeOff' : 'eye', 20)}</button>` : '';
ACT.reveal = () => reveal();
function brandIcon(size) {
  const s = App.st.settings;
  if (s.iconData) return `<span class="brand-icon" style="${size ? `width:${size}px;height:${size}px` : ''}"><img src="${s.iconData}" alt=""></span>`;
  return `<span class="brand-icon" style="background:${s.accent};${size ? `width:${size}px;height:${size}px;border-radius:${Math.round(size * .3)}px` : ''}">${ic(s.iconId || 'bolt', size ? size * .5 : 24, 2.2)}</span>`;
}
const gradeChip = g => `<span class="chip g${g}">${E.GRADES[g]}</span>`;
const subjName = id => (E.SUBJ[id] || {}).name || '—';
function groupName(gid) { const g = E.groupById(App.st, gid); return g ? subjName(g.subjectId) + ' · ' + E.groupLabel(App.st, g) : 'مجموعة محذوفة'; }
function studentById(id) { return App.st.students.find(s => s.id === id); }
function waLink(phone, text) {
  let p = String(phone || '').replace(/\D/g, '');
  if (p.startsWith('0')) p = '20' + p.slice(1);
  return 'https://wa.me/' + p + '?text=' + encodeURIComponent(text);
}
