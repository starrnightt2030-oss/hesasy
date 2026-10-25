/* حصصي — التشغيل: القفل، أول تشغيل، التنبيهات، النسخ اليومي، الهوية */
'use strict';

function migrate(s) {
  const d = E.defaultState();
  if (!s || typeof s !== 'object') return d;
  const out = Object.assign({}, d, s);
  out.settings = Object.assign({}, d.settings, s.settings || {});
  ['prices', 'reminders', 'privacy', 'backup'].forEach(k => { out.settings[k] = Object.assign({}, d.settings[k], (s.settings || {})[k] || {}); });
  if (!Array.isArray(out.settings.terms) || !out.settings.terms.length) out.settings.terms = d.settings.terms;
  if (!Array.isArray(out.settings.holidays)) out.settings.holidays = [];
  ['groups', 'students', 'makeups', 'payments', 'projectItems'].forEach(k => { if (!Array.isArray(out[k])) out[k] = []; });
  ['overrides', 'attendance', 'projectPays'].forEach(k => { if (!out[k] || typeof out[k] !== 'object') out[k] = {}; });
  out.students.forEach(st => { st.enrollments = st.enrollments || []; st.enrollments.forEach(e => { if (!e.groupHist) e.groupHist = [{ from: e.startDate, groupId: e.groupId }]; }); });
  out.groups.forEach(g => { if (!g.schedule) g.schedule = [{ from: '2000-01-01', day: g.day, time: g.time }]; });
  return out;
}
window.migrate = migrate;

/* ---------- الهوية: الاسم والأيقونة ---------- */
function iconPng(size) {
  const s = App.st.settings;
  return new Promise(res => {
    const c = document.createElement('canvas'); c.width = c.height = size;
    const x = c.getContext('2d');
    const img = new Image();
    img.onload = () => { x.drawImage(img, 0, 0, size, size); try { res(c.toDataURL('image/png')); } catch (e) { res(null); } };
    img.onerror = () => res(null);
    if (s.iconData) img.src = s.iconData;
    else img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24"><rect width="24" height="24" fill="${s.accent}"/><g transform="translate(5.5 5.5) scale(.54)" fill="none" stroke="#10213A" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round">${I[s.iconId] || I.bolt}</g></svg>`);
  });
}
let manifestUrl = null;
async function applyIdentity() {
  const s = App.st.settings;
  document.title = s.appName;
  const meta = $('meta[name="apple-mobile-web-app-title"]'); if (meta) meta.content = s.appName;
  const custom = s.appName !== 'حصصي' || s.iconId !== 'bolt' || s.iconData || s.accent !== '#E8962E';
  if (!custom) return;
  const [p512, p192] = await Promise.all([iconPng(512), iconPng(192)]);
  if (!p512) return;
  $$('link[rel="icon"], link[rel="apple-touch-icon"]').forEach(l => { l.href = l.rel === 'icon' ? p192 : p512; });
  const base = new URL('./', location.href).href;
  const m = { name: s.appName, short_name: s.appName, start_url: base + 'index.html', scope: base, id: base + '?app=hesasy', display: 'standalone', orientation: 'portrait', dir: 'rtl', lang: 'ar', background_color: '#10213A', theme_color: '#10213A',
    icons: [{ src: p192, sizes: '192x192', type: 'image/png', purpose: 'any' }, { src: p512, sizes: '512x512', type: 'image/png', purpose: 'any' }, { src: p512, sizes: '512x512', type: 'image/png', purpose: 'maskable' }] };
  if (manifestUrl) URL.revokeObjectURL(manifestUrl);
  manifestUrl = URL.createObjectURL(new Blob([JSON.stringify(m)], { type: 'application/manifest+json' }));
  const l = $('link[rel="manifest"]'); if (l) l.href = manifestUrl;
}
window.applyIdentity = applyIdentity;

/* ---------- باسورد جديد (مرتين للتأكيد) ---------- */
function newPinFlow(title) {
  return new Promise(res => {
    let len = 4, first = null, done = false;
    const s = sheet(`<h2 id="np-t" style="text-align:center">${esc(title)}</h2>
      <div class="seg" id="np-len" style="align-self:center;width:220px"><button class="on" data-l="4">٤ أرقام</button><button data-l="6">٦ أرقام</button></div>
      <div id="np-e" style="color:var(--red);text-align:center;font-weight:600;font-size:14px;min-height:20px"></div><div id="np-wrap" style="display:flex;flex-direction:column;gap:18px;align-items:center"></div>`,
      { center: true, sticky: true, onClose: () => { if (!done) res(null); } });
    const mount = () => {
      $('#np-wrap', s.el).innerHTML = pinPad('np') + '<button class="btn ghost sm" data-close>إلغاء</button>';
      $('[data-k="bio"]', s.el).style.visibility = 'hidden';
      wirePad(s.el, 'np', len, async v => {
        if (!first) { first = v; $('#np-t', s.el).textContent = 'اكتب الباسورد تاني للتأكيد'; $('#np-len', s.el).hidden = true; $('#np-e', s.el).textContent = ''; mount(); return true; }
        if (v === first) { done = true; s.close(); res(v); return true; }
        first = null; $('#np-t', s.el).textContent = title; $('#np-len', s.el).hidden = false; $('#np-e', s.el).textContent = 'الباسورد مش متطابق، جرب تاني';
        setTimeout(mount, 560); return false;
      });
    };
    $('#np-len', s.el).onclick = e => { const b = e.target.closest('button'); if (!b) return; len = +b.dataset.l; $$('#np-len button', s.el).forEach(x => x.classList.toggle('on', x === b)); mount(); };
    mount();
  });
}
window.newPinFlow = newPinFlow;

/* ---------- أول تشغيل ---------- */
function showOnboarding() {
  const root = $('#lock-root');
  root.innerHTML = `<div class="lock" style="justify-content:flex-start;padding-top:calc(60px + var(--safe-t));overflow-y:auto">
    ${brandIcon(76)}
    <h1 style="text-align:center">أهلًا بيك في ${esc(App.st.settings.appName)}</h1>
    <div style="max-width:360px;display:flex;flex-direction:column;gap:12px;font-size:15px;color:var(--on-ink-muted)">
      ${[['cal', 'الحصص بتتولد كل أسبوع لوحدها حسب مواعيد المجموعات'], ['wallet', 'حساب الشهور والعروض والمتأخرات أوتوماتيك'], ['bell', 'تنبيهات بالصوت للحصص والمتأخرات'], ['lock', 'باسورد وبصمة وإخفاء للأرصدة'], ['layers', 'نسخة احتياطية كل يوم تلقائي']].map(([i, t]) => `<div class="row" style="gap:12px"><span class="icon-btn" style="width:40px;height:40px">${ic(i, 20)}</span><span>${t}</span></div>`).join('')}
    </div>
    <div class="banner amber" style="max-width:360px">${ic('info', 18)}<span>هنعمل دلوقتي <b>باسورد للتطبيق</b> (أرقام لفتح التطبيق وعرض الأرصدة) و<b>باسورد أدمن</b> (للتصفير والاسترجاع). احفظهم كويس.</span></div>
    <button class="btn accent lg" id="ob-go" style="width:100%;max-width:360px">ابدأ الإعداد</button>
    <button class="btn lg" id="ob-restore" style="width:100%;max-width:360px;background:rgba(255,255,255,.1)">${ic('upload', 20)} عندي نسخة احتياطية — استرجعها</button>
  </div>`;
  $('#ob-restore').onclick = async () => {
    const f = await pickFile();
    if (!f) return;
    let j;
    try { j = await Backup.readFile(f); } catch (e) { return toast(e.message || 'الملف مش سليم', { type: 'err', sound: 'err', ms: 5000 }); }
    if (!(await confirmRestore(j.data, j.at, 'استرجاع: ' + f.name, false))) return;
    await applyRestore(j.data);
    const n = (j.data.students || []).length;
    toast(`البيانات رجعت: ${n} طالب — اعمل الباسوردات علشان تكمل`, { sound: 'ok', ms: 5000 });
    showOnboarding();
  };
  $('#ob-go').onclick = async () => {
    const pin = await newPinFlow('اختار باسورد التطبيق');
    if (!pin) return;
    const admin = await new Promise(res => {
      const s = sheet(`<div class="alarm-ic" style="animation:none">${ic('shield', 38)}</div><h2 style="text-align:center">باسورد الأدمن</h2>
        <div class="sm muted" style="text-align:center">مختلف عن باسورد التطبيق. بيتطلب لتصفير البرنامج واسترجاع النسخ والحذف النهائي.</div>
        <label class="field">الباسورد<input class="input" type="password" id="ad1" autofocus></label>
        <label class="field">تأكيد الباسورد<input class="input" type="password" id="ad2"></label>
        <div id="ad-e" style="color:var(--red);font-weight:600;min-height:20px;font-size:14px"></div>
        <button class="btn lg" id="ad-ok">التالي</button>`, { center: true, sticky: true });
      $('#ad-ok', s.el).onclick = () => {
        const a = $('#ad1', s.el).value, b = $('#ad2', s.el).value;
        if (a.length < 4) return $('#ad-e', s.el).textContent = '٤ حروف أو أرقام على الأقل';
        if (a !== b) return $('#ad-e', s.el).textContent = 'الباسورد مش متطابق';
        if (a === pin) return $('#ad-e', s.el).textContent = 'خليه مختلف عن باسورد التطبيق';
        s.close(); res(a);
      };
    });
    await Security.setPin(pin);
    await Security.setAdmin(admin);
    const sec = await Security.get(); sec.lock = true; await Security.set(sec);
    if (await Security.bioAvailable()) {
      const want = await confirmBox({ title: 'تفتح بالبصمة؟', text: 'تقدر تفتح التطبيق وتعرض الأرصدة ببصمة الموبايل بدل ما تكتب الباسورد كل مرة.', ok: 'فعّل البصمة', cancel: 'بعدين', icon: 'finger' });
      if (want) { try { await Security.bioRegister(App.st.settings.appName); toast('البصمة اتفعلت'); } catch (e) { toast('البصمة ما اتفعلتش — تقدر تفعلها من الإعدادات', { type: 'warn' }); } }
    }
    App.sec = await Security.get();
    unlock();
  };
}

/* ---------- شاشة القفل ---------- */
let attempts = 0, lockUntil = 0;
function lockApp() {
  App.unlocked = false; App.revealed = false;
  $$('.overlay').forEach(o => o.remove());
  showLock();
}
window.lockApp = lockApp;
async function showLock() {
  App.sec = await Security.get();
  const sec = App.sec;
  const root = $('#lock-root');
  root.innerHTML = `<div class="lock">${brandIcon(76)}<h1>${esc(App.st.settings.appName)}</h1>
    <div style="color:var(--on-ink-muted);margin-top:-12px">أدخل الباسورد${sec.bio ? ' أو استخدم البصمة' : ''}</div>
    <div class="err" id="lk-err"></div>${pinPad('lk')}</div>`;
  const bioBtn = $('[data-k="bio"]', root);
  if (!sec.bio) bioBtn.style.visibility = 'hidden';
  const bio = async () => { try { if (await Security.bioVerify()) unlock(); } catch (e) { $('#lk-err').textContent = e.name === 'NotAllowedError' ? '' : 'البصمة ما اشتغلتش، استخدم الباسورد'; } };
  wirePad(root, 'lk', sec.pin.len || 4, async v => {
    if (Date.now() < lockUntil) { $('#lk-err').textContent = 'استنى ' + Math.ceil((lockUntil - Date.now()) / 1000) + ' ثانية'; return false; }
    if (await Security.checkPin(v)) { attempts = 0; unlock(); return true; }
    attempts++;
    if (attempts >= 5) { lockUntil = Date.now() + 30000; attempts = 0; $('#lk-err').textContent = 'محاولات كتير غلط — استنى 30 ثانية'; }
    else $('#lk-err').textContent = 'الباسورد غلط (' + (5 - attempts) + ' محاولات باقية)';
    return false;
  }, bio);
  if (sec.bio) setTimeout(bio, 350);
}
let started = false;
function unlock() {
  $('#lock-root').innerHTML = '';
  lastActive = Date.now(); App.hiddenAt = 0;
  App.unlocked = true;
  Sound.play('ok');
  render();
  setTimeout(dailyChecks, 500);
  if (!started) { started = true; setTimeout(dailyBackup, 1500); setInterval(checkReminders, 20000); }
  checkReminders();
}

/* ---------- ملخص اليوم وتنبيه المتأخرات ---------- */
function dailyChecks() {
  const R = App.st.settings.reminders, t = E.today();
  if (localStorage.getItem('hesasy-daily') === t) return;
  const late = [...App.C.ledgers.values()].filter(L => L.late > 0).sort((a, b) => b.late - a.late);
  const today = E.sessionsOnDay(App.st, t);
  const showLate = R.overdue && late.length;
  if (!R.daily && !showLate) return;
  if (!App.st.groups.length) return;
  localStorage.setItem('hesasy-daily', t);
  const s = sheet(`
    <div class="alarm-ic ${showLate ? '' : 'amber'}">${ic(showLate ? 'alert' : 'bell', 40)}</div>
    <h2 style="text-align:center">${new Date().getHours() < 12 ? 'صباح الخير' : 'مساء الخير'} — ملخص النهارده</h2>
    ${showLate ? `<div class="banner red">${ic('wallet', 18)}<span><b>${late.length} ${late.length > 10 || late.length < 3 ? 'طالب' : 'طلاب'} عليهم شهر وبدأوا التاني</b><br>${late.slice(0, 5).map(L => esc(L.student.name)).join('، ')}${late.length > 5 ? ' و' + (late.length - 5) + ' كمان' : ''}</span></div>` : ''}
    ${R.daily ? (today.length ? `<div class="label-sm">حصص النهارده (${today.filter(o => o.status === 'normal').length})</div>${today.map(o => sessionCard(o)).join('')}` : '<div class="banner blue">' + ic('cal', 18) + '<span>مفيش حصص النهارده</span></div>') : ''}
    <div class="grid2">${showLate ? '<a class="btn danger-ghost" href="#/dues" data-close>المتأخرات</a>' : '<a class="btn ghost" href="#/schedule" data-close>الجدول</a>'}<button class="btn" data-close>تمام</button></div>`, { center: true });
  s.el.addEventListener('click', e => { if (e.target.closest('a.session')) s.close(); });
  Sound.play(showLate ? 'alert' : 'chime');
}

/* ---------- تذكير الحصص ---------- */
function reminded() { try { const r = JSON.parse(localStorage.getItem('hesasy-rem') || '{}'); return r.d === E.today() ? r : { d: E.today(), k: [] }; } catch (e) { return { d: E.today(), k: [] }; } }
async function sysNotify(title, body, url, tag) {
  try {
    if (!('Notification' in window) || Notification.permission !== 'granted' || !navigator.serviceWorker) return;
    const reg = await navigator.serviceWorker.ready;
    reg.showNotification(title, { body, tag, renotify: true, icon: 'icons/icon-192.png', badge: 'icons/icon-192.png', vibrate: [200, 100, 200], data: { url }, dir: 'rtl', lang: 'ar' });
  } catch (e) {}
}
function checkReminders() {
  if (!App.st || !App.st.groups.length) return;
  const before = App.st.settings.reminders.before;
  const r = reminded();
  for (const o of E.sessionsOnDay(App.st, E.today())) {
    if (o.status !== 'normal' || r.k.includes(o.key) || !E.studentsInSession(App.st, o).length) continue;
    const m = minutesUntil(o.date, o.time);
    if (m <= before && m > -3) {
      r.k.push(o.key);
      const g = E.groupById(App.st, o.groupId), sub = E.SUBJ[g.subjectId];
      const when = m > 0 ? 'بعد ' + m + ' دقيقة' : 'دلوقتي';
      const n = E.studentsInSession(App.st, o).length;
      Sound.play('chime');
      toast(`<b>${esc(sub.name)}</b> ${when} · ${E.GRADES[sub.grade]} · ${n} طالب`, { type: 'warn', icon: 'bell', action: 'الغياب', ms: 10000, onAction: () => go('session', o.key) });
      sysNotify('حصة ' + sub.name + ' ' + when, E.GRADES[sub.grade] + (g.name ? ' · ' + g.name : '') + ' · الساعة ' + E.fmtTime(o.time) + ' · ' + n + ' طالب', location.pathname + '#/session/' + encodeURIComponent(o.key), o.key);
    }
  }
  localStorage.setItem('hesasy-rem', JSON.stringify(r));
}

/* ---------- النسخ اليومي ---------- */
async function dailyBackup() {
  const st = App.st, B = st.settings.backup, t = E.today();
  if (!st.students.length && !st.groups.length) return;
  try { if (B.lastAuto !== t) { await Backup.add(st, 'تلقائي يومي'); B.lastAuto = t; Store.save(st); } } catch (e) { console.warn(e); }
  const asked = localStorage.getItem('hesasy-bk-ask') === t;
  if (Backup.folderSupported()) {
    const info = await Backup.folderInfo();
    if (info && B.lastFolder !== t) {
      try {
        const r = await Backup.writeFolder(st, false);
        if (r.ok) { B.lastFolder = t; Store.save(st); }
        else if (!asked) { localStorage.setItem('hesasy-bk-ask', t); toast('احفظ نسخة اليوم في فولدر الموبايل', { type: 'warn', icon: 'folder', action: 'احفظ', ms: 10000, onAction: () => ACT.folderNow() }); }
      } catch (e) {}
    } else if (!info && !asked) { localStorage.setItem('hesasy-bk-ask', t); toast('اختار فولدر على الموبايل للنسخ اليومي', { type: 'warn', icon: 'folder', action: 'اختار', ms: 10000, onAction: () => ACT.pickFolder() }); }
  } else if (B.lastDownload !== t && !asked) {
    localStorage.setItem('hesasy-bk-ask', t);
    toast('احفظ نسخة اليوم على الموبايل', { type: 'warn', icon: 'download', action: 'حفظ', ms: 10000, onAction: () => ACT.dlBackup() });
  }
}

/* ---------- القفل التلقائي ----------
 * التنقل جوه التطبيق عمره ما بيقفله. القفل بس لما:
 * التطبيق يتقفل خالص، أو يفضل في الخلفية أكتر من ٣٠ ثانية، أو ٣ دقايق من غير استخدام. */
const BG_LOCK_MS = 30000, IDLE_LOCK_MS = 180000;
let lastActive = Date.now();
['pointerdown', 'keydown', 'scroll', 'touchstart', 'input'].forEach(ev => document.addEventListener(ev, () => { lastActive = Date.now(); }, { passive: true, capture: true }));
setInterval(() => {
  if (App.unlocked && !App.picking && App.sec && App.sec.lock && App.sec.pin && !document.hidden && Date.now() - lastActive > IDLE_LOCK_MS) lockApp();
}, 10000);
document.addEventListener('visibilitychange', () => {
  if (!App.st) return;
  if (document.hidden) {
    App.hiddenAt = Date.now();
    Store.flush();
    if (App.revealed && !App.picking) { App.revealed = false; if (App.unlocked && !$('.overlay')) render(); }
  } else {
    const away = App.hiddenAt ? Date.now() - App.hiddenAt : 0;
    App.hiddenAt = 0; lastActive = Date.now();
    if (App.picking) return;
    if (App.unlocked && App.sec && App.sec.lock && App.sec.pin && away > BG_LOCK_MS) lockApp();
    else if (App.unlocked && !$('.overlay')) { recompute(); render(); checkReminders(); }
  }
});
window.addEventListener('pagehide', () => Store.flush());

/* ---------- التحديثات ----------
 * أول ما تفتح التطبيق بيدوّر على نسخة جديدة على GitHub. لو لقى، بيظهرلك إشعار "حدّث دلوقتي". */
let updateShown = false, reloading = false, wantReload = false;
function showUpdate(worker) {
  if (updateShown) return;
  updateShown = true;
  Sound.play('chime');
  const s = sheet(`<div class="alarm-ic amber" style="animation:wobble 1.2s ease-in-out 2">${ic('refresh', 40)}</div>
    <h2 style="text-align:center">فيه تحديث جديد للتطبيق</h2>
    <div class="banner green">${ic('check', 18)}<span>بياناتك كلها محفوظة ومش هتتأثر بالتحديث. التطبيق هيقفل ويفتح تاني في ثانية.</span></div>
    <div class="grid2"><button class="btn ghost" data-close>بعدين</button><button class="btn accent" id="upd-ok">${ic('refresh', 18)} حدّث دلوقتي</button></div>`, { center: true, onClose: () => { setTimeout(() => { updateShown = false; }, 30 * 60000); } });
  $('#upd-ok', s.el).onclick = async () => {
    $('#upd-ok', s.el).disabled = true; $('#upd-ok', s.el).textContent = 'بيحدّث…';
    try { await Store.flush(); } catch (e) {}
    wantReload = true;
    worker.postMessage('skip-waiting');
    setTimeout(() => location.reload(), 2500);
  };
}
function setupUpdates() {
  navigator.serviceWorker.addEventListener('message', e => { if (e.data && e.data.url) location.hash = e.data.url.split('#')[1] || ''; });
  navigator.serviceWorker.addEventListener('controllerchange', () => { if (reloading || !wantReload) return; reloading = true; location.reload(); });
  navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' }).then(reg => {
    const watch = w => { if (!w) return; w.addEventListener('statechange', () => { if (w.state === 'installed' && navigator.serviceWorker.controller) showUpdate(w); }); };
    if (reg.waiting && navigator.serviceWorker.controller) showUpdate(reg.waiting);
    watch(reg.installing);
    reg.addEventListener('updatefound', () => watch(reg.installing));
    const check = () => reg.update().catch(() => {});
    check();
    document.addEventListener('visibilitychange', () => { if (!document.hidden) check(); });
    setInterval(check, 30 * 60000);
  }).catch(() => {});
}

/* ---------- التشغيل ---------- */
(async function boot() {
  if ('serviceWorker' in navigator && location.protocol !== 'file:') setupUpdates();
  Store.persist();
  let saved = null;
  try { saved = await Store.load(); } catch (e) {}
  if (!location.hash || location.hash === '#/home' || location.hash === '#/exit-guard') { history.replaceState(null, '', '#/exit-guard'); history.pushState(null, '', '#/home'); }
  App.st = migrate(saved);
  recompute();
  App.sec = await Security.get();
  $('#tabbar').innerHTML = TABS.map(t => `<a href="#/${t.r}" data-r="${t.r}"><span class="pill">${ic(t.icon, 22)}</span>${t.label}</a>`).join('');
  applyIdentity();
  $('#splash') && $('#splash').remove();
  if (!App.sec.pin) showOnboarding();
  else if (App.sec.lock) showLock();
  else unlock();
  // تحديث العدادات كل دقيقة (حالة الحصص "بعد X دقيقة")
  setInterval(() => { if (App.unlocked && !document.hidden && !$('.overlay') && !document.activeElement.matches('input,select,textarea')) { const r = route().name; if (r === 'home' || r === 'schedule') render(); } }, 60000);
  // يوم جديد: إعادة الحساب
  let day = E.today();
  setInterval(() => { if (E.today() !== day) { day = E.today(); recompute(); if (App.unlocked) { render(); dailyChecks(); dailyBackup(); } } }, 60000);
})();
